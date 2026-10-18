// Solu-1 ATDD — COM contracts (contracts.md §7). RED until implemented.
import { beforeEach, describe, expect, it } from 'vitest';
import { createComModule, type OrderCommissionEventDTO } from '../../../../src/modules/commission/index.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, httpOf } from '../../../../test-support/errors.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';
import { wiring, type Wiring } from '../../../../test-support/wiring.js';

const db = useTestDatabase();
let w: Wiring;
beforeEach(() => {
  w = wiring(db);
});
const com = () => createComModule({ sql: w.sql, outbox: w.outbox, clock: w.clock, ids: w.ids });
const andres = id('andres');
const event = (orderId: string, totalCop: number, o: Partial<OrderCommissionEventDTO> = {}): OrderCommissionEventDTO => ({
  orderId, businessId: andres, totalCop, sellerReceivedConfirmedAt: '2026-10-01T16:00:00.000Z', buyerItemReceivedConfirmedAt: null, ...o,
});
/** Each delivery runs in its own handler transaction (AD-SYS-2 rule 4 step 2). */
const deliver = (e: OrderCommissionEventDTO) => db.transactions.run((tx) => com().applyOrderDeduction(tx, e));
const account = async () => (await db.query(`SELECT "balanceCop"::int AS balance, state, "ledgerSeq"::int AS seq FROM "CommissionAccount" WHERE "businessId" = $1`, [andres]))[0];

describe('Solu-1 ATDD: COM — assertTopUpVisible (guard, AD-COM-3 rule 4)', () => {
  it('RED: the owning business passes with zero writes', async () => {
    await seed.topUpRequest(db, { id: id('topup'), businessId: andres });
    await expect(com().assertTopUpVisible({ topUpRequestId: id('topup'), actorId: andres })).resolves.toBeUndefined();
  });

  it("RED: another business's request and an unknown id both get TopUpNotVisibleToCaller (403)", async () => {
    await seed.topUpRequest(db, { id: id('topup'), businessId: andres });
    for (const topUpRequestId of [id('topup'), id('ghost')]) {
      const error = await caught(() => com().assertTopUpVisible({ topUpRequestId, actorId: id('tiendapaisa') }));
      expect(codeOf(error)).toBe('TopUpNotVisibleToCaller');
      expect(httpOf(error)).toBe(403);
    }
  });
});

describe('Solu-1 ATDD: COM — applyOrderDeduction (contended mutation, AD-COM-1, AD-COM-2, AD-SYS-3)', () => {
  it('RED: 45,007 at 800 bps charges 3,601 (ADD-§2.6) once, at seq 1, triggered by the business confirmation', async () => {
    await seed.commissionAccount(db, { businessId: andres, balanceCop: 10_000 });
    const result = await deliver(event(id('ordera'), 45_007));
    expect(result).toEqual({ outcome: 'charged', amountCop: 3_601, balanceAfter: 6_399, ledgerSeq: 1, crossing: null });
    expect(await account()).toEqual({ balance: 6_399, state: 'Funded', seq: 1 });
    expect(await db.query(`SELECT "amountCop"::int AS amount, "rateBps", "baseCop"::int AS base, trigger FROM "CommissionLedgerEntry"`)).toEqual([
      { amount: 3_601, rateBps: 800, base: 45_007, trigger: 'businessConfirmed' },
    ]);
    expect(await db.counts(['OutboxEvent'])).toEqual({ OutboxEvent: 0 });
  });

  it('RED: a redelivery of the same order is a no-op — no second entry, no balance change', async () => {
    await seed.commissionAccount(db, { businessId: andres, balanceCop: 10_000 });
    await deliver(event(id('ordera'), 45_007));
    expect(await deliver(event(id('ordera'), 45_007, { buyerItemReceivedConfirmedAt: '2026-10-03T16:00:00.000Z' }))).toEqual({ outcome: 'duplicate' });
    expect(await account()).toEqual({ balance: 6_399, state: 'Funded', seq: 1 });
    expect(await db.counts(['CommissionLedgerEntry'])).toEqual({ CommissionLedgerEntry: 1 });
  });

  it('RED: crossing from > 0 to ≤ 0 is never refused, goes negative, and enqueues one Exhausted event for listings', async () => {
    await seed.commissionAccount(db, { businessId: andres, balanceCop: 3_000 });
    const result = await deliver(event(id('ordera'), 45_007));
    expect(result).toMatchObject({ outcome: 'charged', balanceAfter: -601, crossing: 'exhausted' });
    expect(await db.query(`SELECT type, payload FROM "OutboxEvent"`)).toEqual([
      { type: 'CommissionBalanceExhausted', payload: { businessId: andres, ledgerSeq: 1, balanceAfter: -601 } },
    ]);
  });

  it('RED: when the buyer closed first, the trigger is buyerClosed at that instant and the rate in force then applies', async () => {
    await seed.commissionAccount(db, { businessId: andres, balanceCop: 10_000 });
    await db.query(`INSERT INTO "CommissionRateSetting" (id, "rateBps", "effectiveFrom", "setBy", "setAt") VALUES ($1, 1000, '2026-10-02T00:00:00Z', $2, '2026-10-01T15:00:00Z')`, [id('rate10'), id('sebastian')]);
    await deliver(event(id('ordera'), 45_007, { sellerReceivedConfirmedAt: null, buyerItemReceivedConfirmedAt: '2026-10-01T18:00:00.000Z' }));
    expect(await db.query(`SELECT trigger, "rateBps", "commissionTriggeredAt" FROM "CommissionLedgerEntry"`)).toEqual([
      { trigger: 'buyerClosed', rateBps: 800, commissionTriggeredAt: new Date('2026-10-01T18:00:00.000Z') },
    ]);
  });

  it('RED (mandatory edge case NFR-COM-1): two orders at one instant against a balance for one, plus a duplicate — each charged once, ledger reconciles, Exhausted fires once', async () => {
    await seed.commissionAccount(db, { businessId: andres, balanceCop: 4_000 });
    const outcome = await race(3, (n) => deliver(event(n === 1 ? id('orderb') : id('ordera'), 45_007)));
    expect(outcome.rejected.map(codeOf)).toEqual([]);
    expect(outcome.fulfilled.map((r) => r.outcome).sort()).toEqual(['charged', 'charged', 'duplicate']);
    expect(await account()).toEqual({ balance: 4_000 - 2 * 3_601, state: 'Exhausted', seq: 2 });
    expect(await db.query(`SELECT seq::int AS seq FROM "CommissionLedgerEntry" ORDER BY seq`)).toEqual([{ seq: 1 }, { seq: 2 }]);
    expect(await db.query(`SELECT type FROM "OutboxEvent"`)).toEqual([{ type: 'CommissionBalanceExhausted' }]);
  });
});

describe('Solu-1 ATDD: COM — findCommissionAccount (resolver, FR-COM-8)', () => {
  it('RED: returns the opened account', async () => {
    await seed.commissionAccount(db, { businessId: andres, balanceCop: 12_500, ledgerSeq: 3 });
    expect(await com().findCommissionAccount({ businessId: andres })).toEqual({ businessId: andres, balanceCop: 12_500, state: 'Funded', ledgerSeq: 3 });
  });

  it('RED: a business with no account resolves silently to null and no account is created', async () => {
    expect(await com().findCommissionAccount({ businessId: andres })).toBeNull();
    expect(await db.counts(['CommissionAccount'])).toEqual({ CommissionAccount: 0 });
  });
});
