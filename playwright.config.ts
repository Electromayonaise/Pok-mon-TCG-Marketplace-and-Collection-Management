// Playwright E2E (Flow E; bmad-testarch-framework, decision log Impl-2 #2, #10). One command,
// `npx playwright test`, starts Postgres, a fresh `tezg_e2e` database and a production build, then
// runs the journeys in `_bmad-output/test-artifacts/e2e/`:
//   - specs reach the DOM only through Page Objects (`e2e/pages/`), and gate:no-sleep refuses a
//     locator or a timed wait in a spec;
//   - assertions are web-first (`await expect(locator)…`), which retry until `expect.timeout`;
//   - `trace: 'on-first-retry'` packages a trace.zip (DOM snapshots, network, console) for any
//     test that needed a retry, and the CI job uploads it.
// The journeys share one database, so they run serially; each spec seeds the rows it reads.
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgresql://tezg:tezg@127.0.0.1:55432/tezg_e2e';

export default defineConfig({
  testDir: '_bmad-output/test-artifacts/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }], ['json', { outputFile: '.vitest-results/playwright.json' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: `${baseURL}/api/health/ready`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: 'pipe',
    env: {
      E2E_PORT: String(port),
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'e2e-only-secret-not-for-any-deployed-environment',
      BETTER_AUTH_URL: baseURL,
      IP_HMAC_KEY: process.env.IP_HMAC_KEY ?? 'e2e-only-ip-hmac-key-not-for-any-deployed-environment',
      JOBS_SECRET: process.env.JOBS_SECRET ?? 'e2e-only-jobs-secret-not-for-any-deployed-environment',
    },
  },
});
