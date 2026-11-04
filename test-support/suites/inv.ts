// The shared Given steps of the InvServiceV2 integration tests (src/modules/listings/application/inv.v2-*.test.ts),
// moved verbatim out of one 429-line file by the Impl-2 test review (HIGH-3). Call it once at the top of a test file.
import { CatServiceV2 } from '../../src/modules/catalog/index.js';
import { IdnServiceV2 } from '../../src/modules/identity/index.js';
import { InvServiceV2 } from '../../src/modules/listings/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../src/shared-kernel/external.js';
import type { TransactionRunner } from '../../src/shared-kernel/ports.js';
import { useTestDatabase } from '../db.js';
import { fake, id, purchasableListing, wiring } from '../solu2/fixtures.js';

export function useInvSuite() {
  const db = useTestDatabase();

  /** INV composed as the composition root binds it: the real identity and catalog. */
  function inventory(transactions: TransactionRunner = db.transactions) {
    const w = { ...wiring(db), transactions };
    const catalog = new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });
    return new InvServiceV2({ ...w, catalog, identity: new IdnServiceV2(w) });
  }
  const andres = (quantity: number) => purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity });

  return { db, inventory, andres };
}
