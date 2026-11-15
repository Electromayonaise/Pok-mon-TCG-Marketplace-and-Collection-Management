// The demo server: the app in development mode on its own port, against the demo accounts that
// `npx playwright test` seeds into `tezg_e2e`. It never collides with `npm run dev` or `docker compose up`
// (3000), the E2E server (3100) or k6 (3200), and it sets BETTER_AUTH_URL to its own origin: Better Auth
// refuses a sign-in whose Origin differs from BETTER_AUTH_URL ("Invalid origin", 403).
// Usage: npm run demo          (http://localhost:4000)
//        DEMO_PORT=4100 npm run demo
import { spawn, spawnSync } from 'node:child_process';
import pg from 'pg';

const port = process.env.DEMO_PORT ?? '4000';
const databaseUrl = process.env.DEMO_DATABASE_URL ?? 'postgresql://tezg:tezg@127.0.0.1:55432/tezg_e2e';
const origin = `http://localhost:${port}`;

if (!/^\d+$/.test(port)) throw new Error(`DEMO_PORT must be a port number, got ${port}`);

const up = spawnSync('npm run db:up', { stdio: 'inherit', shell: true });
if (up.status !== 0) {
  console.error('demo: could not start PostgreSQL (npm run db:up); is Docker running?');
  process.exit(up.status ?? 1);
}

// The demo needs the accounts the E2E journeys seed; without them every sign-in fails as a wrong password.
const client = new pg.Client({ connectionString: databaseUrl });
let accounts = 0;
try {
  await client.connect();
  const { rows } = await client.query(`SELECT count(*)::int AS n FROM "User" WHERE email IN ('julian.e2e@tezg.test', 'camila.e2e@tezg.test')`);
  accounts = rows[0].n;
} catch {
  accounts = 0;
} finally {
  await client.end().catch(() => {});
}
if (accounts < 2) {
  console.error('demo: the demo accounts are missing (PostgreSQL runs on tmpfs, so a restart wipes them).');
  console.error('demo: run `npx playwright test` once to seed them, then `npm run demo` again.');
  process.exit(1);
}

console.log(`demo: ${origin}  ·  julian.e2e@tezg.test / clave-segura-de-julian  ·  camila.e2e@tezg.test / clave-segura-de-camila`);
const server = spawn(`npx next dev --port ${port}`, {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DATABASE_URL: databaseUrl, BETTER_AUTH_URL: origin },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
