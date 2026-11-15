// ATDD — the TRM source's circuit breaker (Story 4.6, decision log Impl-2 #31; contracts.md §3 S-FR-CAT-8,
// §15 S-FR-CAT-8.breaker). Flow A: red first, every test failing on NotImplementedError. Each test reads
// the breaker through the admin read (page 2.3), so the state it asserts is the one an admin would see.
// Concurrency is proven with the barrier (`race`) and Postgres' own lock report, never with timing.
import { describe, expect, it } from 'vitest';
import { CatServiceV2 } from '../../../src/modules/catalog/index.js';
import type { FxRateSource } from '../../../src/shared-kernel/external.js';
import { race } from '../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { untilBlockedOnLock } from '../../../test-support/locks.js';
import { FixtureFeedSource, FixtureFxRateSource, type FeedFiles } from '../../../test-support/simulated/index.js';
import { at, DAY, explainAssert, fxRate, HOUR, id, ins, rows, T0, wiring } from '../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();
const NO_FILES: FeedFiles = { current: [], previous: [], defects: [], renamed: [] };
/** The fixture source publishes today's TRM (T0 is 2026-10-01 10:00 Bogotá) and nothing for 2026-10-02. */
const RATES = [{ valor: '4130.00', validFrom: '2026-10-01', validTo: '2026-10-01' }];
const MINUTE = 60_000;
/** The agent defaults of Story 4.6: 3 failures in a row open the breaker for 30 minutes. */
const THRESHOLD = 3;
const COOL_DOWN = 30 * MINUTE;

function setup(fx: FxRateSource = new FixtureFxRateSource(RATES)) {
  const w = wiring(db);
  return { w, cat: new CatServiceV2({ ...w, feed: new FixtureFeedSource(NO_FILES), fx }) };
}
const readBreaker = (cat: CatServiceV2) => cat.getFxSourceBreaker({ actorId: id('admin') });
/** Yesterday's TRM: what `getFxRate(today)` carries forward while the source is down. */
const yesterdaysRate = () => fxRate(db, { id: id('fx0'), copPerUsdCentavos: 412_337, validFrom: '2026-09-30' });
/** The row 3 failures in a row leave, opened 30 min before `retryAt`. */
const openBreaker = (retryAt: string) => ins(db, 'FxSourceBreaker', {
  port: 'FxRateSource', state: 'open', consecutiveFailures: THRESHOLD, openedAt: new Date(Date.parse(retryAt) - COOL_DOWN).toISOString(), retryAt, probeToken: null,
});

