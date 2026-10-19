// ATDD — IDN (contracts.md §1, §15). Red phase: every test calls a v2 stub and must fail with
// NotImplementedError (scripts/check-atdd-red.mjs). Given steps use the Solu-2 schema factories.
import { describe, expect, it } from 'vitest';
import { IdnServiceV2, VerServiceV2 } from '../../../../src/modules/identity/index.js';
import type { CompleteIndividualProfileRequest, SubmitApplicationRequest } from '../../../../src/modules/identity/index.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, httpOf, citedInputs } from '../../../../test-support/errors.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { admin, business, explainAssert, id, individualSeller, ins, rows, T0, user, wiring } from '../../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();
const idn = () => new IdnServiceV2(wiring(db));
const ver = () => new VerServiceV2(wiring(db));

const profileInput = (userId: string): CompleteIndividualProfileRequest => ({
  userId, displayName: 'Valentina', contactPhone: '+573001234567', phoneSharingConsent: true, phoneSharingConsentVersion: 'phone-v1',
  defaultMeetingPoint: { lat: 4.711, lng: -74.0721, city: 'Bogotá' },
});
const applicationInput = (businessId: string): SubmitApplicationRequest => ({
  businessId, businessName: 'Cartas Andrés', legalIdentity: { type: 'NIT', number: '9001234563' }, documentUploadKeys: [`business-document/${businessId}/doc1`],
  externalPresenceUrl: 'https://instagram.com/cartasandres', city: 'Medellín',
  paymentInstructions: { bankName: 'Bancolombia', accountType: 'savings', accountNumber: '12345678901', holderName: 'Andrés', qrUploadKey: null },
  consentAccepted: true, consentVersion: 'privacy-v1',
});

