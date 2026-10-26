// Solu-2 backlog generator (bmad-create-epics-and-stories, Phase 4). The human-authored source is
// _bmad-output/planning-artifacts/epics.source.mjs: per story its title, kind, description, the registry
// operations and red test ids it binds, its dependencies and its Gherkin. Every other field is
// derived here, so it cannot drift from the design:
//   Traceability     ← contracts.md (FRs, NFRs of each bound clause), test-design.md (risks), ui-states.json (pages)
//   Binding invariants ← contracts.md §14 rows whose red tests the story owns, plus the ADs its clauses cite
//   Files            ← operations.json (host module, service, method) and the generated layout
//   Schema/DTO       ← tables named by the bound clauses (that 001_tezg_schema.sql creates) and the registry DTOs
//   ATDD path        ← the file that defines each bound test id
//   DoD              ← the shared DoD, the MEC rule, and nfr-evidence.md rows "Planned — story DoD"
// It refuses to write when a test id or registry operation is unassigned or assigned twice, or a
// dependency points forward. `--check` fails if _bmad-output/planning-artifacts/epics.md is not current.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PLAN = '_bmad-output/planning-artifacts';
const TEST = '_bmad-output/test-artifacts';
const DD = `${PLAN}/detailed-design`;
const OUT = `${PLAN}/epics.md`;
const check = process.argv.includes('--check');
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const uniq = (xs) => [...new Set(xs)];
const ranged = (re, prefix) => (s) => uniq([...s.matchAll(re)].flatMap((m) => {
  const to = Number(m[3] ?? m[2]);
  return Array.from({ length: to - Number(m[2]) + 1 }, (_, i) => `${prefix}-${m[1]}-${Number(m[2]) + i}`);
}));
const FRS = ranged(/(?<![A-Z-])FR-([A-Z]+)-(\d+)(?:\.\.(\d+))?/g, 'FR');
const NFRS = ranged(/\bNFR-([A-Z]+)-(\d+)(?:\.\.(\d+))?/g, 'NFR');
const ADS = (s) => uniq([...s.matchAll(/\bAD-(?:\d+|[A-Z]+-\d+)\b/g)].map((m) => m[0]));
const IDS = (s) => uniq([...s.matchAll(/\[([A-Z][A-Za-z0-9.-]*\d[A-Za-z0-9.-]*)\]/g)].map((m) => m[1]));
const sortAd = (a, b) => a.localeCompare(b, 'en', { numeric: true });

const source = (await import(pathToFileURL(path.resolve(`${PLAN}/epics.source.mjs`)).href)).default;

