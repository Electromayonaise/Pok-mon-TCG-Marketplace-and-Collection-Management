---
title: 'Story 5.1: List a card and share one stock pool'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'ab3430b'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `createListing` throws `NotImplementedError`, so the 5 bound tests are red, no seller can list, and every later INV, DSC, ORD and TRD story has no listing to read.

**Approach:** INV-2 as written in contracts.md §5:
- the checks P1–P5, first-fail, before any write;
- one transaction that resolves the one `"InventoryUnit"` of `(sellerId, catalogEntryId, condition)` with `ON CONFLICT DO NOTHING`, reads the commission projection `FOR SHARE` for a business, and inserts the `"Listing"`, paused when the projection is absent or paused (fail-closed, AD-INV-3 rule 3);
- an audit row, no event.

It adds `PgInvRepository` to the one repository (R-14), in `wiring()` and in `compose()`, wires `inventory.create`, and adds the `[NFR-INV-4.create]` benchmark.

## Boundaries & Constraints

**Always:**
- **Checks, in order (first-fail, zero writes on any refusal):**
  - P1 `identity.requireListingEligibility({ userId: sellerId })`. Its refusals (`IndividualSellerProfileIncomplete`, `SellerNotVerified`) propagate unchanged (AD-11).
  - P2 `openToTrade` with `listingKind = 'business'` → `OpenToTradeNotAllowed` (409), citing `AD-4`.
  - P3 `catalog.resolveItemRefs({ refs: [itemRef] })`: a missing ref, or a kind that does not match the condition (`Sealed` ⇔ `sealedProduct`) → `InvalidItemRef` (400), citing `{ itemRef, kind }`.
  - P4 `priceCop` an integer in 1,000–100,000,000 → else `InvalidPrice` (400).
  - P5 a non-null `location` inside `COLOMBIA_BBOX` and not (0, 0) → else `InvalidLocation` (400).
  - `quantity` (an integer 1–999) and `description` (≤ 1,000 code points) are the parser's; the service repeats them through `rejectRequest` for in-process callers.
