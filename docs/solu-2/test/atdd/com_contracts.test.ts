// ATDD — COM (contracts.md §7, §15, §15.12). Red phase: every test must fail with NotImplementedError.
import { describe, expect, it } from 'vitest';
import { ComServiceV2 } from '../../../../src/modules/commission/index.js';
import type { ApplyOrderDeductionRequest, IdentityForCom, RequestTopUpRequest } from '../../../../src/modules/commission/index.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { admin, at, business, commissionAccount, DAY, explainAssert, fake, HOUR, id, ins, rows, T0, topUp, user, wiring } from '../../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();
/** A requestTopUp request: andres asks for 50,000 COP with reference REF-1 and upload key 'x', unless the test says otherwise. */
const topUpInput = (o: Partial<RequestTopUpRequest> = {}): RequestTopUpRequest => ({ businessId: id('andres'), amountCop: 50_000, transferReference: 'REF-1', uploadKey: 'x', ...o });

function setup(o: { kind?: 'business' | 'individual' } = {}) {
  const w = wiring(db);
  const identity = fake<IdentityForCom>('identity', {
    getCapabilities: async () => ({ capabilities: { canBuy: true, canListAsIndividual: o.kind === 'individual', canListAsBusiness: o.kind !== 'individual', isVerifiedBusiness: o.kind !== 'individual', canReceiveInAppMessages: o.kind !== 'individual', canModerate: false }, sellerKind: o.kind ?? 'business', derivedFrom: [] }),
    getBusinessName: async () => ({ businessName: 'Cartas Andrés' }),
  });
  return { w, com: new ComServiceV2({ ...w, identity }) };
}
const ev = (orderId: string, totalCop: number, o: Partial<ApplyOrderDeductionRequest> = {}): ApplyOrderDeductionRequest => ({
  type: 'OrderPaymentConfirmedByBusiness', orderId, businessId: id('andres'), totalCop, sellerReceivedConfirmedAt: at(-HOUR), buyerItemReceivedConfirmedAt: null, ...o,
});
const deduct = (e: ApplyOrderDeductionRequest) => db.transactions.run((tx) => setup().com.applyOrderDeduction(tx, e));
const account = async () => (await rows<{ balanceCop: string; ledgerSeq: string; state: string }>(db, 'CommissionAccount', '"businessId" = $1', [id('andres')]))[0];
const ledger = (where = 'TRUE') => rows<Record<string, unknown>>(db, 'CommissionLedgerEntry', where);
const outbox = (type: string) => rows(db, 'OutboxEvent', 'type = $1', [type]);
async function shop(balance: number, seq = 0): Promise<void> {
  await business(db, id('andres'), 'Approved');
  await commissionAccount(db, id('andres'), balance, seq);
}

