---
design_intent: D
design_status: specified
module: COM
annex_scenario: 2
---

# COM-S2: One Sale, One Commission, Whatever Arrives First

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-COM-4, FR-COM-5, FR-COM-8 (Annex scenario COM-2, Deduction on a Confirmed Sale)

---

## Transaction (Q1)

**What this scenario covers:**
- A business payment confirmation (or a buyer close, whichever is delivered first) deducts the commission exactly once per order.
- The amount uses the integer round-half-up rule and the rate in force at the trigger time (FR-COM-5).
- The ledger line names the order, the rate and the base. When the buyer closed first, it says so and points to support.
- Redelivery is a no-op, and the developer can prove it in 7.5.

---

## Business Goal (Q2)

**Goal:** PRD §1, "exactly-once commission".
**Objective:**
- 1 ledger entry per `orderId`, always.
- Reconciliation reports 0 discrepancies (FR-COM-8).

---

## User & Situation (Q3)

**Personas:** Andrés (business); a developer.
**Situation:** On 13 oct 2026, 9:12 a. m., Andrés taps "Recibí el pago" on Camila's $180.000 order in 6.3 (ORD-S2). The rate in force is 800 bps (a fixture value). His balance is $50.000.

---

## Driving Forces (Q4)

**Hope (Andrés):** See exactly what he was charged, and why.
**Worry (Andrés):** Being charged twice when the app retries, or charged for an order that went wrong.
**Hope (developer):** Prove that delivery order and duplicates never change the amount.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Andrés on desktop (D, business desk); the developer on desktop (H).
**Entry:**
- Andrés: 6.3 → "Ver movimiento" → 7.2.
- Developer: `/dev/com` (7.5).

---

## Best Outcome (Q7)

**User Success:**
- 7.2 shows the newest line first: "13 oct 2026, 9:12 a. m. · Comisión del pedido #k3f9… (8 % de $180.000) · −$14.400 · Saldo $35.600", with "Ver pedido" → 6.3.
- 7.1 now reads "$35.600 · Activa".

**Business Success:**
- `c = floor((180.000 × 800 + 5.000) / 10.000) = 14.400`.
- One `Deduction` entry with `trigger=businessConfirmed`. When Camila later closes the order (16 oct), `OrderClosed` hits the unique key, and nothing changes.
- In 7.5, delivering the event 3 times still gives 1 entry.

---

## Shortest Path (Q8)

1. **Business Order Desk (6.3)** — "Recibí el pago".
2. **Commission Ledger (7.2)** — one line, with rate and base.
3. **Concurrent-Deduction Simulator (7.5)** — redelivery ×3 → 1 entry. ✓

---

## Trigger Map Connections

**Personas:** Andrés; developer

**Driving Forces Addressed:**
- ✅ **Want:** A transparent, traceable charge.
- ❌ **Fear:** Double charges; unexplained deductions.

**Business Goal:** AD-3, AD-10, AD-19; OQ-3 gate decision ("charge on the first trigger").

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| COM-S2.1 | [`../06-ord-order-comprobante/6.3-business-order-desk/`](../06-ord-order-comprobante/6.3-business-order-desk/6.3-business-order-desk.md) | Confirming payment triggers the deduction | "Ver movimiento" |
| COM-S2.2 | [`7.2-commission-ledger/`](7.2-commission-ledger/7.2-commission-ledger.md) | The ledger line: rate, base, balance after | — |
| COM-S2.3 | [`7.5-concurrent-deduction-simulator/`](7.5-concurrent-deduction-simulator/7.5-concurrent-deduction-simulator.md) | Redelivery and trigger-order proofs | Scenario success ✓ |

**First step** (COM-S2.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Buyer-closed variant:** if Camila had closed the order before Andrés confirmed, the line would read "Comisión cobrada porque el comprador confirmó que recibió el producto; no habías confirmado el pago." with "Contactar a soporte", and `trigger=buyerClosed`. Sebastián can filter these on the admin 7.2.
