// The production composition over HTTP (decision log Impl-1 #24): a real Better Auth session on
// the test database, the identity gate, and the resolvers of IDN-1.ingress and S-SYS.replay,
// all through serveTrpc as app/api/trpc/[trpc]/route.ts calls it.
import { createHmac, randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client.js';
import { VirtualClock } from '../../test-support/clock.js';
import { useTestDatabase } from '../../test-support/db.js';
import { admin, at, DAY, id, ins, rows, T0, user } from '../../test-support/solu2/fixtures.js';
import { createAuth } from './auth.js';
import { compose } from './composition.js';
import { betterAuthSessions } from './sessions.js';
import { serveTrpc } from './trpc/init.js';

const db = useTestDatabase();
const SECRET = 'composition-test-secret-0123456789abcdef';
const clock = new VirtualClock();
let app: ReturnType<typeof compose>;
let sessions = 0;

beforeAll(() => {
  const auth = createAuth({ prisma: new PrismaClient({ adapter: new PrismaPg(db.pool) }), secret: SECRET, baseUrl: 'http://localhost:3000' });
  const ok = async () => undefined;
  app = compose({ pool: db.pool, clock, sessions: betterAuthSessions(auth), handlers: { commission: ok, listings: ok, collections: ok } });
});

/** A live `"Session"` row and the cookie Better Auth signs for it (HMAC-SHA256 of the token). */
async function signIn(userId: string): Promise<string> {
  const token = randomBytes(24).toString('hex');
  // Better Auth checks expiry on the wall clock, not the test clock: the row must outlive the run.
  await ins(db, 'Session', { id: id(`ses${++sessions}`), userId, token, expiresAt: '2100-01-01T00:00:00.000Z' });
  return cookieFor(token, SECRET);
}

const cookieFor = (token: string, secret: string) =>
  `better-auth.session_token=${encodeURIComponent(`${token}.${createHmac('sha256', secret).update(token).digest('base64')}`)}`;

async function post(path: string, input: unknown, cookie?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) };
  const res = await serveTrpc(new Request(`http://localhost/api/trpc/${path}`, { method: 'POST', headers, body: JSON.stringify(input) }), app.router, clock, { identity: app.identity });
  return { status: res.status, json: (await res.json()) as { result?: { data: Record<string, unknown> }; error?: Record<string, unknown> } };
}

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

  async function failedDelivery() {
    await ins(db, 'OutboxEvent', { id: id('ev1'), type: 'CommissionBalanceExhausted', aggregateId: id('tienda'), schemaVersion: 1, payload: JSON.stringify({ businessId: id('tienda'), ledgerSeq: 1, balanceAfter: 0 }) }, 'created');
    await ins(db, 'EventDelivery', { eventId: id('ev1'), subscriber: 'listings', status: 'failed', attempts: 3, lastErrorCode: 'DeliveryAttemptsExhausted', firstFailedAt: at(-DAY), lastFailedAt: at(-DAY) });
  }

  it('a signed-in non-admin is AdminOnly 403, and the delivery is untouched', async () => {
    await failedDelivery();
    await user(db, { id: id('camila') });
    const { status, json } = await post('admin.events.replay', replay, await signIn(id('camila')));
    expect([status, json.error?.code]).toEqual([403, 'AdminOnly']);
    expect(await rows(db, 'EventReplayLog')).toHaveLength(0);
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'failed' }]);
  });

  it('an admin replays a failed delivery: 200 delivered, and the log row names the session admin', async () => {
    await failedDelivery();
    await admin(db);
    const { status, json } = await post('admin.events.replay', replay, await signIn(id('admin')));
    expect(status).toBe(200);
    expect(json.result?.data).toMatchObject({ status: 'delivered', replayed: true, decision: { reasonCode: 'EventDeliveryReplayed' } });
    expect(await rows(db, 'EventReplayLog')).toMatchObject([{ adminId: id('admin'), outcome: 'delivered' }]);
  });
});

describe('the delivery and tick health over HTTP (S-SYS.tick, .deliveries, .health; Story 1.5)', () => {
  async function get(path: string, input: unknown, cookie: string) {
    const url = `http://localhost/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`;
    const res = await serveTrpc(new Request(url, { headers: { cookie } }), app.router, clock, { identity: app.identity });
    return { status: res.status, json: (await res.json()) as { result?: { data: Record<string, unknown> }; error?: Record<string, unknown> } };
  }

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
    await ins(db, 'OutboxEvent', { id: id('ev1'), type: 'CommissionBalanceExhausted', aggregateId: id('tienda'), schemaVersion: 1, payload: JSON.stringify({ businessId: id('tienda'), ledgerSeq: 1, balanceAfter: 0 }) }, 'created');
    await ins(db, 'EventDelivery', { eventId: id('ev1'), subscriber: 'listings', status: 'failed', attempts: 3, lastErrorCode: 'DeliveryAttemptsExhausted', firstFailedAt: at(-DAY), lastFailedAt: at(-DAY) });
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

describe('the rest of the registry stays unwired', () => {
  it('a procedure no done story implements is still Unexpected 500 behind a real session', async () => {
    await user(db, { id: id('camila') });
    const { status, json } = await post('commission.createTopUpProofUpload', {}, await signIn(id('camila')));
    expect([status, json.error?.code]).toEqual([500, 'Unexpected']);
  });
});
