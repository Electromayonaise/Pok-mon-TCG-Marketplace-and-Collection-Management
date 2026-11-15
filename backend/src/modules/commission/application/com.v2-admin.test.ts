// COM against Postgres with the real identity, the edges the ATDD tests leave out: reconciliation and its last run
// (COM-3, COM-3.last), the commission rates (S-FR-COM-7, -7.list) and the admin ledger (S-FR-COM-8.ledger).
// Split from com.v2.test.ts by the Impl-2 test review (HIGH-4); the shared Given steps are in test-support/suites/com.ts.
import { describe, expect, it } from 'vitest';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { admin, at, business, commissionAccount, DAY, id, ins, rows, T0, topUp, user } from '../../../../test-support/solu2/fixtures.js';
import { useComSuite } from '../../../../test-support/suites/com.js';

const { db, commission, shop } = useComSuite();

describe('reconcile and its last run (COM-3, COM-3.last; Story 8.5)', () => {
  it('the all-accounts run stops once 50 s of Clock time have passed, cites partial with the accounts checked, and the next run restarts from the first account (decision log Impl-2 #13)', async () => {
    await admin(db);
    for (const b of ['andres', 'beatriz', 'carlos']) await business(db, id(b), 'Approved');
    for (const b of ['andres', 'beatriz', 'carlos']) await commissionAccount(db, id(b), 0);
    const { w, com } = commission();
    // Every Clock read moves time 20 s on: the checks before the three accounts read 20 s, 40 s and 60 s into the run.
    const read = w.clock.now.bind(w.clock);
    w.clock.now = () => { const t = read(); w.clock.advance(20_000); return t; };
    const first = await com.reconcile({ businessId: null, actor: { kind: 'job' } });
    expect(first).toMatchObject({ accountsChecked: 2, discrepancies: [], decision: { outcome: 'allowedWithNotice', reasonCode: 'ReconciliationPartial', citations: [{ rule: 'FR-COM-8', inputs: { accountsChecked: 2, partial: true } }] } });
    expect(await rows(db, 'audit_events', `action = 'commission.reconcile.ran'`)).toMatchObject([{ actorKind: 'system', actorId: null, decisionCode: 'ReconciliationPartial', data: { scope: 'all', accountsChecked: 2, partial: true } }]);
    expect(await com.reconcile({ businessId: null, actor: { kind: 'job' } })).toMatchObject({ accountsChecked: 2 });
    // A single-account run has no bound.
    expect(await com.reconcile({ businessId: id('carlos'), actor: { kind: 'admin', adminId: id('admin') } })).toMatchObject({ accountsChecked: 1, decision: { reasonCode: 'ReconciliationClean' } });
  });

  it('every discrepancy is one FR-COM-8 citation; a non-admin is AdminOnly before any run; with no run the last one is null', async () => {
    await admin(db);
    await user(db, { id: id('camila') });
    await shop(5_000);
    const { com } = commission();
    expect(await com.getLastReconciliation({ adminId: id('admin') })).toEqual({ run: null });
    expect(codeOf(await caught(() => com.reconcile({ businessId: null, actor: { kind: 'admin', adminId: id('camila') } })))).toBe('AdminOnly');
    expect(codeOf(await caught(() => com.getLastReconciliation({ adminId: id('camila') })))).toBe('AdminOnly');
    expect(await rows(db, 'ReconciliationRun')).toEqual([]);
    // The account says 5,000 at seq 0 over an empty ledger: one balanceMismatch.
    const result = await com.reconcile({ businessId: id('andres'), actor: { kind: 'admin', adminId: id('admin') } });
    expect(result).toMatchObject({
      discrepancies: [{ kind: 'balanceMismatch', expected: '0', actual: '5000' }],
      decision: { outcome: 'allowedWithNotice', reasonCode: 'ReconciliationDiscrepancies', citations: [{ rule: 'FR-COM-8', inputs: { businessId: id('andres'), expected: '0', actual: '5000' } }] },
    });
    expect((await com.getLastReconciliation({ adminId: id('admin') })).run).toMatchObject({ scope: id('andres'), accountsChecked: 1, discrepancies: [{ kind: 'balanceMismatch' }] });
    expect((await rows<{ balanceCop: string }>(db, 'CommissionAccount'))[0]?.balanceCop).toBe('5000');
  });
});

