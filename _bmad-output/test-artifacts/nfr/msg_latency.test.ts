// NFR benchmark — NFR-MSG-1: contact-message generation p95 ≤ 200 ms, and NFR-MSG-2: send p95 ≤ 500 ms, at N = 1 (contracts.md §9). PRD §7 protocol: Docker Postgres,
// the §3 seed, 50 warm-up and 500 measured calls, server-side service time. The service is composed as the
// composition root binds it (the real identity and catalog, no fakes), so the measured path is the real one.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IdnServiceV2, VerServiceV2 } from '../../../src/modules/identity/index.js';
import { CatServiceV2 } from '../../../src/modules/catalog/index.js';
import { ContactServiceV2 } from '../../../src/modules/listings/index.js';
import { MsgServiceV2 } from '../../../src/modules/messaging/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import type { CatalogFeedSource, FxRateSource } from '../../../src/shared-kernel/external.js';
import { fake, wiring } from '../../../test-support/solu2/fixtures.js';
import { businessId, buyerId, seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
import { percentile } from '../../../test-support/solu2/bench.js';

const db = useTestDatabase();

function messaging() {
  const w = wiring(db);
  const idn = new IdnServiceV2(w);
  const ver = new VerServiceV2(w);
  return new MsgServiceV2({
    ...w,
    identity: { getDisplayNames: (i) => idn.getDisplayNames(i), getBusinessName: (i) => ver.getBusinessName(i), requireMessagingEligibility: (i) => ver.requireMessagingEligibility(i) },
  });
}

function contact() {
  const w = wiring(db);
  return new ContactServiceV2({ ...w, catalog: new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) }), identity: new IdnServiceV2(w) });
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

describe('NFR-MSG — messaging latency (PRD §7)', () => {
  it('[NFR-MSG-2.send] 500 measured sendMessage calls on the §3 seed: p95 ≤ 500 ms', async () => {
    await seedMarketplace(db);
    const msg = messaging();
    // Given: verified buyers 5..54 write to the eight Approved businesses; each pair's first call opens its conversation.
    const result = await measure('nfr-msg-2-send', (k) => msg.sendMessage({
      target: { recipientId: businessId(k % 8) }, body: `¿Tienes la carta ${k}?`, clientMessageId: `bench-${k}`, senderId: buyerId(5 + (k % 50)),
    }));
    expect(result.p95).toBeLessThanOrEqual(500);
  }, 300_000);

  it('[NFR-MSG-1.contact] 500 measured purchase handoffs on the §3 seed: p95 ≤ 200 ms', async () => {
    await seedMarketplace(db);
    const svc = contact();
    // Given: the seed's visible individual singles; each call a verified buyer (≤ 3 calls each, under every limit) and its own IP.
    const listings = (await db.query<{ id: string }>(`SELECT id FROM "Listing" WHERE "sellerKindAtCreation" = 'individual' AND kind = 'single'
      AND "hiddenAt" IS NULL AND "withdrawnAt" IS NULL AND "deactivatedAt" IS NULL ORDER BY id`)).map((r) => r.id);
    expect(listings.length).toBeGreaterThan(50);
    const result = await measure('nfr-msg-1-contact', (k) => svc.generateContactMessage({
      kind: 'purchase', listingId: listings[k % listings.length]!, requesterId: buyerId(5 + (k % 200)), tradeSummary: null, ipHmac: k.toString(16).padStart(64, '0'),
    }));
    expect(result.p95).toBeLessThanOrEqual(200);
  }, 300_000);
});
