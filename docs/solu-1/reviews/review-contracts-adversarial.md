---
title: Adversarial review — Solu-1 contract matrix
reviewed: docs/solu-1/planning/contracts.md (checked against docs/plan-2/planning/ARCHITECTURE.md, prd.md, addendum.md)
skill: bmad-review-adversarial-general
date: 2026-10-18
status: triaged — Phase 1 gate, 2026-10-18 (decision log #8)
---

# Adversarial review — Solu-1 contract matrix

**Report 1 of 4** (task statement §7). The review covers all 36 contracts, the invariant index and the gap table. It was run in the same session that drafted the contracts, so it is a self-review under the skill's adversarial brief. Mateo decides the triage at the Phase 1 gate. As the skill requires, the findings are descriptions only, with no severity.

## Findings

- **F-01 `assertCatalogAdmin` would break the error-owner lint.**
  - The contract places the guard in `catalog` and has it throw `AdminOnly`.
  - `AdminOnly` is owned by `identity`. AD-SYS-1 rule 2 allows `raise(code)` only from a file in the owning module (lint `tezg/error-owner`).
  - A guard in `catalog` that constructs `AdminOnly` therefore fails CI. Only a call that *receives* the error from `identity` may propagate it.
- **F-02 `sendMessage` "propagates" an error nobody throws.**
  - `identity.getMessagingEligibility` returns a `Decision` (ARCH §6.1 ports). It does not throw.
  - The contract says `messaging` propagates `NotBusinessAccount` unchanged. With a `Decision` return there is nothing to propagate: `messaging` would have to raise an `identity` code itself, which F-01's lint forbids.
  - The mechanism is undefined. Plan-2 has the same hole (ADD-§3.1 "Propagated by `messaging`").
- **F-03 The duplicate-deduction rollback also rolls back the delivery row.**
  - `applyOrderDeduction` runs in the handler transaction, which also sets the subscriber's `EventDelivery` row to `delivered` (AD-SYS-2 rule 4 step 2).
  - The contract (copying AD-COM-2 rule 3) rolls back the whole `tx` on `DuplicateDeductionSentinel` and "returns success". That rollback discards the `delivered` update too.
  - The delivery stays `pending`, spends an attempt, and is swept again. Under repeated races it can reach `DeliveryAttemptsExhausted` for an event that was handled correctly.
  - A `SAVEPOINT` around the account update and ledger insert is needed. Plan-2 has the same defect.
- **F-04 `CuidId` cannot hold for `User.id`.**
  - The matrix defines every primary key as cuid2 (`^[a-z][0-9a-z]{23}$`).
  - `"User"` is Better Auth's core table, and Better Auth generates its own ids (a 32-character random string by default) unless `advanced.database.generateId` is configured.
  - Every guard taking `userId: CuidId` therefore rejects or mis-validates real session ids. No contract or AD states the Better Auth id configuration.
- **F-05 `reserveForPurchase` lists its own checks as preconditions.**
  - "The listing checks run in this order … Otherwise `ListingNotFound`" sits under **P**.
  - These are checks the function performs and errors it throws, so they belong in **Q**. **P** is what the caller must guarantee.
  - As written, a reader cannot tell whether `orders` must check visibility before calling.
- **F-06 `reserveForPurchase` silently resolves a Plan-2 contradiction.**
  - FR-INV-3 says `ListingNotPurchasable` cites "unverified, paused, **withdrawn or deactivated**".
  - FR-INV-10 and ADD-§3.1 say a withdrawn or deactivated listing yields `ListingNotFound` for a non-owner, and FR-INV-3 check 1 runs first.
  - The contract picks `ListingNotFound` and narrows `ListingNotPurchasable` to `ListingUnverified` and `ListingPausedBalanceExhausted`, without saying it deviated from FR-INV-3's text. The choice is defensible, but it is unrecorded.
- **F-07 The race invariant of `reserveForPurchase` is only true for equal requests.**
  - "Exactly `min(N, floor(k / req))` calls succeed" assumes every caller requests the same `req`.
  - Mixed quantities (2 and 1 against `k = 2`) make the count depend on arrival order, and the clause becomes false.
- **F-08 Wishlist availability counts listings nobody can buy.**
  - `getAvailabilitySummary` counts a business listing when `"pausedAt" IS NULL`. It never checks the seller's verification.
  - A `Pending` business's listing is visible but not purchasable (FR-INV-7, `ListingUnverified`). It would still raise `availableCount` and set `lowestPriceCop`.
  - Plan-2 never defines "available" for this port, so the contract invented a partial definition.
- **F-09 `hasClosedPurchase` changed its port signature.**
  - ARCH §6.6 declares `hasClosedPurchase(buyerId, businessId)`. The contract adds `now: Instant`, and `assertVerifiedPurchaser` passes it.
  - Under AD-SYS-6 the query takes `now` from the `Clock` port itself. A third parameter is drift between the architecture and the contract.
- **F-10 The CAT mandatory edge case has no operation.**
  - The invariant "`catalogEntryId` is never reassigned" is attached to `startFeedRun`, which never touches `"CatalogEntry"`.
  - No CAT contract performs the upsert by `externalKey` that the mandatory edge case (renamed card or reprint keeps its id) is about. A test of `startFeedRun` cannot turn red if the upsert reassigns ids.
- **F-11 `getReferencePriceAsOf` is ambiguous on equal timestamps.**
  - The unique key is `(catalogEntryId, source, observedAt)`, so two sources can store observations at the same instant.
  - "The row with the greatest `observedAt`" then matches two rows. With no tie-break, the result is not deterministic, and "byte for byte" provenance (NFR-CAT-3) cannot be asserted.
- **F-12 `getSetCompletion` lacks the data it needs.**
  - `ownedDistinct` requires each entry's set and kind. Those live in `catalog`, and only `getSetSummaries([setId])` is called.
  - The contract never says how entries are mapped to the set: a `catalog.getEntries` call over the collection's catalog ids is missing.
- **F-13 `acceptPrompt` computes positions with a read-then-write.**
  - `"manualPosition"` = current maximum + 1 is a read followed by an insert.
  - Two accepts of different prompts into one collection, or an accept racing `collections.addEntry`, read the same maximum and write duplicate positions.
  - Nothing serializes them: AD-COL-1's `col:owner` lock covers only collection creation. AD-SYS-5 rule 3 forbids the pattern.
- **F-14 `acceptOffer` has no defined result when the post-commit handoff fails.**
  - The contact message is generated after commit.
  - If `generateContactMessage` throws (for example, the listing was hidden between commit and call, giving `ListingNotFound`), the accept has committed but the function's return shape includes `handoff`.
  - The contract does not say whether the caller gets an error for a committed accept, or a success without a handoff.
- **F-15 `sendMessage` treats a business reply like a buyer start.**
  - Eligibility maps `Pending` to `allowedWithNotice` / `RecipientNotYetVerified`. When the business itself replies in an existing conversation, the recipient is a buyer, so that notice is meaningless.
  - AD-MSG-2 rule 2 says a reply from an `Approved` or `Pending` business is always allowed, and a `Rejected` business's thread is read-only for both sides. The contract does not distinguish sender roles.
- **F-16 The idempotent-retry path in `sendMessage` reads inside an aborted transaction.**
  - A unique violation aborts a PostgreSQL transaction, and no further statement runs until rollback.
  - "Re-read and return the stored message" must therefore happen in a new transaction or after a savepoint rollback. The contract leaves this unstated, and a direct implementation fails with `25P02 in_failed_sql_transaction`.
- **F-17 Invented user-facing copy.**
  - `findCommissionAccount` quotes a Spanish string ("Tu cuenta de comisiones se abre cuando aprobemos tu tienda") that does not exist in `docs/plan-2/ux/microcopy-es-CO.md`.
  - `getAggregates` quotes "Aún no tiene reseñas". Contracts are not the copy source (ADD-§1), and invented strings bypass the forbidden-phrase check.
- **F-18 `search` narrows the FR-DSC-1 input without saying so.**
  - FR-DSC-1 includes `view: 'entries'` and `includeSoldOut`.
  - The contract's `SearchInput` fixes `view: 'listings'`, omits `includeSoldOut`, and states the sold-out exclusion unconditionally. The scope reduction is not recorded.
- **F-19 `requireListingEligibility` has an unspecified state.**
  - `"sellerTrack"='business'` with **no** `"BusinessApplication"` row is not handled by any clause.
  - The state is unreachable only because `verification.submit` sets the track and inserts the application in one transaction. That reason belongs in the contract, with a defined outcome (`'Unexpected'`) for when it is violated.
- **F-20 `decideApplication` does not define error precedence.**
  - On reject, the reason check (`RejectionReasonUnknown`) runs before the transition. An unknown `applicationId` combined with an inactive reason therefore yields `RejectionReasonUnknown`, not `ApplicationNotFound`.
  - The contract lists both errors but never states which wins.
- **F-21 The `claimSellerTrack` precondition is not checkable.**
  - "`tx` MUST NOT yet hold a row lock on `"User"`" is a statement about lock state that no caller or test can observe.
  - What it should express is the AD-SYS-4 lock-order position (the `"User"` row is the first row this transaction locks).
- **F-22 `assertSearchArea` restates a clause the bounding box already covers.**
  - `(lat, lng) ≠ (0, 0)` can never trigger, because longitude 0 lies outside `[−81.73, −66.85]`.
- **F-23 `changePercent` is a weak fit for the resolver slot.**
  - It is a pure formula. A zero baseline is a numeric edge, not "missing data" in the lookup sense of the template.
- **F-24 `explanation: string` in `SearchRow` is untyped.**
  - FR-DSC-5 builds the explanation from typed parts, but the contract types it as a free string, which a test can only compare literally.

## Triage

Mateo adopted the recommendation below in full at the Phase 1 gate on 2026-10-18 (decision log #8). Every Accept is applied in `planning/contracts.md`, and each fix carries a `(review F-nn)` marker at its location.

| # | Recommendation | Reason | Fix if accepted |
|---|---|---|---|
| F-01 | **Accept** | Real lint violation | Move the check to `identity`: `identity.requireAdmin(actorId)` raises `AdminOnly`; `assertCatalogAdmin` calls it and propagates unchanged |
| F-02 | **Accept** | Real, and inherited from Plan-2 | `identity` offers `requireMessagingEligibility(recipientId)`, which throws `NotBusinessAccount` itself; `messaging` propagates |
| F-03 | **Accept** | Real defect, inherited from AD-COM-2 rule 3 | `SAVEPOINT apply_deduction`; on the sentinel `ROLLBACK TO SAVEPOINT`; the delivery is then marked `delivered` |
| F-04 | **Accept** | Real; breaks every guard | Bind Better Auth `advanced.database.generateId` to cuid2 and state it in the shared notation |
| F-05 | **Accept** | Correct P/Q split | Move the three checks to Q as numbered first-fail checks |
| F-06 | **Accept** | Correct choice, but it must be recorded | Note the deviation from FR-INV-3 text and cite FR-INV-10 + ADD-§3.1 |
| F-07 | **Accept** | Clause false for mixed quantities | State it for equal `req`; for mixed requests, the sum of granted `req` ≤ `k` |
| F-08 | **Accept** | Real gap | Count a business listing only when its seller is `Approved` (one `identity.getSellerKinds` call per request) |
| F-09 | **Accept** | Signature drift | Remove `now`; the query reads `Clock` itself |
| F-10 | **Accept** | The mandatory edge case must have a contract | Add a supplementary 4th CAT contract `upsertCatalogEntry` (decided at the gate) |
| F-11 | **Accept** | Determinism | Order by `("observedAt" DESC, source ASC, id ASC)` |
| F-12 | **Accept** | Missing data source | Add `catalog.getEntries(ids ≤ 500)` per chunk |
| F-13 | **Accept** | Real race | Take `pg_advisory_xact_lock(col:owner:<actorId>)` first in `acceptPrompt` (lock-order position 1) |
| F-14 | **Accept** | Undefined failure state | Accept succeeds with `handoff: null`; 8.2 regenerates through `trading.handoff` |
| F-15 | **Accept** | Contradicts AD-MSG-2 rule 2 | Split by sender role: buyer → recipient eligibility; business reply → allowed while its own status is `Approved` or `Pending`, `NotBusinessAccount` when `Rejected` |
| F-16 | **Accept** | Real Postgres behaviour | `SAVEPOINT` before the insert; on `23505` roll back to it and select the stored row |
| F-17 | **Accept** | Copy is owned by the microcopy file | Remove both strings; cite the microcopy section instead |
| F-18 | **Accept** | Scope reduction must be explicit | Add `includeSoldOut`; state that `view: 'entries'` is FR-DSC-1's other view and outside this contract |
| F-19 | **Accept** | Missing state | Add the clause with `'Unexpected'` and its reason |
| F-20 | **Accept** | Precedence | Load the application first: `ApplicationNotFound` → `ApplicationNotPending` → `RejectionReasonUnknown` |
| F-21 | **Accept** | Uncheckable clause | Restate as "the `"User"` row is the first row this transaction locks (lock-order position 2)" |
| F-22 | **Reject** | Redundant but harmless: ADD-§2.4 lists the sentinel explicitly, and keeping it means the same predicate serves INV and IDN, where `(0, 0)` is the sentinel for a missing meeting point | — |
| F-23 | **Reject** | Mateo approved the selection at the pre-draft gate (decision log #5). A zero baseline is the exact "explicit behaviour when data is missing" the template asks for: no baseline value exists to divide by | — |
| F-24 | **Reject** | The typed parts are FR-DSC-5's concern for the renderer. The contract asserts ordering and inclusion, which is what a test checks; the string is display output | — |
