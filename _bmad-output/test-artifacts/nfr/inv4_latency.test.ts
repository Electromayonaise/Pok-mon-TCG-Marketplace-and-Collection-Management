// NFR benchmark — the INV commands (NFR-INV-4; contracts.md §5 INV-1, INV-2): listing creation
// p95 ≤ 800 ms. PRD §7 protocol: Postgres 16, the §3 seed, 50 warm-up and 500 measured calls,
// server-side handler time. The services are composed as the composition root binds them (the real
// identity and catalog, no fakes). Each test stays red for the right reason until its story is done:
// the first warm-up call throws NotImplementedError.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CatServiceV2 } from '../../../src/modules/catalog/index.js';
import { IdnServiceV2 } from '../../../src/modules/identity/index.js';
import { InvServiceV2 } from '../../../src/modules/listings/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../../src/shared-kernel/external.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { fake, wiring } from '../../../test-support/solu2/fixtures.js';
import { businessId, catalogLayout, entryId, individualId, seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
import { percentile } from '../../../test-support/solu2/bench.js';

const db = useTestDatabase();

/** 50 warm-up and 500 measured calls; writes the result next to the other NFR evidence. */
async function measure(file: string, call: (k: number) => Promise<unknown>) {
  for (let k = 0; k < 50; k++) await call(k);
  const samples: number[] = [];
  for (let k = 50; k < 550; k++) {
    const start = performance.now();
    await call(k);
    samples.push(performance.now() - start);
  }
  const result = { n: samples.length, p50: percentile(samples, 50), p95: percentile(samples, 95), max: Math.max(...samples) };
  fs.mkdirSync('.vitest-results', { recursive: true });
  fs.writeFileSync(`.vitest-results/${file}`, JSON.stringify(result, null, 2));
  return result;
}

function inventory() {
  const w = wiring(db);
  const catalog = new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });
  return new InvServiceV2({ ...w, catalog, identity: new IdnServiceV2(w) });
}

describe('NFR-INV-4 — INV command latency (PRD §7)', () => {
  it('[NFR-INV-4.create] 500 measured createListing calls by individual sellers and funded businesses: p95 ≤ 800 ms', async () => {
    await seedMarketplace(db);
    const { sealed } = catalogLayout();
    const inv = inventory();
    // (seller, entry) pairs repeat every 300 calls, so the later calls link a unit an earlier one created (FR-INV-1 rule 3).
    const result = await measure('nfr-inv-4-create.json', (k) => inv.createListing({
      sellerId: k % 2 === 0 ? individualId(k % 60) : businessId(k % 6), itemRef: entryId(sealed + (k % 100)), condition: 'LP',
      priceCop: 40_000 + k, quantity: 2, location: { lat: 4.711, lng: -74.0721 }, description: '', openToTrade: false,
    }));
    expect(result.p95).toBeLessThanOrEqual(800);
  }, 300_000);
});
