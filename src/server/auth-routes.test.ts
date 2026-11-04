// The AD-IDN-3 guard in front of Better Auth, without a database (Story 2.6; S-FR-IDN-7; decision log Impl-2 #12, #24):
// the consent and body rules of sign-up, the throttle checks before the password, what is forwarded and what is
// recorded. Better Auth's handler is a seam here (a fake that records what reaches it), and so is identity's throttle
// port; the unit under test is serveAuth. The real Better Auth on Postgres is proven in atdd/idn_auth.test.ts.
import { describe, expect, it } from 'vitest';
import { VirtualClock } from '../../test-support/clock.js';
import { CURRENT_CONSENT_VERSION } from '../modules/identity/index.js';
import { raiserFor } from '../shared-kernel/raise.js';
import type { Auth } from './auth.js';
import { serveAuth, type AuthGuard } from './auth-routes.js';

const BASE = 'http://localhost:3000';
const KNOWN = 'camilax00000000000000000';

/** The guard's deps: `seen` holds every request Better Auth received, `calls` every throttle call, in order. */
function guarded(o: { emailWired?: boolean; status?: number; limited?: boolean; ipHmac?: string | null } = {}) {
  const seen: { path: string; body: string; contentLength: string | null }[] = [];
  const calls: string[] = [];
  const handler = async (req: Request): Promise<Response> => {
    seen.push({ path: new URL(req.url).pathname, body: await req.text(), contentLength: req.headers.get('content-length') });
    return Response.json({ ok: true }, { status: o.status ?? 200 });
  };
  const guard: AuthGuard = {
    checkAuthThrottle: async (input) => {
      calls.push(`check:${JSON.stringify(input)}`);
      if (o.limited) raiserFor('identity')('AuthRateLimited', [{ rule: 'FR-IDN-7', inputs: { scope: input.scope, limit: 10, windowMinutes: 15, retryAt: '2026-10-01T15:15:00.000Z' } }]);
      return { allowed: true };
    },
    recordAuthThrottleEvent: async (input) => { calls.push(`record:${JSON.stringify(input)}`); },
    accountIdForEmail: async (email) => { calls.push(`lookup:${email}`); return email === 'camila@example.co' ? KNOWN : null; },
  };
  const deps = {
    auth: { handler, emailWired: o.emailWired ?? true } as unknown as Pick<Auth, 'handler' | 'emailWired'>,
    guard, clock: new VirtualClock(), ipHmacOf: () => (o.ipHmac === undefined ? 'hmac-of-ip' : o.ipHmac),
  };
  const send = async (path: string, body: unknown, method = 'POST') => {
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    // The browser's own Content-Length, which no longer fits once the consent fields are removed.
    const init: RequestInit = method === 'GET' ? { method } : { method, headers: { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(text)) }, body: text };
    const res = await serveAuth(new Request(`${BASE}/api/auth${path}`, init), deps);
    return { status: res.status, json: (await res.json()) as { ok?: boolean; error?: { code: string; issues?: { field: string }[] } } };
  };
  return { seen, calls, send };
}

/** The throttle keys of one call, as the guard records them. */
const keys = (scope: 'signUp' | 'signInFail', accountId: string | null, ipHmac: string | null) => JSON.stringify({ scope, accountId, ipHmac });

const signUpBody = { name: 'Camila Rojas', email: 'camila@example.co', password: 'una-clave-larga-1', consentAccepted: true, consentVersion: CURRENT_CONSENT_VERSION };

describe('serveAuth — what passes straight to Better Auth', () => {
  it('any path but sign-up and sign-in, or any method but POST, reaches the handler untouched and calls no guard', async () => {
    const { seen, calls, send } = guarded();
    expect((await send('/get-session', null, 'GET')).status).toBe(200);
    expect((await send('/sign-out', { x: 1 })).status).toBe(200);
    expect((await send('/sign-in/email', null, 'GET')).status).toBe(200);
    expect(seen.map((s) => s.path)).toEqual(['/api/auth/get-session', '/api/auth/sign-out', '/api/auth/sign-in/email']);
    expect(calls).toEqual([]);
  });
});

