// ORD against Postgres with the real neighbours: the edges the ATDD tests leave out.
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { PgTransactionRunner, useTestDatabase } from '../../../../test-support/db.js';
import { PG } from '../../../../test-support/env.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { admin, at, business, catalogEntry, commissionState, HOUR, id, listing, order, purchasableListing, rows, unit, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { realInventory } from '../../../../test-support/solu2/services.js';
import { VerServiceV2 } from '../../identity/index.js';
import type { TransactionRunner } from '../../../shared-kernel/ports.js';
import { OrdServiceV2 } from './ord.v2.js';

const db = useTestDatabase();

/** ORD composed as the composition root binds it: the real listings and identity. */
function orders(transactions: TransactionRunner = db.transactions) {
  const w = { ...wiring(db), transactions };
  return { w, ord: new OrdServiceV2({ ...w, listings: realInventory(w), identity: new VerServiceV2(w) }) };
}
const andres = (quantity: number) => purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity });
const quantity = async (unitId: string) => (await rows<{ quantity: number }>(db, 'InventoryUnit', 'id = $1', [unitId]))[0]!.quantity;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 1, 0xff, 0xd9]);

describe('createOrder with the real neighbours (ORD-1, AD-SYS-4 rule 9)', () => {
  it('runs on a pool of 1: the reserve and the payment instructions read on the order\'s connection', async () => {
    await andres(3);
    await user(db, { id: id('camila') });
    const pool = new pg.Pool({ ...PG, database: (db.pool.options as { database: string }).database, max: 1 });
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      const { ord } = orders(new PgTransactionRunner(pool));
      const deadlock = new Promise<never>((_, reject) => { watchdog = setTimeout(() => reject(new Error('deadlock: a second connection was requested')), 3_000); });
      const result = await Promise.race([ord.createOrder({ listingId: id('lchar'), qty: 2, buyerId: id('camila') }), deadlock]);
      expect(result).toMatchObject({ status: 'AwaitingPayment', totalCop: 90_000, paymentInstructions: { bankName: 'Bancolombia', qrObjectKey: null } });
      expect(await quantity(id('uchar'))).toBe(1);
      expect(await rows(db, 'Order')).toMatchObject([{ listingSnapshot: { itemRef: id('char'), unitPriceCop: 45_000 }, reservationRef: { listingId: id('lchar'), units: [{ inventoryUnitId: id('uchar'), qty: 2 }] } }]);
    } finally {
      clearTimeout(watchdog);
      await pool.end();
    }
  });

  it('the pre-step expires an overdue order on the listing\'s units and returns its stock before the reserve', async () => {
    await andres(0);
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian') });
    await order(db, { id: id('overdue'), buyerId: id('julian'), businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), createdAt: at(-49 * HOUR), expiresAt: at(-HOUR) });
    const { ord } = orders();
    await ord.createOrder({ listingId: id('lchar'), qty: 1, buyerId: id('camila') });
    expect(await rows(db, 'Order', 'id = $1', [id('overdue')])).toMatchObject([{ cancelReason: 'Unpaid' }]);
    expect(await quantity(id('uchar'))).toBe(0);
    expect(await rows(db, 'audit_events', `action = 'orders.order.expired'`)).toMatchObject([{ actorKind: 'system', actorId: null }]);
  });

  it('one open order per business: a second purchase from Andrés is TooManyOpenOrders naming only that order, and the stock is untouched', async () => {
    await andres(5);
    await user(db, { id: id('camila') });
    const { ord } = orders();
    const first = await ord.createOrder({ listingId: id('lchar'), qty: 1, buyerId: id('camila') });
    const error = await caught(() => ord.createOrder({ listingId: id('lchar'), qty: 1, buyerId: id('camila') }));
    expect(codeOf(error)).toBe('TooManyOpenOrders');
    expect(citedInputs(error)).toEqual({ openOrderIds: first.orderId });
    expect(await quantity(id('uchar'))).toBe(4);
  });

  it('a Pending business\'s listing refuses the reserve, and no order or audit row exists', async () => {
    await business(db, id('andres'), 'Pending');
    await commissionState(db, id('andres'));
    await catalogEntry(db, id('char'));
    await unit(db, { id: id('uchar'), sellerId: id('andres'), catalogEntryId: id('char'), quantity: 1 });
    await listing(db, { id: id('lchar'), sellerId: id('andres'), unitId: id('uchar') });
    await user(db, { id: id('camila') });
    expect(codeOf(await caught(() => orders().ord.createOrder({ listingId: id('lchar'), qty: 1, buyerId: id('camila') })))).toBe('ListingNotPurchasable');
    expect(await db.counts(['Order', 'audit_events'])).toEqual({ Order: 0, audit_events: 0 });
    expect(await quantity(id('uchar'))).toBe(1);
  });
});

