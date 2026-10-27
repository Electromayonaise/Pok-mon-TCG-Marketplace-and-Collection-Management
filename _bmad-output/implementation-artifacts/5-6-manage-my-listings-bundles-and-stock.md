---
title: 'Story 5.6: Manage my listings, bundles and stock'
type: 'feature'
created: '2026-10-27'
status: 'ready-for-dev'
baseline_commit: 'ab3430b'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ten INV operations throw `NotImplementedError`: bundles, the listing detail and owner list, edit, restock, deactivate and reactivate, and the trade, tradeability, availability and refs ports. The 12 bound tests are red. Sellers cannot manage what they listed, and TRD and COL have no ports to call.

**Approach:** The §15 contracts S-FR-INV-2, -4, -9 and -10, and the §15.11 ports P-INV.trade, .tradeability, .availability and .refs:
- availability is always computed at read from `"InventoryUnit".quantity` (AD-INV-1 rule 2);
- every command checks the owner first and writes conditionally;
- non-owners never learn that a hidden listing exists (S-2).

Wire the eight `inventory.*` seller procedures that remain. `inventory.admin.*` belongs to Story 13.5.

## Boundaries & Constraints

**Always:**
- **createBundle:**
  - The checks are INV-2's P1, P3, P4 and P5.
  - 0 components → `EmptyComponentList` (400). The bounds (1–20 components, `perBundleQty` 1–4, `quantity` 1–999, `title` 1–120) and a repeated `(itemRef, condition)` → `rejectRequest`.
  - A component whose kind is `sealedProduct` → `SealedProductInBundle` (409), citing `{ itemRef }`. A missing ref → `InvalidItemRef`. Both happen before any write (AD-INV-1 rule 5).
  - **The transaction:**
    - each unit is resolved as in INV-2 Q1, in `(itemRef, condition)` order, so two bundles never lock against each other;
    - the projection is read `FOR SHARE`;
    - one `"Listing"` (`kind = 'bundle'`) is inserted, then its `"BundleComponent"` rows;
    - one audit row.
  - Availability = `min(floor(quantity / perBundleQty))`. The decision is INV-2's.
- **getListing({ listingId, actorId }):**
  - **Who sees what:**
    - the owner sees any state with its reason;
    - anyone else sees only a visible listing;
    - a hidden, withdrawn, deactivated or unknown listing is `ListingNotFound` (404), citing `{ rule: 'AD-12', inputs: { visible: false } }`. The bodies are identical apart from `occurredAt`.
  - **State and decision:**
    - `Hidden` → `ListingHidden` (cites `reasonCode`);
    - `Withdrawn` → `ListingWithdrawn`;
    - `Deactivated` → `ListingDeactivated`;
    - `Paused` (a set `pausedAt`, or a business projection that is absent or paused) → `ListingPausedBalanceExhausted`;
    - `Unverified` (a business whose verification is not `Approved`) → `ListingUnverified`;
    - else `Active` → `ListingActive`.
- **listMyListings({ sellerId, cursor }):** every listing of the seller, newest first by `("createdAt", id)`, 25 per page, behind an opaque keyset cursor. It uses two statements, never `OR $1 IS NULL` (the deferred keyset item). A bad cursor → `rejectRequest` on `cursor`.
- **updateListing / restockListing / setListingActive:**
  - **Owner checks:**
    - an unknown listing, or one not visible to a non-owner → `ListingNotFound`;
    - a visible listing of someone else → `ListingNotOwnedByCaller` (403), with zero writes.
  - **update:**
    - `priceCop` → `InvalidPrice` outside 1,000–100,000,000;
    - `openToTrade: true` on a business listing → `OpenToTradeNotAllowed`;
    - `description` ≤ 1,000 code points;
    - empty `changes` → `rejectRequest`;
    - the write is `UPDATE … WHERE version = $expected`, setting `version + 1`.
  - **restock:**
    - `delta` must be a non-zero integer, else `rejectRequest`. A bundle → `rejectRequest` on `listingId`: each card is restocked through its own listing;
    - `+δ` adds; `−δ` is the conditional decrement, and `InsufficientQuantity` cites `{ requested, available }`.
  - **setListingActive:** deactivate sets `deactivatedAt`; reactivate first re-checks IDN-2, whose refusals propagate, then clears it. The listing's state already holding → an explained no-op (`allowedWithNotice`) with no write.
  - Each write bumps `version`, except restock, which writes only the unit, and leaves one audit row.
  - The decisions are `ListingUpdated`, `ListingRestocked`, `ListingDeactivated` and `ListingActive`.
