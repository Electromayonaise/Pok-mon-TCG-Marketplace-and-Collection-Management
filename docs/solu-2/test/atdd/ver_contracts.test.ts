// ATDD — VER (contracts.md §2, §15). Red phase: every test must fail with NotImplementedError.
import { describe, expect, it } from 'vitest';
import { VerServiceV2 } from '../../../../src/modules/identity/index.js';
import type { SubmitApplicationRequest } from '../../../../src/modules/identity/index.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { admin, at, business, DAY, explainAssert, id, ins, rejectionReason, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

function setup() {
  const w = wiring(db);
  return { w, ver: new VerServiceV2(w) };
}
function application(businessId: string, w: ReturnType<typeof wiring>, o: Partial<SubmitApplicationRequest> = {}): SubmitApplicationRequest {
  const key = `business-document/${businessId}/doc1`;
  w.storage.simulateDirectUpload(key, PDF, 'application/pdf');
  return {
    businessId, businessName: 'Cartas Andrés', legalIdentity: { type: 'NIT', number: '9001234563' }, documentUploadKeys: [key],
    externalPresenceUrl: 'https://instagram.com/cartasandres', city: 'Medellín',
    paymentInstructions: { bankName: 'Bancolombia', accountType: 'savings', accountNumber: '12345678901', holderName: 'Andrés', qrUploadKey: null },
    consentAccepted: true, consentVersion: 'privacy-v1', ...o,
  };
}
const events = (type: string) => rows<{ type: string; schemaVersion: number; payload: Record<string, unknown> }>(db, 'OutboxEvent', 'type = $1', [type]);

