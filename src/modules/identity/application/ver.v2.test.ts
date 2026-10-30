// VerServiceV2.submitApplication (VER-2), the edges the bound tests leave out: each promotion
// refusal (P3) and what it leaves in storage, the cleanup after a refused transaction (Q-fail),
// the shape stage (P1–P2) without the regulated value, P6–P7, and the 23505 savepoint (I1).
// decideApplication (VER-1): the race loser's re-read (Q-fail) and the barred snapshot (Q2).
// The supporting contracts (S-FR-VER-2, -7, -8, -9): every rule-6 branch, upsert no-ops and shape,
// queue paging and its cursor, the none and barred copies, and the payment-instruction edges.
// VER-3 and S-FR-VER-5.audit: the denial that survives its error, what the audit rows leave out,
// the signed keys, and the access log's paging, filter and foreign cursor.
// MSG-3: a Rejected business, the read on a pool of 1, and the FOR SHARE that holds a rejection back.
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { PgTransactionRunner, useTestDatabase } from '../../../../test-support/db.js';
import { PG } from '../../../../test-support/env.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { admin, at, business, DAY, explainAssert, id, ins, rejectionReason, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { encodeQueueCursor } from '../domain/ver.js';
import type { SubmitApplicationRequest } from '../dto/ver.v2.dto.js';
import { PgVerRepository } from '../infra/pg.js';
import { VerServiceV2 } from './ver.v2.js';

const db = useTestDatabase();
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

function setup() {
  const w = wiring(db);
  return { w, ver: new VerServiceV2(w) };
}
const keyOf = (businessId: string, name = 'doc1') => `business-document/${businessId}/${name}`;
function application(businessId: string, o: Partial<SubmitApplicationRequest> = {}): SubmitApplicationRequest {
  return {
    businessId, businessName: 'Cartas Andrés', legalIdentity: { type: 'NIT', number: '9001234568' }, documentUploadKeys: [keyOf(businessId)],
    externalPresenceUrl: 'https://instagram.com/cartasandres', city: 'Medellín',
    paymentInstructions: { bankName: 'Bancolombia', accountType: 'savings', accountNumber: '12345678901', holderName: 'Andrés', qrUploadKey: null },
    consentAccepted: true, consentVersion: 'privacy-v1', ...o,
  };
}
const bucketKeys = (w: ReturnType<typeof wiring>, bucket: string) => [...w.storage.objects.keys()].filter((k) => k.startsWith(`${bucket}/`));

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
    for (const o of [{ businessName: ' a ' }, { city: 'Medell\u0000ín' }]) {
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

describe('VerServiceV2.decideApplication — admin only (AD-16)', () => {
  it('a non-admin is AdminOnly, even past the router, and nothing is written', async () => {
    await user(db, { id: id('camila') });
    const applicationId = await business(db, id('andres'), 'Pending');
    const error = await caught(() => setup().ver.decideApplication({ applicationId, decision: { kind: 'approve' }, adminId: id('camila') }));
    expect(codeOf(error)).toBe('AdminOnly');
    expect(await db.counts(['ApplicationDecisionLog', 'OutboxEvent', 'audit_events'])).toEqual({ ApplicationDecisionLog: 0, OutboxEvent: 0, audit_events: 0 });
  });
});

describe('VerServiceV2.decideApplication — the race loser (VER-1 Q-fail, AD-VER-1 rule 3)', () => {
  /** The P3 read saw Pending, but another decider committed first: the UPDATE matches 0 rows. */
  function staleRead(w: ReturnType<typeof wiring>) {
    const repo = Object.create(w.repo) as typeof w.repo;
    let reads = 0;
    repo.readDecisionState = async (tx, applicationId) =>
      reads++ === 0 ? { status: 'Pending', decidedBy: null, decidedAt: null } : w.repo.readDecisionState(tx, applicationId);
    return new VerServiceV2({ ...w, repo });
  }

  it('re-reads and names the winner, and writes no log, audit or event row', async () => {
    await admin(db);
    await admin(db, id('admin2'));
    const applicationId = await business(db, id('andres'), 'Approved');
    const error = await caught(() => staleRead(wiring(db)).decideApplication({ applicationId, decision: { kind: 'approve' }, adminId: id('admin2') }));
    expect(codeOf(error)).toBe('ApplicationNotPending');
    expect(citedInputs(error)).toEqual({ status: 'Approved', decidedBy: id('admin'), decidedAt: at(-DAY) });
    expect(await db.counts(['ApplicationDecisionLog', 'OutboxEvent', 'audit_events'])).toEqual({ ApplicationDecisionLog: 0, OutboxEvent: 0, audit_events: 0 });
  });

  it('a row gone by the re-read is ApplicationNotFound', async () => {
    await admin(db);
    const error = await caught(() => staleRead(wiring(db)).decideApplication({ applicationId: id('noapp'), decision: { kind: 'approve' }, adminId: id('admin') }));
    expect(codeOf(error)).toBe('ApplicationNotFound');
  });
});

describe('VerServiceV2.decideApplication — the barred snapshot (VER-1 Q2, AD-VER-1 rule 5)', () => {
  it('a barred reason sets reapplyBarred with no date, publishes barred: true and cites it', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'Fraud', barred: true });
    const applicationId = await business(db, id('andres'), 'Pending');
    const { ver } = setup();
    const result = await ver.decideApplication({ applicationId, decision: { kind: 'reject', reasonCode: 'Fraud', note: 'Documento alterado' }, adminId: id('admin') });
    expect(await rows(db, 'BusinessApplication', 'id = $1', [applicationId])).toMatchObject([{ status: 'Rejected', reapplyBarred: true, reapplyNotBefore: null, rejectionNote: 'Documento alterado' }]);
    const [event] = await rows<{ payload: Record<string, unknown> }>(db, 'OutboxEvent', `type = 'BusinessApplicationRejected'`);
    expect(event?.payload).toMatchObject({ applicationId, reasonCode: 'Fraud', barred: true });
    expect(event?.payload).not.toHaveProperty('reapplyNotBefore');
    explainAssert(result.decision, { outcome: 'allowed', rule: 'FR-VER-4', inputs: { applicationId, reasonCode: 'Fraud', barred: true } });
    expect(await rows(db, 'ApplicationDecisionLog')).toMatchObject([{ decision: 'Rejected', reasonCode: 'Fraud', adminId: id('admin') }]);
  });

  it('a later edit of the reason never moves the snapshot', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'DataMismatch', cooldownDays: 7 });
    const applicationId = await business(db, id('andres'), 'Pending');
    const { w, ver } = setup();
    await ver.decideApplication({ applicationId, decision: { kind: 'reject', reasonCode: 'DataMismatch', note: null }, adminId: id('admin') });
    await db.query(`UPDATE "RejectionReason" SET "cooldownDays" = 30 WHERE code = 'DataMismatch'`);
    const [app] = await rows<{ reapplyNotBefore: Date }>(db, 'BusinessApplication', 'id = $1', [applicationId]);
    expect(app?.reapplyNotBefore.toISOString()).toBe(new Date(w.clock.now().getTime() + 7 * DAY).toISOString());
  });
});

