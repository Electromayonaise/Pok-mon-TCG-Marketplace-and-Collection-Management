---
title: 'Story 3.2: Decide an application exactly once'
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

**Problem:** `decideApplication` throws `NotImplementedError`, so the 4 bound tests are red. An admin cannot approve or reject a shop, and the listings and commission modules never hear about it.

**Approach:** A reject first takes a share lock on its active reason. The transition is one conditional `UPDATE … WHERE status='Pending'`. The same transaction writes the decision log row, the audit row and exactly one outbox event. On 0 rows the loser re-reads and names the winner (AD-VER-1 rules 1–5). Wire `verification.approve` and `verification.reject` (decision #24).

## Boundaries & Constraints

**Always:**
- The clock is read once, in one transaction.
- **Order (first-fail):**
  - P2 an unknown id raises `ApplicationNotFound` (404).
  - P3 a decided one raises `ApplicationNotPending` (409), citing `{status, decidedBy, decidedAt}`.
  - P4 for a reject, `SELECT "textEsCo","cooldownDays","barred" FROM "RejectionReason" WHERE code=$1 AND active FOR SHARE`. No row raises `RejectionReasonUnknown` (409), citing `{reasonCode}`.
- **Transition (rule 2):** `UPDATE "BusinessApplication" SET status, "decidedBy", "decidedAt"=now, "updatedAt"=now, version=version+1` plus, for a reject, `"rejectionReasonCode"`, `"rejectionNote"`, and either `"reapplyNotBefore" = now + cooldownDays × 86 400 000 ms` or `"reapplyBarred"=true` (the rule 5 snapshot). The statement ends `WHERE id=$1 AND status='Pending' RETURNING …`.
- **Loser (rule 3):** on 0 rows, re-read. A missing row raises `ApplicationNotFound`, otherwise `ApplicationNotPending` names the winner. No log, audit or event row is written.
- **Same transaction (rule 4):**
  - one `"ApplicationDecisionLog"` row;
  - `audit('verification.application.decided', BusinessApplication:id, decisionCode)` with `actorKind: 'admin'`;
  - one `outbox.enqueue`: `BusinessApplicationApproved {applicationId, businessId, businessName, approvedAt, approvedBy}` (subscribers `commission`, `listings`), or `BusinessApplicationRejected {applicationId, businessId, reasonCode, reapplyNotBefore | barred, rejectedAt}` (subscriber `listings`), as `events.ts` types them.
- **Decision (Q4):** `allowed`, under new stored-only §13 codes `ApplicationApproved` and `ApplicationRejected`, citing `FR-VER-3` or `FR-VER-4` with `{applicationId, reasonCode?, reapplyNotBefore?, barred?}`.
- Wire `verification.approve` and `verification.reject` (admin builder) and add HTTP cases.
- Record the `[VER-1.MEC]` runtime in this file (TG-7).

**Ask First:**
- Any retry on a serialization failure: the conditional `UPDATE` under READ COMMITTED needs none.
- Any DTO or bound-test change.

**Never:** a second event for one application; `SELECT … FOR UPDATE` before the `UPDATE` (rule 2 is the lock); reading the reason's current policy after the decision.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Approve Pending | admin | Approved, `decidedAt = now`, one log row, one audit row, one event to 2 subscribers | N/A |
| Reject with a 7-day reason | `DataMismatch` | `reapplyNotBefore = now + 7 days`, one event to `listings` | N/A |
| Repeated approve | already Approved | no second event | `ApplicationNotPending` 409 |
| Approve vs reject race | ×100 | one transition, one event of the winner's type | the loser 409 naming the winner |
| Unknown id | `nope` | — | `ApplicationNotFound` 404 |
| Inactive reason | `Fraud` inactive | still Pending | `RejectionReasonUnknown` 409 |

</frozen-after-approval>

## Code Map

- `src/modules/identity/application/ver.v2.ts` -- `decideApplication`
- `src/modules/identity/domain/ver.ts` -- the snapshot computation (`reapplyNotBefore`)
- `src/modules/identity/ports/ver.v2.ts` + `infra/pg.ts` -- `lockActiveReason`, `transitionApplication`, `readDecisionState`, `insertDecisionLog`
- `src/shared-kernel/events.ts` -- the two event types
- `src/server/composition.ts` + `.test.ts` -- wiring
- `_bmad-output/test-artifacts/atdd/ver_contracts.test.ts` -- `[VER-1.Q1]`, `[VER-1.Q2]`, `[VER-1.I1]`, `[VER-1.MEC]`

## Tasks & Acceptance

**Execution:**
- [ ] `contracts.md` §13 -- add `ApplicationApproved` and `ApplicationRejected` (stored only) and regenerate
- [ ] ports + infra -- the four repository methods
- [ ] `application/ver.v2.ts` -- `decideApplication`; unit tests for the loser path and the barred snapshot
- [ ] `composition.ts` + test -- approve and reject, with HTTP cases (non-admin 403, admin 200)
- [ ] this file -- the `[VER-1.MEC]` runtime

**Acceptance Criteria:**
- Given the 4 bound tests, when the VER ATDD file runs, then they pass, and the MEC runs 100 repetitions with no half state.
- Given a lost race, when the loser returns, then zero rows in `"ApplicationDecisionLog"`, `"OutboxEvent"` and `audit_events` belong to it.
- Given this story `done`, when the red gate runs, then the only unexpected greens are Story 3.3's; 3.3 is the next commit (decision #27).

## Verification

**Commands:**
- `npm run lint` -- expected: 0 errors
- `npm run test:unit` -- expected: all pass
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/ver_contracts.test.ts` -- expected: the 4 bound tests pass