describe('COM-1 — applyOrderDeduction (contracts.md §7)', () => {
  it('[COM-1.Q1] a business confirmation charges 8 % of 45,000 = 3,600, one ledger line with its pricing, one audit row', async () => {
    await shop(50_000);
    const result = await deduct(ev(id('o1'), 45_000));
    expect(result).toEqual({ outcome: 'charged', amountCop: 3_600, balanceAfter: 46_400, ledgerSeq: 1, trigger: 'businessConfirmed', crossing: null });
    expect(await ledger()).toMatchObject([{ kind: 'Deduction', orderId: id('o1'), amountCop: '3600', rateBps: 800, baseCop: '45000', trigger: 'businessConfirmed', seq: '1', balanceAfter: '46400' }]);
    expect(await rows(db, 'audit_events', `action = 'commission.deduction.applied'`)).toMatchObject([{ actorKind: 'system' }]);
  });

  it('[COM-1.Q3] crossing from > 0 to ≤ 0 publishes one CommissionBalanceExhausted to listings', async () => {
    await shop(3_000);
    const result = await deduct(ev(id('o1'), 45_000));
    expect(result).toMatchObject({ outcome: 'charged', balanceAfter: -600, crossing: 'exhausted' });
    expect(await outbox('CommissionBalanceExhausted')).toMatchObject([{ payload: { businessId: id('andres'), ledgerSeq: 1, balanceAfter: -600 } }]);
  });

  it('[COM-1.I1] a redelivery is a duplicate: one Deduction per order (AD-COM-2)', async () => {
    await shop(50_000);
    await deduct(ev(id('o1'), 45_000));
    expect(await deduct(ev(id('o1'), 45_000))).toEqual({ outcome: 'duplicate' });
    expect(await ledger(`kind = 'Deduction'`)).toHaveLength(1);
    expect((await account())?.balanceCop).toBe('46400');
  });

  it('[COM-1.I3] the rounding rule is exact (12,345 × 800 bps = 988), and storage refuses any other amount (ADD-§2.6)', async () => {
    await shop(50_000);
    const result = await deduct(ev(id('o1'), 12_345));
    expect(result).toMatchObject({ amountCop: 988 });
    const bad = await caught(() => ins(db, 'CommissionLedgerEntry', { id: id('bad'), businessId: id('andres'), seq: 9, kind: 'Deduction', amountCop: 987, orderId: id('o2'), rateBps: 800, baseCop: 12_345, trigger: 'buyerClosed', commissionTriggeredAt: T0, balanceAfter: 0 }, 'created'));
    expect(String((bad as Error).message)).toMatch(/ledger_deduction_rounding_rule/);
  });

  it('[COM-1.I4] the trigger and the rate depend on the facts, never on delivery order or processing time (AD-SYS-3)', async () => {
    await shop(50_000);
    await ins(db, 'CommissionRateSetting', { id: id('rate2'), rateBps: 1_000, effectiveFrom: at(-30 * 60_000), setBy: id('admin') }, 'created');
    const facts = { sellerReceivedConfirmedAt: at(-HOUR), buyerItemReceivedConfirmedAt: at(-10 * 60_000) };
    const result = await deduct(ev(id('o1'), 45_000, { type: 'OrderClosed', ...facts }));
    expect(result).toMatchObject({ trigger: 'businessConfirmed', amountCop: 3_600 });
    expect(await ledger()).toMatchObject([{ rateBps: 800, commissionTriggeredAt: new Date(at(-HOUR)) }]);
  });

  it('[COM-1.P3] with no commission account the handler throws Unexpected, so the delivery fails and stays replayable', async () => {
    await business(db, id('andres'), 'Approved');
    const error = await caught(() => deduct(ev(id('o1'), 45_000)));
    expect((error as Error).message).toMatch(/Unexpected/);
    expect(await ledger()).toHaveLength(0);
  });

  it('[COM-1.MEC] two orders owing 3,600 each, confirmed at one instant against 5,000, plus a duplicate, 100 repetitions: −2,200, two lines, one Exhausted (NFR-COM-1)', async () => {
    await business(db, id('andres'), 'Approved');
    for (let rep = 0; rep < 100; rep++) {
      await db.query(`TRUNCATE "CommissionLedgerEntry", "CommissionAccount", "EventDelivery", "OutboxEvent", audit_events CASCADE`);
      await commissionAccount(db, id('andres'), 5_000);
      const outcome = await race(3, (i) => deduct(ev(id(i === 1 ? 'oa' : 'ob'), 45_000)));
      expect(outcome.rejected.map(codeOf)).toEqual([]);
      expect((await account())?.balanceCop).toBe('-2200');
      expect(await ledger(`kind = 'Deduction'`)).toHaveLength(2);
      expect(await outbox('CommissionBalanceExhausted')).toHaveLength(1);
      expect(await outbox('CommissionBalanceReplenished')).toHaveLength(0);
    }
  });

  it('[COM-1.MEC2] OrderPaymentConfirmedByBusiness and OrderClosed for one order delivered concurrently, 100 repetitions: one line, one decrement', async () => {
    await business(db, id('andres'), 'Approved');
    for (let rep = 0; rep < 100; rep++) {
      await db.query(`TRUNCATE "CommissionLedgerEntry", "CommissionAccount", "EventDelivery", "OutboxEvent", audit_events CASCADE`);
      await commissionAccount(db, id('andres'), 50_000);
      const outcome = await race(2, (i) => deduct(ev(id('o1'), 45_000, i === 0 ? {} : { type: 'OrderClosed', buyerItemReceivedConfirmedAt: at(-30 * 60_000) })));
      expect(outcome.rejected.map(codeOf)).toEqual([]);
      expect(outcome.fulfilled.map((r) => r.outcome).sort()).toEqual(['charged', 'duplicate']);
      expect((await account())?.balanceCop).toBe('46400');
    }
  });
});

