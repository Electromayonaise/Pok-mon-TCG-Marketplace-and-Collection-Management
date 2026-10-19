// Test-id coverage gate (Solu-2 Phase 3). Every test id that contracts.md cites — in a clause,
// the §14 binding table, the §15 supporting contracts or the offered-port table — must be the
// bracketed id of exactly one test under docs/solu-2/test/, and every core operation must have
// at least one test. An id defined twice is ambiguous evidence and fails too.
// Usage: node scripts/check-test-ids.mjs [contracts.md] [test dir]
import fs from 'node:fs';
import path from 'node:path';

const contractsFile = process.argv[2] ?? 'docs/solu-2/planning/detailed-design/contracts.md';
const testDir = process.argv[3] ?? 'docs/solu-2/test';
const ID = /\[((?:S-FR-[A-Z]+-\d+|S-SYS|P-[A-Z]+|SYS|IDN|VER|CAT|DSC|INV|ORD|COM|TRD|MSG|COL|VAL|REP)[A-Za-z0-9.-]*)\]/g;

const contracts = fs.readFileSync(contractsFile, 'utf8');
const cited = new Set([...contracts.matchAll(ID)].map((m) => m[1]));
const core = [...contracts.matchAll(/^\*(IDN|VER|CAT|DSC|INV|ORD|COM|TRD|MSG|COL|VAL|REP)-(\d+) · /gm)].map((m) => `${m[1]}-${m[2]}`);

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : e.name.endsWith('.test.ts') ? [p] : [];
  });
}
const defined = new Map();
for (const file of files(testDir)) {
  // A title may open with several ids, e.g. it('[ORD-3.MEC] [ORD-3.I3] …'), in either quote style.
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/\bit(?:\.\w+)?\(\s*['"`]((?:\[[^\]]+\]\s*)+)/g)) {
    for (const i of m[1].matchAll(/\[([^\]]+)\]/g)) {
      defined.set(i[1], [...(defined.get(i[1]) ?? []), path.relative(testDir, file).replace(/\\/g, '/')]);
    }
  }
}

const missing = [...cited].filter((c) => !defined.has(c)).sort();
const duplicated = [...defined].filter(([, where]) => where.length > 1).map(([i, where]) => `${i} (${where.join(', ')})`);
const untested = [...new Set(core)].filter((op) => ![...defined.keys()].some((d) => d === op || d.startsWith(`${op}.`)));

console.log(`${cited.size} test ids cited by ${path.basename(contractsFile)}; ${defined.size} defined under ${testDir}; ${new Set(core).size} core operations`);
for (const m of missing) console.log(`  ✗ cited but not defined: [${m}]`);
for (const d of duplicated) console.log(`  ✗ defined more than once: [${d}]`);
for (const u of untested) console.log(`  ✗ core operation without a test: ${u}`);
process.exit(missing.length || duplicated.length || untested.length ? 1 : 0);
