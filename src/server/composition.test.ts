// The production composition over HTTP (decision log Impl-1 #24): a real Better Auth session on
// the test database, the identity gate, and the resolvers of IDN-1.ingress, IDN-3, VER-1, VER-2, VER-3, the supporting
// VER contracts and S-SYS.replay,
// all through serveTrpc as app/api/trpc/[trpc]/route.ts calls it.
import { createHmac, randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client.js';
import { VirtualClock } from '../../test-support/clock.js';
import { useTestDatabase } from '../../test-support/db.js';
import { InMemoryObjectStorage, SimulatedScanner } from '../../test-support/simulated/index.js';
import { admin, at, business, DAY, id, ins, rejectionReason, rows, T0, user } from '../../test-support/solu2/fixtures.js';
import { createAuth } from './auth.js';
import { compose } from './composition.js';
import { betterAuthSessions } from './sessions.js';
import { serveTrpc } from './trpc/init.js';

const db = useTestDatabase();
const SECRET = 'composition-test-secret-0123456789abcdef';
const clock = new VirtualClock();
const storage = new InMemoryObjectStorage(clock);
let app: ReturnType<typeof compose>;
let sessions = 0;

beforeAll(() => {
  const auth = createAuth({ prisma: new PrismaClient({ adapter: new PrismaPg(db.pool) }), secret: SECRET, baseUrl: 'http://localhost:3000' });
  const ok = async () => undefined;
  app = compose({ pool: db.pool, clock, sessions: betterAuthSessions(auth), handlers: { commission: ok, listings: ok, collections: ok }, storage, scanner: new SimulatedScanner() });
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

async function get(path: string, input: unknown, cookie: string) {
  const url = `http://localhost/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`;
  const res = await serveTrpc(new Request(url, { headers: { cookie } }), app.router, clock, { identity: app.identity });
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

describe('the rest of the registry stays unwired', () => {
  it('a procedure no done story implements is still Unexpected 500 behind a real session', async () => {
    await user(db, { id: id('camila') });
    const { status, json } = await post('commission.createTopUpProofUpload', {}, await signIn(id('camila')));
    expect([status, json.error?.code]).toEqual([500, 'Unexpected']);
  });
});
