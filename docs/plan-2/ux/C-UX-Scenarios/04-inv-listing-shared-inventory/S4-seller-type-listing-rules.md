---
design_intent: D
design_status: specified
module: INV
annex_scenario: 4
---

# INV-S4: What Each Kind of Seller May List, and When

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-INV-1, FR-INV-7, FR-INV-8, FR-IDN-3 (Annex scenario INV-4, Seller-Type Listing Rules)

---

## Transaction (Q1)

**What this scenario covers:**
Listing rules by seller kind and state:
- A `Pending` business may list, but its listings are unbadged and not purchasable.
- Only a `Rejected` business is refused (`SellerNotVerified`), and its existing listings are withdrawn, not deleted.
- A business listing can never be opened to trades.
- An approved business's listings pause only when its commission balance is exhausted.
- Individual listings are never purchasable and never pause.

---

## Business Goal (Q2)

**Goal:** PRD §1, "semantically coherent" and "defensively specified" (AD-3, AD-4).
**Objective:** Explained-decision coverage stays at 100 %. Every non-purchasable business listing states why.

---

## User & Situation (Q3)

**Persona:** Andrés, during UJ-3.
**Situation:** He applied yesterday and his application is `Pending`. He wants to start listing now, and he also tries to mark a listing "abierta a intercambios" as he used to on Instagram.

---

## Driving Forces (Q4)

**Hope:** Get his stock in front of buyers while verification runs.

**Worry:** Listings that silently don't work, or that vanish without warning.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Desktop (R, wide).
**Entry:** 5.2 (application status) → "Publicar mientras tanto" → 4.1.

---

## Best Outcome (Q7)

**User Success:**
- 4.1 shows no "Abierta a intercambios" toggle for a business. Instead there is a note: "Las tiendas venden dentro de TEZG, así que sus publicaciones no se pueden abrir a intercambios." (A crafted API call gets `OpenToTradeNotAllowed` with the same text.)
- 4.2 marks each listing "Sin insignia de verificación · aún no se puede comprar. Se activarán cuando aprobemos tu tienda."
- After rejection, the listings read "Retirada porque tu solicitud de tienda fue rechazada. No se borró: volverá con sus mismos datos si tu tienda es aprobada."
- After approval, the listings are restored with the badge, then shown as "Pausada" until his first top-up is confirmed (fail-closed commission state).

**Business Success:**
- The DecisionCodes `ListingUnverified`, `ListingPausedBalanceExhausted` and `SellerNotVerified` are each rendered from the Decision's citations.
- Withdraw and restore keep ids and quantities (FR-INV-8).

---

## Shortest Path (Q8)

1. **Create Listing & Bundle (4.1)** — the business form without the trade toggle; publish while `Pending`.
2. **My Listings (4.2)** — the Unverified label; then Withdrawn after rejection; then restored and Paused after approval. ✓

---

## Trigger Map Connections

**Persona:** Andrés — a shop in verification

**Driving Forces Addressed:**
- ✅ **Want:** List during verification.
- ❌ **Fear:** Silent non-purchasability; lost listings.

**Business Goal:** AD-3, AD-4, FR-INV-8.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| INV-S4.1 | [`4.1-create-listing-bundle/`](4.1-create-listing-bundle/4.1-create-listing-bundle.md) | Business form rules; publish while Pending | Lands in 4.2 |
| INV-S4.2 | [`4.2-my-listings/`](4.2-my-listings/4.2-my-listings.md) | State labels across Pending → Rejected → Approved → Paused | Scenario success ✓ |

**First step** (INV-S4.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**Refusal variant:** after a `Rejected` decision, "Nueva publicación" in 4.2 opens a blocking notice instead of the form. The notice reads from `SellerNotVerified` (microcopy §1) and links to 5.2 for the reapply date.
