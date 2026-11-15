// COM against Postgres with the real identity, the edges the ATDD tests leave out: the account (S-FR-COM-1),
// the top-up request and its proof (S-FR-COM-2, AD-SYS-8), the business's reads (S-FR-COM-2.mine, -9) and the deduction (COM-1).
// Split from com.v2.test.ts by the Impl-2 test review (HIGH-4); the shared Given steps are in test-support/suites/com.ts.
import { describe, expect, it } from 'vitest';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { admin, at, business, DAY, HOUR, id, rows, topUp } from '../../../../test-support/solu2/fixtures.js';
import { useComSuite } from '../../../../test-support/suites/com.js';

const { db, commission, JPEG, request, shop } = useComSuite();

describe('openCommissionAccount (S-FR-COM-1)', () => {
  it('stores the approval instant as openedAt and writes one system audit row', async () => {
    await business(db, id('andres'), 'Approved');
    await db.transactions.run((tx) => commission().com.openCommissionAccount(tx, { businessId: id('andres'), approvedAt: at(-DAY) }));
    expect(await rows(db, 'CommissionAccount')).toMatchObject([{ openedAt: new Date(at(-DAY)) }]);
    expect(await rows(db, 'audit_events', `action = 'commission.account.opened'`)).toMatchObject([{ actorKind: 'system', aggregateId: id('andres') }]);
  });
});

