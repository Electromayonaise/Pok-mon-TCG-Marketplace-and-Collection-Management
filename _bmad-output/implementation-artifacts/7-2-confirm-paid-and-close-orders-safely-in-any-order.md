---
title: 'Story 7.2: Confirm paid and close orders safely in any order'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'f595122'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `confirmPaid`, `confirmPaymentReceived` and `confirmItemReceived` throw `NotImplementedError`. The 11 bound tests, the MEC of R-06 (P0), are red, and no order can be paid or closed.

**Approach:** ORD-2, ORD-3 and ORD-4 as written in contracts.md §6 and AD-ORD-2/3. Each command runs one conditional `UPDATE` on its own fact column. On 0 rows it re-reads through the one visibility predicate and maps the loser with a pure domain function. Two of the bound tests call Story 7.5's operations: `[ORD-2.I2]` calls `cancelOrder` and `[ORD-2.MEC]` calls `expireDueOrders`. They pass once 7.5 is committed. Until then the 7.2 commit is red locally, as #23 allows, and the push waits for the whole epic.

## Boundaries & Constraints

**Always:**
- **Visibility (AD-ORD-3 rule 1):** `"buyerId" = :actor OR ("businessId" = :actor AND "buyerPaidConfirmedAt" IS NOT NULL)`. A miss is `OrderNotVisibleToCaller` citing only `{ rule: 'AD-15', inputs: { visible: false } }`. The body is byte-identical for a foreign id and an unknown id.
- **ORD-2:** the `UPDATE` of contracts.md ORD-2 Q1. On 0 rows, `paidLoserCode` maps in the order P2 `OrderNotOwnedByCaller`, P3 `OrderAlreadyConfirmedByRole` (citing `{ orderId, confirmedAt }`), P4 `OrderNoLongerActive` (citing `{ orderId, status, at }`), P5 `ComprobanteNotYetUploaded`. When P4 finds `expiresAt ≤ now` with `expiredAt` null, the same transaction materializes the expiry (the conditional expiry `UPDATE`, `releaseReservation` on 1 row, a `system` audit row). It commits, then throws (AD-ORD-2 rule 4). Success writes the audit row `orders.fact.buyerPaid` and no event.
- **ORD-3:** P1 visibility (an unpaid order is invisible to its business); P2 business; P3 comprobante (defensive, `ComprobanteMissingOnConfirm`); P4 fact once; P5 not terminated (defensive). On 1 row, the same transaction enqueues one `OrderPaymentConfirmedByBusiness` (with the lines: listing id, item ref, title, qty and unit price) and writes the audit row `orders.fact.sellerReceived`. The status is `Closed` when the item is already received, otherwise `PaymentConfirmed`.
- **ORD-4:** P1 visibility; P2 buyer; P3 not terminated, and if unpaid `expiresAt > now` (an expiry is materialized first, as in ORD-2); P4 paid, else `OrderConfirmationOutOfOrder` citing `{ orderId, buyerPaidConfirmedAt: null }` with zero writes; P5 fact once. On 1 row, the same transaction enqueues one `OrderClosed` and writes the audit row `orders.fact.itemReceived`. A card or sealed product gives one line with the snapshot's `unitPriceCop`. A bundle gives one line per component, with `qty = perBundleQty × qty`, the bundle's title and no unit price (AD-ORD-2 rule 5).
- **Decisions, one Clock read each, as stored-only §13 rows with no placeholders:** `OrderPaidConfirmed` (FR-ORD-3), `OrderPaymentReceived` (FR-ORD-4) and `OrderItemReceived` (FR-ORD-5), each citing `{ orderId, <fact>At }`.
- The event payloads carry ids, amounts, titles and instants only. No comprobante key.
- **src tests:** the loser mappings (`paidLoserCode` and its two siblings) as pure functions, and HTTP cases for the three procedures.

**Ask First:** a DTO or bound-test change; a lock other than the row's own `UPDATE`.

