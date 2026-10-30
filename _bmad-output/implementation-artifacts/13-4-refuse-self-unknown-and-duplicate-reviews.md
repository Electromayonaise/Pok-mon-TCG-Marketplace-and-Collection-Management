---
title: 'Story 13.4: Refuse self, unknown and duplicate reviews'
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

**Problem:** This story is in `impl2_scope`, but its 5 bound tests check clauses 13.1 must build: `[REP-1.P2]` and `[REP-1.P3]` are REP-1's own P2 and P3, `[REP-1.I2]` is P5's unique index, `[REP-1.edit.f]` is REP-1.edit's `hiddenAt IS NULL` (EC-32), and `[REP-1.check.f]` is REP-1.check's P3. Once 13.1 is done the red gate fails.

**Approach:** **D1 (needs approval):** a proof-only story, like 7.3, 7.4, 8.4, 9.4, 9.5, 10.4, 11.4, 12.4 and 12.5 (#32–#37): it runs the 5 tests against 13.1, fixes any gap there, is committed right after 13.1 (#23), leaves `impl2_scope` with a note, and does not count toward the 43.

## Boundaries & Constraints

**Always:** the bound tests are the spec. **Ask First:** a fix that changes a 13.1 response shape. **Never:** a bound-test change; a new production file.

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/rep_contracts.test.ts` -- the 5 bound tests

## Tasks & Acceptance

**Execution:**
- [ ] run the 5 tests on the 13.1 tree; fix any gap; `sprint-status.yaml` 13.4 `done`, out of `impl2_scope`

**Acceptance Criteria:**
- Given 13.4 `done`, when its 5 tests run, then they pass and `gate:atdd-red:impl1` is green.
