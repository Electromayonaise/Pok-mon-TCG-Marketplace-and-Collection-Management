---
title: 'Story 10.3: Accept the last unit from two sessions'
type: 'feature'
created: '2026-10-30'
status: 'draft'
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

**Problem:** `TrdServiceV2.acceptOffer` and `getHandoff` throw `NotImplementedError`: the seller cannot accept, and R-08 (P0, two accepts on the last unit) is unproven.

**Approach:** TRD-1 and S-FR-TRD-3.handoff as written in contracts.md §8/§15 and AD-TRD-2: one transaction in lock order, then exactly one post-commit handoff.

## Boundaries & Constraints

**Always:**
- P1 visibility (the seller only may accept: a proposer gets `NotYourTurn` when it is the seller's turn — the turn rule). Q1 order: `trd:seller` lock → conditional `Open → Accepted` (`turn='seller' AND version AND "expiresAt" > now`; 0 rows → the D4 mapper, citing the derived status) → `getTradeability(tx)` → `reserveForTrade(tx, 1)` → store `reservationRef`, round `accept` → siblings on `exhaustedListingIds` `Open → Unfulfillable` (`ListingNoLongerAvailable`), a `markedUnfulfillable` round each, `roundCount` unchanged → `TradeAccepted` (no delivery row) → audits (`trading.offer.accepted`, one `trading.offer.unfulfillable` per sibling).
- Q-fail: a P5/P6 refusal rolls back; a follow-up transaction takes the lock and marks the own offer `Unfulfillable` (no-op if not Open), then rethrows.
- Q2: after commit, one `listings.generateContactMessage({ kind: 'trade', listingId, requesterId: proposerId, tradeSummary, ipHmac: null })`; a throw → `handoff: null`, the accept stands.
- **D3 (needs approval):** `TradeSummaryDTO` needs item names, but trading holds only `itemRef`s and may not import `catalog`. P-CAT.refs / P-INV.refs resolved rows gain an optional `name` that catalog always fills (it already reads the entry); listings delegates unchanged. trading names each item from it, falling back to the `itemRef` when absent (only test fakes omit it). Amend contracts.md §15.11 P-CAT.refs and P-INV.refs.
- **D6 (listings side):** the trade path of `generateContactMessage` raises `Unexpected` for an empty summary or a cash that is not a safe integer in 0–100,000,000 (defence in depth); closes the Epic 9 deferral with 10.1's `checkTerms`.
- **getHandoff:** a party to an `Accepted` offer → the same deterministic call from the stored terms; zero trading writes. **D5 (needs approval):** a non-`Accepted` offer → `TradeNotAccepted` (409); add it to `trading.handoff`'s errors in `operations.json` and to the §13 sources.
- Decisions: `TradeOfferAccepted` (stored-only §13), `{ rule: 'FR-TRD-4', inputs: { offerId, listingId, reservedQty: 1 } }`.
- Wiring: `trading.accept`, `trading.handoff` with the real listings. **NFR-TRD-2:** `[NFR-TRD-2.accept]` in `trd2_latency.test.ts`, p95 ≤ 800 ms, bound to 10.3. `[TRD-1.MEC]` runs 100 repetitions; its runtime is recorded here (TG-7).

**Ask First:** SERIALIZABLE; any bound-test change.

**Never:** a second `TradeAccepted`; a reservation on a non-Accepted offer (CHECK).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Accept | seller's turn, stock 1 | Accepted, reservation, 1 event, 1 handoff | N/A |
| Last unit, two accepts × 100 | race | 1 Accepted, 1 Unfulfillable, stock 0 | `InsufficientQuantity` / `TradeOfferNotOpen` |
| Handoff throws | after commit | `handoff: null`, stays Accepted | N/A |
| Stock 0 | — | own offer Unfulfillable | `InsufficientQuantity` |

</frozen-after-approval>

## Code Map

- `src/modules/trading/**` -- accept, follow-up, siblings, handoff summary
- `src/modules/catalog/{dto,application}`, `src/modules/listings/application/contact.v2.ts` (+ tests) -- D3 name, D6 guard
- `src/server/composition.ts`, `operations.json`, `contracts.md` (§13, §15.11), `nfr/trd2_latency.test.ts`, `nfr-evidence.md`

## Tasks & Acceptance

**Execution:**
- [ ] accept + handoff + src tests; D3/D5/D6; wiring; benchmark
- [ ] `sprint-status.yaml` -- 10.3 `done`

**Acceptance Criteria:**
- Given 10.3 `done`, when `[TRD-1.Q1]`, `[TRD-1.Q3]`, `[TRD-1.F1]`, `[TRD-1.I1]`/`[TRD-1.MEC]`, `[NFR-TRD-2.accept]` run, then they pass; 10.4's `[TRD-1.P2]`–`[TRD-1.P6]` and 10.5's `[S-FR-TRD-9.f]` turn green too (D1, D2).

## Verification

- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/trd_contracts.test.ts -t "TRD-1"`
