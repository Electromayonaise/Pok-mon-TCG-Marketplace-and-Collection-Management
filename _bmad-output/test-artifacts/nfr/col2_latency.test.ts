// NFR benchmark — NFR-COL-2: a binder page of the seed's 500-entry collection sorted on 3 keys p95 ≤ 800 ms, and a
// 200-card wishlist with its availability p95 ≤ 1,000 ms, at N = 1 (Story 11.5, decision log Impl-2 #17). PRD §7
// protocol: Postgres, the §3 seed (its 500-entry collection: 480 catalog entries, 20 link-added; 1,500 listings), 50
// warm-up and 500 measured calls, server-side service time. COL is composed as the composition root binds it: the real
// catalog, and the real listings with the real identity behind its batch verification read (AD-INV-3 rule 2), so the
// measured path is the real one.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CatServiceV2 } from '../../../src/modules/catalog/index.js';
import { ColServiceV2 } from '../../../src/modules/collections/index.js';
import { IdnServiceV2 } from '../../../src/modules/identity/index.js';
import { InvServiceV2 } from '../../../src/modules/listings/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../../src/shared-kernel/external.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { fake, id, T0, user, wiring } from '../../../test-support/solu2/fixtures.js';
import { individualId, seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
import { percentile } from '../../../test-support/solu2/bench.js';

const db = useTestDatabase();

/** The seed's 500-entry collection and its owner. */
const big = { collectionId: id('col0n0'), ownerId: individualId(0) };

function collections() {
  const w = wiring(db);
  const catalog = new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });
  const listings = new InvServiceV2({ ...w, catalog, identity: new IdnServiceV2(w) });
  return new ColServiceV2({ ...w, catalog, listings });
}

/** 50 warm-up calls, then 500 measured ones; the summary is written for nfr-evidence.md. */
async function measure(name: string, call: () => Promise<unknown>) {
  for (let k = 0; k < 50; k++) await call();
  const samples: number[] = [];
  for (let k = 0; k < 500; k++) {
    const start = performance.now();
    await call();
    samples.push(performance.now() - start);
  }
  const result = { n: samples.length, p50: percentile(samples, 50), p95: percentile(samples, 95), max: Math.max(...samples) };
  fs.mkdirSync('.vitest-results', { recursive: true });
  fs.writeFileSync(`.vitest-results/${name}.json`, JSON.stringify(result, null, 2));
  return result;
}

describe('NFR-COL-2 — binder and wishlist latency (PRD §7)', () => {
  it('[NFR-COL-2.binder] 500 measured binder reads of the seed’s 500-entry collection sorted by set and number, acquisition date and name: p95 ≤ 800 ms', async () => {
    await seedMarketplace(db);
    const col = collections();
    const read = () => col.getBinder({ ...big, sort: ['setNumber', 'acquiredAt', 'name'], setId: null });
    // Given: the whole collection, 480 catalog cards first and the 20 link-added entries last, in the same order each read.
    const first = await read();
    expect(first.entries).toHaveLength(500);
    expect(first.entries.slice(480).every((e) => e.cardKind === 'external')).toBe(true);
    expect((await read()).entries.map((e) => e.entryId)).toEqual(first.entries.map((e) => e.entryId));
    const result = await measure('nfr-col-2-binder', read);
    expect(result.p95).toBeLessThanOrEqual(800);
  }, 300_000);

  it('[NFR-COL-2.wishlist] 500 measured lists of a 200-card wishlist with each card’s availability: p95 ≤ 1,000 ms', async () => {
    await seedMarketplace(db);
    // Given: a collector who wishes for 200 of the seed's listed cards (one availability call of 200 ids).
    await user(db, { id: id('wisher') });
    await db.query(
      `INSERT INTO "WishlistEntry" (id, "ownerId", "catalogEntryId", "maxPriceCop", note, "createdAt", "updatedAt")
       SELECT rpad('wl' || n || 'x', 24, '0'), $1, c, CASE WHEN n % 2 = 0 THEN 50000 END, NULL, $2, $2
         FROM (SELECT c, row_number() OVER (ORDER BY c) AS n FROM (SELECT DISTINCT u."catalogEntryId" AS c FROM "Listing" l JOIN "InventoryUnit" u ON u.id = l."inventoryUnitId" WHERE l.kind = 'single') x) y
        WHERE n <= 200`,
      [id('wisher'), T0],
    );
    const col = collections();
    const list = () => col.listWishlist({ ownerId: id('wisher') });
    const { rows } = await list();
    expect(rows).toHaveLength(200);
    expect(rows.filter((r) => r.availableCount > 0).length).toBeGreaterThan(100);
    const result = await measure('nfr-col-2-wishlist', list);
    expect(result.p95).toBeLessThanOrEqual(1_000);
  }, 300_000);
});
