// ATDD — ORD (contracts.md §6, §15, §15.12). Red phase: every test must fail with NotImplementedError.
// `listings` and `identity` are fakes (NFR-SYS-3); the Order rows are real.
import { describe, expect, it } from 'vitest';
import { OrdServiceV2 } from '../../../src/modules/orders/index.js';
import type { IdentityForOrd, ListingsForOrd } from '../../../src/modules/orders/index.js';
import { DomainError } from '../../../src/shared-kernel/errors.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../test-support/errors.js';
import { codeOf, race } from '../../../test-support/concurrency.js';
import { at, business, explainAssert, fake, HOUR, id, order, rows, T0, user, wiring } from '../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();

interface Calls { released: unknown[]; reserved: number }
function setup(o: { reserveError?: string; calls?: Calls } = {}) {
  const calls = o.calls ?? { released: [], reserved: 0 };
  const w = wiring(db);
  const listings = fake<ListingsForOrd>('listings', {
    getListingForPurchase: async ({ listingId }) => ({ sellerId: listingId === id('own') ? id('camila') : id('andres'), kind: 'single', visible: true }),
    getInventoryUnitIds: async () => ({ unitIds: [id('uchar')] }),
    reserveForPurchase: async (_tx, { listingId, qty }) => {
      calls.reserved++;
      if (o.reserveError) throw new DomainError(o.reserveError as 'InsufficientQuantity', [{ rule: 'FR-INV-3', inputs: { requested: qty, available: 0 } }]);
      return { reservationRef: { listingId, units: [{ inventoryUnitId: id('uchar'), qty }] }, exhaustedListingIds: [], snapshot: { title: 'Charizard ex', itemRef: id('char'), condition: 'NM', unitPriceCop: 45_000, components: null } };
    },
    releaseReservation: async (_tx, { reservationRef }) => { calls.released.push(reservationRef); return { releasedUnits: 1 }; },
  });
  const identity = fake<IdentityForOrd>('identity', {
    getBusinessPaymentInstructions: async () => ({ bankName: 'Bancolombia', accountType: 'savings', accountNumber: '12345678901', holderName: 'Andrés Tienda', qrObjectKey: null }),
  });
  return { w, calls, ord: new OrdServiceV2({ ...w, listings, identity }) };
}
async function people(): Promise<void> {
  await business(db, id('andres'), 'Approved');
  await user(db, { id: id('camila') });
}
const base = { buyerId: id('camila'), businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar') };
const orderRow = async (orderId: string) => (await rows<Record<string, unknown>>(db, 'Order', 'id = $1', [orderId]))[0];
const outbox = () => rows<{ type: string; payload: Record<string, unknown> }>(db, 'OutboxEvent');

describe('ORD-1 — createOrder (contracts.md §6)', () => {
  it('[ORD-1.Q1] a purchase creates an AwaitingPayment order: exact total, 48 h expiry, both snapshots, an audit row and no event', async () => {
    await people();
    const { w, ord } = setup();
    const result = await ord.createOrder({ listingId: id('lchar'), qty: 2, buyerId: id('camila') });
    expect(result).toMatchObject({ status: 'AwaitingPayment', totalCop: 90_000, expiresAt: new Date(w.clock.now().getTime() + 48 * HOUR).toISOString(), paymentInstructions: { bankName: 'Bancolombia' } });
    explainAssert(result.decision, { rule: 'FR-ORD-1', inputs: { orderId: result.orderId, qty: 2, totalCop: 90_000 } });
    expect(await orderRow(result.orderId)).toMatchObject({ qty: 2, unitPriceCop: '45000', totalCop: '90000', reservedUnitIds: [id('uchar')] });
    expect(await outbox()).toHaveLength(0);
    expect(await rows(db, 'audit_events', `action = 'orders.order.created'`)).toHaveLength(1);
  });

  it('[ORD-1.P3] buying your own listing is SelfPurchaseNotAllowed (409) and reserves nothing', async () => {
    await people();
    const { calls, ord } = setup();
    const error = await caught(() => ord.createOrder({ listingId: id('own'), qty: 1, buyerId: id('camila') }));
    expect(codeOf(error)).toBe('SelfPurchaseNotAllowed');
    expect(calls.reserved).toBe(0);
  });

  it('[ORD-1.P4] a buyer holding 3 open orders gets TooManyOpenOrders (409) naming them', async () => {
    await people();
    for (const k of ['o1', 'o2', 'o3']) {
      await business(db, id(`shop${k}`), 'Approved');
      await order(db, { ...base, id: id(k), businessId: id(`shop${k}`) });
    }
    const error = await caught(() => setup().ord.createOrder({ listingId: id('lchar'), qty: 1, buyerId: id('camila') }));
    expect(codeOf(error)).toBe('TooManyOpenOrders');
    expect(String(citedInputs(error)?.openOrderIds)).toContain(id('o1'));
  });

  it('[ORD-1.P5] a listing refusal propagates unchanged and no order exists', async () => {
    await people();
    const error = await caught(() => setup({ reserveError: 'InsufficientQuantity' }).ord.createOrder({ listingId: id('lchar'), qty: 1, buyerId: id('camila') }));
    expect(codeOf(error)).toBe('InsufficientQuantity');
    expect(await rows(db, 'Order')).toHaveLength(0);
  });

  it('[ORD-1.I2] two concurrent purchases from the same business: one order, one TooManyOpenOrders (AD-ORD-1, 50 × 1 per buyer lock)', async () => {
    await people();
    const outcome = await race(2, () => setup().ord.createOrder({ listingId: id('lchar'), qty: 1, buyerId: id('camila') }));
    expect(outcome.rejected.map(codeOf)).toEqual(['TooManyOpenOrders']);
    expect(await rows(db, 'Order')).toHaveLength(1);
  });

  it('[ORD-1.I4] the Order holds no balance, escrow or payment-status column (AD-2, NFR-ORD-3)', async () => {
    await people();
    await setup().ord.createOrder({ listingId: id('lchar'), qty: 1, buyerId: id('camila') });
    const cols = (await db.query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Order'`)).map((c) => c.column_name.toLowerCase());
    expect(cols.filter((c) => /balance|escrow|paymentstatus|status$/.test(c))).toEqual([]);
  });
});

describe('ORD-2 — confirmPaid (contracts.md §6)', () => {
  it('[ORD-2.Q1] the buyer confirms payment: the fact is set at now, no event, one audit row', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), comprobante: true });
    const { w, ord } = setup();
    const result = await ord.confirmPaid({ orderId: id('o1'), buyerId: id('camila') });
    expect(result).toMatchObject({ orderId: id('o1'), status: 'Paid', buyerPaidConfirmedAt: w.clock.iso() });
    explainAssert(result.decision, { rule: 'FR-ORD-3', inputs: { orderId: id('o1') } });
    expect(await outbox()).toHaveLength(0);
  });

  it('[ORD-2.P1] a foreign order is OrderNotVisibleToCaller (403) with a body identical to an unknown id', async () => {
    await people();
    await user(db, { id: id('julian') });
    await order(db, { ...base, id: id('o1'), comprobante: true });
    const foreign = await caught(() => setup().ord.confirmPaid({ orderId: id('o1'), buyerId: id('julian') }));
    const unknown = await caught(() => setup().ord.confirmPaid({ orderId: id('ghost'), buyerId: id('julian') }));
    expect(codeOf(foreign)).toBe('OrderNotVisibleToCaller');
    expect(httpOf(foreign)).toBe(403);
    expect(JSON.stringify(foreign)).toBe(JSON.stringify(unknown));
  });

  it('[ORD-2.P3] a repeat is OrderAlreadyConfirmedByRole citing the original instant', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), paidAt: at(-HOUR) });
    const error = await caught(() => setup().ord.confirmPaid({ orderId: id('o1'), buyerId: id('camila') }));
    expect(codeOf(error)).toBe('OrderAlreadyConfirmedByRole');
    expect(citedInputs(error)).toMatchObject({ orderId: id('o1'), confirmedAt: at(-HOUR) });
  });

  it('[ORD-2.P4] past expiresAt the order is OrderNoLongerActive, and the expiry is materialized with the reservation released once', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), comprobante: true, createdAt: at(-49 * HOUR), expiresAt: at(-HOUR) });
    const { calls, ord } = setup();
    const error = await caught(() => ord.confirmPaid({ orderId: id('o1'), buyerId: id('camila') }));
    expect(codeOf(error)).toBe('OrderNoLongerActive');
    expect(await orderRow(id('o1'))).toMatchObject({ cancelReason: 'Unpaid', buyerPaidConfirmedAt: null });
    expect(calls.released).toHaveLength(1);
  });

  it('[ORD-2.P5] paying without a comprobante is ComprobanteNotYetUploaded (409)', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), comprobante: false });
    expect(codeOf(await caught(() => setup().ord.confirmPaid({ orderId: id('o1'), buyerId: id('camila') })))).toBe('ComprobanteNotYetUploaded');
  });

  it('[ORD-2.I2] a paid order can no longer be cancelled (AD-ORD-2, AD-2)', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), comprobante: true });
    const { ord } = setup();
    await ord.confirmPaid({ orderId: id('o1'), buyerId: id('camila') });
    expect(codeOf(await caught(() => ord.cancelOrder({ orderId: id('o1'), buyerId: id('camila') })))).toBe('OrderNotCancellable');
    expect(await orderRow(id('o1'))).toMatchObject({ cancelledAt: null });
  });

  it('[ORD-2.MEC] paid races expiry at now = expiresAt, 100 repetitions: paid with the reservation held, or expired with it released exactly once, never both (NFR-ORD-1)', async () => {
    await people();
    for (let rep = 0; rep < 100; rep++) {
      const oid = id(`race${rep}`);
      await order(db, { ...base, id: oid, comprobante: true, createdAt: at(-48 * HOUR), expiresAt: T0 });
      const calls: Calls = { released: [], reserved: 0 };
      const outcome = await race<unknown>(2, (i) => (i === 0
        ? setup({ calls }).ord.confirmPaid({ orderId: oid, buyerId: id('camila') })
        : setup({ calls }).ord.expireDueOrders({ scope: 'all', trigger: 'tick' })));
      expect(outcome.rejected.map(codeOf).filter((c) => c !== 'OrderNoLongerActive')).toEqual([]);
      const row = await orderRow(oid);
      const paid = row?.buyerPaidConfirmedAt !== null;
      expect(calls.released).toHaveLength(paid ? 0 : 1);
      expect(paid && row?.expiredAt !== null).toBe(false);
    }
  });
});

