// NFR benchmark — NFR-IDN-1: `getCapabilities`, `requireListingEligibility` and `getSellerKinds` (500 ids, the
// interface maximum) each answer in p95 ≤ 50 ms at N = 1, because they run inside other modules' request paths
// (contracts.md IDN-2 latency budget, PRD NFR-IDN-1). PRD §7 protocol: Postgres, the §3 seed's 300 accounts, 50 warm-up
// and 500 measured calls, server-side service time. Owner: the Impl-2 test hardening (decision log Impl-1 #39 R3,
// deferred-work.md); bound to Stories 2.3 and 2.5, which own the three reads.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IdnServiceV2 } from '../../../src/modules/identity/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { id, user, wiring } from '../../../test-support/solu2/fixtures.js';
import { buyerId, businessId, individualId, seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
import { percentile } from '../../../test-support/solu2/bench.js';

const db = useTestDatabase();

/** The §3 seed's accounts: 60 individual sellers, 14 businesses, 223 buyers and 3 admins (300). */
const SELLERS = [...Array.from({ length: 60 }, (_, k) => individualId(k)), ...Array.from({ length: 14 }, (_, k) => businessId(k))];
const ACCOUNTS = [...SELLERS, ...Array.from({ length: 223 }, (_, k) => buyerId(k)), id('admin'), id('admin2'), id('admin3')];
/** Sellers who may list: the 60 complete individual profiles and the 8 Approved and 3 Pending businesses (biz0–biz10). */
const ELIGIBLE = SELLERS.slice(0, 60 + 11);

/** 50 warm-up calls, then 500 measured ones; the summary is written for nfr-evidence.md. */
async function measure(name: string, call: (k: number) => Promise<unknown>) {
  for (let k = 0; k < 50; k++) await call(k);
  const samples: number[] = [];
  for (let k = 0; k < 500; k++) {
    const start = performance.now();
    await call(k);
    samples.push(performance.now() - start);
  }
  const result = { n: samples.length, p50: percentile(samples, 50), p95: percentile(samples, 95), max: Math.max(...samples) };
  fs.mkdirSync('.vitest-results', { recursive: true });
  fs.writeFileSync(`.vitest-results/${name}.json`, JSON.stringify(result, null, 2));
  return result;
}

describe('NFR-IDN-1 — capability, eligibility and seller-kind reads (PRD §7)', () => {
  it('[NFR-IDN-1.capabilities] 500 measured getCapabilities calls over the seed’s 300 accounts in turn: p95 ≤ 50 ms', async () => {
    await seedMarketplace(db);
    const idn = new IdnServiceV2(wiring(db));
    // Given: the seed's kinds answer as seeded, an Approved business and a buyer with no track.
    expect((await idn.getCapabilities({ userId: businessId(0) })).sellerKind).toBe('business');
    expect((await idn.getCapabilities({ userId: buyerId(10) })).sellerKind).toBe('none');
    const result = await measure('nfr-idn-1-capabilities', (k) => idn.getCapabilities({ userId: ACCOUNTS[k % ACCOUNTS.length]! }));
    expect(result.p95).toBeLessThanOrEqual(50);
  }, 300_000);

  it('[NFR-IDN-1.eligibility] 500 measured requireListingEligibility calls over the seed’s 71 sellers who may list: p95 ≤ 50 ms', async () => {
    await seedMarketplace(db);
    const idn = new IdnServiceV2(wiring(db));
    // Given: an individual lists as an individual, an Approved business as a verified one.
    expect((await idn.requireListingEligibility({ userId: individualId(0) })).listingKind).toBe('individual');
    expect((await idn.requireListingEligibility({ userId: businessId(1) })).verified).toBe(true);
    const result = await measure('nfr-idn-1-eligibility', (k) => idn.requireListingEligibility({ userId: ELIGIBLE[k % ELIGIBLE.length]! }));
    expect(result.p95).toBeLessThanOrEqual(50);
  }, 300_000);

  it('[NFR-IDN-1.sellerKinds] 500 measured getSellerKinds calls of 500 known ids (the interface maximum): p95 ≤ 50 ms', async () => {
    await seedMarketplace(db);
    // Given: the seed's 300 accounts and 200 more buyers, so every one of the 500 ids answers a row.
    for (let k = 0; k < 200; k++) await user(db, { id: id(`kinds${k}`) });
    const userIds = [...ACCOUNTS, ...Array.from({ length: 200 }, (_, k) => id(`kinds${k}`))];
    expect(new Set(userIds).size).toBe(500);
    const idn = new IdnServiceV2(wiring(db));
    const { sellers } = await idn.getSellerKinds({ userIds });
    expect(sellers).toHaveLength(500);
    expect(sellers.filter((s) => s.sellerKind === 'business' && s.verified)).toHaveLength(8);
    const result = await measure('nfr-idn-1-seller-kinds', () => idn.getSellerKinds({ userIds }));
    expect(result.p95).toBeLessThanOrEqual(50);
  }, 300_000);
});
