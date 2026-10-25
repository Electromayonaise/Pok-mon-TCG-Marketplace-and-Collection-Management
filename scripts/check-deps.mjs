// Dependency gate (Impl-1 statement §4.2–4.3): every manifest entry is pinned to an exact version
// and is on the approved list below, and `npm audit --omit=dev` finds nothing high or critical.
// The list is the Solu-2 Stack Decisions (docs/solu-2/planning/ARCHITECTURE.md, "SD-n") plus the
// Impl-1 decision log (docs/impl-1/ai-log/ai-decision-log.md, "#n"); adding a package means a
// log entry first, then a line here.
//
// Usage: node scripts/check-deps.mjs   exit 1 on any finding
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const APPROVED = {
  '.': {
    typescript: 'SD-1 (TypeScript 7.0.2)',
    '@types/node': 'SD-1 (Node.js 22)',
    '@paralleldrive/cuid2': 'SD-1 (cuid2 ids)',
    '@trpc/server': 'SD-1 (tRPC 11)',
    next: 'Plan-2 ARCHITECTURE stack (Next.js 16 App Router), Impl-1 statement §4.2',
    react: 'peer of next',
    'react-dom': 'peer of next',
    '@types/react': 'types for react',
    zod: 'Impl-1 statement §4.2 (procedure inputs)',
    'better-auth': 'R-12, Impl-1 statement §4.2',
    pg: 'SD-2 (PostgreSQL through pg)',
    '@types/pg': 'types for pg',
    prisma: 'SD-2 (generated Prisma model), #6, #8 (7.10)',
    '@prisma/client': 'SD-2, #6, #8',
    '@prisma/adapter-pg': '#6 (Better Auth over the pg pool), #8',
    vitest: 'SD-5 (Vitest 5.0.5)',
    'fast-check': 'SD-5 (fast-check 4.10.2)',
  },
  'tools/lint': {
    eslint: '#7',
    '@eslint/js': '#7',
    'typescript-eslint': '#7',
    typescript: '#7 (parser only, 5.9)',
  },
};

const EXACT = /^\d+\.\d+\.\d+$/;
const problems = [];
let checked = 0;

for (const [dir, approved] of Object.entries(APPROVED)) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const [name, version] of Object.entries(manifest[field] ?? {})) {
      checked++;
      const where = `${dir}/package.json ${field}.${name}`;
      if (!EXACT.test(version)) problems.push(`${where}: "${version}" is not an exact version`);
      if (!(name in approved)) problems.push(`${where}: not on the approved list (add a decision-log entry first)`);
    }
  }

  const audit = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--omit=dev', '--json'], { cwd: dir, encoding: 'utf8', shell: process.platform === 'win32' });
  let report;
  try {
    report = JSON.parse(audit.stdout);
  } catch {
    problems.push(`${dir}: npm audit did not return JSON (${(audit.stderr || audit.stdout).trim().split('\n')[0]})`);
    continue;
  }
  if (report.error) {
    problems.push(`${dir}: npm audit failed (${report.error.summary ?? report.error.code})`);
    continue;
  }
  for (const [name, v] of Object.entries(report.vulnerabilities ?? {})) {
    if (v.severity === 'high' || v.severity === 'critical') problems.push(`${dir}: ${v.severity} vulnerability in ${name} (${v.range})`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`${checked} dependencies in ${Object.keys(APPROVED).length} manifests: exact, approved, no high or critical advisory`);
