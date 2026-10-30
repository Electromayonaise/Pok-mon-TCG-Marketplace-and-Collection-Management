---
title: 'Story 8.3: Confirm or reject a top-up'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: '9f6844d'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `confirmTopUp`, `rejectTopUp` and `listTopUpQueue` throw `NotImplementedError`. The 5 bound tests are red, and no business can be credited.

**Approach:** COM-2, COM-2.reject and COM-2.queue as written in contracts.md §7 and §15.12, AD-COM-1 rules 1–3 and AD-COM-3 rules 2–3, on the same atomic balance change Story 8.2 builds. The three `commission.admin.*` procedures are wired.

## Boundaries & Constraints

**Always:**
- **P1 in the service too (AD-16):** identity's `requireAdmin(repo, tx, adminId)` in the command's transaction, as ORD's lookup (decision log Impl-1 #32).
- **COM-2, one transaction:**
  1. `UPDATE "TopUpRequest" SET status='Confirmed', "decidedBy", "decidedAt", "updatedAt", version+1 WHERE id AND status='Pending' RETURNING "businessId", "amountCop"`;
  2. on 0 rows, re-read: none → `TopUpNotFound` (404); decided → `TopUpNotPending` (409) citing `{ status, decidedBy, decidedAt }`; nothing else written;
  3. the atomic account update `+amountCop` (0 rows → `Unexpected`, P4) and the `TopUp` ledger entry (`seq`, `balanceAfter`, `topUpRequestId`);
  4. `INSERT "TopUpDecisionLog"`; on a `≤ 0 → > 0` crossing enqueue `CommissionBalanceReplenished`; audit `commission.topUp.confirmed` (`admin`).
- Response: `resumed = before ≤ 0 AND after > 0`; `neededToResumeCop = 1 − balanceAfter` when `balanceAfter ≤ 0`, else null; the decision cites `{ rule: 'FR-COM-3', inputs: { topUpRequestId, amountCop, balanceAfter, resumed, neededToResumeCop } }` under `TopUpConfirmed` (balance > 0) or `TopUpConfirmedBelowZero`.
- **COM-2.reject:** the same conditional update to `Rejected` with `rejectionReason` (10–300 chars, else `rejectRequest`), the same 0-row mapping, the decision log row and audit `commission.topUp.rejected`; no ledger, no balance change, no event. Decision `TopUpRejected`.
- **COM-2.queue:** admin; `Pending` requests oldest first by `("submittedAt", id)` (the `top_up_queue` index), 25 per page, keyset cursor.
- **NFR-COM-3:** `[NFR-COM-3.topUp]` in `com3_latency.test.ts` — 500 measured confirmations, p95 ≤ 800 ms — bound to this story.
- **§13 stored-only rows:** `TopUpConfirmed`, `TopUpConfirmedBelowZero`, `TopUpRejected`.
- **src tests:** `com.v2.test.ts` covers the reject race, a non-admin `AdminOnly`, the queue cursor, and a confirmation racing a deduction (gapless seq); `composition.test.ts` adds HTTP cases.

**Ask First:** a DTO or bound-test change.

**Never:** a credit outside this path (AD-COM-3 rule 1); an update or delete of `"TopUpDecisionLog"` or `"CommissionLedgerEntry"`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 100,000 on 0 | Exhausted | 100,000, resumed, one Replenished | N/A |
| 20,000 on −25,000 | Exhausted | −5,000, needs 5,001, no event | N/A |
| Two admins | one Pending | one credit, one log row | `TopUpNotPending` 409 |
| Reject | Pending | Rejected with reason, no ledger | N/A |
| Queue | one Pending, one Confirmed | the Pending only | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/commission/ports/com.v2.ts` + `infra/pg.ts` -- conditional decisions, re-read, decision log, queue
- `src/modules/commission/application/com.v2.ts` -- `confirmTopUp`, `rejectTopUp`, `listTopUpQueue`
- `src/server/composition.ts` (+ test) -- three admin procedures
- `com3_latency.test.ts`, `nfr-evidence.md`, `epics.source.mjs` / `epics.md`, `contracts.md` §13

## Tasks & Acceptance

**Execution:**
- [x] repository, the three operations; §13 rows and the generator
- [x] procedures with HTTP cases; src tests
- [x] the benchmark half and `nfr-evidence.md`
- [x] `sprint-status.yaml` -- 8.3 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 8.3 `done`, when the 5 bound tests and `[NFR-COM-3.topUp]` run, then they pass. Story 8.4's `[COM-2.P2]`, `[COM-2.P3]` and `[COM-2.reject.f]` are early greens, restored by the 8.4 commit.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/com_contracts.test.ts -t "COM-2"` -- expected: pass

## Implementation Notes

- Code review is batched with the rest of Epic 8 at its close (decision #22).
- The three §13 rows (`TopUpConfirmed`, `TopUpConfirmedBelowZero`, `TopUpRejected`) landed with Story 8.1's generator run, together with the other five COM rows.
- The decision row's repository method is `insertTopUpDecisionLog`: VER already offers an `insertDecisionLog` on the one repository (R-14), which refuses two adapters with one method name.
- `TopUpNotPending` cites `{ status, decidedBy, decidedAt }` from the re-read under `AD-COM-3`; the status token is the stored English value inside the Spanish template, the repo-wide convention.
- The confirmation's admin check and the queue's run in COM's own transaction through identity's `requireAdmin` (AD-16, decision #32).
- A src test races a confirmation against two deductions on one account 20 times: the seq stays `1..3` and the balance is the ledger's sum.
- Measured: `[NFR-COM-3.topUp]` p95 3.1 ms (p50 2.0).
