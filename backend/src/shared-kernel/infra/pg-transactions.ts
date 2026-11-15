// Production binding of the TransactionRunner port (AD-SYS-4): BEGIN … COMMIT on one pooled
// connection. The work runs inside `withAmbientTx` (rule 9), so a neighbour query called from it
// joins the open transaction instead of taking a second connection.
import type pg from 'pg';
import { withAmbientTx } from '../db.js';
import type { QueryResult, Sql, TransactionRunner, Tx } from '../ports.js';

/** A pg pool or pooled client as the `Sql` port. */
export function pgSql(client: pg.Pool | pg.PoolClient): Sql {
  return {
    async query<Row>(text: string, params?: readonly unknown[]): Promise<QueryResult<Row>> {
      const r = await client.query(text, params as unknown[] | undefined);
      return { rows: r.rows as Row[], rowCount: r.rowCount ?? 0 };
    },
  };
}

export class PgTransactionRunner implements TransactionRunner {
  constructor(private readonly pool: pg.Pool) {}

  async run<T>(work: (tx: Tx) => Promise<T>, options?: { isolation?: 'READ COMMITTED' | 'REPEATABLE READ'; readOnly?: boolean }): Promise<T> {
    const client = await this.pool.connect();
    try {
      const mode = `ISOLATION LEVEL ${options?.isolation ?? 'READ COMMITTED'}${options?.readOnly ? ' READ ONLY' : ''}`;
      await client.query(`BEGIN ${mode}`);
      const tx: Tx = { ...pgSql(client), isTransaction: true };
      const result = await withAmbientTx(tx, () => work(tx));
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
