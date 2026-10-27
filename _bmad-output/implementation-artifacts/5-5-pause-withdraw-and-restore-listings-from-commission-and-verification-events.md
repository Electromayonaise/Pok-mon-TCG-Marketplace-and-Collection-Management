---
title: 'Story 5.5: Pause, withdraw and restore listings from commission and verification events'
type: 'feature'
created: '2026-10-27'
status: 'done'
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

**Problem:** Story 5.5 is in `impl2_scope`, but `[INV-3.I2]` (a business listing with no projection row is not purchasable) is a check that Story 5.2's reserve must make (AD-3), so it turns green with 5.2. Its other 5 tests need `applyCommissionProjection` and `applyApplicationDecision`, which throw `NotImplementedError`. The red gate then fails either way. Meanwhile VER's `BusinessApplicationApproved`/`Rejected` events (Epic 3) reach a listings subscriber that throws.

**Approach:** Build both subscribers as AD-INV-3 rules 4 and 5 state them. Each takes the handler's `tx` (the delivery row is lock position 0) and applies only newer facts, so redelivery, the sweeper and replays are no-ops. Wire the `listings` delivery handler in `compose()`. The payload types come from `src/shared-kernel/events.ts` (AD-9), so nothing from Epic 8 is needed. Until COM publishes, business listings stay fail-closed. 5.5 leaves `impl2_scope` with a note.

## Boundaries & Constraints

**Always:**
- **applyCommissionProjection(tx, { type, businessId, ledgerSeq, balanceAfter }):**
  - `ledgerSeq` must be an integer ≥ 0, else `UnexpectedError` (P2). The Clock is read once.
  - Q1 `INSERT "SellerCommissionState" … ON CONFLICT ("businessId") DO UPDATE … WHERE "SellerCommissionState"."lastAppliedSeq" < $seq RETURNING 1`, with `paused = (type = Exhausted)`.
  - Q2 When a row comes back:
    - Exhausted: `UPDATE "Listing" SET "pausedAt" = now WHERE "sellerId" = b AND "sellerKindAtCreation" = 'business' AND "pausedAt" IS NULL`;
    - Replenished: clears `pausedAt` on the rows where it is set;
    - it returns `{ applied: true, listingsChanged: rowCount }`.
  - When no row comes back: `{ applied: false, listingsChanged: 0 }`, with zero writes.
  - Q3 `audit('listings.commissionProjection.applied', SellerCommissionState:businessId)`, `actorKind: 'system'`, only when applied.
- **applyApplicationDecision(tx, { type, applicationId, businessId, decidedAt }):**
  - It first locks the business's `"Listing"` rows `FOR UPDATE` in ascending id order (lock position 4). Two decisions for one business then serialize, and the second sees the first's row. AD-SYS-4 rule 4 is left unchanged: no new advisory namespace.
  - `newest` = `decidedAt` is later than every `decidedAt` already applied and not ignored for the business.
  - `INSERT "AppliedApplicationDecision" (…, ignored = NOT newest) ON CONFLICT ("applicationId") DO NOTHING`.
  - It applies only when it inserted and is newest:
    - Rejected: `withdrawnAt = now`, `withdrawnReason = 'ApplicationRejected'`, `withdrawnByApplicationId`, on the visible-to-withdraw rows (`"withdrawnAt" IS NULL`);
    - Approved: clears exactly the rows withdrawn for `ApplicationRejected`.
  - It returns `{ applied: true, ignored: false, listingsChanged }`. Otherwise `{ applied: false, ignored: true, listingsChanged: 0 }`, including a redelivery.
  - Audit `listings.applicationDecision.applied` (system) when applied.
- **The handler in `compose()`:** `listings` maps:
  - `CommissionBalanceExhausted`/`Replenished` to the projection;
  - `BusinessApplicationApproved` (`approvedAt`) and `BusinessApplicationRejected` (`rejectedAt`) to the decision;
  - any other type to `UnexpectedError`.

  `commission` and `collections` stay unwired.
- Remove 5.5 from `impl2_scope` in `sprint-status.yaml`, with a comment.

**Ask First:** a new advisory-lock namespace; a write to `"SellerCommissionState"` outside the projection subscriber.

