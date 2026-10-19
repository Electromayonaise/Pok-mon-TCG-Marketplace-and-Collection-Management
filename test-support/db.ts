// `db` fixture: one ephemeral PostgreSQL database per test file, cloned from the migrated
// template, truncated before every test (isolation, test-quality.md example 2).
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, inject } from 'vitest';
import type { QueryResult, Sql, TransactionRunner, Tx } from '../src/shared-kernel/ports.js';
import { PG } from './env.js';

// Migration seed rows (for example the A-24 commission rate) must survive every truncate. They
// are read from the freshly cloned template, whatever its schema, so one harness serves the
// Solu-1 migrations and the Solu-2 schema alike.
interface SeedRows { table: string; columns: string[]; rows: unknown[][] }

let fileCounter = 0;

export interface TestDb {
  /** Pooled client (max 60 connections: the ≥ 50-way concurrency proofs need real connections). */
  pool: pg.Pool;
  /** The pool as the `Sql` port. */
  sql: Sql;
  transactions: TransactionRunner;
  /** One-off query helper for Given/Then steps. */
  query<Row = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<Row[]>;
  /** Number of rows in each table, for "zero mutations" assertions. */
  counts(tables: readonly string[]): Promise<Record<string, number>>;
}

function asSql(client: pg.Pool | pg.PoolClient): Sql {
  return {
    async query<Row>(text: string, params?: readonly unknown[]): Promise<QueryResult<Row>> {
      const r = await client.query(text, params as unknown[] | undefined);
      return { rows: r.rows as Row[], rowCount: r.rowCount ?? 0 };
    },
  };
}

/** Test binding of the TransactionRunner port: BEGIN … COMMIT on one pooled connection. */
class PgTransactionRunner implements TransactionRunner {
  constructor(private readonly pool: pg.Pool) {}
  async run<T>(work: (tx: Tx) => Promise<T>, options?: { isolation?: 'READ COMMITTED' | 'REPEATABLE READ'; readOnly?: boolean }): Promise<T> {
    const client = await this.pool.connect();
    try {
      const mode = `ISOLATION LEVEL ${options?.isolation ?? 'READ COMMITTED'}${options?.readOnly ? ' READ ONLY' : ''}`;
      await client.query(`BEGIN ${mode}`);
      const tx: Tx = { ...asSql(client), isTransaction: true };
      const result = await work(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

/** Registers the per-file database lifecycle and returns its handle (populated in beforeAll). */
export function useTestDatabase(): TestDb {
  const template = inject('templateDb');
  const name = `tezg_t_${process.pid}_${process.env.VITEST_POOL_ID ?? '0'}_${++fileCounter}`;
  const handle = {} as TestDb;
  let tables: string[] = [];

  beforeAll(async () => {
    const admin = new pg.Client({ ...PG, database: PG.adminDatabase });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${name}" TEMPLATE "${template}"`);
    await admin.end();

    const pool = new pg.Pool({ ...PG, database: name, max: 60 });
    handle.pool = pool;
    handle.sql = asSql(pool);
    handle.transactions = new PgTransactionRunner(pool);
    handle.query = async (text, params) => (await pool.query(text, params as unknown[] | undefined)).rows;
    handle.counts = async (names) => {
      const out: Record<string, number> = {};
      for (const t of names) out[t] = Number((await pool.query(`SELECT count(*)::int AS n FROM "${t}"`)).rows[0].n);
      return out;
    };
    tables = (await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)).rows.map((r) => r.tablename as string);
    for (const table of tables) {
      const r = await pool.query({ text: `SELECT * FROM "${table}"`, rowMode: 'array' });
      if (r.rows.length) seeds.push({ table, columns: r.fields.map((f) => f.name), rows: r.rows });
    }
  });
  const seeds: SeedRows[] = [];

  beforeEach(async () => {
    await handle.pool.query(`TRUNCATE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
    for (const s of seeds) {
      const cols = s.columns.map((c) => `"${c}"`).join(', ');
      for (const row of s.rows) {
        await handle.pool.query(`INSERT INTO "${s.table}" (${cols}) VALUES (${row.map((_, i) => `$${i + 1}`).join(', ')})`, row);
      }
    }
  });

  afterAll(async () => {
    await handle.pool?.end();
    const admin = new pg.Client({ ...PG, database: PG.adminDatabase });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.end();
  });

  return handle;
}
