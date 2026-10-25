# test-support/fixtures — the Reference Seed Profile

The PRD §3 Reference Seed Profile (`docs/plan-2/planning/prd.md` §3) is the data every realistic test and every NFR benchmark runs on. It is generated, not stored: `seedMarketplace(db)` writes it into the test file's own database, deterministically (fixed ids, every instant relative to `T0 = 2026-10-01T15:00:00Z`, no randomness).

```ts
import { useTestDatabase } from '../../test-support/db.js';
import { seedMarketplace } from '../../test-support/fixtures/index.js';

const db = useTestDatabase();
const counts = await seedMarketplace(db); // { catalogEntries: 10_000, users: 300, listings: 1_500, … }
```

| Dimension | Count |
|---|---|
| Catalog | 10,000 entries in 50 sets over 5 eras; 2,000 with ≥ 90 days of prices, 300 never priced |
| FX | 87 daily USD/COP rates (90 days less a weekend and one missing business day) |
| Accounts | 300 users: 3 admins, 60 individual sellers, 14 businesses, 5 unverified e-mails |
| Listings | 1,500 (≈ 1,000 individual), 60 bundles, 120 sealed, 40 shared units, 25 hidden, 10 withdrawn, 5 bad locations |
| Orders | 200, of which 10 unpaid past their expiry |
| Commission | 8 accounts, 6 funded, one at zero and one negative |
| Trades | 50 offers; 3 last-unit listings with competing open offers |
| Collections | 300 across 120 users; one of 500 entries with 20 link-added; 150 wishlist entries |
| Reviews | 400, 15 hidden |

`scale` multiplies the catalog and its priced subset (the dimensions the discovery and valuation benchmarks grow). The generator lives in `test-support/solu2/seed-marketplace.ts` (Story 1.4), and `docs/solu-2/test/fixtures/seed_marketplace.test.ts` proves the counts above.
