// Readiness against a real database: a clone of the migrated template, whose comment this test
// writes the way scripts/db-migrate.mjs does.
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR, appliedComment, migrationFiles } from '../../scripts/lib/migrations.mjs';
import { useTestDatabase } from '../../test-support/db.js';
import { PG } from '../../test-support/env.js';
import { readiness } from './health.js';

const files = migrationFiles(MIGRATIONS_DIR);

describe('readiness', () => {
  const db = useTestDatabase();

  async function record(applied: { name: string; sha256: string }[]): Promise<void> {
    const [{ name }] = (await db.query<{ name: string }>('SELECT current_database() AS name')) as [{ name: string }];
    await db.query(`COMMENT ON DATABASE "${name}" IS ${pg.escapeLiteral(appliedComment(applied))}`);
  }

  it('is not ready while a migration is pending', async () => {
    await record([]);
    expect(await readiness(db.pool)).toEqual({ ready: false, checks: { database: 'ok', migrations: 'pending' }, pending: files.map((f) => f.name) });
  });

  it('is ready once every migration is recorded with its current hash', async () => {
    await record(files);
    expect(await readiness(db.pool)).toEqual({ ready: true, checks: { database: 'ok', migrations: 'current' }, pending: [] });
  });

  it('is not ready when an applied migration was edited in place', async () => {
    await record(files.map((f, i) => (i === 0 ? { ...f, sha256: '0'.repeat(64) } : f)));
    expect((await readiness(db.pool)).checks.migrations).toBe('edited');
  });

  it('is not ready when the database records a migration that no longer exists', async () => {
    await record([...files, { name: '999_gone.sql', sha256: '0'.repeat(64) }]);
    expect((await readiness(db.pool)).checks.migrations).toBe('unknown');
  });

  it('reports the database unreachable when the query fails', async () => {
    const missing = new pg.Pool({ ...PG, database: 'tezg_no_such_database' });
    try {
      expect(await readiness(missing)).toEqual({ ready: false, checks: { database: 'unreachable', migrations: 'not-checked' }, pending: [] });
    } finally {
      await missing.end();
    }
  });
});
