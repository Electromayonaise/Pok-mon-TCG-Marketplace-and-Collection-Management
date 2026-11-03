// E2E smoke (bmad-testarch-framework): the production build serves the app shell in es-CO, and the
// home page reads the readiness probe through the real database and its migrations.
import { expect, test } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';

test('a visitor opens TEZG and sees the service ready', async ({ page }) => {
  const home = new HomePage(page);
  await home.open();
  await expect(home.heading).toHaveText('TEZG');
  await expect(home.brandLink).toBeVisible();
  await expect(home.status).toHaveText('Servicio listo');
  await expect(home.document).toHaveAttribute('lang', 'es-CO');
});
