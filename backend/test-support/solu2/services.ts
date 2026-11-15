// Real neighbour services for a module's src tests, composed as the composition root binds them.
// They live here, outside src/, so a test of one module does not import a module AD-1 keeps from it
// ([SYS-AD1] scans src/, tests included).
import { CatServiceV2 } from '../../src/modules/catalog/index.js';
import { IdnServiceV2 } from '../../src/modules/identity/index.js';
import { ContactServiceV2, InvServiceV2 } from '../../src/modules/listings/index.js';
import type { ListingsForTrd } from '../../src/modules/trading/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../src/shared-kernel/external.js';
import { fake, type wiring } from './fixtures.js';

/** INV with the real identity and catalog over `w` (ORD's `listings` neighbour). */
export function realInventory(w: ReturnType<typeof wiring>): InvServiceV2 {
  const catalog = new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });
  return new InvServiceV2({ ...w, catalog, identity: new IdnServiceV2(w) });
}

/** TRD's `listings` neighbour as the composition root binds it: INV's trade surface and the contact service. */
export function realTradeListings(w: ReturnType<typeof wiring>): ListingsForTrd {
  const catalog = new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });
  const identity = new IdnServiceV2(w);
  const inv = new InvServiceV2({ ...w, catalog, identity });
  const contact = new ContactServiceV2({ ...w, catalog, identity });
  return {
    getTradeability: (tx, input) => inv.getTradeability(tx, input),
    reserveForTrade: (tx, input) => inv.reserveForTrade(tx, input),
    releaseReservation: (tx, input) => inv.releaseReservation(tx, input),
    resolveItemRefs: (input) => inv.resolveItemRefs(input),
    generateContactMessage: (input) => contact.generateContactMessage(input),
  };
}
