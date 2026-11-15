---
title: 'Story 10.1: Make, read and withdraw a trade offer'
type: 'feature'
created: '2026-10-30'
status: 'done'
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

**Problem:** `TrdServiceV2.makeOffer`, `resolveOffer`, `getOffer` and `listMyOffers` throw `NotImplementedError`: a collector cannot offer cards or cash for an individual listing open to trade, nor read or withdraw the offer.

**Approach:** S-FR-TRD-1, S-FR-TRD-2w, S-FR-TRD-3.get and S-FR-TRD-3.mine as written in contracts.md §15 and AD-TRD-1, on a new `PgTrdRepository` bound into the one repository (R-14). Every mutation takes `trd:seller:<sellerId>` first (AD-TRD-2 rule 1, AD-SYS-4 rule 4).

## Boundaries & Constraints

**Always:**
- **Domain (pure, `domain/trd.ts`):** `deriveOfferStatus` (Open with `expiresAt ≤ now` → Expired), `turnVerdict`, `roleOf`, `canonicalTerms`, and `checkTerms`: shape errors (cashCop not an integer in 0–100,000,000; > 10 items; qty not 1–4; requestedQty ≠ 1) → `RequestValidationFailed`; no item and cashCop 0 → `EmptyTradeOffer` (400). **D6 (approved):** this closes the Epic 9 deferral on the trading side — terms reach the handoff only after `checkTerms`.
- **makeOffer** order: `listings.getTradeability(tx)` (its refusals propagate) → `SelfTradeNotAllowed` (proposer = seller) → `checkTerms` → `listings.resolveItemRefs` (any missing → `InvalidItemRef`, listings-owned, raised by listings' code path) → lock → materialize the proposer's own expired Open offer on that listing (`Open → Expired`, audit `system`) → insert `Open`, turn `seller`, roundCount 1, version 0, `expiresAt = now + 7 d` + round 1 `offer` + audit `trading.offer.made`. A live Open offer (pre-read under the lock; the partial unique index as backstop, 23505) → `DuplicateOpenOffer`.
- **resolveOffer:** `withdraw` = the proposer, no turn predicate; `reject` = the turn holder. One conditional `UPDATE … WHERE status='Open' AND version AND "expiresAt" > now [AND turn]`; 0 rows → the shared re-read mapper (D4); round `withdraw`/`reject`; audit.
- **getOffer / listMyOffers:** visibility `proposerId = actor OR sellerId = actor`; else `TradeOfferNotVisibleToCaller` (403) with citations that name no id, so the body equals an unknown id's. Status derived at read. `mine`: `side` sent/received/any, optional derived `status`, ordered `("updatedAt" DESC, id DESC)`, 20 per page, the keyset cursor pattern of `orders.mine`; each offer with its rounds. Zero writes.
- Decisions with stored-only §13 rows: `TradeOfferMade`, `TradeOfferWithdrawn`, `TradeOfferRejected`, `TradeOfferShown`.
- **Wiring:** `trading.offer`, `trading.reject`, `trading.withdraw`, `trading.get`, `trading.mine` in `composition.ts` with the real `listings` (P-INV.trade surface) + one HTTP case.

**Ask First:** a DTO, port or bound-test change beyond D3/D4.

**Never:** a read of `listings` or `catalog` tables from trading SQL (AD-1, AD-8); a trading import of `catalog`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Make | listing open to trade | Open, turn seller, v0, round 1 | N/A |
| Second live offer | Open exists | nothing written | `DuplicateOpenOffer` |
| Own expired offer | Open, past expiry | old → Expired, new Open | N/A |
| Withdraw | proposer, current v | Withdrawn | N/A |
| Stale withdraw | old v | unchanged | `TradeOfferNotOpen` |
| Third party read | — | body = unknown id's | `TradeOfferNotVisibleToCaller` |
| Mine, past expiry | Open | reads Expired, no write | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/trading/domain/trd.ts` (+ test) -- pure rules
- `src/modules/trading/ports/trd.v2.ts`, `infra/pg.ts` (`PgTrdRepository`) -- lock, insert, conditional updates, reads
- `src/modules/trading/application/trd.v2.ts`, `index.ts` -- the four use cases
- `src/server/composition.ts` (+ test), `test-support/solu2/fixtures.ts` (`wiring` repo gains `PgTrdRepository`)

## Tasks & Acceptance

**Execution:**
- [x] domain + src tests; repository + service; wiring + HTTP case
- [x] `sprint-status.yaml` -- 10.1 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 10.1 `done`, when `[S-FR-TRD-1.h]`, `[S-FR-TRD-2w.h]`, `[S-FR-TRD-3.h]`, `[S-FR-TRD-3.mine.h]` run, then they pass; 10.4's `[S-FR-TRD-1.f]`, `[S-FR-TRD-2w.f]`, `[S-FR-TRD-3.f]` are early greens restored by the 10.4 commit (#23).

## Verification

- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/trd_supporting.test.ts` -- the 4 bound tests pass

## Implementation Notes

- Code review is batched with the rest of Epic 10 at its close (decision #22).
- `InvalidItemRef` is listings' code: listings exports `requireTradeItems(items, refs)` beside its service (the `requireBusinessAccount` pattern of #33), so trading raises no listings code. It also checks that each condition fits the item's kind.
- Every mutation reads the offer once for visibility and the seller, takes `trd:seller`, re-reads, maps a refusal with the D4 order, then runs the conditional update; under the lock the update cannot miss (a miss is `Unexpected`).
- A seller's `withdraw` is `NotYourTurn` citing `{ withdraw: 'proposer' }`: withdraw is the proposer's, and the seller's way out is reject on her turn.
- The visibility refusal cites `{ visible: false }` under `AD-TRD-1 rule 4`, with no id, so a third party's body equals an unknown id's.
- Wired: `trading.offer`, `trading.reject`, `trading.withdraw`, `trading.get`, `trading.mine`; TRD's `listings` port is INV's trade surface plus the contact service. §13 gains `TradeOfferMade`, `TradeOfferWithdrawn`, `TradeOfferRejected`, `TradeOfferShown`.
