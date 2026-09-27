---
design_intent: D
design_status: specified
module: COL
annex_scenario: 3
---

# COL-S3: Camila Keeps a Wishlist That Never Pretends to Be Her Collection

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-COL-6 (Annex scenario COL-3, Wishlist vs Collection)

---

## Transaction (Q1)

**What this scenario covers:**
- A wishlist of catalog cards, each with an optional maximum price and note, kept apart from every collection.
- Sorted by lowest available price, by availability or by date added, with unavailable cards always last.
- An optional area limits availability to nearby listings, and a marker shows when the lowest price is within the collector's maximum.

---

## Business Goal (Q2)

**Goal:** CAP-13 and CAP-14: a wishlist that leads to purchases.
**Objective:**
- Adding to the wishlist never creates a collection entry.
- Deterministic order: unavailable items last, then by entry id.

---

## User & Situation (Q3)

**Persona:** Camila (31, Medellín).
**Situation:** On 11 oct 2026, the evening before she buys the Charizard ex (ORD-S1), she reviews her 15-card wishlist to decide what to buy first. Her "Mi primera colección" holds 6 cards.

---

## Driving Forces (Q4)

**Hope:** See at a glance which wanted cards are for sale near her and within what she is willing to pay.
**Worry:** Wanted cards being counted as owned, or a list that hides cards nobody sells.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Phone (R).
**Entry:** Mi colección → Lista de deseos (9.3). Cards are added from 2.2 with "Agregar a lista de deseos".

---

## Best Outcome (Q7)

**User Success:**
- **Sorted by price.** She picks "Precio más bajo". 11 cards show "Desde {precio} · {n} disponibles"; the 4 with no listings come last with "Sin publicaciones disponibles".
- **Within budget.** Charizard ex has her maximum $200.000 and a lowest price of $180.000, so its row shows "Dentro de tu precio máximo".
- **Nearby only.** She turns on "Solo cerca de Medellín (15 km)". Counts and lowest prices now use only listings in that area; cards with nothing nearby move to the end.
- **Kept apart.** The page says "Tu lista de deseos no cuenta como parte de tu colección." Her collection still shows 6 cards.
- **To buy.** Tapping Charizard ex opens 2.2, where the listings block leads to 6.1.

**Business Success:**
- One wishlist entry per catalog card per person; adding one twice leaves a single entry.
- The wishlist reads availability through `listings.getAvailabilitySummary` and never through the listings tables.

---

## Shortest Path (Q8)

1. **Wishlist (9.3)** — Sort "Precio más bajo".
2. **Wishlist (9.3)** — Area on; read the marker.
3. **Card Detail (2.2)** — Open the chosen card. ✓

---

## Trigger Map Connections

**Persona:** Camila

**Driving Forces Addressed:**
- ✅ **Want:** Know which wanted cards she can buy now, near her, within budget.
- ❌ **Fear:** Wanted cards muddled with owned ones.

**Business Goal:** FR-COL-6; path from wishlist to ORD.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| COL-S3.1 | [`9.3-wishlist/`](9.3-wishlist/9.3-wishlist.md) | Review and sort the wishlist | Area filter |
| COL-S3.2 | [`9.3-wishlist/`](9.3-wishlist/9.3-wishlist.md) | Spot the card within budget | Open the card |
| COL-S3.3 | [`../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/`](../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/2.2-card-detail-price-provenance.md) | Listings block | Scenario success ✓ |

**First step** (COL-S3.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Adding from 2.2:** "Agregar a lista de deseos" opens an inline form with "Precio máximo (opcional)" and "Nota (opcional)". After saving, the button reads "En tu lista de deseos ✓" and links to 9.3.

**Editing:** each row has "Editar" (maximum price and note) and "Quitar". Removing a wishlist card never touches a collection.
