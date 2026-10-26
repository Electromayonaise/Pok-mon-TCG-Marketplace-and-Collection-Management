// Fixture proof — `seed_marketplace` reproduces the PRD §3 Reference Seed Profile exactly, on
// the Solu-2 schema with every CHECK enforced. GREEN, and must stay green: the NFR benchmarks
// in _bmad-output/test-artifacts/nfr/ measure against this data.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../test-support/db.js';
import { seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';

const db = useTestDatabase();

describe('seed_marketplace — PRD §3 reference profile', () => {
  it('[SEED.profile] every PRD §3 dimension has its stated count', async () => {
    const s = await seedMarketplace(db);
    expect(s).toMatchObject({
      // Catalog: 10,000 entries, 50 sets, 5 eras; ≥ 90 days of prices for 2,000; 300 never priced.
      catalogEntries: 10_000, sets: 50, eras: 5, entriesWith90Days: 2_000, entriesWithoutPrice: 300,
      // FX: 90 days less one weekend (2 days) and one missing business day.
      fxRows: 87,
      // Accounts: 300 users; 3 admins; 60 complete individual sellers; 14 businesses; 5 unverified buyers.
      users: 300, admins: 3, individualSellers: 60, businesses: 14, unverifiedEmails: 5,
      // Listings: 1,500 (≈1,000 individual), 60 bundles, 120 sealed, 40 shared units, 25 hidden, 10 withdrawn, 5 bad locations.
      listings: 1_500, individualListings: 1_000, bundles: 60, sealedListings: 120, sharedUnits: 40, hiddenListings: 25, withdrawnListings: 10, badLocations: 5,
      // Orders: 200, of which 10 unpaid past the expiry window and not yet materialized.
      orders: 200, overdueUnpaidOrders: 10,
      // Commission: 8 accounts, 6 funded (plus one at zero and one negative).
      commissionAccounts: 8, fundedAccounts: 6,
      // Trades: 50 offers; 3 last-unit listings with competing open offers.
      tradeOffers: 50, lastUnitContests: 3,
      // Collections: 300 across 120 users; one of 500 entries with 20 link-added; 150 wishlist entries.
      collections: 300, collectionOwners: 120, largestCollection: 500, linkAddedEntries: 20, wishlistEntries: 150,
      // Reviews: 400, 15 hidden.
      reviews: 400, hiddenReviews: 15,
    });
  }, 120_000);

  it('[SEED.business-history] the three rejected businesses carry the three PRD rejection shapes, and biz0 re-applied after a rejection', async () => {
    await seedMarketplace(db);
    const apps = await db.query<{ businessId: string; status: string; reasonCode: string | null; barred: boolean; cooldownOpen: boolean | null }>(
      `SELECT "businessId", status, "rejectionReasonCode" AS "reasonCode", "reapplyBarred" AS barred,
              CASE WHEN "reapplyNotBefore" IS NULL THEN NULL ELSE "reapplyNotBefore" > $1 END AS "cooldownOpen"
       FROM "BusinessApplication" WHERE status = 'Rejected' ORDER BY "businessId", "submittedAt"`, ['2026-10-01T15:00:00.000Z']);
    expect(apps.map((a) => [a.reasonCode, a.barred, a.cooldownOpen])).toEqual([
      ['DataMismatch', false, false], // biz0's first application, followed by its Approved one
      ['DataMismatch', false, true], // cooldown expires at T0 + 3 days
      ['DataMismatch', false, false], // cooldown already expired
      ['FraudSuspected', true, null], // barred
    ]);
  }, 120_000);
});
