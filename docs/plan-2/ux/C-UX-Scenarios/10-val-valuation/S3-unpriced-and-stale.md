---
design_intent: D
design_status: specified
module: VAL
annex_scenario: 3
---

# VAL-S3: Valentina's 500-Card Archive Explains Every Card It Couldn't Value

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-VAL-3 (Annex scenario VAL-3, Unpriced or Stale Items); FR-CAT-7 (stale threshold)

---

## Transaction (Q1)

**What this scenario covers:**
- Cards that can't be valued are left out of the total, and each one is listed with its reason: added by link, or no reference price yet.
- Cards whose price is stale are still counted, and each is labelled with the date of its last price.
- The coverage line states both counts in one sentence.

---

## Business Goal (Q2)

**Goal:** CAP-9 and CAP-12 (honest prices): nothing is silently dropped or silently guessed.
**Objective:**
- For the 500-entry seed: `valuedCount = 450`, 50 `notValued` (20 link-added, 30 unpriced), each with a reason, and `staleCount = 25`.
- A stale price is never shown without its date.

---

## User & Situation (Q3)

**Persona:** Valentina.
**Situation:** On 1 oct 2026 she switches the 10.1 selector to «Archivo», the 500-entry collection where she files everything she has ever pulled (the PRD seed). She knows many of those cards are obscure, and she wants to know which ones the total leaves out.

---

## Driving Forces (Q4)

**Hope:** Know exactly what the total covers and what it doesn't.
**Worry:** A total that looks precise but quietly skips cards, or old prices passed off as current.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Laptop (R, ≥1024 px).
**Entry:** 10.1, selector "Colección" → «Archivo».

---

## Best Outcome (Q7)

**User Success:**
- **Coverage.** "Valoradas 450 de 500 · 25 con precio desactualizado", directly under the total.
- **Not valued, grouped.** "No valoradas (50)" expands into two groups, each with its reason once at the top:
  - "Agregadas por enlace (20)": "Agregada por enlace: no tiene precio de catálogo." Each row shows the title and the link's domain.
  - "Sin precio de referencia (30)": "Aún no hay precio de referencia para esta carta." Each row links to the card's page (2.2).
- **Stale, but counted.** In "Ver detalle por carta" she filters "Con precio desactualizado (25)". Each row keeps its value in the total and carries "◷ Precio del {dia}: el feed no se actualiza desde entonces."
- **Nothing hidden.** The coverage line (450 of 500) and the "No valoradas (50)" count add up to the 500 cards; the 25 stale cards are inside the 450, not in addition to them.

**Business Success:**
- The reasons come from the server (`ExternalEntryNotInCatalog`, `NoReferencePrice`) and map one-to-one to the registry strings.
- The stale flag comes from the catalog's threshold (FR-CAT-7); VAL never decides staleness on its own.

---

## Shortest Path (Q8)

1. **Collection Value (10.1)** — Select «Archivo»; read the coverage line.
2. **Collection Value (10.1)** — Open "No valoradas (50)"; filter the table to stale prices. ✓

---

## Trigger Map Connections

**Persona:** Valentina

**Driving Forces Addressed:**
- ✅ **Want:** Know what the total covers.
- ❌ **Fear:** Silent gaps and old prices shown as current.

**Business Goal:** FR-VAL-3 excluded with reasons, stale labelled.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| VAL-S3.1 | [`10.1-collection-value/`](10.1-collection-value/10.1-collection-value.md) | Switch to «Archivo»; read coverage | Open "No valoradas (50)" |
| VAL-S3.2 | [`10.1-collection-value/`](10.1-collection-value/10.1-collection-value.md) | Read reasons; filter stale rows | Scenario success ✓ |

**First step** (VAL-S3.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**All unpriced:** a collection whose cards all lack a reference price shows "$0" with "Valoradas 0 de {n}", the "No valoradas" list open by default, and the line "Ninguna carta de esta colección tiene precio de catálogo todavía." The trend follows VAL-S2's zero-baseline rule.

**Price arrives later:** when the nightly feed adds a price for one of the 30, the next visit counts it, because the valuation is recomputed on each request (PRD §19 [ASSUMPTION]; any caching chosen in Phase 3 must preserve this).
