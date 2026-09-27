---
design_intent: D
design_status: specified
module: VAL
annex_scenario: 4
---

# VAL-S4: Valentina Reads Her Collection's History, Including the Day She Bought Two Mew ex

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-VAL-4 (Annex scenario VAL-4, Value History Series); FR-VAL-2 (the "current cards" definition); UJ-5 step 3

---

## Transaction (Q1)

**What this scenario covers:**
- A collector sees a daily value series for one collection, up to 365 days back, as a line chart and as a table with the same data.
- A card acquired mid-period appears as a step on its acquisition date.
- Days priced with a carried-forward price are marked stale: dashed on the chart, labelled in the table.
- The chart is labelled as what her *current* cards were worth, and it is recomputed from her current entries every time.

---

## Business Goal (Q2)

**Goal:** CAP-9 (history), with an honest definition of what the line means (ADD-§1).
**Objective:**
- One point per `America/Bogota` calendar day, every value in whole pesos.
- The 365-day history for 500 entries: p95 ≤ 2.500 ms (NFR-VAL-2).

---

## User & Situation (Q3)

**Persona:** Valentina.
**Situation:** On 1 oct 2026, after seeing "▲ +5,69 % en 30 días" on 10.1 (VAL-S2), she wants to see when the value moved.

---

## Driving Forces (Q4)

**Hope:** See the shape of the month: steady prices, or one jump?
**Worry:** A chart that can't be read without sight, or that shows invented history for cards she has since sold.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Laptop (R); on the phone the chart is full-width and "Ver como tabla" works the same way.
**Entry:** 10.1 → "Ver historial" → 10.2, with the same collection and period (`?coleccion=<id>&periodo=30`).

---

## Best Outcome (Q7)

**User Success:**
- **The heading.** "Lo que valían tus cartas actuales", with the explanation under it: "Si quitas una carta, también sale del cálculo de fechas anteriores."
- **The line.** 31 daily points from 1 sep to 1 oct 2026. The chart's summary, read by screen readers and shown under it: "Valor entre el 1 sep y el 1 oct 2026: de $1.240.000 a $1.310.500, +5,69 %".
- **The step.** On 19 sep the line rises by $34.500: the Mew ex ×2, at $17.250 each that day. Hovering or focusing the point shows the date, that day's value and "+$34.500 por cartas nuevas ese día".
- **Stale stretch.** From 29 sep to 1 oct the line is dashed. Focusing a dashed point shows "◷ Incluye 1 precio sin actualizar desde el 29 sep 2026".
- **As a table.** "Ver como tabla" swaps the chart for a table with one row per day: date · value · change from the previous day · note ("Cartas nuevas: Mew ex ×2", "Precio sin actualizar: Zapdos ex"). The same data, nothing more or less.

**Business Success:**
- The percentage in the summary is the FR-VAL-2 value for the same period, computed on the server; the browser formats it and never recomputes it.
- The series is never empty when at least one priced entry exists.

---

## Shortest Path (Q8)

1. **Collection Value (10.1)** — "Ver historial".
2. **Value History (10.2)** — Read the line and the step; "Ver como tabla". ✓

---

## Trigger Map Connections

**Persona:** Valentina

**Driving Forces Addressed:**
- ✅ **Want:** The shape of the change, and when it happened.
- ❌ **Fear:** Invented history, or a chart only sighted users can read.

**Business Goal:** FR-VAL-4 step at the acquisition date; non-empty COP series.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| VAL-S4.1 | [`10.1-collection-value/`](10.1-collection-value/10.1-collection-value.md) | Start from the current value | "Ver historial" |
| VAL-S4.2 | [`10.2-value-history/`](10.2-value-history/10.2-value-history.md) | Read the series, the step and the stale stretch | "Ver como tabla" |
| VAL-S4.3 | [`10.2-value-history/`](10.2-value-history/10.2-value-history.md) | Read the same series as a table | Scenario success ✓ |

**First step** (VAL-S4.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Removing a card rewrites the past, as labelled:** if she removes the Mew ex entry in 9.1, the next load of 10.2 has no step on 19 sep: every point from 19 sep on drops by the two cards' value that day ($34.500 while the price stays at $17.250), and the points before 19 sep are unchanged. The heading already says so; the page adds nothing else.

**Longer periods:** "365 días" shows the whole series from the earliest acquisition date in the collection (or 365 days back, whichever is later). The chart thins its axis labels, never its points; the table pages 31 rows at a time.

**No priced cards:** a collection with no priced entries shows "Aún no hay historial: ninguna carta de esta colección tiene precio." and no chart.