describe('ORD-3 — confirmPaymentReceived (contracts.md §6)', () => {
  it('[ORD-3.Q1] the business confirms a paid order: one OrderPaymentConfirmedByBusiness event to commission', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), paidAt: at(-HOUR) });
    const { w, ord } = setup();
    const result = await ord.confirmPaymentReceived({ orderId: id('o1'), businessId: id('andres') });
    expect(result).toMatchObject({ status: 'PaymentConfirmed', sellerReceivedConfirmedAt: w.clock.iso() });
    const [event] = await outbox();
    expect(event).toMatchObject({ type: 'OrderPaymentConfirmedByBusiness', payload: { orderId: id('o1'), totalCop: 45_000, sellerReceivedConfirmedAt: w.clock.iso(), buyerItemReceivedConfirmedAt: null } });
    expect((await rows(db, 'EventDelivery')).map((d) => d.subscriber)).toEqual(['commission']);
  });

  it('[ORD-3.MEC] [ORD-3.I3] before the buyer paid, or before any comprobante, the business gets OrderNotVisibleToCaller with a body identical to an unknown id (AD-15)', async () => {
    await people();
    await order(db, { ...base, id: id('unpaid'), comprobante: true });
    await order(db, { ...base, id: id('nocomp'), comprobante: false });
    const unpaid = await caught(() => setup().ord.confirmPaymentReceived({ orderId: id('unpaid'), businessId: id('andres') }));
    const nocomp = await caught(() => setup().ord.confirmPaymentReceived({ orderId: id('nocomp'), businessId: id('andres') }));
    const unknown = await caught(() => setup().ord.confirmPaymentReceived({ orderId: id('ghost'), businessId: id('andres') }));
    expect([codeOf(unpaid), codeOf(nocomp)]).toEqual(['OrderNotVisibleToCaller', 'OrderNotVisibleToCaller']);
    expect(JSON.stringify(unpaid)).toBe(JSON.stringify(unknown));
    expect(await outbox()).toHaveLength(0);
  });

  it('[ORD-3.P2] the buyer calling the business confirmation is OrderNotOwnedByCaller (403)', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), paidAt: at(-HOUR) });
    expect(codeOf(await caught(() => setup().ord.confirmPaymentReceived({ orderId: id('o1'), businessId: id('camila') })))).toBe('OrderNotOwnedByCaller');
  });

  it('[ORD-3.R1] a double confirmation publishes once and the second gets OrderAlreadyConfirmedByRole', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), paidAt: at(-HOUR) });
    const outcome = await race(2, () => setup().ord.confirmPaymentReceived({ orderId: id('o1'), businessId: id('andres') }));
    expect(outcome.rejected.map(codeOf)).toEqual(['OrderAlreadyConfirmedByRole']);
    expect(await outbox()).toHaveLength(1);
  });

  it('[ORD-3.Q2] when the buyer already received the item, the business confirmation returns Closed', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), paidAt: at(-2 * HOUR), itemAt: at(-HOUR) });
    expect((await setup().ord.confirmPaymentReceived({ orderId: id('o1'), businessId: id('andres') })).status).toBe('Closed');
  });
});

