---
design_intent: D
design_status: specified
module: INV
annex_scenario: 1
---

# INV-S1: Andrés Publishes a Card, a Sealed Box and a Bundle

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-INV-1, FR-INV-2 (Annex scenario INV-1, Publish Card, Bundle and Sealed Listings)

---

## Transaction (Q1)

**What this scenario covers:**
One listing form serves three kinds: a single card, a sealed product and a bundle of 2–20 cards. A bundle that includes a sealed product is refused. The refusal names the item, and nothing is created.

---

## Business Goal (Q2)

**Goal:** PRD §1, "semantically coherent". A bundle is made of cards; sealed products stand alone (AD-7).
**Objective:** Explained-decision coverage stays at 100 % (PRD §22). `SealedProductInBundle` names the offending product and leaves no partial rows.

---

## User & Situation (Q3)

**Persona:** Andrés, owner of an approved card shop in Medellín.
**Situation:** A delivery arrived: 5 Elite Trainer Boxes, plus singles he wants to move as a 3-card "starter" bundle. By habit he adds an ETB to the bundle too.

---

## Driving Forces (Q4)

**Hope:** Publish all of it in one sitting, and have the bundle price make sense.

**Worry:** A half-created bundle, or stock numbers that no longer match his shelf.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Desktop at the shop counter (R, wide layout).
**Entry:** Mis publicaciones (4.2) → "Nueva publicación" (4.1).

---

## Best Outcome (Q7)

**User Success:**
- The ETB is published as "Producto sellado · 5 unidades".
- The bundle with the ETB is refused inline: "Elite Trainer Box Surging Sparks es un producto sellado y no puede ir dentro de un lote. Quítalo o publícalo por separado."
- After he removes it, the 3-card bundle publishes, and 4.2 shows it as "Lote de 3 cartas · 1 disponible".

**Business Success:**
- No `Bundle`, `BundleComponent` or `InventoryUnit` rows are written on the refused attempt.
- Each component's catalog entry is unchanged.

---

## Shortest Path (Q8)

1. **Create Listing & Bundle (4.1)** — kind "Producto sellado", publish the ETB.
2. **Create Listing & Bundle (4.1)** — kind "Lote", add 3 cards plus the ETB, submit, get the refusal, remove the ETB, publish.
3. **My Listings (4.2)** — both listings visible with their availability. ✓

---

## Trigger Map Connections

**Persona:** Andrés — a shop owner

**Driving Forces Addressed:**
- ✅ **Want:** Fast, correct multi-kind publishing.
- ❌ **Fear:** Partial writes; stock drift.

**Business Goal:** AD-7; NFR-INV-4 (creation p95 ≤ 800 ms).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| INV-S1.1 | [`4.1-create-listing-bundle/`](4.1-create-listing-bundle/4.1-create-listing-bundle.md) | Publish sealed product; attempt and fix the bundle | Lands in 4.2 |
| INV-S1.2 | [`4.2-my-listings/`](4.2-my-listings/4.2-my-listings.md) | Confirm both listings and availability | Scenario success ✓ |

**First step** (INV-S1.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
