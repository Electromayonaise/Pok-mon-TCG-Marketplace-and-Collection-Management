// Hard rule 1 of the Solu-2 statement (§5) and AD-SYS-6 rule 1: every src/modules/*/domain/
// file imports only shared-kernel types/errors/decision, and never reads the wall clock,
// randomness, a database driver, the network or a web framework.
// Usage: node scripts/check-domain-purity.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const ALLOWED_IMPORT = /^\.\.\/\.\.\/\.\.\/shared-kernel\/(types|errors|decision|codes)\.js$|^\.\/[\w.-]+\.js$/;
const BANNED = [
  [/\bDate\.now\s*\(/, 'Date.now()'],
  [/\bnew Date\s*\(\s*\)/, 'new Date() without arguments'],
  [/\bperformance\.now\s*\(/, 'performance.now()'],
  [/\bMath\.random\s*\(/, 'Math.random()'],
  [/\bcrypto\.(randomUUID|getRandomValues|randomBytes)\b/, 'crypto randomness'],
  [/\bfetch\s*\(/, 'fetch()'],
  [/\b(now|current_timestamp|clock_timestamp)\s*\(\s*\)/i, 'SQL wall-clock function'],
];
let checked = 0;
const problems = [];
for (const host of fs.readdirSync(path.join(root, 'src/modules'))) {
  const dir = path.join(root, 'src/modules', host, 'domain');
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
    const file = path.join(dir, f);
    const src = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    checked++;
    const shown = path.relative(root, file).replace(/\\/g, '/');
    for (const m of src.matchAll(/\bfrom\s+'([^']+)'|\bimport\s*\(\s*'([^']+)'|\bimport\s+'([^']+)'/g)) {
      const spec = m[1] ?? m[2] ?? m[3];
      if (!ALLOWED_IMPORT.test(spec)) problems.push(`${shown}: imports '${spec}' (domain may import only shared-kernel types/errors/decision/codes)`);
    }
    for (const [re, what] of BANNED) if (re.test(src)) problems.push(`${shown}: uses ${what}`);
  }
}
for (const p of problems) console.log(p);
console.log(`${checked} domain files checked, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
