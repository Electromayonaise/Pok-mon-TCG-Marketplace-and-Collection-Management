// Solu-1 ATDD — INV contracts (contracts.md §5). RED until implemented.
import { beforeEach, describe, expect, it } from 'vitest';
import { createInvModule, type CatalogForListings, type IdentityForListings } from '../../../../src/modules/listings/index.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';
import { wiring, type Wiring } from '../../../../test-support/wiring.js';

const db = useTestDatabase();
let w: Wiring;
const status = new Map<string, 'Approved' | 'Pending' | 'Rejected' | 'none'>();
const identity: IdentityForListings = {
  getSellerVerification: async (sellerId) => ({ status: status.get(sellerId) ?? 'none' }),
  getSellerKinds: async (ids) => ids.map((userId) => ({ userId, sellerKind: status.has(userId) ? 'business' : 'individual', verified: status.get(userId) === 'Approved' })),
};
const catalog = {} as CatalogForListings;
beforeEach(() => {
  w = wiring(db);
  status.clear();
});
const inv = () => createInvModule({ sql: w.sql, clock: w.clock, identity, catalog });

/** Andrés (Approved, unpaused) sells Pikachu ex: one unit of `quantity`, listed single at 45,000. */
async function andresScene(quantity = 3, verification: 'Approved' | 'Pending' = 'Approved', paused = false) {
  const andres = await seed.business(db, 'andres', verification);
  status.set(andres, verification);
  await seed.sellerCommissionState(db, { businessId: andres, paused });
  await seed.inventoryUnit(db, { id: id('unitpika'), sellerId: andres, catalogEntryId: id('pikachu'), quantity });
  await seed.listing(db, { id: id('lpika'), sellerId: andres, sellerKind: 'business', inventoryUnitId: id('unitpika'), priceCop: 45_000, pausedAt: paused ? '2026-10-01T14:00:00.000Z' : null });
  return andres;
}
/** Scene helper (review T-02): Valentina, an individual seller, with one unit and one single listing. */
async function valentinaListing(o: { listingId: string; unitId: string; hiddenAt?: string; priceCop?: number; condition?: string }) {
  const valentina = await seed.individualSeller(db, 'valentina');
  await seed.inventoryUnit(db, { id: o.unitId, sellerId: valentina, catalogEntryId: id('pikachu'), condition: o.condition ?? 'NM', quantity: 1 });
  await seed.listing(db, {
    id: o.listingId, sellerId: valentina, sellerKind: 'individual', inventoryUnitId: o.unitId,
    ...(o.hiddenAt === undefined ? {} : { hiddenAt: o.hiddenAt }), ...(o.priceCop === undefined ? {} : { priceCop: o.priceCop }),
  });
  return valentina;
}
const quantity = async () => (await db.query<{ quantity: number }>(`SELECT quantity FROM "InventoryUnit" WHERE id = $1`, [id('unitpika')]))[0]?.quantity;

describe('Solu-1 ATDD: INV — assertListingOwner (guard, FR-INV-9/10)', () => {
  it('RED: the owner passes, even for a hidden listing', async () => {
    const valentina = await valentinaListing({ listingId: id('lval'), unitId: id('unitval'), hiddenAt: '2026-10-01T14:00:00.000Z' });
    expect(await inv().assertListingOwner({ listingId: id('lval'), actorId: valentina })).toEqual({ sellerId: valentina, hiddenAt: '2026-10-01T14:00:00.000Z' });
  });

  it('RED: a non-owner of a visible listing gets ListingNotOwnedByCaller (403)', async () => {
    await andresScene();
    const error = await caught(() => inv().assertListingOwner({ listingId: id('lpika'), actorId: id('camila') }));
    expect(codeOf(error)).toBe('ListingNotOwnedByCaller');
    expect(httpOf(error)).toBe(403);
  });

  it('RED: a non-owner of a hidden listing gets ListingNotFound (404), the same code as an unknown id', async () => {
    await valentinaListing({ listingId: id('lval'), unitId: id('unitval'), hiddenAt: '2026-10-01T14:00:00.000Z' });
    const hidden = await caught(() => inv().assertListingOwner({ listingId: id('lval'), actorId: id('camila') }));
    const unknown = await caught(() => inv().assertListingOwner({ listingId: id('ghost'), actorId: id('camila') }));
    expect(codeOf(hidden)).toBe('ListingNotFound');
    expect(codeOf(unknown)).toBe('ListingNotFound');
    expect(httpOf(hidden)).toBe(404);
  });
});

