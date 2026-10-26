// ATDD — ORD supporting contracts, offered ports and read models (contracts.md §15). Split from ord_contracts.test.ts (test review R-7..R-12).
// `listings` and `identity` are fakes (NFR-SYS-3); the Order rows are real.
import { describe, expect, it } from 'vitest';
import { OrdServiceV2 } from '../../../src/modules/orders/index.js';
import type { IdentityForOrd, ListingsForOrd } from '../../../src/modules/orders/index.js';
import { DomainError } from '../../../src/shared-kernel/errors.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { caught } from '../../../test-support/errors.js';
import { codeOf, race } from '../../../test-support/concurrency.js';
import { admin, at, business, fake, HOUR, id, order, rows, user, wiring } from '../../../test-support/solu2/fixtures.js';

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

describe('Supporting ORD contracts (contracts.md §15, §15.12)', () => {
  it('[S-FR-ORD-2.h] replacing the comprobante before "paid" stores the new key and deletes the old object', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), comprobante: true });
    const { w, ord } = setup();
    await w.storage.put('order-comprobantes', `order-comprobantes/${id('o1')}`, new Uint8Array([1]), 'image/jpeg');
    const key = `comprobante/${id('camila')}/c2`;
    w.storage.simulateDirectUpload(key, new Uint8Array([0xff, 0xd8, 0xff, 1, 0xff, 0xd9]), 'image/jpeg');
    const result = await ord.uploadComprobante({ orderId: id('o1'), buyerId: id('camila'), uploadKey: key });
    expect(result.replacedPrevious).toBe(true);
    expect(await w.storage.get('order-comprobantes', `order-comprobantes/${id('o1')}`)).toBeNull();
    expect(await w.storage.get('upload-quarantine', key)).toBeNull();
  });

  it('[S-FR-ORD-2.f] after "paid" a new comprobante is ComprobanteLocked and the promoted object is deleted', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), paidAt: at(-HOUR) });
    const { w, ord } = setup();
    const key = `comprobante/${id('camila')}/late`;
    w.storage.simulateDirectUpload(key, new Uint8Array([0xff, 0xd8, 0xff, 1, 0xff, 0xd9]), 'image/jpeg');
    const error = await caught(() => ord.uploadComprobante({ orderId: id('o1'), buyerId: id('camila'), uploadKey: key }));
    expect(codeOf(error)).toBe('ComprobanteLocked');
    expect([...w.storage.objects.keys()].filter((k) => k.startsWith('order-comprobantes/') && !k.endsWith(id('o1')))).toEqual([]);
  });

  it('[S-FR-ORD-2.url.h] the comprobante URL expires 600 s after the read', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), comprobante: true });
    const { w, ord } = setup();
    const result = await ord.getComprobanteUrl({ orderId: id('o1'), actorId: id('camila') });
    expect(result.expiresAt).toBe(new Date(w.clock.now().getTime() + 600_000).toISOString());
  });

  it('[S-FR-ORD-6.h] visibility matrix: the buyer always sees the order; the business only once it is paid', async () => {
    await people();
    await order(db, { ...base, id: id('unpaid') });
    await order(db, { ...base, id: id('paid'), paidAt: at(-HOUR) });
    const { ord } = setup();
    const sales = await ord.listOrders({ actorId: id('andres'), side: 'sales', cursor: null });
    const purchases = await ord.listOrders({ actorId: id('camila'), side: 'purchases', cursor: null });
    expect(sales.items.map((o) => o.orderId)).toEqual([id('paid')]);
    expect(purchases.items.map((o) => o.orderId).sort()).toEqual([id('paid'), id('unpaid')].sort());
  });

  it('[S-FR-ORD-6.f] a foreign id and a random id give byte-identical bodies', async () => {
    await people();
    await user(db, { id: id('julian') });
    await order(db, { ...base, id: id('o1') });
    const foreign = await caught(() => setup().ord.getOrder({ orderId: id('o1'), actorId: id('julian') }));
    const random = await caught(() => setup().ord.getOrder({ orderId: id('random'), actorId: id('julian') }));
    expect(codeOf(foreign)).toBe('OrderNotVisibleToCaller');
    expect(JSON.stringify(foreign)).toBe(JSON.stringify(random));
  });

  it('[S-FR-ORD-7.h] a buyer cancel records BuyerCancelled and releases the reservation exactly once', async () => {
    await people();
    await order(db, { ...base, id: id('o1') });
    const { calls, ord } = setup();
    await ord.cancelOrder({ orderId: id('o1'), buyerId: id('camila') });
    expect(await orderRow(id('o1'))).toMatchObject({ cancelReason: 'BuyerCancelled' });
    expect(calls.released).toHaveLength(1);
  });

  it('[S-FR-ORD-7.f] a double cancel: the second is OrderNotCancellable and nothing is released again', async () => {
    await people();
    await order(db, { ...base, id: id('o1') });
    const calls: Calls = { released: [], reserved: 0 };
    const outcome = await race(2, () => setup({ calls }).ord.cancelOrder({ orderId: id('o1'), buyerId: id('camila') }));
    expect(outcome.rejected.map(codeOf)).toEqual(['OrderNotCancellable']);
    expect(calls.released).toHaveLength(1);
  });

  it('[S-FR-ORD-8.h] the expiry job materializes once and releases once; a second run is a no-op', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), createdAt: at(-49 * HOUR), expiresAt: at(-HOUR) });
    const calls: Calls = { released: [], reserved: 0 };
    expect(await setup({ calls }).ord.expireDueOrders({ scope: 'all', trigger: 'tick' })).toEqual({ expired: 1, released: 1 });
    expect(await setup({ calls }).ord.expireDueOrders({ scope: 'all', trigger: 'daily-night' })).toEqual({ expired: 0, released: 0 });
    expect(calls.released).toHaveLength(1);
  });

  it('[S-FR-ORD-8.f] with the job never run, the order still reads Expired (AD-SYS-6 rule 5)', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), createdAt: at(-49 * HOUR), expiresAt: at(-HOUR) });
    expect((await setup().ord.getOrder({ orderId: id('o1'), actorId: id('camila') })).status).toBe('Expired');
  });

  it('[S-FR-ORD-9.h] a closed purchase is reported closed', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), paidAt: at(-2 * HOUR), itemAt: at(-HOUR) });
    expect(await setup().ord.hasClosedPurchase({ buyerId: id('camila'), businessId: id('andres') })).toEqual({ closed: true, latestState: 'Closed' });
  });

  it('[S-FR-ORD-9.f] a paid but not closed purchase is not closed and names its state', async () => {
    await people();
    await order(db, { ...base, id: id('o1'), paidAt: at(-HOUR) });
    expect(await setup().ord.hasClosedPurchase({ buyerId: id('camila'), businessId: id('andres') })).toEqual({ closed: false, latestState: 'Paid' });
  });

  it('[S-FR-ORD-10.h] an admin lookup writes one log row and leaves the order byte-identical', async () => {
    await admin(db);
    await people();
    await order(db, { ...base, id: id('o1') });
    const before = JSON.stringify(await orderRow(id('o1')));
    const result = await setup().ord.adminLookupOrders({ adminId: id('admin'), query: { orderId: id('o1') } });
    expect(result.orders.map((o) => o.orderId)).toEqual([id('o1')]);
    expect(await rows(db, 'OrderLookupLog')).toHaveLength(1);
    expect(JSON.stringify(await orderRow(id('o1')))).toBe(before);
  });

  it('[S-FR-ORD-10.f] a non-admin lookup is AdminOnly (403)', async () => {
    await people();
    expect(codeOf(await caught(() => setup().ord.adminLookupOrders({ adminId: id('camila'), query: { orderId: id('o1') } })))).toBe('AdminOnly');
  });
});
