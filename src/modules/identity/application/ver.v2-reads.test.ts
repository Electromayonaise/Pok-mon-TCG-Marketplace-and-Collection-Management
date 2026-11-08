// VerServiceV2's reads: S-FR-VER-7 (the none and barred copies), S-FR-VER-9 (the payment-instruction edges),
// VER-3 and S-FR-VER-5.audit (the denial that survives its error, what the audit rows leave out, the signed keys,
// and the access log's paging, filter and foreign cursor), and MSG-3 (a Rejected business, the read on a pool of 1,
// and the FOR SHARE that holds a rejection back).
// Split from ver.v2.test.ts by the Impl-2 test review (HIGH-2); the shared Given steps are in test-support/suites/ver.ts.
import { describe, expect, it } from 'vitest';
import { PgTransactionRunner } from '../../../../test-support/db.js';
import { untilBlockedOnLock } from '../../../../test-support/locks.js';
import { singleConnectionPool } from '../../../../test-support/single-connection.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { admin, at, business, DAY, explainAssert, id, ins, rejectionReason, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { encodeQueueCursor } from '../domain/ver.js';
import { VerServiceV2 } from './ver.v2.js';
import { useVerSuite } from '../../../../test-support/suites/ver.js';

const { db, setup } = useVerSuite();

describe('VerServiceV2.getMyApplicationStatus (S-FR-VER-7)', () => {
  it('no application is status none with the VerificationNone copy', async () => {
    await user(db, { id: id('andres') });
    const result = await setup().ver.getMyApplicationStatus({ businessId: id('andres') });
    expect(result).toMatchObject({ status: 'none', applicationId: null, reapplyNotBefore: null, barred: false });
    expect(result.decision).toMatchObject({ outcome: 'allowed', reasonCode: 'VerificationNone', citations: [{ rule: 'FR-VER-7', inputs: { status: 'none' } }] });
  });

  it('a barred rejection is the VerificationBarred copy with no date', async () => {
    const applicationId = await business(db, id('andres'), 'Rejected', { reasonCode: 'Fraud', barred: true });
    const result = await setup().ver.getMyApplicationStatus({ businessId: id('andres') });
    expect(result).toMatchObject({ status: 'Rejected', applicationId, reapplyNotBefore: null, barred: true });
    expect(result.decision.reasonCode).toBe('VerificationBarred');
  });
});

describe('VerServiceV2.updatePaymentInstructions (S-FR-VER-9)', () => {
  const instructions = { bankName: 'Davivienda', accountType: 'checking' as const, accountNumber: '99887766554', holderName: 'Andrés Tienda', qrUploadKey: null };

  it('updates the profile and audits it without the account number', async () => {
    await business(db, id('andres'), 'Approved');
    const { w, ver } = setup();
    expect(await ver.updatePaymentInstructions({ businessId: id('andres'), instructions })).toEqual({ updatedAt: w.clock.now().toISOString() });
    expect(await rows(db, 'BusinessProfile')).toMatchObject([{ bankName: 'Davivienda', accountType: 'checking', accountNumber: '99887766554' }]);
    const audits = await rows(db, 'audit_events', `action = 'verification.paymentInstructions.updated'`);
    expect(audits).toMatchObject([{ aggregateId: id('andres') }]);
    expect(JSON.stringify(audits)).not.toContain('99887766554');
  });

  it('a business account with no profile yet is NotBusinessAccount citing status none', async () => {
    await user(db, { id: id('andres'), sellerTrack: 'business' });
    const error = await caught(() => setup().ver.updatePaymentInstructions({ businessId: id('andres'), instructions }));
    explainAssert(error, { code: 'NotBusinessAccount', rule: 'FR-VER-9', inputs: { status: 'none' } });
  });

  it('a blank bank and a short account number are refused field by field', async () => {
    const error = await caught(() => setup().ver.updatePaymentInstructions({ businessId: id('andres'), instructions: { ...instructions, bankName: ' ', accountNumber: '123' } })) as { citations: { inputs: { field: string } }[] };
    expect(error.citations.map((c) => c.inputs.field)).toEqual(['instructions.bankName', 'instructions.accountNumber']);
  });

  it('a buyer sees the instructions only while the latest application is Approved', async () => {
    await business(db, id('andres'), 'Approved');
    await business(db, id('pending'), 'Pending');
    const { ver } = setup();
    expect(await ver.getBusinessPaymentInstructions({ businessId: id('andres') })).toMatchObject({ bankName: 'Bancolombia', qrObjectKey: null });
    expect(await ver.getBusinessPaymentInstructions({ businessId: id('pending') })).toBeNull();
  });
});

