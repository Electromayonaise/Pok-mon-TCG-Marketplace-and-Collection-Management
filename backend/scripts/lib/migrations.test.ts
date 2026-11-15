import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { appliedComment, migrationFiles, migrationState, parseApplied } from './migrations.mjs';

let dir = '';
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

function folder(files: Record<string, string>): string {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tezg-mig-'));
  for (const [name, sql] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), sql);
  return dir;
}

describe('migrations', () => {
  it('lists only .sql files in name order', () => {
    const files = migrationFiles(folder({ '002_b.sql': 'b', 'README.md': 'x', '001_a.sql': 'a' }));
    expect(files.map((f) => f.name)).toEqual(['001_a.sql', '002_b.sql']);
  });

  it('hashes CRLF and LF checkouts of the same file alike', () => {
    const [crlf] = migrationFiles(folder({ '001_a.sql': 'SELECT 1;\r\nSELECT 2;\r\n' }));
    fs.rmSync(dir, { recursive: true, force: true });
    const [lf] = migrationFiles(folder({ '001_a.sql': 'SELECT 1;\nSELECT 2;\n' }));
    expect(crlf!.sha256).toBe(lf!.sha256);
  });

  it('round-trips the applied list through the database comment, and reads any other comment as none applied', () => {
    const applied = [{ name: '001_a.sql', sha256: 'f'.repeat(64) }];
    expect(parseApplied(appliedComment(applied))).toEqual(applied);
    expect(parseApplied(null)).toEqual([]);
    expect(parseApplied('a template fingerprint')).toEqual([]);
    expect(parseApplied('{"other":1}')).toEqual([]);
  });

  it('separates pending, edited and unknown migrations', () => {
    const files = migrationFiles(folder({ '001_a.sql': 'a', '002_b.sql': 'b', '003_c.sql': 'c' }));
    const state = migrationState(files, [
      { name: '001_a.sql', sha256: files[0]!.sha256 },
      { name: '002_b.sql', sha256: 'changed' },
      { name: '000_gone.sql', sha256: 'x' },
    ]);
    expect([state.pending.map((f) => f.name), state.edited, state.unknown]).toEqual([['003_c.sql'], ['002_b.sql'], ['000_gone.sql']]);
  });
});
