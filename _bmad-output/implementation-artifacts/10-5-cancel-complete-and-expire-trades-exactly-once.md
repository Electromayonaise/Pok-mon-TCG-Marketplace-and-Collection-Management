---
title: 'Story 10.5: Cancel, complete and expire trades exactly once'
type: 'feature'
created: '2026-10-30'
status: 'ready-for-dev'
baseline_commit: '6b3cc16'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** This story is in `impl2_scope`, but one of its 8 bound tests, `[S-FR-TRD-9.f]` (an accept at `now = expiresAt` without the job → `TradeOfferNotOpen` citing Expired), checks TRD-1 P2, which 10.3 builds; with 10.3 done the red gate fails. Its other 7 tests need `cancelTrade`, `confirmCompletion` and `expireDueOffers`. Without cancel, an accepted trade holds its unit forever.

**Approach:** **D2 (approved):** build 10.5 whole with the epic, committed after 10.4:
- **cancelTrade (TRD-3):** visibility → under `trd:seller`, `UPDATE … SET status='Cancelled', "cancelledBy", "cancelledAt", version+1 WHERE status='Accepted' AND both confirmations NULL RETURNING "reservationRef"`; 1 row → `listings.releaseReservation(tx, ref)`, round `cancel`, audit; 0 rows → `TradeNotCancellable` citing `{ status, proposerConfirmedAt, sellerConfirmedAt }`, zero writes.
- **confirmCompletion (S-FR-TRD-7):** `SET "<role>ConfirmedAt" = now WHERE status='Accepted' AND … IS NULL`; re-read → `TradeAlreadyConfirmedByRole` (citing `confirmedAt`) or `TradeNotAccepted`; `completed` computed, never stored; audit.
- **expireDueOffers (S-FR-TRD-9):** per seller with due offers, the lock then a conditional `Open → Expired` for `expiresAt ≤ now`, an audit row (`system`) each; returns `{ expired }`. No jobs route: tick/cron/`JOBS_SECRET`/single-flight stay with the jobs-route item (Stories 4.1, 4.4, 7.5); expiry stays correct at read.
- Wiring: `trading.cancel`, `trading.confirmCompletion`; the "rest stays unwired" HTTP test moves to `messaging.inbox` (9.6). Stored-only §13 rows `TradeCancelled`, `TradeCompletionConfirmed`.

Alternatives: rebind `[S-FR-TRD-9.f]` to 10.3 in `epics.source.mjs` and leave 10.5's 7 tests red; or a gate exception.

## Boundaries & Constraints

**Always:** the bound tests are the spec; leaves `impl2_scope` with a note; counts as an adelantada. **Never:** a double release; a stored `completed`.

</frozen-after-approval>

## Code Map

- `src/modules/trading/**`, `src/server/composition.ts` (+ test)

## Tasks & Acceptance

**Execution:**
- [ ] cancel, confirm, expiry + src tests; wiring; `sprint-status.yaml` 10.5 `done`, out of `impl2_scope`

**Acceptance Criteria:**
- Given 10.5 `done`, when `[TRD-3.Q1]`, `[TRD-3.P1]`, `[TRD-3.P2]`, `[TRD-3.I1]`, `[S-FR-TRD-7.h]`, `[S-FR-TRD-7.f]`, `[S-FR-TRD-9.h]`, `[S-FR-TRD-9.f]` run, then they pass.