describe('VER-1 — decideApplication (contracts.md §2)', () => {
  it('[VER-1.Q1] approving a Pending application decides it, logs it, audits it and publishes one Approved event to two subscribers', async () => {
    await admin(db);
    const applicationId = await business(db, id('andres'), 'Pending');
    const { w, ver } = setup();
    const result = await ver.decideApplication({ applicationId, decision: { kind: 'approve' }, adminId: id('admin') });
    expect(result).toMatchObject({ applicationId, status: 'Approved', decidedAt: w.clock.iso(), decidedBy: id('admin') });
    expect(await rows(db, 'ApplicationDecisionLog')).toMatchObject([{ applicationId, decision: 'Approved' }]);
    const [event] = await events('BusinessApplicationApproved');
    expect(event).toMatchObject({ schemaVersion: 1, payload: { applicationId, businessId: id('andres'), approvedBy: id('admin') } });
    expect((await rows(db, 'EventDelivery')).map((d) => d.subscriber).sort()).toEqual(['commission', 'listings']);
    expect(await rows(db, 'audit_events', `action = 'verification.application.decided'`)).toHaveLength(1);
  });

  it('[VER-1.Q2] rejecting with a 7-day reason snapshots the policy and publishes one Rejected event to listings', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'DataMismatch', cooldownDays: 7 });
    const applicationId = await business(db, id('andres'), 'Pending');
    const { w, ver } = setup();
    await ver.decideApplication({ applicationId, decision: { kind: 'reject', reasonCode: 'DataMismatch', note: null }, adminId: id('admin') });
    expect(await rows(db, 'BusinessApplication', 'id = $1', [applicationId])).toMatchObject([{ status: 'Rejected', rejectionReasonCode: 'DataMismatch', reapplyBarred: false }]);
    const [app] = await rows<{ reapplyNotBefore: Date }>(db, 'BusinessApplication', 'id = $1', [applicationId]);
    expect(app?.reapplyNotBefore.toISOString()).toBe(new Date(w.clock.now().getTime() + 7 * DAY).toISOString());
    expect((await rows(db, 'EventDelivery')).map((d) => d.subscriber)).toEqual(['listings']);
  });

  it('[VER-1.P2] an unknown application is ApplicationNotFound (404)', async () => {
    await admin(db);
    const error = await caught(() => setup().ver.decideApplication({ applicationId: id('noapp'), decision: { kind: 'approve' }, adminId: id('admin') }));
    expect(codeOf(error)).toBe('ApplicationNotFound');
    expect(httpOf(error)).toBe(404);
  });

  it('[VER-1.P3] a decided application is ApplicationNotPending (409) naming who decided and when; nothing is written', async () => {
    await admin(db);
    const applicationId = await business(db, id('andres'), 'Approved');
    const error = await caught(() => setup().ver.decideApplication({ applicationId, decision: { kind: 'approve' }, adminId: id('admin') }));
    expect(codeOf(error)).toBe('ApplicationNotPending');
    expect(citedInputs(error)).toMatchObject({ status: 'Approved', decidedBy: id('admin') });
    expect(await db.counts(['ApplicationDecisionLog', 'OutboxEvent', 'audit_events'])).toEqual({ ApplicationDecisionLog: 0, OutboxEvent: 0, audit_events: 0 });
  });

  it('[VER-1.P4] rejecting with an inactive reason is RejectionReasonUnknown (409); the application stays Pending', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'Retired', active: false });
    const applicationId = await business(db, id('andres'), 'Pending');
    const error = await caught(() => setup().ver.decideApplication({ applicationId, decision: { kind: 'reject', reasonCode: 'Retired', note: null }, adminId: id('admin') }));
    expect(codeOf(error)).toBe('RejectionReasonUnknown');
    expect(await rows(db, 'BusinessApplication', 'id = $1', [applicationId])).toMatchObject([{ status: 'Pending' }]);
  });

  it('[VER-1.I1] a repeated approve is ApplicationNotPending and never publishes a second event (AD-VER-1)', async () => {
    await admin(db);
    const applicationId = await business(db, id('andres'), 'Pending');
    const { ver } = setup();
    await ver.decideApplication({ applicationId, decision: { kind: 'approve' }, adminId: id('admin') });
    const error = await caught(() => ver.decideApplication({ applicationId, decision: { kind: 'approve' }, adminId: id('admin') }));
    expect(codeOf(error)).toBe('ApplicationNotPending');
    expect(await events('BusinessApplicationApproved')).toHaveLength(1);
    expect(await rows(db, 'ApplicationDecisionLog')).toHaveLength(1);
  });

  it('[VER-1.MEC] approve and reject race on one Pending application, 100 repetitions: one transition, one event of the winner, no half state (NFR-VER-1)', async () => {
    await admin(db);
    await user(db, { id: id('admin2'), isAdmin: true });
    await rejectionReason(db, { code: 'DataMismatch' });
    for (let rep = 0; rep < 100; rep++) {
      const applicationId = await business(db, id(`biz${rep}`), 'Pending', { applicationId: id(`appl${rep}`) });
      const outcome = await race<unknown>(2, (i) =>
        setup().ver.decideApplication(i === 0
          ? { applicationId, decision: { kind: 'approve' }, adminId: id('admin') }
          : { applicationId, decision: { kind: 'reject', reasonCode: 'DataMismatch', note: null }, adminId: id('admin2') }));
      expect(outcome.rejected.map(codeOf)).toEqual(['ApplicationNotPending']);
      const [app] = await rows<{ status: string; decidedBy: string | null; decidedAt: Date | null }>(db, 'BusinessApplication', 'id = $1', [applicationId]);
      expect(app?.decidedBy && app.decidedAt).toBeTruthy();
      const published = await rows<{ type: string }>(db, 'OutboxEvent', `"aggregateId" = $1`, [applicationId]);
      expect(published.map((e) => e.type)).toEqual([app?.status === 'Approved' ? 'BusinessApplicationApproved' : 'BusinessApplicationRejected']);
    }
  });
});