describe('Solu-1 ATDD: INV — reserveForPurchase (contended mutation, AD-INV-2, AD-6)', () => {
  const reserve = (qty = 1) => db.transactions.run((tx) => inv().reserveForPurchase(tx, { listingId: id('lpika'), qty, buyerId: id('camila') }));

  it('RED: reserving 1 of 3 decrements the unit once, returns the ref and snapshot, and writes no other table', async () => {
    await andresScene(3);
    const before = await db.counts(['Listing', 'BundleComponent', 'OutboxEvent', 'SellerCommissionState']);
    const result = await reserve(1);
    expect(result).toEqual({
      reservationRef: { listingId: id('lpika'), units: [{ inventoryUnitId: id('unitpika'), qty: 1 }] },
      exhaustedListingIds: [],
      snapshot: { title: expect.any(String), itemRef: id('pikachu'), condition: 'NM', unitPriceCop: 45_000, components: null },
    });
    expect(await quantity()).toBe(2);
    expect(await db.counts(['Listing', 'BundleComponent', 'OutboxEvent', 'SellerCommissionState'])).toEqual(before);
  });

  it('RED: taking the last unit reports this listing and a sibling sharing the unit as exhausted (FR-INV-4)', async () => {
    const andres = await andresScene(1);
    await seed.listing(db, { id: id('lpikab'), sellerId: andres, sellerKind: 'business', inventoryUnitId: id('unitpika'), priceCop: 47_000 });
    const result = await reserve(1);
    expect([...result.exhaustedListingIds].sort()).toEqual([id('lpika'), id('lpikab')].sort());
    expect(await quantity()).toBe(0);
  });

  it('RED: an individual-seller listing gets NotBusinessListing (409) and no decrement', async () => {
    await valentinaListing({ listingId: id('lpika'), unitId: id('unitpika') });
    const error = await caught(() => reserve(1));
    expect(codeOf(error)).toBe('NotBusinessListing');
    expect(httpOf(error)).toBe(409);
    expect(await quantity()).toBe(1);
  });

  it('RED: a Pending seller gets ListingNotPurchasable (409) citing ListingUnverified, with no decrement', async () => {
    await andresScene(1, 'Pending');
    const error = await caught(() => reserve(1));
    expect(codeOf(error)).toBe('ListingNotPurchasable');
    expect(httpOf(error)).toBe(409);
    expect(JSON.stringify(error)).toContain('ListingUnverified');
    expect(await quantity()).toBe(1);
  });

  it('RED: a paused shop gets ListingNotPurchasable (409) citing ListingPausedBalanceExhausted, with no decrement', async () => {
    await andresScene(1, 'Approved', true);
    const error = await caught(() => reserve(1));
    expect(codeOf(error)).toBe('ListingNotPurchasable');
    expect(JSON.stringify(error)).toContain('ListingPausedBalanceExhausted');
    expect(await quantity()).toBe(1);
  });

  it('RED: asking for more than is available gets InsufficientQuantity (409) citing requested and available', async () => {
    await andresScene(1);
    const error = await caught(() => reserve(2));
    expect(codeOf(error)).toBe('InsufficientQuantity');
    expect(citedInputs(error)).toEqual({ requested: 2, available: 1 });
    expect(await quantity()).toBe(1);
  });

  it('RED (NFR-INV-1): 50 buyers race for the last unit — exactly 1 reservation, 49 InsufficientQuantity, stock 0', async () => {
    await andresScene(1);
    const outcome = await race(50, () => reserve(1));
    expect(outcome.rejected.map(codeOf).filter((c) => c !== 'InsufficientQuantity')).toEqual([]);
    expect(outcome.rejected).toHaveLength(49);
    expect(outcome.fulfilled).toHaveLength(1);
    expect(await quantity()).toBe(0);
  });

  it('RED (mandatory edge case FR-INV-6): the caller aborts after a successful reserve — the unit is fully restored by the rollback', async () => {
    await andresScene(1);
    const callerFailure = new Error('Order insert failed');
    const error = await caught(() =>
      db.transactions.run(async (tx) => {
        await inv().reserveForPurchase(tx, { listingId: id('lpika'), qty: 1, buyerId: id('camila') });
        throw callerFailure;
      }),
    );
    expect(error).toBe(callerFailure);
    expect(await quantity()).toBe(1);
  });

  it('RED: a bundle reserves perBundleQty × qty from each component unit in one decrement', async () => {
    const andres = await seed.business(db, 'andres', 'Approved');
    status.set(andres, 'Approved');
    await seed.sellerCommissionState(db, { businessId: andres, paused: false });
    await seed.inventoryUnit(db, { id: id('unitpika'), sellerId: andres, catalogEntryId: id('pikachu'), quantity: 3 });
    await seed.listing(db, { id: id('lbundle'), sellerId: andres, sellerKind: 'business', kind: 'bundle', title: 'Pikachu x2' });
    await seed.bundleComponent(db, { listingId: id('lbundle'), inventoryUnitId: id('unitpika'), sellerId: andres, catalogEntryId: id('pikachu'), perBundleQty: 2 });
    const result = await db.transactions.run((tx) => inv().reserveForPurchase(tx, { listingId: id('lbundle'), qty: 1, buyerId: id('camila') }));
    expect(result.reservationRef.units).toEqual([{ inventoryUnitId: id('unitpika'), qty: 2 }]);
    expect(await quantity()).toBe(1);
  });
});

describe('Solu-1 ATDD: INV — getAvailabilitySummary (resolver, FR-COL-6)', () => {
  it('RED: one row per id in request order; a Pending business listing does not count; an individual one does', async () => {
    await andresScene(2, 'Pending');
    await valentinaListing({ listingId: id('lval'), unitId: id('unitval'), condition: 'LP', priceCop: 60_000 });
    const rows = await inv().getAvailabilitySummary({ catalogEntryIds: [id('charizard'), id('pikachu')] });
    expect(rows).toEqual([
      { catalogEntryId: id('charizard'), lowestPriceCop: null, availableCount: 0 },
      { catalogEntryId: id('pikachu'), lowestPriceCop: 60_000, availableCount: 1 },
    ]);
  });

  it('RED: an entry with no listing resolves silently to { lowestPriceCop: null, availableCount: 0 } with zero writes', async () => {
    const before = await db.counts(['Listing', 'InventoryUnit']);
    expect(await inv().getAvailabilitySummary({ catalogEntryIds: [id('ghost')] })).toEqual([{ catalogEntryId: id('ghost'), lowestPriceCop: null, availableCount: 0 }]);
    expect(await db.counts(['Listing', 'InventoryUnit'])).toEqual(before);
  });
});
