---
title: 'Story 4.3: Refuse a second live run and quarantine changed kinds'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'd552afa'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 4.3 is in `impl2_scope`, but its 3 bound tests check refusals that Stories 4.1 and 4.2 must build anyway:
- a second start while a run is live;
- a continue on a lease another caller holds;
- a row that changes a card's kind.

`[CAT-1.I1]` (Story 4.1) already requires every losing start to be `FeedRunInProgress`. When 4.1 and 4.2 are done, the 3 tests turn green and the red gate fails, because 4.3 is not `done`.

**Approach:** A proof-only story, like Story 3.3 (decision #23). It has no files of its own in `epics.md`. It runs the 3 tests against the code of 4.1 and 4.2, fixes any gap they expose in those files, and marks 4.3 `done` in the commit right after 4.2. It leaves `impl2_scope` with a note, as 3.3 and 3.4 did (decision #27).

## Boundaries & Constraints

**Always:**
- The bound tests are the spec: `[CAT-1.QF1]`, `[CAT-2.ingress.f]`, `[CAT-2.QF1]`.
- **The refusals are atomic:**
  - a refused start leaves exactly the one live run, and no audit row of its own;
  - a refused continue leaves the holder's lease and token unchanged;
  - a `KindChanged` row leaves the entry's `kind` and every attribute unchanged, and writes no revision.
- `FeedRunInProgress` cites `{runId, startedAt}` of the live run, for both the start and the continue.
- Any fix lands in the files of 4.1 or 4.2 and is listed in this file's notes.
- Remove 4.3 from `impl2_scope` in `sprint-status.yaml`, with a comment.

**Ask First:** a fix that changes the shape of a 4.1 or 4.2 response.

**Never:** a change to the bound tests; a new production file.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Start while live | run1 `Running` 1 h | still one run | `FeedRunInProgress` 409 `{runId: run1}` |
| Continue on a held lease | lease until now + 60 s | lease unchanged | `FeedRunInProgress` 409 |
| Kind changed | `card` → `sealedProduct`, row 7 | `KindChanged` row 7, entry still `card` | N/A |

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/cat_contracts.test.ts` -- the 3 bound tests
- `src/modules/catalog/application/cat.v2.ts` -- where any gap is fixed
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- `impl2_scope`

## Tasks & Acceptance

**Execution:**
- [x] run the 3 tests on the 4.2 tree; fix any gap in the 4.1 or 4.2 files
- [x] `sprint-status.yaml` -- 4.3 `done`, out of `impl2_scope`

**Acceptance Criteria:**
- Given 4.1, 4.2 and 4.3 `done`, when `npm run test:ci` runs, then every gate is green, including `gate:atdd-red:impl1`.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/cat_contracts.test.ts` -- expected: the 14 tests of 4.1–4.3 pass
- `npm run test:ci` -- expected: exit 0

## Implementation Notes

- Code review is batched with the rest of Epic 4 at its close (decision #22).
- The 3 bound tests passed on the Story 4.2 tree (commit `d05e880`) with no change. No gap needed a fix in the files of 4.1 or 4.2.
- Each refusal and where it is built:
  - `[CAT-1.QF1]`: the savepoint insert in `startFeedRun`. A 23505 re-reads the live run and raises `FeedRunInProgress` with `{runId, startedAt}`. The transaction rolls back, so the refused start leaves no audit row (Story 4.1).
  - `[CAT-2.ingress.f]`: the lease claim in `continueFeedRun` matches 0 rows, so the holder's lease and token are never written. The re-read raises `FeedRunInProgress` (Story 4.1).
  - `[CAT-2.QF1]`: the kind check before the upsert in `upsert` (Stories 4.1 and 4.2). The unit test "a kind change with new attributes writes neither the attributes nor a revision" covers the attributes and the revision.
- 4.3 leaves `impl2_scope` with a note in `sprint-status.yaml`. Like 2.4, 3.3 and 3.4, it is `done` early and does not count toward the 43 Impl-1 stories.

### Review Findings

Epic 4 close review (2026-10-27, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `d552afa..3cd2cff` (code paths). Totals for the epic: 2 decisions, 18 patches, 3 deferrals, 14 dismissed.

- No findings of its own. The three refusals it proves are covered by the Story 4.1 and 4.2 findings: the lease release and the rule-2 citation for the continue refusal, and the raw row for `KindChanged`.
