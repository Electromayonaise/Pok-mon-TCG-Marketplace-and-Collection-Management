---
title: Edge-case review — Plan-2 architecture
reviewed: docs/plan-2/planning/ARCHITECTURE.md
skill: bmad-review-edge-case-hunter
date: 2026-09-27
status: triaged — Phase 3 gate, 2026-09-27
---

# Edge-case review — Plan-2 architecture

**Scope.** All of `ARCHITECTURE.md`:
- the AD-SYS rules;
- the 12 module sections: data model, procedures and ADs;
- the event catalog;
- the code registry;
- the job table in §13.

The whole document is in scope, not a diff, so there is no deletion check (skill Step 4). Findings that the adversarial review already covers are not repeated here. That review is [review-arch-adversarial.md](review-arch-adversarial.md) (F-01..F-17).

**Method.** The skill walks every branch and boundary and reports only the paths that have no handling. For an architecture spine, a "path" is one of these:
- a Rule's conditional (0 rows, 1 row, a re-read outcome);
- an implicit member of an enum or state set that a rule does not name;
- a numeric boundary (0, negative, overflow, rounding);
- a data-model column with no constraint for a value the rules assume;
- a scheduled job, including the case where it does not run.

**How to read this file.**
- The findings keep the skill's four fields: `location`, `trigger_condition`, `guard_snippet` and `potential_consequence`. The skill assigns no severity, so this file adds none.
- The **Triage** column is the reviewer's recommendation. The team adopted it in full at the Phase 3 gate on 2026-09-27 (decision log #19).
  - **Accept**: the fix is already applied, at the location given.
  - **Defer**: the finding is real, and a named owner and phase will handle it.
  - **Reject**: the path is in fact handled; the citation shows where.
- Locations are `ARCHITECTURE.md` line numbers **after** the fix. The ids use the prefix `AEC-` so that they do not collide with the UX review's `EC-` ids.

**Counts.** 19 findings: 17 Accept · 2 Defer · 0 Reject.

---

## 1. Input boundaries and data domain

| # | location | trigger_condition | guard_snippet | potential_consequence | Triage |
|---|----------|-------------------|---------------|-----------------------|--------|
| AEC-01 | ARCHITECTURE.md:862 (`InventoryUnit`) | `condition` is NULL or outside the PRD's set | `condition text NOT NULL CHECK (condition IN ('NM','LP','MP','HP','DMG','Sealed'))` | NULLs are distinct in a unique key, so the same copy splits into several stock pools | **Accept** |
| AEC-02 | ARCHITECTURE.md:934 (AD-INV-2 rule 3) | `reserve*` called with `:req ≤ 0` or a non-integer | `assert(Number.isInteger(req) && req >= 1)` before any SQL | A negative decrement increases stock, and the ref's release then removes it again | **Accept** |
| AEC-03 | ARCHITECTURE.md:920 (AD-INV-1 rule 4) | `restock` with `delta = 0` | `z.number().int().refine(d => d !== 0)` → `RequestValidationFailed` | The rule defines only `> 0` and `< 0`, so the handler's behaviour is undefined | **Accept** |
| AEC-04 | ARCHITECTURE.md:1594 (AD-COL-1 rule 5) | The set's `kind=card` entry count is 0 (a sealed-only set) | `if (setCardCount === 0n) return null` | Division by zero, or a `RangeError` from BigInt division | **Accept** |
| AEC-05 | ARCHITECTURE.md:1674 (AD-VAL-2 rule 3) | `V(now) < V(start)`: a negative change on a half-way value | `roundHalfAwayFromZero(num, den)`; tests at ±0.5 | BigInt truncates toward zero, so −2.5 % renders as −2 % while +2.5 % renders as +3 % | **Accept** |
| AEC-06 | ARCHITECTURE.md:1513 (AD-MSG-3 rule 1) | `markRead` with `seq > Conversation.lastSeq` | `SET "lastReadSeq" = LEAST(:seq, c."lastSeq")` | Unread `lastSeq − lastReadSeq` goes negative, and the badge total shrinks | **Accept** |
| AEC-07 | ARCHITECTURE.md:1272 (AD-COM-2 rule 6) | The rate lookup runs on a database with no `CommissionRateSetting` row | Migration seed `{rateBps: 800, effectiveFrom: epoch}` (A-24) | `rateBps` is undefined, so the first deduction throws and every delivery fails | **Accept** (same fix as F-04) |

## 2. Implicit branches and unnamed states

