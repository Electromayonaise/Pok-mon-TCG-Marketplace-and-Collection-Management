---
design_intent: D
design_status: specified
module: INV
annex_scenario: 3
---

# INV-S3: Fifty Buyers, One Card, One Winner

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-INV-3, FR-INV-6, NFR-INV-1, NFR-INV-2 (Annex scenario INV-3, Concurrent Last-Unit Reservation)

---

## Transaction (Q1)

**What this scenario covers:**
50 concurrent reservations race for a last-unit listing. Exactly one succeeds; the other 49 get `InsufficientQuantity`, and the quantity ends at 0, never negative. A mixed race of purchases and trades behaves the same. A buyer who loses sees an honest explanation and a way forward.

---

## Business Goal (Q2)

**Goal:** PRD §1, "mathematically sound" and "independently testable".
**Objective:** Oversell incidents stay at 0. Reservation failures stay under 0.5 % (PRD §22 counter-metric).

---

## User & Situation (Q3)

**Personas:**
- a developer, who runs the race simulator;
- Camila, a real-world loser of a last-unit race.

**Situation:** A Charizard ex SIR at Andrés's shop is down to its last unit, and a WhatsApp group has just shared the link.

---

## Driving Forces (Q4)

**Hope (developer):** See the 1/49 split on every one of 100 repetitions.
**Worry (developer):** One lucky run that hides a read-then-write bug.
**Worry (Camila):** Paying for a card that someone else already took.

---

## Device & Starting Point (Q5 + Q6)

**Device:** The developer on desktop (H, `/dev/inv`); Camila on mobile (R).
**Entry:** 4.3 → "Simulador de carrera"; for Camila, 6.1 → "Confirmar compra".

---

## Best Outcome (Q7)

**User Success:**
- In 4.3: "100 repeticiones · 1 ganadora y 49 rechazadas en cada una · cantidad final 0 · 0 valores negativos".
- In 6.1, Camila sees "Otra persona reservó la última unidad hace un momento. Esta publicación ya no tiene unidades disponibles." with the action "Buscar otra publicación de esta carta". No order is created and nothing is charged.

**Business Success:**
- The `CHECK (quantity >= 0)` constraint is never hit, because the conditional update refuses first.
- The mixed purchase/trade preset never exceeds the starting quantity.

---

## Shortest Path (Q8)

1. **Inventory Console & Race Simulator (4.3)** — choose the preset "50 compras · última unidad", then run 100×.
2. **Purchase & Payment Instructions (6.1)** — the loser's view. ✓

---

## Trigger Map Connections

**Personas:** developer; Camila

**Driving Forces Addressed:**
- ✅ **Want:** A provable no-oversell guarantee.
- ❌ **Fear:** Race conditions; a dishonest failure message.

**Business Goal:** NFR-INV-1, NFR-INV-2.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| INV-S3.1 | [`4.3-inventory-console-race-simulator/`](4.3-inventory-console-race-simulator/4.3-inventory-console-race-simulator.md) | Run the 50-way race ×100 | Inspect one losing call |
| INV-S3.2 | [`../06-ord-order-comprobante/6.1-purchase-payment-instructions/`](../06-ord-order-comprobante/6.1-purchase-payment-instructions/6.1-purchase-payment-instructions.md) | Buyer-facing loss explanation | Scenario success ✓ |

**First step** (INV-S3.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**Edge (mandatory, FR-INV-6):** in 4.3, the preset "Reservar y abortar" forces an `Order` insert failure or a thrown error after the reserve, 100×. The result reads "Cantidad antes = después en 100/100 · 0 escrituras compensatorias · 0 filas de reserva".
