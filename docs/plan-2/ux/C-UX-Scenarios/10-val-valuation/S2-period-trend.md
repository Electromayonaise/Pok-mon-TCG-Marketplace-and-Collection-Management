---
design_intent: D
design_status: specified
module: VAL
annex_scenario: 2
---

# VAL-S2: Valentina Sees How Much Her Cards Moved in 30 Days, and Camila Sees "New" Instead of a Broken Percentage

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-VAL-2 (Annex scenario VAL-2, Period Trend); NFR-VAL-1 (zero baseline)

---

## Transaction (Q1)

**What this scenario covers:**
- A collector picks a period (7, 30, 90 or 365 days) and sees the change in value over it, in pesos and as a percentage.
- A second line shows the market-only change: the cards she held for the whole period, so new purchases don't look like price gains.
- When nothing was valued at the start of the period, there is no percentage: the page shows the change in pesos and says the value is new in this period.

---

## Business Goal (Q2)

**Goal:** CAP-9 (trend), under the money rule (CAP-3).
**Objective:**
- The percentage is exact to 2 decimals (`round_half_up`), computed in integer arithmetic on the server.
- A zero baseline never produces `NaN`, `Infinity` or a division by zero.

---

## User & Situation (Q3)

**Persona:** Valentina (main); Camila (variant).
**Situation:** On 1 oct 2026, looking at "Kanto 151" on 10.1 (VAL-S1), Valentina wants to know whether the collection went up this month. In the last 30 days she added Mew ex ×2 on 19 sep and the 2 link-added promos on 28 sep (COL-S2). The promos have no reference price, so they are unpriced and add nothing to either value (VAL-S1); the Mew ex is the only priced addition.

---

## Driving Forces (Q4)

**Hope:** Know whether prices went up, not just whether she bought more.
**Worry:** A percentage that counts her own purchases as "gains".

---

## Device & Starting Point (Q5 + Q6)

**Device:** Phone (R).
**Entry:** 10.1, "Kanto 151", period "30 días" (the default).

---

## Best Outcome (Q7)

**User Success:**
- **The change.** Under the total: "▲ +5,69 % en 30 días (desde $1.240.000)". The glyph and the sign carry the direction, not colour alone.
- **Market only.** The next line: "Solo precios, sin las cartas nuevas: ▲ +2,90 % ($1.240.000 → $1.276.000)". The difference is the Mew ex ×2 she added on 19 sep: 2 × $17.250 = $34.500.
- **What the trend means.** A note under both lines: "Lo que valían tus cartas actuales: si quitas una carta, también sale del cálculo de fechas anteriores."
- **Another period.** She taps "7 días": the page updates in place, and the URL keeps `?periodo=7`.

**Business Success:**
- `changePercent = round_half_up(70.500 × 10.000 / 1.240.000) / 100 = 5,69`; the market line uses only the entries held for the whole period: `round_half_up(36.000 × 10.000 / 1.240.000) / 100 = 2,90`.
- The percentage is formatted in the browser from the server's value; the browser never divides.

---

## Shortest Path (Q8)

1. **Collection Value (10.1)** — Period "30 días": the change and the market-only line. ✓

---

## Trigger Map Connections

**Persona:** Valentina, Camila

**Driving Forces Addressed:**
- ✅ **Want:** Price change separated from new cards.
- ❌ **Fear:** A misleading or broken percentage.

**Business Goal:** FR-VAL-2 defined zero baseline; NFR-VAL-1.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| VAL-S2.1 | [`10.1-collection-value/`](10.1-collection-value/10.1-collection-value.md) | Read the 30-day change and the market-only line | Pick another period, or "Ver historial" |

**First step** (VAL-S2.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Zero baseline (Camila):** on 1 oct 2026 Camila opens "Mi primera colección": 6 cards, all acquired on 21 sep, worth $96.000.
- With "30 días", the collection held nothing on 1 sep, so there is no percentage: the change line reads "+$96.000 · Nuevo en este período", followed by "Nuevo en este período: no había cartas valoradas al inicio, así que mostramos el cambio en pesos." The market-only line reads "Ninguna carta estuvo en tu colección durante todo el período."
- With "7 días" (start 24 sep, after her cards arrived), the change is a normal percentage: from $92.000 to $96.000, "▲ +4,35 % en 7 días (desde $92.000)".

**Invalid period:** a hand-edited URL with `?periodo=14` shows the default 30-day view with the notice "Elige un período de 7, 30, 90 o 365 días." (`InvalidValuationPeriod`) above the period chips.

**No change:** when the value is the same at both ends, the line reads "Sin cambio en {n} días (desde {valor})" with no arrow.
