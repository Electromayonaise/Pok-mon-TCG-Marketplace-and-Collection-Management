// The production composition over HTTP (decision log Impl-1 #24): commission.
// Covers S-FR-COM-1, -2, -7, -7.list, -8.ledger, -9, COM-1 and COM-2 through a replay, and COM-3, all through serveTrpc as app/api/trpc/[trpc]/route.ts calls it.
// One of the composition-*.test.ts files split from composition.test.ts (test review HIGH-1); the harness,
// test-support/http-app.ts, composes a fresh app per test at T0 (HIGH-8).
import { PrismaPg } from '@prisma/adapter-pg';
import { describe, expect, it } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client.js';
import { SECRET, useComposedApp } from '../../test-support/http-app.js';
import { admin, at, business, commissionAccount, DAY, failedDelivery, HOUR, id, individualSeller, ins, rows, T0, topUp } from '../../test-support/solu2/fixtures.js';
import { createAuth } from './auth.js';
import { compose } from './composition.js';
import { betterAuthSessions } from './sessions.js';
import { serveTrpc } from './trpc/init.js';

const { db, clock, storage, signIn, post, get } = useComposedApp();

describe('the commission account and top-ups over HTTP (S-FR-COM-1, -2, -9, COM-1, COM-2; Stories 8.1–8.3)', () => {
  /** A failed commission delivery of `type`, replayed by an admin through an app that keeps the real commission handler (the shared app binds an inert one). */
  async function replayToCommission(type: 'BusinessApplicationApproved' | 'OrderClosed' | 'OrderPaymentConfirmedByBusiness', aggregateId: string, payload: object): Promise<string> {
    await admin(db);
    const auth = createAuth({ prisma: new PrismaClient({ adapter: new PrismaPg(db.pool) }), secret: SECRET, baseUrl: 'http://localhost:3000', clock });
    const real = compose({ pool: db.pool, clock, sessions: betterAuthSessions(auth), handlers: { collections: async () => undefined } });
    await failedDelivery(db, { eventId: id('ev1'), type, aggregateId, payload, subscriber: 'commission' });
    const request = new Request('http://localhost/api/trpc/admin.events.replay', {
      method: 'POST', headers: { 'content-type': 'application/json', cookie: await signIn(id('admin')) }, body: JSON.stringify({ eventId: id('ev1'), subscriber: 'commission' }),
    });
    const res = await serveTrpc(request, real.router, clock, { identity: real.identity });
    return ((await res.json()) as { result?: { data: { status: string } } }).result?.data.status ?? 'error';
  }

  it('a replayed approval opens the account through the real commission handler, once', async () => {
    await business(db, id('andres'), 'Approved');
    const payload = { applicationId: id('app1'), businessId: id('andres'), businessName: 'Cartas Andrés', approvedAt: at(-DAY), approvedBy: id('admin') };
    expect(await replayToCommission('BusinessApplicationApproved', id('app1'), payload)).toBe('delivered');
    expect(await rows(db, 'CommissionAccount')).toMatchObject([{ businessId: id('andres'), balanceCop: '0', state: 'Exhausted', ledgerSeq: '0' }]);
    expect(await rows(db, 'OutboxEvent', `type = 'CommissionBalanceExhausted'`)).toMatchObject([{ payload: { businessId: id('andres'), ledgerSeq: 0, balanceAfter: 0 } }]);
  });

  it('a replayed OrderClosed charges the order once through the real commission handler (Story 8.2)', async () => {
    await business(db, id('andres'), 'Approved');
    await commissionAccount(db, id('andres'), 50_000);
    const payload = { orderId: id('o1'), buyerId: id('camila'), businessId: id('andres'), totalCop: 45_000, lines: [], sellerReceivedConfirmedAt: null, buyerItemReceivedConfirmedAt: at(-HOUR) };
    expect(await replayToCommission('OrderClosed', id('o1'), payload)).toBe('delivered');
    expect(await rows(db, 'CommissionLedgerEntry')).toMatchObject([{ kind: 'Deduction', orderId: id('o1'), amountCop: '3600', trigger: 'buyerClosed', balanceAfter: '46400' }]);
  });

  it('a replayed OrderPaymentConfirmedByBusiness charges the order once through the real commission handler (Story 8.2)', async () => {
    await business(db, id('andres'), 'Approved');
    await commissionAccount(db, id('andres'), 3_000);
    const payload = { orderId: id('o1'), businessId: id('andres'), buyerId: id('camila'), totalCop: 45_000, lines: [], sellerReceivedConfirmedAt: at(-HOUR), buyerItemReceivedConfirmedAt: null };
    expect(await replayToCommission('OrderPaymentConfirmedByBusiness', id('o1'), payload)).toBe('delivered');
    expect(await rows(db, 'CommissionLedgerEntry')).toMatchObject([{ kind: 'Deduction', orderId: id('o1'), amountCop: '3600', trigger: 'businessConfirmed', balanceAfter: '-600' }]);
    expect(await rows(db, 'OutboxEvent', `type = 'CommissionBalanceExhausted'`)).toMatchObject([{ payload: { businessId: id('andres'), ledgerSeq: 1, balanceAfter: -600 } }]);
  });

  it('a business requests a top-up with a proof and reads its account and its requests; the session names the business', async () => {
    await business(db, id('andres'), 'Approved');
    await commissionAccount(db, id('andres'), 15_000);
    const andres = await signIn(id('andres'));
    const ticket = (await post('commission.createTopUpProofUpload', {}, andres)).json.result?.data as { uploadKey: string };
    expect(ticket.uploadKey.startsWith(`topup-proof/${id('andres')}/`)).toBe(true);
    storage.simulateDirectUpload(ticket.uploadKey, new Uint8Array([0xff, 0xd8, 0xff, 1, 0xff, 0xd9]), 'image/jpeg');
    const requested = await post('commission.requestTopUp', { amountCop: 50_000, transferReference: 'REF-778899', uploadKey: ticket.uploadKey }, andres);
    expect(requested.json.result?.data).toMatchObject({ status: 'Pending', decision: { reasonCode: 'TopUpRequested' } });
    const topUpRequestId = (requested.json.result?.data as { topUpRequestId: string }).topUpRequestId;
    const account = (await get('commission.myAccount', {}, andres)).json.result?.data;
    expect(account).toMatchObject({ account: { balanceCop: 15_000, lowBalance: true, neededToResumeCop: null }, decision: { reasonCode: 'CommissionBalanceLow' } });
    const mine = (await get('commission.myTopUps', { cursor: null }, andres)).json.result?.data as { rows: { topUpRequestId: string; status: string }[] };
    expect(mine.rows).toMatchObject([{ topUpRequestId, status: 'Pending' }]);
    const url = (await get('commission.topUpProofUrl', { topUpRequestId }, andres)).json.result?.data as { url: string };
    expect(url.url).toMatch(/^sim:\/\/topup-proofs\//);
  });

  it('an admin reads the queue, confirms one top-up and rejects another; a non-admin is AdminOnly 403 (COM-2; Story 8.3)', async () => {
    await admin(db);
    await business(db, id('andres'), 'Approved');
    await commissionAccount(db, id('andres'), 0);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 100_000 });
    await topUp(db, { id: id('t2'), businessId: id('andres'), amountCop: 20_000 });
    const adminCookie = await signIn(id('admin'));
    const refused = await post('commission.admin.confirmTopUp', { topUpRequestId: id('t1') }, await signIn(id('andres')));
    expect([refused.status, refused.json.error?.code]).toEqual([403, 'AdminOnly']);
    const queue = (await get('commission.admin.topUpQueue', { cursor: null }, adminCookie)).json.result?.data as { rows: { topUpRequestId: string }[] };
    expect(queue.rows.map((r) => r.topUpRequestId).sort()).toEqual([id('t1'), id('t2')].sort());
    expect((await post('commission.admin.confirmTopUp', { topUpRequestId: id('t1') }, adminCookie)).json.result?.data).toMatchObject({ status: 'Confirmed', balanceAfter: 100_000, resumed: true });
    expect((await post('commission.admin.rejectTopUp', { topUpRequestId: id('t2'), reason: 'No encontramos la transferencia.' }, adminCookie)).json.result?.data).toMatchObject({ status: 'Rejected' });
    const again = await post('commission.admin.confirmTopUp', { topUpRequestId: id('t1') }, adminCookie);
    expect([again.status, again.json.error?.code]).toEqual([409, 'TopUpNotPending']);
    expect(await rows(db, 'TopUpDecisionLog')).toHaveLength(2);
  });

  it('an admin reconciles every account and reads the run back; a business is AdminOnly 403 (COM-3, COM-3.last; Story 8.5)', async () => {
    await admin(db);
    await business(db, id('andres'), 'Approved');
    await commissionAccount(db, id('andres'), 0);
    const adminCookie = await signIn(id('admin'));
    const refused = await post('commission.reconcile', { businessId: null }, await signIn(id('andres')));
    expect([refused.status, refused.json.error?.code]).toEqual([403, 'AdminOnly']);
    expect((await get('commission.admin.lastReconciliation', {}, adminCookie)).json.result?.data).toEqual({ run: null });
    const ran = (await post('commission.reconcile', { businessId: null }, adminCookie)).json.result?.data as { runId: string };
    expect(ran).toMatchObject({ accountsChecked: 1, discrepancies: [], decision: { outcome: 'allowed', reasonCode: 'ReconciliationClean' } });
    expect((await get('commission.admin.lastReconciliation', {}, adminCookie)).json.result?.data).toMatchObject({ run: { runId: ran.runId, scope: 'all', accountsChecked: 1 } });
    expect(await rows(db, 'audit_events', `action = 'commission.reconcile.ran'`)).toMatchObject([{ actorKind: 'admin', actorId: id('admin') }]);
  });

  it('an admin schedules a rate, reads the rates and filters a ledger; a past rate is CommissionRateNotFutureDated 400 and a business is AdminOnly 403 (S-FR-COM-7, -7.list, -8.ledger; Story 8.6)', async () => {
    await admin(db);
    await business(db, id('andres'), 'Approved');
    await commissionAccount(db, id('andres'), 42_800, 2);
    await ins(db, 'CommissionLedgerEntry', { id: id('l1'), businessId: id('andres'), seq: 1, kind: 'Deduction', amountCop: 3_600, orderId: id('o1'), rateBps: 800, baseCop: 45_000, trigger: 'buyerClosed', commissionTriggeredAt: T0, balanceAfter: 46_400 }, 'created');
    await ins(db, 'CommissionLedgerEntry', { id: id('l2'), businessId: id('andres'), seq: 2, kind: 'Deduction', amountCop: 3_600, orderId: id('o2'), rateBps: 800, baseCop: 45_000, trigger: 'businessConfirmed', commissionTriggeredAt: T0, balanceAfter: 42_800 }, 'created');
    const adminCookie = await signIn(id('admin'));
    const nowMs = clock.now().getTime();
    const tomorrow = new Date(nowMs + DAY).toISOString();
    const refused = await post('commission.admin.setRate', { rateBps: 1_000, effectiveFrom: tomorrow }, await signIn(id('andres')));
    expect([refused.status, refused.json.error?.code]).toEqual([403, 'AdminOnly']);
    const past = await post('commission.admin.setRate', { rateBps: 1_000, effectiveFrom: new Date(nowMs - 61_000).toISOString() }, adminCookie);
    expect([past.status, past.json.error?.code]).toEqual([400, 'CommissionRateNotFutureDated']);
    expect((await post('commission.admin.setRate', { rateBps: 1_000, effectiveFrom: tomorrow }, adminCookie)).json.result?.data)
      .toMatchObject({ rateBps: 1_000, effectiveFrom: tomorrow, decision: { outcome: 'allowed', reasonCode: 'CommissionRateScheduled' } });
    expect((await get('commission.admin.rates', {}, adminCookie)).json.result?.data).toMatchObject({ currentRateBps: 800, rates: [{ rateBps: 1_000, setBy: id('admin') }, { rateBps: 800, setBy: null }] });
    const ledger = (await get('commission.admin.ledger', { businessId: id('andres'), trigger: 'buyerClosed', cursor: null }, adminCookie)).json.result?.data as { lines: { orderId: string }[] };
    expect(ledger).toMatchObject({ balanceCop: 42_800, state: 'Funded', nextCursor: null });
    expect(ledger.lines.map((l) => l.orderId)).toEqual([id('o1')]);
  });

  it('an individual account is NotBusinessAccount 409, and a foreign proof is the unknown-id body', async () => {
    await individualSeller(db, id('valentina'));
    const valentina = await signIn(id('valentina'));
    const refused = await get('commission.myAccount', {}, valentina);
    expect([refused.status, refused.json.error?.code]).toEqual([409, 'NotBusinessAccount']);
    const foreign = await get('commission.topUpProofUrl', { topUpRequestId: id('ghost') }, valentina);
    expect([foreign.status, foreign.json.error?.code]).toEqual([403, 'TopUpNotVisibleToCaller']);
  });
});
