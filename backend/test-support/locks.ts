// Condition wait for lock proofs (test review MEDIUM-1/2, decision log Impl-2 #8). A test that
// asserts "the second statement is still blocked" first waits until Postgres itself reports that
// statement waiting on a lock. Sleeping and then asserting proved only a timing window: a statement
// that had not reached the server yet passed the assertion without any lock being tested.
import type { TestDb } from './db.js';

/**
 * Resolves once a backend of this test database, whose current query contains `fragment`, waits on a
 * lock (`wait_event_type = 'Lock'`: row, transaction id or advisory), or once `orSettled` settles,
 * for races where the contender may finish without ever blocking. Bounded by a number of probes,
 * each one round trip, never by a clock.
 */
export async function untilBlockedOnLock(db: TestDb, fragment: string, o: { orSettled?: Promise<unknown>; maxProbes?: number } = {}): Promise<void> {
  let settled = false;
  o.orSettled?.then(() => { settled = true; }, () => { settled = true; });
  const maxProbes = o.maxProbes ?? 5_000;
  for (let probe = 0; probe < maxProbes; probe++) {
    if (settled) return;
    const [row] = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND position($1 in query) > 0`,
      [fragment],
    );
    if (row!.n > 0) return;
  }
  throw new Error(`no backend waited on a lock for a query containing ${JSON.stringify(fragment)} after ${maxProbes} probes`);
}
