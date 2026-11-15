// Sprint readiness audit (Solu-1 Exercise 4.2; decision log #18). Deterministic checks that a
// developer agent can implement the backlog without inventing a decision. Prints the
// IR-PASS / IR-FAIL box and exits 1 on IR-FAIL. Wired into bmad-sprint-planning through
// _bmad/custom/bmad-sprint-planning.toml (activation_steps_prepend).
// Usage: node scripts/readiness-audit.mjs --package docs/solu-2 [--no-tests] [--json <out>]
// Only the Solu-2 backlog remains; the Solu-1 audit was retired with its artifacts (git 853449c).
const args = process.argv.slice(2);
const pkg = args[args.indexOf('--package') + 1];
const runTests = !args.includes('--no-tests');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

if (pkg !== 'docs/solu-2') {
  console.error(`Unknown package: ${pkg}. The only backlog is docs/solu-2.`);
  process.exit(2);
}
// Solu-2 has its own story format and the statement's six checks (task statement §7).
const { auditSolu2 } = await import('./readiness-audit-solu2.mjs');
process.exit(await auditSolu2({ runTests, jsonOut }));
