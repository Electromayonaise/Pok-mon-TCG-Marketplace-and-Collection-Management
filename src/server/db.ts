// The app's database handles: one pg pool, shared by the repositories' `Sql` port and by the
// Prisma client that backs Better Auth (decision log #6). Created on first use and kept on
// `globalThis`, so Next's dev reloads do not open a pool per reload.
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { loadConfig } from '../shared-kernel/config.js';

interface Handles { pool: pg.Pool; prisma: PrismaClient }
const cache = globalThis as typeof globalThis & { tezgDb?: Handles };

export function db(): Handles {
  if (!cache.tezgDb) {
    // AD-SYS-4 rule 7, ARCH §4 (architecture audit F1, decision log Impl-2 #34): two connections per instance, because
    // a job holds `job:<name>` on one connection for its whole run while its work runs its transactions on the other.
    const pool = new pg.Pool({ connectionString: loadConfig().databaseUrl, max: 2 });
    cache.tezgDb = { pool, prisma: new PrismaClient({ adapter: new PrismaPg(pool) }) };
  }
  return cache.tezgDb;
}
