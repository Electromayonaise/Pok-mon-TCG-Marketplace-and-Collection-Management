---
title: 'Story 9.4: Refuse outsiders and businesses that initiate'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: '787392b'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** This story is in `impl2_scope`, but its 3 bound tests check clauses that Story 9.2 must build: `[MSG-1.P3]`, `[MSG-1.P4]` and `[MSG-1.P5]` are P3, P4 and P5 of 9.2's `sendMessage`; `[MSG-3.MEC]` (9.2) needs P5's refusal. Once 9.2 is done they turn green and the red gate fails; built without them, they fail for a reason other than NotImplemented.

**Approach:** **D1 (approved):** a proof-only story, like 4.3, 5.3–5.5, 6.4, 7.3, 7.4 and 8.4 (#23, #29–#33). It runs the 3 tests against 9.2's code, fixes any gap there, and is committed right after 9.2. It leaves `impl2_scope` with a note and does not count toward the 43 Impl-1 stories.

## Boundaries & Constraints

**Always:** the bound tests are the spec; `[NFR-MSG-2.send]` (9.2) satisfies this story's NFR-MSG-2 DoD line, no second benchmark; remove the story from `impl2_scope` with a comment.

**Ask First:** a fix that changes the shape of a 9.2 response.

**Never:** a change to the bound tests; a new production file.

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/msg_contracts.test.ts` -- the 3 bound tests

## Tasks & Acceptance

**Execution:**
- [x] run the 3 tests on the 9.2 tree; fix any gap
- [x] `sprint-status.yaml` -- `done`, out of `impl2_scope`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given this story `done`, when the MSG tests run, then they pass, 9.6's 4 tests stay red for NotImplemented, and `npm run gate:atdd-red:impl1` reports 0 not as expected.

## Implementation Notes

- Martín approved building this story with the epic (decision log Impl-1 #34). It leaves `impl2_scope` and does not count toward the 43 Impl-1 stories.
- The 3 tests passed on the 9.2 tree with no change: no gap was found in 9.2's files. 9.2's commit ran them as early greens, which the gate refuses until this commit marks 9.4 `done` (decision #23).
- `npm run gate:atdd-red:impl1` on this tree: 352 tests, 122 red for the right reason, 230 green for done stories, 0 not as expected.
