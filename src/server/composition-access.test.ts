// The production composition over HTTP (decision log Impl-1 #24): access, the replay, the capability trace, the delivery and tick health, and the registry.
// Covers IDN-1.ingress and S-FR-IDN-7 (the session gate), S-SYS.replay through the real listings handler, IDN-3, S-SYS.tick, .deliveries, .health, and the whole registry wired (Story 13.5), all through serveTrpc as app/api/trpc/[trpc]/route.ts calls it.
// One of the composition-*.test.ts files split from composition.test.ts (test review HIGH-1); the harness,
// test-support/http-app.ts, composes a fresh app per test at T0 (HIGH-8).
import { describe, expect, it } from 'vitest';
import { cookieFor, SECRET, useComposedApp } from '../../test-support/http-app.js';
import { admin, at, DAY, failedDelivery, id, ins, listing, rows, T0, user } from '../../test-support/solu2/fixtures.js';
import { WIRED_PROCEDURES } from './composition.js';
import { PROCEDURES } from './trpc/inputs.generated.js';

const { db, signIn, post, get } = useComposedApp();

const profile = {
  displayName: 'Valentina', contactPhone: '+573001234567', phoneSharingConsent: true, phoneSharingConsentVersion: 'phone-v1',
  defaultMeetingPoint: { lat: 4.711, lng: -74.0721, city: 'Bogotá' },
};

describe('access.completeIndividualProfile over HTTP (IDN-1.ingress, S-FR-IDN-7)', () => {
  it('without a session it is NotAuthenticated 401 and nothing is written', async () => {
    const { status, json } = await post('access.completeIndividualProfile', profile);
    expect([status, json.error?.code]).toEqual([401, 'NotAuthenticated']);
    expect(await rows(db, 'IndividualSellerProfile')).toHaveLength(0);
  });

  it('a session cookie signed with another secret is NotAuthenticated 401', async () => {
    await user(db, { id: id('valentina') });
    await ins(db, 'Session', { id: id('sesforged'), userId: id('valentina'), token: 'forged-token', expiresAt: '2100-01-01T00:00:00.000Z' });
    const { status, json } = await post('access.completeIndividualProfile', profile, cookieFor('forged-token', `${SECRET}-other`));
    expect([status, json.error?.code]).toEqual([401, 'NotAuthenticated']);
  });

  it('a signed-in user completes the profile: 200, the explained decision, and the row is the session user\'s', async () => {
    await user(db, { id: id('valentina') });
    const { status, json } = await post('access.completeIndividualProfile', profile, await signIn(id('valentina')));
    expect(status).toBe(200);
    expect(json.result?.data).toMatchObject({ sellerKind: 'individual', completedAt: T0, decision: { outcome: 'allowed', reasonCode: 'IndividualSellerProfileCompleted' } });
    expect(await rows(db, 'IndividualSellerProfile')).toMatchObject([{ userId: id('valentina'), displayName: 'Valentina' }]);
    expect(await rows(db, 'User', 'id = $1', [id('valentina')])).toMatchObject([{ sellerTrack: 'individual' }]);
  });

  it('the actor comes from the session only: a userId in the input is RequestValidationFailed 400', async () => {
    await user(db, { id: id('valentina') });
    const { status, json } = await post('access.completeIndividualProfile', { ...profile, userId: id('mallory') }, await signIn(id('valentina')));
    expect([status, json.error?.code]).toEqual([400, 'RequestValidationFailed']);
    expect(await rows(db, 'IndividualSellerProfile')).toHaveLength(0);
  });

  it('a second submit is IndividualSellerProfileAlreadyComplete 409', async () => {
    await user(db, { id: id('valentina') });
    const cookie = await signIn(id('valentina'));
    expect((await post('access.completeIndividualProfile', profile, cookie)).status).toBe(200);
    const { status, json } = await post('access.completeIndividualProfile', profile, cookie);
    expect([status, json.error?.code]).toEqual([409, 'IndividualSellerProfileAlreadyComplete']);
    expect(await rows(db, 'IndividualSellerProfile')).toHaveLength(1);
  });
});

describe('admin.events.replay over HTTP (S-SYS.replay, S-FR-IDN-7)', () => {
  const replay = { eventId: id('ev1'), subscriber: 'listings' };

  async function failedListingsDelivery() {
    await failedDelivery(db, { eventId: id('ev1'), type: 'CommissionBalanceExhausted', aggregateId: id('tienda'), payload: { businessId: id('tienda'), ledgerSeq: 1, balanceAfter: 0 }, subscriber: 'listings' });
  }

  it('a signed-in non-admin is AdminOnly 403, and the delivery is untouched', async () => {
    await failedListingsDelivery();
    await user(db, { id: id('camila') });
    const { status, json } = await post('admin.events.replay', replay, await signIn(id('camila')));
    expect([status, json.error?.code]).toEqual([403, 'AdminOnly']);
    expect(await rows(db, 'EventReplayLog')).toHaveLength(0);
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'failed' }]);
  });

  it('an admin replays a failed delivery: 200 delivered, the log row names the session admin, and the real listings handler applied it (INV-3, Story 5.5)', async () => {
    await failedListingsDelivery();
    await admin(db);
    await listing(db, { id: id('ltienda'), sellerId: id('tienda'), unitId: null, kind: 'bundle' });
    const { status, json } = await post('admin.events.replay', replay, await signIn(id('admin')));
    expect(status).toBe(200);
    expect(json.result?.data).toMatchObject({ status: 'delivered', replayed: true, decision: { reasonCode: 'EventDeliveryReplayed' } });
    expect(await rows(db, 'EventReplayLog')).toMatchObject([{ adminId: id('admin'), outcome: 'delivered' }]);
    expect(await rows(db, 'SellerCommissionState')).toMatchObject([{ businessId: id('tienda'), lastAppliedSeq: '1', paused: true }]);
    expect(await rows(db, 'Listing', '"pausedAt" IS NOT NULL')).toHaveLength(1);
  });

  it('a delivery of a type listings does not subscribe to fails as Unexpected, and the replay records failed', async () => {
    await failedDelivery(db, { eventId: id('ev2'), type: 'OrderClosed', aggregateId: id('tienda'), payload: {}, subscriber: 'listings' });
    await admin(db);
    const { json } = await post('admin.events.replay', { eventId: id('ev2'), subscriber: 'listings' }, await signIn(id('admin')));
    expect(json.result?.data).toMatchObject({ status: 'failed' });
    expect(await rows(db, 'EventDelivery', `"eventId" = $1`, [id('ev2')])).toMatchObject([{ status: 'failed', lastErrorCode: 'Unexpected' }]);
  });
});