describe('COM-2 — confirmTopUp (contracts.md §7)', () => {
  it('[COM-2.Q1] confirming 100,000 on an Exhausted account at 0: balance 100,000, resumed, one Replenished event', async () => {
    await admin(db);
    await shop(0);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 100_000 });
    const result = await setup().com.confirmTopUp({ topUpRequestId: id('t1'), adminId: id('admin') });
    expect(result).toMatchObject({ status: 'Confirmed', balanceAfter: 100_000, ledgerSeq: 1, resumed: true, neededToResumeCop: null });
    expect(await outbox('CommissionBalanceReplenished')).toHaveLength(1);
    expect(await rows(db, 'TopUpDecisionLog')).toMatchObject([{ topUpRequestId: id('t1'), decision: 'Confirmed' }]);
  });

  it('[COM-2.Q2] confirming 20,000 on −25,000 leaves −5,000, names 5,001 as needed to resume, publishes nothing', async () => {
    await admin(db);
    await shop(-25_000, 4);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 20_000 });
    const result = await setup().com.confirmTopUp({ topUpRequestId: id('t1'), adminId: id('admin') });
    expect(result).toMatchObject({ balanceAfter: -5_000, resumed: false, neededToResumeCop: 5_001 });
    explainAssert(result.decision, { rule: 'FR-COM-3', inputs: { amountCop: 20_000, balanceAfter: -5_000, neededToResumeCop: 5_001 } });
    expect(await rows(db, 'OutboxEvent')).toHaveLength(0);
  });

  it('[COM-2.P2] an unknown top-up is TopUpNotFound (404)', async () => {
    await admin(db);
    const error = await caught(() => setup().com.confirmTopUp({ topUpRequestId: id('ghost'), adminId: id('admin') }));
    expect(codeOf(error)).toBe('TopUpNotFound');
    expect(httpOf(error)).toBe(404);
  });

  it('[COM-2.P3] a decided top-up is TopUpNotPending (409) naming who decided; nothing is credited', async () => {
    await admin(db);
    await shop(0);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000, status: 'Confirmed' });
    const error = await caught(() => setup().com.confirmTopUp({ topUpRequestId: id('t1'), adminId: id('admin') }));
    expect(codeOf(error)).toBe('TopUpNotPending');
    expect(citedInputs(error)).toMatchObject({ status: 'Confirmed', decidedBy: id('admin') });
    expect(await ledger()).toHaveLength(0);
  });

  it('[COM-2.I1] two admins confirming at once: one credit, one decision row, one TopUpNotPending (AD-COM-3)', async () => {
    await admin(db);
    await user(db, { id: id('admin2'), isAdmin: true });
    await shop(0);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
    const outcome = await race(2, (i) => setup().com.confirmTopUp({ topUpRequestId: id('t1'), adminId: id(i === 0 ? 'admin' : 'admin2') }));
    expect(outcome.rejected.map(codeOf)).toEqual(['TopUpNotPending']);
    expect(await ledger(`kind = 'TopUp'`)).toHaveLength(1);
    expect((await account())?.balanceCop).toBe('50000');
  });

  it('[COM-2.reject.h] rejecting a pending top-up records the reason and credits nothing', async () => {
    await admin(db);
    await shop(0);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
    const result = await setup().com.rejectTopUp({ topUpRequestId: id('t1'), adminId: id('admin'), reason: 'No encontramos la transferencia.' });
    expect(result.status).toBe('Rejected');
    expect(await ledger()).toHaveLength(0);
  });

  it('[COM-2.reject.f] rejecting a confirmed top-up is TopUpNotPending', async () => {
    await admin(db);
    await shop(0);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000, status: 'Confirmed' });
    expect(codeOf(await caught(() => setup().com.rejectTopUp({ topUpRequestId: id('t1'), adminId: id('admin'), reason: 'Ya estaba confirmada.' })))).toBe('TopUpNotPending');
  });
});

