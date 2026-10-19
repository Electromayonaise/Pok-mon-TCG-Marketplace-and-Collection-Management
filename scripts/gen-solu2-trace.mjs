// Solu-2 traceability matrix (bmad-testarch-trace). Joins the PRD's FRs and NFRs, the contract
// clauses of contracts.md (core operations, §15 supporting contracts, §15.11/§15.12 tables), the
// §14 AD binding table, the risk register of test-design.md, the test ids under docs/solu-2/test
// and, once Phase 4 has written it, the stories of epics.md. Writes test/traceability-matrix.md.
//   --check  fails if the Phase 3 gate does not hold (an FR, AD or P0/P1 risk without a test, a
//            cited id that is not defined) or if the committed matrix is not current.
import fs from 'node:fs';
import path from 'node:path';

const PRD = 'docs/plan-2/planning/prd.md';
const CONTRACTS = 'docs/solu-2/planning/detailed-design/contracts.md';
const DESIGN = 'docs/solu-2/test/test-design.md';
const EVIDENCE = 'docs/solu-2/test/nfr-evidence.md';
const TESTS = 'docs/solu-2/test';
const EPICS = 'docs/solu-2/planning/epics.md';
const STATUS = 'docs/solu-2/implementation-artifacts/sprint-status.yaml';
const OUT = 'docs/solu-2/test/traceability-matrix.md';
const check = process.argv.includes('--check');
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const uniq = (xs) => [...new Set(xs)];
const ADS = (s) => uniq([...s.matchAll(/\bAD-(?:\d+|[A-Z]+-\d+)\b/g)].map((m) => m[0]));
/** FR or NFR ids, expanding ranges such as `FR-DSC-1..6` and `NFR-INV-1..4`. */
const ranged = (re, prefix) => (s) => uniq([...s.matchAll(re)].flatMap((m) => {
  const to = Number(m[3] ?? m[2]);
  return Array.from({ length: to - Number(m[2]) + 1 }, (_, i) => `${prefix}-${m[1]}-${Number(m[2]) + i}`);
}));
const FRS = ranged(/(?<![A-Z-])FR-([A-Z]+)-(\d+)(?:\.\.(\d+))?/g, 'FR');
const NFRS = ranged(/\bNFR-([A-Z]+)-(\d+)(?:\.\.(\d+))?/g, 'NFR');
const IDS = (s) => uniq([...s.matchAll(/\[([A-Z][A-Za-z0-9.-]*\d[A-Za-z0-9.-]*)\]/g)].map((m) => m[1]));

// ------------------------------------------------------------ PRD
const prd = read(PRD);
const frs = [...prd.matchAll(/^\*\*(FR-[A-Z]+-\d+) — ([^*]+?)\.?\*\*(.*)$/gm)].map((m) => ({ id: m[1], title: m[2].trim(), caps: [...m[3].matchAll(/CAP-\d+/g)].map((c) => c[0]) }));
// Two heading styles: `**NFR-SYS-6 Title.**` and `- **NFR-IDN-1:** statement…` (titled by its first clause).
const nfrMap = new Map();
for (const m of prd.matchAll(/\*\*(NFR-[A-Z]+-\d+) ([^*]+?)\.?\*\*/g)) if (!nfrMap.has(m[1])) nfrMap.set(m[1], m[2].trim());
for (const m of prd.matchAll(/\*\*(NFR-[A-Z]+-\d+):\*\* ([^\n]+)/g)) if (!nfrMap.has(m[1])) nfrMap.set(m[1], m[2].replace(/`/g, '').split(/[,;.]\s/)[0].trim().slice(0, 80));
const nfrs = [...nfrMap].map(([id, title]) => ({ id, title }));

// ------------------------------------------------------------ tests
function testFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.posix.join(dir, e.name);
    return e.isDirectory() ? testFiles(p) : e.name.endsWith('.test.ts') ? [p] : [];
  });
}
const tests = new Map(); // id → { file, state }
for (const file of testFiles(TESTS)) {
  const state = /\/(atdd|nfr)\//.test(file) ? 'red' : 'green';
  for (const m of read(file).matchAll(/\bit(?:\.\w+)?\(\s*['"`]((?:\[[^\]]+\]\s*)+)/g)) {
    for (const i of m[1].matchAll(/\[([^\]]+)\]/g)) if (!tests.has(i[1])) tests.set(i[1], { file: path.posix.relative(TESTS, file), state });
  }
}
const testsOf = (unitId) => [...tests.keys()].filter((t) => t === unitId || t.startsWith(`${unitId}.`)).sort();