- **The transaction (Clock read once):**
  1. `INSERT "InventoryUnit" … ON CONFLICT ("sellerId", "catalogEntryId", condition) DO NOTHING RETURNING id`, then a select of the unit. An existing unit is linked unchanged, and `quantity` is ignored (FR-INV-1 rule 3).
  2. For a business: `SELECT paused FROM "SellerCommissionState" WHERE "businessId" = $1 FOR SHARE`.
  3. `INSERT "Listing"` (`kind = 'single'`, `title = null`, `"sellerKindAtCreation"` = the eligibility's `listingKind`), with `"pausedAt" = now` when the projection row is absent or `paused`.
  4. `audit('listings.listing.created', Listing:id)`, actor `user`.
- **The answer:**
  - `state`: `Paused` when `pausedAt` is set; else `Unverified` for a business that is not verified; else `Active`. `availability` is the unit's `quantity`.
  - The decision's first citation is `{ rule: 'FR-INV-7', inputs: { verification, projection } }`. `verification` is `Approved` or `Pending` for a business and `none` for an individual. `projection` is `absent`, `paused` or `funded` for a business and `null` for an individual.
  - The decision itself: `paused` with `ListingPausedBalanceExhausted`, `allowedWithNotice` with `ListingUnverified`, or `allowed` with `ListingActive`.
  - When the unit already existed, a second citation is `{ rule: 'FR-INV-1', inputs: { inventoryUnitId, existingQuantity, ignoredQuantity } }`.
- **§13:** `ListingActive` and `ListingPausedBalanceExhausted` join as stored-only rows, with no placeholders (decision #16). Then run `node scripts/gen-solu2-api.mjs`.
- **A `null` location stores no coordinates.** INV has no port to the seller's meeting point (see the Ask First decision below).
- `inventory.create` is wired (authed; `sellerId` is the session's user), with HTTP cases.
- `[NFR-INV-4.create]`: a benchmark in `_bmad-output/test-artifacts/nfr/inv4_latency.test.ts`, composing the real services. It checks that 500 measured `createListing` calls have p95 ≤ 800 ms, and is bound to this story in `epics.source.mjs`.

**Ask First:** a fallback to the individual seller's meeting point for a `null` location (it needs an identity port that INV does not have); any DTO or bound-test change.

**Never:** a read of a `catalog` or `identity` table (AD-1, AD-8); a stored availability; an event.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First listing | individual, no unit, qty 3 | unit of 3, `Active`, availability 3, one audit row | N/A |
| Same copy again | unit of 1, qty 5, price 50,000 | same unit, availability 1, FR-INV-1 cites `ignoredQuantity: 5` | N/A |
| Approved, no projection | business Approved | `Paused`, `projection: 'absent'` | N/A |
| Pending, funded | business Pending, projection funded | `Unverified`, `ListingUnverified` | N/A |
| 50 concurrent | same copy | 1 unit, 50 listings | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/listings/domain/inv.ts` -- the location, price and condition checks; the listing state
- `src/modules/listings/ports/inv.v2.ts` + `infra/pg.ts` -- `PgInvRepository`: `resolveUnit`, `readProjectionForShare`, `insertListing`
- `src/modules/listings/application/inv.v2.ts` -- `createListing`
- `src/modules/listings/index.ts` -- exports `PgInvRepository`
- `test-support/solu2/fixtures.ts` -- `wiring()` adds `PgInvRepository`
- `src/server/composition.ts` + `.test.ts` -- composes `InvServiceV2`; `inventory.create`
- `_bmad-output/planning-artifacts/detailed-design/contracts.md` §13 -- two stored-only rows
- `_bmad-output/test-artifacts/nfr/inv4_latency.test.ts` -- `[NFR-INV-4.create]`

## Tasks & Acceptance

**Execution:**
- [x] domain checks + unit tests
- [x] `PgInvRepository` + `createListing`
- [x] §13 rows, generator, `wiring()`, `compose()`, `inventory.create` with HTTP cases
- [x] `[NFR-INV-4.create]`, binding in `epics.source.mjs`, `gen:epics:solu2`
- [x] `sprint-status.yaml` -- `epic-5: in-progress`, 5.1 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 5.1 `done`, when the 5 bound tests run, then they pass, and the early greens of 5.3 are restored by the next commit (decision #23).

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/inv_contracts.test.ts -t "INV-2"` -- expected: the INV-2 tests pass
- `npx tsc --noEmit` -- expected: clean

## Implementation Notes

- Code review is batched with the rest of Epic 5 at its close (decision #22).
- Martín approved the six Epic 5 specs together, with these choices:
  - **A `null` location stores no coordinates.** INV has no port to the individual seller's meeting point, and the ATDD identity fake provides only the two methods it calls. The PRD's default to the meeting point goes to `deferred-work.md`, for Epic 6 (DSC), its first consumer.
  - **NFR-INV-4:** `[NFR-INV-4.create]` is bound to this story; the reserve and bundle halves are bound to 5.2.
- The checks of P2–P5 run before the transaction, after eligibility. They prove Story 5.3's tests, so its 5 tests are early greens at this commit (decision #23), and the 5.3 commit restores the gate.
- The decision's first citation is `FR-INV-7` with `{ verification, projection }`. For an individual seller, `verification` is `none` and `projection` is `null`.
- `test-support/db.ts`: the per-file pool gets an `error` listener. After `[INV-2.R1]` fills the pool with 50 clients, `DROP DATABASE … WITH (FORCE)` in `afterAll` sometimes reached a client that was still closing. The `57P01` it got surfaced as an uncaught error, intermittently, though every test passed.
- `[NFR-INV-4.create]`: p95 4.3 ms, p50 2.1 ms (threshold 800 ms), on the §3 seed with the real identity and catalog.

### Review Findings

Epic 5 close review (2026-10-27, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `ab3430b..4485962` (code paths). Totals for the epic: 2 decisions, 10 patches, 2 deferrals, 17 dismissed. Martín resolved both decisions with the recommendation and approved every patch (decision log Impl-1 #30).

- [x] [Review][Patch] The test pool's `error` listener swallows every idle-client error, not only the `57P01` of the forced drop [test-support/db.ts:48]
- [x] [Review][Defer] An Approved business with no projection row has nothing for `FOR SHARE` to lock. A first `Replenished` that commits between the read and the listing insert leaves the new listing paused until the next commission event [src/modules/listings/application/inv.v2.ts:createListing] — deferred, an AD-INV-3 rule 3 design gap (a missing row cannot be locked)
