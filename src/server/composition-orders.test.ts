// The production composition over HTTP (decision log Impl-1 #24): orders.
// Covers ORD-1 to ORD-4 and S-FR-ORD-2, -6, -7, -10, with ORD-1 on a pool of one connection, all through serveTrpc as app/api/trpc/[trpc]/route.ts calls it.
// One of the composition-*.test.ts files split from composition.test.ts (test review HIGH-1); the harness,
// test-support/http-app.ts, composes a fresh app per test at T0 (HIGH-8).
import { PrismaPg } from '@prisma/adapter-pg';
import { describe, expect, it } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client.js';
import { SECRET, useComposedApp } from '../../test-support/http-app.js';
import { SimulatedScanner } from '../../test-support/simulated/index.js';
import { singleConnectionPool } from '../../test-support/single-connection.js';
import { admin, at, business, HOUR, id, order, purchasableListing, rows, user } from '../../test-support/solu2/fixtures.js';
import { createAuth } from './auth.js';
import { compose } from './composition.js';
import { betterAuthSessions } from './sessions.js';
import { serveTrpc } from './trpc/init.js';

const { db, clock, storage, signIn, post, get } = useComposedApp();

describe('orders.create and the comprobante over HTTP (ORD-1, S-FR-ORD-2; Story 7.1)', () => {
  it('without a session it is NotAuthenticated 401; an unverified email is EmailNotVerified 403 (the canBuy builder), and no order exists', async () => {
    await purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity: 3 });
    await user(db, { id: id('camila'), emailVerified: false });
    const anonymous = await post('orders.create', { listingId: id('lchar'), qty: 1 });
    const unverified = await post('orders.create', { listingId: id('lchar'), qty: 1 }, await signIn(id('camila')));
    expect([anonymous.status, anonymous.json.error?.code, unverified.status, unverified.json.error?.code]).toEqual([401, 'NotAuthenticated', 403, 'EmailNotVerified']);
    expect(await rows(db, 'Order')).toHaveLength(0);
  });

  it('a buyer orders through the real listings and identity, uploads a comprobante and reads its URL; the order is the session user\'s', async () => {
    await purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity: 3 });
    await user(db, { id: id('camila') });
    const cookie = await signIn(id('camila'));
    const created = await post('orders.create', { listingId: id('lchar'), qty: 2 }, cookie);
    expect([created.status, created.json.result?.data]).toEqual([200, expect.objectContaining({ status: 'AwaitingPayment', totalCop: 90_000 })]);
    const orderId = created.json.result?.data.orderId as string;
    expect(await rows(db, 'Order')).toMatchObject([{ id: orderId, buyerId: id('camila'), businessId: id('andres') }]);
    const ticket = (await post('orders.createComprobanteUpload', { orderId }, cookie)).json.result?.data as { uploadKey: string };
    storage.simulateDirectUpload(ticket.uploadKey, new Uint8Array([0xff, 0xd8, 0xff, 1, 0xff, 0xd9]), 'image/jpeg');
    expect((await post('orders.uploadComprobante', { orderId, uploadKey: ticket.uploadKey }, cookie)).json.result?.data).toMatchObject({ replacedPrevious: false });
    expect((await get('orders.comprobanteUrl', { orderId }, cookie)).json.result?.data).toMatchObject({ expiresAt: at(600_000) });
    const own = await post('orders.create', { listingId: id('lchar'), qty: 1 }, await signIn(id('andres')));
    expect([own.status, own.json.error?.code]).toEqual([409, 'SelfPurchaseNotAllowed']);
  });
});

describe('orders.create over HTTP on a pool of 1 (ORD-1, AD-SYS-4 rule 9)', () => {
  it('the gate, the reserve and the payment instructions share the one connection: the order is created, not deadlocked', async () => {
    await purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity: 1 });
    await user(db, { id: id('camila') });
    const cookie = await signIn(id('camila'));
    const pool = singleConnectionPool(db);
    try {
      const auth = createAuth({ prisma: new PrismaClient({ adapter: new PrismaPg(db.pool) }), secret: SECRET, baseUrl: 'http://localhost:3000', clock });
      const small = compose({ pool, clock, sessions: betterAuthSessions(auth), storage, scanner: new SimulatedScanner() });
      const request = new Request('http://localhost/api/trpc/orders.create', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ listingId: id('lchar'), qty: 1 }) });
      const res = await serveTrpc(request, small.router, clock, { identity: small.identity });
      expect([res.status, ((await res.json()) as { result?: { data: { status: string } } }).result?.data.status]).toEqual([200, 'AwaitingPayment']);
    } finally {
      await pool.end();
    }
  });
});