// ------------------------------------------------------------ contract clauses
const contracts = read(CONTRACTS);
const units = [];
for (const block of contracts.split(/^### Operation: /m).slice(1)) {
  const body = block.split(/^#{2,3} /m)[0];
  const head = /^\*([A-Z]{3}-\d+) · (.*)\*$/m.exec(body);
  if (!head) continue;
  units.push({ id: head[1], kind: 'core', frs: FRS(head[2]), nfrs: NFRS(head[2]), ads: ADS(body), cited: IDS(body) });
}
const supporting = contracts.slice(contracts.indexOf('## 15.'), contracts.indexOf('## 16.'));
for (const block of supporting.split(/^- \*\*(?=S-FR-)/m).slice(1)) {
  const body = block.split(/^(?:- \*\*|#{2,3} )/m)[0];
  const id = /^(S-FR-[A-Z]+-\d+w?)/.exec(body)[1];
  const own = id.replace(/^S-/, '').replace(/w$/, '');
  units.push({ id, kind: 'supporting', frs: uniq([own, ...FRS(body)]), nfrs: NFRS(body), ads: ADS(body), cited: IDS(body) });
}
for (const row of supporting.matchAll(/^\| ((?:S-FR-[A-Z]+-\d+w?|P-[A-Z]+|S-SYS|[A-Z]{3}-\d+)(?:\.[\w-]+)?) \|(.*)$/gm)) {
  const id = row[1];
  const core = /^([A-Z]{3}-\d+)\./.exec(id)?.[1];
  const frsOfId = id.startsWith('S-FR-') ? [id.replace(/^S-(FR-[A-Z]+-\d+).*$/, '$1')] : core ? (units.find((u) => u.id === core)?.frs ?? []) : [];
  units.push({ id, kind: id.startsWith('P-') ? 'port' : 'read model / mirror', frs: uniq([...frsOfId, ...FRS(row[2])]), nfrs: NFRS(row[2]), ads: ADS(row[2]), cited: IDS(row[2]) });
}

// ------------------------------------------------------------ §14 ADs and the risk register
const s14 = contracts.slice(contracts.indexOf('## 14.'), contracts.indexOf('## 15.'));
const adRows = [...s14.matchAll(/^\| ([^|]+) \| ([^|]*AD[^|]*) \| ([^|]+) \| ([^|]+) \|$/gm)]
  .filter((m) => !/^-+$/.test(m[1].trim()) && m[1].trim() !== 'Invariant')
  .map((m) => ({ invariant: m[1].trim(), ad: m[2].trim(), enforcement: m[3].trim(), tests: IDS(m[4]) }));
const risks = [...read(DESIGN).matchAll(/^\| (R-\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| \d \| \d \| \d+ \| (P\d) \| [^|]+ \| ([^|]+) \| ([^|]+) \|$/gm)]
  .map((m) => ({ id: m[1], risk: m[2].trim(), module: m[3].trim(), priority: m[5], tests: IDS(m[6]), level: m[7].trim() }));

// ------------------------------------------------------------ stories (Phase 4) and their status
// A story covers an FR its Traceability line lists, and a test id its ATDD path binds; a risk
// or an AD reaches a story through the story that owns one of its red tests.
const storyOf = new Map(); // FR or test id → [story keys]
const storyStatus = new Map();
if (fs.existsSync(EPICS)) {
  let key = null;
  const add = (k, story) => storyOf.set(k, uniq([...(storyOf.get(k) ?? []), story]));
  for (const line of read(EPICS).split('\n')) {
    const s = /^### Story (\d+)\.(\d+): (.+)$/.exec(line);
    if (s) { key = `${s[1]}.${s[2]}`; continue; }
    if (/^## /.test(line)) { key = null; continue; }
    if (!key) continue;
    const tr = /^- \*\*Traceability:\*\* (.*)$/.exec(line);
    if (tr) for (const f of FRS(tr[1])) add(f, key);
    const at = /^- \*\*ATDD path:\*\* (.*)$/.exec(line);
    if (at) for (const i of at[1].matchAll(/`\[([^\]]+)\]`/g)) add(i[1], key);
  }
  if (fs.existsSync(STATUS)) {
    for (const m of read(STATUS).matchAll(/^\s+(\d+)-(\d+)-[\w-]+:\s*([\w-]+)\s*$/gm)) storyStatus.set(`${m[1]}.${m[2]}`, m[3]);
  }
}
const stories = (...keys) => uniq(keys.flatMap((k) => storyOf.get(k) ?? [])).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const storyCell = (list) => (fs.existsSync(EPICS) ? (list.length ? list.map((k) => `${k}${storyStatus.has(k) ? ` (${storyStatus.get(k)})` : ''}`).join(', ') : '**none**') : 'Phase 4');
const state = (ids) => {
  const s = ids.filter((t) => tests.has(t)).map((t) => tests.get(t).state);
  return s.length ? uniq(s).join(' + ') : '**none**';
};
const short = (ids, n = 4) => (ids.length ? ids.slice(0, n).map((t) => `\`${t}\``).join(', ') + (ids.length > n ? ` +${ids.length - n}` : '') : '—');

// ------------------------------------------------------------ gate
const problems = [];
const frRows = frs.map((fr) => {
  const us = units.filter((u) => u.frs.includes(fr.id));
  const ts = uniq(us.flatMap((u) => testsOf(u.id)));
  if (!us.length) problems.push(`${fr.id}: no contract clause binds it`);
  else if (!ts.length) problems.push(`${fr.id}: its contract clauses have no test`);
  return { fr, us, ts };
});
for (const r of adRows) {
  if (!r.tests.length) problems.push(`§14 ${r.ad}: no test cited`);
  for (const t of r.tests) if (!tests.has(t)) problems.push(`§14 ${r.ad}: cites [${t}], which is not defined`);
}
if (risks.length < 8) problems.push(`risk register: ${risks.length} risks, at least 8 required`);
for (const r of risks) {
  if (r.priority !== 'P2' && !r.tests.length) problems.push(`${r.id} (${r.priority}): no red test`);
  for (const t of r.tests) if (!tests.has(t)) problems.push(`${r.id}: cites [${t}], which is not defined`);
}
const mecModules = ['IDN', 'VER', 'CAT', 'DSC', 'INV', 'ORD', 'COM', 'TRD', 'MSG', 'COL', 'VAL', 'REP'];
for (const m of mecModules) if (!risks.some((r) => r.module === m && r.priority === 'P0' && r.tests.some((t) => /\.MEC\d?$/.test(t)))) problems.push(`${m}: no P0 risk with a MEC test`);
for (const u of units) for (const t of u.cited) if (/^(S-FR-|P-|S-SYS|[A-Z]{3}-\d)/.test(t) && !tests.has(t)) problems.push(`${u.id}: cites [${t}], which is not defined`);
if (fs.existsSync(EPICS)) {
  for (const { fr } of frRows) if (!stories(fr.id).length) problems.push(`${fr.id}: no story`);
  for (const r of risks.filter((x) => x.priority === 'P0')) if (!stories(...r.tests).length) problems.push(`${r.id}: P0 risk without a story`);
  for (const r of adRows) if (!stories(...r.tests).length) problems.push(`§14 ${r.ad}: no story owns its red tests`);
}

// ------------------------------------------------------------ NFR rows, joined with nfr-evidence.md
const evidence = new Map();
for (const m of read(EVIDENCE).matchAll(/^\| (NFR-[A-Z]+-\d+) \| ([^|]+) \| [^|]+ \| [^|]+ \| ([^|]+) \| ([^|]+) \|$/gm)) {
  evidence.set(m[1], { category: m[2].trim(), tests: IDS(m[3]), status: m[4].trim() });
}
const nfrRows = nfrs.map((n) => {
  const us = units.filter((u) => u.nfrs.includes(n.id));
  const own = [...tests.keys()].filter((t) => t === n.id || t.startsWith(`${n.id}.`));
  const ev = evidence.get(n.id);
  const ts = uniq([...own, ...(ev?.tests ?? []), ...us.flatMap((u) => testsOf(u.id))]);
  if (!ev) problems.push(`${n.id}: no row in nfr-evidence.md`);
  for (const t of ev?.tests ?? []) if (!tests.has(t)) problems.push(`${n.id} evidence: cites [${t}], which is not defined`);
  return { n, us, ts, own, ev };
});
for (const cat of ['Performance', 'Reliability', 'Security']) {
  if (!nfrRows.some((r) => r.ev && r.ev.category.startsWith(cat) && r.ev.tests.some((t) => tests.has(t)))) problems.push(`nfr-evidence.md: no ${cat} NFR with a concrete artifact`);
}
const statusCounts = {};
for (const r of nfrRows) for (const s of uniq((r.ev?.status ?? '').split(';').map((x) => x.replace(/\(.*\)/, '').trim()).filter(Boolean))) statusCounts[s] = (statusCounts[s] ?? 0) + 1;

// ------------------------------------------------------------ write
const lines = [];
const P = (s = '') => lines.push(s);
P('<!-- GENERATED by scripts/gen-solu2-trace.mjs (npm run gen:trace:solu2). Do not edit by hand. -->');
P('# TEZG Solu-2 — Traceability matrix');
P();
P('*bmad-testarch-trace, Phase 3. It joins the following sources:*');
P();
P('- *PRD FRs and NFRs;*');
P('- *contract clauses (`contracts.md`);*');
P('- *AD bindings (§14);*');
P('- *the risk register (`test-design.md`);*');
P('- *test ids (`docs/solu-2/test/`);*');
P('- *stories (`epics.md`, once Phase 4 has written it).*');
P();
P('*Test state: **red** means it fails today on `NotImplementedError`, by design (ATDD and NFR benchmarks). **Green** means it passes and must stay passing (fitness functions and fixture proofs).*');
P();
P('## 1. Gate summary');
P();
const red = [...tests.values()].filter((t) => t.state === 'red').length;
P('| Measure | Value |');
P('|---|---|');
P(`| FRs traced to a contract clause and a test | ${frRows.filter((r) => r.us.length && r.ts.length).length} / ${frs.length} |`);
P(`| ADs of §14 with a test that turns red on violation | ${adRows.filter((r) => r.tests.length && r.tests.every((t) => tests.has(t))).length} / ${adRows.length} |`);
P(`| P0 risks with a red test | ${risks.filter((r) => r.priority === 'P0' && r.tests.length).length} / ${risks.filter((r) => r.priority === 'P0').length} |`);
P(`| MEC modules with a P0 risk and a MEC test | ${mecModules.length - problems.filter((p) => p.endsWith('no P0 risk with a MEC test')).length} / ${mecModules.length} |`);
P(`| NFRs with an evidence row (nfr-evidence.md) | ${nfrRows.filter((r) => r.ev).length} / ${nfrs.length} |`);
P(`| NFRs with a test today | ${nfrRows.filter((r) => r.ts.length).length} / ${nfrs.length} |`);
P(`| NFR evidence status | ${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join('; ')} |`);
P(`| Contract clauses / test ids | ${units.length} / ${tests.size} (${red} red, ${tests.size - red} green) |`);
P(`| Gate problems | ${problems.length} |`);
for (const p of problems) P(`| ✗ | ${p} |`);
P();
P('## 2. Functional requirements');
P();
P('| FR | Scenario | Contract clauses | AD | Tests | Story | Status |');
P('|---|---|---|---|---|---|---|');
for (const { fr, us, ts } of frRows) {
  P(`| ${fr.id} | ${fr.title}${fr.caps.length ? ` (${fr.caps.join(', ')})` : ''} | ${us.map((u) => u.id).join(', ') || '**none**'} | ${uniq(us.flatMap((u) => u.ads)).slice(0, 4).join(', ') || '—'} | ${ts.length} — ${short(ts, 3)} | ${storyCell(stories(fr.id))} | ${state(ts)} |`);
}
P();
P('## 3. Non-functional requirements');
P();
P('*An NFR is measured by the contract clauses that cite it (their concurrency and latency clauses) and by the artifact that `nfr-evidence.md` names for it. The evidence status comes from that file.*');
P();
P('| NFR | Title | Contract clauses | Evidence artifact | Tests | Evidence status |');
P('|---|---|---|---|---|---|');
for (const { n, us, ts, ev } of nfrRows) P(`| ${n.id} | ${n.title} | ${us.map((u) => u.id).join(', ') || '—'} | ${short(ev?.tests ?? [], 3)} | ${ts.length} | ${ev?.status ?? '**none**'} |`);
P();
P('## 4. Architecture decisions (§14)');
P();
P('| AD | Invariant | Enforcement point | Tests that turn red on violation | Story | Status |');
P('|---|---|---|---|---|---|');
for (const r of adRows) P(`| ${r.ad} | ${r.invariant} | ${r.enforcement.replace(/\|/g, '\\|')} | ${short(r.tests, 5)} | ${storyCell(stories(...r.tests))} | ${state(r.tests)} |`);
P();
P('## 5. Risks (test-design.md §2)');
P();
P('| Risk | Priority | Module | Level | Tests | Story | Status |');
P('|---|---|---|---|---|---|---|');
for (const r of risks) P(`| ${r.id} ${r.risk.length > 70 ? `${r.risk.slice(0, 67)}…` : r.risk} | ${r.priority} | ${r.module} | ${r.level} | ${short(r.tests, 4)} | ${storyCell(stories(...r.tests))} | ${state(r.tests)} |`);
P();
P('## 6. Contract clauses');
P();
P('| Clause | Kind | FR | AD | Tests | Status |');
P('|---|---|---|---|---|---|');
for (const u of units) { const ts = testsOf(u.id); P(`| ${u.id} | ${u.kind} | ${u.frs.join(', ') || '—'} | ${u.ads.slice(0, 4).join(', ') || '—'} | ${ts.length} | ${state(ts)} |`); }
P();
const text = `${lines.join('\n')}\n`;

if (check) {
  const current = fs.existsSync(OUT) ? read(OUT) : '';
  if (current !== text) problems.push(`${OUT} is not current; run npm run gen:trace:solu2`);
  console.log(`trace: ${frs.length} FRs, ${nfrs.length} NFRs, ${adRows.length} AD rows, ${risks.length} risks, ${units.length} clauses, ${tests.size} tests; ${problems.length} problems`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  process.exit(problems.length ? 1 : 0);
}
fs.writeFileSync(OUT, text);
console.log(`wrote ${OUT}: ${frs.length} FRs, ${nfrs.length} NFRs, ${adRows.length} AD rows, ${risks.length} risks, ${units.length} clauses, ${tests.size} tests; ${problems.length} gate problems`);
for (const p of problems) console.log(`  ✗ ${p}`);