describe('IDN-1 — claimSellerTrack (contracts.md §1)', () => {
  it('[IDN-1.Q1] a user with no track claims individual: the track is set and one audit row is written', async () => {
    await user(db, { id: id('valentina') });
    const result = await db.transactions.run((tx) => idn().claimSellerTrack(tx, { userId: id('valentina'), track: 'individual' }));
    expect(result).toEqual({ claimed: 'individual' });
    expect(await rows(db, 'User', 'id = $1', [id('valentina')])).toMatchObject([{ sellerTrack: 'individual' }]);
    expect(await rows(db, 'audit_events', `action = 'identity.sellerTrack.claimed'`)).toHaveLength(1);
  });

  it('[IDN-1.QF1] an individual claim by a business with a Pending application is BusinessApplicationOnFile (409); nothing changes', async () => {
    await business(db, id('andres'), 'Pending');
    const error = await caught(() => db.transactions.run((tx) => idn().claimSellerTrack(tx, { userId: id('andres'), track: 'individual' })));
    expect(codeOf(error)).toBe('BusinessApplicationOnFile');
    expect(httpOf(error)).toBe(409);
    expect(await rows(db, 'User', 'id = $1', [id('andres')])).toMatchObject([{ sellerTrack: 'business' }]);
    expect(await rows(db, 'audit_events')).toHaveLength(0);
  });

  it('[IDN-1.QF2] a business claim by a complete individual seller is IndividualSellerProfileAlreadyComplete (409)', async () => {
    await individualSeller(db, id('valentina'));
    const error = await caught(() => db.transactions.run((tx) => idn().claimSellerTrack(tx, { userId: id('valentina'), track: 'business' })));
    expect(codeOf(error)).toBe('IndividualSellerProfileAlreadyComplete');
    expect(httpOf(error)).toBe(409);
  });

  it('[IDN-1.I1] after a refused business claim no BusinessApplication can exist for an individual (AD-IDN-2, AD-18)', async () => {
    await individualSeller(db, id('valentina'));
    const error = await caught(() => db.transactions.run((tx) => idn().claimSellerTrack(tx, { userId: id('valentina'), track: 'business' })));
    expect(codeOf(error)).toBe('IndividualSellerProfileAlreadyComplete');
    const [{ n } = { n: -1 }] = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM "User" u JOIN "BusinessApplication" a ON a."businessId" = u.id WHERE u."sellerTrack" = 'individual'`);
    expect(n).toBe(0);
    expect(await rows(db, 'User', 'id = $1', [id('valentina')])).toMatchObject([{ sellerTrack: 'individual' }]);
  });

  it('[IDN-1.MEC] profile completion races an application submit, 100 repetitions on fresh accounts: exactly one wins each time (NFR-IDN-2)', async () => {
    for (let rep = 0; rep < 100; rep++) {
      const u = id(`race${rep}`);
      await user(db, { id: u });
      const outcome = await race<unknown>(2, (i) => (i === 0 ? idn().completeIndividualProfile(profileInput(u)) : ver().submitApplication(applicationInput(u))));
      expect(outcome.rejected.map(codeOf).filter((c) => !['IndividualSellerProfileAlreadyComplete', 'AlreadyVerifiedBusiness', 'BusinessApplicationOnFile'].includes(c))).toEqual([]);
      expect(outcome.fulfilled).toHaveLength(1);
      const [{ both } = { both: -1 }] = await db.query<{ both: number }>(
        `SELECT count(*)::int AS both FROM "IndividualSellerProfile" p JOIN "BusinessApplication" a ON a."businessId" = p."userId" WHERE p."userId" = $1`, [u]);
      expect(both).toBe(0);
    }
  });

  it('[IDN-1.ingress.h] completing the profile sets the individual track and stores the regulated phone only in the profile', async () => {
    await user(db, { id: id('valentina') });
    const result = await idn().completeIndividualProfile(profileInput(id('valentina')));
    expect(result.sellerKind).toBe('individual');
    expect(result.completedAt).toBe(T0);
    expect(await rows(db, 'IndividualSellerProfile', '"userId" = $1', [id('valentina')])).toMatchObject([{ contactPhoneE164: '+573001234567', meetingCity: 'Bogotá' }]);
    expect(JSON.stringify(await rows(db, 'audit_events'))).not.toContain('+573001234567');
  });

  it('[IDN-1.ingress.f] completing the profile twice is IndividualSellerProfileAlreadyComplete; one profile row remains', async () => {
    await individualSeller(db, id('valentina'));
    const error = await caught(() => idn().completeIndividualProfile(profileInput(id('valentina'))));
    expect(codeOf(error)).toBe('IndividualSellerProfileAlreadyComplete');
    expect(await rows(db, 'IndividualSellerProfile')).toHaveLength(1);
  });
});

describe('IDN-2 — requireListingEligibility (contracts.md §1)', () => {
  it('[IDN-2.Q1] a Pending business may list, unverified, with a ListingUnverified notice citing FR-IDN-3', async () => {
    await business(db, id('andres'), 'Pending');
    const w = wiring(db);
    const result = await new IdnServiceV2(w).requireListingEligibility({ userId: id('andres') });
    expect(result.listingKind).toBe('business');
    expect(result.verified).toBe(false);
    explainAssert(result.decision, { code: 'ListingUnverified', outcome: 'allowedWithNotice', rule: 'FR-IDN-3', inputs: { sellerKind: 'business', latestApplicationStatus: 'Pending' }, occurredAt: w.clock.iso() });
  });

  it('[IDN-2.QF1] a Rejected business gets SellerNotVerified (409) citing the application and its reapply date', async () => {
    const applicationId = await business(db, id('andres'), 'Rejected', { reapplyNotBefore: '2026-10-08T15:00:00.000Z' });
    const error = await caught(() => idn().requireListingEligibility({ userId: id('andres') }));
    expect(codeOf(error)).toBe('SellerNotVerified');
    expect(httpOf(error)).toBe(409);
    expect(citedInputs(error)).toMatchObject({ applicationId, reapplyNotBefore: '2026-10-08T15:00:00.000Z' });
  });

  it('[IDN-2.QF2] an account with no seller track gets IndividualSellerProfileIncomplete citing sellerKind none', async () => {
    await user(db, { id: id('camila') });
    const error = await caught(() => idn().requireListingEligibility({ userId: id('camila') }));
    expect(codeOf(error)).toBe('IndividualSellerProfileIncomplete');
    explainAssert(error, { code: 'IndividualSellerProfileIncomplete', rule: 'FR-IDN-3', inputs: { sellerKind: 'none' } });
  });

  it('[IDN-2.I1] the listing kind is derived from facts only: an admin flag never makes an individual a business (AD-IDN-1, AD-16)', async () => {
    await individualSeller(db, id('valentina'));
    await db.query(`UPDATE "User" SET "isAdmin" = true WHERE id = $1`, [id('valentina')]);
    const result = await idn().requireListingEligibility({ userId: id('valentina') });
    expect(result).toMatchObject({ listingKind: 'individual', verified: false });
  });
});

describe('IDN-3 — traceCapabilities (contracts.md §1)', () => {
  it('[IDN-3.Q1] the trace lists the six capabilities in fixed order, each with at least one source fact', async () => {
    await admin(db);
    await business(db, id('andres'), 'Rejected');
    const result = await idn().traceCapabilities({ targetUserId: id('andres'), adminId: id('admin') });
    expect(result.capabilities.map((c) => c.name)).toEqual(['canBuy', 'canListAsIndividual', 'canListAsBusiness', 'isVerifiedBusiness', 'canReceiveInAppMessages', 'canModerate']);
    for (const c of result.capabilities) expect(c.derivedFrom.length).toBeGreaterThanOrEqual(1);
    expect(result.capabilities.find((c) => c.name === 'canListAsBusiness')).toMatchObject({ value: false });
  });

  it('[IDN-3.Q2] every trace writes one CapabilityAuditRead and one admin audit row', async () => {
    await admin(db);
    await user(db, { id: id('camila') });
    await idn().traceCapabilities({ targetUserId: id('camila'), adminId: id('admin') });
    expect(await rows(db, 'CapabilityAuditRead')).toMatchObject([{ adminId: id('admin'), targetUserId: id('camila') }]);
    expect(await rows(db, 'audit_events', `action = 'identity.capabilities.traced'`)).toMatchObject([{ actorKind: 'admin' }]);
  });

  it('[IDN-3.P2] an unknown target is AccountNotFound (404) and writes nothing', async () => {
    await admin(db);
    const error = await caught(() => idn().traceCapabilities({ targetUserId: id('nobody'), adminId: id('admin') }));
    expect(codeOf(error)).toBe('AccountNotFound');
    expect(httpOf(error)).toBe(404);
    expect(await db.counts(['CapabilityAuditRead', 'audit_events'])).toEqual({ CapabilityAuditRead: 0, audit_events: 0 });
  });

  it('[IDN-3.I1] the trace never carries a legal-identity value (AD-VER-2, AD-13)', async () => {
    await admin(db);
    const applicationId = await business(db, id('andres'), 'Approved');
    await ins(db, 'BusinessApplicationLegalIdentity', { applicationId, type: 'NIT', number: '9001234563', documentKeys: ['ver-documents/doc1'] }, 'created');
    const result = await idn().traceCapabilities({ targetUserId: id('andres'), adminId: id('admin') });
    expect(JSON.stringify(result)).not.toContain('9001234563');
    expect(JSON.stringify(result)).not.toContain('ver-documents/doc1');
  });

  it('[IDN-3.I3] each traced value equals getCapabilities on the same facts (AD-IDN-1 rule 2)', async () => {
    await admin(db);
    await business(db, id('andres'), 'Approved');
    const trace = await idn().traceCapabilities({ targetUserId: id('andres'), adminId: id('admin') });
    const caps = await idn().getCapabilities({ userId: id('andres') });
    expect(Object.fromEntries(trace.capabilities.map((line) => [line.name, line.value]))).toEqual(caps.capabilities);
  });
});

describe('S-FR-IDN-6 — getSellerKinds / getReviewTarget (contracts.md §15)', () => {
  it('[S-FR-IDN-6.h] approving a business changes getSellerKinds on the next call (no cache)', async () => {
    await business(db, id('andres'), 'Pending');
    const before = await idn().getSellerKinds({ userIds: [id('andres')] });
    await db.query(`UPDATE "BusinessApplication" SET status = 'Approved', "decidedAt" = $1, "decidedBy" = $2 WHERE "businessId" = $3`, [T0, id('admin'), id('andres')]);
    const after = await idn().getSellerKinds({ userIds: [id('andres')] });
    expect(before.sellers).toEqual([{ userId: id('andres'), sellerKind: 'business', verified: false }]);
    expect(after.sellers).toEqual([{ userId: id('andres'), sellerKind: 'business', verified: true }]);
  });

  it('[S-FR-IDN-6.f] a review target that is no seller reads kind none', async () => {
    await user(db, { id: id('camila') });
    expect(await idn().getReviewTarget({ userId: id('camila') })).toEqual({ kind: 'none', verified: false });
  });
});

describe('S-FR-IDN-7 — requireCanBuy / checkAuthThrottle (contracts.md §15)', () => {
  it('[S-FR-IDN-7.h] a verified email holds canBuy, explained', async () => {
    await user(db, { id: id('camila') });
    const result = await idn().requireCanBuy({ userId: id('camila') });
    expect(result.canBuy).toBe(true);
    explainAssert(result.decision, { outcome: 'allowed', rule: 'FR-IDN-1' });
  });

  it('[S-FR-IDN-7.f] the 11th failed sign-in for one account within 15 minutes is AuthRateLimited (429) citing retryAt', async () => {
    await user(db, { id: id('camila') });
    for (let i = 0; i < 10; i++) await ins(db, 'AuthThrottleEvent', { id: id(`thr${i}`), scope: 'signInFail', key: id('camila') }, 'created');
    const error = await caught(() => idn().checkAuthThrottle({ scope: 'signInFail', accountId: id('camila'), ipHmac: 'a'.repeat(64) }));
    expect(codeOf(error)).toBe('AuthRateLimited');
    expect(httpOf(error)).toBe(429);
    expect(citedInputs(error)).toHaveProperty('retryAt');
  });
});

describe('Offered ports — identity (contracts.md §15.11)', () => {
  it('[P-IDN.capabilities.h] an unverified email gives canBuy=false citing emailVerified=false', async () => {
    await user(db, { id: id('julian'), emailVerified: false });
    const result = await idn().getCapabilities({ userId: id('julian') });
    expect(result.capabilities.canBuy).toBe(false);
    expect(result.derivedFrom).toContainEqual({ fact: 'emailVerified', value: false });
  });

  it('[P-IDN.verification.h] called inside an open transaction it completes on that connection', async () => {
    await business(db, id('andres'), 'Approved');
    const status = await db.transactions.run(async (tx) => {
      await tx.query('SELECT 1');
      return idn().getSellerVerification({ sellerId: id('andres') });
    });
    expect(status).toEqual({ status: 'Approved' });
  });

  it('[P-IDN.contact.h] the contact card carries the phone, and no audit row ever does', async () => {
    await individualSeller(db, id('valentina'));
    const card = await idn().getContactCard({ sellerId: id('valentina') });
    expect(card.contactPhoneE164).toBe('+573001234567');
    expect(JSON.stringify(await rows(db, 'audit_events'))).not.toContain('+573001234567');
  });

  it('[P-IDN.names.h] 500 ids resolve in one call with no phone and no email', async () => {
    for (let i = 0; i < 500; i++) await user(db, { id: id(`u${i}`) });
    const result = await idn().getDisplayNames({ userIds: Array.from({ length: 500 }, (_, i) => id(`u${i}`)) });
    expect(result.names).toHaveLength(500);
    expect(JSON.stringify(result)).not.toMatch(/@tezg\.test|\+57/);
  });
});