describe('VerServiceV2.getApplicationForReview (VER-3, AD-VER-2)', () => {
  async function scene() {
    await admin(db);
    const applicationId = await business(db, id('andres'), 'Pending');
    await ins(db, 'BusinessApplicationLegalIdentity', { applicationId, type: 'NIT', number: '9001234568', documentKeys: ['ver-documents/doc1', 'ver-documents/doc2'] }, 'created');
    return applicationId;
  }

  it('a denial commits before the error: its log row and audit row survive, neither holds a regulated value', async () => {
    const applicationId = await scene();
    await user(db, { id: id('camila') });
    const error = await caught(() => setup().ver.getApplicationForReview({ applicationId, actorId: id('camila') }));
    explainAssert(error, { code: 'LegalIdentityAccessDenied', rule: 'FR-VER-5', inputs: { applicationId, outcome: 'denied' } });
    expect(await rows(db, 'LegalIdentityAccessLog')).toMatchObject([{ outcome: 'denied', fieldsRead: [], procedure: 'verification.getApplicationForReview' }]);
    const audits = await rows(db, 'audit_events', `action = 'verification.legalIdentity.denied'`);
    expect(audits).toMatchObject([{ actorId: id('camila'), aggregateId: applicationId }]);
    expect(JSON.stringify([error, audits])).not.toContain('9001234568');
  });

  it('a non-admin asking for an unknown id is still denied; the audit row records it, the log has no application to name', async () => {
    await user(db, { id: id('camila') });
    const error = await caught(() => setup().ver.getApplicationForReview({ applicationId: id('noapp'), actorId: id('camila') }));
    expect(codeOf(error)).toBe('LegalIdentityAccessDenied');
    expect(await db.counts(['LegalIdentityAccessLog'])).toEqual({ LegalIdentityAccessLog: 0 });
    expect(await rows(db, 'audit_events', `action = 'verification.legalIdentity.denied'`)).toHaveLength(1);
  });

  it('a grant signs each document under ver-documents and audits the field names only', async () => {
    const applicationId = await scene();
    const { w, ver } = setup();
    const result = await ver.getApplicationForReview({ applicationId, actorId: id('admin') });
    expect(w.storage.signedReads).toEqual([{ bucket: 'ver-documents', key: 'doc1' }, { bucket: 'ver-documents', key: 'doc2' }]);
    expect(result).toMatchObject({ applicationId, businessId: id('andres'), status: 'Pending', legalIdentity: { type: 'NIT', number: '9001234568' } });
    expect(await rows(db, 'LegalIdentityAccessLog')).toMatchObject([{ outcome: 'granted', fieldsRead: ['type', 'number', 'documentKeys'] }]);
    const audits = await rows(db, 'audit_events', `action = 'verification.legalIdentity.read'`);
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits)).not.toContain('9001234568');
  });

  it('a failed signing writes no granted row and no audit row', async () => {
    const applicationId = await scene();
    const { w, ver } = setup();
    w.storage.sign = async () => { throw new Error('storage down'); };
    expect((await caught(() => ver.getApplicationForReview({ applicationId, actorId: id('admin') })) as Error).message).toBe('storage down');
    expect(await db.counts(['LegalIdentityAccessLog'])).toEqual({ LegalIdentityAccessLog: 0 });
    expect(await rows(db, 'audit_events', `action = 'verification.legalIdentity.read'`)).toHaveLength(0);
  });
});

