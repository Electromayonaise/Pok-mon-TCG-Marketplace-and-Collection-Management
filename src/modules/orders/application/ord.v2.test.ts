// ORD against Postgres with the real neighbours: the edges the ATDD tests leave out.
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { PgTransactionRunner, useTestDatabase } from '../../../../test-support/db.js';
import { PG } from '../../../../test-support/env.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { at, business, catalogEntry, commissionState, fake, HOUR, id, listing, order, purchasableListing, rows, unit, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { CatServiceV2 } from '../../catalog/index.js';
import { IdnServiceV2, VerServiceV2 } from '../../identity/index.js';
import { InvServiceV2 } from '../../listings/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../../shared-kernel/external.js';
import type { TransactionRunner } from '../../../shared-kernel/ports.js';
import { OrdServiceV2 } from './ord.v2.js';

const db = useTestDatabase();

/** ORD composed as the composition root binds it: the real listings and identity. */
function orders(transactions: TransactionRunner = db.transactions) {
  const w = { ...wiring(db), transactions };
  const catalog = new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });
  const inv = new InvServiceV2({ ...w, catalog, identity: new IdnServiceV2(w) });
  return { w, ord: new OrdServiceV2({ ...w, listings: inv, identity: new VerServiceV2(w) }) };
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
