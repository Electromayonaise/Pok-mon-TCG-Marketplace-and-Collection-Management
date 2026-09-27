---
design_intent: D
design_status: specified
module: CAT
annex_scenario: 2
---

# CAT-S2: Three Prices, Never One Merged Number

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-CAT-6, FR-CAT-5, FR-CAT-8, FR-DSC-7 (Annex scenario CAT-2, Three Distinct Prices)

---

## Transaction (Q1)

**What this scenario covers:**
Before buying, Valentina sanity-checks a price. The card detail shows three separately labelled values, each with its source and date:
- the lowest listing price;
- the last-transaction reference in USD/COP;
- the trend.

---

## Business Goal (Q2)

**Goal:** PRD §1, "mathematically sound" and "defensively specified". Prices are never fabricated or merged.
**Objective:** PRD §22 counter-metric: zero fabricated or merged price values (NFR-CAT-3).

---

## User & Situation (Q3)

**Persona:** Valentina, 27, Bogotá.
**Situation:** A seller in Chapinero lists a Pikachu ex SIR at $180.000. She wants to know whether that's fair before writing to him.

---

## Driving Forces (Q4)

**Hope:** One look tells her whether the price is reasonable.

**Worry:** A "market price" that is really just the platform's own listings echoing each other, or a USD price she has to convert in her head.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (R).
**Entry:** A deep link `/c/<catalogEntryId>` shared in a WhatsApp group, or a card tapped in 2.1.

---

## Best Outcome (Q7)

**User Success:**
Three blocks she can tell apart at a glance:
- "Precio más bajo publicado · $180.000 · 3 publicaciones";
- "Última venta de referencia · US$41,20 · $169.886 COP · TRM al 30 sep 2026 · fuente: {nombre del feed} · 30 sep";
- "Tendencia 30 días · +8,41 % · desde $156.700".

**Business Success:**
The blocks are never summed or averaged. The COP derivation carries its TRM date (FR-CAT-8). The trend comes from the catalog feed, not from platform sales (CAP-3).

---

## Shortest Path (Q8)

1. **Card Detail & Price Provenance (2.2)** — the three price blocks sit above the nearby-listings block; "¿De dónde sale este precio?" expands the provenance. ✓

---

## Trigger Map Connections

**Persona:** Valentina — collector sanity-checking prices

**Driving Forces Addressed:**
- ✅ **Want:** Trustworthy, sourced reference prices.
- ❌ **Fear:** Platform-circular or merged numbers.

**Business Goal:** NFR-CAT-3; NFR-SYS-5 money-shape safety.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| CAT-S2.1 | [`2.2-card-detail-price-provenance/`](2.2-card-detail-price-provenance/2.2-card-detail-price-provenance.md) | Read three distinct prices with provenance | Scenario success ✓; she continues to 12.1 or 6.1 |

**First step** (CAT-S2.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**Unpriced variant:** for one of the 300 unpriced seed entries, the reference and trend blocks read "Aún no hay precio de referencia." and show no number.
