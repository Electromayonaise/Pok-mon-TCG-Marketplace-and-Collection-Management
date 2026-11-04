// `npm run nfr:k6` — the k6 load run of Flow D (Story 13.5, decision log Impl-2 #18 and #21; test-design.md §7.4).
// One command, locally and in CI: it starts the Compose Postgres (skipped in CI, which has a service container),
// recreates and migrates the dedicated `tezg_k6` database, seeds it with the PRD §3 marketplace through the `k6-seed`
// Vitest project (whose one test also proves the seed's counts), builds the app (skipped with E2E_SKIP_BUILD) and
// serves the production build on port 3200, waits for Next's "Ready" line, runs grafana/k6 in Docker against it (a
// fixed arrival rate per endpoint, decision log Impl-2 #21), stops the server and exits with k6's code, which is
// non-zero when a threshold of _bmad-output/test-artifacts/nfr/k6/reputation-profile.js fails (latency, errors, 5xx
// or dropped iterations).
// Usage: npm run nfr:k6
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const PORT = '3200';
const K6_IMAGE = 'grafana/k6:1.4.2';
const DATABASE_URL = process.env.K6_DATABASE_URL ?? 'postgresql://tezg:tezg@127.0.0.1:55432/tezg_k6';
const SCRIPT_DIR = path.join(ROOT, '_bmad-output/test-artifacts/nfr/k6');
const OUT_DIR = path.join(ROOT, '_bmad-output/test-artifacts/evidence/impl2');
const linux = process.platform === 'linux';

/** One command through the shell (npm and npx are .cmd shims on Windows); every argument is a literal. */
function run(command, env = {}) {
  console.log(`nfr-k6: $ ${command}`);
  const result = spawnSync(command, { stdio: 'inherit', shell: true, cwd: ROOT, env: { ...process.env, ...env } });
  if (result.status !== 0) {
    console.error(`nfr-k6: ${command} exited with ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

const appEnv = {
  DATABASE_URL,
  NODE_ENV: 'production',
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'k6-only-secret-not-for-any-deployed-environment',
  BETTER_AUTH_URL: `http://127.0.0.1:${PORT}`,
  IP_HMAC_KEY: process.env.IP_HMAC_KEY ?? 'k6-only-ip-hmac-key-not-for-any-deployed-environment',
  JOBS_SECRET: process.env.JOBS_SECRET ?? 'k6-only-jobs-secret-not-for-any-deployed-environment',
};

if (!process.env.CI) run('npm run db:up');
run('node scripts/db-migrate.mjs --reset', { DATABASE_URL });
run('npx vitest run --project k6-seed', { K6_DATABASE_URL: DATABASE_URL });
if (!process.env.E2E_SKIP_BUILD) run('npx next build');

/** Starts `next start` and resolves once it prints its "Ready" line; rejects if it exits first. */
function startServer() {
  // Its own process group outside Windows, so stop() reaches next under the shell and npx.
  const server = spawn(`npx next start --port ${PORT} --hostname 0.0.0.0`, {
    shell: true, cwd: ROOT, env: { ...process.env, ...appEnv }, stdio: ['ignore', 'pipe', 'inherit'], detached: process.platform !== 'win32',
  });
  return new Promise((resolve, reject) => {
    let ready = false;
    server.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      if (!ready && /\bReady\b/.test(chunk.toString())) {
        ready = true;
        resolve(server);
      }
    });
    server.on('exit', (code) => { if (!ready) reject(new Error(`next start exited with ${code} before it was ready`)); });
  });
}

/** Stops the server and its children (the shell, npx and node on Windows; the process group elsewhere). */
function stop(server) {
  if (server.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync(`taskkill /pid ${server.pid} /T /F`, { shell: true, stdio: 'ignore' });
  else process.kill(-server.pid, 'SIGTERM');
}

const server = await startServer();
let status = 1;
try {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Linux (CI) reaches the host's port on the host network; Docker Desktop (Windows, macOS) through host.docker.internal.
  const baseUrl = linux ? `http://127.0.0.1:${PORT}` : `http://host.docker.internal:${PORT}`;
  const args = [
    'run', '--rm',
    ...(linux ? ['--network', 'host', '--user', `${process.getuid()}:${process.getgid()}`] : []),
    '-v', `${SCRIPT_DIR}:/scripts:ro`,
    '-v', `${OUT_DIR}:/out`,
    '-e', `BASE_URL=${baseUrl}`,
    K6_IMAGE, 'run', '--summary-export', '/out/k6-summary.json', '/scripts/reputation-profile.js',
  ];
  console.log(`nfr-k6: $ docker ${args.join(' ')}`);
  // No shell: the paths go to Docker as they are, never rewritten by an MSYS shell on Windows.
  const k6 = spawnSync('docker', args, { stdio: 'inherit', cwd: ROOT, env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
  status = k6.status ?? 1;
} finally {
  stop(server);
}
console.log(`nfr-k6: k6 exited with ${status}`);
process.exit(status);
