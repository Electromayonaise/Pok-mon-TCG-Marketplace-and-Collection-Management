---
title: 'Story 13.1: Write, edit and check eligibility for a review'
type: 'feature'
created: '2026-10-30'
status: 'draft'
baseline_commit: '98b47ad'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `RepServiceV2.writeReview`, `editReview` and `getReviewEligibility` throw `NotImplementedError`: Camila cannot review the business she bought from, nor the individual seller she met.

**Approach:** REP-1, REP-1.edit and REP-1.check as written in contracts.md §12 and §15.12 and AD-REP-1 rules 1–4, over identity's `getReviewTarget` (S-FR-IDN-6.target, Story 2.5) and orders' `hasClosedPurchase` (S-FR-ORD-9, Story 7.5). **No new neighbour port (D6):** both are already in the registry, implemented and declared in `ports/rep.v2.ts`; `hasClosedPurchase` already means "closed" = the item fact, never "paid" (AD-ORD-3 rule 4), and returns `latestState` derived at read.

## Boundaries & Constraints

**Always:**
- P1 `canBuy` is the procedure builder's (proven in `[SYS-8.R2]`). P2 `reviewerId = targetUserId` → `TargetNotFound` before any read. P3 `getReviewTarget`: `individual`, or `business` with `verified = true` (an `Approved` application; an individual track exists only with a complete profile, Story 2.1); otherwise `TargetNotFound`. P2 and P3 carry one identical body, `{ rule: 'AD-REP-1 rule 1', inputs: { reviewable: false } }`, so a refusal never tells a self-review from an unknown id (D6).
- P4 (business only): `hasClosedPurchase(reviewerId, targetUserId).closed` or `NotVerifiedPurchaser` citing `{ latestState }` (`null` renders "(sin dato)"). P5: the insert's 23505 on `review_one_per_pair` → `DuplicateReview` (409); the transaction rolls back, so Q-fail holds.
- The neighbour reads run before the write transaction (order facts are write-once, AD-REP-1 trade-off); Q1 + Q3 (`reviews.review.written`, `actorKind: 'user'`) in one transaction; no event. `purchaseVerified = (targetKind = 'business')`.
- Edit: `UPDATE … SET rating, text, "editedAt" = :now, "updatedAt" = :now, version = version + 1 WHERE id AND "reviewerId" = :actor AND "hiddenAt" IS NULL`; 0 rows → `ReviewNotFound` (EC-32); one audit row `reviews.review.edited`.
- Eligibility (zero writes): P2, P3 throw as in REP-1; then the first-fail verdict P4 → `eligible = false` with decision `NotVerifiedPurchaser` citing `{ latestState }`, P5 → `eligible = false` with decision `DuplicateReview`; else `ReviewEligible`. `existingReview` is filled whenever the pair has a review (hidden ones included, `hidden: true`).
- **D4 (trim):** per the approved option.
- **D5 decisions:** stored-only §13 rows `ReviewWritten` (Q4: `{ rule: 'FR-REP-1' | 'FR-REP-2', inputs: { targetKind, purchaseVerified } }`), `ReviewEdited`, `ReviewEligible`.
- `RepRepository` gets the methods its SQL needs, implemented by a new `PgRepRepository` in `infra/pg.ts`, joined to the one repository (R-14) in `compose()` and the test `wiring`. Wiring: `reputation.write`, `reputation.edit`, `reputation.eligibility`.

**Ask First:** any bound-test change; a contract or DTO shape change beyond D4–D5.

**Never:** a `DELETE`; re-evaluating `purchaseVerified` after the write; "paid" as eligibility.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Business, closed | latest order Closed | verified row, audit, no event | N/A |
| Individual | no purchase | row, `purchaseVerified=false` | N/A |
| Paid not closed | `Paid` / `PaymentConfirmed` | zero rows | `NotVerifiedPurchaser` {latestState} |
| Self / no seller / unknown | — | no neighbour read for self | `TargetNotFound` |
| Double submit | 2 concurrent | 1 row | `DuplicateReview` (409) |
| Edit hidden | `hiddenAt` set | text unchanged | `ReviewNotFound` |

</frozen-after-approval>

## Code Map

- `src/modules/reviews/{domain/rep.ts,ports/rep.v2.ts,infra/pg.ts,application/rep.v2.ts,index.ts}` + src tests
- `src/server/composition.ts` (+ test); `test-support/solu2/fixtures.ts`; `contracts.md` §13; `messages.generated.ts` (generated)

## Tasks & Acceptance

**Execution:**
- [ ] domain (`reviewVerdict`) + repository + service + src tests; §13 rows; wiring
- [ ] `sprint-status.yaml` -- 13.1 `done`

**Acceptance Criteria:**
- Given 13.1 `done`, when `[REP-1.Q1]`, `[REP-1.Q1i]`, `[REP-1.I1]`, `[REP-1.edit.h]`, `[REP-1.check.h]` run, then they pass; 13.4's five tests and 13.3's `[REP-1.MEC]` are early greens (D1).

## Verification

- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/rep_contracts.test.ts -t "REP-1"`
