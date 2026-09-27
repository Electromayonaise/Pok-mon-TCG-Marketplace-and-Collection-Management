---
design_intent: D
design_status: specified
module: TRD
annex_scenario: 4
---

# TRD-S4: Both Confirm the Swap Happened, and the Trade Reads Completed

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-TRD-7, FR-TRD-8 (Annex scenario TRD-4, Mutual Completion)

---

## Transaction (Q1)

**What this scenario covers:**
- After meeting, each party confirms once that the trade happened. "Completed" is computed from the two confirmations and is never stored.
- A one-sided confirmation shows who the trade is waiting on.
- Before anyone confirms, either party may cancel. The reservation is released exactly once, and the other party sees who cancelled.

---

## Business Goal (Q2)

**Goal:** CAP-26, mutual and computed completion.
**Objective:**
- No `completed` column exists.
- The quantity is restored exactly once on a cancel, even under a double submit.

---

## User & Situation (Q3)

**Personas:** Valentina; Julián.
**Situation:** They meet at a café in Chapinero on 10 oct 2026 and swap. Valentina confirms at 4:05 p. m. Julián only opens the app that evening.

---

## Driving Forces (Q4)

**Hope (Valentina):** Close the loop, so the trade stops showing as pending.
**Worry (Julián):** The trade being marked done before he has the cards in hand.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Phones (R).
**Entry:** Actividad → Intercambios (8.3) → the accepted trade → 8.2.

---

## Best Outcome (Q7)

**User Success:**
- **Valentina confirms.** She taps "Ya hicimos el intercambio". There is no dialog: the action is a statement of fact, and the page re-renders with "Confirmaste el 10 oct 2026, 4:05 p. m. · Esperando a que Julián confirme." Her cancel action disappears.
- **Julián confirms.** At 6:30 p. m. his page shows "Valentina confirmó que el intercambio se hizo." with "Ya hicimos el intercambio". He taps it, and both see "Completado: ambos confirmaron el intercambio el 10 oct 2026, 6:30 p. m."
- **The list.** 8.3 moves the trade to the "Completados" filter.

**Business Success:**
- `completed` is true only when both timestamps are set.
- A repeat tap gets "Ya confirmaste este intercambio el 10 oct 2026, 4:05 p. m." (`TradeAlreadyConfirmedByRole`).

---

## Shortest Path (Q8)

1. **Trade Negotiation Timeline (8.2)** — Valentina confirms; waiting on Julián.
2. **Trade Negotiation Timeline (8.2)** — Julián confirms; Completed. ✓

---

## Trigger Map Connections

**Personas:** Valentina; Julián

**Driving Forces Addressed:**
- ✅ **Want:** A clear "done" state that both agreed to.
- ❌ **Fear:** One-sided completion.

**Business Goal:** AD-4 computed completion; FR-TRD-8 exact release.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| TRD-S4.1 | [`8.2-trade-negotiation-timeline/`](8.2-trade-negotiation-timeline/8.2-trade-negotiation-timeline.md) | First confirmation; waiting state | — |
| TRD-S4.2 | [`8.2-trade-negotiation-timeline/`](8.2-trade-negotiation-timeline/8.2-trade-negotiation-timeline.md) | Second confirmation; Completed | Scenario success ✓ |

**First step** (TRD-S4.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Cancel variant (FR-TRD-8):** on 8 oct, before the meeting, Julián taps "Cancelar intercambio". A `<dialog>` explains "La carta volverá a estar disponible para otras personas." After he confirms, Valentina's 8.2 shows "Julián canceló el intercambio el 8 oct 2026, {hora}. La carta volvió a estar disponible.", and the bundle and the individual Gardevoir ex read "1 disponible" again. Offers already marked Unfulfillable are **not** reopened (FR-TRD-5). A cancel after either confirmation gets `TradeNotCancellable`, naming who confirmed.

**Messaging:** trade coordination happens off-platform through the handoff (FR-TRD-6). TEZG messaging is buyer ↔ business only (MSG), so 8.2 has no chat.
