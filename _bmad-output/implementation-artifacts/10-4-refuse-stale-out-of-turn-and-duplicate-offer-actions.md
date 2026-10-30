---
title: 'Story 10.4: Refuse stale, out-of-turn and duplicate offer actions'
type: 'feature'
created: '2026-10-30'
status: 'ready-for-dev'
baseline_commit: '6b3cc16'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** This story is in `impl2_scope`, but all 12 of its bound tests check clauses 10.1–10.3 must build: `[TRD-1.P2]`–`[TRD-1.P6]` are TRD-1's conditional update, re-read and Q-fail (`[TRD-1.MEC]` accepts `TradeOfferNotOpen`/`InsufficientQuantity`); `[TRD-2.P2]`, `[TRD-2.P5]`–`[TRD-2.P8]` are TRD-2's first-fail chain (`[TRD-2.I3]` needs P6); `[S-FR-TRD-1.f]`, `[S-FR-TRD-2w.f]`, `[S-FR-TRD-3.f]` are the unique index, the withdraw re-read and the visibility rule of 10.1. Once those stories are done the red gate fails.

**Approach:** **D1 (approved):** a proof-only story, like 7.3, 7.4, 8.4, 9.4 and 9.5 (#32–#34): it runs the 12 tests against 10.1–10.3, fixes any gap there, is committed right after 10.3, leaves `impl2_scope` with a note, and does not count toward the 43. `[NFR-TRD-2.counter]` (10.2) and `[NFR-TRD-2.accept]` (10.3) satisfy its NFR-TRD-2 DoD line.

## Boundaries & Constraints

**Always:** the bound tests are the spec. **Ask First:** a fix that changes a 10.1–10.3 response shape. **Never:** a bound-test change; a new production file.

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/trd_contracts.test.ts`, `trd_supporting.test.ts` -- the 12 bound tests

## Tasks & Acceptance

**Execution:**
- [ ] run the 12 tests on the 10.3 tree; fix any gap; `sprint-status.yaml` 10.4 `done`, out of `impl2_scope`

**Acceptance Criteria:**
- Given 10.4 `done`, when its 12 tests run, then they pass and `gate:atdd-red:impl1` is green.