describe('VerServiceV2.listLegalIdentityAccess (S-FR-VER-5.audit)', () => {
  const logRow = (n: number, applicationId: string) => ({
    id: id(`log${n}`), actorId: id('admin'), applicationId, fieldsRead: ['type'], outcome: 'granted', procedure: 'verification.getApplicationForReview',
    createdAt: at(n * 1000),
  });

  it('pages 50 at a time, newest first, and filters by application', async () => {
    await admin(db);
    const a = await business(db, id('andres'), 'Pending');
    const b = await business(db, id('beatriz'), 'Pending');
    for (let n = 0; n < 50; n++) await ins(db, 'LegalIdentityAccessLog', logRow(n, a), 'none');
    await ins(db, 'LegalIdentityAccessLog', logRow(99, b), 'none');
    const { ver } = setup();
    const first = await ver.listLegalIdentityAccess({ adminId: id('admin'), cursor: null });
    expect(first.rows).toHaveLength(50);
    expect(first.rows[0]).toMatchObject({ logId: id('log99'), applicationId: b });
    const second = await ver.listLegalIdentityAccess({ adminId: id('admin'), cursor: first.nextCursor });
    expect(second).toEqual({ rows: [expect.objectContaining({ logId: id('log0') })], nextCursor: null });
    const onlyB = await ver.listLegalIdentityAccess({ adminId: id('admin'), cursor: null, applicationId: b });
    expect(onlyB).toEqual({ rows: [expect.objectContaining({ logId: id('log99') })], nextCursor: null });
  });

  it('a non-admin is AdminOnly, and a queue cursor is refused here', async () => {
    await user(db, { id: id('camila') });
    await admin(db);
    const { ver } = setup();
    expect(codeOf(await caught(() => ver.listLegalIdentityAccess({ adminId: id('camila'), cursor: null })))).toBe('AdminOnly');
    const queueCursor = encodeQueueCursor({ submittedAt: at(0), id: id('x') });
    expect(codeOf(await caught(() => ver.listLegalIdentityAccess({ adminId: id('admin'), cursor: queueCursor })))).toBe('RequestValidationFailed');
  });
});


describe('VerServiceV2.requireMessagingEligibility (MSG-3)', () => {
  it('a Rejected business is NotBusinessAccount citing its status', async () => {
    await business(db, id('andres'), 'Rejected');
    const error = await caught(() => new VerServiceV2(wiring(db)).requireMessagingEligibility({ businessId: id('andres') }));
    expect(codeOf(error)).toBe('NotBusinessAccount');
    expect(citedInputs(error)).toEqual({ status: 'Rejected' });
  });

  it('inside a transaction on a pool of 1 it reads on that connection, and its FOR SHARE holds a rejection until commit', async () => {
    await business(db, id('andres'), 'Approved');
    await rejectionReason(db, { code: 'DataMismatch' });
    const pool = singleConnectionPool(db);
    try {
      const transactions = new PgTransactionRunner(pool);
      const ver = new VerServiceV2({ ...wiring(db), transactions });
      let rejected = false;
      let rejection: Promise<unknown> = Promise.resolve();
      await transactions.run(async () => {
        expect(await ver.requireMessagingEligibility({ businessId: id('andres') })).toMatchObject({ status: 'Approved', verified: true });
        rejection = db.query(`UPDATE "BusinessApplication" SET status = 'Rejected', "rejectionReasonCode" = 'DataMismatch', "reapplyNotBefore" = $1 WHERE "businessId" = $2`, [at(DAY), id('andres')])
          .then(() => { rejected = true; });
        // Postgres reports the UPDATE waiting on the FOR SHARE lock: the block is proven, not timed.
        await untilBlockedOnLock(db, 'UPDATE "BusinessApplication"');
        expect(rejected).toBe(false);
      });
      await rejection;
      expect(rejected).toBe(true);
    } finally {
      await pool.end();
    }
  });
});
