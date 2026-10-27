// INV against Postgres with the real neighbours: the edges the ATDD tests leave out.
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { PgTransactionRunner, useTestDatabase } from '../../../../test-support/db.js';
import { PG } from '../../../../test-support/env.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { business, catalogEntry, commissionState, fake, id, listing, purchasableListing, rows, unit, wiring } from '../../../../test-support/solu2/fixtures.js';
import { CatServiceV2 } from '../../catalog/index.js';
import { IdnServiceV2 } from '../../identity/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../../shared-kernel/external.js';
import type { TransactionRunner } from '../../../shared-kernel/ports.js';
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
    await db.query(`UPDATE "Listing" SET "pausedAt" = now()`);
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