describe('commission rates (S-FR-COM-7, S-FR-COM-7.list; Story 8.6)', () => {
  /** A buyer-closed order of 45,000 COP whose trigger instant is `item`. */
  const closed = (orderId: string, item: string) => ({
    type: 'OrderClosed' as const, orderId, businessId: id('andres'), totalCop: 45_000, sellerReceivedConfirmedAt: null, buyerItemReceivedConfirmedAt: item,
  });

  it('a rate from tomorrow prices only triggers at or after its effectiveFrom, never one already past (FR-COM-7 acceptance), and writes one admin audit row', async () => {
    await admin(db);
    await shop(100_000);
    const { w, com } = commission();
    const result = await com.setCommissionRate({ adminId: id('admin'), rateBps: 1_000, effectiveFrom: at(DAY) });
    expect(result).toMatchObject({
      rateBps: 1_000, effectiveFrom: at(DAY),
      decision: { outcome: 'allowed', reasonCode: 'CommissionRateScheduled', citations: [{ rule: 'FR-COM-7', inputs: { rateBps: 1_000, effectiveFrom: at(DAY) } }] },
    });
    expect(await rows(db, 'audit_events', `action = 'commission.rate.set'`)).toMatchObject([
      { actorKind: 'admin', actorId: id('admin'), decisionCode: 'CommissionRateScheduled', data: { rateBps: 1_000, effectiveFrom: at(DAY), requestedEffectiveFrom: at(DAY) } },
    ]);
    // Both deliveries arrive two days later: the order triggered 1 ms before the new rate keeps 800 bps.
    w.clock.advance(2 * DAY);
    const before = await db.transactions.run((tx) => com.applyOrderDeduction(tx, closed(id('o1'), at(DAY - 1))));
    const from = await db.transactions.run((tx) => com.applyOrderDeduction(tx, closed(id('o2'), at(DAY))));
    expect([before, from]).toMatchObject([{ outcome: 'charged', amountCop: 3_600 }, { outcome: 'charged', amountCop: 4_500 }]);
  });

  it('an effectiveFrom up to 60 s past is stored from now; the list shows every setting newest start first and the rate now in force', async () => {
    await admin(db);
    const { w, com } = commission();
    expect((await com.setCommissionRate({ adminId: id('admin'), rateBps: 900, effectiveFrom: at(-60_000) })).effectiveFrom).toBe(T0);
    await com.setCommissionRate({ adminId: id('admin'), rateBps: 1_000, effectiveFrom: at(DAY) });
    expect(await com.listCommissionRates({ adminId: id('admin') })).toEqual({
      rates: [
        { rateBps: 1_000, effectiveFrom: at(DAY), setBy: id('admin') },
        { rateBps: 900, effectiveFrom: T0, setBy: id('admin') },
        { rateBps: 800, effectiveFrom: '1970-01-01T00:00:00.000Z', setBy: null },
      ],
      currentRateBps: 900,
    });
    w.clock.advance(DAY);
    expect((await com.listCommissionRates({ adminId: id('admin') })).currentRateBps).toBe(1_000);
  });

  it('every refusal writes nothing: AdminOnly first, a rate out of range, 61 s past citing the asked instant, and a second setting from the same instant', async () => {
    await admin(db);
    await user(db, { id: id('camila') });
    const { com } = commission();
    const set = (o: { adminId?: string; rateBps?: number; effectiveFrom?: string }) =>
      caught(() => com.setCommissionRate({ adminId: o.adminId ?? id('admin'), rateBps: o.rateBps ?? 1_000, effectiveFrom: o.effectiveFrom ?? at(DAY) }));
    expect(codeOf(await set({ adminId: id('camila'), rateBps: -1 }))).toBe('AdminOnly');
    expect(codeOf(await caught(() => com.listCommissionRates({ adminId: id('camila') })))).toBe('AdminOnly');
    for (const rateBps of [-1, 10_001, 850.5]) {
      const error = await set({ rateBps });
      expect([codeOf(error), citedInputs(error)]).toEqual(['RequestValidationFailed', { field: 'rateBps', issue: 'debe ser un número entero entre 0 y 10000' }]);
    }
    expect(codeOf(await set({ effectiveFrom: 'mañana' }))).toBe('RequestValidationFailed');
    const past = await set({ effectiveFrom: at(-61_000) });
    expect([codeOf(past), citedInputs(past)]).toEqual(['CommissionRateNotFutureDated', { effectiveFrom: at(-61_000), now: T0 }]);
    await com.setCommissionRate({ adminId: id('admin'), rateBps: 1_000, effectiveFrom: at(DAY) });
    const twice = await set({ rateBps: 1_200 });
    expect([codeOf(twice), citedInputs(twice)]).toEqual(['RequestValidationFailed', { field: 'effectiveFrom', issue: 'ya hay una tarifa que rige desde ese instante; elige otro' }]);
    expect((await rows<{ rateBps: number }>(db, 'CommissionRateSetting')).map((r) => r.rateBps).sort((a, b) => a - b)).toEqual([800, 1_000]);
    expect(await rows(db, 'audit_events', `action = 'commission.rate.set'`)).toHaveLength(1);
  });
});

