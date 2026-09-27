---
design_intent: D
design_status: specified
module: DSC
annex_scenario: 1
---

# DSC-S1: Who Sells It Within 15 km?

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-DSC-1, FR-DSC-2, FR-DSC-3 (Annex scenario DSC-1, Radius Filter Across Seller Types)

---

## Transaction (Q1)

**What this scenario covers:**
Camila searches around her point in Medellín with a 15 km radius. One result list contains both individual sellers (pickup) and verified shops (purchasable). Each row shows its distance to 0.1 km.

---

## Business Goal (Q2)

**Goal:** PRD §1, "semantically coherent". One query path serves both seller kinds (AD-5).
**Objective:** Explained-decision coverage stays at 100 % (PRD §22). Every row carries its explanation, and every exclusion is counted.

---

## User & Situation (Q3)

**Persona:** Camila, 31, Medellín (Laureles). She collects Surging Sparks.
**Situation:** On her lunch break she wants a Pikachu ex she can pick up this week or buy from a shop.

---

## Driving Forces (Q4)

**Hope:** One list with real distances, whoever the seller is.

**Worry:** Results in Bogotá shown as "near", or shops and individuals split across two screens that disagree with each other.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (R).
**Entry:** Bottom bar → Cerca de ti (3.1). The first visit asks for location: browser geolocation, or a city pick with a draggable point.

---

## Best Outcome (Q7)

**User Success:**
- "Cerca de: Laureles, 15 km" with rows such as "a 4,2 km · tienda verificada · se puede comprar" and "a 12,4 km · recogida en persona".
- A footer: "3 publicaciones no aparecen porque no tienen una ubicación válida."

**Business Success:**
- One `browse` call (`view=listings`) returns both kinds.
- The 15.000 km and 14.999 km fixtures are included; the 15.001 km fixture is excluded.

---

## Shortest Path (Q8)

1. **Nearby Listings (3.1)** — set the point and 15 km, switch to "Publicaciones", read the mixed list. ✓

---

## Trigger Map Connections

**Persona:** Camila — a local collector

**Driving Forces Addressed:**
- ✅ **Want:** Honest nearby results across seller kinds.
- ❌ **Fear:** Wrong distances, or split, inconsistent lists.

**Business Goal:** NFR-DSC-1 (p95 ≤ 1,000 ms), NFR-DSC-2.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| DSC-S1.1 | [`3.1-nearby-listings/`](3.1-nearby-listings/3.1-nearby-listings.md) | Search by point and radius; one mixed list | Scenario success ✓; she opens 2.2 |

**First step** (DSC-S1.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**Edge (boundary):** the geometry fixtures are verified in [3.2](3.2-discovery-explanation-inspector/3.2-discovery-explanation-inspector.md). The row list there shows 15.000 → "a 15,0 km · incluida (límite inclusivo)" and 15.001 → "excluida: a 15,001 km".