| # | location | trigger_condition | guard_snippet | potential_consequence | Triage |
|---|----------|-------------------|---------------|-----------------------|--------|
| AEC-08 | ARCHITECTURE.md:677 (AD-VER-1 rule 6) | `reasons.setActive(code, false)` on a code that is already inactive | `if (!lockedActive.includes(code)) return noop` | A no-op writes a misleading `RejectionReasonChange` row into an append-only audit table | **Accept** |
| AEC-09 | ARCHITECTURE.md:677 (AD-VER-1 rule 6) | `reasons.upsert` carries `active: false` for the last active reason | `upsert` never writes `active`; only `setActive` does | Bypasses `LastActiveReasonRequired`, leaving no reason with which to reject an application | **Accept** |
| AEC-10 | ARCHITECTURE.md:1251 (AD-COM-1 rule 1) | `apply` finds no `CommissionAccount` row (the approval subscriber failed) | `if (rows.length === 0) throw Unexpected` | A deduction is silently skipped and the order is never charged | **Accept** |
| AEC-11 | ARCHITECTURE.md:1501 (AD-MSG-2 rule 2) | Either side sends into the thread of a `Rejected` business | Raise `NotBusinessAccount` on send | "Read-only" has no code, so the implementation could return a 500 or allow the send | **Accept** |
| AEC-12 | ARCHITECTURE.md:1751 (AD-REP-1 rule 1) | `reviewerId === targetUserId` | `if (actor === target) throw TargetNotFound` | A raw `CHECK` violation reaches the client as `'Unexpected'` | **Accept** |
| AEC-13 | ARCHITECTURE.md:788 (AD-CAT-1 rule 2) | `continue(runId)` on a run that is `Completed` or `Failed` | Re-read; a run that is not `Running` returns `{done:true, status}` | The console loops on `FeedRunInProgress` for a run that has already finished | **Accept** |
| AEC-14 | ARCHITECTURE.md:800 (AD-CAT-1 rule 7) | `start` after a run that was started but never continued (`leaseUntil` is NULL) | `COALESCE("leaseUntil", "startedAt") < :now − 24 h` | The stale-run guard never matches the NULL lease, so the run blocks forever | **Accept** |

## 3. Races, jobs and grants

| # | location | trigger_condition | guard_snippet | potential_consequence | Triage |
|---|----------|-------------------|---------------|-----------------------|--------|
| AEC-15 | ARCHITECTURE.md:1152 (AD-ORD-2 rule 7) | More than 20 expired orders hold the listing's units at the `orders.create` pre-step | `ORDER BY "expiresAt" LIMIT 20` | An unordered limit may skip the oldest holds, and the buyer gets `InsufficientQuantity` while stock is reclaimable | **Accept** |
| AEC-16 | ARCHITECTURE.md:460 (AD-SYS-8 rule 10) | `retention-purge` deletes audit or ledger rows past their retention period | A separate `retention` DB role with `DELETE` only | The revoked `DELETE` grant makes the purge fail, so data is kept past the policy | **Accept** |
| AEC-17 | ARCHITECTURE.md:1604 (AD-COL-2 rule 2) | The collection is deleted while a prompt accept into it is in flight | `SELECT … FROM "Collection" WHERE id=:c AND "ownerId"=:actor FOR SHARE` | Entries are inserted into a collection that no longer exists (an FK error), or into a foreign one | **Accept** (same fix as F-13) |
| AEC-18 | ARCHITECTURE.md:2045 (§14) | A feed row with no TRM on or before its date (`deferredNoFx`) | Persist the deferred rows, and retry them after `trm-fetch` succeeds | The price is missing until the same file is fed again | **Defer**: with the production feed (OQ-9); owner: the team, reviewed in the Phase 4 readiness report. A rerun of the same file already picks the rows up (§15.3). |

## 4. Scheduled work that does not run

| # | location | trigger_condition | guard_snippet | potential_consequence | Triage |
|---|----------|-------------------|---------------|-----------------------|--------|
| AEC-19 | ARCHITECTURE.md:224, 2057 (G-3) | GitHub disables scheduled workflows in a public repository after 60 days with no repository activity | A readiness checklist item: confirm the workflow is enabled, and alert when no tick is logged for 2 h in the window | The system falls back silently to the "G-3 rejected" behaviour: longer expiry and TRM lag, but correct results | **Defer**: to the Phase 4 readiness report (operations checklist); owner: the team |

---

## 5. Summary for the gate

- 17 findings were fixed in place. Three of them overlap adversarial findings and share their fix: AEC-07 with F-04, AEC-14 with F-02, and AEC-17 with F-13.
- Two are deferred, each owned by the team:
  - AEC-18, with OQ-9;
  - AEC-19, in the Phase 4 readiness report.

  The gate confirmed the triage and the owners.
- None needs a PRD-sync edit beyond those already listed in ARCHITECTURE.md §15.2.
