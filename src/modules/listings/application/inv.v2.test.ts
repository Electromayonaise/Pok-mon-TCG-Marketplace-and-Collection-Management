// INV against Postgres with the real neighbours: the edges the ATDD tests leave out.
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { PgTransactionRunner, useTestDatabase } from '../../../../test-support/db.js';
import { PG } from '../../../../test-support/env.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { business, catalogEntry, commissionState, fake, id, individualSeller, listing, purchasableListing, rows, T0, unit, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { CatServiceV2 } from '../../catalog/index.js';
import { IdnServiceV2 } from '../../identity/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../../shared-kernel/external.js';
import type { TransactionRunner } from '../../../shared-kernel/ports.js';
import type { CatalogForInv, IdentityForInv } from '../ports/inv.v2.js';
import { InvServiceV2 } from './inv.v2.js';

const db = useTestDatabase();

/** INV composed as the composition root binds it: the real identity and catalog. */
function inventory(transactions: TransactionRunner = db.transactions) {
  const w = { ...wiring(db), transactions };
  const catalog = new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });
  return new InvServiceV2({ ...w, catalog, identity: new IdnServiceV2(w) });
}
const andres = (quantity: number) => purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity });

describe('reserveForPurchase with the real neighbours (INV-1, AD-SYS-4 rule 9)', () => {
  it('runs inside a transaction on a pool of 1: identity and catalog read on the ambient connection', async () => {
    await andres(1);
    await listing(db, { id: id('lchar2'), sellerId: id('andres'), unitId: id('uchar'), priceCop: 48_000 });
    const pool = new pg.Pool({ ...PG, database: (db.pool.options as { database: string }).database, max: 1 });
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      const transactions = new PgTransactionRunner(pool);
      const inv = inventory(transactions);
      const deadlock = new Promise<never>((_, reject) => { watchdog = setTimeout(() => reject(new Error('deadlock: a second connection was requested')), 3_000); });
      const result = await Promise.race([transactions.run((tx) => inv.reserveForPurchase(tx, { listingId: id('lchar'), qty: 1, buyerId: id('camila') })), deadlock]);
      expect(result.snapshot).toEqual({ title: `Carta ${id('char').slice(0, 6)}`, itemRef: id('char'), condition: 'NM', unitPriceCop: 45_000, components: null });
      expect(result.exhaustedListingIds).toEqual([id('lchar'), id('lchar2')].sort());
    } finally {
      clearTimeout(watchdog);
      await pool.end();
    }
  });

  it('a Pending business is ListingNotPurchasable citing ListingUnverified, before any unit moves', async () => {
    await business(db, id('andres'), 'Pending');
    await commissionState(db, id('andres'));
    await catalogEntry(db, id('char'));
    await unit(db, { id: id('uchar'), sellerId: id('andres'), catalogEntryId: id('char'), quantity: 2 });
    await listing(db, { id: id('lchar'), sellerId: id('andres'), unitId: id('uchar') });
    const error = await caught(() => db.transactions.run((tx) => inventory().reserveForPurchase(tx, { listingId: id('lchar'), qty: 1, buyerId: id('camila') })));
    expect([codeOf(error), citedInputs(error)?.reasonCode]).toEqual(['ListingNotPurchasable', 'ListingUnverified']);
    expect((await rows<{ quantity: number }>(db, 'InventoryUnit'))[0]?.quantity).toBe(2);
  });

  it('a quantity that is not an integer ≥ 1 is a programming error, raised before any SQL', async () => {
    await andres(3);
    for (const qty of [0, 1.5]) {
      const error = await caught(() => db.transactions.run((tx) => inventory().reserveForPurchase(tx, { listingId: id('lchar'), qty, buyerId: id('camila') })));
      expect(codeOf(error)).toBe('Unexpected');
    }
  });
});

describe('releaseReservation and the unit port (S-FR-INV-5, P-INV.units)', () => {
  it('a reference naming one unit twice releases the sum once', async () => {
    await andres(1);
    const released = await db.transactions.run((tx) => inventory().releaseReservation(tx, { reservationRef: { listingId: id('lchar'), units: [{ inventoryUnitId: id('uchar'), qty: 1 }, { inventoryUnitId: id('uchar'), qty: 2 }] } }));
    expect(released).toEqual({ releasedUnits: 3 });
    expect((await rows<{ quantity: number }>(db, 'InventoryUnit'))[0]?.quantity).toBe(4);
  });

  it('an unknown listing has no unit ids, and the purchase port refuses it as ListingNotFound', async () => {
    const inv = inventory();
    expect(await inv.getInventoryUnitIds({ listingId: id('ghost') })).toEqual({ unitIds: [] });
    expect(codeOf(await caught(() => inv.getListingForPurchase({ listingId: id('ghost') })))).toBe('ListingNotFound');
  });
});

