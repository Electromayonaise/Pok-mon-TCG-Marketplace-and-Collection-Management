// ATDD — Story 2.6: sign up, sign in and throttle failed attempts (S-FR-IDN-7; AD-IDN-3 rules 1, 3, 4;
// ARCHITECTURE S-7, S-8). Flow A, ATDD-first (decision log Impl-2 #12): written before the guard existed;
// every test fails on NotImplementedError until Story 2.6 is done. Requests go through `compose().auth`,
// the route `app/api/auth/[...all]` serves, over a real Better Auth on the test database.
import { PrismaPg } from '@prisma/adapter-pg';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../../generated/prisma/client.js';
import { createAuth } from '../../../src/server/auth.js';
import { compose } from '../../../src/server/composition.js';
import { betterAuthSessions } from '../../../src/server/sessions.js';
import { VirtualClock } from '../../../test-support/clock.js';
import { codeOf } from '../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { caught } from '../../../test-support/errors.js';
import { CapturingEmailSender } from '../../../test-support/simulated/index.js';
import { rows, T0 } from '../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();
const BASE = 'http://localhost:3000';
const SECRET = 'auth-test-secret-0123456789abcdef0123456789';
const IP_KEY = 'auth-test-ip-hmac-key-0123456789abcdef0123';
const IP = '203.0.113.7';
const clock = new VirtualClock();
const email = new CapturingEmailSender();
let app: ReturnType<typeof compose>;

beforeAll(() => {
  const auth = createAuth({ prisma: new PrismaClient({ adapter: new PrismaPg(db.pool) }), secret: SECRET, baseUrl: BASE, clock, email });
  app = compose({ pool: db.pool, clock, sessions: betterAuthSessions(auth), ipHmacKey: IP_KEY, auth });
});
// The capture and the virtual clock are shared by the file; each test starts from none sent, at T0.
beforeEach(() => {
  email.sent.length = 0;
  clock.set(Date.parse(T0));
});

type Body = { error?: { code: string; httpStatus: number; decision: { citations: { inputs: Record<string, unknown> }[] }; issues?: { field: string }[] } };
async function post(path: string, body: Record<string, unknown>, o: { ip?: string | null; cookie?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', origin: BASE };
  if (o.ip !== null) headers['x-real-ip'] = o.ip ?? IP;
  const res = await app.auth(new Request(`${BASE}/api/auth/${path}`, { method: 'POST', headers, body: JSON.stringify(body) }));
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : {}) as Body, cookie: res.headers.get('set-cookie'), text };
}
const signUp = (o: Record<string, unknown> = {}, ip?: string | null) =>
  post('sign-up/email', { name: 'Camila Rojas', email: 'camila@example.co', password: 'una-clave-larga-1', consentAccepted: true, consentVersion: 'privacy-v1', ...o }, { ip: ip === undefined ? IP : ip });
const signIn = (password: string, o: { email?: string; ip?: string | null } = {}) =>
  post('sign-in/email', { email: o.email ?? 'camila@example.co', password }, { ip: o.ip === undefined ? IP : o.ip });
const throttleRows = () => db.query<{ scope: string; key: string }>(`SELECT scope, key FROM "AuthThrottleEvent" ORDER BY scope, key`);
const userId = async () => (await db.query<{ id: string }>(`SELECT id FROM "User" WHERE email = 'camila@example.co'`))[0]!.id;

