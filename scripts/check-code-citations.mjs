// Checks every "`Code` (HTTP nnn, owner)" citation in a markdown file against the code
// registry in src/shared-kernel/codes.ts: the code must exist, the HTTP status must be the
// one its tRPC family maps to (AD-SYS-1), and the owner, when stated, must match.
// Usage: node scripts/check-code-citations.mjs <file.md> [...]
import fs from 'node:fs';

const registry = fs.readFileSync(new URL('../src/shared-kernel/codes.ts', import.meta.url), 'utf8');
const codes = new Map();
for (const m of registry.matchAll(/^\s+(\w+): \{ owner: '([\w-]+)', trpc: '(\w+)' \}/gm)) {
  codes.set(m[1], { owner: m[2], trpc: m[3] });
}
const HTTP = { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, BAD_REQUEST: 400, CONFLICT: 409, TOO_MANY_REQUESTS: 429 };

let checked = 0;
let problems = 0;
for (const file of process.argv.slice(2)) {
  const text = fs.readFileSync(file, 'utf8');
  // Matches both "`Code` (HTTP 409, owner)" and "(`Code`, HTTP 409, owner".
  for (const m of text.matchAll(/`(\w+)`(?:\s*\(|,\s*)HTTP (\d{3})(?:,\s*(?:owner\s+)?([\w-]+))?/g)) {
    const [, code, status, owner] = m;
    if (code === 'Unexpected' || code in HTTP) continue; // 'Unexpected' and family names are not codes
    checked++;
    const entry = codes.get(code);
    const line = text.slice(0, m.index).split('\n').length;
    if (!entry) {
      console.log(`${file}:${line} ${code} is not in the registry`);
      problems++;
      continue;
    }
    if (HTTP[entry.trpc] !== Number(status)) {
      console.log(`${file}:${line} ${code} cites HTTP ${status}; family ${entry.trpc} is ${HTTP[entry.trpc]}`);
      problems++;
    }
    if (owner && owner !== entry.owner) {
      console.log(`${file}:${line} ${code} cites owner ${owner}; registry owner is ${entry.owner}`);
      problems++;
    }
  }
}
console.log(`${checked} code citations checked, ${problems} problems`);
process.exit(problems === 0 ? 0 : 1);
