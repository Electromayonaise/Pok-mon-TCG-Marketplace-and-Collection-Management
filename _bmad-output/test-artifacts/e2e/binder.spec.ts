// E2E — Story 11.5, pages 9.1 and 9.2 (Flow E, decision log Impl-2 #17): Julián signs in, opens his binder, switches
// its sort (the order changes, and a reload shows the same order), adds a promo card by an https link (it lands in a
// pocket with its "Agregado por enlace" badge) after an http:// link is refused on its field in es-CO. The rules
// themselves (the entryId tie-break, the link rule, R-28) are proven below this level (ATDD and the domain tests); this
// journey proves the pages wire them together.
// Each meaningful state is also scanned with axe-core for WCAG 2.x A / AA violations (NFR-SYS-11, decision log Impl-2 #33).
// Traces: FR-COL-3, FR-COL-5, FR-IDN-7, NFR-SYS-11 (read by scripts/gen-solu2-trace.mjs into traceability-matrix.md).
import { expect, test } from '@playwright/test';
import { AddLinkPage } from './pages/AddLinkPage.js';
import { BinderPage } from './pages/BinderPage.js';
import { CollectionsPage } from './pages/CollectionsPage.js';
import { SignInPage } from './pages/SignInPage.js';
import { BINDER, COLLECTOR, seedBinder } from './support/binder-seed.js';

test.beforeEach(async () => {
  await seedBinder();
});

test('Julián re-sorts his binder, the order survives a reload, and a promo added by an https link lands in a pocket after an http:// link is refused', async ({ page }) => {
  const signIn = new SignInPage(page);
  const binder = new BinderPage(page, BINDER.id);
  const addLink = new AddLinkPage(page, BINDER.id);
  const collections = new CollectionsPage(page);

  // Given he is not signed in, his binder sends him to sign in, and back to it once he has.
  await binder.open();
  await expect(signIn.heading).toHaveText('Ingresar');
  await signIn.signIn(COLLECTOR.email, COLLECTOR.password);
  await expect(binder.collectionHeading).toHaveText('Kanto 151 · 3 cartas');

  // His binder opens in the order he placed the cards by hand.
  await expect(binder.pockets).toHaveText([/^Pikachu/, /^Charizard ex/, /^Bulbasaur/]);
  await binder.expectNoA11yViolations();

  // When he sorts by name, the order changes; a reload shows the same order, because the sort is in the page's address.
  await binder.sortBy('Nombre');
  await expect(binder.pockets).toHaveText([/^Bulbasaur/, /^Charizard ex/, /^Pikachu/]);
  await page.reload();
  await expect(binder.pockets).toHaveText([/^Bulbasaur/, /^Charizard ex/, /^Pikachu/]);
  await expect(binder.sortSelect).toHaveValue('name');
  await binder.expectNoA11yViolations();

  // When he adds a promo with an http:// link, the link field shows the es-CO error, and what he typed is kept.
  await binder.addCardByLink();
  await expect(addLink.heading).toHaveText('Agregar carta');
  await addLink.expectNoA11yViolations();
  await addLink.addLink('http://promos.example/pikachu-evento', 'Pikachu promo (evento de tienda)');
  await expect(addLink.url).toHaveAccessibleDescription('El enlace debe empezar por https:// y tener menos de 2.048 caracteres.');
  await expect(addLink.url).toHaveAttribute('aria-invalid', 'true');
  await expect(addLink.title).toHaveValue('Pikachu promo (evento de tienda)');
  await addLink.expectNoA11yViolations();

  // When he fixes it to https://, the card lands in a pocket of his binder, with the link's domain on its badge.
  await addLink.addLink('https://promos.example/pikachu-evento', 'Pikachu promo (evento de tienda)');
  await expect(binder.notice).toHaveText('Agregaste Pikachu promo (evento de tienda) a «Kanto 151».');
  await expect(binder.pocket('Pikachu promo (evento de tienda)')).toContainText('Agregado por enlace · promos.example');
  await expect(binder.pockets).toHaveCount(4);
  await binder.expectNoA11yViolations();

  // His collections list shows the binder with its new count.
  await collections.open();
  await expect(collections.collection(BINDER.name)).toContainText('4 cartas');
  await collections.expectNoA11yViolations();
});
