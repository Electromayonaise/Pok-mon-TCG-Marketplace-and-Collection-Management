// NFR benchmark — the admin review path (NFR-VER-3; contracts.md §5): the review queue over 1,000
// Pending applications p95 ≤ 1,000 ms, and the signed-URL read of one application p95 ≤ 300 ms.
// PRD §7 protocol: Docker Postgres, the §3 seed, 50 warm-up and 500 measured calls, server-side
// handler time. The signed-URL figure times the whole getApplicationForReview call (read, access
// log, audit and signing), so it bounds the URL issue from above. The repositories, transactions
// and audit are the composition root's Postgres ones; the object storage is the in-memory test
// double, because the production adapter is not wired yet (deferred-work.md). A provider's own
// signing latency is therefore not in the figure; re-measure when the adapter lands.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VerServiceV2 } from '../../../src/modules/identity/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { id } from '../../../test-support/ids.js';
import { at, business, DAY, ins, wiring } from '../../../test-support/solu2/fixtures.js';
import { seedMarketplace } from '../../../test-support/solu2/seed-marketplace.js';
import { percentile } from '../../../test-support/solu2/bench.js';

const db = useTestDatabase();
const PENDING = 1_000;

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

/** The §3 seed (3 Pending) topped up to 1,000 Pending applications, each with a legal identity. */
async function seedQueue(): Promise<string[]> {
  await seedMarketplace(db);
  const pending = (await db.query<{ id: string }>(`SELECT id FROM "BusinessApplication" WHERE status = 'Pending' ORDER BY id`)).map((r) => r.id);
  for (let k = pending.length; k < PENDING; k++) {
    const applicationId = await business(db, id(`vqbiz${k}`), 'Pending', { applicationId: id(`vqapp${k}`), submittedAt: at(-3 * DAY + k * 1_000) });
    pending.push(applicationId);
  }
  for (const applicationId of pending) {
    await ins(db, 'BusinessApplicationLegalIdentity', { applicationId, type: 'NIT', number: '9001234568', documentKeys: ['ver-documents/doc1', 'ver-documents/doc2'] }, 'created');
  }
  return pending;
}

describe('NFR-VER-3 — review queue and signed-URL latency (PRD §7)', () => {
  it('[NFR-VER-3.queue] 500 measured listReviewQueue calls over 1,000 Pending applications: p95 ≤ 1,000 ms', async () => {
    await seedQueue();
    const ver = new VerServiceV2(wiring(db));
    const result = await measure('nfr-ver-3-queue.json', () => ver.listReviewQueue({ adminId: id('admin'), cursor: null }));
    expect(result.p95).toBeLessThanOrEqual(1_000);
  }, 300_000);

  it('[NFR-VER-3.sign] 500 measured getApplicationForReview calls with two documents: p95 ≤ 300 ms', async () => {
    const pending = await seedQueue();
    const ver = new VerServiceV2(wiring(db));
    const result = await measure('nfr-ver-3-sign.json', (k) => ver.getApplicationForReview({ applicationId: pending[k % pending.length]!, actorId: id('admin') }));
    expect(result.p95).toBeLessThanOrEqual(300);
  }, 300_000);
});
