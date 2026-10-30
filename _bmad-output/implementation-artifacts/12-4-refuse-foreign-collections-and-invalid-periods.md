---
title: 'Story 12.4: Refuse foreign collections and invalid periods'
type: 'feature'
created: '2026-10-30'
status: 'draft'
baseline_commit: '49b09cc'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** This story is in `impl2_scope`, but its 3 bound tests check clauses 12.1 and 12.2 must build: `[VAL-1.P1]` and `[VAL-3.P1]` are VAL-1's and VAL-3's own ownership precondition (the first read of the snapshot), and `[VAL-2.P2]` is VAL-2's own period check (AD-VAL-2 rule 1). Once 12.1 and 12.2 are done the red gate fails.

**Approach:** **D1 (needs approval):** a proof-only story, like 7.3, 7.4, 8.4, 9.4, 9.5, 10.4 and 11.4 (#32–#36): it runs the 3 tests against 12.1–12.2, fixes any gap there, is committed right after 12.3, leaves `impl2_scope` with a note, and does not count toward the 43.

## Boundaries & Constraints

**Always:** the bound tests are the spec. **Ask First:** a fix that changes a 12.1–12.2 response shape. **Never:** a bound-test change; a new production file.

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/val_contracts.test.ts` -- the 3 bound tests

## Tasks & Acceptance

**Execution:**
- [ ] run the 3 tests on the 12.3 tree; fix any gap; `sprint-status.yaml` 12.4 `done`, out of `impl2_scope`

**Acceptance Criteria:**
- Given 12.4 `done`, when its 3 tests run, then they pass and `gate:atdd-red:impl1` is green.
