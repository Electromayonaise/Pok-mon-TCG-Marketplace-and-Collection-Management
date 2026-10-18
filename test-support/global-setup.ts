// Global setup: migrate one template database per project from its migration folder.
// Every test file then clones the template (test-support/db.ts), so migrations run once.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { PG } from './env.js';

export default async function setup(project: TestProject): Promise<void> {
  const migrationsDir = project.config.provide.migrationsDir as string;
  const templateDb = project.config.provide.templateDb as string;

  const admin = new pg.Client({ ...PG, database: PG.adminDatabase });
  await admin.connect();
  try {
    // Concurrent projects may race to build the same template; serialize on an advisory lock.
    await admin.query('SELECT pg_advisory_lock(hashtext($1))', [templateDb]);
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [templateDb]);
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    const fingerprint = files.map((f) => `${f}:${fs.statSync(path.join(migrationsDir, f)).mtimeMs}`).join('|');
    const marker = await admin.query(
      `SELECT description FROM pg_shdescription d JOIN pg_database db ON db.oid = d.objoid WHERE db.datname = $1`,
      [templateDb],
    );
    if (exists.rowCount === 1 && marker.rows[0]?.description === fingerprint) return;

    if (exists.rowCount === 1) {
      await admin.query(`ALTER DATABASE "${templateDb}" WITH IS_TEMPLATE false`);
      await admin.query(`DROP DATABASE "${templateDb}" WITH (FORCE)`);
    }
    await admin.query(`CREATE DATABASE "${templateDb}"`);
    const tpl = new pg.Client({ ...PG, database: templateDb });
    await tpl.connect();
    try {
      for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        try {
          await tpl.query(sql);
        } catch (error) {
          throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
        }
      }
    } finally {
      await tpl.end();
    }
    await admin.query(`COMMENT ON DATABASE "${templateDb}" IS ${pg.escapeLiteral(fingerprint)}`);
    await admin.query(`ALTER DATABASE "${templateDb}" WITH IS_TEMPLATE true`);
  } finally {
    await admin.query('SELECT pg_advisory_unlock(hashtext($1))', [templateDb]).catch(() => undefined);
    await admin.end();
  }
}
