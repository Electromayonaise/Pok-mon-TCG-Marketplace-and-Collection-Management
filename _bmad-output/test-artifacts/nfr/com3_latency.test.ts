// NFR benchmark — NFR-COM-3: the deduction handler p95 ≤ 200 ms and the top-up confirmation p95 ≤
// 800 ms, at N = 1 (contracts.md §7). PRD §7 protocol: Docker Postgres, the §3 seed, 50 warm-up and 500
// measured calls, server-side handler time. The service is composed as the composition root binds it
// (the real identity, no fakes), so the measured path is the real one.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ComServiceV2 } from '../../../src/modules/commission/index.js';
import { IdnServiceV2, VerServiceV2 } from '../../../src/modules/identity/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { at, HOUR, id, wiring } from '../../../test-support/solu2/fixtures.js';
import { businessId, seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
import { percentile } from '../../../test-support/solu2/bench.js';

const db = useTestDatabase();

function commission() {
  const w = wiring(db);
  const idn = new IdnServiceV2(w);
  const ver = new VerServiceV2(w);
  return new ComServiceV2({ ...w, identity: { getCapabilities: (i) => idn.getCapabilities(i), getBusinessName: (i) => ver.getBusinessName(i) } });
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

describe('NFR-COM-3 — commission latency (PRD §7)', () => {
  it('[NFR-COM-3.deduction] 500 measured applyOrderDeduction handler calls on the §3 seed: p95 ≤ 200 ms', async () => {
    await seedMarketplace(db);
    const com = commission();
    // Given: the eight seeded accounts, each call a new order of 45,000 confirmed by the business an hour ago.
    const result = await measure('nfr-com-3-deduction', (k) => db.transactions.run((tx) => com.applyOrderDeduction(tx, {
      type: 'OrderPaymentConfirmedByBusiness', orderId: id(`bench${k}`), businessId: businessId(k % 8), totalCop: 45_000,
      sellerReceivedConfirmedAt: at(-HOUR), buyerItemReceivedConfirmedAt: null,
    })));
    expect(result.p95).toBeLessThanOrEqual(200);
  }, 300_000);
});