describe('the listings subscribers (INV-3, S-FR-INV-8, AD-INV-3 rules 4–5)', () => {
  const decide = (inv: InvServiceV2, type: 'BusinessApplicationApproved' | 'BusinessApplicationRejected', applicationId: string, decidedAt: string) =>
    db.transactions.run((tx) => inv.applyApplicationDecision(tx, { type, applicationId, businessId: id('andres'), decidedAt }));

  it('a negative or fractional ledgerSeq is Unexpected and writes nothing', async () => {
    for (const ledgerSeq of [-1, 1.5]) {
      const error = await caught(() => db.transactions.run((tx) => inventory().applyCommissionProjection(tx, { type: 'CommissionBalanceExhausted', businessId: id('andres'), ledgerSeq, balanceAfter: 0 })));
      expect(codeOf(error)).toBe('Unexpected');
    }
    expect(await rows(db, 'SellerCommissionState')).toHaveLength(0);
  });

  it('Replenished resumes the paused listings and audits once as the system', async () => {
    await andres(2);
    await db.query(`UPDATE "Listing" SET "pausedAt" = $1`, [T0]);
    const result = await db.transactions.run((tx) => inventory().applyCommissionProjection(tx, { type: 'CommissionBalanceReplenished', businessId: id('andres'), ledgerSeq: 9, balanceAfter: 50_000 }));
    expect(result).toEqual({ applied: true, listingsChanged: 1 });
    expect(await rows(db, 'audit_events', `action = 'listings.commissionProjection.applied'`)).toMatchObject([{ actorKind: 'system', actorId: null }]);
  });

  it('a redelivered decision is ignored and writes no second row', async () => {
    await andres(2);
    const inv = inventory();
    expect(await decide(inv, 'BusinessApplicationRejected', id('a1'), '2026-09-20T00:00:00.000Z')).toEqual({ applied: true, ignored: false, listingsChanged: 1 });
    expect(await decide(inv, 'BusinessApplicationRejected', id('a1'), '2026-09-20T00:00:00.000Z')).toEqual({ applied: false, ignored: true, listingsChanged: 0 });
    expect(await rows(db, 'AppliedApplicationDecision')).toHaveLength(1);
  });

  it('an older Rejected and a newer Approved delivered at once: the newer wins whatever the commit order, 20 times', async () => {
    await andres(2);
    for (let rep = 0; rep < 20; rep++) {
      await db.query(`TRUNCATE "AppliedApplicationDecision"`);
      await db.query(`UPDATE "Listing" SET "withdrawnAt" = NULL, "withdrawnReason" = NULL, "withdrawnByApplicationId" = NULL`);
      const inv = inventory();
      await Promise.all([
        decide(inv, 'BusinessApplicationRejected', id(`r${rep}`), '2026-09-20T00:00:00.000Z'),
        decide(inv, 'BusinessApplicationApproved', id(`p${rep}`), '2026-09-25T00:00:00.000Z'),
      ]);
      expect(await rows(db, 'Listing', '"withdrawnAt" IS NOT NULL')).toHaveLength(0);
    }
  });
});

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

describe('Epic 8: the seller advisory lock (AD-SYS-4 rule 4, decision log Impl-1 #33)', () => {
  it('a first Replenished that has not committed yet holds back a business listing\'s creation, which then lists unpaused', async () => {
    await business(db, id('andres'), 'Approved');
    await catalogEntry(db, id('char'));
    const inv = inventory();
    let release!: () => void;
    let applied!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const ready = new Promise<void>((resolve) => { applied = resolve; });
    const subscriber = db.transactions.run(async (tx) => {
      await inv.applyCommissionProjection(tx, { type: 'CommissionBalanceReplenished', businessId: id('andres'), ledgerSeq: 1, balanceAfter: 50_000 });
      applied();
      await gate;
    });
    await ready;
    let created = false;
    const creation = inv.createListing({ itemRef: id('char'), condition: 'NM', priceCop: 45_000, quantity: 1, location: null, description: '', openToTrade: false, sellerId: id('andres') })
      .then((r) => { created = true; return r; });
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(created).toBe(false);
    } finally {
      // Released on a failed assertion too, so the subscriber's transaction never outlives the test.
      release();
      await subscriber;
      await creation;
    }
    expect(await rows(db, 'Listing', '"pausedAt" IS NULL')).toHaveLength(1);
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
