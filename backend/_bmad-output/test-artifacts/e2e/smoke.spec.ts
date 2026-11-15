// E2E smoke (bmad-testarch-framework): the production build serves the app shell in es-CO, and the
// home page reads the readiness probe through the real database and its migrations.
// Each meaningful state is also scanned with axe-core for WCAG 2.x A / AA violations (NFR-SYS-11, decision log Impl-2 #33).
// Traces: NFR-SYS-3, NFR-SYS-11 (read by scripts/gen-solu2-trace.mjs into traceability-matrix.md).
import { expect, test } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';

test('a visitor opens TEZG and sees the service ready', async ({ page }) => {
  const home = new HomePage(page);
  await home.open();
  await expect(home.heading).toHaveText('TEZG');
  await expect(home.brandLink).toBeVisible();
  await expect(home.status).toHaveText('Servicio listo');
  await expect(home.document).toHaveAttribute('lang', 'es-CO');
  await home.expectNoA11yViolations();
});
