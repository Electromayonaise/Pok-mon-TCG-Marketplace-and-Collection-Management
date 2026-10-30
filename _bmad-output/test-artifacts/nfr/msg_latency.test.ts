// NFR benchmark — NFR-MSG-2: send p95 ≤ 500 ms at N = 1 (contracts.md §9). PRD §7 protocol: Docker Postgres,
// the §3 seed, 50 warm-up and 500 measured calls, server-side service time. The service is composed as the
// composition root binds it (the real identity, no fakes), so the measured path is the real one.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IdnServiceV2, VerServiceV2 } from '../../../src/modules/identity/index.js';
import { MsgServiceV2 } from '../../../src/modules/messaging/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { wiring } from '../../../test-support/solu2/fixtures.js';
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
});
