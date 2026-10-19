// ATDD — INV supporting contracts, offered ports and read models (contracts.md §15). Split from inv_contracts.test.ts (test review R-7..R-12).
import { describe, expect, it } from 'vitest';
import { InvServiceV2 } from '../../../../src/modules/listings/index.js';
import type { CatalogForInv, IdentityForInv } from '../../../../src/modules/listings/index.js';
import { DomainError } from '../../../../src/shared-kernel/errors.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { admin, business, catalogEntry, commissionState, explainAssert, fake, id, ins, listing, purchasableListing, rows, T0, unit, user, wiring } from '../../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();

type Eligibility = 'individual' | 'businessApproved' | 'businessPending' | 'rejected';
function setup(o: { eligibility?: Eligibility; verification?: 'Approved' | 'Pending' | 'Rejected' | 'none' } = {}) {
  const catalog = fake<CatalogForInv>('catalog', {
    getEntries: async ({ catalogEntryIds }) => ({ entries: catalogEntryIds.map((c) => ({ catalogEntryId: c, setId: id('set1'), kind: 'card' as const, name: 'Charizard ex', number: '006', pokemon: null, colour: null, style: null, artist: null, imageUrl: null })), missing: [] }),
    resolveItemRefs: async ({ refs }) => ({ resolved: refs.filter((r) => r !== id('ghost')).map((r) => ({ ref: r, kind: r === id('etb') ? 'sealedProduct' as const : 'card' as const })), missing: refs.filter((r) => r === id('ghost')) }),
  });
  const identity = fake<IdentityForInv>('identity', {
    requireListingEligibility: async () => {
      const e = o.eligibility ?? 'individual';
      if (e === 'rejected') throw new DomainError('SellerNotVerified', [{ rule: 'FR-IDN-3', inputs: {} }]);
      return { listingKind: e === 'individual' ? 'individual' as const : 'business' as const, verified: e === 'businessApproved',
        decision: { outcome: 'allowed', reasonCode: 'ListingUnverified', humanMessage: 'Puedes publicar.', citations: [{ rule: 'FR-IDN-3', inputs: {} }], occurredAt: T0 } };
    },
    getSellerVerification: async () => ({ status: o.verification ?? 'Approved' }),
  });
  return new InvServiceV2({ ...wiring(db), catalog, identity });
}
const qty = async (unitId: string) => (await rows<{ quantity: number }>(db, 'InventoryUnit', 'id = $1', [unitId]))[0]?.quantity;
const reserve = (n: number, listingId = id('lchar')) => db.transactions.run((tx) => setup().reserveForPurchase(tx, { listingId, qty: n, buyerId: id('camila') }));
const andres = (quantity: number) => purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity });

