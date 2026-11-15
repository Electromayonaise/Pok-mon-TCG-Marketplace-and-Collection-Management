// Scheduled job runs (Story 1.6; ARCHITECTURE §4, §13; AD-SYS-4 rule 7). Every run leaves exactly one
// `JobRun` row (shared-kernel owns the table, AD-SYS-2 rule 10): `running` from its start, then
// `succeeded`, `skipped` or `failed` with the error code, every instant from `Clock` (AD-SYS-6). A job
// whose work does not single-flight itself runs under `job:<name>`, held for the whole run on its own
// connection, because the work opens transactions of its own (expiry runs one per order).
import { DomainError, NotImplementedError } from './errors.js';
import type { Clock, IdGenerator, TransactionRunner, Tx } from './ports.js';
import type { Logger } from './regulated.js';
import type { CuidId, IsoInstant } from './types.js';

/** The schedulers that call a job route (ARCH §4); `admin` runs come from admin procedures only. */
export const JOB_TRIGGERS = ['tick', 'daily-morning', 'daily-night'] as const;
export type JobTrigger = (typeof JOB_TRIGGERS)[number];
export type JobOutcome = 'succeeded' | 'skipped' | 'failed';

export interface JobRunRepository {
  insertJobRun(tx: Tx, row: { id: CuidId; job: string; trigger: JobTrigger; startedAt: IsoInstant; outcome: 'running' | 'skipped' }): Promise<void>;
  finishJobRun(tx: Tx, id: CuidId, end: { outcome: JobOutcome; errorCode: string | null; finishedAt: IsoInstant }): Promise<void>;
}

/** A held `job:<name>`: a transaction of its own on a connection the run keeps until `release`. */
export interface JobHold {
  /**
   * Runs `last` in the lock's transaction, then commits it, which frees `job:<name>`: the run's last write and the
   * unlock commit together, on the connection the run already holds, so they never wait for the pool (decision log
   * Impl-2 #35). If `last` or the commit throws, the transaction is rolled back, the lock is freed with its session and
   * the error is rethrown.
   */
  release(last?: (tx: Tx) => Promise<void>): Promise<void>;
}

/** `job:<name>`, held until `release`; null when another run holds it (`pg_try_advisory_xact_lock`). */
export interface JobLocks {
  tryHold(job: string): Promise<JobHold | null>;
}

/** One job's work. `singleFlight: 'work'` when the work takes `job:<name>` itself (COM-3 P2). */
export interface JobWork {
  singleFlight: 'runner' | 'work';
  /** The schedulers that may run this job (ARCH §13); any other trigger is refused before a row is written. */
  triggers: readonly JobTrigger[];
  run(trigger: JobTrigger): Promise<{ skipped: boolean; result: unknown }>;
}

export interface JobRunResult {
  runId: CuidId;
  outcome: JobOutcome;
  result: unknown;
  /** The thrown value of a `failed` run, for the caller's log; it never reaches a response body. */
  error?: unknown;
}

/** The `errorCode` a failed run stores: a DomainError's code, `NotImplemented`, or `Unexpected`. */
export function jobErrorCode(error: unknown): string {
  if (error instanceof DomainError) return error.code;
  if (error instanceof NotImplementedError) return 'NotImplemented';
  return 'Unexpected';
}

export class JobRunner {
  constructor(private readonly deps: { repo: JobRunRepository; locks: JobLocks; transactions: TransactionRunner; clock: Clock; ids: IdGenerator; log?: Logger }) {}

  /**
   * One run, one `JobRun` row. Under pool exhaustion (the runtime pool's checkout timeout, decision log Impl-2 #35) a run
   * that holds `job:<name>` still ends `failed` with its error code: its last write goes on the lock's own connection. A
   * run that cannot get the lock's connection at all has written nothing: it logs `job.lock.acquireFailed` and throws,
   * and the route answers 500.
   */
  async run(job: string, trigger: JobTrigger, work: JobWork): Promise<JobRunResult> {
    const { repo, locks, transactions, clock, ids, log } = this.deps;
    const runId = ids.next();
    const startedAt = clock.now().toISOString();
    const hold = work.singleFlight === 'runner' ? await locks.tryHold(job).catch((error: unknown) => {
      log?.error('job.lock.acquireFailed', { job, runId, errorCode: jobErrorCode(error) });
      throw error;
    }) : undefined;
    if (hold === null) {
      await transactions.run(async (tx) => {
        await repo.insertJobRun(tx, { id: runId, job, trigger, startedAt, outcome: 'skipped' });
        await repo.finishJobRun(tx, runId, { outcome: 'skipped', errorCode: null, finishedAt: startedAt });
      });
      return { runId, outcome: 'skipped', result: null };
    }
    let started = false;
    let ran: JobRunResult;
    try {
      // Committed before the work starts, so a run that dies mid-way stays visible as `running`.
      await transactions.run((tx) => repo.insertJobRun(tx, { id: runId, job, trigger, startedAt, outcome: 'running' }));
      started = true;
      const { skipped, result } = await work.run(trigger);
      ran = { runId, outcome: skipped ? 'skipped' : 'succeeded', result };
    } catch (error) {
      // Without a hold, a run whose `running` row was refused has nowhere to write: it throws, as it wrote nothing.
      if (!started && hold === undefined) throw error;
      ran = { runId, outcome: 'failed', result: null, error };
    }
    const end = { outcome: ran.outcome, errorCode: ran.outcome === 'failed' ? jobErrorCode(ran.error) : null, finishedAt: clock.now().toISOString() };
    const finish = async (tx: Tx) => {
      // A run whose `running` row the pool refused writes it here, beside its end.
      if (!started) await repo.insertJobRun(tx, { id: runId, job, trigger, startedAt, outcome: 'running' });
      await repo.finishJobRun(tx, runId, end);
    };
    if (hold === undefined) {
      await transactions.run(finish);
      return ran;
    }
    try {
      await hold.release(finish);
    } catch (error) {
      // The end did not commit with the unlock (a COMMIT on a broken connection), and the lock ended with its session. The
      // end is written on a connection of its own, so a failed release never replaces the run's outcome (Impl-2 code
      // review F4). Only the error code is logged.
      log?.error('job.lock.releaseFailed', { job, runId, errorCode: jobErrorCode(error) });
      await transactions.run(finish);
    }
    return ran;
  }
}
