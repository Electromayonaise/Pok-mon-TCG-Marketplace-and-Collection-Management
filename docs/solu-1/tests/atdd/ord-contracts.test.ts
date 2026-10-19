// Solu-1 ATDD — ORD contracts (contracts.md §6). RED until implemented.
import { beforeEach, describe, expect, it } from 'vitest';
import { createOrdModule, type ListingsForOrders } from '../../../../src/modules/orders/index.js';
import { HOUR } from '../../../../test-support/clock.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';
import { wiring, type Wiring } from '../../../../test-support/wiring.js';

const db = useTestDatabase();
let w: Wiring;
let releases: unknown[];
const listings: ListingsForOrders = {
  releaseReservation: async (_tx, ref) => {
    releases.push(ref);
  },
};
beforeEach(() => {
  w = wiring(db);
  releases = [];
});
const ord = () => createOrdModule({ sql: w.sql, transactions: w.transactions, outbox: w.outbox, clock: w.clock, listings });
const camila = id('camila');
const andres = id('andres');

/** Camila's order with Andrés, created at the seed instant, expiring 48 h later. */
async function orderScene(o: { comprobante?: boolean; paidAt?: string | null; itemReceivedAt?: string | null; sellerReceivedAt?: string | null } = {}) {
  return seed.order(db, { id: id('order'), buyerId: camila, businessId: andres, listingId: id('lpika'), unitId: id('unitpika'), ...o });
}
const facts = async () => (await db.query(`SELECT "buyerPaidConfirmedAt", "expiredAt", "cancelReason", version FROM "Order" WHERE id = $1`, [id('order')]))[0];

describe('Solu-1 ATDD: ORD — assertOrderVisible (guard, FR-ORD-6, AD-15)', () => {
  it('RED: the buyer sees the order; the business sees it once the buyer confirmed paid', async () => {
    await orderScene({ paidAt: '2026-10-01T16:00:00.000Z' });
    expect(await ord().assertOrderVisible({ orderId: id('order'), actorId: camila })).toEqual({ role: 'buyer' });
    expect(await ord().assertOrderVisible({ orderId: id('order'), actorId: andres })).toEqual({ role: 'business' });
  });

  it('RED: before "paid", the business, a stranger and an unknown id all get OrderNotVisibleToCaller (403)', async () => {
    await orderScene();
    for (const [orderId, actorId] of [[id('order'), andres], [id('order'), id('julian')], [id('ghost'), camila]] as const) {
      const error = await caught(() => ord().assertOrderVisible({ orderId, actorId }));
      expect(codeOf(error)).toBe('OrderNotVisibleToCaller');
      expect(httpOf(error)).toBe(403);
    }
  });
});

describe('Solu-1 ATDD: ORD — confirmPaid (contended mutation, AD-ORD-2, AD-2)', () => {
  it('RED: with a comprobante and before expiry, "paid" is set once at now and no event is enqueued', async () => {
    await orderScene({ comprobante: true });
    w.clock.advance(HOUR);
    const result = await ord().confirmPaid({ orderId: id('order'), buyerId: camila });
    expect(result).toEqual({ orderId: id('order'), buyerPaidConfirmedAt: w.clock.iso(), status: 'Paid' });
    expect(await facts()).toMatchObject({ buyerPaidConfirmedAt: w.clock.now(), version: 1 });
    expect(await db.counts(['OutboxEvent'])).toEqual({ OutboxEvent: 0 });
  });

  it('RED: without a comprobante it gets ComprobanteNotYetUploaded (409) and nothing changes', async () => {
    await orderScene({ comprobante: false });
    const error = await caught(() => ord().confirmPaid({ orderId: id('order'), buyerId: camila }));
    expect(codeOf(error)).toBe('ComprobanteNotYetUploaded');
    expect(httpOf(error)).toBe(409);
    expect(await facts()).toMatchObject({ buyerPaidConfirmedAt: null, version: 0 });
  });

  it('RED (mandatory edge case): a repeated confirmation gets OrderAlreadyConfirmedByRole (409) citing the original instant', async () => {
    await orderScene({ paidAt: '2026-10-01T16:00:00.000Z' });
    const error = await caught(() => ord().confirmPaid({ orderId: id('order'), buyerId: camila }));
    expect(codeOf(error)).toBe('OrderAlreadyConfirmedByRole');
    expect(citedInputs(error)).toMatchObject({ orderId: id('order'), buyerPaidConfirmedAt: '2026-10-01T16:00:00.000Z' });
  });

  it('RED: the business cannot confirm "paid" — it cannot see the unpaid order, so OrderNotVisibleToCaller (403) comes first', async () => {
    await orderScene({ comprobante: true });
    const error = await caught(() => ord().confirmPaid({ orderId: id('order'), buyerId: andres }));
    expect(codeOf(error)).toBe('OrderNotVisibleToCaller');
    expect(httpOf(error)).toBe(403);
    expect(await facts()).toMatchObject({ buyerPaidConfirmedAt: null, version: 0 });
  });

  it('RED: past expiresAt (not yet materialized) it gets OrderNoLongerActive, and the expiry is materialized once with its reservation released', async () => {
    await orderScene({ comprobante: true });
    w.clock.advance(48 * HOUR + 1000);
    const error = await caught(() => ord().confirmPaid({ orderId: id('order'), buyerId: camila }));
    expect(codeOf(error)).toBe('OrderNoLongerActive');
    expect(await facts()).toMatchObject({ buyerPaidConfirmedAt: null, expiredAt: w.clock.now(), cancelReason: 'Unpaid' });
    expect(releases).toEqual([{ listingId: id('lpika'), units: [{ inventoryUnitId: id('unitpika'), qty: 1 }] }]);
  });

  it('RED (NFR-ORD-1 boundary): at now = expiresAt exactly, "paid" loses — expiresAt > now is required', async () => {
    await orderScene({ comprobante: true });
    w.clock.advance(48 * HOUR);
    expect(codeOf(await caught(() => ord().confirmPaid({ orderId: id('order'), buyerId: camila })))).toBe('OrderNoLongerActive');
  });

  it('RED: a double click — two simultaneous confirmations, exactly one success, the other OrderAlreadyConfirmedByRole', async () => {
    await orderScene({ comprobante: true });
    const outcome = await race(2, () => ord().confirmPaid({ orderId: id('order'), buyerId: camila }));
    expect(outcome.rejected.map(codeOf)).toEqual(['OrderAlreadyConfirmedByRole']);
    expect(outcome.fulfilled).toHaveLength(1);
    expect(await facts()).toMatchObject({ version: 1 });
  });
});

describe('Solu-1 ATDD: ORD — hasClosedPurchase (resolver, FR-ORD-9)', () => {
  it('RED: a closed order means closed=true and latestState Closed', async () => {
    await orderScene({ paidAt: '2026-10-01T16:00:00.000Z', itemReceivedAt: '2026-10-03T16:00:00.000Z' });
    expect(await ord().hasClosedPurchase({ buyerId: camila, businessId: andres })).toEqual({ closed: true, latestState: 'Closed' });
  });

  it('RED: "paid" is not enough — closed=false with latestState Paid', async () => {
    await orderScene({ paidAt: '2026-10-01T16:00:00.000Z' });
    expect(await ord().hasClosedPurchase({ buyerId: camila, businessId: andres })).toEqual({ closed: false, latestState: 'Paid' });
  });

  it('RED: a pair with no order resolves silently to { closed: false, latestState: null }', async () => {
    expect(await ord().hasClosedPurchase({ buyerId: camila, businessId: andres })).toEqual({ closed: false, latestState: null });
  });
});
