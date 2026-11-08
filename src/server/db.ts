// The app's database handles: one pg pool, shared by the repositories' `Sql` port and by the
// Prisma client that backs Better Auth (decision log #6). Created on first use and kept on
// `globalThis`, so Next's dev reloads do not open a pool per reload.
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { loadConfig } from '../shared-kernel/config.js';

interface Handles { pool: pg.Pool; prisma: PrismaClient }
const cache = globalThis as typeof globalThis & { tezgDb?: Handles };

/**
 * The runtime pool's budget (AD-SYS-4 rules 7 and 9, ARCH §4).
 * - `max`: `TEZG_PG_POOL_MAX`, validated by `loadConfig()` (`PG_POOL_MAX` in shared-kernel/config.ts; decision log
 *   Impl-2 #38). At least 2 (architecture audit F1, decision log Impl-2 #34): a job holds `job:<name>` on one connection
 *   for its whole run while its work runs its transactions on the other. Serverless instances use the default, 2;
 *   long-lived servers (the Docker app in docker-compose.yml, `next start` in the k6 and E2E runs) set 10: one process serves
 *   every request, and 2 connections queue the k6 profile's 200 requests a second past its p95 budget (#38).
 * - `connectionTimeoutMillis: 10_000` (decision log Impl-2 #35): a checkout that waits 10 s fails instead of waiting
 *   forever, so two job runs that each hold one connection on the same instance end as `failed` runs instead of hanging.
 *   Outside that starvation a checkout waits only for the transactions queued ahead of it, each short (a job's work
 *   transaction covers one order, one delivery or one account, and no external call runs inside one; the k6 run's 200
 *   requests a second answer in milliseconds), so 10 s never fails a healthy request. It stays well under the jobs' 50 s
 *   batch bound, so a starved run ends, writes its row and frees its lock long before a healthy run would have ended.
 */
export const RUNTIME_POOL = { connectionTimeoutMillis: 10_000 } as const;

/** A pool with the runtime budget and `max` connections; a test injects a shorter checkout timeout. */
export function runtimePool(connectionString: string, o: { max: number; connectionTimeoutMillis?: number }): pg.Pool {
  return new pg.Pool({ connectionString, ...RUNTIME_POOL, ...o });
}

export function db(): Handles {
  if (!cache.tezgDb) {
    const { databaseUrl, pgPoolMax } = loadConfig();
    const pool = runtimePool(databaseUrl, { max: pgPoolMax });
    cache.tezgDb = { pool, prisma: new PrismaClient({ adapter: new PrismaPg(pool) }) };
  }
  return cache.tezgDb;
}
