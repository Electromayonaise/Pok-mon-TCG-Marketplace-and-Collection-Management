// The app database's migration set: every .sql file of the schema folder (R-8: the DDL is the
// schema source of truth), applied in name order. Applied files are recorded by name and content
// hash in the database's comment, so no bookkeeping table joins the schema or the Prisma model.
// Shared by scripts/db-migrate.mjs (writes) and the readiness probe (reads).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const MIGRATIONS_DIR = 'docs/solu-2/planning/detailed-design/schemas';

/** The migration files under `dir`, in apply order, with their LF-normalized SHA-256. */
export function migrationFiles(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((name) => {
    const sql = fs.readFileSync(path.join(dir, name), 'utf8').replace(/\r\n/g, '\n');
    return { name, sha256: crypto.createHash('sha256').update(sql).digest('hex'), sql };
  });
}

/** The migrations a database comment records; [] for a database never migrated. */
export function parseApplied(comment) {
  if (!comment) return [];
  try {
    const parsed = JSON.parse(comment);
    return Array.isArray(parsed?.tezgMigrations) ? parsed.tezgMigrations : [];
  } catch {
    return [];
  }
}

export function appliedComment(applied) {
  return JSON.stringify({ tezgMigrations: applied.map(({ name, sha256 }) => ({ name, sha256 })) });
}

/**
 * Compares the files with what the database recorded:
 * - `pending`: files never applied, in apply order;
 * - `edited`: applied files whose content changed since (a migration is never edited in place);
 * - `unknown`: recorded files that no longer exist.
 */
export function migrationState(files, applied) {
  const recorded = new Map(applied.map((a) => [a.name, a.sha256]));
  const names = new Set(files.map((f) => f.name));
  return {
    pending: files.filter((f) => !recorded.has(f.name)),
    edited: files.filter((f) => recorded.has(f.name) && recorded.get(f.name) !== f.sha256).map((f) => f.name),
    unknown: applied.filter((a) => !names.has(a.name)).map((a) => a.name),
  };
}

/** The SQL that reads the current database's comment as `comment`. */
export const READ_COMMENT_SQL = `SELECT shobj_description(oid, 'pg_database') AS comment FROM pg_database WHERE datname = current_database()`;
