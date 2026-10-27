---
title: "Story 4.2: Keep a card's id through renames and reprints"
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

**Problem:** `upsertCatalogEntry` and `listQuarantinedRows` are the MEC of CAT (R-03, P0). A card renamed or reprinted by the feed must keep its id, or every listing and binder entry that holds it breaks. The 6 bound tests are red.

**Approach:** Story 4.1 builds the upsert, because `continueFeedRun` runs it. This story owns its contract and proves it:
- the upsert keeps `id`, `externalKey`, `kind` and `createdAt` out of the `SET` list;
- a changed row writes one revision;
- a rerun converges with zero revisions;
- the MEC leaves 3 listings and 2 binder entries byte-identical.

It also adds `listQuarantinedRows` and wires `catalog.feed.quarantine`.

## Boundaries & Constraints

**Always:**
- **Upsert (CAT-2):**
  - P3: the `"CatalogSet"` with `code = row.setCode` exists, else `Unexpected` (500). The batch has already checked the set (ADD-§8.1 rule 2).
  - **Kind first (Q-fail):** a plain read of the entry by `externalKey`. When its `kind` differs from the row's, the row is quarantined as `KindChanged` (`rawRow` = the row, `ON CONFLICT ("runId","rowNumber") DO NOTHING`). The call returns `{catalogEntryId: <existing>, outcome: 'quarantinedKindChanged', changedFields: ['kind']}`, and the entry is not written.
  - **Q1:** `INSERT … ON CONFLICT ("externalKey") DO UPDATE SET <the nine>, "updatedAt"=now WHERE (<the nine>) IS DISTINCT FROM (EXCLUDED.<the nine>) RETURNING id, (xmax = 0) AS inserted`. The nine are `"setId"`, `name`, `number`, `"numberSort"`, `pokemon`, `colour`, `style`, `artist` and `"imageUrl"`.
  - **Q2:**
    - an inserted row returns `created` with the new id;
    - a returned update returns `updated` with the existing id and `changedFields` from the pure `diffAttributes`;
    - no returned row means nothing changed: `unchanged`, with the existing id from the kind read and `changedFields: []`.
  - **Q3:** on `updated`, one `"CatalogEntryRevision" {catalogEntryId, runId, changedFields, before, after, createdAt: now}` on the same `tx`. No per-row audit and no event.
  - **I3:** the upsert reads and writes no `"Listing"`, `"BundleComponent"`, `"CollectionEntry"` or `"TradeOffer"` row (AD-8, AD-7).
- `numberSort` is the integer value of the number's first digit run (`"025/165"` → 25, `"TG05"` → 5).
- **Quarantine list (CAT-2.quarantine):**
  - the run's rows ordered by `rowNumber`, optionally filtered by `reasonCode`, 50 per page, behind an opaque keyset cursor;
  - it returns `{rowNumber, externalKey, reasonCode}` and never selects `rawRow`;
  - an unknown `runId` raises `RequestValidationFailed` on `runId`, as `continue` does;
  - zero writes.
- Wire `catalog.feed.quarantine` (admin), with an HTTP case.
- Record the `[CAT-2.MEC]` runtime in this file (TG-7).

**Ask First:** an upsert that reads the neighbours' tables; any DTO or bound-test change.

**Never:** `id`, `"externalKey"`, `kind` or `"createdAt"` in the `SET` list; merging two entries; deleting an entry; `rawRow` in a response.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New `externalKey` | `sv1-025` | `created`, one entry with a generated id | N/A |
| Renamed row | `Pikachu` → `Pikachu ex` | `updated`, same id, `changedFields ∋ name`, one revision | N/A |
| Same row twice | — | second call `unchanged`, `changedFields: []`, zero revisions | N/A |
| Reprint used by 3 listings and 2 binder entries | new name and artist | same id; the 5 rows byte-identical | N/A |
| Kind changed | `card` → `sealedProduct` | `quarantinedKindChanged`, a `KindChanged` row, the entry still `card` | N/A |
| Quarantine list | one `KindChanged` row | `[{rowNumber: 7, externalKey, reasonCode}]`, no `rawRow` | N/A |
| Unknown run | `ghost` | — | `RequestValidationFailed` 400 |

</frozen-after-approval>

## Code Map

- `src/modules/catalog/application/cat.v2.ts` -- `upsertCatalogEntry`, `listQuarantinedRows`
- `src/modules/catalog/domain/cat.ts` -- `diffAttributes`, `numberSort`, the quarantine cursor
- `src/modules/catalog/ports/cat.v2.ts` + `infra/pg.ts` -- `readEntryByExternalKey`, `upsertEntry`, `insertRevision`, `quarantineRow`, `listQuarantined`
- `src/server/composition.ts` + `.test.ts` -- `catalog.feed.quarantine`
- `_bmad-output/test-artifacts/atdd/cat_contracts.test.ts` -- `[CAT-2.Q1]`, `[CAT-2.Q2]`, `[CAT-2.I1]`, `[CAT-2.I3]`, `[CAT-2.MEC]`, `[CAT-2.quarantine.h]`

## Tasks & Acceptance

**Execution:**
- [x] the upsert's contract checks and unit tests (`diffAttributes`, `numberSort`, the `unchanged` path)
- [x] `listQuarantinedRows` with its cursor; unit test for the reason filter and the second page
- [x] `composition.ts` + test -- `catalog.feed.quarantine`
- [x] this file -- the `[CAT-2.MEC]` runtime

**Acceptance Criteria:**
- Given the 6 bound tests, when the CAT ATDD file runs, then they pass.
- Given a renamed card, when the feed reprocesses it twice, then its id is unchanged and the second pass writes no revision.
- Given this story `done`, when the red gate runs, then the only unexpected greens are Story 4.3's, the next commit (decision #23).

## Verification

**Commands:**
- `npm run lint` -- expected: 0 errors
- `npm run test:unit` -- expected: all pass
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/cat_contracts.test.ts` -- expected: the 11 tests of 4.1 and 4.2 pass

## Implementation Notes

- Code review is batched with the rest of Epic 4 at its close (decision #22).
- `[CAT-2.MEC]` runtime (TG-7): 267 ms on the local Postgres 16 (2026-10-27). The bound test runs the reprint once, so there is no repetition count to record. The upsert holds no contended lock: the lease makes one writer per run (CAT-2 concurrency).
- The upsert is the private `upsert` behind `upsertCatalogEntry`, which `continueFeedRun` shares (built with Story 4.1):
  - `readEntryByExternalKey` reads the stored row first. It decides `KindChanged` and gives `before`;
  - `PgCatRepository.upsertEntry` is Q1 word for word. Its `WHERE … IS DISTINCT FROM …` returns no row when nothing changed, which is the `unchanged` outcome;
  - the revision stores the nine attributes as `before` and `after`. `changedFields` names only the ones that differ (`diffAttributes`).
- The quarantine list:
  - `listQuarantined` appends its filters as parameters, never `OR $n IS NULL`;
  - the cursor carries its `runId`, so a cursor from another run is refused as `RequestValidationFailed`;
  - an unknown `runId` is refused the same way, as approved with the specs.
- Unit tests: in `cat.v2.test.ts`, the revision's before and after, a kind change that writes nothing, the reason filter and paging, and another run's cursor or an unknown run. In `cat-domain.test.ts`, the quarantine cursor. One HTTP case in `composition.test.ts`.
- Early greens until Story 4.3 is committed: `[CAT-1.QF1]`, `[CAT-2.ingress.f]` and `[CAT-2.QF1]`.
