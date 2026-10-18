// Sprint readiness audit (Solu-1 Exercise 4.2; decision log #18). Deterministic checks that a
// developer agent can implement the backlog without inventing a decision. Prints the
// IR-PASS / IR-FAIL box and exits 1 on IR-FAIL. Wired into bmad-sprint-planning through
// _bmad/custom/bmad-sprint-planning.toml (activation_steps_prepend).
// Usage: node scripts/readiness-audit.mjs --package docs/solu-1 [--no-tests] [--json <out>]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const pkg = args[args.indexOf('--package') + 1];
const runTests = !args.includes('--no-tests');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

const PACKAGES = {
  'docs/solu-1': {
    contracts: 'docs/solu-1/planning/contracts.md',
    epics: 'docs/solu-1/planning/epics.md',
    schemas: 'docs/solu-1/planning/schemas',
    atdd: 'docs/solu-1/tests/atdd',
    prd: 'docs/plan-2/planning/prd.md',
    dtoRoots: ['src/modules', 'src/server'],
    // C9: neighbour ports each module declares, and the epics whose stories must list them.
    neighbourPorts: [
      { file: 'src/server/trpc/admin-guard.ts', epics: [3] },
      { file: 'src/modules/listings/ports/listings.ts', epics: [4, 5] },
      { file: 'src/modules/orders/ports/ord.ts', epics: [6] },
      { file: 'src/modules/trading/ports/trd.ts', epics: [8] },
      { file: 'src/modules/messaging/ports/msg.ts', epics: [9] },
      { file: 'src/modules/collections/ports/collections.ts', epics: [10, 11] },
      { file: 'src/modules/reviews/ports/rep.ts', epics: [12] },
    ],
    greenProject: 'solu1-schema',
    redProject: 'solu1-atdd',
    redMinimum: 131,
  },
};
const cfg = PACKAGES[pkg];
if (!cfg) {
  console.error(`unknown --package ${pkg}; known: ${Object.keys(PACKAGES).join(', ')}`);
  process.exit(2);
}
// Normalized to LF: Windows checkouts (core.autocrlf) and Windows editors write CRLF.
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const expandFr = (s) => {
  const out = [];
  for (const m of s.matchAll(/(?<![A-Z])FR-([A-Z]+)-(\d+)(?:\.\.(\d+))?/g)) {
    if (m[3]) for (let i = Number(m[2]); i <= Number(m[3]); i++) out.push(`FR-${m[1]}-${i}`);
    else out.push(`FR-${m[1]}-${m[2]}`);
  }
  return out;
};
const AD_RE = /AD-(?:SYS|IDN|VER|CAT|INV|DSC|ORD|COM|TRD|MSG|COL|VAL|REP)-\d+|AD-\d+/g;

