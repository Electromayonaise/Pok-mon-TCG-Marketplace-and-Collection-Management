---
title: 'Story 5.4: Refuse unpurchasable and over-quantity reservations'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'ab3430b'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 5.4 is in `impl2_scope`, but its 4 bound tests check the refusals of INV-1 (P2–P5), and Story 5.2 must build those anyway:
- `[INV-1.I1]` (5.2) requires every losing reserve to be `InsufficientQuantity`;
- `[P-INV.purchase.h]` (5.2) requires `ListingNotFound` for a hidden listing.

Once 5.2 is done, the 4 tests turn green and the red gate fails.

**Approach:** A proof-only story, like 3.3, 4.3 and 5.3 (decisions #23, #27, #29). It runs the 4 tests against 5.2's code, fixes any gap in 5.2's files, and is committed right after 5.2. It leaves `impl2_scope` with a note.

## Boundaries & Constraints

**Always:**
- The bound tests are the spec: `[INV-1.P2]`, `[INV-1.P3]`, `[INV-1.P4]`, `[INV-1.P5]`.
- **The refusals:**
  - Every refusal happens before any unit moves, or aborts the caller's transaction (P5), so no quantity changes.
  - The order is the PRD's: `ListingNotFound` → `NotBusinessListing` → `ListingNotPurchasable` → `InsufficientQuantity` (AD-INV-2 rule 2).
  - Each cites `FR-INV-3`. P4 cites the DecisionCode in `reasonCode`; P5 cites `requested` and `available`.
- Remove 5.4 from `impl2_scope` in `sprint-status.yaml`, with a comment.

**Ask First:** a fix that changes the shape of a 5.2 response.

**Never:** a change to the bound tests; a new production file.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hidden | `hiddenAt` set | unit 5 | `ListingNotFound` 404 |
| Individual | `sellerKind: individual` | — | `NotBusinessListing` 409 |
| Paused | `pausedAt` set | — | `ListingNotPurchasable`, `reasonCode: ListingPausedBalanceExhausted` |
| 2 of 1 | unit of 1 | unit 1 | `InsufficientQuantity {requested: 2, available: 1}` |

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/inv_contracts.test.ts` -- the 4 bound tests
- `src/modules/listings/application/inv.v2.ts` -- where any gap is fixed

## Tasks & Acceptance

**Execution:**
- [x] run the 4 tests on the 5.2 tree; fix any gap in 5.2's files
- [x] `sprint-status.yaml` -- 5.4 `done`, out of `impl2_scope`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 5.2 and 5.4 `done`, when the INV-1 tests run, then all 9 pass.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/inv_contracts.test.ts -t "INV-1"` -- expected: 9 pass

## Implementation Notes

- Code review is batched with the rest of Epic 5 at its close (decision #22).
- The 4 bound tests passed on the Story 5.2 tree (commit `490b7fd`) with no change. No gap needed a fix in 5.2's files.
- Where each refusal is built, all in `reserveForPurchase` (Story 5.2):
  - `[INV-1.P2]`: the read's `visible` flag. The citation is `{ visible: false }` with no listing id, so a hidden listing and an unknown id read the same (S-2).
  - `[INV-1.P3]`: `"sellerKindAtCreation"`.
  - `[INV-1.P4]`: the domain `purchasable` predicate, after `getSellerVerification`.
  - `[INV-1.P5]`: the conditional decrement that changes 0 rows, then a read of the unit's quantity. The caller's transaction aborts, which restores any unit decremented before it.
- 5.4 leaves `impl2_scope` with a note in `sprint-status.yaml`. Like 5.3, it is `done` early and does not count toward the 43 Impl-1 stories.

### Review Findings

Epic 5 close review (2026-10-27, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `ab3430b..4485962` (code paths). Totals for the epic: 2 decisions, 10 patches, 2 deferrals, 17 dismissed. Martín resolved both decisions with the recommendation and approved every patch (decision log Impl-1 #30).

- No findings of its own. Its refusals are built in Story 5.2's files.
