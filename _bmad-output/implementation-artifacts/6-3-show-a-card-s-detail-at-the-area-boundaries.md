---
title: 'Story 6.3: Show a card''s detail at the area boundaries'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'e143f13'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `getCardDetail` throws `NotImplementedError`, so the 3 bound tests are red, and the card page cannot show a card with its nearby listings and its prices (R-04, P0: a boundary listing must never be lost).

**Approach:** DSC-2 as written in contracts.md §4: `catalog.getEntry` first, then the area check, then DSC-1's statement restricted to the entry, `catalog.getPriceProvenance([id], 30)` and one `identity.getSellerKinds`. `discovery.cardDetail` is wired.

## Boundaries & Constraints

**Always:**
- **Order:** P1 `catalog.getEntry({ catalogEntryId })`; `CatalogEntryNotFound` (404) propagates unchanged and nothing else is called. P2 `assertSearchArea(area)` when `area` is non-null.
- **Exactly three neighbour calls** (Q1, AD-DSC-2 rule 1): `getEntry`, `getPriceProvenance({ catalogEntryIds: [id], period: 30 })` and `getSellerKinds` (called even with no seller, so the count is fixed).
- **The listings:** DSC-1's builder with `ids = [catalogEntryId]`, sold-out excluded, at most 100 rows, the same rows and explanations as DSC-1 (`ListingRanked`). `excluded.unusableLocation` counts the entry's unusable locations (`d ≤ radiusKm + 1e-6` inclusive).
- **Prices stay separate (FR-CAT-6, AD-SYS-7):** `listingPriceCop` is the minimum `priceCop` of the returned listings or `null`; `provenance` is CAT-3's item unchanged; neither is derived from the other. `hasActiveListings = listings.length > 0`.
- **Missing data is not an error:** an entry with no listing in the area returns `{ entry, provenance, listingPriceCop: null, hasActiveListings: false, listings: [] }`.
- HTTP cases for `discovery.cardDetail` in `composition.test.ts`. Record the `[DSC-2.MEC]` runtime here (TG-7).

**Ask First:** any DTO or bound-test change.

**Never:** `catalog` calling `listings` (AD-1); summing or averaging the prices; any write.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Two listings | 45,000 at 1 km, 40,000 at 2 km | 3 calls; `listingPriceCop` 40,000 | N/A |
| Boundary 15 | 15.0000 km, 15.0002 km, 4.99 km, null | `[4.99, 15.0000]`, unusable 1 | N/A |
| Boundary 5 | same, radius 5 | `[4.99]` | N/A |
| All outside | one at 100 km | entry, null price, `[]` | N/A |
| Unknown | ghost id | — | `CatalogEntryNotFound` 404, 1 call |

</frozen-after-approval>

## Code Map

- `src/modules/listings/application/dsc.v2.ts` -- `getCardDetail`
- `src/server/composition.ts` (+ test) -- `discovery.cardDetail`

## Tasks & Acceptance

**Execution:**
- [x] `getCardDetail` over 6.2's builder
- [x] `discovery.cardDetail` with HTTP cases
- [x] `sprint-status.yaml` -- 6.3 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 6.3 `done`, when `[DSC-2.Q1]`, `[DSC-2.MEC]` and `[DSC-2.MEC2]` run, then they pass; Story 6.4's `[DSC-2.P1]` is an early green, restored by the next commit (decision #23).

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/dsc_contracts.test.ts -t "DSC-2"` -- expected: the DSC-2 tests pass

## Implementation Notes

- Code review is batched with the rest of Epic 6 at its close (decision #22).
- `getCardDetail` reuses 6.2's builder (`searchListings` with `entryIds = [id]`) and its row mapping, so a card's listings read exactly like search rows, with the same inclusive boundary.
- `getSellerKinds` is called even for an empty page, so the call count is the contract's fixed three; the provenance and the seller kinds run in parallel after the statement.
- A provenance answer without the entry's item is an invariant breach (`Unexpected`), not a fabricated block.
- TG-7: `[DSC-2.MEC]` is one run of both radii over real Postgres connections (the clause has no repetition count): 264 ms; `[DSC-2.MEC2]` 203 ms; `[DSC-2.Q1]` 243 ms (local Postgres 16).
- `[DSC-2.P1]` (Story 6.4) is an early green at this commit (decision #23); the 6.4 commit restores the gate.
