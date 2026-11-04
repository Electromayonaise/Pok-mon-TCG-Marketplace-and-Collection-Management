// E2E — Story 13.5, page 11.2 (Flow E, decision log Impl-2 #18): a visitor who never signs in opens a seller's public
// profile and reads the rating, the count and the first page of visible reviews; a review an admin hid is neither shown
// nor counted; an id that is no seller gets the es-CO Not-available page. The one-snapshot rule and the hide itself are
// proven below this level ([S-FR-REP-7.h], [S-FR-REP-7.C1]); this journey proves the public page wires them together.
// Traces: FR-REP-7, FR-REP-4 (read by scripts/gen-solu2-trace.mjs into traceability-matrix.md).
import { expect, test } from '@playwright/test';
import { SellerProfilePage } from './pages/SellerProfilePage.js';
import { HIDDEN_TEXT, NOBODY, SELLER, seedProfile, VISIBLE } from './support/profile-seed.js';

test.beforeEach(async () => {
  await seedProfile();
});

test('a visitor with no session reads Lucía’s rating and reviews, without the review moderation hid', async ({ page }) => {
  const profile = new SellerProfilePage(page, SELLER.id);
  await profile.open();
  await expect(profile.heading).toHaveText(SELLER.name);
  await expect(profile.kindLine).toHaveText('Vendedor individual');

  // The average of the two visible reviews (5 and 4), never of three: the hidden 1-star is not counted.
  await expect(profile.average('4,5 de 5')).toBeVisible();
  await expect(profile.summary).toContainText('2 reseñas · Las reseñas no están ligadas a compras');

  // The visible reviews, newest first, with their markers; the hidden one leaves no trace.
  await expect(profile.reviews).toHaveCount(2);
  await expect(profile.reviews).toContainText([`5 de 5${VISIBLE[0].text}`, `4 de 5${VISIBLE[1].text}`]);
  await expect(profile.reviews.nth(1)).toContainText('· editada');
  await expect(profile.text(HIDDEN_TEXT)).toHaveCount(0);
});

test('an id that is no seller shows the es-CO Not-available page', async ({ page }) => {
  const profile = new SellerProfilePage(page, NOBODY);
  await profile.open();
  await expect(profile.unavailable).toContainText('No encontramos este perfil.');
  await expect(profile.catalogLink).toBeVisible();
});
