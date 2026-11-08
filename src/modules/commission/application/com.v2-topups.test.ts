// COM against Postgres with the real identity, the edges the ATDD tests leave out: the admin's top-up decisions
// and their queue (COM-2, AD-COM-3, AD-16).
// Split from com.v2.test.ts by the Impl-2 test review (HIGH-4); the shared Given steps are in test-support/suites/com.ts.
import { describe, expect, it } from 'vitest';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { admin, at, business, commissionAccount, DAY, HOUR, id, individualSeller, rows, topUp, user } from '../../../../test-support/solu2/fixtures.js';
import { useComSuite } from '../../../../test-support/suites/com.js';

const { db, commission, request, shop } = useComSuite();

describe('confirmTopUp, rejectTopUp and the queue (COM-2, AD-COM-3)', () => {
  it('a non-admin is AdminOnly in the service too, and nothing is decided (AD-16)', async () => {
    await shop();
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
    const { com } = commission();
    expect(codeOf(await caught(() => com.confirmTopUp({ topUpRequestId: id('t1'), adminId: id('andres') })))).toBe('AdminOnly');
    expect(codeOf(await caught(() => com.listTopUpQueue({ adminId: id('andres'), cursor: null })))).toBe('AdminOnly');
    expect(await rows(db, 'TopUpRequest', `status = 'Pending'`)).toHaveLength(1);
  });

  it('a reason of spaces or with a NUL, and a reference with a NUL, are RequestValidationFailed with nothing written (#38)', async () => {
    await shop();
    await admin(db);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
    const { com } = commission();
    for (const reason of [' '.repeat(12), 'No encontramos\u0000 la transferencia.']) {
      expect(codeOf(await caught(() => com.rejectTopUp({ topUpRequestId: id('t1'), adminId: id('admin'), reason })))).toBe('RequestValidationFailed');
    }
    for (const transferReference of ['    ', 'REF\u0000-1']) expect(codeOf(await caught(() => com.requestTopUp(request({ transferReference }))))).toBe('RequestValidationFailed');
    expect(await rows(db, 'TopUpDecisionLog')).toHaveLength(0);
    expect(await rows(db, 'TopUpRequest')).toHaveLength(1);
  });

  it('a reject racing a confirm: one decision, one log row, and the loser cites the winner', async () => {
    await shop();
    await admin(db);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
    const { com } = commission();
    const outcomes = await Promise.allSettled([
      com.confirmTopUp({ topUpRequestId: id('t1'), adminId: id('admin') }),
      com.rejectTopUp({ topUpRequestId: id('t1'), adminId: id('admin'), reason: 'No encontramos la transferencia.' }),
    ]);
    const lost = outcomes.filter((o) => o.status === 'rejected').map((o) => (o as PromiseRejectedResult).reason);
    expect(lost.map(codeOf)).toEqual(['TopUpNotPending']);
    expect(citedInputs(lost[0])).toMatchObject({ decidedBy: id('admin') });
    expect(await rows(db, 'TopUpDecisionLog')).toHaveLength(1);
  });

  it('an admin who is also the business can neither confirm nor reject its own top-up, and nothing is written (P3a, decision log Impl-1 #33)', async () => {
    // An admin account that is also the business (the fixture writes identity's row, not commission).
    await user(db, { id: id('andres'), isAdmin: true, sellerTrack: 'business' });
    await commissionAccount(db, id('andres'), 0);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
    const { com } = commission();
    const confirm = await caught(() => com.confirmTopUp({ topUpRequestId: id('t1'), adminId: id('andres') }));
    const reject = await caught(() => com.rejectTopUp({ topUpRequestId: id('t1'), adminId: id('andres'), reason: 'No encontramos la transferencia.' }));
    expect([codeOf(confirm), citedInputs(confirm), codeOf(reject)]).toEqual(['TopUpSelfDecision', { topUpRequestId: id('t1') }, 'TopUpSelfDecision']);
    expect(await rows(db, 'TopUpRequest', `status = 'Pending'`)).toHaveLength(1);
    expect(await rows(db, 'TopUpDecisionLog')).toHaveLength(0);
  });

  it('a non-admin is AdminOnly before the reason or the cursor is checked (AD-16 first-fail)', async () => {
    await shop();
    const { com } = commission();
    expect(codeOf(await caught(() => com.rejectTopUp({ topUpRequestId: id('t1'), adminId: id('andres'), reason: 'corto' })))).toBe('AdminOnly');
    expect(codeOf(await caught(() => com.listTopUpQueue({ adminId: id('andres'), cursor: 'bm9wZQ' })))).toBe('AdminOnly');
  });

  it('NotBusinessAccount cites the caller\'s rule: FR-COM-2 for a top-up, FR-COM-9 for the account', async () => {
    await individualSeller(db, id('valentina'));
    const { com } = commission();
    const rules = await Promise.all([
      caught(() => com.listMyTopUps({ businessId: id('valentina'), cursor: null })),
      caught(() => com.getMyCommissionAccount({ businessId: id('valentina') })),
    ]);
    expect(rules.map((e) => (e as { citations: { rule: string }[] }).citations[0]!.rule)).toEqual(['FR-COM-2', 'FR-COM-9']);
  });

  it('a rejection reason outside 10–300 characters is refused before any write', async () => {
    await shop();
    await admin(db);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
    expect(codeOf(await caught(() => commission().com.rejectTopUp({ topUpRequestId: id('t1'), adminId: id('admin'), reason: 'corto' })))).toBe('RequestValidationFailed');
    expect(await rows(db, 'TopUpDecisionLog')).toHaveLength(0);
  });

  it('a confirmation racing deductions on one account keeps the seq gapless and the ledger summing to the balance, 20 times', async () => {
    await business(db, id('andres'), 'Approved');
    await admin(db);
    const { com } = commission();
    for (let rep = 0; rep < 20; rep++) {
      await db.query(`TRUNCATE "CommissionLedgerEntry", "TopUpDecisionLog", "TopUpRequest", "CommissionAccount", "OutboxEvent", audit_events CASCADE`);
      await commissionAccount(db, id('andres'), 0);
      await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
      await Promise.all([
        com.confirmTopUp({ topUpRequestId: id('t1'), adminId: id('admin') }),
        ...[1, 2].map((k) => db.transactions.run((tx) => com.applyOrderDeduction(tx, {
          type: 'OrderPaymentConfirmedByBusiness', orderId: id(`o${k}`), businessId: id('andres'), totalCop: 45_000, sellerReceivedConfirmedAt: at(-HOUR), buyerItemReceivedConfirmedAt: null,
        }))),
      ]);
      const seqs = (await rows<{ seq: string }>(db, 'CommissionLedgerEntry')).map((l) => Number(l.seq)).sort();
      expect(seqs).toEqual([1, 2, 3]);
      expect(await rows(db, 'CommissionAccount')).toMatchObject([{ balanceCop: String(50_000 - 7_200), ledgerSeq: '3' }]);
    }
  });

  it('the queue pages 25 oldest first', async () => {
    await shop();
    await admin(db);
    for (let i = 0; i < 26; i++) {
      await topUp(db, { id: id(`q${String(i).padStart(2, '0')}`), businessId: id('andres'), amountCop: 20_000, submittedAt: at(-DAY + i * 1000) });
    }
    const { com } = commission();
    const first = await com.listTopUpQueue({ adminId: id('admin'), cursor: null });
    expect([first.rows.length, first.rows[0]!.topUpRequestId]).toEqual([25, id('q00')]);
    expect((await com.listTopUpQueue({ adminId: id('admin'), cursor: first.nextCursor })).rows.map((r) => r.topUpRequestId)).toEqual([id('q25')]);
  });
});
