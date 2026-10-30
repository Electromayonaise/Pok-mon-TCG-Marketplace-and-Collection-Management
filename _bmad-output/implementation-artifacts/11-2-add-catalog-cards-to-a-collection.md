---
title: 'Story 11.2: Add catalog cards to a collection'
type: 'feature'
created: '2026-10-30'
status: 'draft'
baseline_commit: 'cfba71b'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `ColServiceV2.addEntry` throws `NotImplementedError`: a collector cannot add a catalog card to a collection, and the first add cannot create "General".

**Approach:** COL-3 (contracts.md §10) and AD-COL-1 rules 2–3, AD-7.

## Boundaries & Constraints

**Always:**
- **P chain, first-fail:** P1 is the parser's (qty 1–999, price 0–100,000,000), re-checked in the service as `RequestValidationFailed` for internal callers. P2 `acquiredAt` > the Bogotá date of `now` → `InvalidAcquiredDate` citing `{ acquiredAt, today }` (today allowed). P3 with a `collectionId`: owned by `ownerId`, else `CollectionNotFound` (identical body for a foreign id). P4 `catalog.getEntries([id])` missing → `InvalidCatalogEntry` citing `{ catalogEntryId }`.
- **Q:** `col:owner` lock first; P3 re-read `FOR SHARE` under the lock; with `collectionId = null`, `INSERT "Collection" (name 'General') ON CONFLICT ("ownerId","nameKey") DO NOTHING` then select it (`createdGeneral` = inserted). **D5:** an owner at 50 collections with no "General" → `CollectionLimitReached`, declared on `collections.addEntry`. Insert one `Manual` catalog entry at `max("manualPosition") + 1` (0 for an empty collection). Audit `collections.entry.added`. Decision `CollectionEntryAdded` citing `{ entryId, source: 'Manual', createdGeneral }` under `FR-COL-2`. Any refusal → zero writes, including no "General".
- No `"CatalogEntry"` write (NFR-COL-3); catalog only through `CatalogForCol`.
- **Wiring:** `collections.addEntry` with the real `catalog` (P-CAT.entries) + one HTTP case.

**Ask First:** a DTO, port or bound-test change beyond D5.

**Never:** a `PlatformPurchase` entry from this path (AD-COL-1 I1).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add | coll1 with an entry at 4 | Manual at 5 | N/A |
| First use | no collection | "General" created | N/A |
| Two first uses | race | one "General", positions distinct | N/A |
| Tomorrow | acquiredAt 2026-10-02 | nothing written | `InvalidAcquiredDate` |
| Foreign / unknown card | — | no "General" | `CollectionNotFound` / `InvalidCatalogEntry` |

</frozen-after-approval>

## Code Map

- `src/modules/collections/domain/col.ts` -- `bogotaDate`, `isFutureDate`
- `ports/col.v2.ts`, `infra/pg.ts` -- `ownedCollection`, `ensureGeneral`, `insertEntries`
- `application/col.v2.ts` -- `addEntry`; `src/server/composition.ts` (+ test)

## Tasks & Acceptance

**Execution:**
- [ ] domain + service + wiring; `sprint-status.yaml` 11.2 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 11.2 `done`, when `[COL-3.Q1]`, `[COL-3.Q2]`, `[COL-3.R1]`, `[COL-3.I2]` run, then they pass; 11.4's `[COL-3.P2]`–`[COL-3.P4]` are early greens restored by the 11.4 commit (D1, #23).
