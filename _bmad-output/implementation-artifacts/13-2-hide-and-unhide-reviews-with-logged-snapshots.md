---
title: 'Story 13.2: Hide and unhide reviews with logged snapshots'
type: 'feature'
created: '2026-10-30'
status: 'done'
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

**Problem:** `RepServiceV2.hideReview` and `unhideReview` throw `NotImplementedError`: an admin cannot take an abusive review out of view, nor undo a mistaken hide.

**Approach:** REP-2 and its mirror REP-2.unhide as written in contracts.md §12 and AD-REP-3 rules 1–2, over the `"Review"` and `"ReviewModerationLog"` tables (DELETE already revoked, AD-12).

## Boundaries & Constraints

**Always:**
- P1 `admin` is the procedure builder's (`[SYS-8.R2]`). P2 (both commands): `reasonCode = 'Other'` needs a note of 10–500 characters, any other reason a null note or 0–500 → `RequestValidationFailed` through the kernel's `rejectRequest`, before any read (D4 applies to the note).
- Hide, one transaction: Q1 `UPDATE … SET "hiddenAt" = :now, "hiddenReason", "hiddenBy", "updatedAt" = :now, version = version + 1 WHERE id AND "hiddenAt" IS NULL RETURNING rating, text`. On 1 row: one log row (`action: 'hide'`, snapshots), audit `reviews.review.hidden` (`actorKind: 'admin'`), decision `ReviewHidden` (outcome `hidden`, `{ rule: 'FR-REP-4', inputs: { reviewId, reasonCode } }`). On 0 rows: re-read `hiddenAt`, `hiddenBy`; none → `ReviewNotFound` (P3); else the no-op `ReviewAlreadyHidden` (outcome `allowedWithNotice`, citing `{ hiddenAt, hiddenBy }`), zero writes. Two racing admins: the loser's UPDATE waits on the row lock and matches 0 rows (I2).
- Unhide, the mirror: `WHERE "hiddenAt" IS NOT NULL`, clearing the three columns; the log row is `action: 'unhide'` with the request's reason and note and the same snapshots; audit `reviews.review.unhidden`; decision `ReviewUnhidden` (outcome `allowed`, `FR-REP-4`). 0 rows on a visible review → the no-op `ReviewNotHidden` (outcome `allowedWithNotice`, `FR-REP-4`), zero log rows.
- **D5:** the four codes above are stored-only §13 rows whose templates interpolate no reason token (AD-SYS-1 rule 6).
- **D3 (NFR-REP-2):** `[NFR-REP-2.nextRead]` in a new `_bmad-output/test-artifacts/nfr/rep2_latency.test.ts`, bound to 13.2: 500 cycles of a hide followed by REP-3's read on the §3 seed; every read reflects the hide, and the read's p95 is ≤ 300 ms. The full profile read stays with Story 13.5 (`[S-FR-REP-7.h]`). **D2:** `[REP-2.P2]` and `[REP-2.P3]` move from 13.6 to this story. Wiring: `reputation.admin.hide`, `reputation.admin.unhide`.

**Ask First:** any bound-test change; a contract or DTO shape change beyond D3–D5.

**Never:** a `DELETE`; a log row on a no-op; an edit path that un-hides.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hide | visible review, Harassment | hidden, 1 log row with snapshots, admin audit | N/A |
| Race | 2 admins | 1 hide, 1 log row, 1 no-op | `allowedWithNotice` {hiddenAt, hiddenBy} |
| Unhide | hidden review | columns cleared, `unhide` log row | N/A |
| Unhide visible | visible | 0 log rows | `allowedWithNotice` |
| Other, short note | 5 characters | zero writes | `RequestValidationFailed` |
| Unknown | ghost id | — | `ReviewNotFound` |

</frozen-after-approval>

## Code Map

- `src/modules/reviews/{ports/rep.v2.ts,infra/pg.ts,application/rep.v2.ts}` + src tests
- `src/server/composition.ts` (+ test); `contracts.md` §13; `messages.generated.ts` (generated)
- D3: `_bmad-output/test-artifacts/nfr/rep2_latency.test.ts`, `nfr-evidence.md`, `epics.source.mjs`/`epics.md`

## Tasks & Acceptance

**Execution:**
- [x] repository + service + src tests; §13 rows; wiring; D2 binding (D3 benchmark: see the notes)
- [x] `sprint-status.yaml` -- 13.2 `done`

**Acceptance Criteria:**
- Given 13.2 `done`, when `[REP-2.Q1]`, `[REP-2.I1]`, `[REP-2.I2]`, `[REP-2.unhide.h]`, `[REP-2.unhide.f]` (and, per D2, `[REP-2.P2]`, `[REP-2.P3]`) run, then they pass.

## Verification

- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/rep_contracts.test.ts -t "REP-2"`

## Implementation Notes

- Code review is batched with the rest of Epic 13 at its close (decision #22). The specs were approved together with D1–D6 (decision log Impl-1 #38).
- One private `moderate` runs both directions: P2 (`checkNote`, through the kernel's `textIssue`: for Other the 10-character minimum counts after trim), then the conditional update `RETURNING rating, text`. On 0 rows the review is re-read: an unknown id is `ReviewNotFound`, and one already in the target state is the no-op `ReviewAlreadyHidden` (citing `{ hiddenAt, hiddenBy }`) or `ReviewNotHidden`, with zero writes.
- The unhide log row carries the request's reason and note, and the same snapshots, since `"ReviewModerationLog"."reasonCode"` is NOT NULL.
- §13 gains `ReviewHidden`, `ReviewAlreadyHidden`, `ReviewUnhidden` and `ReviewNotHidden` (D5). `reputation.admin.hide` and `.unhide` are wired, with an HTTP test (`AdminOnly` 403, and the parser's `RequestValidationFailed` 400).
- D2: `epics.source.mjs` binds `[REP-2.P2]` and `[REP-2.P3]` here; Story 13.6 no longer lists them or REP-2.
- D3: `[NFR-REP-2.nextRead]` measures the read that follows a hide, which is REP-3 (Story 13.3), so the benchmark file and its binding land in the 13.3 commit.