describe('Supporting INV contracts (contracts.md §15)', () => {
  it('[S-FR-INV-2.h] a 2-card bundle shows availability equal to its scarcest component', async () => {
    await user(db, { id: id('valentina'), sellerTrack: 'individual' });
    const result = await setup().createBundle({ sellerId: id('valentina'), title: 'Lote inicial', priceCop: 60_000, location: null, description: '',
      components: [{ itemRef: id('char'), condition: 'NM', perBundleQty: 1, quantity: 3 }, { itemRef: id('pika'), condition: 'LP', perBundleQty: 2, quantity: 2 }] });
    expect(result.availability).toBe(1);
    expect(await rows(db, 'BundleComponent')).toHaveLength(2);
  });

  it('[S-FR-INV-2.f] a sealed component is SealedProductInBundle (409) and nothing is written', async () => {
    await user(db, { id: id('valentina'), sellerTrack: 'individual' });
    const error = await caught(() => setup().createBundle({ sellerId: id('valentina'), title: 'Lote', priceCop: 60_000, location: null, description: '', components: [{ itemRef: id('etb'), condition: 'NM', perBundleQty: 1, quantity: 1 }] }));
    expect(codeOf(error)).toBe('SealedProductInBundle');
    expect(await db.counts(['Listing', 'InventoryUnit', 'BundleComponent'])).toEqual({ Listing: 0, InventoryUnit: 0, BundleComponent: 0 });
  });

  it('[S-FR-INV-4.h] a sale through one of two listings on one unit lowers both availabilities', async () => {
    await andres(2);
    await listing(db, { id: id('lchar2'), sellerId: id('andres'), unitId: id('uchar'), priceCop: 48_000 });
    await reserve(1);
    const svc = setup();
    expect((await svc.getListing({ listingId: id('lchar'), actorId: null })).availability).toBe(1);
    expect((await svc.getListing({ listingId: id('lchar2'), actorId: null })).availability).toBe(1);
  });

  it('[S-FR-INV-4.f] a bundle needing 2 of a unit holding 1 shows availability 0', async () => {
    await andres(1);
    await listing(db, { id: id('lb'), sellerId: id('andres'), kind: 'bundle', title: 'Doble', priceCop: 90_000 });
    await ins(db, 'BundleComponent', { listingId: id('lb'), inventoryUnitId: id('uchar'), sellerId: id('andres'), catalogEntryId: id('char'), condition: 'NM', perBundleQty: 2 }, 'created');
    expect((await setup().getListing({ listingId: id('lb'), actorId: null })).availability).toBe(0);
  });

  it('[S-FR-INV-5.h] releasing a reservation restores the units', async () => {
    await andres(1);
    await db.transactions.run((tx) => setup().releaseReservation(tx, { reservationRef: { listingId: id('lchar'), units: [{ inventoryUnitId: id('uchar'), qty: 2 }] } }));
    expect(await qty(id('uchar'))).toBe(3);
  });

  it('[S-FR-INV-5.f] a release that names an unknown unit fails as Unexpected and changes nothing', async () => {
    await andres(1);
    const error = await caught(() => db.transactions.run((tx) => setup().releaseReservation(tx, { reservationRef: { listingId: id('lchar'), units: [{ inventoryUnitId: id('uchar'), qty: 1 }, { inventoryUnitId: id('ghost'), qty: 1 }] } })));
    expect((error as Error).message).toMatch(/Unexpected/);
    expect(await qty(id('uchar'))).toBe(1);
  });

  it('[S-FR-INV-8.h] a rejection withdraws the business listings and a newer approval restores them', async () => {
    await andres(2);
    const svc = setup();
    await db.transactions.run((tx) => svc.applyApplicationDecision(tx, { type: 'BusinessApplicationRejected', applicationId: id('a1'), businessId: id('andres'), decidedAt: '2026-09-20T00:00:00.000Z' }));
    expect(await rows(db, 'Listing', `"withdrawnReason" = 'ApplicationRejected'`)).toHaveLength(1);
    await db.transactions.run((tx) => svc.applyApplicationDecision(tx, { type: 'BusinessApplicationApproved', applicationId: id('a2'), businessId: id('andres'), decidedAt: '2026-09-25T00:00:00.000Z' }));
    expect(await rows(db, 'Listing', '"withdrawnAt" IS NOT NULL')).toHaveLength(0);
  });

  it('[S-FR-INV-8.f] an older Rejected delivered after a newer Approved is ignored and the listings stay visible', async () => {
    await andres(2);
    const svc = setup();
    await db.transactions.run((tx) => svc.applyApplicationDecision(tx, { type: 'BusinessApplicationApproved', applicationId: id('a2'), businessId: id('andres'), decidedAt: '2026-09-25T00:00:00.000Z' }));
    const late = await db.transactions.run((tx) => svc.applyApplicationDecision(tx, { type: 'BusinessApplicationRejected', applicationId: id('a1'), businessId: id('andres'), decidedAt: '2026-09-20T00:00:00.000Z' }));
    expect(late).toEqual({ applied: false, ignored: true, listingsChanged: 0 });
    expect(await rows(db, 'Listing', '"withdrawnAt" IS NOT NULL')).toHaveLength(0);
  });

  it('[S-FR-INV-9.h] restocking +2 raises availability by 2 on every listing of the unit', async () => {
    await andres(1);
    const result = await setup().restockListing({ actorId: id('andres'), listingId: id('lchar'), delta: 2 });
    expect(result.availability).toBe(3);
    expect(await qty(id('uchar'))).toBe(3);
  });

  it('[S-FR-INV-9.f] a non-owner restocking is ListingNotOwnedByCaller (403) with zero writes', async () => {
    await andres(1);
    await user(db, { id: id('camila') });
    const error = await caught(() => setup().restockListing({ actorId: id('camila'), listingId: id('lchar'), delta: 2 }));
    expect(codeOf(error)).toBe('ListingNotOwnedByCaller');
    expect(await qty(id('uchar'))).toBe(1);
  });

  it('[S-FR-INV-10.h] the owner sees a hidden listing with its reason', async () => {
    await andres(1);
    await db.query(`UPDATE "Listing" SET "hiddenAt" = $1, "hiddenReason" = 'Counterfeit', "hiddenBy" = $2`, [T0, id('admin')]);
    expect((await setup().getListing({ listingId: id('lchar'), actorId: id('andres') })).state).toBe('Hidden');
  });

  it('[S-FR-INV-10.f] a non-owner gets a body identical to an unknown id (except occurredAt)', async () => {
    await andres(1);
    await db.query(`UPDATE "Listing" SET "hiddenAt" = $1, "hiddenReason" = 'Counterfeit', "hiddenBy" = $2`, [T0, id('admin')]);
    const hidden = await caught(() => setup().getListing({ listingId: id('lchar'), actorId: id('camila') }));
    const unknown = await caught(() => setup().getListing({ listingId: id('ghost'), actorId: id('camila') }));
    expect(codeOf(hidden)).toBe('ListingNotFound');
    expect(JSON.stringify(hidden)).toBe(JSON.stringify(unknown));
  });

  it('[S-FR-REP-5.h] an admin hide removes the listing from discovery and logs a title snapshot', async () => {
    await admin(db);
    await andres(1);
    const result = await setup().setListingHidden({ adminId: id('admin'), listingId: id('lchar'), hidden: true, reasonCode: 'Counterfeit', note: null });
    explainAssert(result.decision, { outcome: 'hidden', rule: 'FR-REP-5' });
    expect(await rows(db, 'ListingModerationLog')).toMatchObject([{ listingId: id('lchar'), action: 'hide', reasonCode: 'Counterfeit' }]);
  });

  it('[S-FR-REP-5.f] hiding twice writes one log row and returns an explained no-op', async () => {
    await admin(db);
    await andres(1);
    const svc = setup();
    await svc.setListingHidden({ adminId: id('admin'), listingId: id('lchar'), hidden: true, reasonCode: 'Spam', note: null });
    const again = await svc.setListingHidden({ adminId: id('admin'), listingId: id('lchar'), hidden: true, reasonCode: 'Spam', note: null });
    expect(again.decision.outcome).toBe('allowedWithNotice');
    expect(await rows(db, 'ListingModerationLog')).toHaveLength(1);
  });
});

