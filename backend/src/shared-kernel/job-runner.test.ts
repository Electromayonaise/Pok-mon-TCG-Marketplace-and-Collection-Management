// The JobRunner's rules without a database (Story 1.6; ARCHITECTURE §4; AD-SYS-4 rule 7; decision log Impl-2 #24): one
// JobRun row per run, `running` committed before the work, the outcome and error code it ends with, the Clock's
// instants, and single-flight under `job:<name>`. The repository, the locks and the transaction runner are the
// runner's ports, so they are in-memory here; the Postgres adapters are proven in jobs.test.ts and atdd/sys_jobs.
import { describe, expect, it } from 'vitest';
import { VirtualClock } from '../../test-support/clock.js';
import { SequentialIds } from '../../test-support/ids.js';
import { DomainError, NotImplementedError, UnexpectedError } from './errors.js';
import { JobRunner, jobErrorCode, type JobLocks, type JobRunRepository, type JobWork } from './jobs.js';
import type { TransactionRunner, Tx } from './ports.js';

type Row = { id: string; job: string; trigger: string; startedAt: string; outcome: string; errorCode?: string | null; finishedAt?: string };

/**
 * The runner's ports in memory; `events` records each call in order, so a test can read what happened when. A write in
 * the lock's transaction is recorded between `hold` and `release`, with no `tx` of its own. `refuse` names the pool
 * checkouts that fail, as the runtime pool's checkout timeout fails them (decision log Impl-2 #35): `hold` for the lock's
 * connection, or the numbers (1-based) of the `transactions.run` calls; `releaseFails` makes the lock's COMMIT throw.
 */
function harness(o: { held?: boolean; refuse?: { hold?: boolean; tx?: number[] }; releaseFails?: boolean } = {}) {
  const events: string[] = [];
  const rows = new Map<string, Row>();
  const lines: { message: string; data: Record<string, unknown> | undefined }[] = [];
  const repo: JobRunRepository = {
    insertJobRun: async (_tx, row) => { events.push(`insert:${row.outcome}`); rows.set(row.id, { ...row }); },
    finishJobRun: async (_tx, id, end) => { events.push(`finish:${end.outcome}`); rows.set(id, { ...rows.get(id)!, ...end }); },
  };
  const locks: JobLocks = {
    tryHold: async (job) => {
      events.push(`hold:${job}`);
      if (o.refuse?.hold) throw new Error(TIMEOUT);
      if (o.held) return null;
      return {
        release: async (last) => {
          // The lock's transaction: its writes are kept only if its COMMIT succeeds.
          const before = new Map(rows);
          if (last) await last({} as Tx);
          if (o.releaseFails) {
            rows.clear();
            for (const [k, v] of before) rows.set(k, v);
            events.push(`release-failed:${job}`);
            throw new Error('connection terminated at 10.0.0.7');
          }
          events.push(`release:${job}`);
        },
      };
    },
  };
  let txs = 0;
  const transactions: TransactionRunner = {
    run: async (work) => {
      txs += 1;
      events.push('tx');
      if (o.refuse?.tx?.includes(txs)) throw new Error(TIMEOUT);
      return work({} as Tx);
    },
  };
  const clock = new VirtualClock(Date.parse('2026-10-01T15:00:00.000Z'));
  const log = { info: () => undefined, error: (message: string, data?: Record<string, unknown>) => { lines.push({ message, data }); } };
  const runner = new JobRunner({ repo, locks, transactions, clock, ids: new SequentialIds('j'), log });
  return { events, rows, lines, clock, runner };
}

/** pg's message when a checkout waits past `connectionTimeoutMillis`. */
const TIMEOUT = 'timeout exceeded when trying to connect';

const work = (run: JobWork['run'], singleFlight: JobWork['singleFlight'] = 'runner'): JobWork => ({ singleFlight, triggers: ['tick'], run });

describe('jobErrorCode (the errorCode a failed JobRun stores)', () => {
  it('is a DomainError\'s own code, NotImplemented for a missing adapter, and Unexpected for anything else', () => {
    const domain = new DomainError('AdminOnly', [{ rule: 'AD-16', inputs: { isAdmin: false } }]);
    expect([jobErrorCode(domain), jobErrorCode(new NotImplementedError('fx.getRateCovering')), jobErrorCode(new UnexpectedError('broken')), jobErrorCode(new Error('x')), jobErrorCode('thrown string')])
      .toEqual(['AdminOnly', 'NotImplemented', 'Unexpected', 'Unexpected', 'Unexpected']);
  });
});

