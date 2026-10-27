// NFR benchmark — the catalog reads (NFR-CAT-1; contracts.md §3 CAT-3, §15 S-FR-CAT-1): the price
// provenance of 48 entries p95 ≤ 300 ms, and a browse over the 10,000-entry catalog p95 ≤ 1,000 ms.
// PRD §7 protocol: Postgres 16, the §3 seed (10,000 entries, 2,000 of them with 90 days of
// observations), 50 warm-up and 500 measured calls, server-side handler time. The services are
// composed as the composition root binds them (no fakes). Each test stays red for the right reason
// until its story is done: the first warm-up call throws NotImplementedError.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CatServiceV2 } from '../../../src/modules/catalog/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../../src/shared-kernel/external.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { fake, wiring } from '../../../test-support/solu2/fixtures.js';
import { catalogLayout, seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
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

const catalog = () => new CatServiceV2({ ...wiring(db), feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });

describe('NFR-CAT-1 — catalog read latency (PRD §7)', () => {
  it('[NFR-CAT-1.provenance] 500 measured getPriceProvenance calls for 48 priced entries over 30 days: p95 ≤ 300 ms', async () => {
    await seedMarketplace(db);
    const ids = (await db.query<{ id: string }>(
      `SELECT DISTINCT "catalogEntryId" AS id FROM "ReferencePriceObservation" o JOIN "CatalogEntry" c ON c.id = o."catalogEntryId" WHERE c.kind = 'card' ORDER BY 1`,
    )).map((r) => r.id);
    expect(ids.length).toBeGreaterThanOrEqual(catalogLayout().priced);
    const cat = catalog();
    const result = await measure('nfr-cat-1-provenance.json', (k) => {
      const from = (k * 48) % (ids.length - 48);
      return cat.getPriceProvenance({ catalogEntryIds: ids.slice(from, from + 48), period: 30 });
    });
    expect(result.p95).toBeLessThanOrEqual(300);
  }, 300_000);

  it('[NFR-CAT-1.browse] 500 measured browseCatalog calls over the 10,000-entry catalog: p95 ≤ 1,000 ms', async () => {
    await seedMarketplace(db);
    const sets = (await db.query<{ id: string }>(`SELECT id FROM "CatalogSet" ORDER BY id`)).map((r) => r.id);
    const cat = catalog();
    const result = await measure('nfr-cat-1-browse.json', (k) => {
      const filters = k % 3 === 0 ? {} : k % 3 === 1 ? { setIds: [sets[k % sets.length]!] } : { nameQuery: `carta ${k % 90}` };
      return cat.browseCatalog({ filters, page: 1 + (k % 5), pageSize: 24 });
    });
    expect(result.p95).toBeLessThanOrEqual(1_000);
  }, 300_000);
});
