---
title: 'Story 3.3: Refuse incomplete, unsafe and premature applications'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: '140bd6a1b6b03ae0a7a56b826bc4ec3b9c326ef8'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 3.3 is in `impl2_scope`, but its 6 bound tests exercise refusals that Stories 3.1 and 3.2 must build anyway: an application with no document, a key outside quarantine, the half-open cooldown, an unknown application, a decided one and an inactive reason. When 3.1 and 3.2 are done, these tests turn green and the red gate fails, because 3.3 is not `done`.

**Approach:** A proof-only story, like Story 1.3 (decision #23). It has no files of its own in `epics.md`. It runs the 6 tests against the code of 3.1 and 3.2, fixes any gap they expose in those files, and marks 3.3 `done` in the commit right after 3.2. Decision #27 moves it out of `impl2_scope`.

## Boundaries & Constraints

**Always:**
- The bound tests are the spec: `[VER-2.P1]`, `[VER-2.P3]`, `[VER-2.P7]`, `[VER-1.P2]`, `[VER-1.P3]`, `[VER-1.P4]`.
- **The refusals are atomic.**
  - P1 and P3 fail before any transaction, so `sellerTrack` stays null and no row exists.
  - VER-1 P3 and P4 write zero rows in `"ApplicationDecisionLog"`, `"OutboxEvent"` and `audit_events`.
  - P4 leaves the application `Pending`.
- **The cooldown is half-open:** refused at `reapplyNotBefore − 1 s`, citing `{reapplyNotBefore}`, and accepted at exactly `reapplyNotBefore`.
- Any fix lands in the files of 3.1 or 3.2 and is listed in this file's notes.
- Remove 3.3 from `impl2_scope` in `sprint-status.yaml`, with a comment pointing to decision #27.

**Ask First:** a fix that changes the shape of a 3.1 or 3.2 response.

**Never:** a change to the bound tests; a new production file.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No documents | `[]` | nothing written | `MissingRequiredField` 400, `{fields: 'documentUploadKeys'}` |
| Key outside quarantine | `business-document/<id>/nope` | `sellerTrack` null | `InvalidDocumentFile` 400, cause `missing` |
| 1 s early | `now = T − 1 s` | — | `ReapplicationCooldownActive` 409, `{reapplyNotBefore: T}` |
| Exactly on time | `now = T` | Pending | N/A |
| Unknown application | approve `nope` | — | `ApplicationNotFound` 404 |
| Decided application | approve twice | zero new rows | `ApplicationNotPending` 409, names who and when |
| Inactive reason | reject with `Fraud` | still Pending | `RejectionReasonUnknown` 409 |

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/ver_contracts.test.ts` -- the 6 bound tests
- `src/modules/identity/application/ver.v2.ts` -- where any gap is fixed
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- `impl2_scope`

## Tasks & Acceptance

**Execution:**
- [x] run the 6 tests on the 3.2 tree; fix any gap in the 3.1 or 3.2 files
- [x] `sprint-status.yaml` -- 3.3 `done`, out of `impl2_scope` (decision #27)

**Acceptance Criteria:**
- Given 3.1, 3.2 and 3.3 `done`, when `npm run test:ci` runs, then every gate is green, including `gate:atdd-red:solu2`.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/ver_contracts.test.ts` -- expected: the 14 tests of 3.1–3.3 pass
- `npm run test:ci` -- expected: exit 0

## Implementation Notes

- Code review is batched with the rest of Epic 3 at its close (decision #22).
- The 6 bound tests passed on the Story 3.2 tree (commit `0bce787`) with no change. No gap needed a fix in the files of 3.1 or 3.2.
- Each refusal and where it is built:
  - `[VER-2.P1]` and `[VER-2.P3]`: `checkSubmissionShape` and `promoteDocuments`, both before the transaction (Story 3.1).
  - `[VER-2.P7]`: the half-open comparison in `evaluateSubmission` (Story 3.1).
  - `[VER-1.P2]`, `[VER-1.P3]` and `[VER-1.P4]`: `decideApplication`'s first-fail reads (Story 3.2).
- With 3.3 `done`, `gate:atdd-red:impl1` has no unexpected greens left.
