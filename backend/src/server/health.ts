// Health probes for Compose and for a quick manual check. Liveness answers while the process can
// serve; readiness also needs the database reachable and every migration applied unedited.
import path from 'node:path';
import type pg from 'pg';
import { MIGRATIONS_DIR, READ_COMMENT_SQL, migrationFiles, migrationState, parseApplied } from '../../scripts/lib/migrations.mjs';

export interface Readiness {
  ready: boolean;
  checks: { database: 'ok' | 'unreachable'; migrations: 'current' | 'pending' | 'edited' | 'unknown' | 'not-checked' };
  pending: string[];
}

export async function readiness(pool: pg.Pool, root: string = process.cwd()): Promise<Readiness> {
  let comment: string | null;
  try {
    comment = (await pool.query<{ comment: string | null }>(READ_COMMENT_SQL)).rows[0]?.comment ?? null;
  } catch {
    return { ready: false, checks: { database: 'unreachable', migrations: 'not-checked' }, pending: [] };
  }
  const state = migrationState(migrationFiles(path.join(/*turbopackIgnore: true*/ root, MIGRATIONS_DIR)), parseApplied(comment));
  const migrations = state.edited.length ? 'edited' : state.unknown.length ? 'unknown' : state.pending.length ? 'pending' : 'current';
  return { ready: migrations === 'current', checks: { database: 'ok', migrations }, pending: state.pending.map((f) => f.name) };
}
