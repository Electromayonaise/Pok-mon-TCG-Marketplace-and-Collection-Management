// No-sleep gate (Impl-2 statement §5 checklist "Zero Flaky Sleeps", test-design.md §7.4, decision
// log Impl-2 #8). A test that waits on time proves a timing window, not a behaviour: it either
// flakes red on a slow machine or stays weakly green on a fast one. Every wait must be on a
// condition (a barrier, `untilBlockedOnLock`, a web-first assertion). It also keeps Playwright
// specs on their Page Objects: a spec may not build a locator itself.
//
// Like the fitness functions, each rule first proves it catches a planted violation, so a broken
// pattern cannot pass vacuously.
//
// Usage: node scripts/check-no-sleep.mjs   exit 1 on any finding
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src', 'app', 'test-support', 'scripts', '_bmad-output/test-artifacts', 'playwright.config.ts', 'vitest.config.ts'];
const SELF = new Set(['scripts/check-no-sleep.mjs']);
const CODE = /\.(?:[cm]?[jt]s|tsx)$/;

/** A planted violation, assembled at run time so the forbidden call never appears as literal text in the code (decision log Impl-2 #31). */
const planted = (...parts) => parts.join('');

/** Rules for every code file: [name, pattern, planted violation]. */
const SLEEPS = [
  ['waitForTimeout', /\bwaitForTimeout\s*\(/, planted('await page.waitFor', 'Timeout(500);')],
  ['time.sleep', /\btime\.sleep\s*\(/, planted('time.sl', 'eep(5)')],
  ['pg_sleep', /\bpg_sleep\s*\(/, planted("await tx.query('SELECT pg_sl", "eep(0.05)');")],
  ['sleep(n)', /(?<![\w.])sleep\s*\(\s*\d/, planted('sl', 'eep(5000);')],
  ['promise sleep', /setTimeout\s*\(\s*(?:resolve\b|\(\s*\)\s*=>\s*resolve\b)/, 'await new Promise((resolve) => setTimeout(resolve, 200));'],
  ['promise sleep (callback)', /new Promise\s*\(\s*\(?\s*\w+\s*\)?\s*=>\s*setTimeout\s*\(/, 'await new Promise((r) => setTimeout(r, 10));'],
];
/** Rules for Playwright specs only: selectors belong to Page Objects. */
const SPEC_ONLY = [
  ['locator in a spec', /\bpage\.(?:locator|getBy[A-Z]\w*|\$\$?|waitForSelector)\s*\(/, "await page.getByRole('button').click();"],
];

const problems = [];
for (const [name, re, planted] of [...SLEEPS, ...SPEC_ONLY]) if (!re.test(planted)) problems.push(`rule "${name}" does not catch its planted violation`);

function walk(p) {
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isFile()) return [p];
  return fs.readdirSync(p, { withFileTypes: true }).flatMap((e) => (e.name === 'node_modules' || e.name.startsWith('.') ? [] : walk(path.join(p, e.name))));
}

let checked = 0;
for (const file of ROOTS.flatMap(walk).map((f) => f.replace(/\\/g, '/')).filter((f) => CODE.test(f) && !SELF.has(f))) {
  checked++;
  const rules = /\.spec\.ts$/.test(file) ? [...SLEEPS, ...SPEC_ONLY] : SLEEPS;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    for (const [name, re] of rules) if (re.test(line)) problems.push(`${file}:${i + 1}: ${name} — ${line.trim().slice(0, 120)}`);
  });
}

console.log(`no-sleep: ${checked} files checked, ${SLEEPS.length + SPEC_ONLY.length} rules proven on planted violations, ${problems.length} problems`);
for (const p of problems) console.log(`  ✗ ${p}`);
process.exit(problems.length ? 1 : 0);
