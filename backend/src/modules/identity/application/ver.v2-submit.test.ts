// VerServiceV2.submitApplication (VER-2), the edges the bound tests leave out: each promotion
// refusal (P3) and what it leaves in storage, the cleanup after a refused transaction (Q-fail),
// the shape stage (P1–P2) without the regulated value, free text (#38), P6–P7, and the 23505 savepoint (I1).
// Split from ver.v2.test.ts by the Impl-2 test review (HIGH-2); the shared Given steps are in test-support/suites/ver.ts.
import { describe, expect, it } from 'vitest';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { admin, business, explainAssert, id, rejectionReason, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { PgVerRepository } from '../infra/pg.js';
import { useVerSuite } from '../../../../test-support/suites/ver.js';

const { db, PDF, setup, keyOf, application, bucketKeys } = useVerSuite();

describe('VerServiceV2.submitApplication — promotion (P3, AD-SYS-8 rule 6)', () => {
  it.each([
    ['missing', 'a key under another account', (w: ReturnType<typeof wiring>) => { w.storage.simulateDirectUpload(keyOf(id('otro')), PDF, 'application/pdf'); return keyOf(id('otro')); }],
    ['size', 'a PDF over 5 MiB', (w: ReturnType<typeof wiring>) => {
      const big = new Uint8Array(5 * 1024 * 1024 + 1); big.set(PDF);
      w.storage.simulateDirectUpload(keyOf(id('andres')), big, 'application/pdf'); return keyOf(id('andres'));
    }],
    ['magic', 'bytes that are no JPEG, PNG or PDF', (w: ReturnType<typeof wiring>) => {
      w.storage.simulateDirectUpload(keyOf(id('andres')), new TextEncoder().encode('<html>'), 'application/pdf'); return keyOf(id('andres'));
    }],
    ['scanner', 'a file the scanner rejects', (w: ReturnType<typeof wiring>) => {
      w.scanner.failAll = true; w.storage.simulateDirectUpload(keyOf(id('andres')), PDF, 'application/pdf'); return keyOf(id('andres'));
    }],
  ] as const)('cause %s: %s is InvalidDocumentFile (400) and nothing is written', async (cause, _label, arrange) => {
    await user(db, { id: id('andres') });
    const { w, ver } = setup();
    const key = arrange(w);
    const error = await caught(() => ver.submitApplication(application(id('andres'), { documentUploadKeys: [key] })));
    expect(codeOf(error)).toBe('InvalidDocumentFile');
    expect(httpOf(error)).toBe(400);
    expect(citedInputs(error)).toEqual({ key, cause });
    expect(bucketKeys(w, 'ver-documents')).toEqual([]);
    expect(await db.counts(['BusinessApplication', 'audit_events'])).toEqual({ BusinessApplication: 0, audit_events: 0 });
  });

  it('a refusal on the second key deletes the first copy and keeps both quarantine objects', async () => {
    await user(db, { id: id('andres') });
    const { w, ver } = setup();
    w.storage.simulateDirectUpload(keyOf(id('andres'), 'doc1'), PDF, 'application/pdf');
    const error = await caught(() => ver.submitApplication(application(id('andres'), { documentUploadKeys: [keyOf(id('andres'), 'doc1'), keyOf(id('andres'), 'doc2')] })));
    expect(citedInputs(error)).toEqual({ key: keyOf(id('andres'), 'doc2'), cause: 'missing' });
    expect(bucketKeys(w, 'ver-documents')).toEqual([]);
    expect(bucketKeys(w, 'upload-quarantine')).toEqual([`upload-quarantine/${keyOf(id('andres'), 'doc1')}`]);
  });

  it('a success moves each document to ver-documents under a new id, stores it bucket-qualified and empties quarantine', async () => {
    await user(db, { id: id('andres') });
    const { w, ver } = setup();
    w.storage.simulateDirectUpload(keyOf(id('andres')), PDF, 'application/pdf');
    const result = await ver.submitApplication(application(id('andres')));
    const promoted = bucketKeys(w, 'ver-documents');
    expect(promoted).toHaveLength(1);
    expect(w.storage.objects.get(promoted[0]!)).toMatchObject({ contentType: 'application/pdf' });
    expect(bucketKeys(w, 'upload-quarantine')).toEqual([]);
    expect(await rows(db, 'BusinessApplicationLegalIdentity')).toMatchObject([{ applicationId: result.applicationId, documentKeys: promoted }]);
    expect(await rows(db, 'audit_events', `action = 'verification.application.submitted'`)).toMatchObject([{ aggregateId: result.applicationId }]);
  });

  it('a storage failure partway through deletes the copies already made and surfaces its own error', async () => {
    await user(db, { id: id('andres') });
    const { w, ver } = setup();
    const keys = [keyOf(id('andres'), 'doc1'), keyOf(id('andres'), 'doc2')];
    for (const key of keys) w.storage.simulateDirectUpload(key, PDF, 'application/pdf');
    const put = w.storage.put.bind(w.storage);
    let puts = 0;
    w.storage.put = async (...args: Parameters<typeof put>) => { if (puts++ === 1) throw new Error('storage down'); return put(...args); };
    const error = await caught(() => ver.submitApplication(application(id('andres'), { documentUploadKeys: keys })));
    expect((error as Error).message).toBe('storage down');
    expect(bucketKeys(w, 'ver-documents')).toEqual([]);
    expect(bucketKeys(w, 'upload-quarantine')).toHaveLength(2);
  });
});

describe('VerServiceV2.submitApplication — Q-fail cleanup (AD-VER-3 rule 4)', () => {
  it('a refusal inside the transaction deletes the promoted copies and keeps the quarantine object for a retry', async () => {
    await business(db, id('andres'), 'Pending');
    const { w, ver } = setup();
    w.storage.simulateDirectUpload(keyOf(id('andres')), PDF, 'application/pdf');
    const error = await caught(() => ver.submitApplication(application(id('andres'))));
    expect(codeOf(error)).toBe('ApplicationAlreadyPending');
    expect(bucketKeys(w, 'ver-documents')).toEqual([]);
    expect(bucketKeys(w, 'upload-quarantine')).toHaveLength(1);
  });

  it('a failed delete during the cleanup does not hide the refusal', async () => {
    await business(db, id('andres'), 'Pending');
    const { w, ver } = setup();
    w.storage.simulateDirectUpload(keyOf(id('andres')), PDF, 'application/pdf');
    w.storage.delete = async () => { throw new Error('storage down'); };
    expect(codeOf(await caught(() => ver.submitApplication(application(id('andres')))))).toBe('ApplicationAlreadyPending');
  });

  it('a failed quarantine delete after the commit does not fail the committed submit', async () => {
    await user(db, { id: id('andres') });
    const { w, ver } = setup();
    w.storage.simulateDirectUpload(keyOf(id('andres')), PDF, 'application/pdf');
    w.storage.delete = async () => { throw new Error('storage down'); };
    expect(await ver.submitApplication(application(id('andres')))).toMatchObject({ status: 'Pending' });
    expect(await db.counts(['BusinessApplication'])).toEqual({ BusinessApplication: 1 });
  });
});

describe('VerServiceV2.submitApplication — shape (P1–P2)', () => {
  it('every missing field is named at once', async () => {
    const { ver } = setup();
    const input = application(id('andres'), { businessName: ' ', city: '', consentAccepted: undefined as unknown as true });
    const error = await caught(() => ver.submitApplication(input));
    expect(codeOf(error)).toBe('MissingRequiredField');
    expect(citedInputs(error)).toEqual({ fields: 'businessName, city, consentAccepted' });
  });

  it('a bad NIT check digit and a stale consent version are two issues, and no issue repeats the number', async () => {
    const { ver } = setup();
    const input = application(id('andres'), { legalIdentity: { type: 'NIT', number: '8001972685' }, consentVersion: 'privacy-v0' });
    const error = await caught(() => ver.submitApplication(input)) as { code: string; citations: { inputs: { field: string } }[] };
    expect(error.code).toBe('RequestValidationFailed');
    expect(httpOf(error)).toBe(400);
    expect(error.citations.map((c) => c.inputs.field)).toEqual(['legalIdentity.number', 'consentVersion']);
    expect(JSON.stringify(error)).not.toContain('8001972685');
  });

  it('a CC outside 6–10 digits, an http URL and four documents are refused field by field', async () => {
    const { ver } = setup();
    const keys = ['a', 'b', 'c', 'd'].map((n) => keyOf(id('andres'), n));
    const input = application(id('andres'), { legalIdentity: { type: 'CC', number: '12345' }, externalPresenceUrl: 'http://x.co', documentUploadKeys: keys });
    const error = await caught(() => ver.submitApplication(input)) as { citations: { inputs: { field: string } }[] };
    expect(error.citations.map((c) => c.inputs.field)).toEqual(['legalIdentity.number', 'documentUploadKeys', 'externalPresenceUrl']);
  });

  it('a repeated document key is refused, and a name is measured in characters as the schema does, not in UTF-16 units', async () => {
    const { ver } = setup();
    const key = keyOf(id('andres'));
    const input = application(id('andres'), { businessName: '🃏', documentUploadKeys: [key, key] });
    const error = await caught(() => ver.submitApplication(input)) as { citations: { inputs: { field: string } }[] };
    expect(error.citations.map((c) => c.inputs.field)).toEqual(['businessName', 'documentUploadKeys']);
  });

  it('a payment-QR key is refused until the QR upload can promote it, and nothing is written', async () => {
    const { ver } = setup();
    const pay = { ...application(id('andres')).paymentInstructions, qrUploadKey: `business-document/${id('otro')}/qr` };
    const error = await caught(() => ver.submitApplication(application(id('andres'), { paymentInstructions: pay }))) as { code: string; citations: { inputs: { field: string } }[] };
    expect(error.code).toBe('RequestValidationFailed');
    expect(error.citations.map((c) => c.inputs.field)).toEqual(['paymentInstructions.qrUploadKey']);
    expect(await db.counts(['BusinessApplication', 'BusinessProfile'])).toEqual({ BusinessApplication: 0, BusinessProfile: 0 });
  });
});

describe('VerServiceV2 — free text (decision log Impl-1 #38)', () => {
  it('names of spaces, a NUL in a name and a NUL in the decision note are RequestValidationFailed, with nothing written', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'Fraud', barred: true });
    const applicationId = await business(db, id('andres'), 'Pending');
    const { ver } = setup();
    for (const o of [{ businessName: ' a ' }, { city: 'Medell\u0000ín' }, { externalPresenceUrl: 'https://instagram.com/x\u0000y' }, { paymentInstructions: { bankName: 'Banco\u0000', accountType: 'savings' as const, accountNumber: '12345678901', holderName: 'Andrés', qrUploadKey: null } }]) {
      expect(codeOf(await caught(() => ver.submitApplication(application(id('nuevo'), o))))).toBe('RequestValidationFailed');
    }
    const note = await caught(() => ver.decideApplication({ applicationId, decision: { kind: 'reject', reasonCode: 'Fraud', note: 'Doc\u0000' }, adminId: id('admin') }));
    expect(codeOf(note)).toBe('RequestValidationFailed');
    expect(await rows(db, 'BusinessApplication', 'id = $1', [applicationId])).toMatchObject([{ status: 'Pending' }]);
    expect(codeOf(await caught(() => ver.upsertRejectionReason({ adminId: id('admin'), code: 'Blank', textEsCo: ' '.repeat(12), policy: { barred: true } })))).toBe('RequestValidationFailed');
  });
});

