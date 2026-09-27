---
design_intent: D
design_status: specified
module: COL
annex_scenario: 4
---

# COL-S4: Camila Closes Her Order and Gets Exactly One Offer to Add the Card

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-COL-7, FR-COL-2 (source rule), FR-COL-4 (copy keeps the source) (Annex scenario COL-4, Post-Purchase Prompt, and the COL edge case)

---

## Transaction (Q1)

**What this scenario covers:**
- When a business order closes, the buyer gets one dismissible prompt to add the purchased cards to a collection.
- Accepting creates one entry per order line, marked "Comprado en TEZG" and linked to the order. Dismissing or ignoring it creates nothing.
- The order itself is never touched by the collection.

---

## Business Goal (Q2)

**Goal:** CAP-27, purchases that flow into the collection with their provenance.
**Objective:** NFR-COL-1: with `OrderClosed` delivered twice and two concurrent accepts, exactly 1 prompt and exactly 1 entry per order line.

---

## User & Situation (Q3)

**Persona:** Camila.
**Situation:** On 16 oct 2026, 1:30 p. m., the Charizard ex from Tienda Andrés (NM, $180.000) arrives at her office. She taps "Ya recibí la carta" on 6.2 and the order closes (ORD-S4). She had the order open in a second browser tab from the morning.

---

## Driving Forces (Q4)

**Hope:** Add the card to her collection in one tap, with the record that she bought it in TEZG.
**Worry:** Duplicates, or being nagged every time she opens the app.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Phone (R), plus a laptop tab left open.
**Entry:** 6.2 order detail, right after closing: the inline `prompt-card` (owned by 9.4). Later, Actividad → Sugerencias (9.4) lists every prompt.

---

## Best Outcome (Q7)

**User Success:**
- **The prompt.** In place on 6.2: "¿Agregar Charizard ex a tu colección?", a select "Colección" set to "Mi primera colección" (her most recently used), "Agregar" and "Ahora no".
- **Accepted.** She taps "Agregar". The card re-renders as "Agregaste Charizard ex a «Mi primera colección»." with a link "Ver en tu colección". Below it, the order shows "Ahora puedes reseñar a Tienda Andrés".
- **In the binder.** The entry shows "Comprado en TEZG", quantity 1 and acquisition date 16 oct 2026, with a link to the order.
- **The other tab.** On the laptop, the stale tab still shows the prompt. She taps "Agregar" there too; it re-renders as "Ya agregaste esta carta a «Mi primera colección»." and nothing is created.

**Business Success:**
- 1 prompt row per order (unique key), 1 entry per line, second accept `PromptAlreadyResolved`.
- The order's closed state is neither read nor written by `collections`.

---

## Shortest Path (Q8)

1. **Buyer Order Detail (6.2)** — The order closes; the inline prompt appears.
2. **Post-Purchase Prompts (9.4, inline)** — "Agregar" into "Mi primera colección". ✓

---

## Trigger Map Connections

**Persona:** Camila

**Driving Forces Addressed:**
- ✅ **Want:** One-tap add with provenance.
- ❌ **Fear:** Duplicates and nagging.

**Business Goal:** FR-COL-7; NFR-COL-1.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| COL-S4.1 | [`../06-ord-order-comprobante/6.2-buyer-order-detail/`](../06-ord-order-comprobante/6.2-buyer-order-detail/6.2-buyer-order-detail.md) | Order closes | Prompt shown inline |
| COL-S4.2 | [`9.4-post-purchase-prompts/`](9.4-post-purchase-prompts/9.4-post-purchase-prompts.md) | Accept into a collection | Scenario success ✓ |

**First step** (COL-S4.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Dismiss variant:** "Ahora no" re-renders the card as "Descartaste la sugerencia de Charizard ex." The prompt moves to "Descartadas" in 9.4 and creates nothing. It cannot be reopened; she can still add the card by hand (9.2), as a `Manual` entry.

**Ignore variant:** if she leaves the prompt alone, it stays under "Pendientes" in 9.4 with no expiry, and the Actividad "Sugerencias" tab counts it.

**Bundle variant:** for a bundle order, the prompt lists one line per component card, and accepting creates one entry per line.

**Edge case (NFR-COL-1):** `OrderClosed` delivered twice plus the two-tab accept above, driven 100 times from the COL fixtures (see 9.4 Technical Notes). There is no dedicated COL console in the page map; the proof runs as an integration test.