describe('ORD-4 — confirmItemReceived (contracts.md §6)', () => {
  it('[ORD-4.Q1] the buyer receives the item: the order closes and one OrderClosed goes to commission and collections', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), paidAt: at(-HOUR) });
    const result = await setup().ord.confirmItemReceived({ orderId: id('o1'), buyerId: id('camila') });
    expect(result.status).toBe('Closed');
    const [event] = await outbox();
    expect(event).toMatchObject({ type: 'OrderClosed', payload: { orderId: id('o1'), lines: [{ qty: 1, unitPriceCop: 45_000 }] } });
    expect((await rows(db, 'EventDelivery')).map((d) => d.subscriber).sort()).toEqual(['collections', 'commission']);
  });

  it('[ORD-4.Q2] a 2-of-a-3-card bundle closes with 3 component lines of qty 2 and no unit price', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), qty: 2, paidAt: at(-HOUR) });
    await db.query(`UPDATE "Order" SET "listingSnapshot" = $1 WHERE id = $2`, [JSON.stringify({ title: 'Trío', itemRef: null, condition: null, unitPriceCop: 45_000, components: [{ catalogEntryId: id('e1'), perBundleQty: 1 }, { catalogEntryId: id('e2'), perBundleQty: 1 }, { catalogEntryId: id('e3'), perBundleQty: 1 }] }), id('o1')]);
    await setup().ord.confirmItemReceived({ orderId: id('o1'), buyerId: id('camila') });
    const [event] = await outbox();
    expect(event?.payload.lines).toEqual([id('e1'), id('e2'), id('e3')].map((e) => ({ itemRef: e, title: expect.any(String), qty: 2 })));
  });

  it('[ORD-4.MEC] the item confirmed before "paid" is OrderConfirmationOutOfOrder (409) with zero writes; a double confirmation publishes once (NFR-ORD-1)', async () => {
    await people();
    await order(db, { ...base, id: id('unpaid'), comprobante: true });
    await order(db, { ...base, id: id('paid'), paidAt: at(-HOUR) });
    const early = await caught(() => setup().ord.confirmItemReceived({ orderId: id('unpaid'), buyerId: id('camila') }));
    expect(codeOf(early)).toBe('OrderConfirmationOutOfOrder');
    expect(citedInputs(early)).toMatchObject({ orderId: id('unpaid'), buyerPaidConfirmedAt: null });
    const outcome = await race(2, () => setup().ord.confirmItemReceived({ orderId: id('paid'), buyerId: id('camila') }));
    expect(outcome.rejected.map(codeOf)).toEqual(['OrderAlreadyConfirmedByRole']);
    expect(await outbox()).toHaveLength(1);
  });

  it('[ORD-4.P2] the business calling the item confirmation is OrderNotOwnedByCaller (403)', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), paidAt: at(-HOUR) });
    expect(codeOf(await caught(() => setup().ord.confirmItemReceived({ orderId: id('o1'), buyerId: id('andres') })))).toBe('OrderNotOwnedByCaller');
  });

  it('[ORD-4.P3] an expired unpaid order is OrderNoLongerActive, which takes precedence over out-of-order', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), comprobante: true, createdAt: at(-49 * HOUR), expiresAt: at(-HOUR) });
    expect(codeOf(await caught(() => setup().ord.confirmItemReceived({ orderId: id('o1'), buyerId: id('camila') })))).toBe('OrderNoLongerActive');
  });
});
