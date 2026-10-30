---
title: 'Story 11.4: Refuse foreign, resolved and invalid collection actions'
type: 'feature'
created: '2026-10-30'
status: 'draft'
baseline_commit: 'cfba71b'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** This story is in `impl2_scope`, but all 7 of its bound tests check clauses 11.2 and 11.3 must build: `[COL-3.P2]`–`[COL-3.P4]` are COL-3's own first-fail chain, and `[COL-1.P1]`, `[COL-1.P2]`, `[COL-1.P3]`, `[COL-1.dismiss.f]` are COL-1's re-read, its Q-fail and its rollback, which `[COL-1.MEC]` needs (the second accept is `PromptAlreadyResolved`). Once 11.2 and 11.3 are done the red gate fails.

**Approach:** **D1 (needs approval):** a proof-only story, like 7.3, 7.4, 8.4, 9.4, 9.5 and 10.4 (#32–#35): it runs the 7 tests against 11.2–11.3, fixes any gap there, is committed right after 11.3, leaves `impl2_scope` with a note, and does not count toward the 43.

## Boundaries & Constraints

**Always:** the bound tests are the spec. **Ask First:** a fix that changes a 11.2–11.3 response shape. **Never:** a bound-test change; a new production file.

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/col_contracts.test.ts` -- the 7 bound tests

## Tasks & Acceptance

**Execution:**
- [ ] run the 7 tests on the 11.3 tree; fix any gap; `sprint-status.yaml` 11.4 `done`, out of `impl2_scope`

**Acceptance Criteria:**
- Given 11.4 `done`, when its 7 tests run, then they pass and `gate:atdd-red:impl1` is green.