describe('VerServiceV2.setRejectionReasonActive (S-FR-VER-8.active, AD-VER-1 rule 6)', () => {
  const changes = () => rows<{ before: { active: boolean } | null; after: { active: boolean } }>(db, 'RejectionReasonChange');

  it('deactivating an absent or already inactive code is a no-op with no change or audit row (AEC-08)', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'DataMismatch' });
    await rejectionReason(db, { code: 'Fraud', active: false });
    const { ver } = setup();
    expect(await ver.setRejectionReasonActive({ adminId: id('admin'), code: 'Nope', active: false })).toEqual({ code: 'Nope', active: false, changed: false });
    expect(await ver.setRejectionReasonActive({ adminId: id('admin'), code: 'Fraud', active: false })).toEqual({ code: 'Fraud', active: false, changed: false });
    expect(await db.counts(['RejectionReasonChange', 'audit_events'])).toEqual({ RejectionReasonChange: 0, audit_events: 0 });
  });

  it('the only active reason is LastActiveReasonRequired citing AD-VER-1', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'DataMismatch' });
    await rejectionReason(db, { code: 'Fraud', active: false });
    const error = await caught(() => setup().ver.setRejectionReasonActive({ adminId: id('admin'), code: 'DataMismatch', active: false }));
    explainAssert(error, { code: 'LastActiveReasonRequired', rule: 'AD-VER-1', inputs: { code: 'DataMismatch' } });
    expect(await rows(db, 'RejectionReason', `code = 'DataMismatch'`)).toMatchObject([{ active: true }]);
  });

  it('activating an unknown code is RejectionReasonUnknown', async () => {
    await admin(db);
    const error = await caught(() => setup().ver.setRejectionReasonActive({ adminId: id('admin'), code: 'Nope', active: true }));
    explainAssert(error, { code: 'RejectionReasonUnknown', rule: 'FR-VER-8', inputs: { reasonCode: 'Nope' } });
  });

  it('activating an inactive reason writes one change row and one audit row; again is a no-op', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'Fraud', barred: true, active: false });
    const { ver } = setup();
    expect(await ver.setRejectionReasonActive({ adminId: id('admin'), code: 'Fraud', active: true })).toEqual({ code: 'Fraud', active: true, changed: true });
    expect(await ver.setRejectionReasonActive({ adminId: id('admin'), code: 'Fraud', active: true })).toEqual({ code: 'Fraud', active: true, changed: false });
    expect(await changes()).toMatchObject([{ code: 'Fraud', adminId: id('admin'), before: { active: false }, after: { active: true } }]);
    expect(await rows(db, 'audit_events', `action = 'verification.rejectionReason.changed'`)).toMatchObject([{ aggregateId: 'Fraud' }]);
  });
});

