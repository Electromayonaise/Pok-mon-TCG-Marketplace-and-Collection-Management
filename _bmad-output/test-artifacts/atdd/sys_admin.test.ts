// ATDD — SYS, the admin panel's reads (contracts.md §15, S-SYS; page 2.3): tick health (ARCH §4), the failed and stuck
// deliveries (AD-SYS-2 rule 9) and their replay (AD-SYS-2 rule 7). Red phase: every test must fail with NotImplementedError.
// Split from sys_contracts.test.ts by the Impl-2 test review re-run (decision log Impl-2 #38); the shared Given steps are in
// test-support/suites/sys.ts.
import { describe, expect, it } from 'vitest';
import { caught, httpOf } from '../../../test-support/errors.js';
import { codeOf } from '../../../test-support/concurrency.js';
import { admin, at, DAY, explainAssert, HOUR, id, jobRun, rows, T0, wiring } from '../../../test-support/solu2/fixtures.js';
import { useSysSuite } from '../../../test-support/suites/sys.js';

const { db, delivery, events } = useSysSuite();

describe('S-SYS.tick — getTickHealth (ARCH §4)', () => {
  it('[S-SYS.tick.h] 3 h after the last tick, read inside 10:17–23:17 Bogotá, tickSilent=true; 1 h after, false', async () => {
    await admin(db);
    await jobRun(db, { id: id('run1'), job: 'tick' });
    const w = wiring(db);
    w.clock.advance(HOUR);
    expect(await events(w).getTickHealth({ adminId: id('admin') })).toMatchObject({ lastTickStartedAt: T0, tickSilent: false });
    w.clock.advance(2 * HOUR + 60_000);
    const silent = await events(w).getTickHealth({ adminId: id('admin') });
    expect(silent.tickSilent).toBe(true);
    explainAssert(silent.decision, { inputs: { lastTickStartedAt: T0 } });
  });

  // Architecture audit F3 (decision log Impl-2 #34): the job route ran trm-fetch hourly against an unwired source and tick
  // health still read "on schedule". It now reads each job's runs, so failing and stuck jobs show on page 2.3.
  it('[S-SYS.tick.jobs] a failed trm-fetch and an expiry run stuck running for 16 min turn the health degraded (ScheduledJobsDegraded); 24 h later both have left the window', async () => {
    await admin(db);
    await jobRun(db, { id: id('tick1'), job: 'outbox-sweep' });
    await jobRun(db, { id: id('fx1'), job: 'trm-fetch', outcome: 'failed', errorCode: 'NotImplemented' });
    await jobRun(db, { id: id('exp1'), job: 'expiry-materialize', outcome: 'running' });
    const w = wiring(db);
    w.clock.advance(16 * 60_000);
    const health = await events(w).getTickHealth({ adminId: id('admin') });
    expect(health).toMatchObject({
      tickSilent: false, degraded: true,
      jobs: [
        { job: 'expiry-materialize', lastOutcome: 'running', failedInWindow: 0, stuckRunning: 1 },
        { job: 'outbox-sweep', lastOutcome: 'succeeded', failedInWindow: 0, stuckRunning: 0 },
        { job: 'trm-fetch', lastOutcome: 'failed', lastErrorCode: 'NotImplemented', failedInWindow: 1, stuckRunning: 0 },
      ],
    });
    explainAssert(health.decision, { code: 'ScheduledJobsDegraded', rule: 'AD-SYS-2', inputs: { failedRuns: 1, stuckRuns: 1 } });
    // A day later, read at 10:16 Bogotá (before the silence window opens), both runs have left the 24 h window.
    w.clock.advance(24 * HOUR);
    const later = await events(w).getTickHealth({ adminId: id('admin') });
    expect([later.degraded, later.decision.reasonCode, later.jobs.map((j) => [j.failedInWindow, j.stuckRunning])]).toEqual([false, 'TickOnSchedule', [[0, 0], [0, 0], [0, 0]]]);
  });
});

describe('S-SYS.deliveries — listDeliveries (AD-SYS-2 rule 9)', () => {
  it('[S-SYS.deliveries.h] failed rows by firstFailedAt; stuck = pending older than 24 h by createdAt; 25 per page', async () => {
    await admin(db);
    for (let i = 0; i < 27; i++) await delivery(id(`f${i}`), { status: 'failed', createdAt: at(-3 * DAY), firstFailedAt: at(-2 * DAY + i * HOUR) });
    await delivery(id('stuck'), { status: 'pending', createdAt: at(-25 * HOUR) });
    await delivery(id('young'), { status: 'pending', createdAt: at(-23 * HOUR) });
    const svc = events(wiring(db));
    const failed = await svc.listDeliveries({ adminId: id('admin'), kind: 'failed', cursor: null });
    expect(failed.rows).toHaveLength(25);
    expect(failed.rows[0]!.eventId).toBe(id('f0'));
    expect(failed.nextCursor).not.toBeNull();
    const stuck = await svc.listDeliveries({ adminId: id('admin'), kind: 'stuck', cursor: null });
    expect(stuck.rows.map((r) => r.eventId)).toEqual([id('stuck')]);
  });
});

describe('S-SYS.health — getDeliveryHealth (AD-SYS-2 rule 9)', () => {
  it('[S-SYS.health.h] counts failed rows, the oldest firstFailedAt and stuck pending rows; delivered rows are not counted', async () => {
    await admin(db);
    await delivery(id('f1'), { status: 'failed', firstFailedAt: at(-2 * DAY) });
    await delivery(id('f2'), { status: 'failed', firstFailedAt: at(-DAY) });
    await delivery(id('ok'), { status: 'delivered' });
    await delivery(id('stuck'), { status: 'pending', createdAt: at(-25 * HOUR) });
    expect(await events(wiring(db)).getDeliveryHealth({ adminId: id('admin') })).toEqual({ failedCount: 2, oldestFirstFailedAt: at(-2 * DAY), stuckPendingCount: 1, latestDigest: null });
  });
});

describe('S-SYS.replay — replayEventDelivery (AD-SYS-2 rule 7)', () => {
  it('[S-SYS.replay.h] a failed delivery replays to delivered, keeps firstFailedAt, and writes one EventReplayLog row', async () => {
    await admin(db);
    await delivery(id('ev1'), { status: 'failed', firstFailedAt: at(-DAY) });
    const w = wiring(db);
    const result = await events(w).replayEventDelivery({ adminId: id('admin'), eventId: id('ev1'), subscriber: 'listings' });
    expect(result).toMatchObject({ status: 'delivered', replayed: true });
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'delivered', firstFailedAt: new Date(at(-DAY)), lastAttemptAt: new Date(T0) }]);
    expect(await rows(db, 'EventReplayLog')).toMatchObject([{ adminId: id('admin'), outcome: 'delivered' }]);
  });

  it('[S-SYS.replay.f] a pending delivery is EventDeliveryNotReplayable (409) citing its status, with zero writes', async () => {
    await admin(db);
    await delivery(id('ev1'), { status: 'pending' });
    const error = await caught(() => events(wiring(db)).replayEventDelivery({ adminId: id('admin'), eventId: id('ev1'), subscriber: 'listings' }));
    expect(codeOf(error)).toBe('EventDeliveryNotReplayable');
    expect(httpOf(error)).toBe(409);
    expect(await rows(db, 'EventReplayLog')).toEqual([]);
  });
});
