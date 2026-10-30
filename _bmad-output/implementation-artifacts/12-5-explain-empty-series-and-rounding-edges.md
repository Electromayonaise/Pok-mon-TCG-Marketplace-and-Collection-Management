---
title: 'Story 12.5: Explain empty series and rounding edges'
type: 'feature'
created: '2026-10-30'
status: 'done'
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

**Problem:** This story is in `impl2_scope`, but its 2 bound tests check clauses 12.2 must build: `[VAL-3.Q4]` is VAL-3's own Q4 (no priced entry → `points: []`, explained under FR-VAL-4), and `[VAL-2.I3]` is VAL-2 Q2's `roundHalfAwayFromZero` (3 → 4 is +33.33 %, 30,000 → 29,999 is 0, never −0), which `[VAL-2.Q1]` already needs. Once 12.2 is done the red gate fails.

**Approach:** **D1 (needs approval):** a proof-only story, committed right after 12.4, leaving `impl2_scope` with a note and not counting toward the 43.

## Boundaries & Constraints

**Always:** the bound tests are the spec. **Ask First:** a fix that changes a 12.2 response shape. **Never:** a bound-test change; a new production file.

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/val_contracts.test.ts` -- the 2 bound tests

## Tasks & Acceptance

**Execution:**
- [x] run the 2 tests on the 12.4 tree; fix any gap; `sprint-status.yaml` 12.5 `done`, out of `impl2_scope`

**Acceptance Criteria:**
- Given 12.5 `done`, when its 2 tests run, then they pass and `gate:atdd-red:impl1` is green; `epic-12: done` once the gate is signed.

## Implementation Notes

- D1 approved (decision log Impl-1 #37). Code review is batched with the rest of Epic 12 at its close (decision #22).
- The 2 tests passed on the 12.4 tree with no fix: `[VAL-3.Q4]` through `series` (no priced entry → `points: []`, `ValuationHistoryEmpty` citing `{ pricedEntries: 0 }`), and `[VAL-2.I3]` through `roundHalfAwayFromZero` (3 → 4 is 3,333; 30,000 → 29,999 is 0, never −0).
- The story leaves `impl2_scope` with a note in `sprint-status.yaml` and does not count toward the 43.
