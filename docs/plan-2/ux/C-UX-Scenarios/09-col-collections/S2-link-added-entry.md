---
design_intent: D
design_status: specified
module: COL
annex_scenario: 2
---

# COL-S2: Valentina Adds Two Promos the Catalog Doesn't Have, by Link

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-COL-2, FR-COL-3 (Annex scenario COL-2, Link-Added Entry)

---

## Transaction (Q1)

**What this scenario covers:**
- A collector adds a card that is not in the catalog by giving a link, a title and, optionally, an image link.
- The entry shows in the binder with its title, the link's domain and the badge "Agregado por enlace". No catalog entry is ever created.
- The same page adds catalog cards by hand, with quantity, acquisition date and an optional price paid.

---

## Business Goal (Q2)

**Goal:** CAP-24 (cards outside the catalog) without polluting the catalog (AD-8).
**Objective:**
- 0 `CatalogEntry` writes from `collections`.
- The server never fetches the link; the image loads in the browser only.

---

## User & Situation (Q3)

**Persona:** Valentina.
**Situation:** On 28 sep 2026 she got two store-event promos that TEZG's catalog doesn't list. She has their pages open on a promo-tracking site and wants them in "Kanto 151" next to the rest.

---

## Driving Forces (Q4)

**Hope:** Every card she owns lives in one place, even the odd ones.
**Worry:** Having to fake a catalog card, or the app showing a broken placeholder.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Phone (R).
**Entry:** 9.1 "Kanto 151" → "Agregar carta" → 9.2, tab "Por enlace".

---

## Best Outcome (Q7)

**User Success:**
- **The form.** She pastes the link, types the title and pastes the image link. A note under the fields says "TEZG no abre este enlace: solo guardamos el nombre, el enlace y la imagen que indiques."
- **A mistake.** Her first paste starts with "http://". The field says "El enlace debe empezar por https:// y tener menos de 2.048 caracteres." She fixes it; nothing else she typed is lost.
- **Saved.** She taps "Agregar a «Kanto 151»". She lands back on 9.1, on the page that holds the new entry, and the live region says "Agregaste {título} a «Kanto 151»." The pocket shows the image, the title and "Agregado por enlace · promos.example".
- **The second promo** goes the same way; without an image link, its pocket shows the title and domain on a plain pocket (no placeholder art).

**Business Success:**
- The catalog entry count is unchanged after both adds.
- Both entries have `source=Manual`; only the post-purchase prompt can create `PlatformPurchase` entries.

---

## Shortest Path (Q8)

1. **Collections & Binder (9.1)** — "Agregar carta".
2. **Add Entry (9.2)** — "Por enlace": link, title, image → "Agregar a «Kanto 151»".
3. **Collections & Binder (9.1)** — The pocket renders with its badge. ✓

---

## Trigger Map Connections

**Persona:** Valentina

**Driving Forces Addressed:**
- ✅ **Want:** One place for every card.
- ❌ **Fear:** Fake catalog cards or broken placeholders.

**Business Goal:** FR-COL-3; NFR-COL-3 (0 catalog writes).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| COL-S2.1 | [`9.1-collections-binder/`](9.1-collections-binder/9.1-collections-binder.md) | Start from the binder | "Agregar carta" |
| COL-S2.2 | [`9.2-add-entry/`](9.2-add-entry/9.2-add-entry.md) | Enter the link entry | "Agregar a «Kanto 151»" |
| COL-S2.3 | [`9.1-collections-binder/`](9.1-collections-binder/9.1-collections-binder.md) | See the entry in place | Scenario success ✓ |

**First step** (COL-S2.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Manual catalog add (FR-COL-2):** on the tab "Del catálogo" she searches "Mew ex", sets quantity 2, acquisition date 19 sep 2026 and price paid $30.000, and adds it to "Kanto 151" (it is one of the 120 entries in COL-S1, and the step on 19 sep in VAL-S4). The entry shows "Agregado a mano". A date after today is refused in place ("La fecha no puede ser posterior a hoy."), and so is a quantity outside 1–999.

**Valuation link:** the link-added entries appear in 10.1's "No valoradas" list with "Agregada por enlace: no tiene precio de catálogo." (VAL-S1, UJ-5).
