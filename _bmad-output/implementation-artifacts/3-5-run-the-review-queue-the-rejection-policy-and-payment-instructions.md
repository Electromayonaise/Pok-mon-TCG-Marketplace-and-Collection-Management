---
title: 'Story 3.5: Run the review queue, the rejection policy and payment instructions'
type: 'feature'
created: '2026-10-25'
status: 'ready-for-dev'
baseline_commit: '140bd6a1b6b03ae0a7a56b826bc4ec3b9c326ef8'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 8 VER operations throw `NotImplementedError`, so 10 bound tests are red: `listReviewQueue`, `getMyApplicationStatus`, `upsertRejectionReason`, `setRejectionReasonActive`, `listRejectionReasons`, `updatePaymentInstructions`, `getBusinessPaymentInstructions` and `getBusinessName`. Admins have no queue and no reason policy, applicants cannot see their status, and shops cannot edit their payment instructions.

**Approach:** Mostly narrow reads and single-row writes in identity infra. `setActive` follows AD-VER-1 rule 6 exactly, locking every active row in code order, so two deactivations can never empty the policy. The status reads the application's snapshot, never the current reason. Wire the six `verification.*` procedures (decision #24).

## Boundaries & Constraints

**Always:**
- **Queue (S-FR-VER-2):** admin only (`AdminOnly` 403 in the service too). `Pending` rows ordered by `("submittedAt", id)`, 25 per page. The cursor is opaque. A cursor the list did not issue raises `RequestValidationFailed` through the kernel helper. The statement never selects a legal-identity column. Zero writes.
- **Status (S-FR-VER-7):**
  - Built from the latest application's `status`, `reapplyNotBefore` and `reapplyBarred`. With no application, `status: 'none'`.
  - The decision is `allowed` with one new stored-only §13 code per ADD-§1.3 row: `VerificationNone`, `VerificationPending`, `VerificationApproved`, `VerificationRejected`, `VerificationBarred`.
  - Zero writes.
- **Reasons (S-FR-VER-8):**
  - `upsert` inserts or updates the text and policy and never writes `active`. A change writes one `"RejectionReasonChange"` row plus an audit row; a no-op returns `changed: false` and writes nothing.
  - `setActive(code, false)` (rule 6): `SELECT code FROM "RejectionReason" WHERE active ORDER BY code FOR UPDATE`. If `code` is absent, it is a no-op. If it is the only active row, raise `LastActiveReasonRequired` (409). Otherwise deactivate it, with one change row and one audit row.
  - `setActive(code, true)` on an inactive row activates it, with one change row.
  - `list`: every reason, ordered by `code`.
- **Payment instructions (S-FR-VER-9):**
  - `update` requires `sellerTrack = 'business'`, else `NotBusinessAccount` (409), citing `{status}`. It upserts `"BusinessProfile"` with `updatedAt = now` and writes an audit row without the account number.
  - The port returns the instructions only for an `Approved` business, otherwise `null`.
  - An order keeps its own snapshot (AD-9).
- **Name (P-VER.name):** the latest application's `businessName`, or `null`.
- The clock is read once per use case.
- Wire `verification.queue`, `myStatus`, `reasons.list`, `reasons.upsert`, `reasons.setActive` and `updatePaymentInstructions`, with HTTP cases.
- **Deferred item (Story 1.5 review):** the queue keyset uses two statements (first page, after a key) instead of `OR $1 IS NULL`, so the partial Pending index serves both.

**Ask First:** a `requireMessagingEligibility` implementation (MSG-3 belongs to the messaging epic); any DTO or bound-test change.

**Never:** a legal-identity column in any of these reads; reading the current reason for a decided application's status.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Queue | 3 Pending | oldest first | N/A |
| Queue as non-admin | user | — | `AdminOnly` 403 |
| Rejected status | 7-day snapshot | shows `reapplyNotBefore`, `barred: false` | N/A |
| Policy edited later | cooldown 30 | date unchanged | N/A |
| Deactivate 1 of 2 | `Fraud` | `{active: false, changed: true}`, one change row | N/A |
| Race on the last 2 | two deactivations | one stays active | the loser `LastActiveReasonRequired` 409 |
| Edit instructions | business | the order snapshot unchanged | N/A |
| Individual edits | individual seller | — | `NotBusinessAccount` 409 |

</frozen-after-approval>

## Code Map

- `src/modules/identity/application/ver.v2.ts` -- the 8 methods
- `src/modules/identity/domain/ver.ts` -- the status-to-code map, the queue cursor codec
- `src/modules/identity/ports/ver.v2.ts` + `infra/pg.ts` -- the reads and writes
- `src/server/composition.ts` + `.test.ts` -- wiring
- `_bmad-output/test-artifacts/atdd/ver_supporting.test.ts` -- the 10 bound tests

## Tasks & Acceptance

**Execution:**
- [ ] `contracts.md` §13 -- the five `Verification*` stored-only codes (es-CO from ADD-§1.3), plus any change code the writes need; regenerate
- [ ] ports + infra -- queue (two statements), status, reasons (rule 6), profile upsert, instructions port, name
- [ ] `application/ver.v2.ts` -- the 8 methods; unit tests for the rule 6 branches, the cursor and `status: 'none'`
- [ ] `composition.ts` + test -- the six procedures

**Acceptance Criteria:**
- Given the 10 bound tests, when `ver_supporting.test.ts` runs, then they pass.
- Given this story `done` and 3.4 not yet, when the red gate runs, then the only unexpected green is 3.4's `[VER-3.I2]`; 3.4 is the next commit (decision #27).

## Verification

**Commands:**
- `npm run lint` -- expected: 0 errors
- `npm run test:unit` -- expected: all pass
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/ver_supporting.test.ts` -- expected: the 10 bound tests pass