describe('the comprobante (S-FR-ORD-2)', () => {
  const base = { buyerId: id('camila'), businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar') };

  it('the ticket names the buyer\'s own prefix; the business cannot ask for one', async () => {
    await business(db, id('andres'), 'Approved');
    await user(db, { id: id('camila') });
    await order(db, { ...base, id: id('o1'), paidAt: null });
    const { ord } = orders();
    const ticket = await ord.createComprobanteUpload({ orderId: id('o1'), buyerId: id('camila') });
    expect(ticket.uploadKey).toMatch(new RegExp(`^comprobante/${id('camila')}/[a-z0-9]+$`));
    expect(codeOf(await caught(() => ord.createComprobanteUpload({ orderId: id('o1'), buyerId: id('andres') })))).toBe('OrderNotVisibleToCaller');
  });

  it('a file whose bytes are not an image or a PDF is ComprobanteInvalidFile, nothing is promoted and the order keeps no key', async () => {
    await business(db, id('andres'), 'Approved');
    await user(db, { id: id('camila') });
    await order(db, { ...base, id: id('o1'), comprobante: false });
    const { w, ord } = orders();
    const key = `comprobante/${id('camila')}/bad`;
    w.storage.simulateDirectUpload(key, new Uint8Array([1, 2, 3]), 'image/jpeg');
    const error = await caught(() => ord.uploadComprobante({ orderId: id('o1'), buyerId: id('camila'), uploadKey: key }));
    expect([codeOf(error), citedInputs(error)]).toEqual(['ComprobanteInvalidFile', { cause: 'magic' }]);
    expect([...w.storage.objects.keys()].filter((k) => k.startsWith('order-comprobantes/'))).toEqual([]);
    expect(await rows(db, 'Order')).toMatchObject([{ comprobanteObjectKey: null }]);
  });

  it('another buyer\'s quarantine key is refused as missing, without reading it', async () => {
    await business(db, id('andres'), 'Approved');
    await user(db, { id: id('camila') });
    await order(db, { ...base, id: id('o1'), comprobante: false });
    const { w, ord } = orders();
    const foreign = `comprobante/${id('julian')}/c1`;
    w.storage.simulateDirectUpload(foreign, JPEG, 'image/jpeg');
    const error = await caught(() => ord.uploadComprobante({ orderId: id('o1'), buyerId: id('camila'), uploadKey: foreign }));
    expect([codeOf(error), citedInputs(error)]).toEqual(['ComprobanteInvalidFile', { cause: 'missing' }]);
    expect(await w.storage.get('upload-quarantine', foreign)).not.toBeNull();
  });

  it('a first upload stores the key and the instant, and the business reads the URL only once the order is paid', async () => {
    await business(db, id('andres'), 'Approved');
    await user(db, { id: id('camila') });
    await order(db, { ...base, id: id('o1'), comprobante: false });
    const { w, ord } = orders();
    const key = `comprobante/${id('camila')}/c1`;
    w.storage.simulateDirectUpload(key, JPEG, 'image/jpeg');
    const result = await ord.uploadComprobante({ orderId: id('o1'), buyerId: id('camila'), uploadKey: key });
    expect(result).toMatchObject({ replacedPrevious: false, comprobanteUploadedAt: w.clock.iso(), decision: { reasonCode: 'ComprobanteAttached' } });
    expect((await ord.getComprobanteUrl({ orderId: id('o1'), actorId: id('camila') })).decision.reasonCode).toBe('ComprobanteUrlIssued');
    expect(codeOf(await caught(() => ord.getComprobanteUrl({ orderId: id('o1'), actorId: id('andres') })))).toBe('OrderNotVisibleToCaller');
    expect(w.storage.signedReads.every((r) => r.bucket === 'order-comprobantes')).toBe(true);
  });

  it('before any upload the URL is null and explained', async () => {
    await business(db, id('andres'), 'Approved');
    await user(db, { id: id('camila') });
    await order(db, { ...base, id: id('o1'), comprobante: false });
    expect(await orders().ord.getComprobanteUrl({ orderId: id('o1'), actorId: id('camila') })).toMatchObject({ url: null, expiresAt: null, decision: { reasonCode: 'ComprobanteNotUploaded' } });
  });
});

describe('reads, cancel and the expiry job (S-FR-ORD-6, -7, -8, -9)', () => {
  const base = { buyerId: id('camila'), businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar') };

  it('pages a buyer\'s purchases newest first with a keyset cursor, and refuses a cursor it did not issue', async () => {
    await business(db, id('andres'), 'Approved');
    await user(db, { id: id('camila') });
    for (let k = 0; k < 27; k++) await order(db, { ...base, id: id(`o${k}`), createdAt: at(-(k + 1) * 60_000), cancelledAt: at(-30_000) });
    const { ord } = orders();
    const first = await ord.listOrders({ actorId: id('camila'), side: 'purchases', cursor: null });
    const second = await ord.listOrders({ actorId: id('camila'), side: 'purchases', cursor: first.nextCursor });
    expect([first.items.length, second.items.length, second.nextCursor]).toEqual([25, 2, null]);
    expect([first.items[0]!.orderId, second.items[1]!.orderId]).toEqual([id('o0'), id('o26')]);
    expect(first.items[0]).toMatchObject({ role: 'buyer', status: 'Cancelled', decision: { reasonCode: 'OrderCancelled' } });
    expect(codeOf(await caught(() => ord.listOrders({ actorId: id('camila'), side: 'purchases', cursor: 'bm90LWEtY3Vyc29y' })))).toBe('RequestValidationFailed');
  });

  it('a paid order the business has not confirmed for 7 days reads with the support notice (NFR-ORD-4)', async () => {
    await business(db, id('andres'), 'Approved');
    await user(db, { id: id('camila') });
    await order(db, { ...base, id: id('old'), createdAt: at(-8 * 24 * HOUR), expiresAt: at(-6 * 24 * HOUR), paidAt: at(-7 * 24 * HOUR) });
    await order(db, { ...base, id: id('new'), paidAt: at(-HOUR) });
    const { ord } = orders();
    expect((await ord.getOrder({ orderId: id('old'), actorId: id('andres') })).decision).toMatchObject({ outcome: 'allowedWithNotice', reasonCode: 'OrderAwaitingBusiness' });
    expect((await ord.getOrder({ orderId: id('new'), actorId: id('andres') }))).toMatchObject({ role: 'business', status: 'Paid', decision: { reasonCode: 'OrderPaid' } });
  });

  it('the business cancelling a paid order is OrderNotOwnedByCaller; the buyer past expiry gets OrderNotCancellable and the expiry is materialized', async () => {
    await purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity: 0 });
    await user(db, { id: id('camila') });
    await order(db, { ...base, id: id('paid'), paidAt: at(-HOUR) });
    await order(db, { ...base, id: id('late'), createdAt: at(-49 * HOUR), expiresAt: at(-HOUR) });
    const { ord } = orders();
    expect(codeOf(await caught(() => ord.cancelOrder({ orderId: id('paid'), buyerId: id('andres') })))).toBe('OrderNotOwnedByCaller');
    const error = await caught(() => ord.cancelOrder({ orderId: id('late'), buyerId: id('camila') }));
    expect([codeOf(error), citedInputs(error)]).toEqual(['OrderNotCancellable', { orderId: id('late'), status: 'Expired' }]);
    expect(await rows(db, 'Order', 'id = $1', [id('late')])).toMatchObject([{ cancelReason: 'Unpaid', cancelledAt: null }]);
    expect(await quantity(id('uchar'))).toBe(1);
  });

  it('the expiry job over every order expires each due one once, returns its stock, and leaves the rest', async () => {
    await purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity: 0 });
    await user(db, { id: id('camila') });
    await order(db, { ...base, id: id('due1'), qty: 2, createdAt: at(-49 * HOUR), expiresAt: at(-HOUR) });
    await order(db, { ...base, id: id('due2'), createdAt: at(-48 * HOUR), expiresAt: at(0) });
    await order(db, { ...base, id: id('open'), expiresAt: at(HOUR) });
    const { ord } = orders();
    expect(await ord.expireDueOrders({ scope: 'all', trigger: 'tick' })).toEqual({ expired: 2, released: 3 });
    expect(await quantity(id('uchar'))).toBe(3);
    expect((await rows<{ id: string }>(db, 'Order', `"expiredAt" IS NULL`)).map((r) => r.id)).toEqual([id('open')]);
  });

  it('a pair with no order is neither closed nor in any state', async () => {
    expect(await orders().ord.hasClosedPurchase({ buyerId: id('camila'), businessId: id('andres') })).toEqual({ closed: false, latestState: null });
  });
});

