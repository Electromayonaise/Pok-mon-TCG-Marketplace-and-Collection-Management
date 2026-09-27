---
design_intent: D
design_status: specified
module: VAL
annex_scenario: 1
---

# VAL-S1: Valentina Sees What "Kanto 151" Is Worth Today, Card by Card, in Whole Pesos

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-VAL-1, FR-VAL-5 (Annex scenario VAL-1, Current Value); climax of UJ-5

---

## Transaction (Q1)

**What this scenario covers:**
- A collector sees the current value of one collection in COP: a total, a coverage line and a per-card breakdown.
- Every per-card value is `unit price × quantity` in whole pesos, and the per-card values add up to the total exactly.
- Where a card's reference price comes from USD, a separate USD line shows the source figure and the TRM date. It is never added into a peso figure.
- Cards that can't be valued are listed apart with the reason (detailed in VAL-S3).

---

## Business Goal (Q2)

**Goal:** CAP-9 (collection value), under the money rule (CAP-3, NFR-SYS-5).
**Objective:**
- The total equals an independent BigInt recomputation exactly (0 pesos difference).
- 0 floating-point operations on COP (NFR-VAL-3); rounding happens once, at the catalog.
- Current value plus the 30-day trend for 500 entries: p95 ≤ 1.500 ms (NFR-VAL-2).

---

## User & Situation (Q3)

**Persona:** Valentina (27, Bogotá, individual seller).
**Situation:** On 1 oct 2026 (the seed clock), right after sorting her binder (COL-S1), she wants to know what "Kanto 151" is worth. It holds 120 entries: 118 catalog cards and the 2 promos she added by link on 28 sep (COL-S2).

---

## Driving Forces (Q4)

**Hope:** One number she can trust, and a way to see where it comes from.
**Worry:** A total that silently ignores cards, mixes dollars and pesos, or doesn't add up.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Phone (R); the breakdown table is easier on her laptop.
**Entry:** Mi colección → tab "Valor" (10.1), with "Kanto 151" preselected because it was the last collection she opened.

---

## Best Outcome (Q7)

**User Success:**
- **The total.** "Valor al 1 oct 2026" and "$1.310.500", with the 30-day change below it (VAL-S2).
- **Coverage.** "Valoradas 118 de 120 · 1 con precio desactualizado". The 2 promos are under "No valoradas (2)" with "Agregada por enlace: no tiene precio de catálogo." (VAL-S3).
- **The breakdown.** "Ver detalle por carta" opens a table: card · quantity · unit price · value, sorted by value, highest first. Mew ex reads "×2 · $17.250 · $34.500".
- **Where a price comes from.** Zapdos ex reads "$21.800" with "◷ Precio del 29 sep 2026: el feed no se actualiza desde entonces." and, on a separate line, "US$5,45 · TRM al 29 sep 2026". The USD line is information only; the total is in pesos.
- **It adds up.** The table's footer reads "Total: $1.310.500 (118 cartas valoradas)", the same figure as the headline, because every row is already whole pesos.

**Business Success:**
- `totalCop = Σ entryValueCop` by construction (FR-VAL-1).
- No screen, export or API response shows a COP figure computed from a USD figure in the browser.

---

## Shortest Path (Q8)

1. **Collection Value (10.1)** — The total and the coverage line.
2. **Collection Value (10.1)** — "Ver detalle por carta": the rows and the footer total. ✓

---

## Trigger Map Connections

**Persona:** Valentina

**Driving Forces Addressed:**
- ✅ **Want:** A figure she can trust and trace.
- ❌ **Fear:** Mixed currencies or totals that don't add up.

**Business Goal:** FR-VAL-1 exact integer total; FR-VAL-5 money-shape separation.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| VAL-S1.1 | [`10.1-collection-value/`](10.1-collection-value/10.1-collection-value.md) | Read the total and coverage | "Ver detalle por carta" |
| VAL-S1.2 | [`10.1-collection-value/`](10.1-collection-value/10.1-collection-value.md) | Trace a card's value to its reference price | Scenario success ✓ |

**First step** (VAL-S1.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Another collection:** the selector "Colección" switches to any of her collections; the page URL carries the choice (`?coleccion=<id>`), so a shared link reopens the same view for her. Valuation is always per collection.

**Empty collection:** "Favoritas" right after creation (COL-S1) shows "Esta colección está vacía: agrega cartas para ver su valor." and no figures.

**Link to the price source:** a row's card name links to 2.2, where the same reference price and its provenance are shown in full.