describe('VerServiceV2.upsertRejectionReason (S-FR-VER-8.upsert)', () => {
  const policyOf = (cooldownDays: number) => ({ barred: false as const, cooldownDays });

  it('a new code is created active with a change row whose before is null', async () => {
    await admin(db);
    const { ver } = setup();
    const result = await ver.upsertRejectionReason({ adminId: id('admin'), code: 'BlurryDocs', textEsCo: 'Los documentos no se leen bien.', policy: policyOf(3) });
    expect(result).toEqual({ code: 'BlurryDocs', changed: true });
    expect(await rows(db, 'RejectionReason')).toMatchObject([{ code: 'BlurryDocs', cooldownDays: 3, barred: false, active: true }]);
    expect(await rows(db, 'RejectionReasonChange')).toMatchObject([{ before: null, after: { code: 'BlurryDocs', active: true } }]);
  });

  it('the same text and policy is a no-op; a barred policy clears the cooldown and keeps active', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'DataMismatch', cooldownDays: 7, active: false });
    const { ver } = setup();
    const textEsCo = 'Motivo de rechazo DataMismatch.';
    expect(await ver.upsertRejectionReason({ adminId: id('admin'), code: 'DataMismatch', textEsCo, policy: policyOf(7) })).toEqual({ code: 'DataMismatch', changed: false });
    expect(await ver.upsertRejectionReason({ adminId: id('admin'), code: 'DataMismatch', textEsCo, policy: { barred: true } })).toEqual({ code: 'DataMismatch', changed: true });
    expect(await rows(db, 'RejectionReason')).toMatchObject([{ barred: true, cooldownDays: null, active: false }]);
    expect(await rows(db, 'RejectionReasonChange')).toMatchObject([{ before: { barred: false, cooldownDays: 7 }, after: { barred: true, cooldownDays: null, active: false } }]);
  });

  it('a bad code, a short text and a cooldown over 365 are refused field by field before any read', async () => {
    const error = await caught(() => setup().ver.upsertRejectionReason({ adminId: id('nobody'), code: 'bad', textEsCo: 'corto', policy: policyOf(400) })) as { code: string; citations: { inputs: { field: string } }[] };
    expect(error.code).toBe('RequestValidationFailed');
    expect(error.citations.map((c) => c.inputs.field)).toEqual(['code', 'textEsCo', 'policy.cooldownDays']);
  });

  it('a non-admin is AdminOnly and nothing is written', async () => {
    await user(db, { id: id('andres') });
    const error = await caught(() => setup().ver.upsertRejectionReason({ adminId: id('andres'), code: 'BlurryDocs', textEsCo: 'Los documentos no se leen bien.', policy: policyOf(3) }));
    expect(codeOf(error)).toBe('AdminOnly');
    expect(await db.counts(['RejectionReason', 'RejectionReasonChange'])).toEqual({ RejectionReason: 0, RejectionReasonChange: 0 });
  });
});

describe('VerServiceV2.listReviewQueue (S-FR-VER-2) — paging', () => {
  it('pages 25 at a time by ("submittedAt", id), ties broken by id, and the last page has no cursor', async () => {
    await admin(db);
    const ids = Array.from({ length: 26 }, (_, i) => id(`b${i}`));
    const expected: string[] = [];
    for (const businessId of ids) expected.push(await business(db, businessId, 'Pending', { submittedAt: at(-DAY) }));
    expected.sort();
    const { ver } = setup();
    const first = await ver.listReviewQueue({ adminId: id('admin'), cursor: null });
    expect(first.items.map((r) => r.applicationId)).toEqual(expected.slice(0, 25));
    expect(first.nextCursor).not.toBeNull();
    const second = await ver.listReviewQueue({ adminId: id('admin'), cursor: first.nextCursor });
    expect(second).toEqual({ items: [expect.objectContaining({ applicationId: expected[25] })], nextCursor: null });
  });

  it('a cursor it never issued is RequestValidationFailed on the cursor field', async () => {
    await admin(db);
    const error = await caught(() => setup().ver.listReviewQueue({ adminId: id('admin'), cursor: 'bm9wZQ' })) as { code: string; citations: { inputs: { field: string } }[] };
    expect(error.code).toBe('RequestValidationFailed');
    expect(error.citations.map((c) => c.inputs.field)).toEqual(['cursor']);
  });
});

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
    const pool = new pg.Pool({ ...PG, database: (db.pool.options as { database: string }).database, max: 1 });
    try {
      const transactions = new PgTransactionRunner(pool);
      const ver = new VerServiceV2({ ...wiring(db), transactions });
      let rejected = false;
      let rejection: Promise<unknown> = Promise.resolve();
      await transactions.run(async () => {
        expect(await ver.requireMessagingEligibility({ businessId: id('andres') })).toMatchObject({ status: 'Approved', verified: true });
        rejection = db.query(`UPDATE "BusinessApplication" SET status = 'Rejected', "rejectionReasonCode" = 'DataMismatch', "reapplyNotBefore" = $1 WHERE "businessId" = $2`, [at(DAY), id('andres')])
          .then(() => { rejected = true; });
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(rejected).toBe(false);
      });
      await rejection;
      expect(rejected).toBe(true);
    } finally {
      await pool.end();
    }
  });
});
