---
title: 'Story 7.5: Cancel, expire, read and support orders'
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

**Problem:** The eight supporting operations of ORD throw `NotImplementedError`. The 10 bound tests are red. Nobody can read or cancel an order, the expiry has no entry point, and `reviews` (Epic 13) has no `hasClosedPurchase`.

**Approach:** S-FR-ORD-6 to S-FR-ORD-10 as written in contracts.md §15 and AD-ORD-2/3. The reads use the one visibility predicate and derive the status at read (AD-ORD-2 rule 8). `cancelOrder` and `expireDueOrders` share the conditional transition and the single release that 7.1 and 7.2 already use.

## Boundaries & Constraints

**Always:**
- **S-FR-ORD-6:** `getOrder` and `listOrders` (`purchases`: `"buyerId" = :actor`; `sales`: `"businessId" = :actor AND "buyerPaidConfirmedAt" IS NOT NULL`). Pages hold 25 rows, newest first by `("createdAt", id)`, with a keyset cursor (`RequestValidationFailed` on a cursor this service did not issue). Each `OrderViewDTO` carries `status = deriveStatus(facts, now)`, its `role`, and a decision per status: `OrderAwaitingPayment`, `OrderPaid`, `OrderPaymentConfirmed`, `OrderCompleted`, `OrderCancelled` or `OrderExpired`. All are stored-only §13 rows with no placeholders. A paid order whose business has not confirmed after 7 days reads `OrderAwaitingBusiness`, and the page shows the support contact (NFR-ORD-4). Reads write nothing.
- **S-FR-ORD-7:** the buyer's conditional `UPDATE … SET "cancelledAt", "cancelReason" = 'BuyerCancelled'` with `expiresAt > :now`, then `releaseReservation` on 1 row, then the audit row `orders.order.cancelled`. On 0 rows, the order is re-read through the visibility predicate: a business actor gets `OrderNotOwnedByCaller`. When `expiresAt ≤ now` with nothing materialized, the expiry is materialized first and then the call fails. Any other state gets `OrderNotCancellable` citing `{ orderId, status }`. The decision is `OrderCancelled`.
- **S-FR-ORD-8:** `expireDueOrders({ scope, trigger })` exposes 7.1's materializer:
  - `'all'` takes batches of 200, and `{ listingUnitIds }` a batch of 20;
  - one transaction per order;
  - it stops when a batch comes back short or 50 s of Clock time have passed;
  - it returns `{ expired, released }`, where `released` sums the `releasedUnits` of each release.
  
  No route calls it yet; the jobs route belongs with the tick and the crons (`deferred-work.md`).
- **S-FR-ORD-9:** `closed = EXISTS (… "buyerItemReceivedConfirmedAt" IS NOT NULL)` for the pair, and `latestState = deriveStatus` of the pair's newest order, or `null`.
- **S-FR-ORD-10:**
  - `adminLookupOrders` runs the admin check first (AD-16; the mechanism Martín chooses at the spec approval). It then reads by any of `orderId`, `buyerId` or `businessId`, at most 50 rows, and inserts one `"OrderLookupLog"` row (`query` holds the ids, `resultOrderIds` the rows found). It has no write path to `"Order"`.
  - `getSupportContact` is public and reads the singleton.
  - `setSupportContact` (admin) upserts the singleton, inserts one `"SupportContactChange"` (`before`, `after`), and writes an audit row.
- **Wiring:** `orders.get`, `mine`, `sales`, `cancel`, `adminLookup`, `supportContact.get` and `supportContact.set`, with HTTP cases.

**Ask First:** a DTO or bound-test change; a jobs route.

**Never:** an admin write to `"Order"`; a status column; a release on a 0-row transition.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Visibility | one unpaid order, one paid | the business's sales list holds only the paid one | N/A |
| Foreign or random id | Julián | identical bodies | `OrderNotVisibleToCaller` 403 |
| Cancel ×2 | a race | released once | `OrderNotCancellable` 409 |
| Expiry job ×2 | one overdue order | `{1, 1}`, then `{0, 0}` | N/A |
| Job never ran | overdue order | reads `Expired` | N/A |
| Lookup | admin | one log row; the order is byte-identical | non-admin → `AdminOnly` 403 |

</frozen-after-approval>

## Code Map

- `src/modules/orders/domain/ord.ts` -- `deriveStatus`, the view decision, the order cursor
- `src/modules/orders/ports/ord.v2.ts` + `infra/pg.ts` -- reads, cancel, lookup log, support contact
- `src/modules/orders/application/ord.v2.ts` -- the eight operations
- `src/server/composition.ts` (+ test) -- seven procedures
- `contracts.md` §13 -- the view and cancel stored-only rows

## Tasks & Acceptance

**Execution:**
- [x] reads and their decisions; §13 rows and the generator
- [x] cancel and `expireDueOrders`
- [x] `hasClosedPurchase`, admin lookup, support contact
- [x] the seven procedures with HTTP cases; src tests
- [x] `sprint-status.yaml` -- 7.5 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 7.5 `done`, when the 10 bound tests, `[ORD-2.I2]` and `[ORD-2.MEC]` run, then they pass.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/ord_supporting.test.ts` -- expected: all 13 pass
- `npx tsc --noEmit` -- expected: clean

## Implementation Notes

- Code review is batched with the rest of Epic 7 at its close (decision #22).
- **The admin check (decision log Impl-1 #32).** identity's guard moved out of `ver.v2.ts` into `identity/application/admin.ts` and is exported as `requireAdmin(repo, tx, adminId)`. ORD's `repo` type is its own tables plus `AdminFactsReader`, and the one repository (R-14) already carries identity's adapter. So the lookup and the support-contact change check the flag in their own transaction, and identity reads its own table and raises its own `AdminOnly`. No bound test or `operations.json` changed.
- **An unset support contact (decision #32)** is `Unexpected` (500), because the DTO has no null (`deferred-work.md`).
- `Resolvers` accepts the procedures with no input schema, so `orders.supportContact.get` (public) is wired. Its resolver gets `undefined`.
- Each `OrderViewDTO` carries a decision from the pure `orderView`: `OrderAwaitingPayment`, `OrderPaid`, `OrderPaymentConfirmed`, `OrderCompleted`, `OrderCancelled` or `OrderExpired`, citing `{ orderId, at }` with the fact's instant. A paid order with no business confirmation for 7 days reads `OrderAwaitingBusiness` (`allowedWithNotice`, NFR-ORD-4). All 7 are stored-only §13 rows with no placeholders.
- An admin lookup row reads as its buyer sees it (`role: 'buyer'`), since the DTO has no admin role. The lookup also writes an audit row `orders.lookup.performed`. The `EventDelivery` rows of AD-ORD-3 rule 3 are not in `AdminLookupOrdersResponse`; the admin console reads them through `admin.events.deliveries`.
- `expireDueOrders('all')` stops on a short batch, on a batch that expired nothing (so it cannot spin on orders a concurrent command already expired), or after 50 s of Clock time. `released` sums the released units.
- No jobs route calls `expireDueOrders` yet (`deferred-work.md`).
