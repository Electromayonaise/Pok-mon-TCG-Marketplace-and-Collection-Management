// The production composition over HTTP (decision log Impl-1 #24): a real Better Auth session on
// the test database, the identity gate, and the resolvers of IDN-1.ingress, IDN-3, VER-1, VER-2, VER-3, the supporting
// VER contracts, the CAT feed (CAT-1, CAT-2.ingress, CAT-1.runs, CAT-2.quarantine), the CAT prices
// (CAT-3, S-FR-CAT-8.fetch), the catalog browse (S-FR-CAT-1), the listing create (INV-2), the seller's inventory (S-FR-INV-2, -9, -10), the discovery reads (DSC-1, DSC-2),
// the order, its comprobante and its three facts (ORD-1, S-FR-ORD-2, ORD-2, -3, -4) and S-SYS.replay,
// all through serveTrpc as app/api/trpc/[trpc]/route.ts calls it.
import { createHmac, randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client.js';
import { VirtualClock } from '../../test-support/clock.js';
import { useTestDatabase } from '../../test-support/db.js';
import { FixtureFeedSource, FixtureFxRateSource, InMemoryObjectStorage, SimulatedScanner } from '../../test-support/simulated/index.js';
import { admin, at, business, catalogEntry, DAY, feedRun, HOUR, id, individualSeller, ins, listing, observation, order, purchasableListing, rejectionReason, rows, T0, user } from '../../test-support/solu2/fixtures.js';
import { createAuth } from './auth.js';
import { compose } from './composition.js';
import { betterAuthSessions } from './sessions.js';
import { serveTrpc } from './trpc/init.js';

const db = useTestDatabase();
const SECRET = 'composition-test-secret-0123456789abcdef';
const clock = new VirtualClock();
const storage = new InMemoryObjectStorage(clock);
const feed = new FixtureFeedSource({
  current: [{ externalKey: 'sv1-025', setCode: 'SV1', number: '025', name: 'Pikachu', kind: 'card', eraCode: 'SV' }], previous: [], defects: [], renamed: [],
});
let app: ReturnType<typeof compose>;
let sessions = 0;

beforeAll(() => {
  const auth = createAuth({ prisma: new PrismaClient({ adapter: new PrismaPg(db.pool) }), secret: SECRET, baseUrl: 'http://localhost:3000' });
  const ok = async () => undefined;
  app = compose({ pool: db.pool, clock, sessions: betterAuthSessions(auth), handlers: { commission: ok, collections: ok }, storage, scanner: new SimulatedScanner(), feed,
    fx: new FixtureFxRateSource([{ valor: '4130.00', validFrom: '2026-10-01', validTo: '2026-10-01' }]) });
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

  it('an admin replays a failed delivery: 200 delivered, the log row names the session admin, and the real listings handler applied it (INV-3, Story 5.5)', async () => {
    await failedDelivery();
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
    await ins(db, 'OutboxEvent', { id: id('ev2'), type: 'OrderClosed', aggregateId: id('tienda'), schemaVersion: 1, payload: JSON.stringify({}) }, 'created');
    await ins(db, 'EventDelivery', { eventId: id('ev2'), subscriber: 'listings', status: 'failed', attempts: 3, lastErrorCode: 'DeliveryAttemptsExhausted', firstFailedAt: at(-DAY), lastFailedAt: at(-DAY) });
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

describe('the catalog feed over HTTP (CAT-1, CAT-2.ingress, CAT-1.runs; Story 4.1)', () => {
  it('a signed-in non-admin is AdminOnly 403 on start, continue and runs, and no run exists', async () => {
    await user(db, { id: id('camila') });
    const cookie = await signIn(id('camila'));
    expect((await post('catalog.feed.start', {}, cookie)).status).toBe(403);
    expect((await post('catalog.feed.continue', { runId: id('run1') }, cookie)).status).toBe(403);
    expect((await get('catalog.feed.runs', { cursor: null }, cookie)).status).toBe(403);
    expect(await rows(db, 'FeedIngestionRun')).toHaveLength(0);
  });

  it('an admin starts a run, continues it to the end and lists it, and the audit row names the session admin', async () => {
    await admin(db);
    await ins(db, 'CatalogSet', { id: id('setsv1'), code: 'SV1', name: 'Escarlata y Púrpura', era: 'SV' });
    const cookie = await signIn(id('admin'));
    const started = await post('catalog.feed.start', {}, cookie);
    expect([started.status, started.json.result?.data]).toEqual([200, expect.objectContaining({ decision: expect.objectContaining({ reasonCode: 'FeedRunStarted' }) })]);
    const runId = started.json.result?.data.runId;
    const continued = await post('catalog.feed.continue', { runId }, cookie);
    expect([continued.status, continued.json.result?.data]).toEqual([200, { done: true, status: 'Completed', cursor: 1 }]);
    const listed = await get('catalog.feed.runs', { cursor: null }, cookie);
    expect(listed.json.result?.data).toMatchObject({ runs: [{ runId, status: 'Completed', created: 1 }], nextCursor: null });
    expect(await rows(db, 'audit_events', `action = 'catalog.feedRun.started'`)).toMatchObject([{ actorId: id('admin') }]);
  });

  it('an admin lists a run\'s quarantined rows without the raw row (CAT-2.quarantine, Story 4.2); a non-admin is AdminOnly 403', async () => {
    await admin(db);
    await user(db, { id: id('camila') });
    await feedRun(db, id('run1'));
    await ins(db, 'QuarantinedFeedRow', { id: id('q1'), runId: id('run1'), rowNumber: 7, externalKey: 'sv1-025', reasonCode: 'KindChanged', rawRow: '{"secret":"raw"}' }, 'created');
    const listed = await get('catalog.feed.quarantine', { runId: id('run1'), cursor: null }, await signIn(id('admin')));
    expect([listed.status, listed.json.result?.data]).toEqual([200, { rows: [{ rowNumber: 7, externalKey: 'sv1-025', reasonCode: 'KindChanged' }], nextCursor: null }]);
    expect((await get('catalog.feed.quarantine', { runId: id('run1'), cursor: null }, await signIn(id('camila')))).status).toBe(403);
  });

  it('a second start while a run is live is FeedRunInProgress 409', async () => {
    await admin(db);
    await feedRun(db, id('run1'), { status: 'Running', startedAt: at(-DAY / 2) });
    const { status, json } = await post('catalog.feed.start', {}, await signIn(id('admin')));
    expect([status, json.error?.code]).toEqual([409, 'FeedRunInProgress']);
  });
});

describe('the reference prices over HTTP (CAT-3, S-FR-CAT-8.fetch; Story 4.4)', () => {
  it('anyone reads the provenance without a session; an unknown id is CatalogEntryNotFound 404', async () => {
    await catalogEntry(db, id('char'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('char'), cop: 45_000, observedAt: at(-HOUR), runId: id('run1') });
    const read = await get('catalog.provenance', { catalogEntryIds: [id('char')], period: 30 }, '');
    expect([read.status, read.json.result?.data]).toEqual([200, { items: [expect.objectContaining({ freshness: 'fresh', lastTransactionReference: expect.objectContaining({ cop: 45_000 }) })] }]);
    const missing = await get('catalog.provenance', { catalogEntryIds: [id('ghost')], period: 30 }, '');
    expect([missing.status, missing.json.error?.code]).toEqual([404, 'CatalogEntryNotFound']);
  });

  it('an admin retries the TRM fetch and today\'s rate is stored once; a non-admin is AdminOnly 403', async () => {
    await admin(db);
    await user(db, { id: id('camila') });
    expect((await post('catalog.fx.retry', {}, await signIn(id('camila')))).status).toBe(403);
    const cookie = await signIn(id('admin'));
    expect((await post('catalog.fx.retry', {}, cookie)).json.result?.data).toMatchObject({ outcome: 'stored' });
    expect((await post('catalog.fx.retry', {}, cookie)).json.result?.data).toMatchObject({ outcome: 'alreadyCovered' });
    expect(await rows(db, 'FxRate')).toHaveLength(1);
  });
});

describe('catalog.browse over HTTP (S-FR-CAT-1; Story 4.5)', () => {
  it('anyone browses without a session; pageSize 101 is RequestValidationFailed 400 from the parser', async () => {
    await catalogEntry(db, id('pika'), { name: 'Pikachu' });
    const read = await get('catalog.browse', { filters: { nameQuery: 'pika' }, page: 1, pageSize: 24 }, '');
    expect([read.status, read.json.result?.data]).toEqual([200, expect.objectContaining({ total: 1, entries: [expect.objectContaining({ catalogEntryId: id('pika') })] })]);
    const refused = await get('catalog.browse', { filters: {}, page: 1, pageSize: 101 }, '');
    expect([refused.status, refused.json.error?.code]).toEqual([400, 'RequestValidationFailed']);
  });
});

describe('inventory.create over HTTP (INV-2; Story 5.1)', () => {
  const listingInput = { itemRef: id('char'), condition: 'NM', priceCop: 45_000, quantity: 3, location: null, description: '', openToTrade: false };

  it('without a session it is NotAuthenticated 401 and nothing is written', async () => {
    const { status, json } = await post('inventory.create', listingInput);
    expect([status, json.error?.code]).toEqual([401, 'NotAuthenticated']);
    expect(await db.counts(['Listing', 'InventoryUnit'])).toEqual({ Listing: 0, InventoryUnit: 0 });
  });

  it('an individual seller lists through the real identity and catalog: 200 Active, and the listing is the session user\'s', async () => {
    await individualSeller(db, id('valentina'));
    await catalogEntry(db, id('char'));
    const { status, json } = await post('inventory.create', listingInput, await signIn(id('valentina')));
    expect([status, json.result?.data]).toEqual([200, expect.objectContaining({ state: 'Active', availability: 3 })]);
    // A null location defaults to the meeting point (decision log Impl-1 #31).
    expect(await rows(db, 'Listing')).toMatchObject([{ sellerId: id('valentina'), sellerKindAtCreation: 'individual', lat: 4.711, lng: -74.0721 }]);
  });

  it('an Approved business with no projection lists Paused; open to trade it is OpenToTradeNotAllowed 409', async () => {
    await business(db, id('andres'), 'Approved');
    await catalogEntry(db, id('char'));
    const cookie = await signIn(id('andres'));
    expect((await post('inventory.create', listingInput, cookie)).json.result?.data).toMatchObject({ state: 'Paused' });
    const refused = await post('inventory.create', { ...listingInput, openToTrade: true }, cookie);
    expect([refused.status, refused.json.error?.code]).toEqual([409, 'OpenToTradeNotAllowed']);
  });
});

describe('the seller\'s inventory procedures over HTTP (S-FR-INV-2, -9, -10; Story 5.6)', () => {
  it('a seller bundles, restocks, edits, deactivates and lists; a buyer reads only the visible listing', async () => {
    await individualSeller(db, id('valentina'));
    await catalogEntry(db, id('char'));
    await catalogEntry(db, id('pika'));
    const cookie = await signIn(id('valentina'));
    const listingInput = { itemRef: id('char'), condition: 'NM', priceCop: 45_000, quantity: 3, location: null, description: '', openToTrade: true };
    const listingId = (await post('inventory.create', listingInput, cookie)).json.result?.data.listingId as string;
    const bundle = await post('inventory.createBundle', { title: 'Lote', priceCop: 80_000, location: null, description: '',
      components: [{ itemRef: id('char'), condition: 'NM', perBundleQty: 1, quantity: 9 }, { itemRef: id('pika'), condition: 'LP', perBundleQty: 2, quantity: 4 }] }, cookie);
    expect(bundle.json.result?.data).toMatchObject({ state: 'Active', availability: 2 });
    expect((await post('inventory.restock', { listingId, delta: 2 }, cookie)).json.result?.data).toMatchObject({ availability: 5 });
    expect((await post('inventory.update', { listingId, expectedVersion: 0, changes: { priceCop: 50_000 } }, cookie)).json.result?.data).toMatchObject({ version: 1 });
    const stale = await post('inventory.update', { listingId, expectedVersion: 0, changes: { priceCop: 51_000 } }, cookie);
    expect([stale.status, stale.json.error?.code]).toEqual([400, 'RequestValidationFailed']);
    expect((await get('inventory.get', { listingId }, '')).json.result?.data).toMatchObject({ state: 'Active', priceCop: 50_000, availability: 5 });
    expect((await post('inventory.deactivate', { listingId }, cookie)).json.result?.data).toMatchObject({ version: 2 });
    const hidden = await get('inventory.get', { listingId }, '');
    expect([hidden.status, hidden.json.error?.code]).toEqual([404, 'ListingNotFound']);
    const mine = (await get('inventory.mine', { cursor: null }, cookie)).json.result?.data as { items: { state: string }[]; nextCursor: string | null };
    expect([mine.items.map((i) => i.state).sort(), mine.nextCursor]).toEqual([['Active', 'Deactivated'], null]);
    expect((await post('inventory.reactivate', { listingId }, cookie)).json.result?.data).toMatchObject({ version: 3 });
  });

  it('another seller restocking is ListingNotOwnedByCaller 403, and the unit is unchanged', async () => {
    await individualSeller(db, id('valentina'));
    await individualSeller(db, id('mateo'));
    await catalogEntry(db, id('char'));
    const listingId = (await post('inventory.create', { itemRef: id('char'), condition: 'NM', priceCop: 45_000, quantity: 3, location: null, description: '', openToTrade: false }, await signIn(id('valentina')))).json.result?.data.listingId;
    const refused = await post('inventory.restock', { listingId, delta: 2 }, await signIn(id('mateo')));
    expect([refused.status, refused.json.error?.code]).toEqual([403, 'ListingNotOwnedByCaller']);
    expect(await rows(db, 'InventoryUnit')).toMatchObject([{ quantity: 3 }]);
  });
});

describe('discovery.search over HTTP (DSC-1; Story 6.2)', () => {
  it('a listing created with no location is found at its seller\'s meeting point, ranked and explained; a 301 km radius is refused', async () => {
    await individualSeller(db, id('valentina'));
    await catalogEntry(db, id('char'));
    const created = await post('inventory.create', { itemRef: id('char'), condition: 'NM', priceCop: 45_000, quantity: 3, location: null, description: '', openToTrade: false }, await signIn(id('valentina')));
    const area = { lat: 4.711, lng: -74.0721, radiusKm: 15 };
    const found = (await get('discovery.search', { view: 'listings', area, page: 1, pageSize: 24 }, '')).json.result?.data as { results: Record<string, unknown>[]; excluded: { unusableLocation: number } };
    expect(found.results).toMatchObject([{ listingId: created.json.result?.data.listingId, distanceKm: 0, sellerKind: 'individual', pickupAvailable: true, purchasable: false, explanation: { outcome: 'ranked', reasonCode: 'ListingRanked' } }]);
    expect(found.excluded.unusableLocation).toBe(0);
    const refused = await get('discovery.search', { view: 'listings', area: { ...area, radiusKm: 301 }, page: 1, pageSize: 24 }, '');
    expect([refused.status, refused.json.error?.code]).toEqual([400, 'InvalidSearchArea']);
  });
});

describe('discovery.cardDetail over HTTP (DSC-2; Story 6.3)', () => {
  it('anyone reads a card with its nearby listings and its separate reference price; an unknown card is CatalogEntryNotFound 404', async () => {
    await individualSeller(db, id('valentina'));
    await catalogEntry(db, id('char'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('char'), cop: 52_000, observedAt: at(-HOUR), runId: id('run1') });
    await post('inventory.create', { itemRef: id('char'), condition: 'NM', priceCop: 45_000, quantity: 1, location: null, description: '', openToTrade: false }, await signIn(id('valentina')));
    const area = { lat: 4.711, lng: -74.0721, radiusKm: 5 };
    const read = (await get('discovery.cardDetail', { catalogEntryId: id('char'), area }, '')).json.result?.data;
    expect(read).toMatchObject({ entry: { catalogEntryId: id('char') }, listingPriceCop: 45_000, hasActiveListings: true, excluded: { unusableLocation: 0 },
      provenance: { lastTransactionReference: { cop: 52_000 } }, listings: [{ sellerKind: 'individual', pickupAvailable: true }] });
    const missing = await get('discovery.cardDetail', { catalogEntryId: id('ghost'), area: null }, '');
    expect([missing.status, missing.json.error?.code]).toEqual([404, 'CatalogEntryNotFound']);
  });
});

describe('orders.create and the comprobante over HTTP (ORD-1, S-FR-ORD-2; Story 7.1)', () => {
  it('without a session it is NotAuthenticated 401; an unverified email is EmailNotVerified 403 (the canBuy builder), and no order exists', async () => {
    await purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity: 3 });
    await user(db, { id: id('camila'), emailVerified: false });
    const anonymous = await post('orders.create', { listingId: id('lchar'), qty: 1 });
    const unverified = await post('orders.create', { listingId: id('lchar'), qty: 1 }, await signIn(id('camila')));
    expect([anonymous.status, anonymous.json.error?.code, unverified.status, unverified.json.error?.code]).toEqual([401, 'NotAuthenticated', 403, 'EmailNotVerified']);
    expect(await rows(db, 'Order')).toHaveLength(0);
  });

  it('a buyer orders through the real listings and identity, uploads a comprobante and reads its URL; the order is the session user\'s', async () => {
    await purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity: 3 });
    await user(db, { id: id('camila') });
    const cookie = await signIn(id('camila'));
    const created = await post('orders.create', { listingId: id('lchar'), qty: 2 }, cookie);
    expect([created.status, created.json.result?.data]).toEqual([200, expect.objectContaining({ status: 'AwaitingPayment', totalCop: 90_000 })]);
    const orderId = created.json.result?.data.orderId as string;
    expect(await rows(db, 'Order')).toMatchObject([{ id: orderId, buyerId: id('camila'), businessId: id('andres') }]);
    const ticket = (await post('orders.createComprobanteUpload', { orderId }, cookie)).json.result?.data as { uploadKey: string };
    storage.simulateDirectUpload(ticket.uploadKey, new Uint8Array([0xff, 0xd8, 0xff, 1, 0xff, 0xd9]), 'image/jpeg');
    expect((await post('orders.uploadComprobante', { orderId, uploadKey: ticket.uploadKey }, cookie)).json.result?.data).toMatchObject({ replacedPrevious: false });
    expect((await get('orders.comprobanteUrl', { orderId }, cookie)).json.result?.data).toMatchObject({ expiresAt: at(600_000) });
    const own = await post('orders.create', { listingId: id('lchar'), qty: 1 }, await signIn(id('andres')));
    expect([own.status, own.json.error?.code]).toEqual([409, 'SelfPurchaseNotAllowed']);
  });
});

describe('the three order facts over HTTP (ORD-2, ORD-3, ORD-4; Story 7.2)', () => {
  it('the buyer pays, the business confirms and the buyer closes; each actor comes from the session, and each event is enqueued once', async () => {
    await business(db, id('andres'), 'Approved');
    await user(db, { id: id('camila') });
    await order(db, { id: id('o1'), buyerId: id('camila'), businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), comprobante: true });
    const camila = await signIn(id('camila'));
    const andres = await signIn(id('andres'));
    const early = await post('orders.confirmPaymentReceived', { orderId: id('o1') }, andres);
    expect([early.status, early.json.error?.code]).toEqual([403, 'OrderNotVisibleToCaller']);
    expect((await post('orders.confirmPaid', { orderId: id('o1') }, camila)).json.result?.data).toMatchObject({ status: 'Paid' });
    const wrongRole = await post('orders.confirmItemReceived', { orderId: id('o1') }, andres);
    expect([wrongRole.status, wrongRole.json.error?.code]).toEqual([403, 'OrderNotOwnedByCaller']);
    expect((await post('orders.confirmPaymentReceived', { orderId: id('o1') }, andres)).json.result?.data).toMatchObject({ status: 'PaymentConfirmed' });
    expect((await post('orders.confirmItemReceived', { orderId: id('o1') }, camila)).json.result?.data).toMatchObject({ status: 'Closed' });
    expect((await rows<{ type: string }>(db, 'OutboxEvent')).map((e) => e.type).sort()).toEqual(['OrderClosed', 'OrderPaymentConfirmedByBusiness']);
  });
});

describe('the rest of the registry stays unwired', () => {
  it('a procedure no done story implements is still Unexpected 500 behind a real session', async () => {
    await user(db, { id: id('camila') });
    const { status, json } = await post('commission.createTopUpProofUpload', {}, await signIn(id('camila')));
    expect([status, json.error?.code]).toEqual([500, 'Unexpected']);
  });
});
