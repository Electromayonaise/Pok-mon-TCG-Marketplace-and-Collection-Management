// Traceability matrix and quality gate (bmad-testarch-trace): the Impl-2 final trace (decision log Impl-2 #5).
// It joins the PRD's FRs and NFRs, the contract clauses of contracts.md (core operations, §15 supporting contracts,
// §15.11/§15.12 tables), the §14 AD binding table, the risk register of test-design.md, the test ids under
// _bmad-output/test-artifacts, the Playwright journeys and k6 scripts (their `// Traces:` line), the stories of
// epics.md and their status in sprint-status.yaml, and nfr-evidence.md. For each requirement it writes the chain
// PRD requirement → user story (status) → automated test files → CI evidence → verdict, and a gate decision.
// Everything it writes is derived from committed files, so the output is deterministic, except the real-run section
// between the `real-run` markers, which `--real-run` fills from one run's reports and which `--check` ignores.
//   (none)      write traceability-matrix.md, keeping the current real-run section
//   --check     fail if a static check fails (an FR, AD or P0/P1 risk without a test, a cited id that is not defined,
//               an unknown evidence status, a planned risk not registered), if the gate decision is FAIL, or if the
//               committed matrix is not current
//   --real-run  rewrite the real-run section from .vitest-results/*.json and evidence/impl2/k6-summary.json
import fs from 'node:fs';
import path from 'node:path';

const PRD = '_bmad-output/planning-artifacts/prd.md';
const CONTRACTS = '_bmad-output/planning-artifacts/detailed-design/contracts.md';
const DESIGN = '_bmad-output/test-artifacts/test-design.md';
const EVIDENCE = '_bmad-output/test-artifacts/nfr-evidence.md';
const TESTS = '_bmad-output/test-artifacts';
const EPICS = '_bmad-output/planning-artifacts/epics.md';
const STATUS = '_bmad-output/implementation-artifacts/sprint-status.yaml';
const OUT = '_bmad-output/test-artifacts/traceability-matrix.md';
const K6_SUMMARY = '_bmad-output/test-artifacts/evidence/impl2/k6-summary.json';
const RUN_BEGIN = '<!-- real-run:begin (written by `node scripts/gen-solu2-trace.mjs --real-run`; ignored by --check) -->';
const RUN_END = '<!-- real-run:end -->';
const check = process.argv.includes('--check');
const realRun = process.argv.includes('--real-run');
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const uniq = (xs) => [...new Set(xs)];
const byKey = (a, b) => a.localeCompare(b, 'en', { numeric: true });
const ADS = (s) => uniq([...s.matchAll(/\bAD-(?:\d+|[A-Z]+-\d+)\b/g)].map((m) => m[0]));
/** FR or NFR ids, expanding ranges such as `FR-DSC-1..6` and `NFR-INV-1..4`. */
const ranged = (re, prefix) => (s) => uniq([...s.matchAll(re)].flatMap((m) => {
  const to = Number(m[3] ?? m[2]);
  return Array.from({ length: to - Number(m[2]) + 1 }, (_, i) => `${prefix}-${m[1]}-${Number(m[2]) + i}`);
}));
const FRS = ranged(/(?<![A-Z-])FR-([A-Z]+)-(\d+)(?:\.\.(\d+))?/g, 'FR');
const NFRS = ranged(/\bNFR-([A-Z]+)-(\d+)(?:\.\.(\d+))?/g, 'NFR');
/** Bracketed test ids: either with a digit (`[IDN-1.MEC]`) or dotted (`[S-SYS.jobs.auth]`, `[SEED.profile]`). */
const IDS = (s) => uniq([...s.matchAll(/\[([A-Z][A-Za-z0-9-]*(?:\.[A-Za-z0-9-]+)+|[A-Z][A-Za-z0-9.-]*\d[A-Za-z0-9.-]*)\]/g)].map((m) => m[1]));
const code = (xs, n = 4) => (xs.length ? xs.slice(0, n).map((t) => `\`${t}\``).join(', ') + (xs.length > n ? ` +${xs.length - n}` : '') : '—');

