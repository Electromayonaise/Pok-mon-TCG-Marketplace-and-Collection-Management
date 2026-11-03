// The Playwright web server (bmad-testarch-framework, decision log Impl-2 #10). So that
// `npx playwright test` is the one command, it starts the Compose Postgres (skipped in CI, which
// has a service container), recreates and migrates the dedicated `tezg_e2e` database, builds the
// app and serves the production build on E2E_PORT. Specs seed their own rows into `tezg_e2e`.
// Usage: node scripts/e2e-server.mjs   (Playwright's webServer runs it; see playwright.config.ts)
import { spawn, spawnSync } from 'node:child_process';

const port = process.env.E2E_PORT ?? '3100';

// One command string through the shell (npm and npx are .cmd shims on Windows); every argument is a literal.
function run(command) {
  const result = spawnSync(command, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`e2e-server: ${command} exited with ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

if (!/^\d+$/.test(port)) throw new Error(`E2E_PORT must be a port number, got ${port}`);
if (!process.env.CI) run('npm run db:up');
run('node scripts/db-migrate.mjs --reset');
if (!process.env.E2E_SKIP_BUILD) run('npx next build');

const server = spawn(`npx next start --port ${port} --hostname 127.0.0.1`, { stdio: 'inherit', shell: true });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
