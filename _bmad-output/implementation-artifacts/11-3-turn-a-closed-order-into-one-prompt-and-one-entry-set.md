---
title: 'Story 11.3: Turn a closed order into one prompt and one entry set'
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

**Problem:** `ColServiceV2.onOrderClosed`, `acceptPrompt`, `dismissPrompt` and `listPrompts` throw `NotImplementedError`, and the `collections` subscriber of `OrderClosed` is in `UNWIRED_HANDLERS`: a closed purchase never becomes an "add to collection" prompt.

**Approach:** COL-2, COL-1, COL-1.dismiss, COL-1.list (contracts.md §10, §15.12) and AD-COL-2, AD-9.

## Boundaries & Constraints

**Always:**
- **onOrderClosed (tx):** P2 the payload has `orderId`, `buyerId`, ≥ 1 line (each `itemRef`, `qty` 1–999) and a non-null `buyerItemReceivedConfirmedAt`, else `Unexpected`. `INSERT … ON CONFLICT ("orderId") DO NOTHING RETURNING id`; on conflict select the existing id. Audit `collections.prompt.created` (`system`) on insert only. Never reads `"Order"` (AD-9, AD-8).
- **acceptPrompt:** `col:owner:<actorId>` lock first → conditional `UPDATE … WHERE id AND "buyerId" = actor AND status = 'Pending' RETURNING lines, "orderId", "buyerItemReceivedConfirmedAt"` → P3 the collection `FOR SHARE` owned by the actor, else `CollectionNotFound` and the transaction rolls back (prompt stays Pending) → one `PlatformPurchase` entry per line (`catalogEntryId = itemRef`, `acquiredAt` = Bogotá date of the close fact, `acquiredPriceCop = unitPriceCop ?? null`, positions max + 1, + 2, …). Audit `collections.prompt.accepted`. Decision `PromptAccepted` citing `{ promptId, orderId, entryCount }` under `FR-COL-7`.
- **Q-fail (accept and dismiss):** 0 rows → re-read with the buyer filter: absent or foreign → `PromptNotFound` citing no id (body = an unknown id's); resolved → `PromptAlreadyResolved` citing `{ status, resolvedAt }`. Zero writes.
- **dismissPrompt:** the same shape to `Dismissed` (no lock needed: no position is assigned). Audit `collections.prompt.dismissed`. Decision `PromptDismissed`.
- **listPrompts:** the buyer's prompts, optional `status`, ordered `("createdAt" DESC, id DESC)`, **D4** no page (the DTO has no cursor); `lineCount` from the stored lines. Zero writes.
- **Subscriber (D3):** `collectionsHandler(col)` in `composition.ts`: `OrderClosed` → `onOrderClosed(tx, payload)`; any other type → `Unexpected`. `UNWIRED_HANDLERS` goes away.
- **Wiring:** `collections.prompts.accept`, `.dismiss`, `.list` + one HTTP case (an `OrderClosed` delivered through the real dispatcher creates the prompt).

**Ask First:** a DTO, port or bound-test change.

**Never:** a read or write of `orders` tables; an entry from a dismissed prompt.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Delivered | OrderClosed | one Pending prompt + system audit | N/A |
| Redelivered ×5 at once | same orderId | one prompt, `created: false` for the rest | N/A |
| Accept | Pending, own collection | one entry per line, dated in Bogotá | N/A |
| Accept twice at once | ×100 | one entry set | `PromptAlreadyResolved` |
| Missing collection | Pending | prompt stays Pending | `CollectionNotFound` |
| Foreign prompt | — | body = unknown id's | `PromptNotFound` |

</frozen-after-approval>

## Code Map

- `ports/col.v2.ts`, `infra/pg.ts` -- `insertPrompt`, `resolvePrompt`, `readPrompt`, `listPrompts`
- `application/col.v2.ts` -- the four use cases; `src/server/composition.ts` (+ test) -- the subscriber

## Tasks & Acceptance

**Execution:**
- [x] service + subscriber + wiring; `sprint-status.yaml` 11.3 `done`; `gen:trace:solu2`; the MEC runtime recorded below (TG-7)

**Acceptance Criteria:**
- Given 11.3 `done`, when `[COL-2.Q1]`, `[COL-2.I1]`, `[COL-2.I2]`, `[COL-1.Q1]`, `[COL-1.MEC]`, `[COL-1.dismiss.h]`, `[COL-1.list.h]` run, then they pass; 11.4's `[COL-1.P1]`–`[COL-1.P3]`, `[COL-1.dismiss.f]` are early greens restored by the 11.4 commit (D1, #23).

## Implementation Notes

- MEC (TG-7): `[COL-1.MEC]` runs its 100 repetitions against Postgres 16 with real connections in 1,191–1,310 ms (two runs, local cluster, `fsync=off`).
- The lines' `itemRef` is the catalog entry id (ORD-1's snapshot); a line with no `unitPriceCop` (a bundle component) gets a null price.
- `PromptNotFound` cites `{ found: false }` with no id; `PromptAlreadyResolved` cites `{ status, resolvedAt }` under AD-COL-2 rule 3.
- COL-2 P2 rejects a payload without lines, a line without `itemRef` or with a qty outside 1–999, or no close fact, as `Unexpected`: the delivery is recorded `failed`.
- `collectionsHandler(col)` replaces `UNWIRED_HANDLERS`; any type but `OrderClosed` is `Unexpected` (D3).
- Wired: `collections.prompts.accept`, `.dismiss`, `.list`.

