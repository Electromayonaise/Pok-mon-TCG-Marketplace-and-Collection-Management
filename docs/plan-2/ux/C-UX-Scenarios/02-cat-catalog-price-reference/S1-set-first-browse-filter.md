---
design_intent: D
design_status: specified
module: CAT
annex_scenario: 1
---

# CAT-S1: Valentina Browses a Set by Artist and Colour

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-CAT-1, FR-CAT-2, FR-DSC-1 (Annex scenario CAT-1, Set-First Browse & Filter)

---

## Transaction (Q1)

**What this scenario covers:**
Valentina narrows the catalog the way collectors think: set first, then artist and colour. She sees every matching card, including the ones nobody is selling.

---

## Business Goal (Q2)

**Goal:** PRD §1 vision: "a collection tracker with a local marketplace attached". The catalog exists independently of listings (CAP-2).
**Objective:** Every filter combination returns exactly the matching entries, and entries with zero listings stay visible and say so plainly (`hasActiveListings=false`).

---

## User & Situation (Q3)

**Persona:** Valentina, 27, Bogotá. Release-driven collector.
**Situation:** The night "Surging Sparks" drops, she wants every Mitsuhiro Arita Fire-type card in the set, to see which ones she's missing and whether anyone sells them.

---

## Driving Forces (Q4)

**Hope:** A catalog that behaves like her binder checklist, not like a store shelf that hides what isn't in stock.

**Worry:** Filters that silently drop cards, or a result count that doesn't match what she sees.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (R).
**Entry:** Bottom bar → Catálogo.

---

## Best Outcome (Q7)

**User Success:**
Three filter chips (set, artist, colour) and an exact count: "12 cartas". Cards without sellers are marked "Nadie la está vendiendo" instead of being removed. The facet counts tell her how many results each extra value would add.

**Business Success:**
FR-CAT-1 semantics hold: OR within a dimension, AND across dimensions, a stable sort and facet counts. An unknown value in a shared URL yields "0 cartas", not an error.

---

## Shortest Path (Q8)

1. **Catalog Browse & Filter (2.1)** — she opens "Filtros" and picks set Surging Sparks, artist Mitsuhiro Arita and colour Fuego; the result shows "12 cartas" with availability per card.
2. **Card Detail (2.2)** — she opens one card without sellers and adds it to her wishlist. ✓

---

## Trigger Map Connections

**Persona:** Valentina — collector

**Driving Forces Addressed:**
- ✅ **Want:** Set-completion browsing.
- ❌ **Fear:** Hidden, out-of-stock cards.

**Business Goal:** CAP-1/CAP-2, one catalog identity; NFR-CAT-1 ≤ 1 s p95.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| CAT-S1.1 | [`2.1-catalog-browse-filter/`](2.1-catalog-browse-filter/2.1-catalog-browse-filter.md) | Filter by set, artist and colour | Taps a card |
| CAT-S1.2 | [`2.2-card-detail-price-provenance/`](2.2-card-detail-price-provenance/2.2-card-detail-price-provenance.md) | See the entry with no active listings | "Agregar a lista de deseos" ✓ |

**First step** (CAT-S1.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
