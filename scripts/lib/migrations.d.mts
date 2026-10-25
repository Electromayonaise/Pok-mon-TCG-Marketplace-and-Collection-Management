// Types for scripts/lib/migrations.mjs, imported by the readiness probe.
export interface MigrationFile { name: string; sha256: string; sql: string }
export interface AppliedMigration { name: string; sha256: string }
export const MIGRATIONS_DIR: string;
export function migrationFiles(dir: string): MigrationFile[];
export function parseApplied(comment: string | null | undefined): AppliedMigration[];
export function appliedComment(applied: readonly AppliedMigration[]): string;
export function migrationState(files: readonly MigrationFile[], applied: readonly AppliedMigration[]): { pending: MigrationFile[]; edited: string[]; unknown: string[] };
export const READ_COMMENT_SQL: string;
