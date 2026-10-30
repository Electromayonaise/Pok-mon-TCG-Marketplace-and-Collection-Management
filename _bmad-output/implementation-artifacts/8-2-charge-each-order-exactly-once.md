---
title: 'Story 8.2: Charge each order exactly once'
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

**Problem:** `applyOrderDeduction` and the three pure domain functions throw `NotImplementedError`. The 7 bound tests (two MEC proofs, R-07 P0) are red, and a closed or business-confirmed order charges nothing.

**Approach:** COM-1 as written in contracts.md §7, AD-COM-1 rules 1–3, AD-COM-2 and AD-SYS-3 rule 2. The `commission` subscriber of Story 8.1 routes `OrderPaymentConfirmedByBusiness` and `OrderClosed` to it, from the envelope's payload only (AD-9).

## Boundaries & Constraints

**Always:**
- **Domain (pure, BigInt):** `commissionTrigger(facts)` = the earlier non-null fact, `businessConfirmed` on a tie or with no item fact, else `buyerClosed`; both null → `Unexpected` (P2). `commissionOf(total, bps) = (total × bps + 5000n) / 10000n`. `crossing(before, after)`.
- **COM-1, in the handler `tx`:**
  1. the trigger; `rateBps` from the `"CommissionRateSetting"` with the greatest `"effectiveFrom" ≤ commissionTriggeredAt` (never `now`); `c = commissionOf`;
  2. Q2: the non-locking `SELECT 1 … WHERE "orderId" AND kind='Deduction'` → `{ outcome: 'duplicate' }`, zero writes;
  3. `SAVEPOINT apply_deduction`; the atomic account `UPDATE … RETURNING "balanceCop", "ledgerSeq"`; 0 rows (P3, no account) → `UnexpectedError`, so the delivery is `failed` and replayable;
  4. `INSERT "CommissionLedgerEntry"` (Deduction, `seq = ledgerSeq`, `balanceAfter`, the pricing) `ON CONFLICT ("orderId") WHERE kind='Deduction' DO NOTHING RETURNING id`; no row → `ROLLBACK TO SAVEPOINT`, `duplicate`; otherwise `RELEASE SAVEPOINT`;
  5. on a `> 0 → ≤ 0` crossing, enqueue `CommissionBalanceExhausted { businessId, ledgerSeq, balanceAfter }`; audit `commission.deduction.applied` (`system`) with the Q4 explanation inputs `{ orderId, baseCop, rateBps, amountCop, trigger, commissionTriggeredAt }`.
- A deduction is never refused; the balance may go negative (AD-19). `c = 0` still writes the entry. The Clock is read once, for `createdAt`.
- **NFR-COM-3 benchmark** (`_bmad-output/test-artifacts/nfr/com3_latency.test.ts`, shared harness, real composition): `[NFR-COM-3.deduction]` — 50 warm-up and 500 measured handler calls, p95 ≤ 200 ms — bound to this story in `epics.source.mjs` / `epics.md`, as #29–#31 bound theirs. Refresh the COM rows of `nfr-evidence.md`.
- **src tests:** `com-domain.test.ts` covers the trigger table, the rounding edges and `crossing`; `com.v2.test.ts` covers a zero-amount deduction and the handler routing of both events.

**Ask First:** a DTO or bound-test change; a different lock order (account row, then ledger row).

**Never:** a float or `Math.round` on money (NFR-COM-4); a rate chosen by processing time; a read of an `orders` table.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Business confirms 45,000 | funded 50,000 | 3,600, seq 1, 46,400, audit | N/A |
| Crossing | 3,000 | −600, one Exhausted | N/A |
| Redelivery | entry exists | `duplicate`, zero writes | N/A |
| 12,345 × 800 | any | 988; any other amount refused by CHECK | N/A |
| Both events at once | 100 × | one line, one decrement | loser `duplicate` |
| No account | Approved, unopened | nothing written | `Unexpected`, replayable |

</frozen-after-approval>

## Code Map

- `src/modules/commission/domain/com.ts` -- `commissionTrigger`, `commissionOf`, `crossing`
- `src/modules/commission/ports/com.v2.ts` + `infra/pg.ts` -- rate lookup, deduction check, `applyBalanceChange`, ledger insert
- `src/modules/commission/application/com.v2.ts` -- `applyOrderDeduction`
- `src/server/composition.ts` -- the subscriber routes the two order events
- `_bmad-output/test-artifacts/nfr/com3_latency.test.ts`, `nfr-evidence.md`, `epics.source.mjs` / `epics.md`

## Tasks & Acceptance

**Execution:**
- [x] domain functions and src domain tests
- [x] repository and `applyOrderDeduction`; the subscriber routes
- [x] the benchmark, its binding and `nfr-evidence.md`
- [x] `sprint-status.yaml` -- 8.2 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 8.2 `done`, when the 7 bound tests and `[NFR-COM-3.deduction]` run, then they pass; `[COM-1.MEC]` and `[COM-1.MEC2]` run 100 repetitions each against Postgres and their runtimes are recorded here (TG-7). Story 8.4's `[COM-1.P3]` is an early green, restored by the 8.4 commit.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/com_contracts.test.ts -t "COM-1"` -- expected: pass
- `timeout 300 npx vitest run --project solu2-nfr _bmad-output/test-artifacts/nfr/com3_latency.test.ts` -- expected: p95 ≤ 200 ms

## Implementation Notes

- Code review is batched with the rest of Epic 8 at its close (decision #22).
- The concurrent duplicate follows contracts.md §7 Q2: a `SAVEPOINT apply_deduction` around the account update and the insert, and `ROLLBACK TO SAVEPOINT` when the insert returns no row, so the handler's `tx` (and the delivery row) commits. ARCHITECTURE AD-COM-2 rule 3 describes the older sentinel-and-rollback form; the contract is the newer text.
- The rate is read by `commissionTriggeredAt`, never by `now`, and only after the duplicate check, so a redelivery reads one row.
- The handler routes both order events by the shared payload fields (AD-9); `OrderClosed`'s nullable business fact and `OrderPaymentConfirmedByBusiness`'s nullable item fact both reach `commissionTrigger` as given.
- The audit row carries the Q4 explanation (`rule` is `FR-COM-4` for a `buyerClosed` trigger, else `FR-COM-5`) with the ledger seq and the balance after.
- **TG-7 runtimes** (local Postgres 16, `fsync=off`): `[COM-1.MEC]` 100 repetitions in 4,148 ms; `[COM-1.MEC2]` 100 repetitions in 1,974 ms.
- Measured: `[NFR-COM-3.deduction]` p95 3.3 ms (p50 1.9).