### Review Findings (Epic 11 close review: Blind Hunter, Edge Case Hunter, Acceptance Auditor)

- [x] [Review][Decision] R1: a closed line over 999 copies — `orders.create` has no qty cap and a bundle line is `perBundleQty × qty`, so COL-2 P2 fails the delivery and accept would break the `qty BETWEEN 1 AND 999` CHECK
- [x] [Review][Decision] R2: COL-2 Q4 — the prompt's rendering decision (`FR-COL-7 { orderId, lineCount }`) has no field in `PromptRowDTO`
- [x] [Review][Decision] R3: §13 copy — "Agregamos 1 cartas" / "con 1 cartas": a count placeholder inside a plural, and `entryCount` counts lines, not copies
- [x] [Review][Patch] A year-0000 `acquiredAt` passes `isCalendarDate` and fails the insert as 500 [src/modules/collections/domain/col.ts]
- [x] [Review][Patch] COL-2 P2 accepts any `Date.parse` string as the close fact; check the ISO instant shape [src/modules/collections/application/col.v2.ts]
- [x] [Review][Patch] COL-2 P2 refuses a `null` `unitPriceCop` on a bundle line; treat null as absent [src/modules/collections/application/col.v2.ts]
- [x] [Review][Patch] `insertPrompt` `rows[0]!` turns a missing conflict row into a TypeError; raise Unexpected [src/modules/collections/infra/pg.ts]
- [x] [Review][Patch] `CollectionNameTaken` cites `{ field: 'name' }`; the frozen 11.1 spec says `{ name }` [src/modules/collections/application/col.v2.ts]
- [x] [Review][Patch] ARCHITECTURE AD-COL-1 rule 2 still says the limit cannot be reached on the add path, and the §6.10 router table omits `CollectionLimitReached` on `collections.addEntry` [_bmad-output/planning-artifacts/ARCHITECTURE.md]
- [x] [Review][Patch] The qty/date src test does not assert `CollectionEntry` stays empty; no test covers a bundle line's null price [src/modules/collections/application/col.v2.test.ts]
- [x] [Review][Defer] Collection names are not trimmed (whitespace-only, "Keep " vs "Keep") — deferred, the repo-wide trim item (Epics 3, 8, 9); decide it with the collection forms (UI 9.1, 9.4)
- [x] [Review][Defer] `PromptAlreadyResolved` renders the raw status token and ISO instant in Spanish text — deferred, the repo-wide convention of Epic 7's item; the prompt pages' copy (UI 6.2, 9.4) maps it

Resolved (decision log Impl-1 #36): R1 split a line into entries of at most 999 copies; R2 deferred to the prompt page story (UI 6.2, 9.4), see deferred-work.md; R3 count-neutral §13 copy; every patch applied in the close-review commit.
