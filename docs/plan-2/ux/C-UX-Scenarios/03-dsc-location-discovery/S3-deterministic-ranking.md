---
design_intent: D
design_status: specified
module: DSC
annex_scenario: 3
---

# DSC-S3: The Same Search, the Same Order, With Reasons

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-DSC-5 (Annex scenario DSC-3, Deterministic Ranking)

---

## Transaction (Q1)

**What this scenario covers:**
Results are ordered by distance, then price, then `listingId`: a total order. Every row explains itself in typed parts. Repeating the query gives byte-identical ordering, and ties are broken visibly.

---

## Business Goal (Q2)

**Goal:** PRD §1, "mathematically sound" and "independently testable".
**Objective:** NFR-DSC-3: 10 identical runs, 0 differences in ordering.

---

## User & Situation (Q3)

**Personas:**
- Camila, who asks "why is this one first?";
- a developer, who runs the determinism check.

**Situation:** Two shops sit in the same mall, 3,1 km away, and both list the card at $95.000.

---

## Driving Forces (Q4)

**Hope (Camila):** The order makes sense, and it doesn't reshuffle when she reloads.
**Worry (Camila):** A hidden "sponsored" order she can't read.
**Worry (developer):** Flaky ordering that breaks snapshot tests.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Camila on mobile (R); the developer on desktop (H).
**Entry:** 3.1 → the "Cómo ordenamos" disclosure; 3.2 → "Ejecutar 10 veces".

---

## Best Outcome (Q7)

**User Success:**
- "Cómo ordenamos: primero la más cercana; si están a la misma distancia, la más barata; si también cuestan lo mismo, siempre en el mismo orden fijo."
- The two tied rows keep the same order on every reload.

**Business Success:**
- 3.2 reports "10 ejecuciones · 0 diferencias en el orden".
- The tie is shown broken by `listingId` in the explanation table.

---

## Shortest Path (Q8)

1. **Nearby Listings (3.1)** — read the explanation parts and the "Cómo ordenamos" disclosure.
2. **Discovery Explanation Inspector (3.2)** — run the query 10× and inspect the sort keys for each row. ✓

---

## Trigger Map Connections

**Personas:** Camila; developer

**Driving Forces Addressed:**
- ✅ **Want:** A legible, stable order.
- ❌ **Fear:** Opaque or flaky ranking.

**Business Goal:** NFR-DSC-3; no personalised ranking at launch (PRD §13 out of scope).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| DSC-S3.1 | [`3.1-nearby-listings/`](3.1-nearby-listings/3.1-nearby-listings.md) | Read row explanations and ordering rule | Developer opens 3.2 |
| DSC-S3.2 | [`3.2-discovery-explanation-inspector/`](3.2-discovery-explanation-inspector/3.2-discovery-explanation-inspector.md) | 10× determinism run; sort-key table | Scenario success ✓ |

**First step** (DSC-S3.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**Note:** `listingId` is a `cuid2` (PRD §5), which is not time-ordered, so the user-facing tie-break copy says "siempre en el mismo orden fijo" rather than implying recency.
