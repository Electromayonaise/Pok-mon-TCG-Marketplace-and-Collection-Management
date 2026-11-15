---
title: 'Story 8.5: Reconcile ledgers and report, never repair, discrepancies'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: 'bccc1f3'
review_loop_iteration: 0
flow: 'Impl-2 Flow A + Flow D, ATDD-first (test-design.md §7.1): red tests and the NFR-COM-2 benchmark committed before any reconcile code; one code review per epic batch (decision log Impl-2 #4)'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Impl-1 left COM-3 and COM-3.last unbuilt (`deferred-work.md`, Epic 8 spec). Nothing checks that each commission balance equals its ledger's sum and that the ledger's seqs have no gap (AD-COM-1 rule 4), the `commission-reconcile` job answers a failed run, and NFR-COM-2 (difference 0 over 10,000 operations with 20 % duplicates) had no measurement.

**Approach:** `ComServiceV2.reconcile` and `getLastReconciliation`, a pure `accountDiscrepancies` in the domain, and the two admin procedures. Decisions approved by Mateo (decision log Impl-2 #13):
- **Bound:** the all-accounts run checks accounts in ascending `businessId` until 50 s of Clock time have passed; its decision then cites `partial: true` with `accountsChecked` (`ReconciliationPartial`), and the next run starts again from the first account (no schema change);
- **Tests:** `[COM-3.C1]`, `[COM-3.C2]` and `[NFR-COM-2.drift]` join the six Solu-2 tests.

Story 1.6's job route already calls `com.reconcile({ businessId: null, actor: { kind: 'job' } })` with `singleFlight: 'work'`: the lock is COM-3 P2's, taken inside reconcile.

## Boundaries & Constraints

**Always:** each account in its own transaction, the account `FOR SHARE` before its ledger sums (Q1); one `ReconciliationRun` row and its audit row, nothing else written (Q2, Q3, I2); the job path holds `job:commission-reconcile` for the whole run, else `{ skipped: 'runInProgress' }` (P2); an unknown business is an explained notice, not an error (Q4); values as decimal strings. **Ask First:** a resume cursor, or any repair. **Never:** reconcile writing `"CommissionAccount"`, `"CommissionLedgerEntry"` or `"TopUpRequest"`; a second lock in the route.

</frozen-after-approval>

## Code Map

- `src/modules/commission/domain/com.ts` -- `Discrepancy`, `accountDiscrepancies`, `RECONCILE_BATCH_MS`; unit tests in `src/modules/commission/com-domain.test.ts`
- `src/modules/commission/application/com.v2.ts` -- `reconcile`, `reconcileRun`, `reconcileDecision`, `getLastReconciliation`; `com.v2.test.ts` -- the 50 s bound with an advancing Clock, the job's audit row, AdminOnly first, a discrepancy's citation, an empty last run
- `src/modules/commission/ports/com.v2.ts` + `infra/pg.ts` -- the job lock, the account list, `FOR SHARE`, the ledger totals (Σ, count, highest seq), the run row and its read
- `src/server/composition.ts` -- `commission.reconcile` and `commission.admin.lastReconciliation`; `src/server/composition.test.ts` -- both over HTTP
- `contracts.md` §13 -- the stored-only codes `ReconciliationClean`, `ReconciliationDiscrepancies`, `ReconciliationAccountNotFound`, `ReconciliationPartial`; `src/shared-kernel/messages.test.ts` -- their placeholders join the allow-list (`businessId` an id, `accountsChecked` a number, `expected` and `actual` decimal strings; `rateBps` for Story 8.6's `CommissionRateScheduled`)
- `_bmad-output/test-artifacts/atdd/com_contracts.test.ts`, `atdd/com_reconcile.test.ts`, `nfr/com2_drift.test.ts` -- the 9 bound tests (red first)

## Tasks & Acceptance

**Execution:**
- [x] red: `[COM-3.C1]`, `[COM-3.C2]`, `[NFR-COM-2.drift]`, COM-3's batch bound, R-23 in `test-design.md` §2; red run in `evidence/impl2/14-story-8.5-red.log`
- [x] green: the domain check, the service, the repository methods, the §13 codes, the two procedures, NFR-COM-2 green in `nfr-evidence.md`
- [x] `npm run test:ci` green with 8.5 `done`

**Acceptance Criteria:**
- Given a consistent account, when reconciliation runs, then 0 discrepancies, one run row and `ReconciliationClean`; the run is the last one on page 7.4.
- Given a tampered balance or a seq gap, when it runs, then `balanceMismatch` (`expected` the ledger's Σ, `actual` the stored balance) or `seqGap`, and nothing is repaired.
- Given an unknown business, then 0 accounts checked with `ReconciliationAccountNotFound`; given a held job lock, then the job path is `{ skipped: 'runInProgress' }`.
- Given 50 concurrent deductions, 20 times, then every reconcile reports 0 discrepancies; given 10,000 seeded operations with 19 % duplicate deliveries, then 0 discrepancies and the balance is the ledger's sum.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd com_reconcile.test.ts com_contracts.test.ts -t COM-3` -- expected: the 8 bound ATDD tests pass
- `npx vitest run --project solu2-nfr com2_drift.test.ts` -- expected: 1 passed (about 170 s)
- `npm run test:ci` -- expected: exit 0

**Red phase (Flow A + D):** `evidence/impl2/14-story-8.5-red.log`: the 9 bound tests fail on `NotImplemented` (`[COM-3.C2]` through the failed JobRun's `errorCode`).

**Green phase:** `evidence/impl2/15-story-8.5-green.log`: `test:ci` exit 0; `solu2-atdd:` 22 red for the right reason, 345 green, 0 not as expected; `solu2-nfr:` 24 green, 0 not as expected. The first full gate failed twice on the story's own new tests: `messages.test.ts`'s placeholder allow-list lacked the new codes' placeholders (added), and `[SYS-6.R1]` read a test variable called `now()` as a wall-clock call (renamed).

## Implementation Notes

- **Two paths, one run:** the admin path checks the flag first in a read-only transaction (AD-16) and writes the run in a transaction of its own; the job path takes `pg_try_advisory_xact_lock` in an outer transaction and writes the run row in that same transaction, so the lock is released only when the run has committed. The per-account transactions run on other connections beside it.
- **Q1:** the account read is `FOR SHARE` in a read-write transaction (Postgres refuses row locks in a read-only one). An `apply` updates the account before it inserts its entry, so a share lock taken after it waits for its commit, and the ledger statement that follows sees the entry.
- **seqGap:** seqs are unique and ≥ 1 per business, so the ledger is gapless exactly when its count and its highest seq both equal `ledgerSeq`. `expected` is `ledgerSeq`; `actual` is the count, or the highest seq when only that one differs. `ledgerTotals` gained the highest seq for this.
- **Decision:** a partial run is `ReconciliationPartial` first and then one citation per discrepancy; an unknown business is `ReconciliationAccountNotFound`; discrepancies are `ReconciliationDiscrepancies` with one `FR-COM-8` citation each `{ businessId, expected, actual }`; otherwise `ReconciliationClean`. All `allowedWithNotice` except the clean one. The audit row carries the scope, the counts and `partial`, under `actorKind` `admin` or `system`.
- **Time:** the Clock is read once for `now`, and again before each account of an all-accounts run for the 50 s bound.
- **NFR-COM-2:** `[NFR-COM-2.drift]` replays 1,988 top-ups, 6,480 orders and 1,532 duplicate deliveries (19.1 %); 0 discrepancies, the balance equals the ledger's sum.
- **Deferred** (`deferred-work.md`): the restart-from-first bound can leave the last accounts unchecked at scale (launch checklist); an admin all-accounts run runs on the request for up to 50 s (UI 7.4).