describe('VER-2 — submitApplication (contracts.md §2)', () => {
  it('[VER-2.Q1] a fresh account submits: one Pending application, its legal identity and profile, an audit row without the NIT, and no event', async () => {
    await user(db, { id: id('andres') });
    const { w, ver } = setup();
    const result = await ver.submitApplication(application(id('andres'), w));
    expect(result).toMatchObject({ status: 'Pending', submittedAt: w.clock.iso() });
    explainAssert(result.decision, { outcome: 'allowed', rule: 'FR-VER-1', inputs: { applicationId: result.applicationId, reapplication: false } });
    expect(await rows(db, 'BusinessApplicationLegalIdentity')).toMatchObject([{ applicationId: result.applicationId, type: 'NIT', number: '9001234563' }]);
    expect(await rows(db, 'BusinessProfile')).toHaveLength(1);
    expect(JSON.stringify(await rows(db, 'audit_events'))).not.toContain('9001234563');
    expect(await rows(db, 'OutboxEvent')).toHaveLength(0);
  });

  it('[VER-2.P1] an application with no document is MissingRequiredField (400) naming the field', async () => {
    await user(db, { id: id('andres') });
    const { w, ver } = setup();
    const error = await caught(() => ver.submitApplication(application(id('andres'), w, { documentUploadKeys: [] })));
    expect(codeOf(error)).toBe('MissingRequiredField');
    expect(httpOf(error)).toBe(400);
    expect(citedInputs(error)).toMatchObject({ fields: 'documentUploadKeys' });
  });

  it('[VER-2.P3] an upload key that is not in quarantine is InvalidDocumentFile (400) with cause missing; nothing is written', async () => {
    await user(db, { id: id('andres') });
    const { w, ver } = setup();
    const input = application(id('andres'), w, { documentUploadKeys: [`business-document/${id('andres')}/never-uploaded`] });
    const error = await caught(() => ver.submitApplication(input));
    expect(codeOf(error)).toBe('InvalidDocumentFile');
    expect(citedInputs(error)).toMatchObject({ cause: 'missing' });
    expect(await db.counts(['BusinessApplication', 'BusinessApplicationLegalIdentity'])).toEqual({ BusinessApplication: 0, BusinessApplicationLegalIdentity: 0 });
    expect(await rows(db, 'User', 'id = $1', [id('andres')])).toMatchObject([{ sellerTrack: null }]);
  });

  it('[VER-2.P5] a second submission while one is Pending is ApplicationAlreadyPending (409)', async () => {
    await business(db, id('andres'), 'Pending');
    const { w, ver } = setup();
    const error = await caught(() => ver.submitApplication(application(id('andres'), w)));
    expect(codeOf(error)).toBe('ApplicationAlreadyPending');
    expect(await rows(db, 'BusinessApplication')).toHaveLength(1);
  });

  it('[VER-2.P7] the cooldown is half-open: 1 s before reapplyNotBefore is refused, the exact instant is accepted (FR-VER-6)', async () => {
    await business(db, id('andres'), 'Rejected', { reapplyNotBefore: at(DAY) });
    const { w, ver } = setup();
    w.clock.set(Date.parse(at(DAY)) - 1000);
    const early = await caught(() => ver.submitApplication(application(id('andres'), w)));
    expect(codeOf(early)).toBe('ReapplicationCooldownActive');
    expect(citedInputs(early)).toMatchObject({ reapplyNotBefore: at(DAY) });
    w.clock.set(Date.parse(at(DAY)));
    const result = await ver.submitApplication(application(id('andres'), w));
    expect(result.status).toBe('Pending');
  });

  it('[VER-2.I1] two concurrent submissions leave exactly one Pending application (AD-VER-3 rule 2)', async () => {
    await user(db, { id: id('andres') });
    const outcome = await race<unknown>(2, () => { const { w, ver } = setup(); return ver.submitApplication(application(id('andres'), w)); });
    expect(outcome.rejected.map(codeOf)).toEqual(['ApplicationAlreadyPending']);
    expect(await rows(db, 'BusinessApplication', `status = 'Pending'`)).toHaveLength(1);
  });
});

