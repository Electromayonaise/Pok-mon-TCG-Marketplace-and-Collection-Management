// Bounded pools for the connection-budget proofs (AD-SYS-4 rule 9; test review MEDIUM-3, decision log Impl-2 #8;
// architecture audit F1, decision log Impl-2 #34).
// A use case that runs inside a transaction must read its neighbours on the ambient connection, and a job
// needs exactly two connections: one holds `job:<name>`, the other runs the work. On a plain pg pool of N, a
// checkout past N waits forever (`connectionTimeoutMillis: 0`), so each proof used to race the work against
// a watchdog timer. These pools refuse a checkout past their budget at once instead: the proof fails
// deterministically, with the same message, and no clock is involved.
import pg from 'pg';
import type { TestDb } from './db.js';
import { PG } from './env.js';

export const SECOND_CONNECTION = 'deadlock: a second connection was requested';
export const OVER_BUDGET = 'deadlock: a connection past the pool budget was requested';

type ConnectCallback = (error: Error | undefined, client?: pg.PoolClient, done?: (release?: Error | boolean) => void) => void;

/**
 * A pool of `max` connections on the test database that throws on checkout `max + 1` while `max` are held.
 * `peak` reports the most connections held at once.
 */
export function boundedPool(db: TestDb, max: number): pg.Pool & { peak(): number } {
  const pool = new pg.Pool({ ...PG, database: (db.pool.options as { database: string }).database, max });
  const checkout = pool.connect.bind(pool) as () => Promise<pg.PoolClient>;
  let held = 0;
  let peak = 0;
  const acquire = async (): Promise<pg.PoolClient> => {
    if (held >= max) throw new Error(max === 1 ? SECOND_CONNECTION : OVER_BUDGET);
    held += 1;
    peak = Math.max(peak, held);
    try {
      const client = await checkout();
      const release = client.release.bind(client);
      client.release = (error?: Error | boolean) => {
        held -= 1;
        client.release = release;
        return release(error);
      };
      return client;
    } catch (error) {
      held -= 1;
      throw error;
    }
  };
  // pg-pool's own `query` calls `connect(callback)`, so both forms are guarded.
  pool.connect = ((callback?: ConnectCallback) => {
    if (!callback) return acquire();
    acquire().then((client) => callback(undefined, client, client.release), (error: Error) => callback(error));
    return undefined;
  }) as typeof pool.connect;
  return Object.assign(pool, { peak: () => peak });
}

/** A pool of one connection on the test database that throws on a second concurrent checkout. */
export function singleConnectionPool(db: TestDb): pg.Pool {
  return boundedPool(db, 1);
}
