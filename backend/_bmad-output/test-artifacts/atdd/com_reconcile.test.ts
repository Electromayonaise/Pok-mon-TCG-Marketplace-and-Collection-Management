// ATDD — Story 8.5, the concurrency half of COM-3 (contracts.md §7 "Concurrency / idempotency"; AD-COM-1
// rule 4; AD-SYS-4 rule 7). Flow A + Flow D (decision log Impl-2 #13): written before reconcile existed;
// red on NotImplementedError until Story 8.5 is done.
import { beforeAll, describe, expect, it } from 'vitest';
import { ComServiceV2 } from '../../../src/modules/commission/index.js';
import type { ApplyOrderDeductionRequest, IdentityForCom } from '../../../src/modules/commission/index.js';
import { compose } from '../../../src/server/composition.js';
import { VirtualClock } from '../../../test-support/clock.js';
import { race } from '../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { admin, at, business, commissionAccount, fake, HOUR, id, ins, rows, topUp, wiring } from '../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();
const SECRET = 'reconcile-test-jobs-secret-0123456789abcdef';
const ADMIN = { kind: 'admin' as const, adminId: id('admin') };

function commission() {
  const identity = fake<IdentityForCom>('identity', {
    getCapabilities: async () => ({ capabilities: { canBuy: true, canListAsIndividual: false, canListAsBusiness: true, isVerifiedBusiness: true, canReceiveInAppMessages: true, canModerate: false }, sellerKind: 'business', derivedFrom: [] }),
    getBusinessName: async () => ({ businessName: 'Cartas Andrés' }),
  });
  return new ComServiceV2({ ...wiring(db), identity });
}
const ev = (orderId: string): ApplyOrderDeductionRequest => ({
  type: 'OrderPaymentConfirmedByBusiness', orderId, businessId: id('andres'), totalCop: 45_000, sellerReceivedConfirmedAt: at(-HOUR), buyerItemReceivedConfirmedAt: null,
});
/** A funded, consistent account: one confirmed top-up of `balance`, ledger seq 1. */
async function fundedShop(balance: number) {
  await admin(db);
  await business(db, id('andres'), 'Approved');
  await commissionAccount(db, id('andres'), balance, 1);
  await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: balance, status: 'Confirmed' });
  await ins(db, 'CommissionLedgerEntry', { id: id('l1'), businessId: id('andres'), seq: 1, kind: 'TopUp', amountCop: balance, topUpRequestId: id('t1'), balanceAfter: balance }, 'created');
}
const balance = async () => Number((await db.query<{ balanceCop: string }>(`SELECT "balanceCop" FROM "CommissionAccount" WHERE "businessId" = $1`, [id('andres')]))[0]!.balanceCop);

describe('Story 8.5 — reconcile under concurrent writes (COM-3 Q1, AD-COM-1 rule 4)', () => {
  it('[COM-3.C1] reconcile racing 50 concurrent deductions, 20 times: every run reports 0 discrepancies, and reconcile writes no account or ledger row', async () => {
    await fundedShop(10_000_000);
    const com = commission();
    for (let rep = 0; rep < 20; rep++) {
      const { fulfilled, rejected } = await race<unknown>(55, (i) => (i < 50
        ? db.transactions.run((tx) => com.applyOrderDeduction(tx, ev(id(`o${rep}x${i}`))))
        : com.reconcile({ businessId: id('andres'), actor: ADMIN })));
      // A rejected call fails the test with its own error, so the cause is never hidden behind a count.
      if (rejected.length > 0) throw rejected[0];
      const runs = fulfilled.filter((r) => typeof r === 'object' && r !== null && 'discrepancies' in r) as { discrepancies: unknown[] }[];
      expect(runs).toHaveLength(5);
      expect(runs.flatMap((r) => r.discrepancies)).toEqual([]);
    }
    // 1,000 deductions of 8 % of 45,000 = 3,600 each; reconcile itself added only its 100 run rows.
    expect(await balance()).toBe(10_000_000 - 1_000 * 3_600);
    expect(await rows(db, 'CommissionLedgerEntry')).toHaveLength(1 + 1_000);
    expect(await rows(db, 'ReconciliationRun')).toHaveLength(100);
    const last = await com.reconcile({ businessId: null, actor: ADMIN });
    expect(last).toMatchObject({ accountsChecked: 1, discrepancies: [] });
  }, 120_000);
});

describe('Story 8.5 — the job path through /api/jobs/commission-reconcile (COM-3 P2, Story 1.6)', () => {
  let app: ReturnType<typeof compose>;
  beforeAll(() => {
    app = compose({ pool: db.pool, clock: new VirtualClock(), sessions: { userIdOf: async () => null }, jobsSecret: SECRET });
  });
  /** One nightly run; a failed run throws with its JobRun error code, which the 500 body never carries. */
  const run = async () => {
    const res = await app.jobs(new Request('http://localhost/api/jobs/commission-reconcile?trigger=daily-night', { method: 'POST', headers: { authorization: `Bearer ${SECRET}` } }));
    if (res.status !== 200) {
      const [failed] = await db.query<{ errorCode: string | null }>(`SELECT "errorCode" FROM "JobRun" WHERE outcome = 'failed' ORDER BY "startedAt" DESC LIMIT 1`);
      throw new Error(`the job answered ${res.status}; its JobRun errorCode is ${failed?.errorCode ?? 'none'}`);
    }
    return { status: res.status, json: (await res.json()) as { outcome?: string; result?: unknown } };
  };
  const jobRuns = () => db.query<{ outcome: string }>(`SELECT outcome FROM "JobRun" WHERE job = 'commission-reconcile'`);

  it('[COM-3.C2] a held job lock makes the nightly run a skipped no-op; once released one run reconciles; 10 concurrent runs leave 10 JobRun rows and one ReconciliationRun per run that ran', async () => {
    await fundedShop(50_000);
    const holder = await db.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT pg_advisory_xact_lock(hashtextextended('job:commission-reconcile', 0))`);
      expect((await run()).json).toMatchObject({ outcome: 'skipped' });
      expect(await rows(db, 'ReconciliationRun')).toEqual([]);
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
    }
    expect((await run()).json).toMatchObject({ outcome: 'succeeded', result: { accountsChecked: 1, discrepancies: [] } });
    const { fulfilled, rejected } = await race(10, () => run());
    if (rejected.length > 0) throw rejected[0];
    const outcomes = fulfilled.map((r) => r.json.outcome);
    expect(outcomes.every((o) => o === 'succeeded' || o === 'skipped')).toBe(true);
    expect(await jobRuns()).toHaveLength(12);
    expect(await rows(db, 'ReconciliationRun')).toHaveLength(1 + outcomes.filter((o) => o === 'succeeded').length);
  });
});