describe('Story 4.6 — the breaker opens after 3 failures in a row and short-circuits the TRM source (S-FR-CAT-8, NFR-CAT-4)', () => {
  it('[S-FR-CAT-8.breaker.h] a deployment with no breaker row reads closed: 0 failures of a threshold of 3, explained, and the read writes nothing', async () => {
    const { cat } = setup();
    const breaker = await readBreaker(cat);
    expect(breaker).toMatchObject({ state: 'closed', consecutiveFailures: 0, failureThreshold: THRESHOLD, openedAt: null, retryAt: null });
    explainAssert(breaker.decision, { code: 'FxSourceHealthy', outcome: 'allowed', rule: 'NFR-CAT-4', inputs: { consecutiveFailures: 0, failureThreshold: THRESHOLD } });
    expect(await rows(db, 'FxSourceBreaker')).toHaveLength(0);
  });

  it("[S-FR-CAT-8.breaker.open] the 3rd hourly failure opens the breaker; a retry 10 min later is circuitOpen with no source call and no write, and today's rate stays yesterday's, stale", async () => {
    await yesterdaysRate();
    const fx = new FixtureFxRateSource(RATES);
    const { w, cat } = setup(fx);
    fx.fault = 'down';
    for (let tick = 0; tick < THRESHOLD; tick++) {
      if (tick > 0) w.clock.advance(HOUR);
      expect((await cat.fetchTrm({ trigger: 'tick' })).outcome).toBe('sourceUnavailable');
    }
    const openedAt = w.clock.iso();
    const retryAt = at(2 * HOUR + COOL_DOWN);
    const breaker = await readBreaker(cat);
    expect(breaker).toMatchObject({ state: 'open', consecutiveFailures: THRESHOLD, openedAt, retryAt });
    explainAssert(breaker.decision, { code: 'FxRateCircuitOpen', rule: 'NFR-CAT-4', inputs: { consecutiveFailures: THRESHOLD, retryAt } });

    w.clock.advance(10 * MINUTE);
    const retried = await cat.fetchTrm({ trigger: 'admin' });
    expect(retried.outcome).toBe('circuitOpen');
    explainAssert(retried.decision, { code: 'FxRateCircuitOpen', outcome: 'allowedWithNotice', rule: 'NFR-CAT-4', inputs: { consecutiveFailures: THRESHOLD, retryAt, trigger: 'admin' } });
    expect(fx.calls).toBe(THRESHOLD);
    expect(await rows(db, 'FxRate')).toHaveLength(1);
    // Graceful degradation: the last stored rate keeps being served, labelled stale, never a fabricated one (Story 4.4).
    const rate = await cat.getFxRate({ date: '2026-10-01' });
    expect(rate).toMatchObject({ copPerUsdCentavos: 412_337, validFrom: '2026-09-30', stale: true });
    explainAssert(rate.decision, { code: 'FxRateCarriedForward', rule: 'FR-CAT-8' });
  });

  it('[S-FR-CAT-8.breaker.halfOpen] once the cool-down has passed one probe runs: its failure reopens the breaker for a new 30 min, and the next probe\'s success closes it and stores the rate', async () => {
    await yesterdaysRate();
    await openBreaker(T0);
    const fx = new FixtureFxRateSource(RATES);
    const { w, cat } = setup(fx);
    expect(await readBreaker(cat)).toMatchObject({ state: 'open', retryAt: T0 });

    fx.fault = 'down';
    expect((await cat.fetchTrm({ trigger: 'tick' })).outcome).toBe('sourceUnavailable');
    expect(fx.calls).toBe(1);
    expect(await readBreaker(cat)).toMatchObject({ state: 'open', consecutiveFailures: THRESHOLD + 1, openedAt: T0, retryAt: at(COOL_DOWN) });

    w.clock.advance(COOL_DOWN - 1);
    expect((await cat.fetchTrm({ trigger: 'admin' })).outcome).toBe('circuitOpen');
    expect(fx.calls).toBe(1);

    w.clock.advance(1);
    fx.fault = 'none';
    expect((await cat.fetchTrm({ trigger: 'tick' })).outcome).toBe('stored');
    expect(fx.calls).toBe(2);
    const closed = await readBreaker(cat);
    expect(closed).toMatchObject({ state: 'closed', consecutiveFailures: 0, openedAt: null, retryAt: null });
    explainAssert(closed.decision, { code: 'FxSourceHealthy', rule: 'NFR-CAT-4' });
    expect(await rows(db, 'FxRate')).toHaveLength(2);
  });

  it('[S-FR-CAT-8.breaker.reset] only failures in a row count: 2 failures, a success, then 2 failures the next day leave it closed at 2, and the 3rd opens it', async () => {
    const fx = new FixtureFxRateSource(RATES);
    const { w, cat } = setup(fx);
    fx.fault = 'down';
    await cat.fetchTrm({ trigger: 'tick' });
    w.clock.advance(HOUR);
    await cat.fetchTrm({ trigger: 'tick' });
    expect(await readBreaker(cat)).toMatchObject({ state: 'closed', consecutiveFailures: 2 });

    w.clock.advance(HOUR);
    fx.fault = 'none';
    expect((await cat.fetchTrm({ trigger: 'tick' })).outcome).toBe('stored');
    expect(await readBreaker(cat)).toMatchObject({ state: 'closed', consecutiveFailures: 0 });

    // 2026-10-02: the fixture has no rate for it, so the source answers null, a failure.
    w.clock.advance(DAY);
    for (let tick = 0; tick < 2; tick++) {
      w.clock.advance(HOUR);
      expect((await cat.fetchTrm({ trigger: 'tick' })).outcome).toBe('sourceUnavailable');
    }
    expect(await readBreaker(cat)).toMatchObject({ state: 'closed', consecutiveFailures: 2 });
    w.clock.advance(HOUR);
    expect((await cat.fetchTrm({ trigger: 'tick' })).outcome).toBe('sourceUnavailable');
    expect(await readBreaker(cat)).toMatchObject({ state: 'open', consecutiveFailures: THRESHOLD, openedAt: w.clock.iso() });
  });
});