describe('JobRunner.run (AD-SYS-4 rule 7)', () => {
  it('commits a running row before the work starts, then finishes it succeeded with the Clock\'s instants in the lock\'s transaction, whose commit releases job:<name>', async () => {
    const { events, rows, clock, runner } = harness();
    const run = await runner.run('trm-fetch', 'tick', work(async () => {
      events.push('work');
      clock.advance(1_500);
      return { skipped: false, result: { outcome: 'stored' } };
    }));
    expect(run).toEqual({ runId: 'j00000000000000000000001', outcome: 'succeeded', result: { outcome: 'stored' } });
    // The end is written in the lock's transaction and commits with the unlock (no `tx` of its own; decision log Impl-2 #35).
    expect(events).toEqual(['hold:trm-fetch', 'tx', 'insert:running', 'work', 'finish:succeeded', 'release:trm-fetch']);
    expect([...rows.values()]).toEqual([{
      id: run.runId, job: 'trm-fetch', trigger: 'tick', outcome: 'succeeded', errorCode: null, startedAt: '2026-10-01T15:00:00.000Z', finishedAt: '2026-10-01T15:00:01.500Z',
    }]);
  });

  it('a run that finds job:<name> held writes one skipped row, started and finished at once, and never runs the work', async () => {
    const { events, rows, runner } = harness({ held: true });
    let ran = false;
    const run = await runner.run('outbox-sweep', 'tick', work(async () => { ran = true; return { skipped: false, result: null }; }));
    expect([run.outcome, run.result, ran]).toEqual(['skipped', null, false]);
    expect(events).toEqual(['hold:outbox-sweep', 'tx', 'insert:skipped', 'finish:skipped']);
    expect([...rows.values()]).toMatchObject([{ outcome: 'skipped', errorCode: null, startedAt: '2026-10-01T15:00:00.000Z', finishedAt: '2026-10-01T15:00:00.000Z' }]);
  });

  it('work that reports itself skipped ends skipped, not succeeded', async () => {
    const { rows, runner } = harness();
    const run = await runner.run('commission-reconcile', 'tick', work(async () => ({ skipped: true, result: { reason: 'locked' } }), 'work'));
    expect([run.outcome, run.result]).toEqual(['skipped', { reason: 'locked' }]);
    expect([...rows.values()]).toMatchObject([{ outcome: 'skipped', errorCode: null }]);
  });

  it('work that throws ends failed with its error code, returns the error for the log, and still releases the lock', async () => {
    const { events, rows, runner } = harness();
    const thrown = new NotImplementedError('fx.getRateCovering');
    const run = await runner.run('trm-fetch', 'daily-morning', work(async () => { throw thrown; }));
    expect(run).toEqual({ runId: 'j00000000000000000000001', outcome: 'failed', result: null, error: thrown });
    expect([...rows.values()]).toMatchObject([{ trigger: 'daily-morning', outcome: 'failed', errorCode: 'NotImplemented' }]);
    expect(events.at(-1)).toBe('release:trm-fetch');
  });

  it('work that single-flights itself (COM-3 P2) is never wrapped in job:<name>', async () => {
    const { events, runner } = harness({ held: true });
    const run = await runner.run('commission-reconcile', 'tick', work(async () => ({ skipped: false, result: null }), 'work'));
    expect(run.outcome).toBe('succeeded');
    expect(events.filter((e) => e.startsWith('hold') || e.startsWith('release'))).toEqual([]);
    expect(events).toEqual(['tx', 'insert:running', 'tx', 'finish:succeeded']);
  });
});

describe('JobRunner.run when the pool refuses a checkout (decision log Impl-2 #35)', () => {
  it('a run that holds job:<name> but whose running row is refused ends failed Unexpected, written with its end in the lock\'s transaction; the work never runs', async () => {
    const { events, rows, runner } = harness({ refuse: { tx: [1] } });
    let ran = false;
    const run = await runner.run('expiry-materialize', 'tick', work(async () => { ran = true; return { skipped: false, result: null }; }));
    expect([run.outcome, ran, (run.error as Error).message]).toEqual(['failed', false, TIMEOUT]);
    expect(events).toEqual(['hold:expiry-materialize', 'tx', 'insert:running', 'finish:failed', 'release:expiry-materialize']);
    expect([...rows.values()]).toEqual([{
      id: run.runId, job: 'expiry-materialize', trigger: 'tick', outcome: 'failed', errorCode: 'Unexpected', startedAt: '2026-10-01T15:00:00.000Z', finishedAt: '2026-10-01T15:00:00.000Z',
    }]);
  });

  it('work whose own checkout is refused ends failed Unexpected, and its end takes no further checkout', async () => {
    const { events, rows, runner } = harness();
    const run = await runner.run('outbox-sweep', 'tick', work(async () => { throw new Error(TIMEOUT); }));
    expect(run.outcome).toBe('failed');
    expect([...rows.values()]).toMatchObject([{ outcome: 'failed', errorCode: 'Unexpected' }]);
    expect(events).toEqual(['hold:outbox-sweep', 'tx', 'insert:running', 'finish:failed', 'release:outbox-sweep']);
  });

  it('a run refused the lock\'s connection writes no row, logs job.lock.acquireFailed with the error code only, and throws', async () => {
    const { events, rows, lines, runner } = harness({ refuse: { hold: true } });
    await expect(runner.run('trm-fetch', 'tick', work(async () => ({ skipped: false, result: null })))).rejects.toThrow(TIMEOUT);
    expect([events, rows.size]).toEqual([['hold:trm-fetch'], 0]);
    expect(lines).toEqual([{ message: 'job.lock.acquireFailed', data: { job: 'trm-fetch', runId: 'j00000000000000000000001', errorCode: 'Unexpected' } }]);
  });

  it('a run without the runner\'s hold (COM-3 P2) whose running row is refused writes nothing and throws', async () => {
    const { rows, runner } = harness({ refuse: { tx: [1] } });
    await expect(runner.run('commission-reconcile', 'daily-night', work(async () => ({ skipped: false, result: null }), 'work'))).rejects.toThrow(TIMEOUT);
    expect(rows.size).toBe(0);
  });

  it('a release whose COMMIT throws loses the end it carried, so the end is written again on a connection of its own (F4)', async () => {
    const { events, rows, lines, runner } = harness({ refuse: { tx: [1] }, releaseFails: true });
    const run = await runner.run('trm-fetch', 'tick', work(async () => ({ skipped: false, result: null })));
    expect(run.outcome).toBe('failed');
    expect(events).toEqual(['hold:trm-fetch', 'tx', 'insert:running', 'finish:failed', 'release-failed:trm-fetch', 'tx', 'insert:running', 'finish:failed']);
    expect([...rows.values()]).toMatchObject([{ outcome: 'failed', errorCode: 'Unexpected' }]);
    expect(lines).toEqual([{ message: 'job.lock.releaseFailed', data: { job: 'trm-fetch', runId: run.runId, errorCode: 'Unexpected' } }]);
  });
});