describe('Offered ports — listings (contracts.md §15.11)', () => {
  it('[P-INV.purchase.h] a hidden listing is ListingNotFound to the purchase port', async () => {
    await andres(1);
    await db.query(`UPDATE "Listing" SET "hiddenAt" = $1, "hiddenReason" = 'Spam', "hiddenBy" = $2`, [T0, id('admin')]);
    expect(codeOf(await caught(() => setup().getListingForPurchase({ listingId: id('lchar') })))).toBe('ListingNotFound');
  });

  it('[P-INV.trade.h] the last unit reserved by trade leaves availability 0', async () => {
    await user(db, { id: id('valentina'), sellerTrack: 'individual' });
    await catalogEntry(db, id('char'));
    await unit(db, { id: id('uv'), sellerId: id('valentina'), catalogEntryId: id('char'), quantity: 1 });
    await listing(db, { id: id('lv'), sellerId: id('valentina'), unitId: id('uv'), sellerKind: 'individual', openToTrade: true });
    const result = await db.transactions.run((tx) => setup().reserveForTrade(tx, { listingId: id('lv'), qty: 1 }));
    expect(result.exhaustedListingIds).toEqual([id('lv')]);
    expect(await qty(id('uv'))).toBe(0);
  });

  it('[P-INV.tradeability.h] a listing closed to trade is ListingNotOpenToTrade', async () => {
    await user(db, { id: id('valentina'), sellerTrack: 'individual' });
    await catalogEntry(db, id('char'));
    await unit(db, { id: id('uv'), sellerId: id('valentina'), catalogEntryId: id('char'), quantity: 1 });
    await listing(db, { id: id('lv'), sellerId: id('valentina'), unitId: id('uv'), sellerKind: 'individual', openToTrade: false });
    expect(codeOf(await caught(() => db.transactions.run((tx) => setup().getTradeability(tx, { listingId: id('lv') }))))).toBe('ListingNotOpenToTrade');
  });

  it('[P-INV.units.h] a 3-component bundle gives its 3 unit ids', async () => {
    await andres(3);
    await listing(db, { id: id('lb'), sellerId: id('andres'), kind: 'bundle', title: 'Trío', priceCop: 90_000 });
    for (const [u, e] of [['ux', 'ex'], ['uy', 'ey'], ['uz', 'ez']]) {
      await catalogEntry(db, id(e!));
      await unit(db, { id: id(u!), sellerId: id('andres'), catalogEntryId: id(e!), quantity: 1 });
      await ins(db, 'BundleComponent', { listingId: id('lb'), inventoryUnitId: id(u!), sellerId: id('andres'), catalogEntryId: id(e!), condition: 'NM', perBundleQty: 1 }, 'created');
    }
    expect((await setup().getInventoryUnitIds({ listingId: id('lb') })).unitIds.sort()).toEqual([id('ux'), id('uy'), id('uz')].sort());
  });

  it('[P-INV.availability.h] a Pending business listing is not counted as available', async () => {
    await business(db, id('andres'), 'Pending');
    await commissionState(db, id('andres'));
    await catalogEntry(db, id('char'));
    await unit(db, { id: id('u1'), sellerId: id('andres'), catalogEntryId: id('char'), quantity: 2 });
    await listing(db, { id: id('l1'), sellerId: id('andres'), unitId: id('u1') });
    const result = await setup({ verification: 'Pending' }).getAvailabilitySummary({ catalogEntryIds: [id('char')], area: null });
    expect(result.items).toEqual([{ catalogEntryId: id('char'), lowestPriceCop: null, availableCount: 0 }]);
  });

  it('[P-INV.refs.h] listings resolves item refs by delegating to catalog, so trading never imports catalog', async () => {
    const result = await setup().resolveItemRefs({ refs: [id('char'), id('ghost')] });
    expect(result).toEqual({ resolved: [{ ref: id('char'), kind: 'card' }], missing: [id('ghost')] });
  });
});