// ------------------------------------------------------------ inputs
const prd = read('_bmad-output/planning-artifacts/prd.md');
const frTitles = new Map([...prd.matchAll(/^\*\*(FR-[A-Z]+-\d+) — ([^*]+?)\.?\*\*/gm)].map((m) => [m[1], m[2].trim()]));
const nfrTitles = new Map();
for (const m of prd.matchAll(/\*\*(NFR-[A-Z]+-\d+) ([^*]+?)\.?\*\*/g)) if (!nfrTitles.has(m[1])) nfrTitles.set(m[1], m[2].trim());
for (const m of prd.matchAll(/\*\*(NFR-[A-Z]+-\d+):\*\* ([^\n]+)/g)) if (!nfrTitles.has(m[1])) nfrTitles.set(m[1], m[2].replace(/`/g, '').split(/[,;.]\s/)[0].trim().slice(0, 90));

const contracts = read(`${DD}/contracts.md`);
const unitText = new Map();
for (const block of contracts.split(/^### Operation: /m).slice(1)) {
  const body = block.split(/^#{2,3} /m)[0];
  const head = /^\*([A-Z]{3}-\d+) · (.*)\*$/m.exec(body);
  if (head) unitText.set(head[1], { text: body, head: head[2] });
}
const s15 = contracts.slice(contracts.indexOf('## 15.'), contracts.indexOf('## 16.'));
for (const block of s15.split(/^- \*\*(?=S-FR-)/m).slice(1)) {
  const body = block.split(/^(?:- \*\*|#{2,3} )/m)[0];
  const id = /^(S-FR-[A-Z]+-\d+w?)/.exec(body)[1];
  unitText.set(id, { text: body, head: `${id.replace(/^S-/, '').replace(/w$/, '')} ${body.split('\n')[0]}` });
}
for (const row of s15.matchAll(/^\| ((?:S-FR-[A-Z]+-\d+w?|P-[A-Z]+|S-SYS|[A-Z]{3}-\d+)(?:\.[\w-]+)?) \|(.*)$/gm)) unitText.set(row[1], { text: row[2], head: row[2] });
/** The contract clause a registry or contract id resolves to: itself, else its base clause. */
const clauseOf = (id) => (unitText.has(id) ? id : /^(S-FR-[A-Z]+-\d+w?|[A-Z]{3}-\d+)/.exec(id)?.[1]);
const frsOf = (id) => {
  const c = clauseOf(id);
  if (!c) return [];
  const own = c.startsWith('S-FR-') ? [c.replace(/^S-(FR-[A-Z]+-\d+).*$/, '$1')] : [];
  const base = /^([A-Z]{3}-\d+)\./.exec(c)?.[1];
  return uniq([...own, ...FRS(unitText.get(c).head), ...(base && unitText.has(base) ? FRS(unitText.get(base).head) : [])]);
};
const nfrsOf = (id) => { const c = clauseOf(id); return c ? NFRS(unitText.get(c).head) : []; };
const adsOf = (id) => { const c = clauseOf(id); return c ? ADS(unitText.get(c).text) : []; };

const s14 = contracts.slice(contracts.indexOf('## 14.'), contracts.indexOf('## 15.'));
const adRows = [...s14.matchAll(/^\| ([^|]+) \| ([^|]*AD[^|]*) \| ([^|]+) \| ([^|]+) \|$/gm)]
  .filter((m) => m[1].trim() !== 'Invariant' && !/^-+$/.test(m[1].trim()))
  .map((m) => ({ invariant: m[1].trim(), ad: m[2].trim(), adIds: ADS(m[2]).length ? ADS(m[2]) : [m[2].trim()], enforcement: m[3].trim(), tests: IDS(m[4]) }));

const registry = JSON.parse(read(`${DD}/schemas/operations.json`));
const ops = new Map(registry.operations.map((o) => [o.id, o]));
const schema = read(`${DD}/schemas/001_tezg_schema.sql`);
const tables = new Set([...schema.matchAll(/^CREATE TABLE IF NOT EXISTS "?(\w+)"?/gm)].map((m) => m[1]));
const tablesIn = (text) => uniq([...text.matchAll(/"(\w+)"/g)].map((m) => m[1]).filter((t) => tables.has(t)));

const testFile = new Map();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.posix.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.test.ts')) for (const m of read(p).matchAll(/\bit(?:\.\w+)?\(\s*['"`]((?:\[[^\]]+\]\s*)+)/g)) for (const i of m[1].matchAll(/\[([^\]]+)\]/g)) testFile.set(i[1], p);
  }
})(TEST);

const risks = [...read(`${TEST}/test-design.md`).matchAll(/^\| (R-\d+) \| ([^|]+) \| ([^|]+) \| [^|]+ \| \d \| \d \| \d+ \| (P\d) \| [^|]+ \| ([^|]+) \| [^|]+ \|$/gm)]
  .map((m) => ({ id: m[1], priority: m[4], tests: IDS(m[5]) }));
const uiPages = Object.entries(JSON.parse(read(`${DD}/schemas/ui-states.json`)).pages).map(([page, p]) => ({ page, ops: p.ops ?? [], dev: !!p.dev }));
const plannedNfr = new Set([...read(`${TEST}/nfr-evidence.md`).matchAll(/^\| (NFR-[A-Z]+-\d+) \|.*Planned — story DoD.*\|$/gm)].map((m) => m[1]));

