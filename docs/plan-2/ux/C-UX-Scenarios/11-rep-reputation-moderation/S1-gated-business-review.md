---
design_intent: D
design_status: specified
module: REP
annex_scenario: 1
---

# REP-S1: Camila Can't Review Tienda Andrés Until the Card Arrives

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-REP-1 (Annex scenario REP-1, Gated Review of a Business); FR-REP-7; FR-ORD-9 (`hasClosedPurchase`); NFR-REP-1 (first half); UJ-1 steps 7–8

---

## Transaction (Q1)

**What this scenario covers:**
- A buyer can review a verified shop only after a **closed** purchase from it; a paid order is not enough, and the refusal says so in words.
- The page checks eligibility when it opens, so she never writes a review only to have it refused; the server checks again on submit.
- Once the order closes, the same request succeeds and the review is stored with `purchaseVerified = true`.
- One review per shop: a second attempt turns into an edit, and an edited review says "editada".

---

## Business Goal (Q2)

**Goal:** PRD §1, "reviews only from verified purchases" (CAP-7).
**Objective:**
- A business review submitted while the order is paid but not closed is refused with `NotVerifiedPurchaser` in 100/100 cases (NFR-REP-1).
- Every business review carries the "Compra verificada" marker, because it can only exist after a closed purchase.

---

## User & Situation (Q3)

**Persona:** Camila, buyer (UJ-1).
**Situation:**
- **14 oct 2026, 7:40 p. m.** Her Charizard ex order is in "Pago confirmado": Tienda Andrés confirmed her payment on 13 oct 2026, 9:12 a. m. (ORD-S2), and the envelope hasn't arrived. She wants to leave a good word for the shop now, while she remembers how quick they were.
- **16 oct 2026, 1:30 p. m.** The envelope arrives and she closes the order (ORD-S4). The closed order shows "Ahora puedes reseñar a Tienda Andrés".

The scenario runs on the seed branch in which Tienda Andrés is Approved and has 13 reviews, 12 of them visible (PRD §20 seed; see REP-S3).

---

## Driving Forces (Q4)

**Hope:** Say the shop was fast and honest, and have that count for other buyers.
**Worry:** Typing a review and losing it to an error she doesn't understand.
**Business worry:** Reviews from people who paid but never got the card, or never bought at all.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (R), 360 px.
**Entry:**
- **First attempt:** 2.2 → seller name "Tienda Andrés" → 11.2 → "Escribir una reseña" → 11.1.
- **After the close:** 6.2 → "Ahora puedes reseñar a Tienda Andrés" → 11.1.

---

## Best Outcome (Q7)

**User Success:**
- **Before the close (14 oct).** 11.1 opens with a refusal banner in place of the form: "Podrás reseñar a Tienda Andrés cuando confirmes que recibiste la carta: pagar no es suficiente." with the action "Ver pedido" (→ 6.2). Its "¿Por qué?" disclosure reads "Tu pedido: Pago confirmado desde el 13 oct 2026, 9:12 a. m." She has typed nothing, so she has lost nothing.
- **After the close (16 oct).** 11.1 shows the form: "Calificación" (five stars, none preselected), "Tu reseña (opcional)" with a counter "0/1.000", and "Publicar reseña". She picks 5 stars, writes "Envío rápido y la carta llegó tal como en las fotos.", and publishes at 1:36 p. m.
- **The result.** 11.2 opens with the live-region message "Publicaste tu reseña de Tienda Andrés." The summary reads "4,3 · 13 reseñas · De compras verificadas", and her review is first in the list with "Compra verificada" and "16 oct 2026".

**Business Success:**
- The 14 oct refusal cites the order's latest state (`latestState = PaymentConfirmed`); no review row is written.
- The 16 oct review has `purchaseVerified = true`. The aggregate is 56 / 13 = 4,31 → "4,3" (half-up, one decimal, `ADD-§2.9`).

---

## Shortest Path (Q8)

1. **Seller Reputation Profile (11.2)** — "Escribir una reseña" (14 oct).
2. **Write a Review (11.1)** — refused, "Ver pedido".
3. **Buyer Order Detail (6.2)** — after the close, "Ahora puedes reseñar a Tienda Andrés" (16 oct).
4. **Write a Review (11.1)** — 5 stars, "Publicar reseña".
5. **Seller Reputation Profile (11.2)** — her review on top, the new aggregate. ✓

---

## Trigger Map Connections

**Persona:** Camila

**Driving Forces Addressed:**
- ✅ **Want:** Her review counts, and is marked as coming from a real purchase.
- ❌ **Fear:** Writing for nothing; reviews from non-buyers.

**Business Goal:** FR-REP-1 gate; NFR-REP-1 (paid-not-closed refused).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| REP-S1.1 | [`11.2-seller-reputation-profile/`](11.2-seller-reputation-profile/11.2-seller-reputation-profile.md) | Start a review of the shop | "Escribir una reseña" |
| REP-S1.2 | [`11.1-write-a-review/`](11.1-write-a-review/11.1-write-a-review.md) | Refused before the close, with the reason | "Ver pedido" |
| REP-S1.3 | [`../06-ord-order-comprobante/6.2-buyer-order-detail/`](../06-ord-order-comprobante/6.2-buyer-order-detail/6.2-buyer-order-detail.md) | Close the order (ORD-S4); the review link appears | "Ahora puedes reseñar a Tienda Andrés" |
| REP-S1.4 | [`11.1-write-a-review/`](11.1-write-a-review/11.1-write-a-review.md) | Write and publish | "Publicar reseña" |
| REP-S1.5 | [`11.2-seller-reputation-profile/`](11.2-seller-reputation-profile/11.2-seller-reputation-profile.md) | See the review and the new aggregate | Scenario success ✓ |

**First step** (REP-S1.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**No purchase at all:** a buyer with no order from the shop gets "Para reseñar a Tienda Andrés necesitas una compra suya que hayas recibido." and no action.

**Not a reviewable target:** 11.2 does not offer "Escribir una reseña" for a shop that isn't Approved. A deep link to 11.1 for a Pending, Rejected or Withdrawn shop, or for an account that isn't a seller, shows "Solo puedes reseñar tiendas verificadas y vendedores con perfil completo." (`TargetNotFound`).

**Second review:** when she already has a review of the shop, 11.1 opens in edit mode ("Editar tu reseña", with her rating and text filled in). If a second tab still submits a new one, the refusal "Ya reseñaste a Tienda Andrés. Puedes editar tu reseña." offers "Editar mi reseña" (`DuplicateReview`).

**Edit:** on 20 oct 2026 she adds "Muy buena atención." and taps "Guardar cambios". Her card on 11.2 keeps the date of 16 oct and gains "editada". The rating is editable too; `purchaseVerified` keeps its snapshot.

**Hidden review:** if moderation hides her review, 11.1 shows the tombstone "Oculta por moderación de TEZG: {motivo}." and no form (see REP-S4).
