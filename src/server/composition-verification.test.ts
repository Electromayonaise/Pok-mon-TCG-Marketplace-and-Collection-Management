// The production composition over HTTP (decision log Impl-1 #24): verification.
// Covers VER-1, VER-2, VER-3 and the supporting VER procedures (S-FR-VER-2, -5.audit, -7, -8, -9), all through serveTrpc as app/api/trpc/[trpc]/route.ts calls it.
// One of the composition-*.test.ts files split from composition.test.ts (test review HIGH-1); the harness,
// test-support/http-app.ts, composes a fresh app per test at T0 (HIGH-8).
import { describe, expect, it } from 'vitest';
import { useComposedApp } from '../../test-support/http-app.js';
import { admin, business, id, ins, rejectionReason, rows, user } from '../../test-support/solu2/fixtures.js';

const { db, storage, signIn, post, get } = useComposedApp();

describe('verification.submit over HTTP (VER-2, S-FR-IDN-7)', () => {
  const key = (userId: string) => `business-document/${userId}/doc1`;
  const application = (userId: string) => ({
    businessName: 'Cartas Andrés', legalIdentity: { type: 'NIT', number: '9001234568' }, documentUploadKeys: [key(userId)],
    externalPresenceUrl: 'https://instagram.com/cartasandres', city: 'Medellín',
    paymentInstructions: { bankName: 'Bancolombia', accountType: 'savings', accountNumber: '12345678901', holderName: 'Andrés', qrUploadKey: null },
    consentAccepted: true, consentVersion: 'privacy-v1',
  });

  it('without a session it is NotAuthenticated 401 and nothing is written', async () => {
    const { status, json } = await post('verification.submit', application(id('andres')));
    expect([status, json.error?.code]).toEqual([401, 'NotAuthenticated']);
    expect(await rows(db, 'BusinessApplication')).toHaveLength(0);
  });

  it('a signed-in user submits: 200 ApplicationSubmitted, and the application is the session user\'s', async () => {
    await user(db, { id: id('andres') });
    storage.simulateDirectUpload(key(id('andres')), new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]), 'application/pdf');
    const { status, json } = await post('verification.submit', application(id('andres')), await signIn(id('andres')));
    expect(status).toBe(200);
    expect(json.result?.data).toMatchObject({ decision: { outcome: 'allowed', reasonCode: 'ApplicationSubmitted' } });
    expect(await rows(db, 'BusinessApplication')).toMatchObject([{ businessId: id('andres'), status: 'Pending' }]);
  });
});

describe('verification.approve and verification.reject over HTTP (VER-1, S-FR-IDN-7)', () => {
  it('a signed-in non-admin is AdminOnly 403, and the application stays Pending', async () => {
    const applicationId = await business(db, id('andres'), 'Pending');
    await user(db, { id: id('camila') });
    const { status, json } = await post('verification.approve', { applicationId }, await signIn(id('camila')));
    expect([status, json.error?.code]).toEqual([403, 'AdminOnly']);
    expect(await rows(db, 'BusinessApplication')).toMatchObject([{ status: 'Pending' }]);
  });

  it('an admin approves: 200 ApplicationApproved, decided by the session admin', async () => {
    const applicationId = await business(db, id('andres'), 'Pending');
    await admin(db);
    const { status, json } = await post('verification.approve', { applicationId }, await signIn(id('admin')));
    expect(status).toBe(200);
    expect(json.result?.data).toMatchObject({ applicationId, status: 'Approved', decidedBy: id('admin'), decision: { reasonCode: 'ApplicationApproved' } });
    expect(await rows(db, 'ApplicationDecisionLog')).toMatchObject([{ adminId: id('admin'), decision: 'Approved' }]);
  });

  it('an admin rejects: 200 ApplicationRejected, with the reason and the note stored', async () => {
    await rejectionReason(db, { code: 'DataMismatch', cooldownDays: 7 });
    const applicationId = await business(db, id('andres'), 'Pending');
    await admin(db);
    const { status, json } = await post('verification.reject', { applicationId, reasonCode: 'DataMismatch', note: 'El NIT no coincide' }, await signIn(id('admin')));
    expect(status).toBe(200);
    expect(json.result?.data).toMatchObject({ status: 'Rejected', decision: { reasonCode: 'ApplicationRejected' } });
    expect(await rows(db, 'BusinessApplication')).toMatchObject([{ status: 'Rejected', rejectionReasonCode: 'DataMismatch', rejectionNote: 'El NIT no coincide' }]);
  });
});