**Never:** a fact written twice; an event outside the fact's transaction; a write on a refusal other than the materialized expiry.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Paid | comprobante uploaded | `Paid` at now, no event | N/A |
| Paid vs expiry ×100 | `now = expiresAt` | expired, released once | `OrderNoLongerActive` |
| Business before paid | unpaid order | — | `OrderNotVisibleToCaller`, same body as an unknown id |
| Business twice | race of 2 | one event | `OrderAlreadyConfirmedByRole` |
| Item before paid | unpaid order | zero writes | `OrderConfirmationOutOfOrder` 409 |
| Bundle 2 × 3 cards | paid | 3 lines, qty 2, no price | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/orders/domain/ord.ts` -- `paidLoserCode`, `businessLoserCode`, `itemLoserCode`, `closedLines`
- `src/modules/orders/ports/ord.v2.ts` + `infra/pg.ts` -- the three conditional updates and the visible re-read
- `src/modules/orders/application/ord.v2.ts` -- `confirmPaid`, `confirmPaymentReceived`, `confirmItemReceived`
- `src/server/composition.ts` (+ test) -- `orders.confirmPaid`, `orders.confirmPaymentReceived`, `orders.confirmItemReceived`
- `contracts.md` §13 -- three stored-only rows

## Tasks & Acceptance

**Execution:**
- [x] domain loser mappings and lines, with unit tests
- [x] the three commands with their events and audit rows; §13 rows and the generator
- [x] the three procedures with HTTP cases
- [x] `sprint-status.yaml` -- 7.2 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 7.2 and 7.5 `done`, when the 11 bound tests run, then they pass, and `[ORD-2.MEC]`, `[ORD-3.MEC]` and `[ORD-4.MEC]` run their full count against Postgres. Story 7.4's seven tests are early greens, restored by the 7.4 commit (decision #23).

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/ord_contracts.test.ts` -- expected: every test passes once 7.5 is done
- `npx tsc --noEmit` -- expected: clean

## Implementation Notes

- Code review is batched with the rest of Epic 7 at its close (decision #22).
- Martín approved the five specs together (decision log Impl-1 #32). This story is committed after 7.3 and before 7.4 and 7.5. Its commit is red locally on `[ORD-2.I2]` and `[ORD-2.MEC]`, which call 7.5's `cancelOrder` and `expireDueOrders`, until 7.5 lands (decision #23).
- One private `refuseFact` maps every 0-row update. It re-reads through the visibility predicate in the same transaction and applies the story's domain mapping (`paidLoserCode`, `paymentReceivedLoserCode`, `itemReceivedLoserCode`). For `OrderNoLongerActive` it materializes an unmaterialized expiry (the conditional expiry, the release and a `system` audit row) and returns the refusal, so the transaction commits before it is raised (AD-ORD-2 rule 4). Every other refusal is thrown inside the transaction and writes nothing.
- `OrderNotVisibleToCaller` cites only `{ visible: false }` under `AD-ORD-3 rule 1`, so a foreign id and an unknown id give byte-identical bodies (S-2).
- `OrderAlreadyConfirmedByRole` cites the role's own stored instant: paid, received or item.
- `OrderClosed` lines come from the pure `closedLines`. A bundle's component lines carry the bundle's title, because `orders` has no catalog port that names each component. The single-listing line's `itemRef` is the snapshot's; INV-1 Q2 always fills it for a single listing.
- §13: `OrderPaidConfirmed`, `OrderPaymentReceived` and `OrderItemReceived` join as stored-only rows with no placeholders (decision #16).
- MEC runtime (TG-7, local Postgres 16, real connections): `[ORD-3.MEC]` 201 ms; `[ORD-4.MEC]` 182 ms (a 2-way race plus the out-of-order refusal); `[ORD-2.MEC]` 571 ms for its 100 repetitions of paid racing the expiry job at `now = expiresAt`, measured once Story 7.5 built the job.

### Review Findings

Epic 7 close review (2026-10-27, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `f595122..e1018fb` (code paths). Totals for the epic: 1 decision, 12 patches, 5 deferrals, 10 dismissed. Martín resolved the decision with the recommendation and approved every patch (decision log Impl-1 #32).

- [x] [Review][Patch] A fact update or cancel that misses under its snapshot while a concurrent commit makes the re-read eligible (an upload and "paid" at once) answers 500, or `OrderNotCancellable` naming an active status [src/modules/orders/application/ord.v2.ts:refuseFact, cancelOrder] — `settleFact` (and the cancel) run the conditional update once more when the re-read finds nothing to refuse
- [x] [Review][Patch] `refuseFact` picks the cited instant by comparing rule strings [src/modules/orders/application/ord.v2.ts:refuseFact] — a `FACTS` table names each fact's rule, instant and mapping
- [x] [Review][Patch] `OrderNotVisibleToCaller` cites `AD-ORD-3 rule 1`; the frozen spec names `AD-15` [src/modules/orders/application/ord.v2.ts:notVisible] — cites `AD-15`
- [x] [Review][Dismiss] The two events build their lines differently, behind a cast — dismissed: by design: `OrderPaymentConfirmedByBusiness` has one line per listing (`itemRef` nullable in its V1 type), `OrderClosed` one per component (AD-ORD-2 rule 5); a single listing's snapshot always names its entry