describe('VER-3 — getApplicationForReview (contracts.md §2)', () => {
  async function scene() {
    await admin(db);
    const applicationId = await business(db, id('andres'), 'Pending');
    await ins(db, 'BusinessApplicationLegalIdentity', { applicationId, type: 'NIT', number: '9001234563', documentKeys: ['ver-documents/doc1'] }, 'created');
    return applicationId;
  }

  it('[VER-3.Q1] an admin reads the legal identity and documents; one granted access row is written', async () => {
    const applicationId = await scene();
    const result = await setup().ver.getApplicationForReview({ applicationId, actorId: id('admin') });
    expect(result.legalIdentity).toEqual({ type: 'NIT', number: '9001234563' });
    expect(result.documents).toHaveLength(1);
    expect(await rows(db, 'LegalIdentityAccessLog')).toMatchObject([{ outcome: 'granted', actorId: id('admin'), applicationId }]);
  });

  it('[VER-3.P1] a non-admin is LegalIdentityAccessDenied (403), and the denial row survives the error', async () => {
    const applicationId = await scene();
    await user(db, { id: id('camila') });
    const error = await caught(() => setup().ver.getApplicationForReview({ applicationId, actorId: id('camila') }));
    expect(codeOf(error)).toBe('LegalIdentityAccessDenied');
    expect(httpOf(error)).toBe(403);
    expect(await rows(db, 'LegalIdentityAccessLog')).toMatchObject([{ outcome: 'denied', actorId: id('camila'), fieldsRead: [] }]);
  });

  it('[VER-3.P2] an unknown application is ApplicationNotFound (404) with zero writes', async () => {
    await admin(db);
    const error = await caught(() => setup().ver.getApplicationForReview({ applicationId: id('noapp'), actorId: id('admin') }));
    expect(codeOf(error)).toBe('ApplicationNotFound');
    expect(await rows(db, 'LegalIdentityAccessLog')).toHaveLength(0);
  });

  it('[VER-3.I1] the access-log count equals reads plus denials (NFR-VER-2)', async () => {
    const applicationId = await scene();
    await user(db, { id: id('camila') });
    const { ver } = setup();
    await ver.getApplicationForReview({ applicationId, actorId: id('admin') });
    await caught(() => ver.getApplicationForReview({ applicationId, actorId: id('camila') }));
    await ver.getApplicationForReview({ applicationId, actorId: id('admin') });
    expect((await rows(db, 'LegalIdentityAccessLog')).map((r) => r.outcome).sort()).toEqual(['denied', 'granted', 'granted']);
  });

  it('[VER-3.I2] no other VER read returns the legal identity (AD-13)', async () => {
    const applicationId = await scene();
    const { ver } = setup();
    const status = await ver.getMyApplicationStatus({ businessId: id('andres') });
    const queue = await ver.listReviewQueue({ adminId: id('admin'), cursor: null });
    expect(JSON.stringify([status, queue])).not.toContain('9001234563');
    expect(queue.items.map((i) => i.applicationId)).toEqual([applicationId]);
  });

  it('[VER-3.I3] document URLs expire exactly 600 s after the read (AD-14)', async () => {
    const applicationId = await scene();
    const { w, ver } = setup();
    const result = await ver.getApplicationForReview({ applicationId, actorId: id('admin') });
    expect(result.documents[0]?.expiresAt).toBe(new Date(w.clock.now().getTime() + 600_000).toISOString());
  });
});

