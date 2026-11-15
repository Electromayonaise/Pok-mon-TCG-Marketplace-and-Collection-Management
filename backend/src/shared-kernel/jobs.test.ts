// The job runner's lock release (Story 1.6; Impl-2 code review F4): a release that fails after the run's row is
// committed leaves the outcome as it is, and PgJobLocks destroys a connection whose COMMIT threw instead of pooling it.
import type pg from 'pg';
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../test-support/db.js';
import { wiring } from '../../test-support/solu2/fixtures.js';
import { PgJobLocks, PgJobRunRepository } from './infra/pg-jobs.js';
import { JobRunner, type JobLocks } from './jobs.js';

const db = useTestDatabase();

describe('JobRunner when the lock release fails (F4)', () => {
  it('a run whose release throws still returns succeeded, its row stays succeeded, and only the error code is logged', async () => {
    const w = wiring(db);
    const lines: { message: string; data: Record<string, unknown> | undefined }[] = [];
    const log = { info: () => undefined, error: (message: string, data?: Record<string, unknown>) => { lines.push({ message, data }); } };
    const locks: JobLocks = { tryHold: async () => ({ release: async () => { throw new Error('connection terminated at 10.0.0.7'); } }) };
    const runner = new JobRunner({ repo: new PgJobRunRepository(), locks, transactions: w.transactions, clock: w.clock, ids: w.ids, log });
    const run = await runner.run('outbox-sweep', 'tick', { singleFlight: 'runner', triggers: ['tick'], run: async () => ({ skipped: false, result: { swept: 0 } }) });
    expect(run).toMatchObject({ outcome: 'succeeded', result: { swept: 0 } });
    expect(await db.query(`SELECT outcome, "errorCode" FROM "JobRun" WHERE id = $1`, [run.runId])).toEqual([{ outcome: 'succeeded', errorCode: null }]);
    expect(lines).toEqual([{ message: 'job.lock.releaseFailed', data: { job: 'outbox-sweep', runId: run.runId, errorCode: 'Unexpected' } }]);
  });
});

describe('PgJobLocks release (F4)', () => {
  it('a COMMIT that throws releases the client with that error, so pg destroys it, and the error is rethrown', async () => {
    const broken = new Error('connection terminated');
    const released: unknown[] = [];
    const client = {
      query: async (text: string) => {
        if (text === 'COMMIT') throw broken;
        return { rows: text.startsWith('SELECT') ? [{ held: true }] : [] };
      },
      release: (error?: unknown) => { released.push(error); },
    };
    const hold = await new PgJobLocks({ connect: async () => client } as unknown as pg.Pool).tryHold('outbox-sweep');
    await expect(hold!.release()).rejects.toBe(broken);
    expect(released).toEqual([broken]);
  });

  it('release(last) writes in the lock\'s transaction: the write commits with the unlock, and a last that throws is rolled back, frees the lock and is rethrown (decision log Impl-2 #35)', async () => {
    const locks = new PgJobLocks(db.pool);
    const repo = new PgJobRunRepository();
    const at = '2026-10-01T15:00:00.000Z';
    const kept = await locks.tryHold('trm-fetch');
    await kept!.release(async (tx) => {
      await repo.insertJobRun(tx, { id: 'jkept0000000000000000000', job: 'trm-fetch', trigger: 'tick', startedAt: at, outcome: 'running' });
      await repo.finishJobRun(tx, 'jkept0000000000000000000', { outcome: 'failed', errorCode: 'Unexpected', finishedAt: at });
    });
    const broken = new Error('write refused');
    const lost = await locks.tryHold('trm-fetch');
    await expect(lost!.release(async (tx) => {
      await repo.insertJobRun(tx, { id: 'jlost0000000000000000000', job: 'trm-fetch', trigger: 'tick', startedAt: at, outcome: 'running' });
      throw broken;
    })).rejects.toBe(broken);
    expect(await db.query(`SELECT id, outcome, "errorCode" FROM "JobRun" ORDER BY id`)).toEqual([{ id: 'jkept0000000000000000000', outcome: 'failed', errorCode: 'Unexpected' }]);
    const next = await locks.tryHold('trm-fetch');
    expect(next).not.toBeNull();
    await next!.release();
  });

  it('a COMMIT that succeeds frees job:<name>, so the next run holds it', async () => {
    const locks = new PgJobLocks(db.pool);
    const first = await locks.tryHold('outbox-sweep');
    expect(await locks.tryHold('outbox-sweep')).toBeNull();
    await first!.release();
    const next = await locks.tryHold('outbox-sweep');
    expect(next).not.toBeNull();
    await next!.release();
  });
});
