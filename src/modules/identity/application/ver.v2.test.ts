// VerServiceV2.submitApplication (VER-2), the edges the bound tests leave out: each promotion
// refusal (P3) and what it leaves in storage, the cleanup after a refused transaction (Q-fail),
// the shape stage (P1–P2) without the regulated value, P6–P7, and the 23505 savepoint (I1).
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { business, explainAssert, id, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';
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
