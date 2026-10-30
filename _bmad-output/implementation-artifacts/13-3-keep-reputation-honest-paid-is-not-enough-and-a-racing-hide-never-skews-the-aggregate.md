---
title: 'Story 13.3: Keep reputation honest: paid is not enough, and a racing hide never skews the aggregate'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: '98b47ad'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `RepServiceV2.getAggregates` and the pure `averageTenths` throw `NotImplementedError`, and nothing proves the two MEC claims of NFR-REP-1 (R-12, P0): paying is not enough, and a hide racing a post never skews the aggregate.

**Approach:** REP-3 as written in contracts.md §12 and AD-REP-2 rule 1, plus the MEC proofs `[REP-1.MEC]` (over 13.1's P4) and `[REP-3.MEC]` (over 13.1's write and 13.2's hide), run against Postgres with real connections.

## Boundaries & Constraints

**Always:**
- P1: 1–500 ids, all distinct → else `RequestValidationFailed` (`rejectRequest`).
- Q1: one statement `SELECT "targetUserId", count(*), sum(rating) FROM "Review" WHERE "hiddenAt" IS NULL AND "targetUserId" = ANY($1) GROUP BY 1`, in a `READ ONLY` transaction. `averageTenths = floor((20 × sum + count) / (2 × count))` in BigInt (pure, `domain/rep.ts`), `null` when count = 0.
- Q2: one element per input id, in input order. Q3: zero writes, no audit. Q4: decision `SellerNotYetReviewed` citing `{ rule: 'FR-REP-3', inputs: { count: 0 } }`, else `SellerRated` citing `{ count, averageTenths }` (**D5**, stored-only §13 rows; the clock is read once for `occurredAt` only).
- TG-7: `[REP-1.MEC]` (100 attempts) and `[REP-3.MEC]` (100 repetitions) run their full count on Postgres; their runtimes go in this file.
- **D3 (NFR-REP-2):** `[NFR-REP-2.aggregates]` in `rep2_latency.test.ts`, bound here: `getAggregates` of 500 sellers over the §3 seed, p95 ≤ 300 ms. 13.2's `[NFR-REP-2.nextRead]` lands in the same file with this commit, since it measures this story's read. **D2:** `[REP-3.P1]` moves from 13.6 to this story. No procedure: REP-3 is the RSC's port (pages 2.2, 3.1).

**Ask First:** any bound-test change; a stored aggregate.

**Never:** a float average; a hidden review in `count` or `sum`; a cache.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 5, 4, 4 | 3 visible | 43 tenths, count 3 | N/A |
| No review | — | `null`, count 0, `FR-REP-3` {count: 0} | N/A |
| Hidden 1-star | 5 + hidden 1 | 50, count 1 | N/A |
| Half-up | 4, 5 | 45 | N/A |
| Duplicates | `[a, a]` | — | `RequestValidationFailed` |

</frozen-after-approval>

## Code Map

- `src/modules/reviews/{domain/rep.ts,ports/rep.v2.ts,infra/pg.ts,application/rep.v2.ts}` + src tests (a fast-check property of `averageTenths`)
- `contracts.md` §13; `messages.generated.ts` (generated); D3 benchmark files

## Tasks & Acceptance

**Execution:**
- [x] domain + repository + service + src tests; §13 rows; D3 benchmark + binding; MEC runtimes here
- [x] `sprint-status.yaml` -- 13.3 `done`

**Acceptance Criteria:**
- Given 13.3 `done`, when `[REP-1.MEC]`, `[REP-3.Q1]`, `[REP-3.I1]`, `[REP-3.MEC]` (and, per D2, `[REP-3.P1]`) run, then they pass.

### Review Findings

Epic 13 close review (decision log Impl-1 #38).

- [x] [Review][Patch] `SellerRated` read "de 1 reseñas visibles"; the template is now "Calificación promedio; reseñas visibles: {count}." [contracts.md §13]
- [x] [Review][Patch] The profile benchmark (NFR-REP-2, PRD metric) had no story DoD after D2; Story 13.5 now also proves REP-3, so its Traceability names NFR-REP-2 and its DoD carries the benchmark [epics.source.mjs]

## Verification

- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/rep_contracts.test.ts -t "REP-3|REP-1.MEC"`

## Implementation Notes

- Code review is batched with the rest of Epic 13 at its close (decision #22). The specs were approved together with D1–D6 (decision log Impl-1 #38).
- Q1 is `PgRepRepository.visibleReviewTotals`: one `GROUP BY` statement over `"hiddenAt" IS NULL`, with the count and sum read as text into BigInt, in a `READ ONLY` transaction. The pure `averageTenths` rounds half up in BigInt. A fast-check property over 1,000 random rating sets, scaled up to 10^15, proves it is the exact rounding of 10 × sum / count. A count beyond 2^53 − 1 is `Unexpected`.
- §13 gains `SellerRated` and `SellerNotYetReviewed` (D5).
- **TG-7, MEC runtimes** (the full count against Postgres with real connections, local Postgres 16, three runs): `[REP-1.MEC]` 100/100 refusals in 146–161 ms; `[REP-3.MEC]` 100 hide-versus-post races in 446–502 ms.
- **NFR-REP-2** (local Postgres 16, n = 500): `[NFR-REP-2.aggregates]` p50 1.4 ms, p95 1.9 ms, max 3.9; `[NFR-REP-2.nextRead]` (Story 13.2) p50 0.4 ms, p95 0.7 ms, max 3.7, with every read reflecting its hide or unhide. `nfr-evidence.md` records both, and the profile read stays Planned for Story 13.5.
- D2: `epics.source.mjs` binds `[REP-3.P1]` here. Story 13.6 keeps only `[S-FR-REP-5.f]`, `[S-FR-REP-6.f]` and `[S-FR-REP-7.f]`, all of them Story 13.5's operations.
