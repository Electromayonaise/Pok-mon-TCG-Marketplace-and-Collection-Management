---
title: 'Story 4.4: Never fabricate a price'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'd552afa'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/addendum.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `getPriceProvenance`, `fetchTrm` and `getFxRate` throw `NotImplementedError`, so the 7 bound tests are red. Camila sees no reference price, and nothing proves NFR-CAT-3: no displayed price is ever invented.

**Approach:**
- Provenance is two indexed reads (AD-CAT-2 rule 4): the latest observation and the baseline. Staleness is computed at read, and the trend uses the ADD-§2.2 integer formula.
- `fetchTrm` is a no-op on a covered day. Otherwise it stores the source's row exactly as delivered.
- `getFxRate` carries the previous rate forward with a stale label, and never writes a gap row (AD-CAT-3).
- Wire `catalog.provenance` (public) and `catalog.fx.retry` (admin).
- Add the NFR-CAT-1 provenance benchmark that the DoD asks for.

## Boundaries & Constraints

**Always:**
- **Provenance (CAT-3):** one clock read, zero writes, no audit.
  - P1: 1–500 distinct ids. A duplicate raises `RequestValidationFailed` through `rejectRequest`. The parser enforces the count and P3's period.
  - P2: unknown ids raise `CatalogEntryNotFound` (404), citing `FR-CAT-5` with `{missingIds}` (comma-joined), before any result is built.
  - Q1: one element per input id, in input order, from two statements:
    - the latest observation with `"observedAt" ≤ now`, by `DISTINCT ON ("catalogEntryId")` ordered `("observedAt" DESC, source, id)` (`reference_price_as_of`);
    - the baseline: the latest observation with `"observedAt" ≤ now − period × 86 400 s`, in the same order.
  - Q2: `changePercentHundredths` comes from the pure `changePercent(base, now)` (ADD-§2.2: BigInt, half away from zero). It is `null` with no baseline, with `base = 0`, or with no latest observation.
  - Q4 decisions:
    - `stale` when `now − observedAt > 36 h`, as `ReferencePriceStale` citing `FR-CAT-7` with `{observedAt, thresholdHours: 36}`. Exactly 36 h is fresh;
    - fresh: `allowed`, under a new stored-only code `ReferencePriceFresh`, with the same citation;
    - no observation: `lastTransactionReference: null`, `freshness: null`, `allowed`, under a new stored-only code `ReferencePriceMissing`, citing `FR-CAT-5`;
    - trend: `TrendNoBaseline` citing `FR-CAT-6` with `{periodStart}`, or a new stored-only code `TrendComputed` with `{periodStart, changePercentHundredths}`.
  - I1: each returned price is one stored row's columns, unchanged. No code path averages or combines rows (AD-CAT-2 rule 5).
- **TRM fetch (S-FR-CAT-8.fetch):**
  - `today` is the Bogotá date of `now`.
  - A row whose `[validFrom, validTo]` covers today makes it a no-op: `alreadyCovered`, with no source call.
  - Otherwise it calls `fx.getRateCovering(today)` outside any transaction. `null` or a thrown error gives `sourceUnavailable`, and nothing is written.
  - `valor` is parsed as a decimal string into centavos, half-up past 2 decimals, by the pure `parseTrm` (ADD-§6). It is never a float.
  - The insert runs under a savepoint. An `fx_rate_no_overlap` violation (23P01) re-reads the overlapping row:
    - an identical value and range gives `alreadyCovered`;
    - a different value keeps the stored row, writes one `catalog.fxRate.sourceMismatch` audit row, and gives `mismatchKept` with an `FxRateSourceMismatch` decision.
  - A stored row writes one `catalog.fxRate.stored` audit row.
  - Every outcome has a decision citing `FR-CAT-8`: new stored-only codes `FxRateStored`, `FxRateAlreadyCovered` and `FxRateSourceUnavailable`, plus the existing `FxRateSourceMismatch`.
