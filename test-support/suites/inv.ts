// The shared Given steps of the InvServiceV2 integration tests (src/modules/listings/application/inv.v2-*.test.ts),
// moved verbatim out of one 429-line file by the Impl-2 test review (HIGH-3). Call it once at the top of a test file.
import { CatServiceV2 } from '../../src/modules/catalog/index.js';
import { IdnServiceV2 } from '../../src/modules/identity/index.js';
import { InvServiceV2 } from '../../src/modules/listings/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../src/shared-kernel/external.js';
import type { TransactionRunner } from '../../src/shared-kernel/ports.js';
import { useTestDatabase } from '../db.js';
import { fake, id, purchasableListing, T0, wiring } from '../solu2/fixtures.js';

export function useInvSuite() {
  const db = useTestDatabase();

  /** INV composed as the composition root binds it: the real identity and catalog. */
  function inventory(transactions: TransactionRunner = db.transactions) {
    const w = { ...wiring(db), transactions };
    const catalog = new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });
    return new InvServiceV2({ ...w, catalog, identity: new IdnServiceV2(w) });
  }
  const andres = (quantity: number) => purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity });

  /** `n` moderation-log rows of andres's listing, two per minute from T0: hide and unhide alternate, every fourth Counterfeit. */
  async function moderationLog(n: number): Promise<void> {
    for (let i = 0; i < n; i++) {
      await db.query(
        `INSERT INTO "ListingModerationLog" (id, "listingId", action, "reasonCode", note, "adminId", "titleSnapshot", "sellerId", "createdAt")
         VALUES ($1, $2, $3, $4, NULL, $5, 'Charizard ex', $6, $7)`,
        [id(`lg${String(i).padStart(2, '0')}`), id('lchar'), i % 2 === 0 ? 'hide' : 'unhide', i % 4 === 0 ? 'Counterfeit' : 'Spam', id('admin'), id('andres'), new Date(Date.parse(T0) + Math.floor(i / 2) * 60_000).toISOString()],
      );
    }
  }

  return { db, inventory, andres, moderationLog };
}
