// ATDD — COM supporting contracts, offered ports and read models (contracts.md §15). Split from com_contracts.test.ts (test review R-7..R-12).
import { describe, expect, it } from 'vitest';
import { ComServiceV2 } from '../../../../src/modules/commission/index.js';
import type { IdentityForCom, RequestTopUpRequest } from '../../../../src/modules/commission/index.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { admin, at, business, commissionAccount, DAY, fake, id, ins, rows, T0, topUp, user, wiring } from '../../../../test-support/solu2/fixtures.js';

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
const account = async () => (await rows<{ balanceCop: string; ledgerSeq: string; state: string }>(db, 'CommissionAccount', '"businessId" = $1', [id('andres')]))[0];
const ledger = (where = 'TRUE') => rows<Record<string, unknown>>(db, 'CommissionLedgerEntry', where);
const outbox = (type: string) => rows(db, 'OutboxEvent', 'type = $1', [type]);
async function shop(balance: number, seq = 0): Promise<void> {
  await business(db, id('andres'), 'Approved');
  await commissionAccount(db, id('andres'), balance, seq);
}

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
