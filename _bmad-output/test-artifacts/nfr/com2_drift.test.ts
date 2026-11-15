// NFR benchmark — NFR-COM-2: reconciliation difference 0 pesos over 10,000 operations with 20 % duplicate
// deliveries (PRD §7; contracts.md COM-3 I1, AD-COM-1 rule 4, AD-19). Story 8.5, Flow D (decision log
// Impl-2 #13): written before reconcile existed; red on NotImplementedError until Story 8.5 is done.
// The operations come from a seeded PRNG, so every run replays the same 10,000 operations.
import { describe, expect, it } from 'vitest';
import { ComServiceV2 } from '../../../src/modules/commission/index.js';
import type { ApplyOrderDeductionRequest, IdentityForCom } from '../../../src/modules/commission/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { admin, at, business, commissionAccount, fake, HOUR, id, rows, topUp, wiring } from '../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();
const OPERATIONS = 10_000;

/** mulberry32: a small deterministic PRNG, so the operation sequence is identical on every run. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

describe('NFR-COM-2 — reconciliation drift (PRD §7)', () => {
  it('[NFR-COM-2.drift] 10,000 seeded-random top-ups and deductions with 20 % duplicate deliveries reconcile with 0 discrepancies, and the balance is the ledger\'s sum', async () => {
    await admin(db);
    await business(db, id('andres'), 'Approved');
    await commissionAccount(db, id('andres'), 0, 0);
    const identity = fake<IdentityForCom>('identity', {
      getCapabilities: async () => ({ capabilities: { canBuy: true, canListAsIndividual: false, canListAsBusiness: true, isVerifiedBusiness: true, canReceiveInAppMessages: true, canModerate: false }, sellerKind: 'business', derivedFrom: [] }),
      getBusinessName: async () => ({ businessName: 'Cartas Andrés' }),
    });
    const com = new ComServiceV2({ ...wiring(db), identity });
    const random = prng(20_261_103);
    const delivered: ApplyOrderDeductionRequest[] = [];
    let topUps = 0;
    let duplicates = 0;
    for (let k = 0; k < OPERATIONS; k++) {
      if (random() < 0.2) {
        await topUp(db, { id: id(`t${k}`), businessId: id('andres'), amountCop: 20_000 + Math.floor(random() * 181) * 1_000 });
        await com.confirmTopUp({ topUpRequestId: id(`t${k}`), adminId: id('admin') });
        topUps++;
        continue;
      }
      // 20 % of deliveries repeat an earlier order: the same event again, or its other trigger (AD-COM-2).
      const repeat = delivered.length > 0 && random() < 0.2;
      const event: ApplyOrderDeductionRequest = repeat
        ? { ...delivered[Math.floor(random() * delivered.length)]!, type: random() < 0.5 ? 'OrderPaymentConfirmedByBusiness' : 'OrderClosed', buyerItemReceivedConfirmedAt: at(-HOUR) }
        : { type: 'OrderPaymentConfirmedByBusiness', orderId: id(`o${k}`), businessId: id('andres'), totalCop: 10_000 + Math.floor(random() * 491) * 1_000, sellerReceivedConfirmedAt: at(-HOUR), buyerItemReceivedConfirmedAt: null };
      if (repeat) duplicates++;
      else delivered.push(event);
      await db.transactions.run((tx) => com.applyOrderDeduction(tx, event));
    }
    expect(topUps + delivered.length + duplicates).toBe(OPERATIONS);
    expect(duplicates / (delivered.length + duplicates)).toBeGreaterThan(0.15);

    const result = await com.reconcile({ businessId: null, actor: { kind: 'admin', adminId: id('admin') } });
    expect(result).toMatchObject({ accountsChecked: 1, discrepancies: [] });
    // Each order is charged exactly once, whatever its redeliveries.
    const ledger = await rows<{ kind: string; amountCop: string }>(db, 'CommissionLedgerEntry');
    expect(ledger.filter((l) => l.kind === 'Deduction')).toHaveLength(delivered.length);
    expect(ledger.filter((l) => l.kind === 'TopUp')).toHaveLength(topUps);
    const sum = ledger.reduce((s, l) => s + (l.kind === 'TopUp' ? 1n : -1n) * BigInt(l.amountCop), 0n);
    const [account] = await db.query<{ balanceCop: string }>(`SELECT "balanceCop" FROM "CommissionAccount" WHERE "businessId" = $1`, [id('andres')]);
    expect(BigInt(account!.balanceCop)).toBe(sum);
  }, 300_000);
});