describe('the admin lookup and the support contact (S-FR-ORD-10)', () => {
  it('a lookup with no id is RequestValidationFailed and logs nothing; a lookup by buyer finds every order of theirs', async () => {
    await admin(db);
    await business(db, id('andres'), 'Approved');
    await user(db, { id: id('camila') });
    await order(db, { buyerId: id('camila'), businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), id: id('o1') });
    const { ord } = orders();
    expect(codeOf(await caught(() => ord.adminLookupOrders({ adminId: id('admin'), query: {} })))).toBe('RequestValidationFailed');
    expect(await rows(db, 'OrderLookupLog')).toHaveLength(0);
    const found = await ord.adminLookupOrders({ adminId: id('admin'), query: { buyerId: id('camila') } });
    expect(found.orders.map((o) => o.orderId)).toEqual([id('o1')]);
    expect(await rows(db, 'OrderLookupLog')).toMatchObject([{ adminId: id('admin'), query: { buyerId: id('camila') }, resultOrderIds: [id('o1')] }]);
  });

  it('before any admin sets it the contact is Unexpected; an admin sets it twice and each change keeps its before; a non-admin is AdminOnly', async () => {
    await admin(db);
    await user(db, { id: id('camila') });
    const { ord } = orders();
    expect(codeOf(await caught(() => ord.getSupportContact()))).toBe('Unexpected');
    await ord.setSupportContact({ adminId: id('admin'), contact: { email: 'soporte@tezg.co', whatsappE164: null } });
    await ord.setSupportContact({ adminId: id('admin'), contact: { email: 'ayuda@tezg.co', whatsappE164: '+573001234567' } });
    expect(await ord.getSupportContact()).toEqual({ email: 'ayuda@tezg.co', whatsappE164: '+573001234567' });
    expect((await rows<{ before: unknown }>(db, 'SupportContactChange', 'TRUE ORDER BY "createdAt", id')).map((c) => c.before)).toEqual([null, { email: 'soporte@tezg.co', whatsappE164: null }]);
    expect(codeOf(await caught(() => ord.setSupportContact({ adminId: id('camila'), contact: { email: 'x@y.co', whatsappE164: null } })))).toBe('AdminOnly');
    expect(codeOf(await caught(() => ord.setSupportContact({ adminId: id('admin'), contact: { email: 'no-es-correo', whatsappE164: '3001234567' } })))).toBe('RequestValidationFailed');
  });
});