describe('Story 2.6 — sign-up records consent and sends verification (AD-IDN-3 rule 1)', () => {
  it('[S-FR-IDN-7.signup.h] a sign-up with the current consent creates an unverified user with its consent instant, hashes the password, sends one verification link, and keys its throttle row by ipHmac only', async () => {
    const res = await signUp();
    expect(res.status).toBe(200);
    expect(await rows(db, 'User')).toMatchObject([{ email: 'camila@example.co', emailVerified: false, signupConsentAt: new Date(T0), signupConsentVersion: 'privacy-v1', sellerTrack: null, isAdmin: false }]);
    const [account] = await rows<{ providerId: string; password: string }>(db, 'Account');
    expect(account!.providerId).toBe('credential');
    expect(account!.password).not.toContain('una-clave-larga-1');
    expect(email.sent).toEqual([{ to: 'camila@example.co', url: expect.stringContaining('/api/auth/verify-email?token=') }]);
    const throttle = await throttleRows();
    expect(throttle).toEqual([{ scope: 'signUp', key: expect.stringMatching(/^[0-9a-f]{64}$/) }]);
    expect(JSON.stringify(await rows(db, 'AuthThrottleEvent'))).not.toContain(IP);
  });

  it('[S-FR-IDN-7.signup.f] a sign-up without consent, or with an old notice version, is RequestValidationFailed on the field, with no user, no email and no throttle row', async () => {
    const missing = await signUp({ consentAccepted: undefined });
    expect(missing.status).toBe(400);
    expect(missing.body.error).toMatchObject({ code: 'RequestValidationFailed' });
    expect(missing.body.error!.issues!.map((i) => i.field)).toContain('consentAccepted');
    const old = await signUp({ consentVersion: 'privacy-v0' });
    expect(old.status).toBe(400);
    expect(old.body.error!.issues!.map((i) => i.field)).toContain('consentVersion');
    expect(await rows(db, 'User')).toEqual([]);
    expect(email.sent).toEqual([]);
    expect(await throttleRows()).toEqual([]);
  });

  it('[S-FR-IDN-7.signup.throttle] the 6th sign-up from one IP within an hour is AuthRateLimited (429) citing retryAt, and creates no user', async () => {
    for (let k = 0; k < 5; k++) expect((await signUp({ email: `c${k}@example.co` })).status).toBe(200);
    const sixth = await signUp({ email: 'c5@example.co' });
    expect(sixth.status).toBe(429);
    expect(sixth.body.error).toMatchObject({ code: 'AuthRateLimited', httpStatus: 429 });
    expect(sixth.body.error!.decision.citations[0]!.inputs).toMatchObject({ scope: 'signUp', limit: 5, retryAt: new Date(Date.parse(T0) + 3_600_000).toISOString() });
    expect(await rows(db, 'User')).toHaveLength(5);
  });
});

describe('Story 2.6 — sign-in, before verification, behind the throttle (AD-IDN-3 rules 2–3, S-8)', () => {
  it('[S-FR-IDN-7.signin.h] the right password signs in an unverified user: the session cookie names them, canBuy still refuses EmailNotVerified, and nothing is throttled', async () => {
    await signUp();
    const res = await signIn('una-clave-larga-1');
    expect(res.status).toBe(200);
    expect(res.cookie).toMatch(/better-auth\.session_token=/);
    const camila = await userId();
    expect(await app.identity.resolveSession(new Headers({ cookie: res.cookie!.split(';')[0]! }))).toBe(camila);
    expect(codeOf(await caught(() => app.identity.requireCanBuy({ userId: camila })))).toBe('EmailNotVerified');
    expect((await throttleRows()).filter((r) => r.scope === 'signInFail')).toEqual([]);
  });

  it('[S-FR-IDN-7.signin.throttle] 10 wrong passwords each leave one account row and one ipHmac row; the 11th attempt, even with the right password, is 429 citing retryAt; 15 min later it signs in', async () => {
    await signUp();
    for (let k = 0; k < 10; k++) expect((await signIn(`mala-${k}-clave`)).status).toBe(401);
    const camila = await userId();
    const failures = (await throttleRows()).filter((r) => r.scope === 'signInFail');
    expect(failures.filter((r) => r.key === camila)).toHaveLength(10);
    expect(failures.filter((r) => /^[0-9a-f]{64}$/.test(r.key))).toHaveLength(10);
    const eleventh = await signIn('una-clave-larga-1');
    expect(eleventh.status).toBe(429);
    expect(eleventh.cookie).toBeNull();
    expect(eleventh.body.error!.decision.citations[0]!.inputs).toMatchObject({ scope: 'signInFail', limit: 10, retryAt: new Date(Date.parse(T0) + 15 * 60_000).toISOString() });
    clock.advance(15 * 60_000);
    expect((await signIn('una-clave-larga-1')).status).toBe(200);
  });

  it('[S-FR-IDN-7.signin.unknown] a wrong sign-in for an unknown email leaves only the ipHmac row, and one with no caller IP leaves no row at all: a key is never empty', async () => {
    expect((await signIn('cualquiera', { email: 'nadie@example.co' })).status).toBe(401);
    expect(await throttleRows()).toEqual([{ scope: 'signInFail', key: expect.stringMatching(/^[0-9a-f]{64}$/) }]);
    expect((await signIn('cualquiera', { email: 'nadie@example.co', ip: null })).status).toBe(401);
    expect(await throttleRows()).toHaveLength(1);
    expect((await throttleRows()).some((r) => r.key === '')).toBe(false);
  });
});