describe('the supporting verification procedures over HTTP (S-FR-VER-2, -7, -8, -9; Story 3.5)', () => {
  it('a signed-in non-admin is AdminOnly 403 on the queue and on each reason procedure', async () => {
    await user(db, { id: id('camila') });
    const cookie = await signIn(id('camila'));
    expect((await get('verification.queue', { cursor: null }, cookie)).status).toBe(403);
    expect((await get('verification.reasons.list', {}, cookie)).json.error?.code).toBe('AdminOnly');
    expect((await post('verification.reasons.setActive', { code: 'DataMismatch', active: false }, cookie)).json.error?.code).toBe('AdminOnly');
  });

  it('an admin reads the queue and edits a reason, and the change row names the session admin', async () => {
    const applicationId = await business(db, id('andres'), 'Pending');
    await admin(db);
    const cookie = await signIn(id('admin'));
    expect((await get('verification.queue', { cursor: null }, cookie)).json.result?.data).toMatchObject({ items: [{ applicationId }], nextCursor: null });
    const upsert = await post('verification.reasons.upsert', { code: 'BlurryDocs', textEsCo: 'Los documentos no se leen bien.', policy: { barred: false, cooldownDays: 3 } }, cookie);
    expect(upsert.json.result?.data).toEqual({ code: 'BlurryDocs', changed: true });
    expect((await get('verification.reasons.list', {}, cookie)).json.result?.data).toMatchObject({ reasons: [{ code: 'BlurryDocs', active: true }] });
    expect(await rows(db, 'RejectionReasonChange')).toMatchObject([{ code: 'BlurryDocs', adminId: id('admin') }]);
  });

  it('a business reads its own status and edits its own payment instructions', async () => {
    await business(db, id('andres'), 'Approved');
    const cookie = await signIn(id('andres'));
    expect((await get('verification.myStatus', {}, cookie)).json.result?.data).toMatchObject({ status: 'Approved', decision: { reasonCode: 'VerificationApproved' } });
    const instructions = { bankName: 'Davivienda', accountType: 'checking', accountNumber: '99887766554', holderName: 'Andrés Tienda', qrUploadKey: null };
    expect((await post('verification.updatePaymentInstructions', { instructions }, cookie)).status).toBe(200);
    expect(await rows(db, 'BusinessProfile')).toMatchObject([{ businessId: id('andres'), bankName: 'Davivienda' }]);
  });
});

describe('the legal-identity read and its audit over HTTP (VER-3, S-FR-VER-5.audit; Story 3.4)', () => {
  const withLegalIdentity = async () => {
    const applicationId = await business(db, id('andres'), 'Pending');
    await ins(db, 'BusinessApplicationLegalIdentity', { applicationId, type: 'NIT', number: '9001234568', documentKeys: ['ver-documents/doc1'] }, 'created');
    return applicationId;
  };

  it('a signed-in non-admin reaches the service: LegalIdentityAccessDenied 403, and the denial row names the session user', async () => {
    const applicationId = await withLegalIdentity();
    await user(db, { id: id('camila') });
    const { status, json } = await post('verification.getApplicationForReview', { applicationId }, await signIn(id('camila')));
    expect([status, json.error?.code]).toEqual([403, 'LegalIdentityAccessDenied']);
    expect(await rows(db, 'LegalIdentityAccessLog')).toMatchObject([{ actorId: id('camila'), applicationId, outcome: 'denied' }]);
  });

  it('an admin reads the application and then the audit: 200, one granted row by the session admin, and a non-admin is AdminOnly on the audit', async () => {
    const applicationId = await withLegalIdentity();
    await admin(db);
    const cookie = await signIn(id('admin'));
    const read = await post('verification.getApplicationForReview', { applicationId }, cookie);
    expect(read.status).toBe(200);
    expect(read.json.result?.data).toMatchObject({ applicationId, legalIdentity: { type: 'NIT', number: '9001234568' } });
    expect((await get('verification.legalIdentityAudit', { cursor: null, applicationId }, cookie)).json.result?.data)
      .toMatchObject({ rows: [{ actorId: id('admin'), applicationId, outcome: 'granted' }], nextCursor: null });
    await user(db, { id: id('camila') });
    expect((await get('verification.legalIdentityAudit', { cursor: null }, await signIn(id('camila')))).json.error?.code).toBe('AdminOnly');
  });
});