describe('COM-3 — reconcile (contracts.md §7)', () => {
  async function line(seq: number, kind: 'TopUp' | 'Deduction', amount: number, balanceAfter: number): Promise<void> {
    if (kind === 'TopUp') await topUp(db, { id: id(`t${seq}`), businessId: id('andres'), amountCop: amount, status: 'Confirmed' });
    await ins(db, 'CommissionLedgerEntry', kind === 'TopUp'
      ? { id: id(`l${seq}`), businessId: id('andres'), seq, kind, amountCop: amount, topUpRequestId: id(`t${seq}`), balanceAfter }
      : { id: id(`l${seq}`), businessId: id('andres'), seq, kind, amountCop: amount, orderId: id(`o${seq}`), rateBps: 800, baseCop: amount * 12.5, trigger: 'businessConfirmed', commissionTriggeredAt: T0, balanceAfter }, 'created');
  }

  it('[COM-3.Q1] a consistent account reconciles with 0 discrepancies and one run row', async () => {
    await admin(db);
    await shop(46_400, 2);
    await line(1, 'TopUp', 50_000, 50_000);
    await line(2, 'Deduction', 3_600, 46_400);
    const result = await setup().com.reconcile({ businessId: id('andres'), actor: { kind: 'admin', adminId: id('admin') } });
    expect(result).toMatchObject({ accountsChecked: 1, discrepancies: [] });
    expect(await rows(db, 'ReconciliationRun')).toHaveLength(1);
  });

  it('[COM-3.Q2] a tampered balance is reported as balanceMismatch with decimal-string expected and actual, and never repaired', async () => {
    await admin(db);
    await shop(46_400, 2);
    await line(1, 'TopUp', 50_000, 50_000);
    await line(2, 'Deduction', 3_600, 46_400);
    await db.query(`UPDATE "CommissionAccount" SET "balanceCop" = 46000, state = 'Funded'`);
    const result = await setup().com.reconcile({ businessId: null, actor: { kind: 'job' } });
    expect('discrepancies' in result && result.discrepancies).toEqual([{ businessId: id('andres'), kind: 'balanceMismatch', expected: '46400', actual: '46000' }]);
    expect((await account())?.balanceCop).toBe('46000');
  });

  it('[COM-3.I1] a seq gap is reported (AD-COM-1 rule 4)', async () => {
    await admin(db);
    await shop(46_400, 3);
    await line(1, 'TopUp', 50_000, 50_000);
    await line(3, 'Deduction', 3_600, 46_400);
    const result = await setup().com.reconcile({ businessId: id('andres'), actor: { kind: 'admin', adminId: id('admin') } });
    expect('discrepancies' in result && result.discrepancies.map((d) => d.kind)).toEqual(['seqGap']);
  });

  it('[COM-3.Q4] an unknown business reconciles 0 accounts with an explained notice, not an error', async () => {
    await admin(db);
    const result = await setup().com.reconcile({ businessId: id('ghost'), actor: { kind: 'admin', adminId: id('admin') } });
    expect(result).toMatchObject({ accountsChecked: 0, discrepancies: [] });
    expect(result).toHaveProperty('decision');
    explainAssert((result as { decision: unknown }).decision, { outcome: 'allowedWithNotice', inputs: { businessId: id('ghost'), accountFound: false } });
  });

  it('[COM-3.P2] while another job run holds the lock, the job path is skipped', async () => {
    await shop(0);
    const holder = await db.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT pg_advisory_xact_lock(hashtextextended('job:commission-reconcile', 0))`);
      expect(await setup().com.reconcile({ businessId: null, actor: { kind: 'job' } })).toEqual({ skipped: 'runInProgress' });
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
    }
  });

  it('[COM-3.last.h] the last reconciliation run is returned for page 7.4', async () => {
    await admin(db);
    await ins(db, 'ReconciliationRun', { id: id('run1'), scope: 'all', accountsChecked: 8, discrepancies: JSON.stringify([]) }, 'created');
    expect((await setup().com.getLastReconciliation({ adminId: id('admin') })).run).toMatchObject({ runId: id('run1'), accountsChecked: 8 });
  });

  it('[COM-2.queue.h] the admin queue lists Pending top-ups oldest first', async () => {
    await admin(db);
    await shop(0);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
    await topUp(db, { id: id('t2'), businessId: id('andres'), amountCop: 20_000, status: 'Confirmed' });
    expect((await setup().com.listTopUpQueue({ adminId: id('admin'), cursor: null })).rows.map((r) => r.topUpRequestId)).toEqual([id('t1')]);
  });
});

describe('Supporting COM contracts (contracts.md §15, §15.12)', () => {
  it('[S-FR-COM-1.h] approval opens one Exhausted account at 0 and publishes the seq-0 Exhausted once', async () => {
    await business(db, id('andres'), 'Approved');
    const result = await db.transactions.run((tx) => setup().com.openCommissionAccount(tx, { businessId: id('andres'), approvedAt: at(-DAY) }));
    expect(result).toEqual({ opened: true });
    expect(await account()).toMatchObject({ balanceCop: '0', state: 'Exhausted', ledgerSeq: '0' });
    expect(await outbox('CommissionBalanceExhausted')).toMatchObject([{ payload: { ledgerSeq: 0, balanceAfter: 0 } }]);
  });

  it('[S-FR-COM-1.f] a redelivery opens nothing and publishes nothing', async () => {
    await shop(0);
    const result = await db.transactions.run((tx) => setup().com.openCommissionAccount(tx, { businessId: id('andres'), approvedAt: at(-DAY) }));
    expect(result).toEqual({ opened: false });
    expect(await rows(db, 'OutboxEvent')).toHaveLength(0);
  });

  it('[S-FR-COM-2.h] a top-up request is Pending and the balance is unchanged until confirmation', async () => {
    await shop(1_000);
    const { w, com } = setup();
    const key = `topup-proof/${id('andres')}/p1`;
    w.storage.simulateDirectUpload(key, new Uint8Array([0xff, 0xd8, 0xff, 1, 0xff, 0xd9]), 'image/jpeg');
    const result = await com.requestTopUp(topUpInput({ transferReference: 'REF-778899', uploadKey: key }));
    expect(result.status).toBe('Pending');
    expect((await account())?.balanceCop).toBe('1000');
  });

  it('[S-FR-COM-2.f] 19,999 COP is TopUpAmountInvalid (400) with zero rows', async () => {
    await shop(1_000);
    const error = await caught(() => setup().com.requestTopUp(topUpInput({ amountCop: 19_999 })));
    expect(codeOf(error)).toBe('TopUpAmountInvalid');
    expect(await rows(db, 'TopUpRequest')).toHaveLength(0);
  });

  it('[S-FR-COM-2.f2] before the account is open, a request is CommissionAccountNotOpen (409), never identity’s NotBusinessAccount (C-GAP-3)', async () => {
    await business(db, id('andres'), 'Approved');
    const error = await caught(() => setup().com.requestTopUp(topUpInput()));
    expect(codeOf(error)).toBe('CommissionAccountNotOpen');
    expect(citedInputs(error)).toMatchObject({ accountOpened: false });
  });

  it('[S-FR-COM-2.mine.h] a business lists only its own top-ups', async () => {
    await shop(0);
    await business(db, id('other'), 'Approved');
    await commissionAccount(db, id('other'), 0);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
    await topUp(db, { id: id('t2'), businessId: id('other'), amountCop: 50_000 });
    expect((await setup().com.listMyTopUps({ businessId: id('andres'), cursor: null })).rows.map((r) => r.topUpRequestId)).toEqual([id('t1')]);
  });

  it('[S-FR-COM-2.url.h] another business gets TopUpNotVisibleToCaller with a body identical to an unknown id', async () => {
    await shop(0);
    await business(db, id('other'), 'Approved');
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
    const foreign = await caught(() => setup().com.getTopUpProofUrl({ topUpRequestId: id('t1'), actorId: id('other') }));
    const unknown = await caught(() => setup().com.getTopUpProofUrl({ topUpRequestId: id('ghost'), actorId: id('other') }));
    expect(codeOf(foreign)).toBe('TopUpNotVisibleToCaller');
    expect(JSON.stringify(foreign)).toBe(JSON.stringify(unknown));
  });

  it('[S-FR-COM-7.h] a new rate applies only to triggers at or after its effectiveFrom', async () => {
    await admin(db);
    const { w, com } = setup();
    const effectiveFrom = new Date(w.clock.now().getTime() + DAY).toISOString();
    const result = await com.setCommissionRate({ adminId: id('admin'), rateBps: 1_000, effectiveFrom });
    expect(result).toMatchObject({ rateBps: 1_000, effectiveFrom });
    expect(await rows(db, 'CommissionRateSetting')).toHaveLength(2);
  });

  it('[S-FR-COM-7.f] an effectiveFrom 61 s in the past is CommissionRateNotFutureDated (400)', async () => {
    await admin(db);
    const { w, com } = setup();
    const error = await caught(() => com.setCommissionRate({ adminId: id('admin'), rateBps: 1_000, effectiveFrom: new Date(w.clock.now().getTime() - 61_000).toISOString() }));
    expect(codeOf(error)).toBe('CommissionRateNotFutureDated');
    expect(httpOf(error)).toBe(400);
  });

  it('[S-FR-COM-7.list.h] with no other row, the seed rate of 800 bps is current', async () => {
    await admin(db);
    expect((await setup().com.listCommissionRates({ adminId: id('admin') })).currentRateBps).toBe(800);
  });

  it('[S-FR-COM-8.ledger.h] the admin ledger filtered by buyerClosed shows only those deductions', async () => {
    await admin(db);
    await shop(42_800, 2);
    await ins(db, 'CommissionLedgerEntry', { id: id('l1'), businessId: id('andres'), seq: 1, kind: 'Deduction', amountCop: 3_600, orderId: id('o1'), rateBps: 800, baseCop: 45_000, trigger: 'buyerClosed', commissionTriggeredAt: T0, balanceAfter: 46_400 }, 'created');
    await ins(db, 'CommissionLedgerEntry', { id: id('l2'), businessId: id('andres'), seq: 2, kind: 'Deduction', amountCop: 3_600, orderId: id('o2'), rateBps: 800, baseCop: 45_000, trigger: 'businessConfirmed', commissionTriggeredAt: T0, balanceAfter: 42_800 }, 'created');
    const result = await setup().com.getAccountLedger({ adminId: id('admin'), businessId: id('andres'), trigger: 'buyerClosed', cursor: null });
    expect(result.lines.map((l) => l.orderId)).toEqual([id('o1')]);
  });

  it('[S-FR-COM-9.h] a balance of 15,000 shows the low-balance notice and needs nothing to resume', async () => {
    await shop(15_000);
    expect((await setup().com.getMyCommissionAccount({ businessId: id('andres') })).account).toMatchObject({ balanceCop: 15_000, lowBalance: true, neededToResumeCop: null });
  });

  it('[S-FR-COM-9.f] an individual seller asking for a commission account is NotBusinessAccount (propagated)', async () => {
    await user(db, { id: id('valentina'), sellerTrack: 'individual' });
    expect(codeOf(await caught(() => setup({ kind: 'individual' }).com.getMyCommissionAccount({ businessId: id('valentina') })))).toBe('NotBusinessAccount');
  });
});
