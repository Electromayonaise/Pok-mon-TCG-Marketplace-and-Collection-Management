// Sprint readiness audit for the docs/solu-2 package (task statement §7: the six checks of the
// default statement, plus Annex B's story structure and the executable gates). It parses the
// committed epics.md on its own, without its generator, so the two cross-check each other.
// Called by scripts/readiness-audit.mjs --package docs/solu-2 (the bmad-sprint-planning prepend).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'docs/solu-2';
const DD = `${ROOT}/planning/detailed-design`;
const EPICS = `${ROOT}/planning/epics.md`;
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const uniq = (xs) => [...new Set(xs)];
const FRS = (s) => uniq([...s.matchAll(/(?<![A-Z-])FR-([A-Z]+)-(\d+)(?:\.\.(\d+))?/g)].flatMap((m) => {
  const to = Number(m[3] ?? m[2]);
  return Array.from({ length: to - Number(m[2]) + 1 }, (_, i) => `FR-${m[1]}-${Number(m[2]) + i}`);
}));
const ADS = (s) => uniq([...s.matchAll(/\bAD-(?:\d+|[A-Z]+-\d+)\b/g)].map((m) => m[0]));
const IDS = (s) => uniq([...s.matchAll(/\[([A-Z][A-Za-z0-9.-]*\d[A-Za-z0-9.-]*)\]/g)].map((m) => m[1]));
const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', shell: true });
const lastLine = (r) => ((r.stdout ?? '').trim().split('\n').filter(Boolean)[0] ?? '').trim();

