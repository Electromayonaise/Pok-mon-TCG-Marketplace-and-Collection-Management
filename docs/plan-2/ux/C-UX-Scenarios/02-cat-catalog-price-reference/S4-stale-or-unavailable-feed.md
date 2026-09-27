---
design_intent: D
design_status: specified
module: CAT
annex_scenario: 4
---

# CAT-S4: The Feed Goes Quiet, and the Price Says So

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-CAT-7, FR-CAT-8 (Annex scenario CAT-4, Stale or Unavailable Feed)

---

## Transaction (Q1)

**What this scenario covers:**
The feed is down, or older than the 36 h threshold. The card detail keeps showing the last known reference with an explicit staleness label, never a blank, an invented number or a value from another source. When the TRM is missing for a date, the last rate is carried forward and the page says which date it is from.

---

## Business Goal (Q2)

**Goal:** PRD §1, "defensively specified".
**Objective:** PRD §22: stale reference prices stay at ≤ 5 % of card-detail views, with zero fabricated values (NFR-CAT-3).

---

## User & Situation (Q3)

**Personas:**
- Sebastián, who injects the fault on fixtures;
- Valentina, who reads the card detail.

**Situation:** The feed provider missed a night. On `2026-10-01T15:00Z` the last observation for Valentina's card is from 29 Sep, 40 h ago.

---

## Driving Forces (Q4)

**Hope (Valentina):** Know whether the number is today's.
**Worry (Valentina):** Deciding on a price that quietly stopped updating.
**Worry (Sebastián):** An outage turning into a wall of blank prices.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Valentina uses mobile (R); Sebastián uses desktop (D, with the fixture fault switch).
**Entry:** Sebastián: 2.3 → "Simulador de fallas" (fixtures only) → `down`. Valentina: 2.2.

---

## Best Outcome (Q7)

**User Success:**
The reference block reads "◷ Precio del 29 sep: el feed no se actualiza desde entonces." with the old value still visible. A USD conversion shows "TRM al 30 sep 2026 (no hay una TRM publicada para la fecha)".

**Business Success:**
Every displayed reference equals a stored observation byte for byte (NFR-CAT-3). `ReferencePriceStale` and `FxRateCarriedForward` are rendered from the Decision's citations.

---

## Shortest Path (Q8)

1. **Feed Ingestion Console (2.3)** — the fault switch is set to `down` on fixtures, and the virtual clock is advanced to +40 h.
2. **Card Detail & Price Provenance (2.2)** — the stale label and old value show; the trend block reads "Sin tendencia…" only if no baseline exists. ✓

---

## Trigger Map Connections

**Personas:** Valentina (reader), Sebastián (operator)

**Driving Forces Addressed:**
- ✅ **Want:** Honest freshness.
- ❌ **Fear:** Silent stale or fabricated prices.

**Business Goal:** NFR-CAT-3, NFR-CAT-4.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| CAT-S4.1 | [`2.3-feed-ingestion-console/`](2.3-feed-ingestion-console/2.3-feed-ingestion-console.md) | Inject the outage (fixtures) | Opens the affected card |
| CAT-S4.2 | [`2.2-card-detail-price-provenance/`](2.2-card-detail-price-provenance/2.2-card-detail-price-provenance.md) | See the last known value, labelled stale | Scenario success ✓ |

**First step** (CAT-S4.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**Production note:** in production there is no fault switch. Staleness appears on its own, and 2.3 shows the last successful run and its age.