describe('the admin ledger (S-FR-COM-8.ledger; Story 8.6, decision log Impl-2 #13)', () => {
  /** Andrés's ledger: deductions at seqs 1–51 (odd seqs buyer-closed, even business-confirmed) and a top-up at seq 52; another account with none. */
  async function ledger52(): Promise<void> {
    await shop(0);
    await business(db, id('other'), 'Approved');
    await commissionAccount(db, id('other'), 0);
    for (let seq = 1; seq <= 51; seq++) {
      await ins(db, 'CommissionLedgerEntry', {
        id: id(`l${seq}`), businessId: id('andres'), seq, kind: 'Deduction', amountCop: 3_600, orderId: id(`o${seq}`), rateBps: 800, baseCop: 45_000,
        trigger: seq % 2 === 1 ? 'buyerClosed' : 'businessConfirmed', commissionTriggeredAt: T0, balanceAfter: -3_600 * seq,
      }, 'created');
    }
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 183_600, status: 'Confirmed' });
    await ins(db, 'CommissionLedgerEntry', { id: id('l52'), businessId: id('andres'), seq: 52, kind: 'TopUp', amountCop: 183_600, topUpRequestId: id('t1'), balanceAfter: 0 }, 'created');
  }
  const seqs = (r: { lines: { seq: number }[] }) => r.lines.map((l) => l.seq);
  /** from, from − step, … down to `to`. */
  const down = (from: number, to: number, step = 1) => Array.from({ length: Math.floor((from - to) / step) + 1 }, (_, i) => from - i * step);

  it('pages 50 lines newest first by seq, and the cursor reads the rest', async () => {
    await admin(db);
    await ledger52();
    const { com } = commission();
    const first = await com.getAccountLedger({ adminId: id('admin'), businessId: id('andres'), cursor: null });
    expect([first.balanceCop, first.state, seqs(first)]).toEqual([0, 'Exhausted', down(52, 3)]);
    expect(first.lines[0]).toEqual({ seq: 52, kind: 'TopUp', amountCop: 183_600, balanceAfter: 0, orderId: null, trigger: null, at: T0 });
    const second = await com.getAccountLedger({ adminId: id('admin'), businessId: id('andres'), cursor: first.nextCursor });
    expect([seqs(second), second.nextCursor]).toEqual([[2, 1], null]);
    // The business's own page reads the same 50 newest lines, numerically by seq (a text sort put 9 before 52).
    expect((await com.getMyCommissionAccount({ businessId: id('andres') })).ledger.map((l) => l.seq)).toEqual(down(52, 3));
  });

  it('the trigger filter keeps only that trigger\'s deductions, top-ups excluded', async () => {
    await admin(db);
    await ledger52();
    const result = await commission().com.getAccountLedger({ adminId: id('admin'), businessId: id('andres'), trigger: 'buyerClosed', cursor: null });
    expect([seqs(result), [...new Set(result.lines.map((l) => l.trigger))], result.nextCursor]).toEqual([down(51, 1, 2), ['buyerClosed'], null]);
  });

  it('an unknown business has no account and no lines; another account\'s cursor is RequestValidationFailed; a non-admin is AdminOnly', async () => {
    await admin(db);
    await user(db, { id: id('camila') });
    await ledger52();
    const { com } = commission();
    expect(await com.getAccountLedger({ adminId: id('admin'), businessId: id('ghost'), cursor: null })).toEqual({ balanceCop: null, state: null, lines: [], nextCursor: null });
    const { nextCursor } = await com.getAccountLedger({ adminId: id('admin'), businessId: id('andres'), cursor: null });
    const foreign = await caught(() => com.getAccountLedger({ adminId: id('admin'), businessId: id('other'), cursor: nextCursor }));
    expect([codeOf(foreign), citedInputs(foreign)]).toEqual(['RequestValidationFailed', { field: 'cursor', issue: 'no es un cursor de esta lista' }]);
    expect(codeOf(await caught(() => com.getAccountLedger({ adminId: id('camila'), businessId: id('andres'), cursor: null })))).toBe('AdminOnly');
  });
});
