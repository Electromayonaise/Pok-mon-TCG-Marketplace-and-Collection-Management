// INV against Postgres with the real neighbours, the edges the ATDD tests leave out: managing listings
// (S-FR-INV-2, -9, -10), the Epic 5 review patches, the meeting-point default, free text, and AD-INV-3 rule 2's parity.
// Split from inv.v2.test.ts by the Impl-2 test review (HIGH-3); the shared Given steps are in test-support/suites/inv.ts.
import { describe, expect, it } from 'vitest';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { business, catalogEntry, commissionState, fake, id, individualSeller, listing, rows, T0, unit, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { IdnServiceV2 } from '../../identity/index.js';
import type { CatalogForInv, IdentityForInv } from '../ports/inv.v2.js';
import { InvServiceV2 } from './inv.v2.js';
import { businessId, buyerId, individualId, seedMarketplace } from '../../../../test-support/solu2/seed-marketplace.js';
import { useInvSuite } from '../../../../test-support/suites/inv.js';

const { db, inventory, andres } = useInvSuite();

describe('managing listings (S-FR-INV-2, -9, -10)', () => {
  it('an update with no change, or opening a business listing to trade, is refused with zero writes', async () => {
    await andres(2);
    const inv = inventory();
    expect(codeOf(await caught(() => inv.updateListing({ actorId: id('andres'), listingId: id('lchar'), expectedVersion: 0, changes: {} })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => inv.updateListing({ actorId: id('andres'), listingId: id('lchar'), expectedVersion: 0, changes: { openToTrade: true } })))).toBe('OpenToTradeNotAllowed');
    expect(codeOf(await caught(() => inv.updateListing({ actorId: id('andres'), listingId: id('lchar'), expectedVersion: 0, changes: { priceCop: 999 } })))).toBe('InvalidPrice');
    expect(await rows(db, 'Listing')).toMatchObject([{ version: 0, priceCop: '45000' }]);
  });

  it('a negative restock beyond the stock is InsufficientQuantity; a bundle restock and a zero delta are refused', async () => {
    await andres(2);
    await listing(db, { id: id('lb'), sellerId: id('andres'), kind: 'bundle', title: 'Lote', priceCop: 90_000 });
    const inv = inventory();
    const short = await caught(() => inv.restockListing({ actorId: id('andres'), listingId: id('lchar'), delta: -3 }));
    expect([codeOf(short), citedInputs(short)]).toEqual(['InsufficientQuantity', { requested: 3, available: 2 }]);
    expect(codeOf(await caught(() => inv.restockListing({ actorId: id('andres'), listingId: id('lb'), delta: 1 })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => inv.restockListing({ actorId: id('andres'), listingId: id('lchar'), delta: 0 })))).toBe('RequestValidationFailed');
    expect((await inv.restockListing({ actorId: id('andres'), listingId: id('lchar'), delta: -2 })).availability).toBe(0);
  });

  it('deactivating twice is an explained no-op with one audit row; the owner still reads it, a buyer does not', async () => {
    await andres(2);
    const inv = inventory();
    expect((await inv.setListingActive({ actorId: id('andres'), listingId: id('lchar'), active: false })).decision.outcome).toBe('withdrawn');
    expect((await inv.setListingActive({ actorId: id('andres'), listingId: id('lchar'), active: false })).decision.outcome).toBe('allowedWithNotice');
    expect(await rows(db, 'audit_events', `action = 'listings.listing.deactivated'`)).toHaveLength(1);
    expect((await inv.getListing({ listingId: id('lchar'), actorId: id('andres') })).state).toBe('Deactivated');
    expect(codeOf(await caught(() => inv.getListing({ listingId: id('lchar'), actorId: null })))).toBe('ListingNotFound');
  });

  it('the owner list pages 25 newest first behind a cursor; a forged cursor is refused', async () => {
    await business(db, id('andres'), 'Approved');
    await commissionState(db, id('andres'));
    await catalogEntry(db, id('char'));
    await unit(db, { id: id('uchar'), sellerId: id('andres'), catalogEntryId: id('char'), quantity: 1 });
    for (let k = 0; k < 27; k++) await listing(db, { id: id(`l${String(k).padStart(2, '0')}`), sellerId: id('andres'), unitId: id('uchar') });
    const inv = inventory();
    const first = await inv.listMyListings({ sellerId: id('andres'), cursor: null });
    const second = await inv.listMyListings({ sellerId: id('andres'), cursor: first.nextCursor });
    expect([first.items.length, second.items.length, second.nextCursor]).toEqual([25, 2, null]);
    expect(new Set([...first.items, ...second.items].map((i) => i.listingId)).size).toBe(27);
    expect(first.items[0]?.title).toBe(`Carta ${id('char').slice(0, 6)}`);
    expect(codeOf(await caught(() => inv.listMyListings({ sellerId: id('andres'), cursor: 'bm90LWEtY3Vyc29y' })))).toBe('RequestValidationFailed');
  });

  it('a business listing is no trade unit: NotIndividualSellerListing, nothing moves', async () => {
    await andres(2);
    const error = await caught(() => db.transactions.run((tx) => inventory().reserveForTrade(tx, { listingId: id('lchar'), qty: 1 })));
    expect(codeOf(error)).toBe('NotIndividualSellerListing');
    expect((await rows<{ quantity: number }>(db, 'InventoryUnit'))[0]?.quantity).toBe(2);
  });

  it('the availability summary counts a funded Approved business, keeps input order, refuses duplicates and filters by area (DSC-3, AD-DSC-1)', async () => {
    await andres(2);
    const inv = inventory();
    expect(await inv.getAvailabilitySummary({ catalogEntryIds: [id('ghost'), id('char')], area: null })).toEqual({
      items: [{ catalogEntryId: id('ghost'), lowestPriceCop: null, availableCount: 0 }, { catalogEntryId: id('char'), lowestPriceCop: 45_000, availableCount: 1 }],
    });
    expect(codeOf(await caught(() => inv.getAvailabilitySummary({ catalogEntryIds: [id('char'), id('char')], area: null })))).toBe('RequestValidationFailed');
    const near = await inv.getAvailabilitySummary({ catalogEntryIds: [id('char')], area: { lat: 4.7, lng: -74, radiusKm: 10 } });
    const far = await inv.getAvailabilitySummary({ catalogEntryIds: [id('char')], area: { lat: 6.2442, lng: -75.5812, radiusKm: 10 } });
    expect([near.items[0]?.availableCount, far.items[0]?.availableCount]).toEqual([1, 0]);
    await db.query(`UPDATE "Listing" SET lat = NULL, lng = NULL`);
    expect((await inv.getAvailabilitySummary({ catalogEntryIds: [id('char')], area: { lat: 4.7, lng: -74, radiusKm: 300 } })).items[0]?.availableCount).toBe(0);
    expect(codeOf(await caught(() => inv.getAvailabilitySummary({ catalogEntryIds: [id('char')], area: { lat: 4.7, lng: -74, radiusKm: 301 } })))).toBe('InvalidSearchArea');
  });
});

describe('Epic 5 close review patches (decision log Impl-1 #30)', () => {
  it('a listing that draws on no unit is an invariant breach, never a free reservation', async () => {
    await andres(1);
    await listing(db, { id: id('lempty'), sellerId: id('andres'), kind: 'bundle', title: 'Vacío' });
    expect(codeOf(await caught(() => db.transactions.run((tx) => inventory().reserveForPurchase(tx, { listingId: id('lempty'), qty: 1, buyerId: id('camila') }))))).toBe('Unexpected');
  });

  it('a rejection withdraws only the business listings of a seller who also listed as an individual', async () => {
    await andres(1);
    await unit(db, { id: id('uind'), sellerId: id('andres'), catalogEntryId: id('char'), condition: 'LP', quantity: 1 });
    await listing(db, { id: id('lind'), sellerId: id('andres'), unitId: id('uind'), sellerKind: 'individual' });
    const result = await db.transactions.run((tx) => inventory().applyApplicationDecision(tx, { type: 'BusinessApplicationRejected', applicationId: id('a1'), businessId: id('andres'), decidedAt: '2026-09-20T00:00:00.000Z' }));
    expect(result.listingsChanged).toBe(1);
    expect(await rows(db, 'Listing', '"withdrawnAt" IS NOT NULL')).toMatchObject([{ id: id('lchar') }]);
  });

  it('a card component in condition Sealed is InvalidItemRef before any write', async () => {
    await user(db, { id: id('valentina'), sellerTrack: 'individual' });
    await catalogEntry(db, id('char'));
    const inv = new InvServiceV2({ ...wiring(db), catalog: fake<CatalogForInv>('catalog', { resolveItemRefs: async ({ refs }) => ({ resolved: refs.map((ref) => ({ ref, kind: 'card' as const })), missing: [] }) }),
      identity: fake<IdentityForInv>('identity', { requireListingEligibility: async () => ({ listingKind: 'individual', verified: false, decision: { outcome: 'allowed', reasonCode: 'ListingEligible', humanMessage: 'Tu cuenta puede publicar.', citations: [{ rule: 'FR-IDN-3', inputs: {} }], occurredAt: '2026-10-01T15:00:00.000Z' } }) }) });
    const error = await caught(() => inv.createBundle({ sellerId: id('valentina'), title: 'Lote', priceCop: 60_000, location: null, description: '',
      components: [{ itemRef: id('char'), condition: 'Sealed' as 'NM', perBundleQty: 1, quantity: 1 }] }));
    expect(codeOf(error)).toBe('InvalidItemRef');
    expect(await db.counts(['Listing', 'InventoryUnit', 'BundleComponent'])).toEqual({ Listing: 0, InventoryUnit: 0, BundleComponent: 0 });
  });

  it('the owner list reads each row by its own seller kind: an individual first row leaves the business rows Active', async () => {
    await andres(1);
    await unit(db, { id: id('uind'), sellerId: id('andres'), catalogEntryId: id('char'), condition: 'LP', quantity: 1 });
    await listing(db, { id: id('lind'), sellerId: id('andres'), unitId: id('uind'), sellerKind: 'individual' });
    await db.query(`UPDATE "Listing" SET "createdAt" = $1 WHERE id = $2`, ['2026-10-02T00:00:00.000Z', id('lind')]);
    const { items } = await inventory().listMyListings({ sellerId: id('andres'), cursor: null });
    expect(items.map((i) => [i.listingId, i.state])).toEqual([[id('lind'), 'Active'], [id('lchar'), 'Active']]);
  });

  it('a trade reserve on a listing closed to trade is ListingNotOpenToTrade and nothing moves', async () => {
    await user(db, { id: id('valentina'), sellerTrack: 'individual' });
    await catalogEntry(db, id('char'));
    await unit(db, { id: id('uv'), sellerId: id('valentina'), catalogEntryId: id('char'), quantity: 1 });
    await listing(db, { id: id('lv'), sellerId: id('valentina'), unitId: id('uv'), sellerKind: 'individual', openToTrade: false });
    expect(codeOf(await caught(() => db.transactions.run((tx) => inventory().reserveForTrade(tx, { listingId: id('lv'), qty: 1 }))))).toBe('ListingNotOpenToTrade');
    expect((await rows<{ quantity: number }>(db, 'InventoryUnit'))[0]?.quantity).toBe(1);
  });

  it('a fractional version and a restock beyond ±999 are refused as RequestValidationFailed', async () => {
    await andres(1);
    const inv = inventory();
    expect(codeOf(await caught(() => inv.updateListing({ actorId: id('andres'), listingId: id('lchar'), expectedVersion: 1.5, changes: { priceCop: 50_000 } })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => inv.restockListing({ actorId: id('andres'), listingId: id('lchar'), delta: 1_000 })))).toBe('RequestValidationFailed');
    expect((await inv.restockListing({ actorId: id('andres'), listingId: id('lchar'), delta: 999 })).availability).toBe(1_000);
  });

  it('the Paused detail cites the business and its ledger seq; the Unverified detail cites the real status', async () => {
    await andres(1);
    await db.query(`UPDATE "Listing" SET "pausedAt" = $1`, [T0]);
    const paused = await inventory().getListing({ listingId: id('lchar'), actorId: null });
    expect(paused.decision.citations[0]).toEqual({ rule: 'FR-INV-7', inputs: { businessId: id('andres'), ledgerSeq: 1, projection: 'funded', paused: true } });
    await business(db, id('pending'), 'Pending');
    await commissionState(db, id('pending'));
    await unit(db, { id: id('upend'), sellerId: id('pending'), catalogEntryId: id('char'), quantity: 1 });
    await listing(db, { id: id('lpend'), sellerId: id('pending'), unitId: id('upend') });
    const unverified = await inventory().getListing({ listingId: id('lpend'), actorId: null });
    expect([unverified.state, unverified.decision.citations[0].inputs]).toEqual(['Unverified', { verification: 'Pending' }]);
  });
});

describe('Epic 6: a null location defaults to the meeting point (decision log Impl-1 #31)', () => {
  it('an individual listing with a null location stores the seller\'s meeting point; a business one stores none', async () => {
    await individualSeller(db, id('valentina'), { lat: 6.2442, lng: -75.5812, city: 'Medellín' });
    await business(db, id('andres'), 'Approved');
    await commissionState(db, id('andres'));
    await catalogEntry(db, id('char'));
    const inv = inventory();
    const input = { itemRef: id('char'), condition: 'NM' as const, priceCop: 45_000, quantity: 1, location: null, description: '', openToTrade: false };
    const mine = await inv.createListing({ ...input, sellerId: id('valentina') });
    const theirs = await inv.createListing({ ...input, sellerId: id('andres') });
    const located = await rows<{ id: string; lat: number | null; lng: number | null }>(db, 'Listing');
    expect(Object.fromEntries(located.map((l) => [l.id, [l.lat, l.lng]]))).toEqual({ [mine.listingId]: [6.2442, -75.5812], [theirs.listingId]: [null, null] });
  });
});


describe('free text (contracts.md §0.3, decision log Impl-1 #38)', () => {
  it('a description with a NUL, on create and update, and a bundle title of spaces are RequestValidationFailed, with nothing written', async () => {
    await individualSeller(db, id('valentina'), { lat: 6.2442, lng: -75.5812, city: 'Medellín' });
    await catalogEntry(db, id('char'));
    const inv = inventory();
    const input = { itemRef: id('char'), condition: 'NM' as const, priceCop: 45_000, quantity: 1, location: null, openToTrade: false, sellerId: id('valentina') };
    expect(codeOf(await caught(() => inv.createListing({ ...input, description: 'Casi\u0000nueva' })))).toBe('RequestValidationFailed');
    const created = await inv.createListing({ ...input, description: '' });
    expect(codeOf(await caught(() => inv.updateListing({ actorId: id('valentina'), listingId: created.listingId, expectedVersion: 0, changes: { description: 'x\u0000' } })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => inv.createBundle({ sellerId: id('valentina'), title: '   ', priceCop: 60_000, location: null, description: '',
      components: [{ itemRef: id('char'), condition: 'NM', perBundleQty: 1, quantity: 1 }] })))).toBe('RequestValidationFailed');
    expect(await rows(db, 'Listing')).toHaveLength(1);
  });
});

describe('AD-INV-3 rule 2 parity: the batch and the single verification forms agree (Story 11.5, decision log Impl-2 #17)', () => {
  it('over the seed, P-INV.availability (one getSellerKinds per page) counts exactly the listings getSellerVerification admits one by one', async () => {
    await seedMarketplace(db);
    // Given: a Pending shop that is funded and unpaused, so only the verification term keeps its listings out.
    await commissionState(db, businessId(8));
    await db.query(`UPDATE "Listing" SET "pausedAt" = NULL WHERE "sellerId" = $1`, [businessId(8)]);
    const listed = await db.query<{ c: string }>(
      `SELECT DISTINCT u."catalogEntryId" AS c FROM "Listing" l JOIN "InventoryUnit" u ON u.id = l."inventoryUnitId" WHERE l.kind = 'single' ORDER BY 1 LIMIT 500`,
    );
    const ids = listed.map((r) => r.c);
    const w = wiring(db);
    const idn = new IdnServiceV2(w);
    const batch = await inventory().getAvailabilitySummary({ catalogEntryIds: ids, area: null });
    // The single form (AD-INV-3 rule 1): the same SQL twin, then getSellerVerification for each business listing's seller.
    const candidates = await db.transactions.run((tx) => w.repo.availabilityCandidates(tx, ids, null), { readOnly: true });
    const verification = new Map<string, string>();
    const prices = new Map<string, number[]>();
    for (const c of candidates) {
      if (c.sellerKindAtCreation === 'business' && !verification.has(c.sellerId)) verification.set(c.sellerId, (await idn.getSellerVerification({ sellerId: c.sellerId })).status);
      if (c.sellerKindAtCreation === 'individual' || verification.get(c.sellerId) === 'Approved') prices.set(c.catalogEntryId, [...(prices.get(c.catalogEntryId) ?? []), c.priceCop]);
    }
    expect(batch.items).toEqual(ids.map((catalogEntryId) => {
      const p = prices.get(catalogEntryId) ?? [];
      return { catalogEntryId, lowestPriceCop: p.length ? Math.min(...p) : null, availableCount: p.length };
    }));
    // The case is real: the Pending shop's listings are candidates that neither form counts, and Approved shops' are counted.
    expect([verification.get(businessId(8)), verification.get(businessId(0))]).toEqual(['Pending', 'Approved']);
    // And the two identity forms agree seller by seller, over every kind of account the seed has.
    const sellers = [...Array.from({ length: 14 }, (_, b) => businessId(b)), individualId(0), buyerId(5)];
    const kinds = await idn.getSellerKinds({ userIds: sellers });
    const single = await Promise.all(sellers.map(async (s) => (await idn.getSellerVerification({ sellerId: s })).status === 'Approved'));
    expect(kinds.sellers.map((k) => k.verified)).toEqual(single);
  }, 120_000);
});
