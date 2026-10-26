---
title: "TEZG event catalog — envelope, payloads, publishers, subscribers"
status: draft — Phase 1–2 gate pending
types: src/shared-kernel/events.ts (EventEnvelope, EventPayloads, EVENT_SCHEMA_VERSIONS, EVENT_SUBSCRIBERS)
storage: OutboxEvent + EventDelivery in schemas/001_tezg_schema.sql
---

# Event catalog

Every event is an `OutboxEvent` row written in the publisher's transaction (AD-SYS-2 rule 1). It is dispatched in process after commit, and each registered subscriber gets its own `EventDelivery` row. The payloads are exactly ADD-§5 (AD-9). Refinement R-1 adds the envelope fields below **around** the payload, never inside it.

## 1. Envelope (R-1, review G-01)

| Field | Type | Source | Rule |
|---|---|---|---|
| `eventId` | `CuidId` | `OutboxEvent.id`, from `IdGenerator` | Unique. Subscribers' natural keys make a redelivery a no-op; `eventId` identifies the delivery in logs, replays and `EventDelivery` |
| `type` | one of the 7 names below | `OutboxEvent.type` (CHECK-listed) | — |
| `occurredAt` | ISO-8601 UTC | `OutboxEvent.createdAt`, the publishing transaction's `Clock` instant | Equal to the state change's own timestamp (for example `decidedAt`, `sellerReceivedConfirmedAt`) because both come from the same `now` |
| `schemaVersion` | integer ≥ 1 | `OutboxEvent.schemaVersion` (`EVENT_SCHEMA_VERSIONS`) | Every V1 event is `1`. A breaking payload change (a removed or retyped field) bumps it, and subscribers must accept every version they are registered for. Adding an optional field is not breaking |
| `payload` | per type, below | `OutboxEvent.payload` (jsonb object) | Passes the AD-SYS-8 redactor. The canary scan expects 0 regulated values (NFR-SYS-2) |

`aggregateId` (the first key of the payload) is a storage column for lookups. It is not part of the envelope.

## 2. Delivery semantics (AD-SYS-2)

- **At least once in delivery, exactly once in effect.** Each subscriber is idempotent by the natural key in §3, and a test delivers every event 3 times, in both orders where there are two triggers.
- **At most 3 automatic attempts** for a delivery whose outcome was never recorded. A recorded failure is never retried automatically: it waits for `admin.events.replay` (S-SYS.replay), which raises `EventDeliveryNotReplayable` (HTTP 409, shared-kernel) unless the delivery is `failed`.
- **No ordering guarantee between events.** Order-sensitive subscribers carry their own gate: the `ledgerSeq` gate for commission crossings, and the newest-`decidedAt` rule for application decisions.

## 3. Events

### 3.1 `BusinessApplicationApproved` (schemaVersion 1)

- **Published by:** VER-1 `decideApplication` (approve), in the transition's transaction.
- **Payload** (`BusinessApplicationApprovedV1`): `applicationId: CuidId`, `businessId: CuidId`, `businessName: string`, `approvedAt: Instant`, `approvedBy: CuidId`.
- **Subscribers:**
  - commission → S-FR-COM-1 `openCommissionAccount`. Key `businessId` (`CommissionAccount` PK, `ON CONFLICT DO NOTHING`). Only on insert, it publishes `CommissionBalanceExhausted { ledgerSeq: 0, balanceAfter: 0 }`.
  - listings → S-FR-INV-8 `applyApplicationDecision`. Key `applicationId` (`AppliedApplicationDecision` PK). It applies only if this is the newest decision for the business.

### 3.2 `BusinessApplicationRejected` (schemaVersion 1)

- **Published by:** VER-1 (reject).
- **Payload** (`BusinessApplicationRejectedV1`): `applicationId`, `businessId`, `reasonCode: string`, `rejectedAt: Instant`, and exactly one of `reapplyNotBefore: Instant` or `barred: true`.
- **Subscribers:** listings → S-FR-INV-8. Key `applicationId`. Withdraws the business's listings with `withdrawnReason='ApplicationRejected'` if this is the newest decision.

