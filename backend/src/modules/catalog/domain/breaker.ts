// Core domain — CAT: the TRM source's circuit breaker (Story 4.6, decision log Impl-2 #31). Pure (AD-SYS-6):
// every instant is an argument, read from the Clock by the caller. The application service locks the one
// "FxSourceBreaker" row, asks `admit` before the source call and `record` after it, and saves the result,
// each in its own short transaction; the source call runs between them, outside any transaction.

/** closed: calls pass; open: calls are short-circuited until the cool-down ends; halfOpen: one probe is in flight. */
export type BreakerState = 'closed' | 'open' | 'halfOpen';

export interface BreakerPolicy {
  /** Failures in a row that open the breaker. */
  failureThreshold: number;
  /** How long an open breaker short-circuits before one probe may run. */
  coolDownMs: number;
  /** How long a half-open probe holds its turn; a probe that never reports back is taken over after it. */
  probeLeaseMs: number;
}

/**
 * Agent defaults (Story 4.6): 3 failures in a row open the breaker for 30 minutes. The hourly tick
 * (ARCH §13, 07:17–20:17 Bogotá) always finds the cool-down over, so no scheduled attempt is skipped
 * (NFR-CAT-4); what the breaker stops are the retries and concurrent calls between ticks.
 */
export const TRM_BREAKER_POLICY: BreakerPolicy = { failureThreshold: 3, coolDownMs: 30 * 60_000, probeLeaseMs: 60_000 };

export interface Breaker {
  state: BreakerState;
  /** Failed calls in a row since the last success. */
  consecutiveFailures: number;
  /** When the breaker last opened; null while closed. */
  openedAt: string | null;
  /** open: the end of the cool-down; halfOpen: the end of the probe's lease; closed: null. */
  retryAt: string | null;
  /** The probe's token while halfOpen; null otherwise. */
  probeToken: string | null;
}

/** A breaker with no stored row: closed, with no failure. */
export const CLOSED_BREAKER: Breaker = { state: 'closed', consecutiveFailures: 0, openedAt: null, retryAt: null, probeToken: null };

/**
 * Whether a call at `now` may reach the source. `probeToken` is set when the call is the one probe of a
 * half-open breaker; `next` is the breaker to store before the call.
 */
export type Admission =
  | { call: true; probeToken: string | null; next: Breaker }
  | { call: false; retryAt: string; consecutiveFailures: number };

const plus = (instant: string, ms: number): string => new Date(Date.parse(instant) + ms).toISOString();

/** The breaker opened at `now` after `failures` failures in a row. */
function opened(failures: number, now: string, policy: BreakerPolicy): Breaker {
  return { state: 'open', consecutiveFailures: failures, openedAt: now, retryAt: plus(now, policy.coolDownMs), probeToken: null };
}

/**
 * closed lets every call through. open and halfOpen short-circuit until `retryAt`; at or after it, the
 * call becomes the probe (an open breaker's cool-down is over, or a half-open probe's lease lapsed) and
 * takes `token`.
 */
export function admit(breaker: Breaker, now: string, token: string, policy: BreakerPolicy): Admission {
  if (breaker.state === 'closed') return { call: true, probeToken: null, next: breaker };
  const retryAt = breaker.retryAt!;
  if (Date.parse(now) < Date.parse(retryAt)) return { call: false, retryAt, consecutiveFailures: breaker.consecutiveFailures };
  return { call: true, probeToken: token, next: { ...breaker, state: 'halfOpen', retryAt: plus(now, policy.probeLeaseMs), probeToken: token } };
}

/**
 * The breaker after a call admitted with `probeToken` (null: admitted while closed) ended in `outcome`
 * at `now`. A result only moves the state it was admitted in: a closed-state call that returns after the
 * breaker opened, or a probe whose lease another probe took over, leaves the breaker as it is.
 */
export function record(breaker: Breaker, outcome: 'success' | 'failure', probeToken: string | null, now: string, policy: BreakerPolicy): Breaker {
  if (probeToken === null) {
    if (breaker.state !== 'closed') return breaker;
    if (outcome === 'success') return breaker.consecutiveFailures === 0 ? breaker : CLOSED_BREAKER;
    const failures = breaker.consecutiveFailures + 1;
    return failures >= policy.failureThreshold ? opened(failures, now, policy) : { ...breaker, consecutiveFailures: failures };
  }
  if (breaker.state !== 'halfOpen' || breaker.probeToken !== probeToken) return breaker;
  return outcome === 'success' ? CLOSED_BREAKER : opened(breaker.consecutiveFailures + 1, now, policy);
}