describe('serveAuth — sign-up (AD-IDN-3 rule 1)', () => {
  it('with no mail provider wired it is 500 Unexpected before the body is read, and nothing is forwarded or counted (F2)', async () => {
    const { seen, calls, send } = guarded({ emailWired: false });
    const res = await send('/sign-up/email', signUpBody);
    expect([res.status, res.json.error?.code]).toEqual([500, 'Unexpected']);
    expect([seen, calls]).toEqual([[], []]);
  });

  it('a missing consent and a stale version are both named, before the throttle; a body that is not a JSON object is refused', async () => {
    const { seen, calls, send } = guarded();
    const { consentAccepted: _a, ...noConsent } = signUpBody;
    const refused = await send('/sign-up/email', { ...noConsent, consentVersion: 'privacy-v0' });
    expect([refused.status, refused.json.error?.issues?.map((i) => i.field)]).toEqual([400, ['consentAccepted', 'consentVersion']]);
    expect((await send('/sign-up/email', { ...signUpBody, consentAccepted: 'true' })).json.error?.issues?.map((i) => i.field)).toEqual(['consentAccepted']);
    for (const body of ['not json', '[1, 2]', 'null']) {
      expect((await send('/sign-up/email', body)).json.error?.issues?.map((i) => i.field)).toEqual(['la solicitud']);
    }
    expect([seen, calls]).toEqual([[], []]);
  });

  it('a valid sign-up is checked against the IP limit, forwarded without the consent fields or a stale length, then counted once', async () => {
    const { seen, calls, send } = guarded();
    expect((await send('/sign-up/email', signUpBody)).status).toBe(200);
    expect(seen).toHaveLength(1);
    expect(JSON.parse(seen[0]!.body)).toEqual({ name: 'Camila Rojas', email: 'camila@example.co', password: 'una-clave-larga-1' });
    expect(seen[0]!.contentLength).toBeNull();
    expect(calls).toEqual([
      `check:${keys('signUp', null, 'hmac-of-ip')}`,
      `record:${keys('signUp', null, 'hmac-of-ip')}`,
    ]);
  });

  it('a request with no client IP skips the IP check but is still counted; a throttled one is 429 and reaches nothing', async () => {
    const anonymous = guarded({ ipHmac: null });
    expect((await anonymous.send('/sign-up/email', signUpBody)).status).toBe(200);
    expect(anonymous.calls).toEqual([`record:${keys('signUp', null, null)}`]);
    const limited = guarded({ limited: true });
    const res = await limited.send('/sign-up/email', signUpBody);
    expect([res.status, res.json.error?.code, limited.seen.length]).toEqual([429, 'AuthRateLimited', 0]);
    expect(limited.calls.filter((c) => c.startsWith('record'))).toEqual([]);
  });
});

describe('serveAuth — sign-in (AD-IDN-3 rules 3–4)', () => {
  it('checks the account and the IP before the password, and records one failure only when Better Auth answers 401', async () => {
    const failed = guarded({ status: 401 });
    expect((await failed.send('/sign-in/email', { email: 'camila@example.co', password: 'mala' })).status).toBe(401);
    const tried = keys('signInFail', KNOWN, 'hmac-of-ip');
    expect(failed.calls).toEqual(['lookup:camila@example.co', `check:${tried}`, `record:${tried}`]);
    const ok = guarded();
    expect((await ok.send('/sign-in/email', { email: 'camila@example.co', password: 'una-clave-larga-1' })).status).toBe(200);
    expect(ok.calls.filter((c) => c.startsWith('record'))).toEqual([]);
  });

  it('a throttled account is 429 even with the right password: Better Auth never sees the attempt', async () => {
    const { seen, send } = guarded({ limited: true });
    const res = await send('/sign-in/email', { email: 'camila@example.co', password: 'una-clave-larga-1' });
    expect([res.status, res.json.error?.code, seen.length]).toEqual([429, 'AuthRateLimited', 0]);
  });

  it('a blank or non-string email is never looked up, and with no IP either nothing is checked', async () => {
    const { seen, calls, send } = guarded({ ipHmac: null, status: 401 });
    await send('/sign-in/email', { email: '   ', password: 'x' });
    await send('/sign-in/email', { email: 42, password: 'x' });
    expect(seen).toHaveLength(2);
    const none = keys('signInFail', null, null);
    expect(calls).toEqual([`record:${none}`, `record:${none}`]);
  });
});