**Never:** a transaction opened inside a subscriber; an older fact overriding a newer one; a delete.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seq-0 Exhausted | 2 listings, no row | row `{seq 0, paused}`, 2 paused | N/A |
| Replenished 5, then Exhausted 4 | — | second `{applied: false}`, none paused | N/A |
| Exhausted 1 ×3 | — | `[true, false, false]` | N/A |
| Reject, then newer approve | 1 listing | withdrawn, then restored | N/A |
| Older reject after newer approve | — | `{applied: false, ignored: true}`, still visible | N/A |
| No projection, reserve | Approved business | — | `ListingNotPurchasable` (5.2) |

</frozen-after-approval>

## Code Map

- `src/modules/listings/ports/inv.v2.ts` + `infra/pg.ts` -- `upsertProjection`, `setPausedForSeller`, `lockSellerListings`, `newestAppliedDecision`, `insertAppliedDecision`, `withdrawForRejection`, `restoreFromRejection`
- `src/modules/listings/application/inv.v2.ts` -- the two subscribers
- `src/server/composition.ts` + `.test.ts` -- the `listings` delivery handler

## Tasks & Acceptance

**Execution:**
- [x] repository methods and the two subscribers + unit tests
- [x] the `listings` handler in `compose()`, with a replay case
- [x] `sprint-status.yaml` -- 5.5 `done`, out of `impl2_scope`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 5.5 `done`, when the 6 bound tests run, then they pass.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd -t "INV-3|S-FR-INV-8"` -- expected: pass

## Implementation Notes

- Code review is batched with the rest of Epic 5 at its close (decision #22).
- **The seq gate is one statement.** It is an upsert with `WHERE "lastAppliedSeq" < EXCLUDED."lastAppliedSeq"`. A first event inserts at any seq, including the seq-0 `Exhausted` of account opening. The row lock serializes two concurrent events for one business, so the higher seq decides the final state.
- **Exhausted pauses only business listings without a pause** (the `listing_individual_never_paused` CHECK); Replenished clears every set `pausedAt` of the seller. Each applied event writes one audit row (`actorKind: 'system'`, `actorId: null`).
- **Decisions serialize on the seller's `"Listing"` rows**, `FOR UPDATE` in ascending id order (lock position 4, after the delivery row), so no advisory namespace is added. `inv.v2.test.ts` races an older Rejected against a newer Approved 20 times: the newer always wins. "Newest" compares `decidedAt` with the latest applied, non-ignored decision, and a tie is not newer.
- **A redelivery** returns `{ applied: false, ignored: true, listingsChanged: 0 }`, and its stored row keeps the first delivery's `ignored`.
- **`compose()` wires the real `listings` handler by default.** `handlers` became a partial override, and `commission` and `collections` stay NotImplemented. The HTTP replay case now checks the projection row and the paused listing, and a type that listings does not subscribe to is recorded `failed` with `Unexpected`.
- 5.5 leaves `impl2_scope` with a note in `sprint-status.yaml`. Like 5.3 and 5.4, it is `done` early and does not count toward the 43 Impl-1 stories.

### Review Findings

Epic 5 close review (2026-10-27, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `ab3430b..4485962` (code paths). Totals for the epic: 2 decisions, 10 patches, 2 deferrals, 17 dismissed. Martín resolved both decisions with the recommendation and approved every patch (decision log Impl-1 #30).

- [x] [Review][Decision] Two decisions for a business with no listings are not serialized — `lockSellerListings` locks only rows that exist, so both read `newest = null` and both are stored `ignored = false`; a listing created concurrently with a rejection can also escape the withdrawal. Serializing it needs a lock that exists without listings (an advisory namespace, AD-SYS-4 rule 4, Ask First). — Martín: accept and defer. VER decides one application at a time, a business with no listings has nothing to withdraw, and the newest non-ignored decision is still the newest; a listing that escapes a racing rejection is never purchasable, because a reserve reads the verification live (`deferred-work.md`, decision log Impl-1 #30).
- [x] [Review][Patch] A rejection withdraws, and an approval restores, the seller's individual listings too; both writes must be limited to `"sellerKindAtCreation" = 'business'`, as the pause is [src/modules/listings/infra/pg.ts:withdrawForRejection]
