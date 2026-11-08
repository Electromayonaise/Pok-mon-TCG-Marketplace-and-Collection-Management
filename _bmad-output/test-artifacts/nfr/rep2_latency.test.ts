// NFR benchmark — NFR-REP-2: a hide applies on the very next read, and the aggregates read p95 ≤ 300 ms at N = 1
// (contracts.md §12, REP-3 latency budget; decision log Impl-1 #38, D3). PRD §7 protocol: Postgres, the §3 seed's 400
// reviews (15 hidden) over 68 sellers, 50 warm-up and 500 measured calls, server-side service time. The full profile read
// (the target check, the aggregate plus its first page in one REPEATABLE READ snapshot) is Story 13.5's [NFR-REP-2.profile]
// (decision log Impl-2 #18), with the real identity behind REP's identity port, as the composition root binds it.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IdnServiceV2 } from '../../../src/modules/identity/index.js';
import { RepServiceV2 } from '../../../src/modules/reviews/index.js';
import type { IdentityForRep, OrdersForRep } from '../../../src/modules/reviews/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { fake, id, wiring } from '../../../test-support/solu2/fixtures.js';
import { buyerId, businessId, individualId, seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
import { percentile } from '../../../test-support/solu2/bench.js';

const db = useTestDatabase();

function reputation() {
  return new RepServiceV2({ ...wiring(db), identity: fake<IdentityForRep>('identity', {}), orders: fake<OrdersForRep>('orders', {}) });
}

/** REP with the real identity (S-FR-IDN-6.target, P-IDN.names): the profile's whole path. */
function profiles() {
  const w = wiring(db);
  const idn = new IdnServiceV2(w);
  return new RepServiceV2({
    ...w, orders: fake<OrdersForRep>('orders', {}),
    identity: { getReviewTarget: (i) => idn.getReviewTarget(i), getDisplayNames: (i) => idn.getDisplayNames(i) },
  });
}

/** The 68 reviewed sellers of the seed, padded with buyers (no review) to 500 distinct ids. */
const sellers = [
  ...Array.from({ length: 8 }, (_, b) => businessId(b)),
  ...Array.from({ length: 60 }, (_, i) => individualId(i)),
  ...Array.from({ length: 432 }, (_, k) => buyerId(1_000 + k)),
];

function record(name: string, samples: number[]) {
  const result = { n: samples.length, p50: percentile(samples, 50), p95: percentile(samples, 95), max: Math.max(...samples) };
  fs.mkdirSync('.vitest-results', { recursive: true });
  fs.writeFileSync(`.vitest-results/${name}.json`, JSON.stringify(result, null, 2));
  return result;
}

describe('NFR-REP-2 — reputation reads (PRD §7)', () => {
  it('[NFR-REP-2.nextRead] 500 hides, each followed by the aggregate read: every read reflects the hide, p95 ≤ 300 ms', async () => {
    await seedMarketplace(db);
    const rep = reputation();
    const visible = await db.query<{ id: string; targetUserId: string }>(`SELECT id, "targetUserId" FROM "Review" WHERE "hiddenAt" IS NULL ORDER BY id`);
    expect(visible.length).toBe(385);
    const samples: number[] = [];
    // 550 cycles over the visible reviews: hide, read (measured after the 50 warm-up), then an unmeasured unhide.
    for (let k = 0; k < 550; k++) {
      const r = visible[k % visible.length]!;
      const [before] = (await rep.getAggregates({ sellerIds: [r.targetUserId] })).aggregates;
      const action = { reviewId: r.id, reasonCode: 'Spam' as const, note: null, adminId: id('admin') };
      await rep.hideReview(action);
      const start = performance.now();
      const [after] = (await rep.getAggregates({ sellerIds: [r.targetUserId] })).aggregates;
      if (k >= 50) samples.push(performance.now() - start);
      expect(after!.count).toBe(before!.count - 1);
      await rep.unhideReview(action);
    }
    expect(record('nfr-rep-2-next-read', samples).p95).toBeLessThanOrEqual(300);
  }, 300_000);

  it('[NFR-REP-2.profile] 500 measured profile reads (the aggregate and the first page of 20) of the seed’s 68 reviewed sellers: p95 ≤ 300 ms', async () => {
    await seedMarketplace(db);
    const rep = profiles();
    const reviewed = sellers.slice(0, 68);
    // Given: every reviewed seller is a public profile, and its page agrees with its aggregate (one snapshot).
    let listed = 0;
    for (const userId of reviewed) {
      const p = await rep.getProfile({ userId, page: 1 });
      expect(p.hasMore).toBe(p.aggregate.count > 20);
      expect(p.reviews.length).toBe(Math.min(20, p.aggregate.count));
      listed += p.aggregate.count;
    }
    expect(listed).toBe(385);
    for (let k = 0; k < 50; k++) await rep.getProfile({ userId: reviewed[k % reviewed.length]!, page: 1 });
    const samples: number[] = [];
    for (let k = 0; k < 500; k++) {
      const start = performance.now();
      await rep.getProfile({ userId: reviewed[k % reviewed.length]!, page: 1 });
      samples.push(performance.now() - start);
    }
    expect(record('nfr-rep-2-profile', samples).p95).toBeLessThanOrEqual(300);
  }, 300_000);

  it('[NFR-REP-2.aggregates] 500 measured aggregate reads of 500 sellers over the seed: p95 ≤ 300 ms', async () => {
    await seedMarketplace(db);
    const rep = reputation();
    const { aggregates } = await rep.getAggregates({ sellerIds: sellers });
    expect(aggregates.reduce((n, a) => n + a.count, 0)).toBe(385);
    for (let k = 0; k < 50; k++) await rep.getAggregates({ sellerIds: sellers });
    const samples: number[] = [];
    for (let k = 0; k < 500; k++) {
      const start = performance.now();
      await rep.getAggregates({ sellerIds: sellers });
      samples.push(performance.now() - start);
    }
    expect(record('nfr-rep-2-aggregates', samples).p95).toBeLessThanOrEqual(300);
  }, 300_000);
});