describe('the three order facts over HTTP (ORD-2, ORD-3, ORD-4; Story 7.2)', () => {
  it('the buyer pays, the business confirms and the buyer closes; each actor comes from the session, and each event is enqueued once', async () => {
    await business(db, id('andres'), 'Approved');
    await user(db, { id: id('camila') });
    await order(db, { id: id('o1'), buyerId: id('camila'), businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), comprobante: true });
    const camila = await signIn(id('camila'));
    const andres = await signIn(id('andres'));
    const early = await post('orders.confirmPaymentReceived', { orderId: id('o1') }, andres);
    expect([early.status, early.json.error?.code]).toEqual([403, 'OrderNotVisibleToCaller']);
    expect((await post('orders.confirmPaid', { orderId: id('o1') }, camila)).json.result?.data).toMatchObject({ status: 'Paid' });
    const wrongRole = await post('orders.confirmItemReceived', { orderId: id('o1') }, andres);
    expect([wrongRole.status, wrongRole.json.error?.code]).toEqual([403, 'OrderNotOwnedByCaller']);
    expect((await post('orders.confirmPaymentReceived', { orderId: id('o1') }, andres)).json.result?.data).toMatchObject({ status: 'PaymentConfirmed' });
    expect((await post('orders.confirmItemReceived', { orderId: id('o1') }, camila)).json.result?.data).toMatchObject({ status: 'Closed' });
    expect((await rows<{ type: string }>(db, 'OutboxEvent')).map((e) => e.type).sort()).toEqual(['OrderClosed', 'OrderPaymentConfirmedByBusiness']);
  });
});

describe('the order reads, cancel, lookup and support contact over HTTP (S-FR-ORD-6, -7, -10; Story 7.5)', () => {
  it('the buyer reads and cancels; the business sees only paid sales; a foreign reader gets the unknown-id body', async () => {
    await purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity: 0 });
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian') });
    const base = { buyerId: id('camila'), businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar') };
    await order(db, { ...base, id: id('unpaid') });
    await order(db, { ...base, id: id('paid'), paidAt: at(-HOUR) });
    const camila = await signIn(id('camila'));
    const mine = (await get('orders.mine', { cursor: null }, camila)).json.result?.data as { items: { orderId: string }[] };
    expect(mine.items.map((o) => o.orderId).sort()).toEqual([id('paid'), id('unpaid')].sort());
    const sales = (await get('orders.sales', { cursor: null }, await signIn(id('andres')))).json.result?.data as { items: { orderId: string }[] };
    expect(sales.items.map((o) => o.orderId)).toEqual([id('paid')]);
    const foreign = await get('orders.get', { orderId: id('unpaid') }, await signIn(id('julian')));
    expect([foreign.status, foreign.json.error?.code]).toEqual([403, 'OrderNotVisibleToCaller']);
    expect((await post('orders.cancel', { orderId: id('unpaid') }, camila)).json.result?.data).toMatchObject({ status: 'Cancelled' });
    expect(await rows(db, 'InventoryUnit')).toMatchObject([{ quantity: 1 }]);
    expect((await get('orders.get', { orderId: id('unpaid') }, camila)).json.result?.data).toMatchObject({ status: 'Cancelled' });
  });

  it('an admin looks an order up and sets the support contact, which anyone then reads; a non-admin is AdminOnly 403', async () => {
    await admin(db);
    await business(db, id('andres'), 'Approved');
    await user(db, { id: id('camila') });
    await order(db, { id: id('o1'), buyerId: id('camila'), businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar') });
    const adminCookie = await signIn(id('admin'));
    const refused = await get('orders.adminLookup', { query: { orderId: id('o1') } }, await signIn(id('camila')));
    expect([refused.status, refused.json.error?.code]).toEqual([403, 'AdminOnly']);
    const found = (await get('orders.adminLookup', { query: { orderId: id('o1') } }, adminCookie)).json.result?.data as { orders: { orderId: string }[] };
    expect(found.orders.map((o) => o.orderId)).toEqual([id('o1')]);
    expect(await rows(db, 'OrderLookupLog')).toMatchObject([{ adminId: id('admin'), resultOrderIds: [id('o1')] }]);
    expect((await post('orders.supportContact.set', { contact: { email: 'soporte@tezg.co', whatsappE164: null } }, adminCookie)).status).toBe(200);
    expect((await get('orders.supportContact.get', undefined, '')).json.result?.data).toEqual({ email: 'soporte@tezg.co', whatsappE164: null });
  });
});
