---
title: 'Story 12.3: Value 500 mixed entries with zero drift and a zero baseline'
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

**Problem:** The MEC proof (Annex A, R-11): five concurrent valuations of 500 mixed native and FX-derived entries must equal the BigInt reference exactly, with the drift bound `⌊Σ qty(fx) / 2⌋`, and a zero baseline must be null with `ValuationNoBaseline`, never `NaN`.

**Approach:** a proof-only story (it owns no operation): it runs `[VAL-1.MEC]` and `[VAL-2.I1]` against 12.1–12.2 with real Postgres connections, fixes any gap there, and is committed right after 12.2. Adds a fast-check property over 1,000 random collections for the pure `valueEntries` (contracts.md VAL-1 MEC line).

## Boundaries & Constraints

**Always:** the bound tests are the spec; the MEC runs its full repetition count against Postgres and its runtime is recorded here (TG-7). **D5:** NFR-VAL-2 is measured by 12.1's and 12.2's benchmarks on the same 500-entry collection; this story binds no benchmark of its own and records their figures.

**Ask First:** a fix that changes a 12.1–12.2 response shape. **Never:** a bound-test change.

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/val_contracts.test.ts` -- `[VAL-1.MEC]`, `[VAL-2.I1]`
- `src/modules/collections/val-domain.test.ts` -- the property

## Tasks & Acceptance

**Execution:**
- [x] run the 2 tests; property test; record the runtime; `sprint-status.yaml` 12.3 `done`

**Acceptance Criteria:**
- Given 12.3 `done`, when `[VAL-1.MEC]` and `[VAL-2.I1]` run, then they pass.

## Implementation Notes

- Code review is batched with the rest of Epic 12 at its close (decision #22). D5 (decision log Impl-1 #37): no benchmark of its own.
- Both bound tests passed on the 12.2 tree with no fix: `[VAL-1.MEC]` (500 entries, a third FX-derived, five concurrent valuations on real connections) and `[VAL-2.I1]` (empty, all unpriced, all acquired in the period).
- `val-domain.test.ts` adds the contract's property: over 1,000 random collections of up to 500 entries (fast-check, fixed seed), the total equals the BigInt reference sum, and the FX-derived part, each price rounded once from USD (ADD-§2.1), stays within `⌊Σ qty(fx) / 2⌋` of converting the exact sum once.
- Runtime (TG-7), three runs on local Postgres 16: `[VAL-1.MEC]` 410, 452 and 455 ms (the 500-entry Given plus five concurrent valuations); `[VAL-2.I1]` 83, 125 and 96 ms.
- NFR-VAL-2 on the same 500-entry collection, from Stories 12.1–12.2: current value p95 74.1 ms, current value plus the 30-day trend p95 281.2 ms, 365-day history p95 201.3 ms.
