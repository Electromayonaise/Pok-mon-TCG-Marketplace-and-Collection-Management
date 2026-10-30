// NFR benchmark — NFR-VAL-2: the current value plus the 30-day trend of a 500-entry collection p95 ≤ 1,500 ms, and its
// 365-day history p95 ≤ 2,500 ms, at N = 1 (contracts.md §11). PRD §7
// protocol: Postgres, the §3 seed's 500-entry collection (480 catalog entries with 90 days of history, 20 link-added), 50
// warm-up and 500 measured calls, server-side service time. The service is composed as the composition root binds it (the
// real catalog, no fakes), so the measured path is the real one. The trend and history runs take 550 × 200–300 ms locally,
// so their timeout leaves room for a slower CI runner.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CatServiceV2 } from '../../../src/modules/catalog/index.js';
import { ValServiceV2 } from '../../../src/modules/collections/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../../src/shared-kernel/external.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { fake, id, wiring } from '../../../test-support/solu2/fixtures.js';
import { individualId, seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
import { percentile } from '../../../test-support/solu2/bench.js';

const db = useTestDatabase();

/** The seed's 500-entry collection and its owner. */
const big = { collectionId: id('col0n0'), actorId: individualId(0) };

function valuation() {
  const w = wiring(db);
  const catalog = new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });
  return new ValServiceV2({ ...w, catalog });
}

/** 50 warm-up calls, then 500 measured ones; the summary is written for nfr-evidence.md. */
async function measure(name: string, call: (k: number) => Promise<unknown>) {
  for (let k = 0; k < 50; k++) await call(k);
  const samples: number[] = [];
  for (let k = 50; k < 550; k++) {
    const start = performance.now();
    await call(k);
    samples.push(performance.now() - start);
  }
  const result = { n: samples.length, p50: percentile(samples, 50), p95: percentile(samples, 95), max: Math.max(...samples) };
  fs.mkdirSync('.vitest-results', { recursive: true });
  fs.writeFileSync(`.vitest-results/${name}.json`, JSON.stringify(result, null, 2));
  return result;
}

describe('NFR-VAL-2 — valuation latency (PRD §7)', () => {
  it('[NFR-VAL-2.current] 500 measured valuations of the seed’s 500-entry collection: p95 ≤ 1,500 ms', async () => {
    await seedMarketplace(db);
    const val = valuation();
    // Given: the collection is the seed's 500 entries, 480 of them priced.
    const first = await val.valueCollection(big);
    expect(first.valuedCount + first.notValued.length).toBe(500);
    expect(first.valuedCount).toBe(480);
    const result = await measure('nfr-val-2-current', () => val.valueCollection(big));
    expect(result.p95).toBeLessThanOrEqual(1_500);
  }, 300_000);

  it('[NFR-VAL-2.trend] 500 measured reads of the current value plus the 30-day trend of the 500-entry collection: p95 ≤ 1,500 ms', async () => {
    await seedMarketplace(db);
    const val = valuation();
    // Given: the seed's history reaches 90 days back, so the 30-day trend has a baseline.
    expect((await val.valuationTrend({ ...big, period: 30 })).changePercentHundredths).not.toBeNull();
    const result = await measure('nfr-val-2-trend', async () => {
      await val.valueCollection(big);
      await val.valuationTrend({ ...big, period: 30 });
    });
    expect(result.p95).toBeLessThanOrEqual(1_500);
  }, 600_000);

  it('[NFR-VAL-2.history] 500 measured 365-day histories of the 500-entry collection: p95 ≤ 2,500 ms', async () => {
    await seedMarketplace(db);
    const val = valuation();
    // Given: the collection dated a year back, so the series has the full 365 points (the worst case of the threshold).
    await db.query(`UPDATE "CollectionEntry" SET "acquiredAt" = '2025-01-01' WHERE "collectionId" = $1`, [big.collectionId]);
    expect((await val.valuationHistory({ ...big, days: 365 })).points).toHaveLength(365);
    const result = await measure('nfr-val-2-history', () => val.valuationHistory({ ...big, days: 365 }));
    expect(result.p95).toBeLessThanOrEqual(2_500);
  }, 600_000);
});