describe('access.traceCapabilities over HTTP (IDN-3, S-FR-IDN-7)', () => {
  it('a signed-in non-admin is AdminOnly 403, and nothing is audited', async () => {
    await user(db, { id: id('camila') });
    const { status, json } = await post('access.traceCapabilities', { targetUserId: id('camila') }, await signIn(id('camila')));
    expect([status, json.error?.code]).toEqual([403, 'AdminOnly']);
    expect(await db.counts(['CapabilityAuditRead', 'audit_events'])).toEqual({ CapabilityAuditRead: 0, audit_events: 0 });
  });

  it('an admin traces an account: 200 with the six lines, and the audit row names the session admin', async () => {
    await admin(db);
    await user(db, { id: id('camila') });
    const { status, json } = await post('access.traceCapabilities', { targetUserId: id('camila') }, await signIn(id('admin')));
    expect(status).toBe(200);
    expect(json.result?.data).toMatchObject({ targetUserId: id('camila'), sellerKind: 'none', decision: { reasonCode: 'CapabilitiesTraced' } });
    expect(json.result?.data.capabilities).toHaveLength(6);
    expect(await rows(db, 'CapabilityAuditRead')).toMatchObject([{ adminId: id('admin'), targetUserId: id('camila') }]);
  });

  it('an unknown target is AccountNotFound 404, and nothing is audited', async () => {
    await admin(db);
    const { status, json } = await post('access.traceCapabilities', { targetUserId: id('nobody') }, await signIn(id('admin')));
    expect([status, json.error?.code]).toEqual([404, 'AccountNotFound']);
    expect(await db.counts(['CapabilityAuditRead', 'audit_events'])).toEqual({ CapabilityAuditRead: 0, audit_events: 0 });
  });
});

describe('the delivery and tick health over HTTP (S-SYS.tick, .deliveries, .health; Story 1.5)', () => {
  it('a signed-in non-admin is AdminOnly 403 on each read', async () => {
    await user(db, { id: id('camila') });
    const cookie = await signIn(id('camila'));
    for (const [path, input] of [['admin.jobs.tickHealth', {}], ['admin.events.deliveries', { kind: 'failed', cursor: null }], ['admin.events.deliveryHealth', {}]] as const) {
      const { status, json } = await get(path, input, cookie);
      expect([path, status, json.error?.code]).toEqual([path, 403, 'AdminOnly']);
    }
  });

  it('an admin reads the three: the health counts, the failed page and the explained tick', async () => {
    await admin(db);
    await failedDelivery(db, { eventId: id('ev1'), type: 'CommissionBalanceExhausted', aggregateId: id('tienda'), payload: { businessId: id('tienda'), ledgerSeq: 1, balanceAfter: 0 }, subscriber: 'listings' });
    const cookie = await signIn(id('admin'));
    expect((await get('admin.events.deliveryHealth', {}, cookie)).json.result?.data).toEqual({ failedCount: 1, oldestFirstFailedAt: at(-DAY), stuckPendingCount: 0, latestDigest: null });
    const page = await get('admin.events.deliveries', { kind: 'failed', cursor: null }, cookie);
    expect(page.json.result?.data).toMatchObject({ rows: [{ eventId: id('ev1'), eventType: 'CommissionBalanceExhausted', subscriber: 'listings', attempts: 3 }], nextCursor: null });
    const tick = await get('admin.jobs.tickHealth', {}, cookie);
    // T0 is 10:00 Bogotá, before the 10:17 window opens: no tick yet is not silence.
    expect(tick.json.result?.data).toMatchObject({ lastTickStartedAt: null, tickSilent: false, decision: { reasonCode: 'TickOnSchedule', citations: [{ rule: 'AD-SYS-2' }] } });
  });

  it('a cursor the list did not issue is RequestValidationFailed 400 with its issue', async () => {
    await admin(db);
    const { status, json } = await get('admin.events.deliveries', { kind: 'failed', cursor: 'x' }, await signIn(id('admin')));
    expect([status, json.error?.code]).toEqual([400, 'RequestValidationFailed']);
    expect(json.error?.issues).toEqual([{ field: 'cursor', issue: 'no corresponde a una página de esta lista' }]);
  });
});

describe('the whole registry is wired (Story 13.5, the last stories)', () => {
  it('every registry procedure has a resolver, so none answers NotImplemented', () => {
    expect([...WIRED_PROCEDURES].sort()).toEqual(PROCEDURES.map((p) => p.procedure).sort());
  });
});