describe('Supporting VER contracts (contracts.md §15)', () => {
  it('[S-FR-VER-2.h] the review queue lists Pending applications oldest first', async () => {
    await admin(db);
    const a2 = await business(db, id('b2'), 'Pending', { submittedAt: at(-DAY) });
    const a1 = await business(db, id('b1'), 'Pending', { submittedAt: at(-3 * DAY) });
    const result = await setup().ver.listReviewQueue({ adminId: id('admin'), cursor: null });
    expect(result.items.map((i) => i.applicationId)).toEqual([a1, a2]);
  });

  it('[S-FR-VER-2.f] a non-admin gets AdminOnly (403)', async () => {
    await user(db, { id: id('camila') });
    const error = await caught(() => setup().ver.listReviewQueue({ adminId: id('camila'), cursor: null }));
    expect(codeOf(error)).toBe('AdminOnly');
  });

  it('[S-FR-VER-7.h] a rejected applicant sees the snapshotted reapply date', async () => {
    await business(db, id('andres'), 'Rejected', { reapplyNotBefore: at(6 * DAY) });
    const result = await setup().ver.getMyApplicationStatus({ businessId: id('andres') });
    expect(result).toMatchObject({ status: 'Rejected', reapplyNotBefore: at(6 * DAY), barred: false });
  });

  it('[S-FR-VER-7.f] editing the reason policy later never changes the shown date (snapshot, AD-VER-3)', async () => {
    await business(db, id('andres'), 'Rejected', { reasonCode: 'DataMismatch', reapplyNotBefore: at(6 * DAY) });
    await db.query(`UPDATE "RejectionReason" SET "cooldownDays" = 30 WHERE code = 'DataMismatch'`);
    const result = await setup().ver.getMyApplicationStatus({ businessId: id('andres') });
    expect(result.reapplyNotBefore).toBe(at(6 * DAY));
  });

  it('[S-FR-VER-8.h] deactivating one of two active reasons writes one change row', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'DataMismatch' });
    await rejectionReason(db, { code: 'Fraud', barred: true });
    const result = await setup().ver.setRejectionReasonActive({ adminId: id('admin'), code: 'Fraud', active: false });
    expect(result).toEqual({ code: 'Fraud', active: false, changed: true });
    expect(await rows(db, 'RejectionReasonChange')).toHaveLength(1);
  });

  it('[S-FR-VER-8.f] two concurrent deactivations of the last two reasons leave one active (LastActiveReasonRequired)', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'DataMismatch' });
    await rejectionReason(db, { code: 'Fraud', barred: true });
    const outcome = await race<unknown>(2, (i) => setup().ver.setRejectionReasonActive({ adminId: id('admin'), code: i === 0 ? 'DataMismatch' : 'Fraud', active: false }));
    expect(outcome.rejected.map(codeOf)).toEqual(['LastActiveReasonRequired']);
    expect(await rows(db, 'RejectionReason', 'active')).toHaveLength(1);
  });

  it('[S-FR-VER-8.list.h] the policy list shows active and inactive reasons ordered by code', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'Fraud', barred: true, active: false });
    await rejectionReason(db, { code: 'DataMismatch' });
    const result = await setup().ver.listRejectionReasons({ adminId: id('admin') });
    expect(result.reasons.map((r) => [r.code, r.active])).toEqual([['DataMismatch', true], ['Fraud', false]]);
  });

  it('[S-FR-VER-9.h] editing payment instructions after an order leaves the order snapshot unchanged', async () => {
    await business(db, id('andres'), 'Approved');
    const { ver } = setup();
    await ver.updatePaymentInstructions({ businessId: id('andres'), instructions: { bankName: 'Davivienda', accountType: 'checking', accountNumber: '99887766', holderName: 'Andrés', qrUploadKey: null } });
    expect(await ver.getBusinessPaymentInstructions({ businessId: id('andres') })).toMatchObject({ bankName: 'Davivienda', accountType: 'checking' });
  });

  it('[S-FR-VER-9.f] an individual seller updating payment instructions is NotBusinessAccount (409)', async () => {
    await user(db, { id: id('valentina'), sellerTrack: 'individual' });
    const error = await caught(() => setup().ver.updatePaymentInstructions({ businessId: id('valentina'), instructions: { bankName: 'Nequi', accountType: 'savings', accountNumber: '30012345', holderName: 'Valentina', qrUploadKey: null } }));
    expect(codeOf(error)).toBe('NotBusinessAccount');
  });

  it('[S-FR-VER-5.audit.h] the legal-identity audit lists a denial with no fields read', async () => {
    await admin(db);
    const applicationId = await business(db, id('andres'), 'Pending');
    await ins(db, 'LegalIdentityAccessLog', { id: id('log1'), actorId: id('camila'), applicationId, fieldsRead: [], outcome: 'denied', procedure: 'verification.getApplicationForReview' }, 'created');
    const result = await setup().ver.listLegalIdentityAccess({ adminId: id('admin'), cursor: null });
    expect(result.rows).toMatchObject([{ outcome: 'denied', fieldsRead: [], applicationId }]);
  });

  it('[P-VER.name.h] the offered business name is the latest application name', async () => {
    await business(db, id('andres'), 'Approved');
    expect(await setup().ver.getBusinessName({ businessId: id('andres') })).toEqual({ businessName: `Tienda ${id('andres').slice(0, 6)}` });
  });
});