### 3.3 `OrderPaymentConfirmedByBusiness` (schemaVersion 1)

- **Published by:** ORD-3 `confirmPaymentReceived`, only when its conditional update affected 1 row.
- **Payload** (`OrderPaymentConfirmedByBusinessV1`): `orderId`, `businessId`, `buyerId`, `totalCop: Cop`, `lines: [{ listingId, itemRef, title, qty, unitPriceCop }]`, `sellerReceivedConfirmedAt: Instant`, `buyerItemReceivedConfirmedAt: Instant | null`.
- **Subscribers:** commission → COM-1 `applyOrderDeduction`. Key `orderId`: partial unique `CommissionLedgerEntry(orderId) WHERE kind='Deduction'`.

### 3.4 `OrderClosed` (schemaVersion 1)

- **Published by:** ORD-4 `confirmItemReceived`, only when its conditional update affected 1 row.
- **Payload** (`OrderClosedV1`): `orderId`, `buyerId`, `businessId`, `totalCop`, `lines: [{ itemRef, title, qty, unitPriceCop? }]`, `sellerReceivedConfirmedAt: Instant | null`, `buyerItemReceivedConfirmedAt: Instant`. Bundle lines arrive expanded per component (`qty = perBundleQty × order qty`) without `unitPriceCop` (AD-ORD-2 rule 5).
- **Subscribers:**
  - commission → COM-1. Key `orderId`, the same index as §3.3. Whichever of §3.3 and §3.4 arrives first charges, with values from `commissionTrigger(facts)` (AD-SYS-3).
  - collections → COL-2 `onOrderClosed`. Key `orderId` (`PostPurchasePrompt.orderId` unique).

### 3.5 `CommissionBalanceExhausted` / `CommissionBalanceReplenished` (schemaVersion 1)

- **Published by:** COM-1 (a crossing from `> 0` to `≤ 0`), COM-2 (from `≤ 0` to `> 0`), and S-FR-COM-1 (the seq-0 `Exhausted` on opening). Each is published exactly once per crossing (AD-COM-1 rule 3).
- **Payload** (`CommissionBalanceCrossingV1`): `businessId`, `ledgerSeq: integer ≥ 0`, `balanceAfter: integer` (signed; AD-19).
- **Subscribers:** listings → INV-3 `applyCommissionProjection`. Key: the `ledgerSeq` gate. It applies when no `SellerCommissionState` row exists or `ledgerSeq > lastAppliedSeq`, so `Replenished(5)` followed by a late `Exhausted(4)` leaves the listings resumed.

### 3.6 `TradeAccepted` (schemaVersion 1)

- **Published by:** TRD-1 `acceptOffer`, step 7.
- **Payload** (`TradeAcceptedV1`): `tradeOfferId`, `listingId`, `sellerId`, `proposerId`, `terms: { offeredItems[], cashCop, requestedQty: 1 }`, `acceptedAt`.
- **Subscribers:** none in V1, so no `EventDelivery` row is written. The row is kept so that a v2 notification subscriber can process history after a backfill migration of its `pending` rows (AD-SYS-2 rule 3).

## 4. Consistency with the contracts

| Event | Publishing clause | Subscriber clause |
|---|---|---|
| `BusinessApplicationApproved` | VER-1 Q3 | S-FR-COM-1, S-FR-INV-8 |
| `BusinessApplicationRejected` | VER-1 Q3 | S-FR-INV-8 |
| `OrderPaymentConfirmedByBusiness` | ORD-3 Q3 | COM-1 |
| `OrderClosed` | ORD-4 Q3 | COM-1, COL-2 |
| `CommissionBalanceExhausted` | COM-1 Q3, S-FR-COM-1 | INV-3 |
| `CommissionBalanceReplenished` | COM-2 Q3 | INV-3 |
| `TradeAccepted` | TRD-1 Q1 step 7 | — |

`EVENT_SUBSCRIBERS` in `src/shared-kernel/events.ts` is the machine-readable copy of the subscriber column. The `EventDelivery.subscriber` CHECK lists the same three modules.
