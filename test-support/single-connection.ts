// One-connection pool for the AD-SYS-4 rule 9 proofs (test review MEDIUM-3, decision log Impl-2 #8).
// A use case that runs inside a transaction must read its neighbours on the ambient connection. On
// a plain pool of one, a second checkout waits forever, so each proof used to race the work against
// a watchdog timer. This pool refuses a second concurrent checkout at once instead: the proof fails
// deterministically, with the same message, and no clock is involved.
import pg from 'pg';
import type { TestDb } from './db.js';
import { PG } from './env.js';

export const SECOND_CONNECTION = 'deadlock: a second connection was requested';

type ConnectCallback = (error: Error | undefined, client?: pg.PoolClient, done?: (release?: Error | boolean) => void) => void;

/** A pool of one connection on the test database that throws on a second concurrent checkout. */
export function singleConnectionPool(db: TestDb): pg.Pool {
  const pool = new pg.Pool({ ...PG, database: (db.pool.options as { database: string }).database, max: 1 });
  const checkout = pool.connect.bind(pool) as () => Promise<pg.PoolClient>;
  let held = false;
  const acquire = async (): Promise<pg.PoolClient> => {
    if (held) throw new Error(SECOND_CONNECTION);
    held = true;
    try {
      const client = await checkout();
      const release = client.release.bind(client);
      client.release = (error?: Error | boolean) => {
        held = false;
        client.release = release;
        return release(error);
      };
      return client;
    } catch (error) {
      held = false;
      throw error;
    }
  };
  // pg-pool's own `query` calls `connect(callback)`, so both forms are guarded.
  pool.connect = ((callback?: ConnectCallback) => {
    if (!callback) return acquire();
    acquire().then((client) => callback(undefined, client, client.release), (error: Error) => callback(error));
    return undefined;
  }) as typeof pool.connect;
  return pool;
}
