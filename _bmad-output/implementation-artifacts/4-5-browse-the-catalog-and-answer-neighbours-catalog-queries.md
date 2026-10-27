---
title: "Story 4.5: Browse the catalog and answer neighbours' catalog queries"
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'd552afa'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `browseCatalog` and the seven offered ports of §15.11 throw `NotImplementedError`, so the 9 bound tests are red. Discovery, listings and collections (Epics 5, 6, 11, 12) have no way to read the catalog.

**Approach:** Bounded reads only, each one a single statement on the catalog's own tables:
- browse filters, counts and pages in one statement, ordered `(setId, numberSort, id)`;
- the ports answer with `missing` instead of throwing, except `getEntry`, whose contract raises `CatalogEntryNotFound`;
- the price ports reuse Story 4.4's observation order.

Wire `catalog.browse` (public). It also adds the `[NFR-CAT-1.browse]` benchmark, which Story 4.4 writes and binds to this story.

## Boundaries & Constraints

**Always:**
- Zero writes and no audit in every operation. Ports read with no actor.
- **Browse (S-FR-CAT-1):**
  - P: `page ≥ 1` and `pageSize` 1–100. The parser refuses the rest. The service repeats the check through `rejectRequest`, for in-process callers.
  - **Filters:**
    - `setIds` matches by `ANY`;
    - `pokemon`, `colour`, `style`, `artist` and `kind` match exactly;
    - `nameQuery` is a prefix match on `"nameKey"` against `tezg_unaccent_lower(q)`, with `%` and `_` escaped.
  - Q: one statement returns the page in `("setId", "numberSort", id)` order, the total, and two facets over the matched set: `setId` and `kind`, with counts.
  - A filter that matches nothing, such as an unknown set, returns `{entries: [], total: 0}`. It never throws.
- **P-CAT.entry:** the entry by id, else `CatalogEntryNotFound` (404), citing `{catalogEntryId}`.
- **P-CAT.entries:** 1–500 ids. Entries come in input order, de-duplicated, and unknown ids go to `missing`.
- **P-CAT.match:** the browse predicate with `LIMIT 20 001`. More than 20,000 matches answer `{ids: [], tooBroad: true}`. Otherwise the ids come in browse order.
- **P-CAT.refs:** 1–500 refs. `resolved: [{ref, kind}]` in input order; unknown refs go to `missing`.
- **P-CAT.asOf:** 1–500 ids. Per id, the latest observation with `"observedAt" ≤ asOf`, ordered `("observedAt" DESC, source, id)`, or `null`. `stale` is computed relative to `asOf` (> 36 h), and `false` when there is no price.
- **P-CAT.history:** 1–500 ids, and `from ≤ to`, else `RequestValidationFailed` on `from`. Per id, in input order, the observations in `[from, to]` plus the last one before `from`, ascending by `("observedAt", source, id)`.
- **P-CAT.sets:** 1–500 set ids. `[{setId, name, cardEntryCount}]`, where the count is `kind = 'card'` only (AD-COL-1 rule 5). Unknown sets are left out.
- Bounds on the ports' id lists (1–500) raise `RequestValidationFailed` through `rejectRequest`.
- Wire `catalog.browse` (public), with an HTTP case.

**Ask First:** a facet beyond `setId` and `kind` (UI 2.1 may ask for more); any DTO or bound-test change.

