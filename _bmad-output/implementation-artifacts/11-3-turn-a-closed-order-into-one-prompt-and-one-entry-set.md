---
title: 'Story 11.3: Turn a closed order into one prompt and one entry set'
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
- [ ] service + subscriber + wiring; `sprint-status.yaml` 11.3 `done`; `gen:trace:solu2`; the MEC runtime recorded below (TG-7)

**Acceptance Criteria:**
- Given 11.3 `done`, when `[COL-2.Q1]`, `[COL-2.I1]`, `[COL-2.I2]`, `[COL-1.Q1]`, `[COL-1.MEC]`, `[COL-1.dismiss.h]`, `[COL-1.list.h]` run, then they pass; 11.4's `[COL-1.P1]`–`[COL-1.P3]`, `[COL-1.dismiss.f]` are early greens restored by the 11.4 commit (D1, #23).
