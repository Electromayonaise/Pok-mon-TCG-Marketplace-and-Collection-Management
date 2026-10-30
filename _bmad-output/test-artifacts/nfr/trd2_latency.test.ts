// NFR benchmark — NFR-TRD-2: accept p95 ≤ 800 ms, other offer actions p95 ≤ 500 ms, at N = 1 (contracts.md §8). PRD §7 protocol:
// Postgres, the §3 seed, 50 warm-up and 500 measured calls, server-side service time. The service is composed as the
// composition root binds it (the real listings, catalog and identity, no fakes), so the measured path is the real one.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TrdServiceV2 } from '../../../src/modules/trading/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { tradeOffer, wiring } from '../../../test-support/solu2/fixtures.js';
import { buyerId, seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
import { realTradeListings } from '../../../test-support/solu2/services.js';
import { percentile } from '../../../test-support/solu2/bench.js';

const db = useTestDatabase();

function trading() {
  const w = wiring(db);
  return new TrdServiceV2({ ...w, listings: realTradeListings(w) });
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

/** The seed's visible individual listings open to trade, with their sellers. */
async function tradeListings(): Promise<{ id: string; sellerId: string }[]> {
  return db.query<{ id: string; sellerId: string }>(
    `SELECT id, "sellerId" FROM "Listing" WHERE "openToTrade" AND "hiddenAt" IS NULL AND "withdrawnAt" IS NULL AND "deactivatedAt" IS NULL ORDER BY id`,
  );
}

describe('NFR-TRD-2 — trade offer latency (PRD §7)', () => {
  it('[NFR-TRD-2.counter] 500 measured counters on the §3 seed: p95 ≤ 500 ms', async () => {
    await seedMarketplace(db);
    const listings = (await tradeListings()).slice(0, 3);
    // Given: 550 Open offers, one per (listing, buyer), each at the seller's turn and version 0.
    for (let k = 0; k < 550; k++) {
      const l = listings[Math.floor(k / 200)]!;
      await tradeOffer(db, { id: `bench${String(k).padStart(19, '0')}`, listingId: l.id, sellerId: l.sellerId, proposerId: buyerId(k % 200) });
    }
    const trd = trading();
    const result = await measure('nfr-trd-2-counter', (k) => trd.counterOffer({
      offerId: `bench${String(k).padStart(19, '0')}`, terms: { offeredItems: [], cashCop: 30_000 + k, requestedQty: 1 }, expectedVersion: 0, actorId: listings[Math.floor(k / 200)]!.sellerId,
    }));
    expect(result.p95).toBeLessThanOrEqual(500);
  }, 300_000);
});
