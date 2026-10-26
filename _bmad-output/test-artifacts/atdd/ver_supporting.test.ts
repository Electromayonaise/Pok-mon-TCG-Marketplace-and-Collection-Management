// ATDD — VER supporting contracts, offered ports and read models (contracts.md §15). Split from ver_contracts.test.ts (test review R-7..R-12).
import { describe, expect, it } from 'vitest';
import { VerServiceV2 } from '../../../src/modules/identity/index.js';
import type { SubmitApplicationRequest } from '../../../src/modules/identity/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { caught } from '../../../test-support/errors.js';
import { codeOf, race } from '../../../test-support/concurrency.js';
import { admin, at, business, DAY, id, ins, rejectionReason, rows, user, wiring } from '../../../test-support/solu2/fixtures.js';

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
