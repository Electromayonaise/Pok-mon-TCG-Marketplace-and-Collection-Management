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

/** The runner's ports in memory; `events` records each call in order, so a test can read what happened when. */
function harness(o: { held?: boolean } = {}) {
  const events: string[] = [];
  const rows = new Map<string, Row>();
  const repo: JobRunRepository = {
    insertJobRun: async (_tx, row) => { events.push(`insert:${row.outcome}`); rows.set(row.id, { ...row }); },
    finishJobRun: async (_tx, id, end) => { events.push(`finish:${end.outcome}`); rows.set(id, { ...rows.get(id)!, ...end }); },
  };
  const locks: JobLocks = {
    tryHold: async (job) => {
      events.push(`hold:${job}`);
      return o.held ? null : { release: async () => { events.push(`release:${job}`); } };
    },
  };
  const transactions: TransactionRunner = { run: async (work) => { events.push('tx'); return work({} as Tx); } };
  const clock = new VirtualClock(Date.parse('2026-10-01T15:00:00.000Z'));
  const runner = new JobRunner({ repo, locks, transactions, clock, ids: new SequentialIds('j') });
  return { events, rows, clock, runner };
}

const work = (run: JobWork['run'], singleFlight: JobWork['singleFlight'] = 'runner'): JobWork => ({ singleFlight, triggers: ['tick'], run });

describe('jobErrorCode (the errorCode a failed JobRun stores)', () => {
  it('is a DomainError\'s own code, NotImplemented for a missing adapter, and Unexpected for anything else', () => {
    const domain = new DomainError('AdminOnly', [{ rule: 'AD-16', inputs: { isAdmin: false } }]);
    expect([jobErrorCode(domain), jobErrorCode(new NotImplementedError('fx.getRateCovering')), jobErrorCode(new UnexpectedError('broken')), jobErrorCode(new Error('x')), jobErrorCode('thrown string')])
      .toEqual(['AdminOnly', 'NotImplemented', 'Unexpected', 'Unexpected', 'Unexpected']);
  });
});

describe('JobRunner.run (AD-SYS-4 rule 7)', () => {
  it('commits a running row before the work starts, then finishes it succeeded with the Clock\'s instants, and releases job:<name> last', async () => {
    const { events, rows, clock, runner } = harness();
    const run = await runner.run('trm-fetch', 'tick', work(async () => {
      events.push('work');
      clock.advance(1_500);
      return { skipped: false, result: { outcome: 'stored' } };
    }));
    expect(run).toEqual({ runId: 'j00000000000000000000001', outcome: 'succeeded', result: { outcome: 'stored' } });
    expect(events).toEqual(['hold:trm-fetch', 'tx', 'insert:running', 'work', 'tx', 'finish:succeeded', 'release:trm-fetch']);
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
  });
});
