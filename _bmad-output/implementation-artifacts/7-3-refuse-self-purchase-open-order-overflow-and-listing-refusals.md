---
title: 'Story 7.3: Refuse self-purchase, open-order overflow and listing refusals'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'f595122'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 7.3 is in `impl2_scope`, but its 3 bound tests check refusals of ORD-1 that Story 7.1 must build anyway:
- `[ORD-1.P3]` checks P3. Without it, the fake reserve runs and the insert fails on the `order_no_self_purchase` CHECK;
- `[ORD-1.P4]` checks P4. 7.1's own `[ORD-1.I2]` requires every loser of the race to be `TooManyOpenOrders`;
- `[ORD-1.P5]` checks that the listing's refusal propagates unchanged from step 3 of 7.1's transaction.

Once 7.1 is done, the 3 tests turn green and the red gate fails. Built without these checks, they would fail for a reason other than NotImplemented, which the gate also refuses.

**Approach:** A proof-only story, like 4.3, 5.3, 5.4 and 6.4 (decisions #23, #29, #30, #31). It runs the 3 tests against 7.1's code, fixes any gap in 7.1's files, and is committed right after 7.1. It leaves `impl2_scope` with a note, and it does not count toward the 43 Impl-1 stories.

## Boundaries & Constraints

**Always:**
- The bound tests are the spec: `[ORD-1.P3]`, `[ORD-1.P4]` and `[ORD-1.P5]`.
- `SelfPurchaseNotAllowed` (409) is raised before the pre-step and the transaction, so nothing is reserved. `TooManyOpenOrders` (409) cites every open order id. A refusal from `reserveForPurchase` rolls back the transaction, which leaves no order and no audit row.
- Remove 7.3 from `impl2_scope` in `sprint-status.yaml`, with a comment.

**Ask First:** a fix that changes the shape of 7.1's response.

**Never:** a change to the bound tests; a new production file.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Own listing | seller = buyer | nothing reserved | `SelfPurchaseNotAllowed` 409 |
| 3 open orders | three businesses | no fourth order | `TooManyOpenOrders` naming them |
| Listing refuses | `InsufficientQuantity` | no order | propagated unchanged |

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/ord_contracts.test.ts` -- the 3 bound tests
- `src/modules/orders/application/ord.v2.ts` -- where any gap is fixed

## Tasks & Acceptance

**Execution:**
- [x] run the 3 tests on the 7.1 tree; fix any gap in 7.1's files
- [x] `sprint-status.yaml` -- 7.3 `done`, out of `impl2_scope`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 7.3 `done`, when the ORD-1 tests run, then all 6 pass and `npm run gate:atdd-red:impl1` reports 0 not as expected.

## Implementation Notes

- Code review is batched with the rest of Epic 7 at its close (decision #22).
- Martín approved building this story with the epic (decision log Impl-1 #32). It leaves `impl2_scope` and does not count toward the 43 Impl-1 stories.
- The 3 tests passed on the 7.1 tree with no change: no gap was found in 7.1's files.

### Review Findings

Epic 7 close review (2026-10-27, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `f595122..e1018fb` (code paths). Totals for the epic: 1 decision, 12 patches, 5 deferrals, 10 dismissed. Martín resolved the decision with the recommendation and approved every patch (decision log Impl-1 #32).

- [x] [Review][Patch] At the per-business limit `TooManyOpenOrders` cites only the orders with that business; the frozen spec and ORD-1 P4 cite every open order [src/modules/orders/domain/ord.ts:openOrderOverflow] — every open order is cited at either limit
