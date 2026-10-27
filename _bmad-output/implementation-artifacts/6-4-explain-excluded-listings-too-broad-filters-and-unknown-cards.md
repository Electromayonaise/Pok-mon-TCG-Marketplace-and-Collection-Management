---
title: 'Story 6.4: Explain excluded listings, too-broad filters and unknown cards'
type: 'feature'
created: '2026-10-27'
status: 'ready-for-dev'
baseline_commit: 'e143f13'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 6.4 is in `impl2_scope`, but its 3 bound tests check clauses that Stories 6.2 and 6.3 must build anyway:
- `[DSC-1.Q4]` checks `excluded` and `decision`, two required fields of `SearchResponse` that DSC-1 Q4 defines;
- `[DSC-1.P2]` checks DSC-1 P2, which runs before 6.2's statement;
- `[DSC-2.P1]` checks DSC-2 P1, the first step of 6.3's `getCardDetail`.

Once 6.2 and 6.3 are done, the 3 tests turn green and the red gate fails. Built without them, they would fail for a reason other than NotImplemented, which the gate also refuses.

**Approach:** A proof-only story, like 4.3, 5.3 and 5.4 (decisions #23, #29, #30). It runs the 3 tests against 6.2's and 6.3's code, fixes any gap in their files, and is committed right after 6.3. It leaves `impl2_scope` with a note and does not count toward the 43 Impl-1 stories. Its NFR-DSC-1 DoD line is met by 6.2's benchmarks.

## Boundaries & Constraints

**Always:**
- The bound tests are the spec: `[DSC-1.Q4]`, `[DSC-1.P2]`, `[DSC-2.P1]`.
- `ListingLocationUnusable` cites `FR-DSC-3` with the count; `SearchFilterTooBroad` (400) cites `threshold: 20000` before any statement; `CatalogEntryNotFound` (404) leaves exactly one call.
- Remove 6.4 from `impl2_scope` in `sprint-status.yaml`, with a comment.

**Ask First:** a fix that changes the shape of a 6.2 or 6.3 response.

**Never:** a change to the bound tests; a new production file.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No coordinates | one null, one at 1 km | 1 result, unusable 1 | N/A |
| Too broad | `pokemon: Pikachu` → `tooBroad` | — | `SearchFilterTooBroad` 400 |
| Unknown card | ghost id, area null | — | `CatalogEntryNotFound` 404, calls `['getEntry']` |

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/dsc_contracts.test.ts` -- the 3 bound tests
- `src/modules/listings/application/dsc.v2.ts` -- where any gap is fixed

## Tasks & Acceptance

**Execution:**
- [ ] run the 3 tests on the 6.3 tree; fix any gap in 6.2's and 6.3's files
- [ ] `sprint-status.yaml` -- 6.4 `done`, out of `impl2_scope`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 6.4 `done`, when the whole `dsc_contracts.test.ts` runs, then its 15 tests pass and `npm run gate:atdd-red:impl1` reports 0 not as expected.
