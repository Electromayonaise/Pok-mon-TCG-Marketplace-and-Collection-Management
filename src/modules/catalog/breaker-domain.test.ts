// The pure TRM source breaker (Story 4.6, decision log Impl-2 #31): `admit` before a source call and
// `record` after it, on instants passed in. No I/O; the Postgres row lock and the races are proven by
// the bound tests in _bmad-output/test-artifacts/atdd/cat_breaker.test.ts.
import { describe, expect, it } from 'vitest';
import { admit, CLOSED_BREAKER, record, TRM_BREAKER_POLICY, type Breaker } from './domain/breaker.js';

const T0 = '2026-10-01T15:00:00.000Z';
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const at = (ms: number) => new Date(Date.parse(T0) + ms).toISOString();
const policy = TRM_BREAKER_POLICY;
const open = (o: Partial<Breaker> = {}): Breaker => ({ state: 'open', consecutiveFailures: 3, openedAt: T0, retryAt: at(30 * MINUTE), probeToken: null, ...o });
const halfOpen = (o: Partial<Breaker> = {}): Breaker => ({ state: 'halfOpen', consecutiveFailures: 3, openedAt: T0, retryAt: at(31 * MINUTE), probeToken: 'probe-1', ...o });

describe('the policy (agent defaults of Story 4.6)', () => {
  it('opens after 3 failures in a row, for 30 minutes, with a 60 s probe lease', () => {
    expect(policy).toEqual({ failureThreshold: 3, coolDownMs: 30 * MINUTE, probeLeaseMs: 60_000 });
  });
});

describe('admit', () => {
  it('lets every call through a closed breaker, with no probe and nothing to store', () => {
    const closed: Breaker = { ...CLOSED_BREAKER, consecutiveFailures: 2 };
    const verdict = admit(closed, T0, 'tok', policy);
    expect(verdict).toEqual({ call: true, probeToken: null, next: closed });
    expect(verdict.call && verdict.next).toBe(closed);
  });

  it('short-circuits an open breaker until retryAt, citing it and the failures, and makes the first call at retryAt the probe', () => {
    expect(admit(open(), at(30 * MINUTE - 1), 'tok', policy)).toEqual({ call: false, retryAt: at(30 * MINUTE), consecutiveFailures: 3 });
    expect(admit(open(), at(30 * MINUTE), 'tok', policy)).toEqual({
      call: true, probeToken: 'tok', next: { state: 'halfOpen', consecutiveFailures: 3, openedAt: T0, retryAt: at(31 * MINUTE), probeToken: 'tok' },
    });
  });

  it('short-circuits every call while the probe holds its lease, and lets the next call take a lapsed lease over', () => {
    expect(admit(halfOpen(), at(31 * MINUTE - 1), 'tok-2', policy)).toEqual({ call: false, retryAt: at(31 * MINUTE), consecutiveFailures: 3 });
    expect(admit(halfOpen(), at(31 * MINUTE), 'tok-2', policy)).toEqual({
      call: true, probeToken: 'tok-2', next: halfOpen({ retryAt: at(32 * MINUTE), probeToken: 'tok-2' }),
    });
  });
});

describe('record', () => {
  it('counts failures in a closed breaker and opens it at the 3rd, for 30 minutes from that instant', () => {
    const one = record(CLOSED_BREAKER, 'failure', null, T0, policy);
    expect(one).toEqual({ ...CLOSED_BREAKER, consecutiveFailures: 1 });
    const two = record(one, 'failure', null, at(HOUR), policy);
    expect(two).toEqual({ ...CLOSED_BREAKER, consecutiveFailures: 2 });
    expect(record(two, 'failure', null, at(2 * HOUR), policy)).toEqual({
      state: 'open', consecutiveFailures: 3, openedAt: at(2 * HOUR), retryAt: at(2 * HOUR + 30 * MINUTE), probeToken: null,
    });
  });

  it('a success resets a closed breaker; with no failure to reset it is left as it is', () => {
    expect(record({ ...CLOSED_BREAKER, consecutiveFailures: 2 }, 'success', null, T0, policy)).toEqual(CLOSED_BREAKER);
    const clean = { ...CLOSED_BREAKER };
    expect(record(clean, 'success', null, T0, policy)).toBe(clean);
  });

  it('the probe\'s success closes the breaker; its failure reopens it for a new cool-down and counts one more failure', () => {
    expect(record(halfOpen(), 'success', 'probe-1', at(31 * MINUTE), policy)).toEqual(CLOSED_BREAKER);
    expect(record(halfOpen(), 'failure', 'probe-1', at(31 * MINUTE), policy)).toEqual({
      state: 'open', consecutiveFailures: 4, openedAt: at(31 * MINUTE), retryAt: at(61 * MINUTE), probeToken: null,
    });
  });

  it.each([
    ['a closed-state call returning after the breaker opened', open(), 'failure', null],
    ['a closed-state call returning while a probe is in flight', halfOpen(), 'success', null],
    ['a probe whose lease another probe took over', halfOpen({ probeToken: 'probe-2' }), 'failure', 'probe-1'],
    ['a stale probe returning after the breaker closed', { ...CLOSED_BREAKER }, 'failure', 'probe-1'],
    ['a stale probe returning after the breaker reopened', open(), 'success', 'probe-1'],
  ] as const)('%s moves nothing', (_case, breaker, outcome, token) => {
    expect(record(breaker, outcome, token, at(40 * MINUTE), policy)).toBe(breaker);
  });
});

describe('a whole outage, step by step', () => {
  it('3 failed ticks open it, a retry is short-circuited, a failed probe reopens it, and the next probe closes it', () => {
    let b = CLOSED_BREAKER;
    for (const t of [0, 1, 2]) {
      const v = admit(b, at(t * HOUR), `t${t}`, policy);
      expect(v.call).toBe(true);
      b = record(v.call ? v.next : b, 'failure', null, at(t * HOUR), policy);
    }
    expect(b.state).toBe('open');
    expect(admit(b, at(2 * HOUR + 10 * MINUTE), 'retry', policy).call).toBe(false);
    const probe = admit(b, at(3 * HOUR), 'p1', policy);
    expect(probe).toMatchObject({ call: true, probeToken: 'p1' });
    b = record(probe.call ? probe.next : b, 'failure', 'p1', at(3 * HOUR), policy);
    expect(b).toMatchObject({ state: 'open', consecutiveFailures: 4, retryAt: at(3 * HOUR + 30 * MINUTE) });
    const second = admit(b, at(4 * HOUR), 'p2', policy);
    b = record(second.call ? second.next : b, 'success', 'p2', at(4 * HOUR), policy);
    expect(b).toEqual(CLOSED_BREAKER);
  });
});