// ------------------------------------------------------------ assemble and validate
const problems = [];
const stories = [];
const opOwner = new Map();
const testOwner = new Map();
for (const epic of source.epics) {
  epic.stories.forEach((s, i) => {
    const id = `${epic.n}.${i + 1}`;
    const st = { ...s, id, epic };
    for (const o of s.ops ?? []) {
      if (!ops.has(o)) problems.push(`Story ${id}: ${o} is not a registry operation`);
      if (opOwner.has(o)) problems.push(`${o} is bound by Story ${opOwner.get(o)} and Story ${id}`);
      opOwner.set(o, id);
    }
    for (const t of s.tests) {
      if (!testFile.has(t)) problems.push(`Story ${id}: [${t}] is not a defined test`);
      if (testOwner.has(t)) problems.push(`[${t}] is bound by Story ${testOwner.get(t)} and Story ${id}`);
      testOwner.set(t, id);
    }
    for (const c of s.contracts ?? []) if (!clauseOf(c)) problems.push(`Story ${id}: ${c} is not a contract clause`);
    for (const d of s.depends ?? []) if (!stories.some((x) => x.id === d)) problems.push(`Story ${id} depends on Story ${d}, which is not earlier`);
    stories.push(st);
  });
}
for (const o of ops.keys()) if (!opOwner.has(o)) problems.push(`registry operation ${o} is bound by no story`);
for (const t of testFile.keys()) if (!testOwner.has(t)) problems.push(`[${t}] is bound by no story`);

// ------------------------------------------------------------ derive
for (const s of stories) {
  const units = uniq([...(s.ops ?? []), ...(s.contracts ?? [])]);
  s.frs = uniq(units.flatMap(frsOf)).sort(sortAd);
  s.nfrs = uniq([...units.flatMap(nfrsOf), ...s.tests.filter((t) => t.startsWith('NFR-')).map((t) => t.replace(/\.[^.]+$/, ''))]).sort(sortAd);
  s.risks = risks.filter((r) => r.tests.some((t) => s.tests.includes(t))).map((r) => `${r.id} (${r.priority})`);
  s.pages = uiPages.filter((p) => p.ops.some((o) => (s.ops ?? []).includes(o))).map((p) => (p.dev ? `${p.page} (dev)` : p.page));
  const rowHits = adRows.filter((r) => r.tests.some((t) => s.tests.includes(t)));
  s.bound = rowHits;
  s.adsBound = uniq(rowHits.flatMap((r) => r.adIds));
  s.adsCited = uniq(units.flatMap(adsOf)).filter((a) => !s.adsBound.includes(a)).sort(sortAd);
  s.tables = uniq(units.flatMap((u) => { const c = clauseOf(u); return c ? tablesIn(unitText.get(c).text) : []; })).sort();
  s.dtos = (s.ops ?? []).map((o) => ops.get(o)).filter(Boolean).map((o) => `\`${o.request}\` → \`${o.response}\``);
  const byFile = new Map();
  for (const o of (s.ops ?? []).map((x) => ops.get(x)).filter(Boolean)) {
    const mod = registry.modules[o.module];
    const app = mod.host === 'shared-kernel' ? `src/shared-kernel/${mod.file}.ts` : `src/modules/${mod.host}/application/${mod.file}.v2.ts`;
    byFile.set(app, uniq([...(byFile.get(app) ?? []), `${mod.service}ServiceV2.${o.method}`]));
    if (mod.host !== 'shared-kernel') {
      byFile.set(`src/modules/${mod.host}/ports/${mod.file}.v2.ts`, [`${mod.service}Repository`]);
      if (fs.existsSync(`src/modules/${mod.host}/domain/${mod.file}.ts`)) byFile.set(`src/modules/${mod.host}/domain/${mod.file}.ts`, []);
      byFile.set(`src/modules/${mod.host}/infra/pg.ts`, []);
    }
  }
  for (const f of s.files ?? []) byFile.set(f.path, f.symbols ?? []);
  s.fileList = [...byFile].map(([f, syms]) => `\`${f}\`${syms.length ? ` (${syms.map((x) => `\`${x}\``).join(', ')})` : ''}`);
  const tByFile = new Map();
  for (const t of s.tests) tByFile.set(testFile.get(t), [...(tByFile.get(testFile.get(t)) ?? []), t]);
  s.atdd = [...tByFile].map(([f, ts]) => `\`${f}\` › ${ts.map((t) => `\`[${t}]\``).join(', ')}`);
  s.dod = [
    `the ${s.tests.length} bound test${s.tests.length === 1 ? '' : 's'} pass, and \`npm run gate:atdd-red:solu2\` stays green with this story \`done\` in \`sprint-status.yaml\``,
    ...(s.kind === 'MEC' ? ['the MEC proof runs its full repetition count against Postgres with real connections, and its runtime is recorded in the story file (TG-7)'] : []),
    ...s.nfrs.filter((n) => plannedNfr.has(n)).map((n) => `${n}: add its benchmark next to \`${TEST}/nfr/ord1_latency.test.ts\` with the shared harness and assert the PRD threshold (\`nfr-evidence.md\`)`),
    ...(s.dod ?? []),
  ];
}

