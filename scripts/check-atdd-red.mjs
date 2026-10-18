// Red-for-the-right-reason gate (Solu-2 §6, Solu-1 Phase 3): runs one ATDD project with the
// JSON reporter and fails unless EVERY test failed and every failure names NotImplemented.
// A test that passes (tautology or premature implementation) or fails for another reason
// (broken Given step, wrong fixture, harness error) is reported with its file and title.
// Usage: node scripts/check-atdd-red.mjs <vitest-project> [minimumTestCount]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const project = process.argv[2];
const minimum = Number(process.argv[3] ?? 1);
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
const wrong = [];
for (const file of report.testResults) {
  const name = file.name.split(/[\\/]/).slice(-2).join('/');
  if (file.assertionResults.length === 0) wrong.push(`${name}: file failed to load — ${(file.message ?? '').split('\n')[0]}`);
  for (const t of file.assertionResults) {
    total++;
    const message = (t.failureMessages ?? []).join('\n');
    if (t.status !== 'failed') wrong.push(`${name} › ${t.title}: status ${t.status} (a red test must fail)`);
    else if (!/NotImplemented/.test(message)) wrong.push(`${name} › ${t.title}: failed for another reason — ${message.split('\n')[0]}`);
  }
}
console.log(`${project}: ${total} tests in ${report.testResults.length} files; ${total - wrong.length} red for the right reason; ${wrong.length} not`);
for (const w of wrong) console.log(`  ✗ ${w}`);
if (total < minimum) console.log(`  ✗ expected at least ${minimum} tests`);
process.exit(wrong.length === 0 && total >= minimum ? 0 : 1);
