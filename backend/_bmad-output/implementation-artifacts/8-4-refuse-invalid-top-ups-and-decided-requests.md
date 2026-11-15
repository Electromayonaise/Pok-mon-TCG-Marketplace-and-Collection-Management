---
title: 'Story 8.4: Refuse invalid top-ups and decided requests'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: '9f6844d'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 8.4 is in `impl2_scope`, but its 7 bound tests check preconditions that Stories 8.1–8.3 must build anyway:
- `[S-FR-COM-2.f]` and `[S-FR-COM-2.f2]` are P3 and P2 of 8.1's `requestTopUp`;
- `[S-FR-COM-9.f]` is the business check of 8.1's `getMyCommissionAccount`;
- `[COM-2.P2]`, `[COM-2.P3]` and `[COM-2.reject.f]` are the 0-row re-read of 8.3's conditional update, which `[COM-2.I1]` also requires;
- `[COM-1.P3]` is 8.2's 0-row account update (AD-COM-1 rule 1).

Once those stories are done, the 7 tests turn green and the red gate fails; built without the checks, they fail for a reason other than NotImplemented.

**Approach:** A proof-only story, like 4.3, 5.3–5.5, 6.4, 7.3 and 7.4 (decisions #23, #29–#32). It runs the 7 tests against 8.1–8.3's code, fixes any gap in their files, and is committed right after 8.3. It leaves `impl2_scope` with a note and does not count toward the 43 Impl-1 stories.

## Boundaries & Constraints

**Always:**
- The bound tests are the spec. `NotBusinessAccount` comes from identity's guard; `CommissionAccountNotOpen` cites `{ accountOpened: false }`; `TopUpNotPending` cites `{ status, decidedBy, decidedAt }`; a deduction with no account throws `Unexpected` and writes no ledger line.
- `[NFR-COM-3.*]` (8.2, 8.3) satisfy this story's NFR-COM-3 DoD line; no third benchmark.
- Remove 8.4 from `impl2_scope` in `sprint-status.yaml`, with a comment.

**Ask First:** a fix that changes the shape of an 8.1–8.3 response.

**Never:** a change to the bound tests; a new production file.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 19,999 | open account | zero rows | `TopUpAmountInvalid` 400 |
| No account | Approved | nothing written | `CommissionAccountNotOpen` 409 |
| Unknown / decided | confirm | nothing credited | `TopUpNotFound` 404 / `TopUpNotPending` 409 |
| Individual seller | my account | — | `NotBusinessAccount` 409 |
| No account | deduction | delivery failed, replayable | `Unexpected` |

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/com_supporting.test.ts`, `com_contracts.test.ts` -- the 7 bound tests
- `src/modules/commission/application/com.v2.ts` -- where any gap is fixed

## Tasks & Acceptance

**Execution:**
- [x] run the 7 tests on the 8.3 tree; fix any gap
- [x] `sprint-status.yaml` -- 8.4 `done`, out of `impl2_scope`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 8.4 `done`, when the COM tests run, then 8.1–8.4's 25 bound tests pass, 8.5's and 8.6's 10 stay red for NotImplemented, and `npm run gate:atdd-red:impl1` reports 0 not as expected.

## Implementation Notes

- Code review is batched with the rest of Epic 8 at its close (decision #22).
- Martín approved building this story with the epic (decision log Impl-1 #33). It leaves `impl2_scope` and does not count toward the 43 Impl-1 stories.
- The 7 tests passed on the 8.3 tree with no change: no gap was found in 8.1–8.3's files. Their commits ran these tests as early greens, which the gate refuses until this commit marks 8.4 `done` (decision #23).
- `npm run gate:atdd-red:impl1` on this tree: 352 tests, 132 red for the right reason (8.5's 6 and 8.6's 4 among them), 220 green for done stories, 0 not as expected.
