// Evidence checksums (Impl-2 statement, learning objective 7: a quality-gate sign-off "backed by cryptographic logs and
// test runner execution reports"; decision log Impl-2 #31). Writes `SHA256SUMS` over every file of the Impl-2 run
// evidence (the logs, `k6-summary.json`, `ci-runs.json`, `traces/*.zip`, `traces-ci/*.zip`), in the standard
// `sha256sum` format with paths relative to the evidence folder, so `sha256sum -c SHA256SUMS` run inside it verifies the
// same digests without Node.
//
// `--check` recomputes every digest and fails when a listed file changed or is missing, or when a file is not listed, so
// an edited log, a replaced trace or an evidence file added without its digest fails the gate. The files are checked
// out with LF on every OS (`.gitattributes`), so the digests are the same on Windows and in CI.
//
// `npm run nfr:k6` rewrites `k6-summary.json`: after a local k6 run, keep the new summary with `npm run gen:evidence`
// (and commit both), or restore the committed one with `git checkout -- <path>`.
//
// Usage: node scripts/evidence-sums.mjs           write SHA256SUMS
//        node scripts/evidence-sums.mjs --check   exit 1 on any difference
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DIR = '_bmad-output/test-artifacts/evidence/impl2';
const SUMS = 'SHA256SUMS';
const check = process.argv.includes('--check');

/** Every file under DIR except SHA256SUMS itself, as sorted paths relative to DIR with forward slashes. */
function evidenceFiles(rel = '') {
  return fs.readdirSync(path.join(DIR, rel), { withFileTypes: true })
    .flatMap((e) => {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) return evidenceFiles(p);
      return e.isFile() && p !== SUMS ? [p] : [];
    })
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

const digest = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, rel))).digest('hex');
const files = evidenceFiles();
const lines = files.map((f) => `${digest(f)}  ${f}`);

if (!check) {
  fs.writeFileSync(path.join(DIR, SUMS), `${lines.join('\n')}\n`);
  console.log(`evidence: wrote ${DIR}/${SUMS} over ${files.length} files`);
  process.exit(0);
}

const problems = [];
const sumsPath = path.join(DIR, SUMS);
if (!fs.existsSync(sumsPath)) problems.push(`${DIR}/${SUMS} is missing; run npm run gen:evidence`);
const listed = new Map();
if (fs.existsSync(sumsPath)) {
  for (const [i, line] of fs.readFileSync(sumsPath, 'utf8').split('\n').entries()) {
    if (line === '') continue;
    const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
    if (!m) { problems.push(`${SUMS}:${i + 1} is not a sha256sum line`); continue; }
    listed.set(m[2], m[1]);
  }
}
for (const [f, sum] of listed) {
  if (!fs.existsSync(path.join(DIR, f))) problems.push(`${f}: listed in ${SUMS} but missing`);
  else if (digest(f) !== sum) problems.push(`${f}: its SHA-256 differs from ${SUMS}`);
}
for (const f of files) if (!listed.has(f)) problems.push(`${f}: not listed in ${SUMS}; run npm run gen:evidence`);

console.log(`evidence: ${listed.size} files listed in ${DIR}/${SUMS}, ${files.length} on disk; ${problems.length} problems`);
for (const p of problems) console.log(`  ✗ ${p}`);
process.exit(problems.length ? 1 : 0);