- **Rate (S-FR-CAT-8.rate):**
  - The row covering `date` gives `stale: false`, under a new stored-only code `FxRateCovered`.
  - Otherwise the latest row with `validTo < date` gives `stale: true` and `FxRateCarriedForward`, citing `FR-CAT-8` with `{date, validFrom}`. No row is written.
  - With no rate on or before `date`, the call raises `Unexpected` (500). The DTO has no null, and every deployment stores a rate on its first fetch.
- The four DecisionCodes that §13 lists without a template (`ReferencePriceStale`, `TrendNoBaseline`, `FxRateCarriedForward`, `FxRateSourceMismatch`) get one, together with the new stored-only codes (decision #16). No template interpolates free text (decision #11).
- Wire `catalog.provenance` and `catalog.fx.retry` (`fetchTrm({trigger: 'admin'})`), with HTTP cases.
- **Production TRM source:** the datos.gov.co adapter is not built. `compose()` binds `UNWIRED_FX`, which fails as NotImplemented. `deferred-work.md` records it, together with the `jobs/trm-fetch` route, since no jobs route exists yet.
- **NFR-CAT-1 (DoD):** `_bmad-output/test-artifacts/nfr/cat1_latency.test.ts`, next to `ord1_latency.test.ts`, with the shared harness:
  - `[NFR-CAT-1.provenance]`: 48 ids, p95 ≤ 300 ms. Bound to this story through `epics.source.mjs`, then regenerated;
  - `[NFR-CAT-1.browse]`: 10,000 entries, p95 ≤ 1,000 ms. Bound to Story 4.5, which builds browse.
- **Deferred item (Epic 3 review):** `nfr-evidence.md` is refreshed as a whole table once, with every done story's rows moved off "Red — ATDD" and the CAT rows carrying their measured figures.

**Ask First:** a stored `stale` column; any DTO change; an interpolated or averaged price.

**Never:** a rate written for a gap; a request path that calls `FxRateSource` (`fetchTrm` is the job and the admin retry only); a float parse of `valor`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Baseline 40,000, latest 45,000 | period 30 | `+1250` hundredths, `fresh` | N/A |
| Age 36 h + 1 s / exactly 36 h | — | `stale` / `fresh` | N/A |
| No baseline | period 7 | `changePercentHundredths: null`, `TrendNoBaseline` | N/A |
| Unknown id | `ghost` | — | `CatalogEntryNotFound` 404 |
| Two sources at one instant | `b` 45,000, `a` 47,000 | 47,000 from `a-source` | N/A |
| Covered day | FxRate 2026-10-01 | `alreadyCovered`, `fx.calls = 0` | N/A |
| Source down | yesterday's rate only | `sourceUnavailable`, no row; `getFxRate(today)` = yesterday's rate, `stale` | N/A |
| Source changed a stored day | `mismatch` | stored row kept, one audit row | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/catalog/domain/cat.ts` -- `changePercent`, `parseTrm`, `bogotaDate`, `isStale`
- `src/modules/catalog/ports/cat.v2.ts` + `infra/pg.ts` -- `existingEntryIds`, `latestObservations`, `rateCovering`, `rateBefore`, `insertFxRate`
- `src/modules/catalog/application/cat.v2.ts` -- `getPriceProvenance`, `fetchTrm`, `getFxRate`
- `contracts.md` §13 -- the templates and the new stored-only codes
- `src/server/composition.ts` + `.test.ts` -- `catalog.provenance`, `catalog.fx.retry`, `UNWIRED_FX`
- `_bmad-output/planning-artifacts/epics.source.mjs` -- the two NFR-CAT-1 ids, regenerated
- `_bmad-output/test-artifacts/nfr/cat1_latency.test.ts`, `nfr-evidence.md`
- `_bmad-output/test-artifacts/atdd/cat_contracts.test.ts` -- `[CAT-3.Q1]`, `[CAT-3.Q4]`, `[CAT-3.Q5]`, `[CAT-3.P2]`, `[CAT-3.I1]`, `[S-FR-CAT-8.h]`, `[S-FR-CAT-8.f]`

## Tasks & Acceptance

**Execution:**
- [x] domain -- `changePercent` with the four ADD-§2.2 vectors, `parseTrm`, `bogotaDate`; unit tests
- [x] `contracts.md` §13 -- the templates and the new stored-only codes; regenerate
- [x] ports + infra + service -- the three operations; unit tests for the mismatch and the 23P01 identical row
- [x] `composition.ts` + test -- the two procedures
- [x] `epics.source.mjs` + regenerate -- the NFR-CAT-1 ids; `cat1_latency.test.ts`; `nfr-evidence.md` refreshed
- [x] `deferred-work.md` -- the TRM adapter and the jobs route

**Acceptance Criteria:**
- Given the 7 bound tests and `[NFR-CAT-1.provenance]`, when they run, then they pass.
- Given the fault switches `down` and `mismatch`, when the TRM fetch runs, then no rate is written or changed.

## Verification

**Commands:**
- `npm run lint` -- expected: 0 errors
- `npm run test:unit` -- expected: all pass
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/cat_contracts.test.ts` -- expected: the 21 tests of 4.1–4.4 pass
- `npx vitest run --project solu2-nfr _bmad-output/test-artifacts/nfr/cat1_latency.test.ts -t provenance` -- expected: p95 ≤ 300 ms

## Implementation Notes

- Code review is batched with the rest of Epic 4 at its close (decision #22).
- **Provenance:**
  - two calls of `PgCatRepository.latestObservations`, one at `now` and one at `now − period`: `DISTINCT ON ("catalogEntryId")` over `reference_price_as_of`;
  - BIGINT and DATE columns are read as text and converted once, so a returned price is the stored row unchanged (I1). No type parser is configured on the pool;
  - P2 cites `{missingIds, missingCount}`; duplicate ids are refused before any read.
- **Trend:** `changePercent` is the ADD-§2.2 BigInt formula. A missing baseline and a zero baseline both give `null` with `TrendNoBaseline`.
- **TRM fetch:**
  - the covered-day check and the insert are two transactions, and the source call runs between them, outside any transaction;
  - the insert's 23P01 rolls back to a savepoint and re-reads the overlapping row. An identical range and value give `alreadyCovered`; anything else gives `mismatchKept` plus a `catalog.fxRate.sourceMismatch` audit row;
  - audit rows are `actorKind: 'system'`, because `FetchTrmRequest` carries no actor. The admin retry is visible in `data.trigger`.
- **§13:** templates for the 4 catalog DecisionCodes that had none, and 7 new stored-only codes (`ReferencePriceFresh`, `ReferencePriceMissing`, `TrendComputed`, `FxRateCovered`, `FxRateStored`, `FxRateAlreadyCovered`, `FxRateSourceUnavailable`). No template has a placeholder.
- **NFR-CAT-1:**
  - `cat1_latency.test.ts` holds both halves. `[NFR-CAT-1.provenance]` measured p50 4.9 ms and p95 11.9 ms (threshold 300) on the local Postgres 16, 2026-10-27;
  - `[NFR-CAT-1.browse]` stays red for the right reason until Story 4.5;
  - the binding is in `epics.source.mjs`, and `epics.md` is regenerated (375 tests).
- `nfr-evidence.md` was refreshed as a whole (the Epic 3 deferral), with a new "Green — ATDD" status.
- Unit tests:
  - `cat-domain.test.ts`: the ADD-§2.2 vectors and the rounding on both signs, the 36 h boundary, the `parseTrm` vectors and refusals;
  - `cat.v2.test.ts`: input order, no observation, a zero baseline, duplicate ids, every missing id cited, a stored rate, a mismatched weekend range, a racing identical row, a throwing source, and a date with no rate at all;
  - two HTTP cases: the public provenance and the admin retry.
