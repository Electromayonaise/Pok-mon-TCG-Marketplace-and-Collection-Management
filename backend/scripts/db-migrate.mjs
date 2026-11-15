// Applies the pending migrations to the app database named by DATABASE_URL, creating the
// database first if it does not exist. Idempotent: a second run applies nothing. Refuses to run
// when an applied migration was edited or removed, because the database would no longer match
// the files. Each file runs in its own transaction, together with the comment that records it.
// `--reset` drops the database first, for a development database whose migrations changed.
// Usage: node --env-file-if-exists=.env scripts/db-migrate.mjs [--reset]
import path from 'node:path';
import pg from 'pg';
import { MIGRATIONS_DIR, READ_COMMENT_SQL, appliedComment, migrationFiles, migrationState, parseApplied } from './lib/migrations.mjs';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (copy .env.example to .env)');
  process.exit(1);
}
const target = new URL(url);
const database = decodeURIComponent(target.pathname.slice(1));
const reset = process.argv.includes('--reset');

const maintenance = new URL(url);
maintenance.pathname = '/postgres';
const admin = new pg.Client({ connectionString: maintenance.toString() });
await admin.connect();
try {
  if (reset) {
    await admin.query(`DROP DATABASE IF EXISTS ${pg.escapeIdentifier(database)} WITH (FORCE)`);
    console.log(`dropped database ${database}`);
  }
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${pg.escapeIdentifier(database)}`);
    console.log(`created database ${database}`);
  }
} finally {
  await admin.end();
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query('SELECT pg_advisory_lock(hashtext($1))', ['tezg:migrate']);
  const applied = parseApplied((await client.query(READ_COMMENT_SQL)).rows[0]?.comment);
  const files = migrationFiles(path.resolve(MIGRATIONS_DIR));
  const state = migrationState(files, applied);
  if (state.edited.length || state.unknown.length) {
    console.error(`refusing to migrate ${database}: edited after apply [${state.edited.join(', ')}], missing [${state.unknown.join(', ')}]. Recreate the database (npm run db:reset).`);
    process.exit(1);
  }
  const done = [...applied];
  for (const file of state.pending) {
    await client.query('BEGIN');
    try {
      await client.query(file.sql);
      done.push(file);
      await client.query(`COMMENT ON DATABASE ${pg.escapeIdentifier(database)} IS ${pg.escapeLiteral(appliedComment(done))}`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`migration ${file.name} failed: ${error.message}`);
      process.exit(1);
    }
    console.log(`applied ${file.name}`);
  }
  console.log(`${database}: ${done.length} migrations applied, ${state.pending.length} new`);
} finally {
  await client.end();
}
