// NFR benchmark — ORD-1 createOrder p95 ≤ 800 ms at N = 1, including the reservation (NFR-ORD-2;
// contracts.md §6). PRD §7 protocol: Docker Postgres, the §3 seed, 50 warm-up and 500 measured
// calls, server-side handler time. RED until ORD-1 and INV-1 are implemented: the first warm-up
// call throws NotImplementedError. The services are composed as the composition root binds them
// (no fakes), so the measured path is the real one.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CatServiceV2 } from '../../../src/modules/catalog/index.js';
import { IdnServiceV2, VerServiceV2 } from '../../../src/modules/identity/index.js';
import { InvServiceV2 } from '../../../src/modules/listings/index.js';
import { OrdServiceV2 } from '../../../src/modules/orders/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../../src/shared-kernel/external.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { fake, wiring } from '../../../test-support/solu2/fixtures.js';
import { buyerId, businessId, seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
import { percentile } from '../../../test-support/solu2/bench.js';

const db = useTestDatabase();

describe('NFR-ORD-2 — createOrder latency (PRD §7)', () => {
  it('[NFR-ORD-2.p95] 500 measured createOrder calls on the §3 seed: p95 ≤ 800 ms', async () => {
    await seedMarketplace(db);
    const funded = [0, 1, 2, 3, 4, 5].map(businessId);
    // Given: enough stock that no measured call is refused for quantity.
    await db.query(`UPDATE "InventoryUnit" SET quantity = 999 WHERE "sellerId" = ANY($1)`, [funded]);
    const listings = (await db.query<{ id: string }>(
      `SELECT l.id FROM "Listing" l WHERE l."sellerId" = ANY($1) AND l.kind = 'single' AND l."hiddenAt" IS NULL AND l."withdrawnAt" IS NULL ORDER BY l.id`, [funded])).map((r) => r.id);

    const w = wiring(db);
    const idn = new IdnServiceV2(w);
    const cat = new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });
    const inv = new InvServiceV2({ ...w, catalog: cat, identity: idn });
    const ord = new OrdServiceV2({ ...w, listings: inv, identity: new VerServiceV2(w) });

    const call = (k: number) => ord.createOrder({ listingId: listings[k % listings.length]!, qty: 1, buyerId: buyerId(5 + (k % 218)) });
    for (let k = 0; k < 50; k++) await call(k);
    const samples: number[] = [];
    for (let k = 50; k < 550; k++) {
      const start = performance.now();
      await call(k);
      samples.push(performance.now() - start);
    }
    const result = { n: samples.length, p50: percentile(samples, 50), p95: percentile(samples, 95), max: Math.max(...samples) };
    fs.mkdirSync('.vitest-results', { recursive: true });
    fs.writeFileSync('.vitest-results/nfr-ord-2.json', JSON.stringify(result, null, 2));
    expect(result.p95).toBeLessThanOrEqual(800);
  }, 300_000);
});