describe('Story 4.6 — every instance shares one breaker row, moved atomically (AD-8, NFR-SYS-10)', () => {
  it('[S-FR-CAT-8.breaker.C1] 50 concurrent fetches on an open breaker whose cool-down has passed: exactly one probe reaches the source, and the other 49 answer circuitOpen', async () => {
    await yesterdaysRate();
    await openBreaker(T0);
    const N = 50;
    // The source holds the probe until every other fetch has answered: a second probe would then be
    // inside the source as well, and counted, instead of finishing before the next one starts.
    let inSource = 0;
    let settled = 0;
    let openGate!: () => void;
    const gate = new Promise<void>((resolve) => { openGate = resolve; });
    const progress = () => { if (inSource + settled === N) openGate(); };
    const { cat } = setup({ getRateCovering: async () => { inSource++; progress(); await gate; return null; } });
    expect(await readBreaker(cat)).toMatchObject({ state: 'open', retryAt: T0 });

    // The breaker row is locked while the 50 fetches start, so they meet it together; Postgres reports the wait.
    let release!: () => void;
    const released = new Promise<void>((resolve) => { release = resolve; });
    let locked!: () => void;
    const isLocked = new Promise<void>((resolve) => { locked = resolve; });
    const holder = db.transactions.run(async (tx) => {
      await tx.query(`SELECT port FROM "FxSourceBreaker" WHERE port = 'FxRateSource' FOR UPDATE`);
      locked();
      await released;
    });
    await isLocked;
    const racing = race(N, () => cat.fetchTrm({ trigger: 'tick' }).finally(() => { settled++; progress(); }));
    try {
      await untilBlockedOnLock(db, '"FxSourceBreaker"', { orSettled: racing });
    } finally {
      release();
      await holder;
    }
    const { fulfilled, rejected } = await racing;
    if (rejected.length > 0) throw rejected[0];
    expect(inSource).toBe(1);
    expect(fulfilled.filter((r) => r.outcome === 'sourceUnavailable')).toHaveLength(1);
    expect(fulfilled.filter((r) => r.outcome === 'circuitOpen')).toHaveLength(N - 1);
    expect(await readBreaker(cat)).toMatchObject({ state: 'open', consecutiveFailures: THRESHOLD + 1, openedAt: T0, retryAt: at(COOL_DOWN) });
  }, 60_000);

  it('[S-FR-CAT-8.breaker.C2] 3 concurrent failing fetches from closed (a tick racing two admin retries), 20 rounds: all 3 reach the source and the breaker opens with exactly 3 failures counted', async () => {
    const fx = new FixtureFxRateSource(RATES);
    const { cat } = setup(fx);
    expect(await readBreaker(cat)).toMatchObject({ state: 'closed', consecutiveFailures: 0 });
    fx.fault = 'down';
    for (let round = 0; round < 20; round++) {
      // A fresh closed breaker each round: no row reads closed with 0 failures.
      await db.query('DELETE FROM "FxSourceBreaker"');
      const before = fx.calls;
      const { fulfilled, rejected } = await race(THRESHOLD, (i) => cat.fetchTrm({ trigger: i === 0 ? 'tick' : 'admin' }));
      if (rejected.length > 0) throw rejected[0];
      expect(fulfilled.map((r) => r.outcome)).toEqual(['sourceUnavailable', 'sourceUnavailable', 'sourceUnavailable']);
      expect(fx.calls - before).toBe(THRESHOLD);
      expect(await readBreaker(cat)).toMatchObject({ state: 'open', consecutiveFailures: THRESHOLD });
    }
  }, 60_000);
});