describe('VerServiceV2.submitApplication — the latest application (P6–P7)', () => {
  it('an Approved business is AlreadyVerifiedBusiness citing FR-VER-1', async () => {
    await business(db, id('andres'), 'Approved');
    const { w, ver } = setup();
    w.storage.simulateDirectUpload(keyOf(id('andres')), PDF, 'application/pdf');
    const error = await caught(() => ver.submitApplication(application(id('andres'))));
    explainAssert(error, { code: 'AlreadyVerifiedBusiness', rule: 'FR-VER-1', inputs: { latestApplicationStatus: 'Approved' } });
  });

  it('a barred rejection is ReapplicationBarred citing FR-VER-6', async () => {
    const applicationId = await business(db, id('andres'), 'Rejected', { barred: true });
    const { w, ver } = setup();
    w.storage.simulateDirectUpload(keyOf(id('andres')), PDF, 'application/pdf');
    const error = await caught(() => ver.submitApplication(application(id('andres'))));
    explainAssert(error, { code: 'ReapplicationBarred', rule: 'FR-VER-6', inputs: { applicationId, reapplyBarred: true } });
  });

  it('a reapplication after the cooldown is allowed with reapplication true', async () => {
    await business(db, id('andres'), 'Rejected', { reapplyNotBefore: '2026-01-01T00:00:00.000Z' });
    const { w, ver } = setup();
    w.storage.simulateDirectUpload(keyOf(id('andres')), PDF, 'application/pdf');
    const result = await ver.submitApplication(application(id('andres')));
    explainAssert(result.decision, { outcome: 'allowed', rule: 'FR-VER-1', inputs: { applicationId: result.applicationId, reapplication: true } });
  });
});


describe('PgVerRepository.insertApplication (I1)', () => {
  it('a second Pending row is refused by the partial index under a savepoint: false, and the transaction stays usable', async () => {
    await business(db, id('andres'), 'Pending');
    const repo = new PgVerRepository();
    const latest = await db.transactions.run(async (tx) => {
      const inserted = await repo.insertApplication(tx, {
        id: id('second'), businessId: id('andres'), businessName: 'Cartas Andrés', city: 'Medellín', externalPresenceUrl: 'https://x.co', consentVersion: 'privacy-v1',
      }, '2026-10-01T15:00:00.000Z');
      expect(inserted).toBe(false);
      return repo.readLatestApplication(tx, id('andres'));
    });
    expect(latest).toMatchObject({ status: 'Pending' });
    expect(await rows(db, 'BusinessApplication')).toHaveLength(1);
  });
});
