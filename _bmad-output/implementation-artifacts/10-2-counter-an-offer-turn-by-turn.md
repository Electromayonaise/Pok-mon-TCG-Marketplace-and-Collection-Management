---
title: 'Story 10.2: Counter an offer turn by turn'
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

**Problem:** `TrdServiceV2.counterOffer` throws `NotImplementedError`: the parties cannot converge on terms turn by turn.

**Approach:** TRD-2 as written in contracts.md §8 and AD-TRD-1 rules 1–3, on 10.1's repository and domain.

## Boundaries & Constraints

**Always:**
- First-fail: P1 visibility → P2 `checkTerms` (`EmptyTradeOffer`) → P3 `resolveItemRefs` (`InvalidItemRef`) → under `trd:seller`, read the offer row and map P4 status/expiry, **D4** version, turn, P7 `roundCount < 10` (`TradeRoundLimitReached`, citing `{ roundCount: 10 }`) → P8 canonical terms equal to the offer's current terms (= the latest proposal round's) → `TradeCounterUnchanged` citing `{ round: roundCount }`.
- **D4 (needs approval):** the re-read maps a stale `version` to `TradeOfferNotOpen` (citing `{ latestRound }`) **before** the turn check. `[TRD-2.I3]` (two tabs, same version: the loser sees the flipped turn) requires it; `[TRD-1.P3]`/`[TRD-2.P5]` keep `NotYourTurn` with a current version. Amend contracts.md TRD-1 P3/P4, TRD-2 P5/P6 and AD-TRD-1 rule 2 to this order, and TRD-2's concurrency line ("a repeated identical counter after success" is `NotYourTurn` only with the refreshed version).
- Q1/Q2: `UPDATE … SET terms, turn=<other>, "roundCount"+1, version+1 WHERE … status='Open' AND turn AND version AND "expiresAt" > now AND "roundCount" < 10 RETURNING`; round `counter` numbered by the new `roundCount`; audit `trading.offer.countered`; no event. 0 rows → the shared mapper, zero writes.
- Q4: decision `TradeOfferCountered` (stored-only §13 row), `{ rule: 'FR-TRD-2', inputs: { offerId, round, turn } }`.
- Wiring: `trading.counter`. **NFR-TRD-2:** `[NFR-TRD-2.counter]` in a new `_bmad-output/test-artifacts/nfr/trd2_latency.test.ts` (shared harness, real composition), p95 ≤ 500 ms, bound to 10.2 in `epics.source.mjs`/`epics.md`.

**Ask First:** SERIALIZABLE; any bound-test change.

**Never:** a round written on a refused counter.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seller counters | turn seller, v0 | v1, turn proposer, round 2 | N/A |
| Two tabs, same v | race | one round | `TradeOfferNotOpen` |
| Round 11 | roundCount 10 | — | `TradeRoundLimitReached` |
| Same terms | equal canonical | — | `TradeCounterUnchanged` |

</frozen-after-approval>

## Code Map

- `src/modules/trading/{domain,ports,infra,application}` -- counter, mapper
- `src/server/composition.ts`; `_bmad-output/test-artifacts/nfr/trd2_latency.test.ts`, `nfr-evidence.md`, `epics.source.mjs`/`epics.md`
- `contracts.md` (TRD-1/TRD-2 order), `ARCHITECTURE.md` (AD-TRD-1 rule 2)

## Tasks & Acceptance

**Execution:**
- [ ] counter + src tests; contract amendment; benchmark + binding; wiring
- [ ] `sprint-status.yaml` -- 10.2 `done`

**Acceptance Criteria:**
- Given 10.2 `done`, when `[TRD-2.Q1]`, `[TRD-2.I3]`, `[NFR-TRD-2.counter]` run, then they pass; 10.4's `[TRD-2.P2]`, `[TRD-2.P5]`–`[TRD-2.P8]` are early greens restored by the 10.4 commit.

## Verification

- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/trd_contracts.test.ts -t "TRD-2"`