describe('requestTopUp and its proof (S-FR-COM-2, AD-SYS-8)', () => {
  it('a ticket is under the business\'s prefix, and a pending business with no account is CommissionAccountNotOpen', async () => {
    await shop();
    const { com } = commission();
    expect((await com.createTopUpProofUpload({ businessId: id('andres') })).uploadKey).toMatch(new RegExp(`^topup-proof/${id('andres')}/[a-z0-9]+$`));
    await business(db, id('pending'), 'Pending');
    const error = await caught(() => com.createTopUpProofUpload({ businessId: id('pending') }));
    expect([codeOf(error), citedInputs(error)]).toEqual(['CommissionAccountNotOpen', { accountOpened: false }]);
  });

  it('a key outside the business\'s prefix, or with extra segments, is TopUpProofInvalidFile and is never read', async () => {
    await shop();
    const { w, com } = commission();
    w.storage.simulateDirectUpload(`topup-proof/${id('other')}/p1`, JPEG, 'image/jpeg');
    for (const uploadKey of [`topup-proof/${id('other')}/p1`, `topup-proof/${id('andres')}/`, `topup-proof/${id('andres')}/a/b`]) {
      const error = await caught(() => com.requestTopUp(request({ uploadKey })));
      expect([codeOf(error), citedInputs(error)]).toEqual(['TopUpProofInvalidFile', { cause: 'missing' }]);
    }
    expect(await rows(db, 'TopUpRequest')).toHaveLength(0);
  });

  it('wrong magic bytes are refused with cause magic, and nothing is promoted', async () => {
    await shop();
    const { w, com } = commission();
    w.storage.simulateDirectUpload(`topup-proof/${id('andres')}/p1`, new Uint8Array([1, 2, 3, 4]), 'image/jpeg');
    const error = await caught(() => com.requestTopUp(request()));
    expect(citedInputs(error)).toEqual({ cause: 'magic' });
    expect(await rows(db, 'TopUpRequest')).toHaveLength(0);
  });

  it('an accepted proof is promoted to topup-proofs, the quarantine copy is deleted, and the audit names the request', async () => {
    await shop();
    const { w, com } = commission();
    w.storage.simulateDirectUpload(`topup-proof/${id('andres')}/p1`, JPEG, 'image/jpeg');
    const { topUpRequestId } = await com.requestTopUp(request());
    const [row] = await rows<{ proofObjectKey: string }>(db, 'TopUpRequest');
    expect(row!.proofObjectKey).toMatch(/^topup-proofs\//);
    expect(await w.storage.get('upload-quarantine', `topup-proof/${id('andres')}/p1`)).toBeNull();
    expect(await rows(db, 'audit_events', `action = 'commission.topUp.requested'`)).toMatchObject([{ aggregateId: topUpRequestId, decisionCode: 'TopUpRequested' }]);
  });

  it('an admin reads any proof URL; the owner reads its own; the URL lives 600 s', async () => {
    await shop();
    await admin(db);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
    const { w, com } = commission();
    const owner = await com.getTopUpProofUrl({ topUpRequestId: id('t1'), actorId: id('andres') });
    expect(owner.expiresAt).toBe(new Date(w.clock.now().getTime() + 600_000).toISOString());
    expect((await com.getTopUpProofUrl({ topUpRequestId: id('t1'), actorId: id('admin') })).url).toBe(owner.url);
  });
});

describe('listMyTopUps and getMyCommissionAccount (S-FR-COM-2.mine, S-FR-COM-9)', () => {
  it('pages 25 at a time, newest first, and a foreign cursor is refused', async () => {
    await shop();
    for (let i = 0; i < 27; i++) {
      await topUp(db, { id: id(`t${String(i).padStart(2, '0')}`), businessId: id('andres'), amountCop: 20_000, submittedAt: at(-HOUR + i * 1000) });
    }
    const { com } = commission();
    const first = await com.listMyTopUps({ businessId: id('andres'), cursor: null });
    expect(first.rows).toHaveLength(25);
    expect(first.rows[0]!.topUpRequestId).toBe(id('t26'));
    const second = await com.listMyTopUps({ businessId: id('andres'), cursor: first.nextCursor });
    expect(second.rows.map((r) => r.topUpRequestId)).toEqual([id('t01'), id('t00')]);
    expect(second.nextCursor).toBeNull();
    expect(codeOf(await caught(() => com.listMyTopUps({ businessId: id('andres'), cursor: 'bm9wZQ' })))).toBe('RequestValidationFailed');
  });

  it('a negative balance names what is needed to resume; no account reads as a notice, not an error', async () => {
    await shop(-4_000);
    await business(db, id('pending'), 'Pending');
    const { com } = commission();
    expect(await com.getMyCommissionAccount({ businessId: id('andres') })).toMatchObject({
      account: { balanceCop: -4_000, state: 'Exhausted', lowBalance: false, neededToResumeCop: 4_001 },
      decision: { outcome: 'allowedWithNotice', reasonCode: 'CommissionBalanceNeedsTopUp' },
    });
    expect(await com.getMyCommissionAccount({ businessId: id('pending') })).toMatchObject({
      account: null, ledger: [], decision: { outcome: 'allowedWithNotice', reasonCode: 'CommissionAccountNotYetOpen' },
    });
  });
});

describe('applyOrderDeduction (COM-1)', () => {
  const ev = (o: Partial<{ orderId: string; totalCop: number; seller: string | null; item: string | null }> = {}) => ({
    type: 'OrderClosed' as const, orderId: o.orderId ?? id('o1'), businessId: id('andres'), totalCop: o.totalCop ?? 45_000,
    sellerReceivedConfirmedAt: o.seller === undefined ? null : o.seller, buyerItemReceivedConfirmedAt: o.item === undefined ? at(-HOUR) : o.item,
  });
  const deduct = (e: ReturnType<typeof ev>) => db.transactions.run((tx) => commission().com.applyOrderDeduction(tx, e));

  it('a buyerClosed trigger cites FR-COM-4 in the audit row, and a zero amount still writes its entry with no crossing', async () => {
    await shop(5_000);
    expect(await deduct(ev())).toMatchObject({ outcome: 'charged', trigger: 'buyerClosed', amountCop: 3_600 });
    expect(await rows(db, 'audit_events', `action = 'commission.deduction.applied'`)).toMatchObject([{ data: { rule: 'FR-COM-4', trigger: 'buyerClosed' } }]);
    expect(await deduct(ev({ orderId: id('o2'), totalCop: 6 }))).toEqual({ outcome: 'charged', amountCop: 0, balanceAfter: 1_400, ledgerSeq: 2, trigger: 'buyerClosed', crossing: null });
    expect(await rows(db, 'CommissionLedgerEntry', `"orderId" = $1`, [id('o2')])).toMatchObject([{ amountCop: '0', seq: '2' }]);
  });

  it('a payload with neither fact is Unexpected and writes nothing', async () => {
    await shop(5_000);
    expect(codeOf(await caught(() => deduct(ev({ item: null }))))).toBe('Unexpected');
    expect(await rows(db, 'CommissionLedgerEntry')).toHaveLength(0);
  });

  it('a deduction from ≤ 0 crosses nothing and publishes nothing', async () => {
    await shop(-100);
    expect(await deduct(ev())).toMatchObject({ balanceAfter: -3_700, crossing: null });
    expect(await rows(db, 'OutboxEvent')).toHaveLength(0);
  });
});
