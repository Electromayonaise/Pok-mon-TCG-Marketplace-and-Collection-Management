---
design_intent: D
design_status: specified
module: ORD
annex_scenario: 1
---

# ORD-S1: Camila Buys from Tienda Andrés, and the Card Is Held Before She Pays

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-ORD-1, FR-ORD-7, FR-INV-3, FR-INV-5 (release on cancel), FR-VER-9 (Annex scenario ORD-1, Purchase and Reserve)

---

## Transaction (Q1)

**What this scenario covers:**
- A buyer purchases a listing from a verified, funded business.
- The unit is reserved in the same transaction that creates the order, before any payment fact exists.
- The order snapshots the business's payment instructions, and the page shows them with an absolute pay-by deadline.
- The open-order limits and the self-purchase rule refuse the purchase and name the next step.
- The buyer can cancel before paying; the reservation is released exactly once (FR-ORD-7).

---

## Business Goal (Q2)

**Goal:** PRD §1, "the platform never models funds held" and "concurrency-safe".
**Objective:**
- 0 oversold units.
- Every created order has a reservation and an `expiresAt`.
- Order creation has p95 ≤ 800 ms (NFR-ORD-2).

---

## User & Situation (Q3)

**Persona:** Camila, 31, Medellín, a casual buyer (UJ-1 step 3).
**Situation:** It is 12 oct 2026, 4:20 p. m. On the bus home, Camila opens Charizard ex from "Cerca de ti". Tienda Andrés has it in NM for $180.000, 4,2 km away; the shop is verified and the listing can be bought. She has no other open orders.

---

## Driving Forces (Q4)

**Hope:** Secure the card now, before someone else does, and know exactly how and by when to pay.

**Worry:** Paying into a stranger's bank account and then being told the card is gone. A vague "pay soon" with no deadline.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Android phone (R, mobile).
**Entry:** 3.1 → the listings block on 2.2 → "Comprar" on Tienda Andrés's row → 6.1.

---

## Best Outcome (Q7)

**User Success:**
- 6.1 shows the listing summary, quantity 1 (the only unit available) and the total "$180.000".
- She taps "Confirmar compra". The page re-renders as the order: "Paga a Tienda Andrés directamente con los datos de abajo y luego sube tu comprobante. Paga antes del 14 oct 2026, 4:20 p. m."
- The `payment-details-block` shows Andrés's bank, account type, account number, holder and QR. Each value has a "Copiar" action.
- The primary action is "Ir al pedido" → 6.2.

**Business Success:**
- At creation, `InventoryUnit.quantity` drops from 1 to 0, and other buyers see the listing as "Agotada".
- The order stores snapshots of the listing, the business and the payment instructions. A later edit of the payment details on 5.2 does not change them.
- No event is published at creation.

---

## Shortest Path (Q8)

1. **Card Detail (2.2)** — "Comprar" on a business row that can be bought.
2. **Purchase & Payment Instructions (6.1)** — confirm, reserve and read how to pay. ✓

---

## Trigger Map Connections

**Persona:** Camila — a casual buyer who wants a nearby card with no surprises

**Driving Forces Addressed:**
- ✅ **Want:** The card held for her; clear payment details; a real deadline.
- ❌ **Fear:** Paying for a card that's gone; hidden conditions.

**Business Goal:** CAP-17 (reservation at creation); AD-6.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| ORD-S1.1 | [`../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/`](../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/2.2-card-detail-price-provenance.md) | Choose a business listing that can be bought | "Comprar" → 6.1 |
| ORD-S1.2 | [`6.1-purchase-payment-instructions/`](6.1-purchase-payment-instructions/6.1-purchase-payment-instructions.md) | Confirm; the unit is reserved; see the payment instructions and deadline | "Ir al pedido" → 6.2 · Scenario success ✓ |

**First step** (ORD-S1.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Refusal variants (on 6.1, a banner replaces "Confirmar compra"):**
- A second order at Tienda Andrés while the first is unpaid returns `TooManyOpenOrders` (per business), with "Ver pedido".
- A fourth unpaid order anywhere returns `TooManyOpenOrders` (total).
- Andrés opening his own listing gets `SelfPurchaseNotAllowed`.
- Losing the last unit to another buyer shows the INV-S3 copy (see [`../04-inv-listing-shared-inventory/S3-concurrent-last-unit.md`](../04-inv-listing-shared-inventory/S3-concurrent-last-unit.md)).
- An unverified email returns `EmailNotVerified`, passed through unchanged from IDN.

**Cancel variant (FR-ORD-7):** before paying, "Cancelar pedido" on 6.2 opens a destructive dialog. After confirming, the unit returns to the listing exactly once. A second cancel, from another tab, returns `OrderNotCancellable` ("…ya estaba cancelado").
