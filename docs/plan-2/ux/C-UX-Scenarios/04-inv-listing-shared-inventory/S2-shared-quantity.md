---
design_intent: D
design_status: specified
module: INV
annex_scenario: 2
---

# INV-S2: One Copy, Two Listings, Never Sold Twice

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-INV-4, FR-INV-3, FR-INV-1 (Annex scenario INV-2, Shared-Quantity Reconciliation)

---

## Transaction (Q1)

**What this scenario covers:**
Valentina lists her single copy of card X individually and also inside a 3-card bundle. Both listings read availability from one inventory unit. When the bundle is reserved, the unit drops once, from 1 to 0, and the individual listing shows "Agotada".

---

## Business Goal (Q2)

**Goal:** PRD §1, "mathematically sound".
**Objective:** Oversell incidents stay at 0 (PRD §22).

---

## User & Situation (Q3)

**Persona:** Valentina, 27, Bogotá, an individual seller with the profile complete.
**Situation:** She has one Gardevoir ex (NM). She lists it alone at $60.000 and inside a "starter Psíquico" bundle, hoping one of them moves.

---

## Driving Forces (Q4)

**Hope:** List the same card two ways without having to watch both.

**Worry:** Two people agreeing to the same physical card, and her having to back out of one.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (R). A developer verifies on the H console.
**Entry:** 4.1 → publish the card alone; 4.1 → publish the bundle that contains it. Later, 4.2.

---

## Best Outcome (Q7)

**User Success:**
- On 4.1, adding the second listing for the same card and condition shows "Ya tienes 1 unidad de Gardevoir ex (NM). Esta publicación comparte ese inventario." There is no quantity field.
- 4.2 marks both listings with "Comparte inventario con 1 publicación más".
- After a trade on the bundle is accepted, the individual listing reads "Agotada".

**Business Success:**
- In 4.3 the unit trace shows exactly 1 row changed, 1 → 0.
- Listing the card a second time added no stock.

---

## Shortest Path (Q8)

1. **Create Listing & Bundle (4.1)** — the second listing links to the existing unit.
2. **My Listings (4.2)** — the shared-inventory indicator, then "Agotada" after the reservation.
3. **Inventory Console & Race Simulator (4.3)** — the unit trace proves a single decrement. ✓

---

## Trigger Map Connections

**Persona:** Valentina — an individual seller

**Driving Forces Addressed:**
- ✅ **Want:** One stock, many listings.
- ❌ **Fear:** Double-committing one physical card.

**Business Goal:** FR-INV-4; OQ-10 (unit keyed by seller, item and condition).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| INV-S2.1 | [`4.1-create-listing-bundle/`](4.1-create-listing-bundle/4.1-create-listing-bundle.md) | Second listing links to the existing unit | Lands in 4.2 |
| INV-S2.2 | [`4.2-my-listings/`](4.2-my-listings/4.2-my-listings.md) | Shared indicator; "Agotada" after reservation | Developer opens 4.3 |
| INV-S2.3 | [`4.3-inventory-console-race-simulator/`](4.3-inventory-console-race-simulator/4.3-inventory-console-race-simulator.md) | Unit trace: one decrement | Scenario success ✓ |

**First step** (INV-S2.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**Note:** the reservation that sells the unit comes from TRD (8.2 accept) for an individual seller. The same path through a purchase applies only to business listings.
