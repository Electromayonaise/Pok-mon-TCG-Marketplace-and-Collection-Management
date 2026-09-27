---
design_intent: D
design_status: specified
module: ORD
annex_scenario: 4
---

# ORD-S4: The Card Arrives, the Order Closes, and the Collection Asks First

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-ORD-5, FR-ORD-6, FR-ORD-8, FR-ORD-9, FR-COL-7, FR-REP-1 (Annex scenario ORD-4, Item Received and Close)

---

## Transaction (Q1)

**What this scenario covers:**
- The buyer confirms "Ya recibí la carta" on a paid order, and the order closes.
- The business's confirmation is not required. If it is missing, the order still closes and COM charges on the `buyerClosed` trigger.
- `OrderClosed` lines expand for bundles.
- COL shows a prompt; it never adds the card on its own.
- The closed purchase makes the buyer eligible to review (FR-ORD-9, `hasClosedPurchase`).

---

## Business Goal (Q2)

**Goal:** PRD §1, "collections grow only by the owner's choice" and "reviews only from verified purchases".
**Objective:**
- Closing the order creates 0 collection entries.
- 100 % of business reviews on 11.1 come from a closed purchase (FR-REP-1); individual-seller reviews are ungated and labelled so (FR-REP-2).

---

## User & Situation (Q3)

**Persona:** Camila (UJ-1 steps 6–7).
**Situation:** On 16 oct 2026, 1:30 p. m., the envelope arrives at her office in Medellín. The Charizard ex is in NM, as listed.

---

## Driving Forces (Q4)

**Hope:** Mark the deal done, put the card in her collection, and tell others Andrés was reliable.
**Worry:** The app adding the card to the wrong collection, or doing it without asking.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Phone (R).
**Entry:** Actividad → Pedidos → the Tienda Andrés order (6.2).

---

## Best Outcome (Q7)

**User Success:**
- "Ya recibí la carta" closes the order. The facts list shows all three facts with their times, and the status reads "Cerrado · 16 oct 2026, 1:30 p. m.".
- An inline `prompt-card` appears in place (9.4): "¿Agregar Charizard ex a tu colección?". She picks "Mi primera colección" and taps "Agregar".
- The closed order shows the link "Ahora puedes reseñar a Tienda Andrés" → 11.1.

**Business Success:**
- The order is `Closed`, `OrderClosed` is published once, and COL holds exactly 1 Pending prompt until she acts.
- If Andrés hadn't confirmed yet, COM would charge once on `buyerClosed`, and Andrés's ledger line would say so (see COM-S2).

---

## Shortest Path (Q8)

1. **Buyer Order Detail (6.2)** — "Ya recibí la carta".
2. **Post-Purchase Prompts (9.4, inline)** — choose a collection.
3. **Write a Review (11.1)** — from the closed order. ✓

---

## Trigger Map Connections

**Persona:** Camila

**Driving Forces Addressed:**
- ✅ **Want:** A clean close; her collection under her control; a voice on the shop's reputation.
- ❌ **Fear:** Automatic side effects; reviews from people who never bought.

**Business Goal:** FR-COL-7 (exactly one prompt per closed order); FR-REP-1 eligibility.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| ORD-S4.1 | [`6.2-buyer-order-detail/`](6.2-buyer-order-detail/6.2-buyer-order-detail.md) | "Ya recibí la carta"; the order closes | The inline prompt appears |
| ORD-S4.2 | [`../09-col-collections/9.4-post-purchase-prompts/`](../09-col-collections/9.4-post-purchase-prompts/9.4-post-purchase-prompts.md) | Accept the prompt into "Mi primera colección" | "Ahora puedes reseñar…" |
| ORD-S4.3 | [`../11-rep-reputation-moderation/11.1-write-a-review/`](../11-rep-reputation-moderation/11.1-write-a-review/11.1-write-a-review.md) | Review eligibility is proven | Scenario success ✓ |

**First step** (ORD-S4.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Edge (mandatory):**
- **Out of order.** "Ya recibí la carta" before "Ya pagué" returns `OrderConfirmationOutOfOrder`. The banner offers "Ya pagué" (6.2; repeated ×100 in 6.4).
- **Duplicates.** A duplicate "Recibí el pago" or "Ya recibí la carta" returns `OrderAlreadyConfirmedByRole` with the original time.
- **Paid vs expiry.** A "Ya pagué" landing at `expiresAt` either wins (paid, never expires) or loses to the sweep (`OrderNoLongerActive`, expired copy). The two never both apply (6.4 preset ×100).
- **Stalled.** A paid order with no business confirmation after 7 days shows the stalled copy and "Contactar a soporte" on 6.2 (NFR-ORD-4).
