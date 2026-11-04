// Driven adapters of the job runner (Story 1.6): the `JobRun` rows (shared-kernel owns the table,
// AD-SYS-2 rule 10) and the single-flight lock `job:<name>` (AD-SYS-4 rule 7). Instants are bound
// parameters from the clock, never SQL `now()` (AD-SYS-6).
import type pg from 'pg';
import type { JobLocks, JobOutcome, JobRunRepository, JobTrigger } from '../jobs.js';
import type { Tx } from '../ports.js';
import type { CuidId, IsoInstant } from '../types.js';

export class PgJobRunRepository implements JobRunRepository {
  async insertJobRun(tx: Tx, row: { id: CuidId; job: string; trigger: JobTrigger; startedAt: IsoInstant; outcome: 'running' | 'skipped' }): Promise<void> {
    // A skipped run is finished at its start; the CHECK `job_run_finished_iff_done` holds either way.
    await tx.query(
      `INSERT INTO "JobRun" (id, trigger, job, "startedAt", "finishedAt", outcome, "errorCode", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, CASE WHEN $5 = 'running' THEN NULL ELSE $4::timestamptz END, $5, NULL, $4, $4)`,
      [row.id, row.trigger, row.job, row.startedAt, row.outcome],
    );
  }

  async finishJobRun(tx: Tx, id: CuidId, end: { outcome: JobOutcome; errorCode: string | null; finishedAt: IsoInstant }): Promise<void> {
    await tx.query(
      `UPDATE "JobRun" SET outcome = $2, "errorCode" = $3, "finishedAt" = $4, "updatedAt" = $4 WHERE id = $1`,
      [id, end.outcome, end.errorCode, end.finishedAt],
    );
  }
}

/**
 * `pg_try_advisory_xact_lock(hashtextextended('job:<name>', 0))` in a transaction of its own, on a
 * connection checked out for the run: the lock lives exactly as long as the run, and the work's own
 * transactions run beside it on other connections.
 */
export class PgJobLocks implements JobLocks {
  constructor(private readonly pool: pg.Pool) {}

  async tryHold(job: string): Promise<{ release(): Promise<void> } | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{ held: boolean }>(`SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS held`, [`job:${job}`]);
      if (rows[0]?.held) {
        return {
          // A COMMIT that throws releases the client with its error, so pg destroys a broken connection rather
          // than pool it (Impl-2 code review F4); the error still reaches the runner.
          release: async () => {
            try {
              await client.query('COMMIT');
            } catch (error) {
              client.release(error instanceof Error ? error : true);
              throw error;
            }
            client.release();
          },
        };
      }
      await client.query('ROLLBACK');
      client.release();
      return null;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
      throw error;
    }
  }
}
