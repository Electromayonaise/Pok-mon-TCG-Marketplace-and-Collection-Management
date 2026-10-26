// IdnServiceV2 (S-FR-IDN-7; AD-IDN-3 rules 2–3): the explained canBuy refusal and allowance,
// and the throttle matrix: under the limit, the window edge, the IP and sign-up limits, the
// latest retryAt when two limits trip, and a citation that never carries a key.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { at, explainAssert, id, ins, T0, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { IdnServiceV2 } from './idn.v2.js';

const db = useTestDatabase();
const idn = () => new IdnServiceV2(wiring(db));
const MIN = 60_000;
const IP = 'a'.repeat(64);

async function attempts(n: number, o: { scope?: 'signInFail' | 'signUp'; key: string; atMs?: number; tag?: string }) {
  for (let i = 0; i < n; i++) {
    await ins(db, 'AuthThrottleEvent', { id: id(`${o.tag ?? 'thr'}${i}`), scope: o.scope ?? 'signInFail', key: o.key, createdAt: at(o.atMs ?? 0) }, 'none');
  }
}

describe('IdnServiceV2.requireCanBuy', () => {
  it('an unverified email is EmailNotVerified (403) citing FR-IDN-1 with the facts canBuy derives from', async () => {
    await user(db, { id: id('julian'), emailVerified: false });
    const error = await caught(() => idn().requireCanBuy({ userId: id('julian') }));
    expect(codeOf(error)).toBe('EmailNotVerified');
    expect(httpOf(error)).toBe(403);
    expect(citedInputs(error)).toEqual({ emailVerified: false, signupConsentAt: true });
  });

  it('a verified email is allowed with BuyerEligible, the same citation, dated by the clock', async () => {
    await user(db, { id: id('camila') });
    const result = await idn().requireCanBuy({ userId: id('camila') });
    expect(result.canBuy).toBe(true);
    explainAssert(result.decision, { code: 'BuyerEligible', outcome: 'allowed', rule: 'FR-IDN-1', inputs: { emailVerified: true, signupConsentAt: true }, occurredAt: T0 });
  });

  it('a session whose User row is gone is NotAuthenticated (401)', async () => {
    const error = await caught(() => idn().requireCanBuy({ userId: id('ghost') }));
    expect(codeOf(error)).toBe('NotAuthenticated');
    expect(httpOf(error)).toBe(401);
  });
});

describe('IdnServiceV2.checkAuthThrottle', () => {
  const signIn = { scope: 'signInFail', accountId: id('camila'), ipHmac: IP } as const;

  it('nine failed sign-ins in the window are allowed, and the check writes nothing', async () => {
    await attempts(9, { key: id('camila') });
    expect(await idn().checkAuthThrottle(signIn)).toEqual({ allowed: true });
    expect(await db.counts(['AuthThrottleEvent'])).toEqual({ AuthThrottleEvent: 9 });
  });

  it('a row exactly 15 minutes old is outside the window', async () => {
    await attempts(9, { key: id('camila') });
    await attempts(1, { key: id('camila'), atMs: -15 * MIN, tag: 'old' });
    expect(await idn().checkAuthThrottle(signIn)).toEqual({ allowed: true });
  });

  it('ten rows refuse until the tenth newest leaves the window, citing the limit and never the keys', async () => {
    await attempts(10, { key: id('camila'), atMs: -14 * MIN });
    const error = await caught(() => idn().checkAuthThrottle(signIn));
    expect(codeOf(error)).toBe('AuthRateLimited');
    expect(httpOf(error)).toBe(429);
    expect(citedInputs(error)).toEqual({ scope: 'signInFail', limit: 10, windowMinutes: 15, retryAt: at(MIN) });
    expect(JSON.stringify(error)).not.toContain(IP);
  });

  it('rows of the other scope do not count', async () => {
    await attempts(10, { scope: 'signUp', key: id('camila') });
    expect(await idn().checkAuthThrottle(signIn)).toEqual({ allowed: true });
  });

  it('thirty failures from one IP refuse a sign-in with no known account', async () => {
    await attempts(30, { key: IP });
    const error = await caught(() => idn().checkAuthThrottle({ ...signIn, accountId: null }));
    expect(citedInputs(error)).toMatchObject({ limit: 30, windowMinutes: 15, retryAt: at(15 * MIN) });
  });

  it('five sign-ups from one IP in the hour refuse the sixth', async () => {
    await attempts(4, { scope: 'signUp', key: IP });
    expect(await idn().checkAuthThrottle({ scope: 'signUp', accountId: null, ipHmac: IP })).toEqual({ allowed: true });
    await attempts(1, { scope: 'signUp', key: IP, atMs: -59 * MIN, tag: 'early' });
    const error = await caught(() => idn().checkAuthThrottle({ scope: 'signUp', accountId: null, ipHmac: IP }));
    expect(citedInputs(error)).toEqual({ scope: 'signUp', limit: 5, windowMinutes: 60, retryAt: at(MIN) });
  });

  it('when both limits trip, the latest retryAt wins', async () => {
    await attempts(10, { key: id('camila'), atMs: -10 * MIN, tag: 'acc' });
    await attempts(30, { key: IP, tag: 'ip' });
    const error = await caught(() => idn().checkAuthThrottle(signIn));
    expect(citedInputs(error)).toMatchObject({ limit: 30, retryAt: at(15 * MIN) });
  });
});