- **reserveForTrade(tx, { listingId, qty: 1 }):** visible, else `ListingNotFound`; individual, else `NotIndividualSellerListing`; then INV-1's ascending conditional decrement with `req = 1` and `exhaustedListingIds`. It writes only `"InventoryUnit"`.
- **getTradeability(tx, { listingId }):** visible, else `ListingNotFound`; `openToTrade`, else `ListingNotOpenToTrade` (409). It returns `{ sellerId, availability, decision: ListingOpenToTrade }`.
- **getAvailabilitySummary({ catalogEntryIds, area }):**
  - 1–500 distinct ids, through `rejectRequest`.
  - One element per id, in input order. It counts the visible single listings with availability ≥ 1 that are either individual or purchasable business listings: verification `Approved` through `getSellerVerification`, once per distinct seller; not paused; projection funded.
  - It returns `lowestPriceCop` and `availableCount` (listings), or `{ null, 0 }`.
  - A non-null `area` throws `NotImplementedError` until DSC-3 (Story 6.1) gives the area check (`deferred-work.md`).
- **resolveItemRefs:** delegates to `catalog.resolveItemRefs` unchanged.
- **§13 (stored-only, decision #16):** `ListingHidden` (`{reasonCode}`), `ListingWithdrawn`, `ListingDeactivated`, `ListingUpdated`, `ListingRestocked` and `ListingOpenToTrade`.
- **Wired procedures, with HTTP cases:** `inventory.createBundle`, `.get` (public, `actorId: null`), `.mine`, `.update`, `.restock`, `.deactivate` and `.reactivate`.

**Ask First:** a new registry code (for example a stale `expectedVersion`); any DTO or bound-test change.

**Never:** a stored availability; a body that tells a non-owner that a hidden listing exists; a read of a neighbour's tables.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 2-card bundle | char ×1 of 3, pika ×2 of 2 | availability 1, 2 components | N/A |
| Sealed component | `etb` | nothing written | `SealedProductInBundle` 409 |
| Sale on a shared unit | 2 listings, unit 2, reserve 1 | both show 1 | N/A |
| Bundle ×2 over 1 | — | availability 0 | N/A |
| Restock +2 | unit 1 | availability 3 | N/A |
| Non-owner restock | camila | unit 1 | `ListingNotOwnedByCaller` 403 |
| Owner reads hidden | — | `Hidden` | N/A |
| Non-owner reads hidden | — | — | `ListingNotFound`, same body as unknown |
| Stale `expectedVersion` | — | nothing written | `RequestValidationFailed` on `expectedVersion` |
| Trade the last unit | individual, 1 | `exhaustedListingIds: [lv]` | N/A |
| Closed to trade | — | — | `ListingNotOpenToTrade` 409 |
| Pending business | funded projection | `{ null, 0 }` | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/listings/domain/inv.ts` -- the listing state, the owner check, the cursor
- `src/modules/listings/ports/inv.v2.ts` + `infra/pg.ts` -- `readListingDetail`, `listSellerListings`, `insertBundle`, `updateListingFields`, `setDeactivated`, `availabilityCandidates`
- `src/modules/listings/application/inv.v2.ts` -- the ten operations
- `src/server/composition.ts` + `.test.ts` -- seven `inventory.*` procedures
- `contracts.md` §13 -- six stored-only rows

## Tasks & Acceptance

**Execution:**
- [ ] domain + unit tests; repository; the ten operations
- [ ] §13 rows, generator, the procedures with HTTP cases
- [ ] `deferred-work.md` -- the `area` of P-INV.availability
- [ ] `sprint-status.yaml` -- 5.6 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 5.6 `done`, when the 12 bound tests run, then they pass, and `npm run test:ci` is green.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/inv_supporting.test.ts` -- expected: all pass but `[S-FR-REP-5.*]` (Story 13.5, NotImplemented)
- `npm run test:ci` -- expected: exit 0

## Implementation Notes

- Code review is batched with the rest of Epic 5 at its close (decision #22).
