// NFR benchmark — the INV commands (NFR-INV-4; contracts.md §5 INV-1, INV-2): a reservation p95
// ≤ 150 ms for a single listing and ≤ 300 ms for a 20-component bundle; listing creation p95 ≤ 800 ms. PRD §7 protocol: Postgres 16, the §3 seed, 50 warm-up and 500 measured calls,
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
import { fake, id, ins, listing, unit, wiring } from '../../../test-support/solu2/fixtures.js';
import { businessId, buyerId, catalogLayout, entryId, individualId, seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
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

/** A reserve inside a transaction that is then rolled back, so the stock never runs out; times the reserve call only. */
async function reserveAndAbort(inv: InvServiceV2, listingId: string, k: number): Promise<number> {
  let elapsed = 0;
  await db.transactions.run(async (tx) => {
    const start = performance.now();
    await inv.reserveForPurchase(tx, { listingId, qty: 1, buyerId: buyerId(5 + (k % 218)) });
    elapsed = performance.now() - start;
    throw new Abort();
  }).catch((error: unknown) => { if (!(error instanceof Abort)) throw error; });
  return elapsed;
}
class Abort extends Error {}

/** Like `measure`, for calls that time themselves. */
async function measureTimed(file: string, call: (k: number) => Promise<number>) {
  for (let k = 0; k < 50; k++) await call(k);
  const samples: number[] = [];
  for (let k = 50; k < 550; k++) samples.push(await call(k));
  const result = { n: samples.length, p50: percentile(samples, 50), p95: percentile(samples, 95), max: Math.max(...samples) };
  fs.mkdirSync('.vitest-results', { recursive: true });
  fs.writeFileSync(`.vitest-results/${file}`, JSON.stringify(result, null, 2));
  return result;
}

describe('NFR-INV-4 — INV command latency (PRD §7)', () => {
  it('[NFR-INV-4.reserve] 500 measured reserveForPurchase calls on funded single listings: p95 ≤ 150 ms', async () => {
    await seedMarketplace(db);
    const funded = [0, 1, 2, 3, 4, 5].map(businessId);
    const listings = (await db.query<{ id: string }>(
      `SELECT l.id FROM "Listing" l JOIN "InventoryUnit" u ON u.id = l."inventoryUnitId"
       WHERE l."sellerId" = ANY($1) AND l.kind = 'single' AND l."pausedAt" IS NULL AND l."hiddenAt" IS NULL AND l."withdrawnAt" IS NULL AND l."deactivatedAt" IS NULL AND u.quantity >= 1
       ORDER BY l.id`, [funded])).map((r) => r.id);
    expect(listings.length).toBeGreaterThan(10);
    const inv = inventory();
    const result = await measureTimed('nfr-inv-4-reserve.json', (k) => reserveAndAbort(inv, listings[k % listings.length]!, k));
    expect(result.p95).toBeLessThanOrEqual(150);
  }, 300_000);

  it('[NFR-INV-4.bundle] 500 measured reserveForPurchase calls on a 20-component bundle: p95 ≤ 300 ms', async () => {
    await seedMarketplace(db);
    const { sealed } = catalogLayout();
    const seller = businessId(0);
    await listing(db, { id: id('bench20'), sellerId: seller, kind: 'bundle', title: 'Lote de 20', priceCop: 500_000 });
    for (let c = 0; c < 20; c++) {
      const entry = entryId(sealed + 7_000 + c);
      await unit(db, { id: id(`bu20u${c}`), sellerId: seller, catalogEntryId: entry, condition: 'HP', quantity: 50 });
      await ins(db, 'BundleComponent', { listingId: id('bench20'), inventoryUnitId: id(`bu20u${c}`), sellerId: seller, catalogEntryId: entry, condition: 'HP', perBundleQty: 1 + (c % 2) }, 'created');
    }
    const inv = inventory();
    const result = await measureTimed('nfr-inv-4-bundle.json', (k) => reserveAndAbort(inv, id('bench20'), k));
    expect(result.p95).toBeLessThanOrEqual(300);
  }, 300_000);

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