// ------------------------------------------------------------ PRD
const prd = read(PRD);
const frs = [...prd.matchAll(/^\*\*(FR-[A-Z]+-\d+) — ([^*]+?)\.?\*\*(.*)$/gm)].map((m) => ({ id: m[1], title: m[2].trim(), caps: [...m[3].matchAll(/CAP-\d+/g)].map((c) => c[0]) }));
// Two heading styles: `**NFR-SYS-6 Title.**` and `- **NFR-IDN-1:** statement…` (titled by its first clause).
const nfrMap = new Map();
for (const m of prd.matchAll(/\*\*(NFR-[A-Z]+-\d+) ([^*]+?)\.?\*\*/g)) if (!nfrMap.has(m[1])) nfrMap.set(m[1], m[2].trim());
for (const m of prd.matchAll(/\*\*(NFR-[A-Z]+-\d+):\*\* ([^\n]+)/g)) if (!nfrMap.has(m[1])) nfrMap.set(m[1], m[2].replace(/`/g, '').split(/[,;.]\s/)[0].trim().slice(0, 80));
const nfrs = [...nfrMap].map(([id, title]) => ({ id, title }));

// ------------------------------------------------------------ stories and their status
// A story covers an FR or NFR its Traceability line lists, and a test id its ATDD path binds; a risk or an AD
// reaches a story through the story that owns one of its tests.
const storyOf = new Map(); // FR, NFR or test id → [story keys]
const storyStatus = new Map();
const storyTitle = new Map();
{
  let key = null;
  const add = (k, story) => storyOf.set(k, uniq([...(storyOf.get(k) ?? []), story]));
  for (const line of read(EPICS).split('\n')) {
    const s = /^### Story (\d+)\.(\d+): (.+)$/.exec(line);
    if (s) { key = `${s[1]}.${s[2]}`; storyTitle.set(key, s[3]); continue; }
    if (/^## /.test(line)) { key = null; continue; }
    if (!key) continue;
    const tr = /^- \*\*Traceability:\*\* (.*)$/.exec(line);
    if (tr) for (const f of [...FRS(tr[1]), ...NFRS(tr[1])]) add(f, key);
    const at = /^- \*\*ATDD path:\*\* (.*)$/.exec(line);
    if (at) for (const i of at[1].matchAll(/`\[([^\]]+)\]`/g)) add(i[1], key);
  }
  for (const m of read(STATUS).matchAll(/^\s+(\d+)-(\d+)-[\w-]+:\s*([\w-]+)\s*$/gm)) storyStatus.set(`${m[1]}.${m[2]}`, m[3]);
}
const isDone = (k) => storyStatus.get(k) === 'done';
const stories = (...keys) => uniq(keys.flatMap((k) => storyOf.get(k) ?? [])).sort(byKey);
const storyCell = (list) => (list.length ? list.map((k) => `${k} (${storyStatus.get(k) ?? 'no status'})`).join(', ') : '**none**');
const doneIds = new Set([...storyOf].filter(([k, ss]) => !/^N?FR-[A-Z]+-\d+$/.test(k) && ss.some(isDone)).map(([k]) => k));

// ------------------------------------------------------------ tests: Vitest ids, Playwright journeys, k6 scripts
function filesUnder(dir, ok) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => byKey(a.name, b.name)).flatMap((e) => {
    const p = path.posix.join(dir, e.name);
    return e.isDirectory() ? filesUnder(p, ok) : ok(e.name) ? [p] : [];
  });
}
/** The project that runs a test file, its command and its CI job (`.github/workflows/impl2-quality-gate.yml`). */
const RUNNERS = {
  atdd: { project: 'solu2-atdd', command: 'npm run gate:atdd-red:impl1', job: 'gate', rule: 'a test of a `done` story must pass; any other must fail on `NotImplementedError`' },
  nfr: { project: 'solu2-nfr', command: 'npm run gate:nfr-red:impl1', job: 'gate', rule: 'the same rule, and each benchmark asserts its PRD threshold' },
  fitness: { project: 'solu2-fitness', command: 'npm run test:fitness:solu2', job: 'gate', rule: 'always green (architecture fitness functions and the seed profile)' },
  unit: { project: 'impl1-unit', command: 'npm run test:unit', job: 'gate', rule: 'always green, with ≥ 90 % branch coverage per file of `src/modules/*/domain/**`' },
  e2e: { project: 'Playwright (chromium)', command: 'npx playwright test', job: 'e2e', rule: 'every journey passes against the production build; Page Objects only, web-first assertions' },
  k6: { project: 'k6 (grafana/k6 in Docker)', command: 'npm run nfr:k6', job: 'nfr-k6', rule: 'p95, p99, error-rate, 5xx and dropped-iteration thresholds at a fixed arrival rate' },
};
const runnerOf = (file) => (file.startsWith('atdd/') ? 'atdd' : file.startsWith('nfr/k6/') ? 'k6' : file.startsWith('nfr/') ? 'nfr' : file.startsWith('e2e/') ? 'e2e' : file.startsWith('src/') ? 'unit' : 'fitness');
const ciCell = (files) => uniq(files.map(runnerOf)).sort((a, b) => Object.keys(RUNNERS).indexOf(a) - Object.keys(RUNNERS).indexOf(b)).map((r) => `\`${RUNNERS[r].command.replace(/^npm run /, '')}\` › ${RUNNERS[r].job}`).join('; ') || '—';
const fileCell = (files) => (files.length ? uniq(files).sort(byKey).map((f) => `\`${f}\``).join(', ') : '—');

/** Every `it(...)` block whose title starts with bracketed ids; a block is enforced green when its project always
 *  runs green, or when one of its ids is bound to a done story (the red gate's rule, scripts/check-atdd-red.mjs). */
const blocks = [];
const itCount = new Map(); // file → it blocks
for (const file of filesUnder(TESTS, (n) => n.endsWith('.test.ts'))) {
  const rel = path.posix.relative(TESTS, file);
  const text = read(file);
  itCount.set(rel, [...text.matchAll(/^\s*it(?:\.\w+)?\(/gm)].length);
  for (const m of text.matchAll(/\bit(?:\.\w+)?\(\s*['"`]((?:\[[^\]]+\]\s*)+)/g)) {
    const ids = [...m[1].matchAll(/\[([^\]]+)\]/g)].map((i) => i[1]);
    const runner = runnerOf(rel);
    blocks.push({ ids, file: rel, runner, green: runner === 'fitness' || ids.some((i) => doneIds.has(i)) });
  }
}
const tests = new Map(); // id → { files, green }
for (const b of blocks) for (const i of b.ids) {
  const t = tests.get(i) ?? { files: [], green: true };
  t.files = uniq([...t.files, b.file]);
  t.green &&= b.green;
  tests.set(i, t);
}
const testsOf = (unitId) => [...tests.keys()].filter((t) => t === unitId || t.startsWith(`${unitId}.`)).sort(byKey);
const filesOf = (ids) => uniq(ids.filter((t) => tests.has(t)).flatMap((t) => tests.get(t).files));
const greenCount = (ids) => ids.filter((t) => tests.get(t)?.green).length;
const stateCell = (ids) => (ids.length ? `${greenCount(ids) === ids.length ? 'green' : 'red'} ${greenCount(ids)}/${ids.length}` : '—');

/** Playwright journeys and k6 scripts name the requirements they cover on a `// Traces:` line. */
const tracesOf = (text) => uniq([...FRS(/^\/\/ Traces: (.*)$/m.exec(text)?.[1] ?? ''), ...NFRS(/^\/\/ Traces: (.*)$/m.exec(text)?.[1] ?? '')]);
const journeys = filesUnder(`${TESTS}/e2e`, (n) => n.endsWith('.spec.ts')).map((f) => {
  const text = read(f);
  return {
    file: path.posix.relative(TESTS, f), traces: tracesOf(text),
    titles: [...text.matchAll(/^test\(\s*'((?:[^'\\]|\\.)*)'/gm)].map((m) => m[1]),
    pages: uniq([...text.matchAll(/import \{ (\w+Page) \} from '\.\/pages\//g)].map((m) => m[1])),
  };
});
const loads = filesUnder(`${TESTS}/nfr/k6`, (n) => n.endsWith('.js')).map((f) => {
  const text = read(f);
  return { file: path.posix.relative(TESTS, f), traces: tracesOf(text), scenarios: [...text.matchAll(/atRate\('(\w+)'\)/g)].map((m) => m[1]), thresholds: [...text.matchAll(/^\s+'([^']+)': \[([^\]]+)\]/gm)].length };
});
const extraOf = (req) => [...journeys, ...loads].filter((j) => j.traces.includes(req)).map((j) => j.file);

/** Colocated unit and integration tests of the module that owns a requirement (FR-COL-5 → collections' `col-*`). */
const srcTests = filesUnder('src/modules', (n) => n.endsWith('.test.ts'));
const moduleTests = (req) => {
  const m = /^N?FR-([A-Z]+)-/.exec(req)[1].toLowerCase();
  return srcTests.filter((f) => path.posix.basename(f) === `${m}-domain.test.ts` || path.posix.basename(f) === `${m}.v2.test.ts`);
};

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
const design = read(DESIGN);
const risks = [...design.matchAll(/^\| (R-\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| \d \| \d \| \d+ \| (P\d) \| [^|]+ \| ([^|]+) \| ([^|]+) \|$/gm)]
  .map((m) => ({ id: m[1], risk: m[2].trim(), module: m[3].trim(), priority: m[5], tests: IDS(m[6]), k6: /\bk6\b/.test(m[6]), level: m[7].trim() }))
  .sort((a, b) => byKey(a.id, b.id));
const plannedRisks = [...design.slice(design.indexOf('### 7.2')).matchAll(/^\| (R-\d+) \| (\d+\.\d+) \|/gm)].map((m) => ({ id: m[1], story: m[2] }));

// ------------------------------------------------------------ static checks (the Phase 3 gate, kept)
const problems = [];
const frRows = frs.map((fr) => {
  const us = units.filter((u) => u.frs.includes(fr.id));
  const ts = uniq(us.flatMap((u) => testsOf(u.id))).sort(byKey);
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
for (const p of plannedRisks) if (!risks.some((r) => r.id === p.id)) problems.push(`${p.id} (Story ${p.story}): planned in test-design.md §7.2 but not in the §2 register`);
const mecModules = ['IDN', 'VER', 'CAT', 'DSC', 'INV', 'ORD', 'COM', 'TRD', 'MSG', 'COL', 'VAL', 'REP'];
for (const m of mecModules) if (!risks.some((r) => r.module === m && r.priority === 'P0' && r.tests.some((t) => /\.MEC\d?$/.test(t)))) problems.push(`${m}: no P0 risk with a MEC test`);
for (const u of units) for (const t of u.cited) if (/^(S-FR-|P-|S-SYS|[A-Z]{3}-\d)/.test(t) && !tests.has(t)) problems.push(`${u.id}: cites [${t}], which is not defined`);
for (const { fr } of frRows) if (!stories(fr.id).length) problems.push(`${fr.id}: no story`);
for (const r of risks.filter((x) => x.priority === 'P0')) if (!stories(...r.tests).length) problems.push(`${r.id}: P0 risk without a story`);
for (const r of adRows) if (!stories(...r.tests).length) problems.push(`§14 ${r.ad}: no story owns its tests`);
for (const j of [...journeys, ...loads]) {
  if (!/^\/\/ Traces: /m.test(read(`${TESTS}/${j.file}`))) problems.push(`${j.file}: no \`// Traces:\` line`);
  for (const t of j.traces) if (!frs.some((f) => f.id === t) && !nfrs.some((n) => n.id === t)) problems.push(`${j.file}: traces ${t}, which the PRD does not define`);
}

// ------------------------------------------------------------ NFR rows, joined with nfr-evidence.md
const STATUSES = ['Green — ATDD', 'Green — gate', 'Green — benchmark', 'Red — ATDD', 'Red — benchmark', 'Planned — story DoD', 'Deferred — launch'];
const evidence = new Map();
for (const m of read(EVIDENCE).matchAll(/^\| (NFR-[A-Z]+-\d+) \| ([^|]+) \| [^|]+ \| [^|]+ \| ([^|]+) \| ([^|]+) \|$/gm)) {
  // A status cell is one or more `Status (detail)` parts; a part ends at a semicolon outside parentheses.
  const parts = m[4].trim().split(/;\s*(?![^()]*\))/).map((x) => x.replace(/\s*\(.*\)\s*$/s, '').trim()).filter(Boolean);
  evidence.set(m[1], { category: m[2].trim(), tests: IDS(m[3]), status: m[4].trim(), parts });
}
const nfrRows = nfrs.map((n) => {
  const us = units.filter((u) => u.nfrs.includes(n.id));
  const own = [...tests.keys()].filter((t) => t === n.id || t.startsWith(`${n.id}.`));
  const ev = evidence.get(n.id);
  const ts = uniq([...own, ...(ev?.tests ?? []), ...us.flatMap((u) => testsOf(u.id))]).sort(byKey);
  if (!ev) problems.push(`${n.id}: no row in nfr-evidence.md`);
  for (const t of ev?.tests ?? []) if (!tests.has(t)) problems.push(`${n.id} evidence: cites [${t}], which is not defined`);
  for (const p of ev?.parts ?? []) if (!STATUSES.includes(p)) problems.push(`${n.id} evidence: unknown status "${p}"`);
  return { n, us, ts, own, ev };
});
for (const cat of ['Performance', 'Reliability', 'Security']) {
  if (!nfrRows.some((r) => r.ev && r.ev.category.startsWith(cat) && r.ev.tests.some((t) => tests.has(t)))) problems.push(`nfr-evidence.md: no ${cat} NFR with a concrete artifact`);
}

// ------------------------------------------------------------ verdicts
// A requirement PASSes when it has ≥ 1 test, every story it maps to is done, and every one of its test ids is
// enforced green (bound to a done story, so the red gate requires it to pass, or a fitness function).
function verdict(ids, storyKeys) {
  const why = [];
  if (!ids.length) why.push('no test');
  const red = ids.filter((t) => tests.has(t) && !tests.get(t).green);
  if (red.length) why.push(`not enforced green: ${code(red, 3)}`);
  const open = storyKeys.filter((k) => !isDone(k));
  if (!storyKeys.length) why.push('no story');
  if (open.length) why.push(`story not done: ${open.join(', ')}`);
  return { pass: why.length === 0, cell: why.length ? `**FAIL** (${why.join('; ')})` : 'PASS' };
}
const frV = frRows.map((r) => ({ ...r, st: stories(r.fr.id), v: verdict(r.ts, stories(r.fr.id)) }));
// An NFR takes its nfr-evidence.md status: PASS when every part is green (a part deferred to launch is reported),
// WAIVED when it is deferred to the launch checklist as a whole, FAIL when a part is red or planned, or when a
// green status names a test that is not enforced green.
const nfrV = nfrRows.map((r) => {
  const st = stories(r.n.id, ...r.ts);
  const parts = r.ev?.parts ?? [];
  const red = r.ts.filter((t) => tests.has(t) && !tests.get(t).green);
  let cell;
  let kind;
  if (!parts.length) [kind, cell] = ['fail', '**FAIL** (no evidence row)'];
  else if (parts.some((p) => /^(Red|Planned)/.test(p))) [kind, cell] = ['fail', `**FAIL** (${parts.filter((p) => /^(Red|Planned)/.test(p)).join(', ')})`];
  else if (red.length) [kind, cell] = ['fail', `**FAIL** (green status, but ${code(red, 3)} not enforced green)`];
  else if (parts.every((p) => p === 'Deferred — launch')) [kind, cell] = ['waived', 'WAIVED (deferred to the launch checklist)'];
  else if (parts.some((p) => /^Green — (ATDD|benchmark)$/.test(p)) && !r.ts.length) [kind, cell] = ['fail', '**FAIL** (green status, no test)'];
  else if (parts.includes('Deferred — launch')) [kind, cell] = ['pass', 'PASS (a part deferred to launch)'];
  else [kind, cell] = ['pass', 'PASS'];
  return { ...r, st, kind, cell };
});
const riskV = risks.map((r) => {
  const st = stories(...r.tests);
  const files = uniq([...filesOf(r.tests), ...(r.k6 ? loads.map((l) => l.file) : [])]);
  const v = r.priority === 'P2' && !r.tests.length ? { pass: true, cell: 'PASS (module suites, P2)' } : verdict(r.tests, st);
  return { ...r, st, files, v };
});
const adV = adRows.map((r) => ({ ...r, st: stories(...r.tests), v: verdict(r.tests, stories(...r.tests)) }));

// ------------------------------------------------------------ gate decision
const nStories = storyTitle.size;
const nDone = [...storyTitle.keys()].filter(isDone).length;
const by = (xs, p) => xs.filter((r) => r.priority === p);
const passOf = (xs) => xs.filter((r) => r.v.pass).length;
const unmapped = [...frV.filter((r) => !r.ts.length || !r.st.length).map((r) => r.fr.id), ...nfrV.filter((r) => r.kind === 'fail' && !r.ts.length).map((r) => r.n.id)];
const failures = [
  ...frV.filter((r) => !r.v.pass).map((r) => `${r.fr.id} ${r.v.cell}`),
  ...riskV.filter((r) => r.priority === 'P0' && !r.v.pass).map((r) => `${r.id} (P0) ${r.v.cell}`),
  ...adV.filter((r) => !r.v.pass).map((r) => `§14 ${r.ad} ${r.v.cell}`),
  ...nfrV.filter((r) => r.kind === 'fail').map((r) => `${r.n.id} ${r.cell}`),
  ...problems.map((p) => `static check: ${p}`),
];
const concerns = riskV.filter((r) => r.priority !== 'P0' && !r.v.pass).map((r) => `${r.id} (${r.priority}) ${r.v.cell}`);
const decision = failures.length ? 'FAIL' : concerns.length ? 'CONCERNS' : 'PASS';
const waived = nfrV.filter((r) => r.kind === 'waived');
const partDeferred = nfrV.filter((r) => r.cell.startsWith('PASS (a part'));
const enforced = [...tests.values()].filter((t) => t.green).length;

// ------------------------------------------------------------ write
const lines = [];
const P = (s = '') => lines.push(s);
P('---');
P("workflow: 'bmad-testarch-trace'");
P("stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']");
P("coverageBasis: 'acceptance_criteria'");
P("oracleResolutionMode: 'formal_requirements'");
P("oracleConfidence: 'high'");
P(`oracleSources: ['${PRD}', '${EPICS}', '${STATUS}', '${CONTRACTS}', '${DESIGN}', '${EVIDENCE}']`);
P("externalPointerStatus: 'not_used'");
P("collectionMode: 'contract_static'");
P(`gateDecision: '${decision}'`);
P('---');
P('<!-- GENERATED by scripts/gen-solu2-trace.mjs (npm run gen:trace:solu2). Do not edit by hand. -->');
P('# TEZG — Traceability matrix and quality gate (Impl-2 final trace)');
P();
P('*`bmad-testarch-trace` at the Impl-2 close (decision log Impl-2 #5). For every PRD requirement it shows the chain **PRD requirement → user story (status) → automated test files → CI evidence → verdict**, and then the risk register, the ADs of contracts.md §14 and a formal gate decision. The oracle is formal: the PRD, the stories of `epics.md` with their status in `sprint-status.yaml`, the contract clauses, the risk register of `test-design.md` and `nfr-evidence.md`. Everything above §10 is derived from committed files, so `npm run gate:trace:solu2` regenerates it and fails if it is not current. §10 is one real run of the suite, which that check ignores.*');
P();
P('*Test state: an id is **green** when the gate requires it to pass on every push: it is bound to a `done` story, so `gate:atdd-red:impl1` or `gate:nfr-red:impl1` fails if it does not pass, or it is a fitness function. It is **red** when its story is not done, so the gate requires it to fail on `NotImplementedError`. The state is read from `sprint-status.yaml`.*');
P();
P('## 1. Gate decision');
P();
P(`**${decision}.**${decision === 'PASS' ? ` All ${frs.length} FRs, all ${risks.length} registered risks and all ${adRows.length} §14 AD rows pass; ${nfrV.filter((r) => r.kind === 'pass').length} of ${nfrs.length} NFRs pass and ${waived.length} ${waived.length === 1 ? 'is' : 'are'} waived to the launch checklist; ${nDone} of ${nStories} stories are \`done\`; 0 requirements are unmapped; the static checks find 0 problems.` : ''}`);
P();
P('**Rule.** The decision is computed, never chosen:');
P();
P('- **FAIL** when any FR, P0 risk or §14 AD is not PASS, any NFR is FAIL (its evidence is red or planned, or a green status names a test that is not enforced green), or a static check fails.');
P('- **CONCERNS** when nothing fails, but a P1 or P2 risk is not PASS.');
P('- **PASS** otherwise: every FR, risk and AD passes, and every NFR passes or is waived to the launch checklist with an owner.');
P();
P('A requirement, risk or AD **passes** when it has ≥ 1 test, every story it maps to is `done`, and every one of its test ids is enforced green. An NFR takes its `nfr-evidence.md` status: PASS when every part of it is green, WAIVED when the whole NFR is "Deferred — launch" (it needs the deployed system: a browser audit or a shaped network), FAIL when a part is red or planned.');
P();
P('| Criterion | Required | Actual | Status |');
P('|---|---|---|---|');
const met = (ok) => (ok ? 'MET' : '**NOT MET**');
P(`| Stories \`done\` in \`sprint-status.yaml\` | ${nStories} / ${nStories} | ${nDone} / ${nStories} | ${met(nDone === nStories)} |`);
P(`| FRs PASS | 100 % | ${passOf(frV)} / ${frs.length} | ${met(passOf(frV) === frs.length)} |`);
P(`| NFRs PASS or WAIVED | 100 % | ${nfrV.filter((r) => r.kind !== 'fail').length} / ${nfrs.length} (${nfrV.filter((r) => r.kind === 'pass').length} PASS, ${waived.length} WAIVED) | ${met(nfrV.every((r) => r.kind !== 'fail'))} |`);
for (const p of ['P0', 'P1', 'P2']) P(`| ${p} risks PASS | 100 % | ${passOf(by(riskV, p))} / ${by(riskV, p).length} | ${met(passOf(by(riskV, p)) === by(riskV, p).length)} |`);
P(`| §14 AD rows PASS | 100 % | ${passOf(adV)} / ${adRows.length} | ${met(passOf(adV) === adRows.length)} |`);
P(`| Test ids enforced green | 100 % | ${enforced} / ${tests.size} | ${met(enforced === tests.size)} |`);
P(`| Unmapped requirements (no test or no story; a waived NFR maps to its waiver) | 0 | ${unmapped.length}${unmapped.length ? ` (${unmapped.join(', ')})` : ''} | ${met(!unmapped.length)} |`);
P(`| Static checks (ids defined, risks registered, statuses known) | 0 problems | ${problems.length} | ${met(!problems.length)} |`);
P();
if (failures.length) { P('**Failing:**'); P(); for (const f of failures) P(`- ${f}`); P(); }
if (concerns.length) { P('**Concerns:**'); P(); for (const c of concerns) P(`- ${c}`); P(); }
P(`**Waived to the launch checklist** (\`nfr-evidence.md\`, "Deferred — launch"): ${waived.length ? waived.map((r) => `${r.n.id} (${r.n.title})`).join(', ') : 'none'}. **Passing in scope, with a part deferred to launch:** ${partDeferred.length ? partDeferred.map((r) => r.n.id).join(', ') : 'none'}.`);
P();
P('## 2. CI evidence');
P();
P('*Each test file is run by one command, and that command runs in one job of `.github/workflows/impl2-quality-gate.yml`. The `release` job prints `Quality gate: PASS` only when `gate`, `e2e` and `nfr-k6` all pass. `npm run test:ci` (the `gate` job, and `npm test` locally) chains lint, the dependency, no-sleep and Prisma gates, `test:unit`, and `gate:impl1`, which runs this trace check, the fitness functions and both red gates.*');
P();
P('| Test files | Vitest project / runner | Command | CI job | What the command requires |');
P('|---|---|---|---|---|');
const globs = { atdd: '`atdd/*.test.ts`', nfr: '`nfr/*.test.ts`', fitness: '`fitness/`, `fixtures/`', unit: '`src/**/*.test.ts`, `app/**/*.test.ts`', e2e: '`e2e/*.spec.ts` (Page Objects in `e2e/pages/`)', k6: '`nfr/k6/*.js`' };
for (const [k, r] of Object.entries(RUNNERS)) P(`| ${globs[k]} | ${r.project} | \`${r.command}\` | \`${r.job}\` | ${r.rule} |`);
P();
P('## 3. Gate summary');
P();
P('| Measure | Value |');
P('|---|---|');
P(`| FRs traced to a contract clause and a test | ${frRows.filter((r) => r.us.length && r.ts.length).length} / ${frs.length} |`);
P(`| FRs linked to a story | ${frRows.filter(({ fr }) => stories(fr.id).length).length} / ${frs.length} |`);
P(`| FRs also walked by a Playwright journey | ${frs.filter((f) => journeys.some((j) => j.traces.includes(f.id))).length} / ${frs.length} |`);
P(`| ADs of §14 with a test that turns red on violation | ${adRows.filter((r) => r.tests.length && r.tests.every((t) => tests.has(t))).length} / ${adRows.length} |`);
P(`| §14 ADs linked to a story | ${adRows.filter((r) => stories(...r.tests).length).length} / ${adRows.length} |`);
P(`| Risks registered (P0 / P1 / P2) | ${risks.length} (${by(risks, 'P0').length} / ${by(risks, 'P1').length} / ${by(risks, 'P2').length}) |`);
P(`| P0 risks linked to a story and a test | ${risks.filter((r) => r.priority === 'P0' && r.tests.length && stories(...r.tests).length).length} / ${by(risks, 'P0').length} |`);
P(`| MEC modules with a P0 risk and a MEC test | ${mecModules.length - problems.filter((p) => p.endsWith('no P0 risk with a MEC test')).length} / ${mecModules.length} |`);
P(`| NFRs with an evidence row (nfr-evidence.md) | ${nfrRows.filter((r) => r.ev).length} / ${nfrs.length} |`);
P(`| NFRs with a test | ${nfrRows.filter((r) => r.ts.length).length} / ${nfrs.length} |`);
const statusCounts = {};
for (const r of nfrRows) for (const s of uniq(r.ev?.parts ?? [])) statusCounts[s] = (statusCounts[s] ?? 0) + 1;
P(`| NFR evidence status (an NFR with two statuses counts under each) | ${STATUSES.filter((s) => statusCounts[s]).map((s) => `${s}: ${statusCounts[s]}`).join('; ')} |`);
P(`| Contract clauses | ${units.length} |`);
P(`| Test ids (Vitest) / enforced green / red | ${tests.size} / ${enforced} / ${tests.size - enforced} |`);
for (const k of ['atdd', 'nfr', 'fitness']) {
  const files = [...itCount.keys()].filter((f) => runnerOf(f) === k);
  P(`| \`${RUNNERS[k].project}\`: files / \`it\` blocks | ${files.length} / ${files.reduce((s, f) => s + itCount.get(f), 0)} |`);
}
P(`| Playwright journeys: specs / tests | ${journeys.length} / ${journeys.reduce((s, j) => s + j.titles.length, 0)} |`);
P(`| k6 scripts / scenarios | ${loads.length} / ${loads.reduce((s, l) => s + l.scenarios.length, 0)} |`);
P(`| Static check problems | ${problems.length} |`);
for (const p of problems) P(`| ✗ | ${p} |`);
P();
P('## 4. Functional requirements');
P();
P('*Tests are the bracketed ids of the contract clauses that bind the FR. Test files are the files of those ids and any Playwright journey whose `// Traces:` line names the FR. "Module tests" are the colocated unit and integration tests of the module that owns the FR, run by `test:unit`; the verdict does not depend on them.*');
P();
P('| FR | Requirement | Stories (status) | Tests | Automated test files | Module tests (`test:unit`) | CI evidence | State | Verdict |');
P('|---|---|---|---|---|---|---|---|---|');
for (const { fr, us, ts, st, v } of frV) {
  const files = uniq([...filesOf(ts), ...extraOf(fr.id)]);
  P(`| ${fr.id} | ${fr.title}${fr.caps.length ? ` (${fr.caps.join(', ')})` : ''}; clauses ${us.map((u) => u.id).join(', ') || '**none**'} | ${storyCell(st)} | ${ts.length}: ${code(ts, 3)} | ${fileCell(files)} | ${fileCell(moduleTests(fr.id).map((f) => path.posix.basename(f)))} | ${ciCell(files)} | ${stateCell(ts)} | ${v.cell} |`);
}
P();
P('## 5. Non-functional requirements');
P();
P('*An NFR is measured by the contract clauses that cite it and by the artifact that `nfr-evidence.md` names for it; its verdict takes that file\'s status (rule in §1). Tests count the NFR\'s own benchmarks, the evidence ids and the tests of the clauses that cite it.*');
P();
P('| NFR | Title | Category | Stories (status) | Evidence artifact | Tests | Automated test files | CI evidence | State | Evidence status | Verdict |');
P('|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of nfrV) {
  const files = uniq([...filesOf(r.ts), ...extraOf(r.n.id)]);
  P(`| ${r.n.id} | ${r.n.title} | ${r.ev?.category ?? '—'} | ${r.st.length ? storyCell(r.st) : '—'} | ${code(r.ev?.tests ?? [], 3)} | ${r.ts.length} | ${fileCell(files)} | ${ciCell(files)} | ${stateCell(r.ts)} | ${r.ev?.parts.join(', ') ?? '**none**'} | ${r.cell} |`);
}
P();
P('## 6. Risks (test-design.md §2)');
P();
P('| Risk | Priority | Module | Level | Tests | Automated test files | Stories (status) | CI evidence | State | Verdict |');
P('|---|---|---|---|---|---|---|---|---|---|');
for (const r of riskV) P(`| ${r.id} ${r.risk.length > 70 ? `${r.risk.slice(0, 67)}…` : r.risk} | ${r.priority} | ${r.module} | ${r.level} | ${code(r.tests, 4)}${r.k6 ? ', k6' : ''} | ${fileCell(r.files)} | ${storyCell(r.st)} | ${ciCell(r.files)} | ${stateCell(r.tests)} | ${r.v.cell} |`);
P();
P('## 7. Architecture decisions (contracts.md §14)');
P();
P('| AD | Invariant | Enforcement point | Tests that turn red on violation | Automated test files | Stories (status) | CI evidence | State | Verdict |');
P('|---|---|---|---|---|---|---|---|---|');
for (const r of adV) {
  const files = filesOf(r.tests);
  P(`| ${r.ad} | ${r.invariant} | ${r.enforcement.replace(/\|/g, '\\|')} | ${code(r.tests, 5)} | ${fileCell(files)} | ${storyCell(r.st)} | ${ciCell(files)} | ${stateCell(r.tests)} | ${r.v.cell} |`);
}
P();
P('## 8. Playwright journeys and k6 load');
P();
P('*Each journey proves that the pages wire together rules already proven below it (test-design.md §7.5, the ice-cream-cone rule), so it adds evidence to a requirement but no verdict depends on it alone. Traces: `npx playwright test --trace on` writes one `trace.zip` per test; the committed ones are in `evidence/impl2/traces/` (view one with `npx playwright show-trace <file>`). The configuration keeps `trace: \'on-first-retry\'`, so CI uploads a trace for any test that needed a retry.*');
P();
P('| Spec or script | Tests or scenarios | Requirements traced | Page Objects | CI evidence |');
P('|---|---|---|---|---|');
for (const j of journeys) P(`| \`${j.file}\` | ${j.titles.length}: ${j.titles.map((t) => `“${t.replace(/\\'/g, '\'')}”`).join('; ')} | ${j.traces.join(', ') || '—'} | ${j.pages.map((p) => `\`${p}\``).join(', ')} | ${ciCell([j.file])} |`);
for (const l of loads) P(`| \`${l.file}\` | ${l.scenarios.length} constant-arrival-rate scenarios: ${l.scenarios.map((s) => `\`${s}\``).join(', ')}; ${l.thresholds} thresholds | ${l.traces.join(', ')} | — | ${ciCell([l.file])} |`);
P();
P('## 9. Contract clauses');
P();
P('| Clause | Kind | FR | AD | Tests | State |');
P('|---|---|---|---|---|---|');
for (const u of units) { const ts = testsOf(u.id); P(`| ${u.id} | ${u.kind} | ${u.frs.join(', ') || '—'} | ${u.ads.slice(0, 4).join(', ') || '—'} | ${ts.length} | ${stateCell(ts)} |`); }
P();
P('## 10. Real run');
P();
const staticText = `${lines.join('\n')}\n`;

// ------------------------------------------------------------ the real-run section (one fresh run's reports)
function realRunBlock() {
  const R = [];
  const reportOf = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
  R.push('*One fresh run of the whole suite, read from the runners\' JSON reports (`.vitest-results/`, not committed) and the committed k6 summary. Regenerate after a run with `node scripts/gen-solu2-trace.mjs --real-run`; the vitest reports are written by `npx vitest run --project <name> --reporter=json --outputFile=.vitest-results/<name>.json` (the red gates write the `solu2-atdd` and `solu2-nfr` ones), the Playwright one by `npx playwright test`.*');
  R.push('');
  R.push('| Project | Report | Run started (UTC) | Files | Tests | Passed | Failed | Skipped / todo | Wall time |');
  R.push('|---|---|---|---|---|---|---|---|---|');
  for (const p of ['impl1-unit', 'solu2-atdd', 'solu2-nfr', 'solu2-fitness']) {
    const f = `.vitest-results/${p}.json`;
    const r = reportOf(f);
    if (!r) { R.push(`| \`${p}\` | \`${f}\` | no report | | | | | | |`); continue; }
    const end = Math.max(...r.testResults.map((t) => t.endTime ?? r.startTime));
    R.push(`| \`${p}\` | \`${f}\` | ${new Date(r.startTime).toISOString().slice(0, 19)} | ${r.testResults.length} | ${r.numTotalTests} | ${r.numPassedTests} | ${r.numFailedTests} | ${r.numPendingTests + r.numTodoTests} | ${((end - r.startTime) / 1000).toFixed(1)} s |`);
  }
  const pw = reportOf('.vitest-results/playwright.json');
  if (pw) {
    const specs = uniq((function walk(s) { return (s.suites ?? []).flatMap((x) => [x.file, ...walk(x)]).filter(Boolean); })(pw));
    R.push(`| Playwright (chromium) | \`.vitest-results/playwright.json\` | ${pw.stats.startTime.slice(0, 19)} | ${specs.length} | ${pw.stats.expected + pw.stats.unexpected + pw.stats.flaky + pw.stats.skipped} | ${pw.stats.expected} | ${pw.stats.unexpected} (flaky ${pw.stats.flaky}) | ${pw.stats.skipped} | ${(pw.stats.duration / 1000).toFixed(1)} s |`);
  } else R.push('| Playwright (chromium) | `.vitest-results/playwright.json` | no report | | | | | | |');
  R.push('');
  const k6 = reportOf(K6_SUMMARY);
  if (k6) {
    const m = k6.metrics;
    const breached = Object.entries(m).flatMap(([name, v]) => Object.entries(v.thresholds ?? {}).filter(([, failed]) => failed).map(([t]) => `${name} ${t}`));
    R.push(`**k6** (\`${K6_SUMMARY.replace(`${TESTS}/`, '')}\`, written by the last \`npm run nfr:k6\` run, decision log Impl-2 #22; ${breached.length ? `**thresholds breached: ${breached.join(', ')}**` : 'no threshold breached'}):`);
    R.push('');
    R.push('| Endpoint | Requests | med (ms) | p95 (ms) | p99 (ms) | Error rate | 5xx | Dropped iterations |');
    R.push('|---|---|---|---|---|---|---|---|');
    for (const e of ['profile', 'browse']) {
      const d = m[`http_req_duration{endpoint:${e}}`];
      if (!d) continue;
      R.push(`| \`${e}\` | ${m[`http_reqs{endpoint:${e}}`]?.count ?? '—'} | ${d.med.toFixed(1)} | ${d['p(95)'].toFixed(1)} | ${d['p(99)'].toFixed(1)} | ${((m[`http_req_failed{endpoint:${e}}`]?.value ?? 0) * 100).toFixed(2)} % | ${m[`server_errors_5xx{endpoint:${e}}`]?.count ?? '—'} | ${m[`dropped_iterations{scenario:${e}}`]?.count ?? 0} |`);
    }
    R.push('');
    R.push(`Checks: ${m.checks?.passes ?? 0} passed, ${m.checks?.fails ?? 0} failed, over ${m.iterations?.count ?? 0} iterations.`);
  } else R.push(`**k6:** no summary at \`${K6_SUMMARY}\`.`);
  return R.join('\n');
}
const current = fs.existsSync(OUT) ? read(OUT) : '';
const committedRun = current.includes(RUN_BEGIN) ? current.slice(current.indexOf(RUN_BEGIN) + RUN_BEGIN.length, current.indexOf(RUN_END)).replace(/^\n|\n$/g, '') : '*No real run recorded yet: run `node scripts/gen-solu2-trace.mjs --real-run` after a full run.*';
const withRun = (run) => `${staticText}${RUN_BEGIN}\n${run}\n${RUN_END}\n`;
const stripRun = (s) => (s.includes(RUN_BEGIN) ? s.slice(0, s.indexOf(RUN_BEGIN)) + s.slice(s.indexOf(RUN_END) + RUN_END.length + 1) : s);

const summary = `${frs.length} FRs, ${nfrs.length} NFRs, ${adRows.length} AD rows, ${risks.length} risks, ${units.length} clauses, ${tests.size} test ids (${enforced} enforced green), ${journeys.length} journeys, ${loads.length} k6 scripts; gate ${decision}; ${problems.length} problems`;
if (check) {
  if (stripRun(current) !== stripRun(withRun(''))) problems.push(`${OUT} is not current; run npm run gen:trace:solu2`);
  if (decision === 'FAIL') problems.push(`the gate decision is FAIL (§1 of ${OUT})`);
  console.log(`trace: ${summary}`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  process.exit(problems.length ? 1 : 0);
}
fs.writeFileSync(OUT, withRun(realRun ? realRunBlock() : committedRun));
console.log(`wrote ${OUT}${realRun ? ' (with the real-run section)' : ''}: ${summary}`);
for (const p of problems) console.log(`  ✗ ${p}`);
for (const f of failures) if (!f.startsWith('static check')) console.log(`  FAIL ${f}`);
for (const c of concerns) console.log(`  CONCERN ${c}`);
