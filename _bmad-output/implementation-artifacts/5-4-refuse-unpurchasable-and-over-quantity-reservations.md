---
title: 'Story 5.4: Refuse unpurchasable and over-quantity reservations'
type: 'feature'
created: '2026-10-27'
status: 'ready-for-dev'
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
- [ ] run the 4 tests on the 5.2 tree; fix any gap in 5.2's files
- [ ] `sprint-status.yaml` -- 5.4 `done`, out of `impl2_scope`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 5.2 and 5.4 `done`, when the INV-1 tests run, then all 9 pass.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/inv_contracts.test.ts -t "INV-1"` -- expected: 9 pass

## Implementation Notes

- Code review is batched with the rest of Epic 5 at its close (decision #22).