// ---------------------------------------------------------------- contracts
const contractLines = read(cfg.contracts).split('\n');
const contracts = new Map(); // name -> { frs:Set, ads:Set }
for (let i = 0; i < contractLines.length; i++) {
  const m = contractLines[i].match(/^#### Function: `(\w+)\(/);
  if (!m) continue;
  const c = { frs: new Set(), ads: new Set() };
  contracts.set(m[1], c);
  let j = i + 1;
  for (; j < contractLines.length && !contractLines[j].startsWith('- **Precondition'); j++) {
    if (contractLines[j].startsWith('*')) expandFr(contractLines[j]).forEach((f) => c.frs.add(f));
  }
  let inInvariant = false;
  for (; j < contractLines.length && !/^#{2,4} /.test(contractLines[j]); j++) {
    const l = contractLines[j];
    if (l.startsWith('- **Invariant')) inInvariant = true;
    else if (l.startsWith('- **') || l.startsWith('>')) inInvariant = false;
    if (inInvariant) for (const a of l.matchAll(AD_RE)) c.ads.add(a[0]);
  }
}

// ---------------------------------------------------------------- epics and stories
const epicLines = read(cfg.epics).split('\n');
const epics = [];
const stories = [];
let story = null;
for (const l of epicLines) {
  const e = l.match(/^## Epic (\d+): (.+)$/);
  if (e) {
    epics.push({ n: Number(e[1]), title: e[2] });
    story = null;
    continue;
  }
  const s = l.match(/^### Story (\d+)\.(\d+): (.+)$/);
  if (s) {
    story = { id: `${s[1]}.${s[2]}`, epic: Number(s[1]), title: s[3], fields: {}, body: [] };
    stories.push(story);
    continue;
  }
  if (!story) continue;
  story.body.push(l);
  const f = l.match(/^- \*\*(Description|Contract Reference|Target DTO|Database Tables|ATDD Test File|Traceability|Depends on|Consumed ports|Acceptance Criteria \(Given-When-Then\)):\*\*\s*(.*)$/);
  if (f) story.fields[f[1]] = f[2];
}

// ---------------------------------------------------------------- lookups
const prdFrs = new Set([...read(cfg.prd).matchAll(/\*\*(FR-[A-Z]+-\d+) —/g)].map((m) => m[1]));
const sqlFiles = fs.readdirSync(cfg.schemas).filter((f) => f.endsWith('.sql')).map((f) => read(path.join(cfg.schemas, f)));
const tableDdl = new Map();
for (const sql of sqlFiles) {
  for (const m of sql.matchAll(/CREATE TABLE IF NOT EXISTS "(\w+)" \(([\s\S]*?)\n\);/g)) tableDdl.set(m[1], m[2]);
}
const dtoSource = cfg.dtoRoots.flatMap(walk).filter((f) => f.endsWith('.ts')).map(read).join('\n');
const exported = new Set([...dtoSource.matchAll(/export (?:interface|type) (\w+)/g)].map((m) => m[1]));

// ---------------------------------------------------------------- checks
const failures = [];
const fail = (check, msg) => failures.push(`[${check}] ${msg}`);
const REQUIRED = ['Description', 'Contract Reference', 'Target DTO', 'Database Tables', 'ATDD Test File', 'Traceability', 'Depends on', 'Acceptance Criteria (Given-When-Then)'];
const covered = new Set();
const boundFrs = new Set([...contracts.values()].flatMap((c) => [...c.frs]));
const boundAds = new Set([...contracts.values()].flatMap((c) => [...c.ads]));
const tracedFrs = new Set();
const enforcedAds = new Set();
const seen = new Set();

for (const s of stories) {
  for (const f of REQUIRED) if (!(f in s.fields)) fail('C1 story completeness', `Story ${s.id} lacks "${f}"`);
  const body = s.body.join('\n');
  if (!/\*\*Given:\*\*/.test(body) || !/\*\*When:\*\*/.test(body) || !/\*\*Then:\*\*/.test(body)) fail('C1 story completeness', `Story ${s.id} lacks a Given/When/Then`);
  if (!/\*\*(Failure|Missing data|Mandatory edge case|Rerun|Trigger rule|Failure-recovery)[^*]*— Given:\*\*/.test(body)) fail('C1 story completeness', `Story ${s.id} lacks a failure, missing-data or edge-case criterion`);

  const ref = s.fields['Contract Reference'] ?? '';
  const names = [...ref.matchAll(/`(\w+)`/g)].map((m) => m[1]);
  if (names.length === 0) fail('C2 contract binding', `Story ${s.id} names no contract`);
  const storyAds = new Set(ref.match(AD_RE) ?? []);
  for (const n of names) {
    const c = contracts.get(n);
    if (!c) {
      fail('C2 contract binding', `Story ${s.id} references unknown contract ${n}`);
      continue;
    }
    covered.add(n);
    for (const a of c.ads) if (!storyAds.has(a)) fail('C4 invariant binding', `Story ${s.id} omits ${a}, which ${n} binds`);
    const tr = new Set(expandFr(s.fields['Traceability'] ?? ''));
    for (const f of c.frs) if (!tr.has(f)) fail('C5 FR traceability', `Story ${s.id} omits ${f}, which ${n} binds`);
  }
  storyAds.forEach((a) => enforcedAds.add(a));
  for (const f of expandFr(s.fields['Traceability'] ?? '')) {
    if (!prdFrs.has(f)) fail('C5 FR traceability', `Story ${s.id} traces ${f}, which the PRD does not define`);
    tracedFrs.add(f);
  }

  for (const d of [...(s.fields['Target DTO'] ?? '').matchAll(/`(\w+)`/g)].map((m) => m[1])) {
    if (!exported.has(d)) fail('C3 schema/DTO binding', `Story ${s.id} names DTO ${d}, which no src file exports`);
  }
  const tables = s.fields['Database Tables'] ?? '';
  for (const m of tables.matchAll(/`"(\w+)"(?:\.(?:"(\w+)"|(\w+)))?`/g)) {
    const ddl = tableDdl.get(m[1]);
    const col = m[2] ?? m[3];
    if (!ddl) fail('C3 schema/DTO binding', `Story ${s.id} names table "${m[1]}", which no migration creates`);
    else if (col && !new RegExp(`^\\s+"?${col}"?\\s`, 'm').test(ddl)) fail('C3 schema/DTO binding', `Story ${s.id} names column "${m[1]}".${col}, which the table lacks`);
  }

  const atdd = (s.fields['ATDD Test File'] ?? '').match(/`([^`]+)`/)?.[1];
  if (!atdd || !fs.existsSync(atdd)) fail('C6 ATDD link', `Story ${s.id} points at a missing ATDD file ${atdd}`);
  else for (const n of names) if (!read(atdd).includes(`— ${n} (`)) fail('C6 ATDD link', `Story ${s.id}: ${atdd} has no describe block for ${n}`);

  for (const d of (s.fields['Depends on'] ?? '').matchAll(/Story (\d+\.\d+)/g)) {
    if (!seen.has(d[1])) fail('C7 dependency order', `Story ${s.id} depends on Story ${d[1]}, which is not earlier`);
  }
  seen.add(s.id);
}
for (const n of contracts.keys()) if (!covered.has(n)) fail('C2 contract binding', `Contract ${n} has no story`);

// C9 consumed ports (review F-4): every neighbour port a module declares is listed by one of its
// stories, and every listing names an earlier providing story or a referenced fake.
const consumedByEpic = new Map();
const order = stories.map((s) => s.id);
for (const s of stories) {
  const line = s.fields['Consumed ports'];
  if (line === undefined) continue;
  const entries = [...line.matchAll(/`(\w+\.\w+)` → (?:Story (\d+\.\d+)|faked; provider outside Solu-1 \(([^)]+)\))/g)];
  if (entries.length === 0) fail('C9 consumed ports', `Story ${s.id} has a Consumed ports line with no parseable entry`);
  for (const [, port, provider, ref] of entries) {
    if (!consumedByEpic.has(s.epic)) consumedByEpic.set(s.epic, new Set());
    consumedByEpic.get(s.epic).add(port);
    if (provider && !(order.includes(provider) && order.indexOf(provider) < order.indexOf(s.id))) {
      fail('C9 consumed ports', `Story ${s.id} consumes ${port} from Story ${provider}, which is not an earlier story`);
    }
    for (const fr of ref ? expandFr(ref) : []) if (!prdFrs.has(fr)) fail('C9 consumed ports', `Story ${s.id} cites ${fr} for ${port}, which the PRD does not define`);
  }
}
for (const np of cfg.neighbourPorts) {
  const src = read(np.file);
  for (const m of src.matchAll(/export interface (\w+) \{([\s\S]*?)\n\}/g)) {
    const owner = m[1].match(/^(Identity|Catalog|Listings|Orders)(?:For\w+|AdminGuard)$/)?.[1];
    if (!owner) continue;
    for (const method of m[2].matchAll(/^\s+(\w+)\(/gm)) {
      const port = `${owner.toLowerCase()}.${method[1]}`;
      if (!np.epics.some((e) => consumedByEpic.get(e)?.has(port))) {
        fail('C9 consumed ports', `${np.file} declares ${port}, but no story of epic ${np.epics.join('/')} lists it`);
      }
    }
  }
}

// C10 error-code citations (review F-10): every `Code` (HTTP n, owner) matches the registry.
const codeCheck = spawnSync('node', ['scripts/check-code-citations.mjs', cfg.contracts, cfg.epics], { encoding: 'utf8', shell: true });
const codeLine = (codeCheck.stdout.trim().split('\n').pop() ?? '').trim();
if (codeCheck.status !== 0) fail('C10 code citations', codeCheck.stdout.trim().split('\n').slice(0, 3).join(' | '));
for (const f of boundFrs) if (!tracedFrs.has(f)) fail('C5 FR traceability', `${f} (bound by a contract) reaches no story`);
for (const a of boundAds) if (!enforcedAds.has(a)) fail('C4 invariant binding', `${a} (bound by a contract) appears in no story`);

let green = 'skipped (--no-tests)';
let red = 'skipped (--no-tests)';
if (runTests) {
  const g = spawnSync('npx', ['vitest', 'run', '--project', cfg.greenProject], { encoding: 'utf8', shell: true });
  const gLine = (g.stdout.match(/Tests\s+(.+)/) ?? [])[1] ?? 'no result';
  green = gLine.trim();
  if (g.status !== 0) fail('C8 executable gates', `GREEN schema suite failed: ${green}`);
  const r = spawnSync('node', ['scripts/check-atdd-red.mjs', cfg.redProject, String(cfg.redMinimum)], { encoding: 'utf8', shell: true });
  red = (r.stdout.split('\n')[0] ?? '').trim();
  if (r.status !== 0) fail('C8 executable gates', `ATDD red check failed: ${r.stdout.trim().split('\n').slice(0, 4).join(' | ')}`);
}

// ---------------------------------------------------------------- report
const pass = failures.length === 0;
const pct = (a, b) => (b === 0 ? '100%' : `${Math.round((100 * a) / b)}%`);
const frOk = [...boundFrs].filter((f) => tracedFrs.has(f)).length;
const adOk = [...boundAds].filter((a) => enforcedAds.has(a)).length;
const W = 104;
const row = (t) => `| ${t.padEnd(W - 4)} |`;
const lines = [
  `+${'-'.repeat(W - 2)}+`,
  row('SPRINT READINESS AUDIT RESULT'),
  `+${'-'.repeat(W - 2)}+`,
  row(`Package: ${pkg}   Epics: ${epics.length}   Stories: ${stories.length}   Contracts: ${contracts.size}`),
  row(pass ? 'Status: IR-PASS (Autonomous Green Light)' : `Status: IR-FAIL (${failures.length} blocking finding${failures.length === 1 ? '' : 's'})`),
  row(`Cross-Document Traceability: ${pct(frOk, boundFrs.size)} (${frOk}/${boundFrs.size} contract-bound FRs -> stories -> AD -> DTOs/Tables)`),
  row(`Contract Coverage: ${pct(covered.size, contracts.size)} (${covered.size}/${contracts.size} contracts bound to a story and an ATDD block)`),
  row(`Invariant Enforceability: ${pct(adOk, boundAds.size)} (${adOk}/${boundAds.size} ADs bound to a story, a contract and a red test)`),
  row(`Consumed ports: ${[...consumedByEpic.values()].reduce((n, s) => n + s.size, 0)} listed, each backed by an earlier story or a referenced fake`),
  row(`Error-code citations: ${codeLine}`.slice(0, W - 4)),
  row(`GREEN schema suite: ${green}`.slice(0, W - 4)),
  row(`ATDD: ${red}`.slice(0, W - 4)),
  row(pass ? 'Action: Sprint tracking file may be generated. System ready for implementation.' : 'Action: HALT. Do not generate sprint-status.yaml; fix the findings below.'),
  `+${'-'.repeat(W - 2)}+`,
];
console.log(lines.join('\n'));
for (const f of failures) console.log(`  ✗ ${f}`);
if (pass) console.log(`  Invariants bound: ${[...boundAds].sort().join(', ')}`);
if (jsonOut) {
  fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
  fs.writeFileSync(jsonOut, JSON.stringify({ package: pkg, status: pass ? 'IR-PASS' : 'IR-FAIL', epics: epics.length, stories: stories.length, contracts: contracts.size, frs: { bound: boundFrs.size, traced: frOk }, ads: { bound: boundAds.size, enforced: adOk }, green, red, failures }, null, 2));
}
process.exit(pass ? 0 : 1);
