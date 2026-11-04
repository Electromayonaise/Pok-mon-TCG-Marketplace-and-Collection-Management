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

/** `job:<name>`, held until `release`; null when another run holds it (`pg_try_advisory_xact_lock`). */
export interface JobLocks {
  tryHold(job: string): Promise<{ release(): Promise<void> } | null>;
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

  async run(job: string, trigger: JobTrigger, work: JobWork): Promise<JobRunResult> {
    const { repo, locks, transactions, clock, ids } = this.deps;
    const runId = ids.next();
    const startedAt = clock.now().toISOString();
    const hold = work.singleFlight === 'runner' ? await locks.tryHold(job) : undefined;
    if (hold === null) {
      await transactions.run(async (tx) => {
        await repo.insertJobRun(tx, { id: runId, job, trigger, startedAt, outcome: 'skipped' });
        await repo.finishJobRun(tx, runId, { outcome: 'skipped', errorCode: null, finishedAt: startedAt });
      });
      return { runId, outcome: 'skipped', result: null };
    }
    try {
      // Committed before the work starts, so a run that dies mid-way stays visible as `running`.
      await transactions.run((tx) => repo.insertJobRun(tx, { id: runId, job, trigger, startedAt, outcome: 'running' }));
      let ran: JobRunResult;
      try {
        const { skipped, result } = await work.run(trigger);
        ran = { runId, outcome: skipped ? 'skipped' : 'succeeded', result };
      } catch (error) {
        ran = { runId, outcome: 'failed', result: null, error };
      }
      const errorCode = ran.outcome === 'failed' ? jobErrorCode(ran.error) : null;
      const finishedAt = clock.now().toISOString();
      await transactions.run((tx) => repo.finishJobRun(tx, runId, { outcome: ran.outcome, errorCode, finishedAt }));
      return ran;
    } finally {
      // The run's row is committed by now: a lock whose release fails (its COMMIT on a broken connection) ends with
      // its session, and never replaces the run's outcome (Impl-2 code review F4). Only the error code is logged.
      await hold?.release().catch((error: unknown) => {
        this.deps.log?.error('job.lock.releaseFailed', { job, runId, errorCode: jobErrorCode(error) });
      });
    }
  }
}