// ------------------------------------------------------------ write
const L = [];
const P = (x = '') => L.push(x);
const allFrs = [...frTitles.keys()];
const frStories = new Map(allFrs.map((f) => [f, stories.filter((s) => s.frs.includes(f)).map((s) => s.id)]));
for (const [f, ss] of frStories) if (!ss.length) problems.push(`${f} reaches no story`);
for (const s of stories) for (const f of s.frs) if (!frTitles.has(f)) problems.push(`Story ${s.id} traces ${f}, which the PRD does not define`);
for (const r of adRows) if (!stories.some((s) => s.bound.includes(r))) problems.push(`§14 ${r.ad}: no story owns one of its red tests`);
for (const e of source.epics.filter((x) => x.n > 1)) {
  const ss = stories.filter((s) => s.epic === e);
  if (ss.length < 3 || ss.length > 6) problems.push(`Epic ${e.n}: ${ss.length} stories (3–6 required)`);
  if (!ss.some((s) => s.kind === 'MEC')) problems.push(`Epic ${e.n}: no MEC story`);
  if (ss.filter((s) => s.kind === 'Failure-state').length < 2) problems.push(`Epic ${e.n}: fewer than 2 failure-state stories`);
}

P('---');
P('stepsCompleted: [1, 2, 3, 4]');
P('inputDocuments:');
for (const d of source.inputs) P(`  - ${d}`);
P('skill: bmad-create-epics-and-stories (John — PM, Amelia — Dev review)');
P('directed_by: Mateo Rubio');
P('---');
P();
P('<!-- GENERATED by scripts/gen-solu2-epics.mjs from _bmad-output/planning-artifacts/epics.source.mjs (npm run gen:epics:solu2). Edit the source, not this file. -->');
P();
P('# TEZG Solu-2 — Epic Breakdown');
P();
P('## Overview');
P();
for (const para of source.overview) { P(para); P(); }
P(`**Totals:** ${source.epics.length} epics and ${stories.length} stories. They bind ${opOwner.size} registry operations and ${testOwner.size} test ids, each to exactly one story, and trace ${allFrs.length}/${allFrs.length} PRD FRs.`);
P();
P('### Story format');
P();
P('Every story carries the Annex B fields, in this order:');
P();
for (const f of source.format) P(`- ${f}`);
P();
P('## Definition of Done (every story)');
P();
P('A story moves to `done` in `implementation-artifacts/sprint-status.yaml` only when all of these hold:');
P();
source.dod.forEach((d, i) => P(`${i + 1}. ${d}`));
P();
P('## Requirements Inventory');
P();
P('### Functional Requirements');
P();
P(`All ${allFrs.length} FRs of the Plan-2 PRD (\`_bmad-output/planning-artifacts/prd.md\`). The full text is in the PRD; the stories cite them by id.`);
P();
for (const [f, t] of frTitles) P(`- ${f}: ${t}`);
P();
P('### NonFunctional Requirements');
P();
P(`All ${nfrTitles.size} NFRs. Each has a metric, an artifact and a status in \`_bmad-output/test-artifacts/nfr-evidence.md\`.`);
P();
for (const [n, t] of nfrTitles) P(`- ${n}: ${t}`);
P();
P('### Additional Requirements');
P();
for (const a of source.additional) P(`- ${a}`);
P();
P('### UX Design Requirements');
P();
for (const u of source.ux) P(`- ${u}`);
P();
P('### FR Coverage Map');
P();
P('| FR | Stories |');
P('|---|---|');
for (const [f, ss] of frStories) P(`| ${f} | ${ss.join(', ') || '**none**'} |`);
P();
P('## Epic List');
P();
P('| Epic | Module | Goal | Stories | MEC story |');
P('|---|---|---|---|---|');
for (const e of source.epics) {
  const ss = stories.filter((s) => s.epic === e);
  P(`| ${e.n}. ${e.title} | ${e.module} | ${e.goal.split('. ')[0]}. | ${ss.length} | ${ss.filter((s) => s.kind === 'MEC').map((s) => s.id).join(', ') || '—'} |`);
}
P();
for (const e of source.epics) {
  P(`## Epic ${e.n}: ${e.title}`);
  P();
  P(e.goal);
  P();
  for (const s of stories.filter((x) => x.epic === e)) {
    P(`### Story ${s.id}: ${s.title}`);
    P();
    P(`- **Kind:** ${s.kind}`);
    P(`- **Description:** ${s.as}`);
    const proves = (s.contracts ?? []).filter((c) => !(s.ops ?? []).includes(c));
    const owned = (s.ops ?? []).map((u) => `\`${u}\` ${ops.get(u).method}`).join(', ') || '— (no registry operation of its own)';
    const alsoProves = proves.map((c) => `\`${c}\`${opOwner.has(c) ? ` (operation owned by Story ${opOwner.get(c)})` : ' (§15 clause)'}`).join(', ');
    P(`- **Contracts:** ${owned}${alsoProves ? ` · **Also proves:** ${alsoProves}` : ''}`);
    P(`- **Depends on:** ${(s.depends ?? []).map((d) => `Story ${d}`).join(', ') || 'none'}`);
    P(`- **Traceability:** ${[s.frs.join(', ') || 'FR: none (cross-cutting)', s.nfrs.join(', '), s.risks.length ? `Risk ${s.risks.join(', ')}` : '', s.pages.length ? `UI ${s.pages.join(', ')}` : ''].filter(Boolean).join(' · ')}`);
    P(`- **Binding invariants:** ${[...s.bound.map((r) => `${r.ad} — ${r.invariant} (${r.enforcement.replace(/\s+/g, ' ')})`), ...(s.adsCited.length ? [`also cited by its clauses: ${s.adsCited.join(', ')}`] : [])].join('; ') || 'none'}`);
    P(`- **Files:** ${s.fileList.join(', ') || '—'}`);
    P(`- **Schema/DTO:** ${[s.tables.length ? `tables ${s.tables.map((t) => `\`"${t}"\``).join(', ')}` : '', s.dtos.length ? `DTOs ${s.dtos.join(', ')}` : '', ...(s.schemaNote ? [s.schemaNote] : [])].filter(Boolean).join('; ') || '—'}`);
    P(`- **ATDD path:** ${s.atdd.join('; ')}`);
    P('- **Gherkin:**');
    P(`  - **Scenario (happy) — Given:** ${s.happy[0]} **When:** ${s.happy[1]} **Then:** ${s.happy[2]}`);
    P(`  - **Scenario (failure) — Given:** ${s.failure[0]} **When:** ${s.failure[1]} **Then:** ${s.failure[2]}`);
    P(`- **DoD:** the shared DoD, plus: ${s.dod.join('; ')}.`);
    P();
  }
}
const text = `${L.join('\n')}\n`;

if (problems.length) {
  console.log(`${problems.length} problems; ${OUT} not written`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  process.exit(1);
}
if (check) {
  const current = fs.existsSync(OUT) ? read(OUT) : '';
  if (current !== text) { console.log(`✗ ${OUT} is not current; run npm run gen:epics:solu2`); process.exit(1); }
  console.log(`${OUT} is current: ${source.epics.length} epics, ${stories.length} stories`);
  process.exit(0);
}
fs.writeFileSync(OUT, text);
console.log(`wrote ${OUT}: ${source.epics.length} epics, ${stories.length} stories, ${opOwner.size} operations, ${testOwner.size} tests, ${allFrs.length} FRs`);
