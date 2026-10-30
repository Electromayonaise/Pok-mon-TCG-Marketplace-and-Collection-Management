---
title: 'Story 11.1: Organize my collections'
type: 'feature'
created: '2026-10-30'
status: 'done'
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

**Problem:** `ColServiceV2.createCollection`, `renameCollection`, `deleteCollection` and `listCollections` throw `NotImplementedError`: a collector cannot create, rename, list or delete a collection.

**Approach:** S-FR-COL-1 (contracts.md §15 COL) and AD-COL-1 rule 1, on a new `PgColRepository` bound into the one repository (R-14). Create takes `col:owner:<ownerId>` first, counts, and inserts.

## Boundaries & Constraints

**Always:**
- **create:** `pg_advisory_xact_lock(col:owner:<ownerId>)` → count ≥ 50 → `CollectionLimitReached` citing `{ limit: 50, count }` → insert under a savepoint; a 23505 on `collection_name_unique_per_owner` (`nameKey` = unaccent-lower) → `CollectionNameTaken` citing `{ name }`. Audit `collections.collection.created`. Decision **D2** `CollectionCreated`.
- **rename:** under the same lock; owner filter, else `CollectionNotFound` (same body for a foreign and an unknown id); the same 23505 mapping; `updatedAt = now`. Audit `collections.collection.renamed`. `CollectionChangeResponse { collectionId, updatedAt }`.
- **delete:** under the same lock (**D4**); owner filter, else `CollectionNotFound`; counts the entries and the `PlatformPurchase` entries, then deletes (FK cascade). Audit `collections.collection.deleted` with both counts. Decision `CollectionDeleted` citing `{ entriesRemoved, platformPurchaseEntriesRemoved }` (review G-15). `confirm: true` is the parser's.
- **list:** the owner's collections with their entry counts, ordered by `("nameKey", id)` (**D4**), on a read-only transaction. Zero writes.
- **Wiring:** `collections.create`, `.rename`, `.delete`, `.list` + one HTTP case.

**Ask First:** a DTO, port or bound-test change.

**Never:** a read of another module's tables from collections SQL (AD-8).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create | "Keep", "For trade" | both listed, by name | N/A |
| Name taken | "keep" after "Keep" | nothing written | `CollectionNameTaken` |
| Race at 49 | two creates | exactly 50 | one `CollectionLimitReached` |
| Delete | 2 entries, 1 purchase | cascade | cites 2 and 1 |
| Foreign id | rename/delete | unchanged | `CollectionNotFound` |

</frozen-after-approval>

## Code Map

- `src/modules/collections/domain/col.ts` (+ test) -- `COLLECTION_LIMIT`, `bogotaDate`
- `src/modules/collections/ports/col.v2.ts`, `infra/pg.ts` (`PgColRepository`) -- lock, count, insert, rename, delete, list
- `src/modules/collections/application/col.v2.ts`, `index.ts` -- the four use cases
- `src/server/composition.ts` (+ test), `test-support/solu2/fixtures.ts` (`wiring` repo gains `PgColRepository`)

## Tasks & Acceptance

**Execution:**
- [x] domain + src tests; repository + service; wiring + HTTP case
- [x] `sprint-status.yaml` -- 11.1 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 11.1 `done`, when `[S-FR-COL-1.h]`, `[S-FR-COL-1.f]`, `[S-FR-COL-1.list.h]`, `[S-FR-COL-1.delete.h]` run, then they pass.

## Verification

- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/col_supporting.test.ts` -- the 4 bound tests pass; the other 8 stay red for NotImplemented

## Implementation Notes

- Code review is batched with the rest of Epic 11 at its close (decision #22).
- `PgColRepository` holds every COL statement of the epic (the port is declared whole here); each story's service uses its part.
- `CollectionNotFound` cites `{ owned: false }` with no id, so a foreign id's body equals an unknown id's (rename, delete, COL-1 P3, COL-3 P3).
- `CollectionNameTaken` cites `{ field: 'name' }`; `CollectionLimitReached` cites `{ limit: 50, count }`.
- §13 gains five stored-only rows (D2): `CollectionCreated`, `CollectionDeleted`, `CollectionEntryAdded`, `PromptAccepted`, `PromptDismissed`. The catalog test's number placeholders gain `entriesRemoved`, `platformPurchaseEntriesRemoved` and `entryCount`.
- Wired: `collections.create`, `.rename`, `.delete`, `.list`.
