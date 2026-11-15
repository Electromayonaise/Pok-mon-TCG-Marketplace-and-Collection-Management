// INV against Postgres with the real neighbours, the edges the ATDD tests leave out: the reserve in the caller's
// transaction (INV-1), the release and the unit port, the listings subscribers (INV-3) and the seller advisory lock.
// Split from inv.v2.test.ts by the Impl-2 test review (HIGH-3); the shared Given steps are in test-support/suites/inv.ts.
import { describe, expect, it } from 'vitest';
import { PgTransactionRunner } from '../../../../test-support/db.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { business, catalogEntry, commissionState, id, listing, rows, T0, unit } from '../../../../test-support/solu2/fixtures.js';
import { InvServiceV2 } from './inv.v2.js';
import { untilBlockedOnLock } from '../../../../test-support/locks.js';
import { singleConnectionPool } from '../../../../test-support/single-connection.js';
import { useInvSuite } from '../../../../test-support/suites/inv.js';

const { db, inventory, andres } = useInvSuite();

describe('reserveForPurchase with the real neighbours (INV-1, AD-SYS-4 rule 9)', () => {
  it('runs inside a transaction on a pool of 1: identity and catalog read on the ambient connection', async () => {
    await andres(1);
    await listing(db, { id: id('lchar2'), sellerId: id('andres'), unitId: id('uchar'), priceCop: 48_000 });
    const pool = singleConnectionPool(db);
    try {
      const transactions = new PgTransactionRunner(pool);
      const inv = inventory(transactions);
      const result = await transactions.run((tx) => inv.reserveForPurchase(tx, { listingId: id('lchar'), qty: 1, buyerId: id('camila') }));
      expect(result.snapshot).toEqual({ title: `Carta ${id('char').slice(0, 6)}`, itemRef: id('char'), condition: 'NM', unitPriceCop: 45_000, components: null });
      expect(result.exhaustedListingIds).toEqual([id('lchar'), id('lchar2')].sort());
    } finally {
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
      // Postgres reports the creation waiting on the seller's advisory lock: the block is proven, not timed.
      await untilBlockedOnLock(db, "hashtextextended('listings:seller:'");
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
