---
title: 'Story 12.2: Show the valuation trend and daily history'
type: 'feature'
created: '2026-10-30'
status: 'draft'
baseline_commit: '49b09cc'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `ValServiceV2.valuationTrend` and `valuationHistory` (and the pure `changePercentHundredths`) throw `NotImplementedError`: Valentina cannot see how her collection moved.

**Approach:** VAL-2 and VAL-3 as written in contracts.md §11 and AD-VAL-2 rules 1–6, on 12.1's repository, transaction and chunked as-of read.

## Boundaries & Constraints

**Always:**
- Both: one `REPEATABLE READ READ ONLY` transaction; first-fail P1 (12.1's ownership read) → P2, nothing read beyond ownership on a refusal. Zero writes, no audit. Label `'current-cards-were-worth'` (A-54).
- **VAL-2.** P2 `period ∈ {7, 30, 90, 365}` (`isValuationPeriod`), else `InvalidValuationPeriod` citing `{ period }`. Q1 `start = now − period × 86,400 s`; `V(t)` values the current entries with `acquiredAt ≤ bogotaDate(t)`, priced by 12.1's chunked `getReferencePricesAsOf(ids, t)` (baseline inclusive: `observedAt ≤ start`). Q2 `changeCop = V(now) − V(start)`; `changePercentHundredths = roundHalfAwayFromZero((V(now) − V(start)) × 10,000, V(start))` in BigInt (symmetric, never −0); `marketChangePercentHundredths` is the same formula over the entries with `acquiredAt ≤ bogotaDate(start)`. Q4 `V(start) = 0` → both percentages null, decision `ValuationNoBaseline` citing `{ valueAtStartCop: 0, changeCop }` (**D2**: it gets its §13 template); otherwise **D2** `ValuationTrendComputed` (stored-only) citing `{ period, valueAtStartCop, valueNowCop }`.
- **VAL-3.** P2 `days` an integer in 1–365, else `RequestValidationFailed`. Q2: one `catalog.getPriceHistory(ids, from, to)` per 500 distinct catalog ids, with `from` = the Bogotá start (05:00Z) of the first day and `to = now` (**D3**: VAL bounds the window it asks for to ≤ 365 Bogotá days, which closes Epic 4's deferral). The pure `series` (`domain/val.ts`):
  - priced entries = catalog entries whose history has an observation; none → `points: []`, **D2** `ValuationHistoryEmpty` citing `{ rule: 'FR-VAL-4', inputs: { pricedEntries: 0 } }`;
  - otherwise one point per Bogotá day from `max(earliest acquiredAt of a priced entry, today − days + 1)` to today; a day's value is Σ `cop × qty` over the entries with `acquiredAt ≤ day` and an observation at or before the day's end (**D4**: `min(day end, now)` for today), carrying the last price forward and never interpolating; `stale` when any contributing price is older than 36 h at that instant; **D2** `ValuationHistoryShown` citing `{ rule: 'FR-VAL-4', inputs: { pricedEntries, points } }`.
- Wiring: `valuation.trend`, `valuation.history`. **NFR-VAL-2 (D5):** `[NFR-VAL-2.trend]` (current value plus the 30-day trend, p95 ≤ 1,500 ms) and `[NFR-VAL-2.history]` (365-day history, p95 ≤ 2,500 ms) in `val2_latency.test.ts`, bound to 12.2.

**Ask First:** any bound-test change; a contract or DTO shape change.

**Never:** a float, a division by zero, `NaN` or `Infinity`; an interpolated or stored value.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Trend | 40,000 → 45,000 over 30 days | +1,250; market +1,250 | N/A |
| Zero baseline | empty / unpriced / all new | null | `ValuationNoBaseline` decision |
| Period 14 | — | — | `InvalidValuationPeriod` |
| History step | card acquired 12 days ago, qty 2 × 9,000 | +18,000 from that date | N/A |
| Carry-forward | no observation for 2 days | last price, `stale` after 36 h | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/collections/{domain/val.ts,application/val.v2.ts}` + src tests
- `src/server/composition.ts`; `contracts.md` §11 (VAL-3 Q2 window) and §13; `deferred-work.md`
- `val2_latency.test.ts`, `nfr-evidence.md`, `epics.source.mjs`/`epics.md`

## Tasks & Acceptance

**Execution:**
- [ ] trend + history + series + src tests; §13 rows; wiring; benchmarks + binding
- [ ] `sprint-status.yaml` -- 12.2 `done`

**Acceptance Criteria:**
- Given 12.2 `done`, when `[VAL-2.Q1]`, `[VAL-3.Q1]`, `[VAL-3.I2]`, `[NFR-VAL-2.trend]`, `[NFR-VAL-2.history]` run, then they pass; 12.3's `[VAL-2.I1]`, 12.4's `[VAL-2.P2]`, `[VAL-3.P1]` and 12.5's `[VAL-3.Q4]`, `[VAL-2.I3]` are early greens (D1).

## Verification

- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/val_contracts.test.ts -t "VAL-2|VAL-3"`