export async function auditSolu2({ runTests, jsonOut }) {
  const failures = [];
  const fail = (check, msg) => failures.push(`[${check}] ${msg}`);

  // ---------------------------------------------------------------- parse epics.md
  const epics = [];
  const stories = [];
  let story = null;
  for (const l of read(EPICS).split('\n')) {
    const e = /^## Epic (\d+): (.+)$/.exec(l);
    if (e) { epics.push({ n: Number(e[1]), title: e[2] }); story = null; continue; }
    if (/^## /.test(l)) { story = null; continue; }
    const s = /^### Story (\d+)\.(\d+): (.+)$/.exec(l);
    if (s) { story = { id: `${s[1]}.${s[2]}`, epic: Number(s[1]), title: s[3], f: {}, body: [] }; stories.push(story); continue; }
    if (!story) continue;
    story.body.push(l);
    const f = /^- \*\*(Kind|Description|Contracts|Depends on|Traceability|Binding invariants|Files|Schema\/DTO|ATDD path|Gherkin|DoD):\*\*\s*(.*)$/.exec(l);
    if (f) story.f[f[1]] = f[2];
  }

  // ---------------------------------------------------------------- reference data
  const prdFrs = new Set([...read('docs/plan-2/planning/prd.md').matchAll(/^\*\*(FR-[A-Z]+-\d+) —/gm)].map((m) => m[1]));
  const contracts = read(`${DD}/contracts.md`);
  const s14 = contracts.slice(contracts.indexOf('## 14.'), contracts.indexOf('## 15.'));
  const adRows = [...s14.matchAll(/^\| ([^|]+) \| ([^|]*AD[^|]*) \| ([^|]+) \| ([^|]+) \|$/gm)]
    .filter((m) => m[1].trim() !== 'Invariant' && !/^-+$/.test(m[1].trim()))
    .map((m) => ({ ad: m[2].trim(), adIds: ADS(m[2]), tests: IDS(m[4]) }));
  const registry = JSON.parse(read(`${DD}/schemas/operations.json`));
  const opIds = registry.operations.map((o) => o.id);
  const tables = new Set([...read(`${DD}/schemas/001_tezg_schema.sql`).matchAll(/^CREATE TABLE IF NOT EXISTS "?(\w+)"?/gm)].map((m) => m[1]));
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const exported = new Set([...walk('src').filter((f) => f.endsWith('.ts')).map(read).join('\n').matchAll(/export (?:interface|type|class) (\w+)/g)].map((m) => m[1]));
  const testFile = new Map();
  for (const f of walk(`${ROOT}/test`).filter((x) => x.endsWith('.test.ts'))) {
    for (const m of read(f).matchAll(/\bit(?:\.\w+)?\(\s*['"`]((?:\[[^\]]+\]\s*)+)/g)) for (const i of m[1].matchAll(/\[([^\]]+)\]/g)) testFile.set(i[1], f.replace(/\\/g, '/'));
  }
  const pages = Object.entries(JSON.parse(read(`${DD}/schemas/ui-states.json`)).pages);

  // ---------------------------------------------------------------- S0 Annex B structure
  const REQUIRED = ['Kind', 'Description', 'Contracts', 'Depends on', 'Traceability', 'Binding invariants', 'Files', 'Schema/DTO', 'ATDD path', 'Gherkin', 'DoD'];
  for (const s of stories) {
    for (const f of REQUIRED) if (!(f in s.f) || (f !== 'Gherkin' && !s.f[f].trim())) fail('S0 Annex B fields', `Story ${s.id} lacks "${f}"`);
    const body = s.body.join('\n');
    if (!/Scenario \(happy\) — Given:\*\* .+\*\*When:\*\* .+\*\*Then:\*\* /.test(body)) fail('S0 Annex B fields', `Story ${s.id} lacks a happy Given/When/Then`);
    if (!/Scenario \(failure\) — Given:\*\* .+\*\*When:\*\* .+\*\*Then:\*\* /.test(body)) fail('S0 Annex B fields', `Story ${s.id} lacks a failure Given/When/Then`);
  }
  if (epics[0]?.n !== 1 || !/skeleton/i.test(epics[0]?.title ?? '')) fail('S0 epic structure', 'Epic 1 is not the walking skeleton');
  for (const e of epics.filter((x) => x.n > 1)) {
    const ss = stories.filter((s) => s.epic === e.n);
    if (ss.length < 3 || ss.length > 6) fail('S0 epic structure', `Epic ${e.n} has ${ss.length} stories (3–6)`);
    if (!ss.some((s) => s.f.Kind === 'MEC')) fail('S0 epic structure', `Epic ${e.n} has no MEC story`);
    if (ss.filter((s) => s.f.Kind === 'Failure-state').length < 2) fail('S0 epic structure', `Epic ${e.n} has fewer than 2 failure-state stories`);
  }
  if (epics.length !== 13) fail('S0 epic structure', `${epics.length} epics (1 skeleton + 12 modules expected)`);

  // ---------------------------------------------------------------- C1 FR <-> story, both ways
  const traced = new Map();
  for (const s of stories) {
    const frs = FRS(s.f.Traceability ?? '');
    if (!frs.length && s.epic !== 1) fail('C1 FR <-> story', `Story ${s.id} traces no FR (only Epic 1 may be cross-cutting)`);
    for (const f of frs) {
      if (!prdFrs.has(f)) fail('C1 FR <-> story', `Story ${s.id} traces ${f}, which the PRD does not define`);
      traced.set(f, [...(traced.get(f) ?? []), s.id]);
    }
  }
  for (const f of prdFrs) if (!traced.has(f)) fail('C1 FR <-> story', `${f} reaches no story`);

  // ---------------------------------------------------------------- C2 every UI state backed by a contract and a DTO
  const opOwner = new Map();
  // Owned operations precede " · **Also proves:**", which lists clauses another story owns.
  for (const s of stories) for (const m of (s.f.Contracts ?? '').split(' · **Also proves:**')[0].matchAll(/`([^`]+)`/g)) {
    if (!opIds.includes(m[1])) continue;
    if (opOwner.has(m[1])) fail('C5 no contradictions', `${m[1]} is bound by Story ${opOwner.get(m[1])} and Story ${s.id}`);
    opOwner.set(m[1], s.id);
  }
  const ui = run('node', ['scripts/check-ui-states.mjs', '--check']);
  if (ui.status !== 0) fail('C2 UI states', `check-ui-states: ${lastLine(ui)}`);
  let backedPages = 0;
  for (const [page, p] of pages) {
    const missing = (p.ops ?? []).filter((o) => !opOwner.has(o));
    if (missing.length) fail('C2 UI states', `page ${page}: ${missing.join(', ')} bound by no story`);
    else backedPages++;
  }

  // ---------------------------------------------------------------- C3 every AD in a story and a red test
  const owned = new Map();
  for (const s of stories) for (const m of (s.f['ATDD path'] ?? '').matchAll(/`\[([^\]]+)\]`/g)) {
    if (owned.has(m[1])) fail('C5 no contradictions', `[${m[1]}] is bound by Story ${owned.get(m[1])} and Story ${s.id}`);
    owned.set(m[1], s.id);
  }
  let adOk = 0;
  for (const r of adRows) {
    const holders = stories.filter((s) => r.tests.some((t) => owned.get(t) === s.id));
    const listed = holders.filter((s) => r.adIds.every((a) => (s.f['Binding invariants'] ?? '').includes(a)));
    if (!r.tests.every((t) => testFile.has(t))) fail('C3 AD -> story -> red test', `§14 ${r.ad}: cites a test that does not exist`);
    if (!holders.length) fail('C3 AD -> story -> red test', `§14 ${r.ad}: no story owns one of its red tests`);
    else if (!listed.length) fail('C3 AD -> story -> red test', `§14 ${r.ad}: Story ${holders.map((s) => s.id).join('/')} owns its test but does not list it under Binding invariants`);
    else adOk++;
  }

  // ---------------------------------------------------------------- C4 no forward dependency
  const order = stories.map((s) => s.id);
  for (const s of stories) for (const d of (s.f['Depends on'] ?? '').matchAll(/Story (\d+\.\d+)/g)) {
    if (!(order.indexOf(d[1]) >= 0 && order.indexOf(d[1]) < order.indexOf(s.id))) fail('C4 no forward dependency', `Story ${s.id} depends on Story ${d[1]}, which is not earlier`);
  }

  // ---------------------------------------------------------------- C5 no contradictions
  for (const o of opIds) if (!opOwner.has(o)) fail('C5 no contradictions', `registry operation ${o} is bound by no story`);
  for (const t of testFile.keys()) if (!owned.has(t)) fail('C5 no contradictions', `[${t}] is bound by no story`);
  for (const s of stories) {
    for (const m of (s.f['ATDD path'] ?? '').matchAll(/`([^`[]+\.test\.ts)` › ([^;]+)/g)) {
      for (const i of m[2].matchAll(/`\[([^\]]+)\]`/g)) if (testFile.get(i[1]) !== m[1]) fail('C5 no contradictions', `Story ${s.id}: [${i[1]}] is not defined in ${m[1]}`);
    }
    for (const t of (s.f['Schema/DTO'] ?? '').matchAll(/`"(\w+)"`/g)) if (!tables.has(t[1])) fail('C5 no contradictions', `Story ${s.id} names table "${t[1]}", which the schema does not create`);
    for (const d of (s.f['Schema/DTO'] ?? '').matchAll(/`([A-Z][a-z]\w*)`/g)) if (!exported.has(d[1])) fail('C5 no contradictions', `Story ${s.id} names DTO ${d[1]}, which no src file exports`);
    for (const f of (s.f.Files ?? '').matchAll(/`([\w./-]+\.(?:ts|mjs))`( \(([^)]*(?:\([^)]*\)[^)]*)*)\))?/g)) {
      if (!fs.existsSync(f[1]) && !/\bnew\b/.test(f[3] ?? '')) fail('C5 no contradictions', `Story ${s.id} names ${f[1]}, which does not exist and is not marked new`);
    }
  }
  const gates = [
    ['generated API surface', ['scripts/gen-solu2-api.mjs', '--check']],
    ['epics.md current with its source', ['scripts/gen-solu2-epics.mjs', '--check']],
    ['traceability matrix (FR, AD, P0 -> test, story)', ['scripts/gen-solu2-trace.mjs', '--check']],
    ['cited test ids', ['scripts/check-test-ids.mjs']],
    ['error-code citations', ['scripts/check-code-citations.mjs', `${DD}/contracts.md`, EPICS]],
  ];
  const gateLines = [];
  for (const [label, args] of gates) {
    const r = run('node', args);
    gateLines.push(`${label}: ${lastLine(r)}`);
    if (r.status !== 0) fail('C5 no contradictions', `${label}: ${(r.stdout ?? '').trim().split('\n').slice(0, 3).join(' | ')}`);
  }

  // ---------------------------------------------------------------- C6 every review finding triaged
  let findings = 0;
  for (const f of fs.readdirSync(`${ROOT}/reviews`).filter((x) => x.endsWith('.md'))) {
    const text = read(`${ROOT}/reviews/${f}`);
    const st = /\*\*Triage status:\*\* (\d+) findings — (\d+) accepted, (\d+) rejected, (\d+) deferred, (\d+) open/.exec(text);
    if (!st) { fail('C6 review triage', `${f} has no "Triage status" line`); continue; }
    const [total, acc, rej, def, open] = st.slice(1).map(Number);
    if (open !== 0) fail('C6 review triage', `${f}: ${open} findings open`);
    if (acc + rej + def !== total) fail('C6 review triage', `${f}: ${acc} + ${rej} + ${def} ≠ ${total}`);
    const section = text.slice(text.indexOf('## Triage'));
    const ids = new Set();
    for (const m of section.matchAll(/^\| ([A-Z]{1,2})-(\d+)(?:\b[^|]*? to [A-Z]{1,2}-(\d+))?/gm)) {
      for (let i = Number(m[2]); i <= Number(m[3] ?? m[2]); i++) ids.add(`${m[1]}-${i}`);
    }
    if (ids.size !== total) fail('C6 review triage', `${f}: the status line says ${total} findings, the triage table holds ${ids.size}`);
    findings += total;
  }

  // ---------------------------------------------------------------- C7 executable gates
  let green = 'skipped (--no-tests)';
  let red = 'skipped (--no-tests)';
  let nfr = 'skipped (--no-tests)';
  if (runTests) {
    const g = run('npx', ['vitest', 'run', '--project', 'solu2-fitness']);
    green = ((g.stdout ?? '').match(/Tests\s+(.+)/) ?? [])[1]?.trim() ?? 'no result';
    if (g.status !== 0) fail('C7 executable gates', `GREEN fitness project failed: ${green}`);
    const r = run('node', ['scripts/check-atdd-red.mjs', 'solu2-atdd', '352', '--status', `${ROOT}/implementation-artifacts/sprint-status.yaml`, '--epics', EPICS]);
    red = lastLine(r);
    if (r.status !== 0) fail('C7 executable gates', `ATDD red check failed: ${(r.stdout ?? '').trim().split('\n').slice(0, 4).join(' | ')}`);
    const n = run('node', ['scripts/check-atdd-red.mjs', 'solu2-nfr', '3']);
    nfr = lastLine(n);
    if (n.status !== 0) fail('C7 executable gates', `NFR red check failed: ${lastLine(n)}`);
  }

  // ---------------------------------------------------------------- report
  const pass = failures.length === 0;
  const pct = (a, b) => (b === 0 ? '100%' : `${Math.round((100 * a) / b)}%`);
  const W = 112;
  const row = (t) => `| ${t.slice(0, W - 4).padEnd(W - 4)} |`;
  const hr = `+${'-'.repeat(W - 2)}+`;
  const box = [
    hr,
    row('SPRINT READINESS AUDIT RESULT'),
    hr,
    row(`Package: ${ROOT}   Epics: ${epics.length}   Stories: ${stories.length}   Operations: ${opOwner.size}/${opIds.length}   Test ids: ${owned.size}/${testFile.size}`),
    row(pass ? 'Status: IR-PASS (Autonomous Green Light)' : `Status: IR-FAIL (${failures.length} blocking finding${failures.length === 1 ? '' : 's'})`),
    row(`C1 FR <-> story: ${pct(traced.size, prdFrs.size)} (${traced.size}/${prdFrs.size} PRD FRs in a story; every story FR is a PRD FR)`),
    row(`C2 UI states: ${backedPages}/${pages.length} pages backed by bound operations; ${lastLine(ui)}`),
    row(`C3 AD -> story -> red test: ${pct(adOk, adRows.length)} (${adOk}/${adRows.length} §14 rows listed by the story that owns their red test)`),
    row(`C4 No forward dependency: ${failures.some((f) => f.startsWith('[C4')) ? 'FAIL' : `PASS (${stories.reduce((n, s) => n + [...(s.f['Depends on'] ?? '').matchAll(/Story /g)].length, 0)} dependencies, all backward)`}`),
    row(`C5 No contradictions: ${failures.some((f) => f.startsWith('[C5')) ? 'FAIL' : 'PASS'} (each operation and test id in one story; tables, DTOs, files and generators consistent)`),
    ...gateLines.map((g) => row(`   ${g}`)),
    row(`C6 Review triage: ${failures.some((f) => f.startsWith('[C6')) ? 'FAIL' : 'PASS'} (${findings} findings across ${fs.readdirSync(`${ROOT}/reviews`).filter((x) => x.endsWith('.md')).length} reviews, 0 open)`),
    row(`C7 GREEN fitness: ${green}`),
    row(`C7 ATDD: ${red}`),
    row(`C7 NFR: ${nfr}`),
    row(pass ? 'Action: Sprint tracking file may be generated. System ready for implementation.' : 'Action: HALT. Do not generate sprint-status.yaml; fix the findings below.'),
    hr,
  ];
  console.log(box.join('\n'));
  for (const f of failures) console.log(`  ✗ ${f}`);
  if (jsonOut) {
    fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
    fs.writeFileSync(jsonOut, JSON.stringify({ package: ROOT, status: pass ? 'IR-PASS' : 'IR-FAIL', epics: epics.length, stories: stories.length, operations: opOwner.size, tests: owned.size, frs: { prd: prdFrs.size, traced: traced.size }, ads: { rows: adRows.length, bound: adOk }, pages: { total: pages.length, backed: backedPages }, findings, green, red, nfr, failures }, null, 2));
  }
  return pass ? 0 : 1;
}
