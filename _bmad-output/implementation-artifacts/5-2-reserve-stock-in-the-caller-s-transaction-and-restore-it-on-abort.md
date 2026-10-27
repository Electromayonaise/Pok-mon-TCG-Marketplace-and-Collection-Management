---
title: "Story 5.2: Reserve stock in the caller's transaction and restore it on abort"
type: 'feature'
created: '2026-10-27'
status: 'ready-for-dev'
baseline_commit: 'ab3430b'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `reserveForPurchase`, `releaseReservation`, `getListingForPurchase` and `getInventoryUnitIds` throw `NotImplementedError`. The 9 bound tests are red, and Annex A's MEC for R-05 (the last unit sold twice) is unproven. ORD (Epic 7) and TRD (Epic 10) cannot reserve.

**Approach:** INV-1 and S-FR-INV-5 as AD-INV-2 states them:
- both take the caller's `tx` first and never open a transaction;
- the listing checks run in the PRD order;
- the stock moves only through one conditional `UPDATE … WHERE quantity >= :req` per unit, in ascending id order, so the caller's rollback is the only undo.

The two offered ports read on the ambient transaction (AD-SYS-4 rule 9). It adds the `[NFR-INV-4.reserve]` and `[NFR-INV-4.bundle]` benchmarks.

## Boundaries & Constraints

**Always:**
- **reserveForPurchase(tx, { listingId, qty, buyerId }):**
  - `qty` an integer ≥ 1, else `UnexpectedError` before any SQL (AD-INV-2 rule 3).
  - One read in `tx` of the listing, its units and each unit's `perBundleQty`, and the seller's projection row (no lock; reserves never lock the projection, AD-SYS-4 rule 5).
  - **Checks, first-fail:**
    - P2 not found, hidden, withdrawn or deactivated → `ListingNotFound` (404), citing `{ rule: 'FR-INV-3', inputs: { visible: false } }`, with no listing id (S-2);
    - P3 an individual listing → `NotBusinessListing` (409);
    - P4 `identity.getSellerVerification` is not `Approved` → `ListingNotPurchasable` citing `reasonCode: 'ListingUnverified'`. Otherwise, a set `pausedAt`, or a projection that is absent or `paused`, → `ListingNotPurchasable` citing `reasonCode: 'ListingPausedBalanceExhausted'`. Treating an absent projection as paused is AD-3 and AD-INV-3 rule 3, and `[INV-3.I2]` requires it.
  - **Q1:** for each unit in ascending id order, `UPDATE "InventoryUnit" SET quantity = quantity − $req, "updatedAt" = $now WHERE id = $u AND quantity >= $req RETURNING quantity`. `req` is `qty` for a single listing and `perBundleQty × qty` per component. If 0 rows change, the unit's quantity is read and `InsufficientQuantity` (409) cites `{ requested: req, available }` (P5).
  - **Q2:** one `SELECT` in `tx` gives `exhaustedListingIds`: every listing, single or bundle, on a decremented unit whose availability is now 0. The snapshot is `{ title, itemRef, condition, unitPriceCop, components }`. A single listing's title is the catalog entry's name, from `catalog.getEntries`. A bundle's title is its own, and it carries its components.
  - **Q3:** nothing but `"InventoryUnit"` is written: no event, no audit, no reservation row (NFR-INV-3).
  - Every refusal cites `FR-INV-3`.
- **releaseReservation(tx, { reservationRef }):** increments each unit by its `qty`, in ascending id order. A unit that does not exist (0 rows) throws `UnexpectedError` with "Unexpected" in its message, and `tx` rolls back the increments already made. It returns `{ releasedUnits }`, the sum of the quantities released.
- **getListingForPurchase({ listingId }):** a visible listing → `{ sellerId, kind, visible: true }`; else `ListingNotFound`. It reads on the ambient transaction when one is open.
- **getInventoryUnitIds({ listingId }):** the unit of a single listing, or the units of a bundle's components. An unknown id gives `[]`. It reads on the ambient transaction.
- **CAT's batch ports read on the ambient transaction.** `getEntries` and `resolveItemRefs` read on the caller's open transaction, as identity's ports do (AD-SYS-4 rule 9). Today they open their own. A reserve calls `getEntries` inside the order's transaction.
- **The MEC** (`[INV-1.MEC]`) runs its 100 repetitions against Postgres. Its runtime goes in this file (TG-7).
- **Benchmarks:** `[NFR-INV-4.reserve]` (a single listing, p95 ≤ 150 ms) and `[NFR-INV-4.bundle]` (a 20-component bundle, p95 ≤ 300 ms) join `inv4_latency.test.ts`. Each call reserves inside a transaction that is then rolled back, so the stock never runs out. Both are bound to this story.

**Ask First:** any write besides `"InventoryUnit"` in a reserve; a lock on the projection; any DTO or bound-test change.

**Never:** a transaction opened by a `tx`-taking method (`tezg/no-nested-tx`); a compensating write; SERIALIZABLE.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reserve 2 of 5 | funded, Approved | unit 3; ref, snapshot `45 000` | N/A |
| 50 race for 1 | unit of 1 | 1 success, stock 0 | 49 × `InsufficientQuantity` |
| Bundle vs single | shared last unit | 1 winner, no deadlock | `InsufficientQuantity` |
| Abort after reserve ×100 | unit of 3 | always 3 | the caller's error |
| Release a ghost unit | `[uchar +1, ghost +1]` | `uchar` unchanged | `Unexpected` |
| Purchase port, hidden | — | — | `ListingNotFound` |
| Units of a bundle | 3 components | 3 ids | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/listings/domain/inv.ts` -- `purchasable`, `availability`, the reserve plan (sorted units, `req`)
- `src/modules/listings/ports/inv.v2.ts` + `infra/pg.ts` -- `readListingForReserve`, `decrementUnit`, `incrementUnit`, `unitQuantity`, `exhaustedListingIds`, `readVisibleListing`, `listingUnitIds`
- `src/modules/listings/application/inv.v2.ts` -- the four operations
- `src/modules/catalog/application/cat.v2.ts` -- ambient reads in `getEntries` and `resolveItemRefs`
- `_bmad-output/test-artifacts/nfr/inv4_latency.test.ts` -- `[NFR-INV-4.reserve]`, `[NFR-INV-4.bundle]`

## Tasks & Acceptance

**Execution:**
- [ ] domain predicates and the reserve plan + unit tests
- [ ] the repository methods and the four operations
- [ ] CAT ambient reads
- [ ] the two benchmarks, their bindings, `gen:epics:solu2`
- [ ] `sprint-status.yaml` -- 5.2 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 5.2 `done`, when the 9 bound tests run, then they pass. The early greens of 5.4 (`[INV-1.P2]`–`[INV-1.P5]`) and of 5.5 (`[INV-3.I2]`) are restored by the 5.4 and 5.5 commits (decision #23).

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/inv_contracts.test.ts -t "INV-1"` -- expected: the INV-1 tests pass
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/inv_supporting.test.ts -t "S-FR-INV-5|P-INV.purchase|P-INV.units"` -- expected: pass

## Implementation Notes

- Code review is batched with the rest of Epic 5 at its close (decision #22).
