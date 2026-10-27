// NFR benchmark — DSC-1 search (NFR-DSC-1; contracts.md §4): `view=listings` with a 15 km area,
// p95 ≤ 1,000 ms on the §3 seed and p95 ≤ 1,500 ms on a scale seed of 50,000 listings. PRD §7
// protocol: Postgres 16, 50 warm-up and 500 measured calls, server-side handler time. The service is
// composed as the composition root binds it (the real identity and catalog, no fakes). Each test
// stays red for the right reason until its story is done: the first warm-up call throws NotImplementedError.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CatServiceV2 } from '../../../src/modules/catalog/index.js';
import { IdnServiceV2 } from '../../../src/modules/identity/index.js';
import { DscServiceV2 } from '../../../src/modules/listings/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../../src/shared-kernel/external.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { fake, T0, wiring } from '../../../test-support/solu2/fixtures.js';
import { seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
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

function discovery() {
  const w = wiring(db);
  const catalog = new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });
  return new DscServiceV2({ ...w, catalog, identity: new IdnServiceV2(w) });
}

/** Bogotá, and the pages a buyer reads most: the first three. */
const search = (dsc: DscServiceV2, k: number) => dsc.search({ view: 'listings', area: { lat: 4.711, lng: -74.0721, radiusKm: 15 }, page: 1 + (k % 3), pageSize: 24 });

/**
 * The scale seed: copies of the §3 seed's visible singles (same sellers and units, so every
 * constraint holds) until there are `target` listings, spread up to ±0.3° around the four cities.
 */
async function growTo(target: number): Promise<number> {
  const n = (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM "Listing"`))[0]!.n;
  await db.query(
    `WITH base AS (
       SELECT l.*, row_number() OVER (ORDER BY l.id) - 1 AS r, count(*) OVER () AS total FROM "Listing" l
       WHERE l.kind = 'single' AND l."hiddenAt" IS NULL AND l."withdrawnAt" IS NULL AND l."pausedAt" IS NULL AND l.lat IS NOT NULL AND NOT (l.lat = 0 AND l.lng = 0) AND l.lat BETWEEN -4.23 AND 13.39
     ), city(c, lat, lng) AS (VALUES (0, 4.711, -74.0721), (1, 6.2442, -75.5812), (2, 3.4516, -76.532), (3, 10.9685, -74.7813))
     INSERT INTO "Listing" (id, "sellerId", "sellerKindAtCreation", kind, "inventoryUnitId", title, "priceCop", lat, lng, description, "openToTrade", "createdAt", "updatedAt")
     SELECT rpad('scale' || k || 'x', 24, '0'), b."sellerId", b."sellerKindAtCreation", 'single', b."inventoryUnitId", NULL, 5000 + (k * 7919) % 400 * 500,
            city.lat + ((k * 7919) % 1000) / 1000.0 * 0.6 - 0.3, city.lng + ((k * 104729) % 1000) / 1000.0 * 0.6 - 0.3, '', b."openToTrade", $1, $1
     FROM generate_series(0::bigint, $2::bigint - 1) AS k JOIN base b ON b.r = k % b.total JOIN city ON city.c = k % 4`,
    [T0, target - n],
  );
  return (await db.query<{ total: number }>(`SELECT count(*)::int AS total FROM "Listing"`))[0]!.total;
}

describe('NFR-DSC-1 — search latency (PRD §7)', () => {
  it('[NFR-DSC-1.seed] 500 measured 15 km searches around Bogotá on the §3 seed: p95 ≤ 1,000 ms', async () => {
    await seedMarketplace(db);
    const dsc = discovery();
    expect((await search(dsc, 0)).results.length).toBe(24);
    const result = await measure('nfr-dsc-1-seed.json', (k) => search(dsc, k));
    expect(result.p95).toBeLessThanOrEqual(1_000);
  }, 300_000);

  it('[NFR-DSC-1.scale] 500 measured 15 km searches around Bogotá on 50,000 listings: p95 ≤ 1,500 ms', async () => {
    await seedMarketplace(db);
    expect(await growTo(50_000)).toBe(50_000);
    await db.query('ANALYZE "Listing"');
    const dsc = discovery();
    expect((await search(dsc, 0)).results.length).toBe(24);
    const result = await measure('nfr-dsc-1-scale.json', (k) => search(dsc, k));
    expect(result.p95).toBeLessThanOrEqual(1_500);
  }, 600_000);
});
