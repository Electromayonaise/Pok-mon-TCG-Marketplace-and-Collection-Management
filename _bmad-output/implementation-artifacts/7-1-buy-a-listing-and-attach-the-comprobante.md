---
title: 'Story 7.1: Buy a listing and attach the comprobante'
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

**Problem:** `createOrder` and the three comprobante operations throw `NotImplementedError`. The 7 bound tests are red, and no buyer can order from a business.

**Approach:** ORD-1 as written in contracts.md §6 and AD-ORD-1, and S-FR-ORD-2 (ticket, upload, URL) as written in §15 and AD-ORD-3 rule 2. A new `PgOrdRepository` joins the one repository (R-14), in `wiring()` and `compose()`. The `orders.create`, `orders.createComprobanteUpload`, `orders.uploadComprobante` and `orders.comprobanteUrl` procedures are wired.

## Boundaries & Constraints

**Always:**
- **ORD-1, before the main transaction (AD-ORD-1 rule 1):** P1 `canBuy` is the `canBuy` procedure builder (`IdentityForOrd` has no such method). P2 `listings.getListingForPurchase` propagates `ListingNotFound`. P3 `sellerId = buyerId` → `SelfPurchaseNotAllowed`, citing `FR-ORD-1`, before any reserve. Then the expiry pre-step (AD-ORD-2 rule 7): `getInventoryUnitIds`, and for each open order with `"reservedUnitIds" && :unitIds` and `"expiresAt" <= :now` (by `expiresAt`, limit 20) one short transaction: the conditional expiry, `releaseReservation(tx, ref)` on 1 row, and a `system` audit row. This is the materializer that Story 7.5's `expireDueOrders` exposes.
- **ORD-1, one transaction, in order:**
  1. `pg_advisory_xact_lock(hashtextextended('orders:buyer:' || buyerId, 0))`;
  2. P4: the open orders (`buyerPaidConfirmedAt`, `cancelledAt`, `expiredAt` null and `expiresAt > :now`) number < 3 overall and < 1 with this business, else `TooManyOpenOrders` citing `{ openOrderIds }` (comma-joined, id order);
  3. P5 `reserveForPurchase(tx, …)`; its refusals propagate unchanged;
  4. `identity.getBusinessPaymentInstructions`; `null` → `Unexpected`;
  5. `INSERT "Order"` with both snapshots, `totalCop = unitPriceCop × qty`, `reservationRef`, `reservedUnitIds` (the ref's unit ids), `expiresAt = now + 48 h`, `createdAt = updatedAt = now`;
  6. the audit row `orders.order.created`. No event.
- The decision `OrderCreated` cites `{ rule: 'FR-ORD-1', inputs: { orderId, qty, totalCop, expiresAt } }`. The Clock is read once.
- **`getBusinessPaymentInstructions` reads on the ambient transaction** (AD-SYS-4 rule 9), like INV's `reading()`. Today it opens a second connection inside the order's transaction, which waits forever on a pool of 1.
- **S-FR-ORD-2.ticket:** the buyer of a visible, unpaid, active order gets `storage.createUploadTicket('comprobante/<buyerId>/<cuid2>')`. Otherwise `OrderNotVisibleToCaller`, `OrderNotOwnedByCaller`, `ComprobanteLocked` or `OrderNoLongerActive`.
- **S-FR-ORD-2.upload (AD-ORD-3 rule 2):**
  - the order visible to the actor, and the actor its buyer;
  - the key has the prefix `comprobante/<buyerId>/` and exists in quarantine;
  - at most 5 MiB, magic bytes (JPEG, PNG or PDF), and a clean scan, else `ComprobanteInvalidFile` with `{ cause }`;
  - `put` the sanitized bytes under `order-comprobantes/<cuid2>`;
  - then `UPDATE … SET "comprobanteObjectKey", "comprobanteUploadedAt" WHERE … "buyerPaidConfirmedAt" IS NULL AND "cancelledAt" IS NULL AND "expiredAt" IS NULL AND "expiresAt" > :now RETURNING` the previous key, with an audit row `orders.comprobante.attached`.
  - On 0 rows: the new object is deleted, and the call raises `ComprobanteLocked` (paid) or `OrderNoLongerActive`.
  - After the commit: the previous object and the quarantine object are deleted, best effort.
  - The response has `replacedPrevious` and the decision `ComprobanteAttached`.
- **S-FR-ORD-2.url:** for an order visible to the actor, `storage.sign('order-comprobantes', key, 600)`, with the decision `ComprobanteUrlIssued`. With no comprobante: `url: null`, `expiresAt: null` and `ComprobanteNotUploaded`.
- **No regulated value in an error, a citation or the audit.** The object key never leaves `orders/infra` and the storage calls.
- **§13 stored-only rows, with no placeholders:** `OrderCreated`, `ComprobanteAttached`, `ComprobanteUrlIssued` and `ComprobanteNotUploaded`. Then run `node scripts/gen-solu2-api.mjs`.
- **NFR-ORD-2:** `[NFR-ORD-2.p95]` (already bound to this story) runs on the real composition. Refresh the ORD rows of `nfr-evidence.md`.
- **src tests:** `ord.v2.test.ts` covers the pre-step, the 1-per-business limit, the ticket and a refused file. `composition.test.ts` adds HTTP cases for `orders.create` (a pool of 1) and the comprobante procedures.

**Ask First:** a DTO or bound-test change; a second statement in the open-order count.

**Never:** a read of a `listings`, `catalog` or `identity` table (AD-1, AD-8); an event at creation; a balance, escrow or status column.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Buy 2 | listing at 45,000 | `AwaitingPayment`, 90,000, 48 h, audit row, no event | N/A |
| Two at once | same buyer, same business | one order | `TooManyOpenOrders` 409 |
| Replace before paid | an old comprobante | new key, old object and quarantine gone | N/A |
| Upload after paid | paid order | promoted object deleted | `ComprobanteLocked` 409 |
| URL | uploaded comprobante | `expiresAt = now + 600 s` | N/A |
| Bad file | wrong magic bytes | nothing promoted | `ComprobanteInvalidFile` 400 |

</frozen-after-approval>

## Code Map

- `src/modules/orders/domain/ord.ts` -- `deriveStatus`, the open-order rule, the comprobante key shape
- `src/modules/orders/ports/ord.v2.ts` + `infra/pg.ts` -- `OrdRepository` / `PgOrdRepository`
- `src/modules/orders/application/ord.v2.ts` -- `createOrder`, `createComprobanteUpload`, `uploadComprobante`, `getComprobanteUrl`, the private expiry materializer
- `src/modules/identity/application/ver.v2.ts` -- `getBusinessPaymentInstructions` on the ambient transaction
- `test-support/solu2/fixtures.ts`, `src/server/composition.ts` (+ test) -- `PgOrdRepository`, `OrdServiceV2`, four procedures
- `contracts.md` §13 -- four stored-only rows
- `_bmad-output/test-artifacts/nfr-evidence.md` -- NFR-ORD-2, NFR-ORD-3

## Tasks & Acceptance

**Execution:**
- [x] domain, repository, `createOrder` with the pre-step; §13 rows and the generator
- [x] the comprobante ticket, upload and URL
- [x] `getBusinessPaymentInstructions` on the ambient transaction
- [x] `wiring()`, `compose()`, the four procedures with HTTP cases; src tests
- [x] the benchmark run, `nfr-evidence.md`
- [x] `sprint-status.yaml` -- 7.1 `done`, `epic-7: in-progress`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 7.1 `done`, when the 7 bound tests run, then they pass. Story 7.3's three tests are early greens, restored by the 7.3 commit (decision #23).

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/ord_contracts.test.ts -t "ORD-1"` -- expected: the ORD-1 tests pass
- `timeout 300 npx vitest run --project solu2-nfr _bmad-output/test-artifacts/nfr/ord1_latency.test.ts` -- expected: p95 ≤ 800 ms
- `npx tsc --noEmit` -- expected: clean

## Implementation Notes

- Code review is batched with the rest of Epic 7 at its close (decision #22).
- Martín approved the five Epic 7 specs together, with these choices (decision log Impl-1 #32): the whole epic is built, 7.3 and 7.4 as proof-only stories; the admin check of 7.5 uses identity's own guard; an unset support contact is `Unexpected` and deferred.
- **The benchmark's Given (decision #32).** `[NFR-ORD-2.p95]` as written spread 550 purchases over `buyerId(5 + k % 218)` and every funded listing, without regard to the business, and used buyers the seed leaves with an open order. ORD-1 P4 (1 open order per business, 3 per buyer) refused part of them as `TooManyOpenOrders`. Martín approved a change to the Given only: buyers with an open seed order are set aside, and a buyer's k-th call goes to its k-th business. What is measured and the threshold are unchanged.
- `getBusinessPaymentInstructions` now reads on the ambient transaction (AD-SYS-4 rule 9). The pool-of-1 test in `ord.v2.test.ts` would wait on a second connection otherwise.
- `OrderFacts` carries `hasComprobante` instead of the key: the key is read only by `comprobanteKeyOf`, for the storage calls (AD-17).
- `TooManyOpenOrders` cites every open order at the overall limit (3), and only the orders with this business at the per-business limit (1), comma-joined in id order.
- A refused upload (`ComprobanteLocked`, `OrderNoLongerActive`, an ownership refusal) deletes the promoted copy and the quarantine object. Any other failure deletes only the promoted copy, so the same key can be retried. After the commit the previous comprobante and the quarantine object are deleted, best effort.
- The production `ObjectStorage` and `MalwareScanner` are still `UNWIRED_STORAGE` and `UNWIRED_SCANNER`, so in production the ticket, the upload and the URL fail as NotImplemented (500) (`deferred-work.md`, Story 3.1). The tests bind `InMemoryObjectStorage` and `SimulatedScanner`.
- §13: `OrderCreated`, `ComprobanteAttached`, `ComprobanteUrlIssued` and `ComprobanteNotUploaded` join as stored-only rows with no placeholders (decision #16).
- Measured (local Postgres 16): `[NFR-ORD-2.p95]` p95 11.9 ms (p50 5.4).
