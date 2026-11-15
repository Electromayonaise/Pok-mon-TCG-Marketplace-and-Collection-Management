// The k6 load run's Given (Story 13.5, decision log Impl-2 #18): `scripts/nfr-k6.mjs` recreates and migrates the
// database K6_DATABASE_URL names, then runs this one test (Vitest project `k6-seed`), which loads the PRD §3 seed into
// it and proves the seed is the one the latency budgets were set on. The app then serves that database to k6.
import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { seedMarketplace } from '../../../../test-support/solu2/seed-marketplace.js';

const url = process.env.K6_DATABASE_URL;
const pool = new pg.Pool({ connectionString: url, max: 4 });

afterAll(async () => {
  await pool.end();
});

describe('k6 seed — the PRD §3 marketplace in the load database', () => {
  it('loads the seed into the database the app serves, with the counts the reputation and catalog reads are budgeted on', async () => {
    expect(url, 'K6_DATABASE_URL names the load database').toMatch(/^postgres(ql)?:\/\/.+\/tezg_k6$/);
    const db = { query: async <R = Record<string, unknown>>(text: string, params?: readonly unknown[]) => (await pool.query(text, params as unknown[] | undefined)).rows as R[] };
    const seeded = await seedMarketplace(db);
    expect(seeded).toMatchObject({ catalogEntries: 10_000, users: 300, individualSellers: 60, businesses: 14, listings: 1_500, reviews: 400, hiddenReviews: 15 });
    // The 68 reviewed sellers k6 reads (8 businesses and 60 individual sellers) hold the 385 visible reviews.
    const [visible] = await db.query<{ sellers: number; reviews: number }>(
      `SELECT count(DISTINCT "targetUserId")::int AS sellers, count(*)::int AS reviews FROM "Review" WHERE "hiddenAt" IS NULL`,
    );
    expect(visible).toEqual({ sellers: 68, reviews: 385 });
  }, 300_000);
});
