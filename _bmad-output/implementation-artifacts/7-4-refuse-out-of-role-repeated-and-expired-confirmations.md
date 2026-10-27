---
title: 'Story 7.4: Refuse out-of-role, repeated and expired confirmations'
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

**Problem:** Story 7.4 is in `impl2_scope`, but its 7 bound tests check the preconditions of ORD-2, ORD-3 and ORD-4, which Story 7.2 builds as its 0-row re-read:
- `[ORD-2.P1]` checks the visibility that 7.2's `[ORD-3.MEC]` already requires;
- `[ORD-2.P3]` checks the repeat that `[ORD-3.R1]` and `[ORD-4.MEC]` require;
- `[ORD-2.P4]` checks the materialized expiry that `[ORD-2.MEC]` requires;
- `[ORD-2.P5]`, `[ORD-3.P2]`, `[ORD-4.P2]` and `[ORD-4.P3]` check the other branches of the same mapping.

Once 7.2 is done, the 7 tests turn green and the red gate fails. Built without these branches, they would fail for a reason other than NotImplemented.

**Approach:** A proof-only story, like 7.3. It runs the 7 tests against 7.2's code, fixes any gap in 7.2's files, and is committed right after 7.2. It leaves `impl2_scope` with a note, and it does not count toward the 43 Impl-1 stories.

## Boundaries & Constraints

**Always:**
- The bound tests are the spec: `[ORD-2.P1]`, `[ORD-2.P3]`, `[ORD-2.P4]`, `[ORD-2.P5]`, `[ORD-3.P2]`, `[ORD-4.P2]` and `[ORD-4.P3]`.
- Each refusal writes nothing, except the materialized expiry. That expiry commits with the reservation released exactly once, and then the call raises `OrderNoLongerActive`. `OrderNoLongerActive` takes precedence over `OrderConfirmationOutOfOrder` (contracts.md ORD-4 P3).
- Remove 7.4 from `impl2_scope` in `sprint-status.yaml`, with a comment.

**Ask First:** a fix that changes the shape of 7.2's response.

**Never:** a change to the bound tests; a new production file.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Foreign order | Julián pays Camila's order | same body as an unknown id | `OrderNotVisibleToCaller` 403 |
| Repeat | already paid an hour ago | — | `OrderAlreadyConfirmedByRole` citing it |
| Past expiry | `expiresAt` an hour ago | `Unpaid`, released once | `OrderNoLongerActive` 409 |
| No comprobante | — | — | `ComprobanteNotYetUploaded` 409 |
| Wrong role | the buyer confirms receipt of payment; the business confirms receipt of the item | — | `OrderNotOwnedByCaller` 403 |

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/ord_contracts.test.ts` -- the 7 bound tests
- `src/modules/orders/application/ord.v2.ts`, `domain/ord.ts` -- where any gap is fixed

## Tasks & Acceptance

**Execution:**
- [x] run the 7 tests on the 7.2 tree; fix any gap in 7.2's files
- [x] `sprint-status.yaml` -- 7.4 `done`, out of `impl2_scope`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 7.4 `done`, when the 7 tests run, then they pass.

## Implementation Notes

- Code review is batched with the rest of Epic 7 at its close (decision #22).
- Martín approved building this story with the epic (decision log Impl-1 #32). It leaves `impl2_scope` and does not count toward the 43 Impl-1 stories.
- The 7 tests passed on the 7.2 tree with no change: no gap was found in 7.2's files.

### Review Findings

Epic 7 close review (2026-10-27, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `f595122..e1018fb` (code paths). Totals for the epic: 1 decision, 12 patches, 5 deferrals, 10 dismissed. Martín resolved the decision with the recommendation and approved every patch (decision log Impl-1 #32).

- No finding is specific to this story; its seven tests pass after the patches.