**Never:** a read of another module's table; an unbounded port list; a throw for an unknown id in a batch port.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Filter by pokemon | two Pikachu, one Charmander | `[p1 (025), p2 (090)]`, total 2 | N/A |
| Unknown set | `setIds: [noset]` | `{entries: [], total: 0}` | N/A |
| pageSize 101 | — | — | `RequestValidationFailed` 400 (parser) |
| getEntry unknown | `ghost` | — | `CatalogEntryNotFound` 404 |
| getEntries with a ghost | `[pika, ghost]` | entries `[pika]`, missing `[ghost]` | N/A |
| match 20,001 | — | `{ids: [], tooBroad: true}` | N/A |
| refs | card, sealed, ghost | kinds per ref, `missing: [ghost]` | N/A |
| asOf | observations −1 d and +1 h | the −1 d one | N/A |
| history | −10 d, −2 d, from −5 d | `[38 000, 40 000]` | N/A |
| sets | a card and a sealed product | `cardEntryCount: 1` | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/catalog/domain/cat.ts` -- the filter predicate builder (pure, parameterized)
- `src/modules/catalog/ports/cat.v2.ts` + `infra/pg.ts` -- `browse`, `entriesByIds`, `matchIds`, `kindsByIds`, `pricesAsOf`, `priceHistory`, `setSummaries`
- `src/modules/catalog/application/cat.v2.ts` -- the eight operations
- `src/server/composition.ts` + `.test.ts` -- `catalog.browse`
- `_bmad-output/test-artifacts/nfr/cat1_latency.test.ts` -- `[NFR-CAT-1.browse]`
- `_bmad-output/test-artifacts/atdd/cat_contracts.test.ts` -- `[S-FR-CAT-1.h]`, `[S-FR-CAT-1.f]`, `[P-CAT.entry.h]`, `[P-CAT.entries.h]`, `[P-CAT.match.h]`, `[P-CAT.refs.h]`, `[P-CAT.asOf.h]`, `[P-CAT.history.h]`, `[P-CAT.sets.h]`

## Tasks & Acceptance

**Execution:**
- [x] ports + infra -- the seven reads; the browse predicate shared with `matchIds`
- [x] `application/cat.v2.ts` -- the eight operations; unit tests for `nameQuery` escaping, the facets and the bounds
- [x] `composition.ts` + test -- `catalog.browse`
- [x] `[NFR-CAT-1.browse]` green

**Acceptance Criteria:**
- Given the 9 bound tests and `[NFR-CAT-1.browse]`, when they run, then they pass.
- Given Epic 4's Impl-1 stories `done`, when `npm run test:ci` runs, then every gate is green.

## Verification

**Commands:**
- `npm run lint` -- expected: 0 errors
- `npm run test:unit` -- expected: all pass
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/cat_contracts.test.ts` -- expected: all 30 CAT tests pass
- `npm run test:ci` -- expected: exit 0

## Implementation Notes

- Code review is batched with the rest of Epic 4 at its close (decision #22).
- **Browse:**
  - `PgCatRepository.browse` is one statement: a CTE of the matched entries, then the total, the page (`json_agg` in `("setId", "numberSort", id)` order) and the `setId` and `kind` facets;
  - `catalogPredicate` appends only the filters present, as parameters, and `matchIds` shares it;
  - `nameQuery` escapes `\`, `%` and `_` and matches as a prefix of `"nameKey"` (`tezg_unaccent_lower`), so it is accent-blind and served by `catalog_entry_name_key`.
- **Ports:** they read in one transaction each, with no actor:
  - the batch ports de-duplicate their ids and answer in input order;
  - `getEntry` raises `CatalogEntryNotFound`, citing `AD-CAT-1 rule 5`;
  - `getReferencePricesAsOf` reuses Story 4.4's `latestObservations`;
  - `getPriceHistory` is one `UNION ALL` of the window and the carried-in `DISTINCT ON` row.
- `catalog.browse` is wired. zod gives an absent optional filter as `undefined`, so the resolver strips those keys (`defined`) under `exactOptionalPropertyTypes`.
- `[NFR-CAT-1.browse]` measured p50 2.1 ms and p95 9.9 ms (threshold 1,000) on the 10,000-entry §3 catalog, local Postgres 16, 2026-10-27. NFR-CAT-1 is "Green — benchmark" in `nfr-evidence.md`.
- Unit tests (in `cat.v2.test.ts`): the accent-blind prefix with literal `%` and `_`, the facets, paging and its total, the browse bounds, `getEntry`'s 404, input order and de-duplication, the 1–500 bounds, `asOf` staleness and a missing price, and the history's `from ≤ to` and empty series. One HTTP case for the public browse and the parser's `pageSize` refusal.

### Review Findings

Epic 4 close review (2026-10-27, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `d552afa..3cd2cff` (code paths). Totals for the epic: 2 decisions, 18 patches, 3 deferrals, 14 dismissed.

- [x] [Review][Patch] An `asOf` that does not parse ends in a RangeError (500); `getPriceHistory` already refuses it [src/modules/catalog/application/cat.v2.ts:448]
- [x] [Review][Patch] `priceHistory` copies the series array on every row, which is quadratic [src/modules/catalog/infra/pg.ts:310]
- [x] [Review][Defer] `getPriceHistory` bounds the ids (≤ 500) but not the window or the row count, so a wide `[from, to]` returns every observation [src/modules/catalog/infra/pg.ts:298] — deferred, the contract bounds only the ids; VAL-3 (Epic 12) sets its windows
- [x] [Review][Defer] Browse accepts any safe-integer `page` (OFFSET), and the filter strings have no length bound [src/modules/catalog/application/cat.v2.ts:236] — deferred, the registry's zod input bounds only `pageSize`; DSC-1 caps pages at 417
