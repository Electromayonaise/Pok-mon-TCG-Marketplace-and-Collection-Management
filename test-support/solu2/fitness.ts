// Static fitness functions for the Solu-2 SYS proofs (docs/solu-2/test/fitness/). Pure scanners:
// they read source text and return findings; every expect() stays in the test body. Each one is
// proven against a planted violation in the same test file, so a pass is never vacuous.
import fs from 'node:fs';
import path from 'node:path';

export type ModuleName = 'identity' | 'catalog' | 'listings' | 'orders' | 'commission' | 'trading' | 'messaging' | 'collections' | 'reviews';

/** AD-1's compile-time edges (ports-and-adapters.md §4). `catalog` and `identity` depend on no module. */
export const AD1_EDGES: Readonly<Record<ModuleName, readonly ModuleName[]>> = {
  identity: [],
  catalog: [],
  listings: ['identity', 'catalog'],
  orders: ['listings', 'identity'],
  commission: ['identity'],
  trading: ['listings'],
  messaging: ['identity'],
  collections: ['catalog', 'listings'],
  reviews: ['orders', 'identity'],
};
const MODULES = Object.keys(AD1_EDGES) as ModuleName[];

/** Every `.ts` file under `dir`, as forward-slash paths relative to the repo root. */
export function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.posix.join(dir.replace(/\\/g, '/'), e.name);
    if (e.isDirectory()) out.push(...tsFiles(p));
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

const SPEC = /(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s+'([^']+)'/g;

/** The import edges of one file that leave its module: `{ from, to, spec }`, plus a deep-import flag. */
export function crossModuleImports(file: string, text: string): { from: string; to: string; spec: string; deep: boolean }[] {
  const from = /^src\/(?:modules\/)?([\w-]+)\//.exec(file)?.[1] ?? '';
  const out: { from: string; to: string; spec: string; deep: boolean }[] = [];
  for (const m of text.matchAll(SPEC)) {
    const spec = m[1]!;
    if (!spec.startsWith('.')) continue;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
    const to = /^src\/modules\/([\w-]+)\//.exec(resolved)?.[1];
    if (!to || to === from) continue;
    out.push({ from, to, spec, deep: !/^src\/modules\/[\w-]+\/index\.js$/.test(resolved) });
  }
  return out;
}

/** AD-1 violations among `files`: an edge outside AD1_EDGES, or an import that bypasses `index.ts`. */
export function importViolations(files: { file: string; text: string }[]): string[] {
  const problems: string[] = [];
  for (const { file, text } of files) {
    for (const e of crossModuleImports(file, text)) {
      const allowed = e.from === 'server' || (MODULES.includes(e.from as ModuleName) && AD1_EDGES[e.from as ModuleName].includes(e.to as ModuleName));
      if (!allowed) problems.push(`${file}: ${e.from} → ${e.to} is not an AD-1 edge ('${e.spec}')`);
      else if (e.deep) problems.push(`${file}: imports ${e.to} past its index.ts ('${e.spec}')`);
    }
  }
  return problems;
}

/** Table → owning code module, from the section headers of the SQL-first schema (AD-8, R-2). */
export function tableOwners(schemaSql: string): Map<string, string> {
  const owners = new Map<string, string>();
  let owner = '';
  for (const line of schemaSql.split(/\r?\n/)) {
    const h = /^-- (shared-kernel|identity|catalog|listings|orders|commission|trading|messaging|collections|reviews)\b/.exec(line);
    if (h) owner = h[1]!;
    const t = /^CREATE TABLE IF NOT EXISTS "?(\w+)"?/.exec(line);
    if (t && owner) owners.set(t[1]!, owner);
  }
  return owners;
}

/** Tables a source text writes with INSERT, UPDATE, DELETE or TRUNCATE inside a string literal. */
export function sqlWrites(text: string): string[] {
  const out: string[] = [];
  for (const lit of text.matchAll(/`[^`]*`|'(?:[^'\\\n]|\\.)*'/g)) {
    for (const m of lit[0].matchAll(/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+"?(\w+)"?/gi)) out.push(m[1]!);
  }
  return out;
}

/** AD-8 violations: a write to a table owned by another module (or to an unknown table). */
export function ownershipViolations(files: { file: string; text: string }[], owners: Map<string, string>): string[] {
  const problems: string[] = [];
  for (const { file, text } of files) {
    const writer = /^src\/(?:modules\/)?([\w-]+)\//.exec(file)?.[1] ?? '';
    for (const table of sqlWrites(text)) {
      const owner = owners.get(table);
      if (!owner) problems.push(`${file}: writes unknown table ${table}`);
      else if (owner !== writer) problems.push(`${file}: ${writer} writes ${table}, owned by ${owner}`);
    }
  }
  return problems;
}

/** AD-SYS-6 rules 1–2: wall-clock reads in code or SQL text. Comments are stripped first. */
export function wallClockReads(text: string): string[] {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const found: string[] = [];
  // A bare `now()` is SQL's; `clock.now()` and the port's own `now(): Date` declaration are allowed.
  for (const re of [/\bDate\.now\s*\(/g, /\bnew Date\s*\(\s*\)/g, /\bperformance\.now\s*\(/g, /\bprocess\.hrtime\b/g, /(?<![.\w])now\s*\(\s*\)(?!\s*:)/gi, /\bCURRENT_(?:TIMESTAMP|DATE|TIME)\b/g, /\bclock_timestamp\s*\(/gi, /\bstatement_timestamp\s*\(/gi]) {
    for (const m of code.matchAll(re)) found.push(m[0]);
  }
  return found;
}

/** Parses the YAML subset scripts/gen-solu2-api.mjs emits (block maps and lists, JSON scalars). */
export function parseGeneratedYaml(text: string): unknown {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trimStart().startsWith('#')).map((l) => ({ indent: l.length - l.trimStart().length, body: l.trim() }));
  let i = 0;
  const scalar = (s: string): unknown => (s === '[]' ? [] : s === '{}' ? {} : JSON.parse(s));
  const KEY = /^("(?:[^"\\]|\\.)*"|[A-Za-z_][\w.-]*):(?: (.*))?$/;
  function block(indent: number): unknown {
    if (lines[i]!.body.startsWith('- ')) {
      const list: unknown[] = [];
      while (i < lines.length && lines[i]!.indent === indent && lines[i]!.body.startsWith('- ')) {
        const rest = lines[i]!.body.slice(2);
        if (KEY.test(rest)) {
          lines[i] = { indent: indent + 2, body: rest };
          list.push(block(indent + 2));
        } else { list.push(scalar(rest)); i++; }
      }
      return list;
    }
    const map: Record<string, unknown> = {};
    while (i < lines.length && lines[i]!.indent === indent && !lines[i]!.body.startsWith('- ')) {
      const m = KEY.exec(lines[i]!.body);
      if (!m) throw new Error(`unparsed YAML line ${i}: ${lines[i]!.body}`);
      const key = m[1]!.startsWith('"') ? (JSON.parse(m[1]!) as string) : m[1]!;
      i++;
      map[key] = m[2] !== undefined ? scalar(m[2]) : block(lines[i]!.indent);
    }
    return map;
  }
  return block(lines[0]!.indent);
}
