---
title: 'Story 6.2: Search listings by area with an explained ranking'
type: 'feature'
created: '2026-10-27'
status: 'ready-for-dev'
baseline_commit: 'e143f13'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `search` throws `NotImplementedError`, so the 5 bound tests are red and no buyer can find a listing by area. Two Epic 5 deferrals wait on it: a listing created with `location = null` has no coordinates, and `getAvailabilitySummary` refuses a non-null `area`.

**Approach:** DSC-1 as written in contracts.md §4 and AD-DSC-1/2: the checks P1–P3, **one** SQL statement over `"Listing"`, `"InventoryUnit"`, `"BundleComponent"` and `"SellerCommissionState"`, then one `identity.getSellerKinds` for the page's sellers. A new `PgDscRepository` joins the one repository (R-14), in `wiring()` and `compose()`, and `discovery.search` is wired.

## Boundaries & Constraints

**Always:**
- **Checks (first-fail, before the statement):** P1 `assertSearchArea(area)` when present; P3 `page` an integer 1–417 and `pageSize` 24, through `rejectRequest`; P2 non-empty `catalogFilters` → `catalog.matchEntryIds`, and `tooBroad` → `SearchFilterTooBroad` (400) citing `{ rule: 'FR-DSC-1', inputs: { threshold: 20000 } }`. Empty filters make no call.
- **The statement (one, so one snapshot):**
  - visible (`hiddenAt`, `withdrawnAt`, `deactivatedAt` null), availability ≥ 1 unless `includeSoldOut` (the read-time `AVAILABILITY_SQL`, bundles included);
  - a listing's entries are its unit's entry, or its components' (`catalogEntryIds`); `itemRef = ANY(ids)`, `maxPriceCop`, and `condition` (any of its units) filter;
  - unusable = null, (0, 0) or outside `COLOMBIA_BBOX`, counted over the filtered set with `FILTER`; with an area they are excluded, and the rest pass a bbox prefilter, then `d ≤ radiusKm + 1e-6` with the one haversine expression in double precision;
  - order: sold-out last, then `(d, "priceCop", id)` with an area or `("priceCop", id)` without; `LIMIT 24 OFFSET (page − 1) × 24`.
  - No seller-kind branch in the builder (AD-5). The statement builder is shared with DSC-2 and with `getAvailabilitySummary`'s area filter.
- **Composition:** at most 3 neighbour calls; `getSellerKinds` once, only for a non-empty page. `sellerKind` comes from it (falling back to `sellerKindAtCreation`), `pickupAvailable = sellerKind = 'individual'`, `verified` from it, never stored. `purchasable` is INV's `purchasable()` over the row's facts, with the verification read as `Approved` when `verified`.
- **Explanations (Clock read once):** each row `ranked` with `ListingRanked`, citing `{ rule: 'FR-DSC-5', inputs: { distanceKm, priceCop, rankKey } }` (`rankKey` = the row's 1-based position in the whole result). The response decision: `excluded` with `ListingLocationUnusable` citing `{ rule: 'FR-DSC-3', inputs: { unusableLocation } }` when the count is > 0, else `ranked` with `SearchRanked` citing `FR-DSC-5`. Both new codes and `ListingLocationUnusable` get §13 stored-only rows; then `node scripts/gen-solu2-api.mjs`.
- **Null location (Epic 5 deferral):** IDN-2's response gains an optional `meetingPoint: { lat, lng } | null`, filled for an individual seller. `createListing` stores it when `location` is null, checked by P5 as before; a business with `location = null` still stores none (contracts.md INV-2 P5).
- **Area in `getAvailabilitySummary` (Epic 5 deferral):** `assertSearchArea`, then the same unusable and distance predicates; the `NotImplementedError` and its `inv.v2.test.ts` assertion go.
- **NFR-DSC-1:** `_bmad-output/test-artifacts/nfr/dsc1_latency.test.ts`, with `inv4_latency`'s `measure` and the real identity and catalog. `[NFR-DSC-1.seed]`: 15 km around Bogotá on the §3 seed, p95 ≤ 1,000 ms. `[NFR-DSC-1.scale]`: the §3 seed plus generated listings to 50,000, p95 ≤ 1,500 ms. Both bound to this story in `epics.source.mjs`; refresh the DSC rows of `nfr-evidence.md`.
- A src test: 1,000 deterministic Colombian pairs, SQL distance vs `haversineKm` within 1e-6 km (AD-DSC-1 rule 3); HTTP cases for `discovery.search` in `composition.test.ts`.

**Ask First:** any other DTO or bound-test change; a second statement.

**Never:** a read of a `catalog` or `identity` table (AD-1, AD-8); a cache across requests; a stored `pickupAvailable` or badge; any write, event or audit.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ranked | 2 km, 10 km, 40 km | `[2 km, 10 km]`, each `ranked` FR-DSC-5 | N/A |
| Both kinds | business 1 km, individual 3 km | together; `pickupAvailable` false / true | N/A |
| Hidden | one `hiddenAt` set | absent | N/A |
| No coordinates | one null | `excluded.unusableLocation: 1`, `ListingLocationUnusable` | N/A |
| Too broad | filters → `tooBroad` | — | `SearchFilterTooBroad` 400 |
| 10 concurrent | equal input | byte-identical `results` | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/listings/ports/dsc.v2.ts` + `infra/pg.ts` -- `DscRepository` / `PgDscRepository`: the one statement builder
- `src/modules/listings/application/dsc.v2.ts` -- `search`
- `src/modules/listings/application/inv.v2.ts` + `infra/pg.ts` -- the meeting point at create; the area in `getAvailabilitySummary`
- `src/modules/identity/dto/idn.v2.dto.ts`, `application/idn.v2.ts`, `infra/pg.ts` -- `meetingPoint` on IDN-2
- `test-support/solu2/fixtures.ts`, `src/server/composition.ts` (+ test) -- `PgDscRepository`, `DscServiceV2`, `discovery.search`
- `contracts.md` §13 -- three stored-only rows
- `_bmad-output/test-artifacts/nfr/dsc1_latency.test.ts`, `epics.source.mjs`, `nfr-evidence.md`

## Tasks & Acceptance

**Execution:**
- [ ] repository + `search` + §13 rows + generator
- [ ] `meetingPoint` on IDN-2 and in `createListing`, with a src test
- [ ] the area in `getAvailabilitySummary`, with a src test
- [ ] `wiring()`, `compose()`, `discovery.search` with HTTP cases; the parity test
- [ ] the benchmark, its binding, `gen:epics:solu2`, `nfr-evidence.md`
- [ ] `sprint-status.yaml` -- 6.2 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 6.2 `done`, when the 5 bound tests and the two benchmarks run, then they pass; Story 6.4's `[DSC-1.Q4]` and `[DSC-1.P2]` are early greens, restored by the 6.4 commit (decision #23).

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/dsc_contracts.test.ts -t "DSC-1"` -- expected: the DSC-1 tests pass
- `npx tsc --noEmit` -- expected: clean
