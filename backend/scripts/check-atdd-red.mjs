// Red-for-the-right-reason gate. Runs one ATDD project with the JSON reporter.
// A test of a contract whose story is not yet `done` must FAIL, and its failure must name
// NotImplemented: a pass is a tautology or a premature implementation, and another failure
// reason is a broken Given step, fixture or harness. A test of a contract whose story IS
// `done` in sprint-status.yaml must PASS (review F-5), so implementing a story never breaks
// the gate. Without --status every story counts as not done.
// Usage: node scripts/check-atdd-red.mjs <vitest-project> [minimumTestCount]
//          [--status <sprint-status.yaml> --epics <epics.md>]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);
const project = argv[0];
const minimum = Number(argv[1] && !argv[1].startsWith('--') ? argv[1] : 1);
const statusFile = flag('--status');
const epicsFile = flag('--epics');

/**
 * What `done` stories cover: story key (bmad-sprint-planning rule) → status. Solu-1 stories name
 * contracts (`Contract Reference`), matched to describe titles; Solu-2 stories name test ids
 * (`ATDD path`), matched to the bracketed ids of a test title.
 */
function doneScope() {
  const scope = { contracts: new Set(), ids: new Set() };
  if (!statusFile || !epicsFile || !fs.existsSync(statusFile)) return scope;
  const status = new Map();
  for (const m of fs.readFileSync(statusFile, 'utf8').matchAll(/^\s+([\w-]+):\s*([\w-]+)\s*$/gm)) status.set(m[1], m[2]);
  let key = null;
  for (const line of fs.readFileSync(epicsFile, 'utf8').split(/\r?\n/)) {
    const s = line.match(/^### Story (\d+)\.(\d+): (.+)$/);
    if (s) {
      const slug = s[3].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      key = `${s[1]}-${s[2]}-${slug}`;
      continue;
    }
    if (!key || status.get(key) !== 'done') continue;
    const ref = line.match(/^- \*\*Contract Reference:\*\*(.*)$/);
    if (ref) for (const c of ref[1].matchAll(/`(\w+)`/g)) scope.contracts.add(c[1]);
    const atdd = line.match(/^- \*\*ATDD path:\*\*(.*)$/);
    if (atdd) for (const i of atdd[1].matchAll(/`\[([^\]]+)\]`/g)) scope.ids.add(i[1]);
  }
  return scope;
}
const { contracts: done, ids: doneIds } = doneScope();
if (!project) {
  console.error('usage: node scripts/check-atdd-red.mjs <vitest-project> [minimumTestCount]');
  process.exit(2);
}
const out = `.vitest-results/${project}.json`;
fs.mkdirSync('.vitest-results', { recursive: true });
spawnSync('npx', ['vitest', 'run', '--project', project, '--reporter=json', `--outputFile=${out}`], { stdio: 'ignore', shell: true });
if (!fs.existsSync(out)) {
  console.error(`no report written to ${out}: the run did not start`);
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(out, 'utf8'));

let total = 0;
let greenDone = 0;
const wrong = [];
for (const file of report.testResults) {
  const name = file.name.split(/[\\/]/).slice(-2).join('/');
  if (file.assertionResults.length === 0) wrong.push(`${name}: file failed to load — ${(file.message ?? '').split('\n')[0]}`);
  for (const t of file.assertionResults) {
    total++;
    const contract = (t.ancestorTitles ?? []).join(' ').match(/— (\w+) \(/)?.[1];
    const message = (t.failureMessages ?? []).join('\n');
    const titleIds = [...(t.title.match(/^(?:\[[^\]]+\]\s*)+/)?.[0] ?? '').matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
    const doneBy = contract && done.has(contract) ? contract : titleIds.find((i) => doneIds.has(i));
    if (doneBy) {
      if (t.status === 'passed') greenDone++;
      else wrong.push(`${name} › ${t.title}: the story binding ${doneBy} is done, so this test must pass — ${message.split('\n')[0]}`);
    } else if (t.status !== 'failed') wrong.push(`${name} › ${t.title}: status ${t.status} (a red test must fail)`);
    else if (!/NotImplemented/.test(message)) wrong.push(`${name} › ${t.title}: failed for another reason — ${message.split('\n')[0]}`);
  }
}
console.log(
  `${project}: ${total} tests in ${report.testResults.length} files; ${total - wrong.length - greenDone} red for the right reason; ` +
    `${greenDone} green for done stories (${done.size + doneIds.size} contracts or test ids done); ${wrong.length} not as expected`,
);
for (const w of wrong) console.log(`  ✗ ${w}`);
if (total < minimum) console.log(`  ✗ expected at least ${minimum} tests`);
process.exit(wrong.length === 0 && total >= minimum ? 0 : 1);
