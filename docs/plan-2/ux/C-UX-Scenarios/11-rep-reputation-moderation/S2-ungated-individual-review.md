---
design_intent: D
design_status: specified
module: REP
annex_scenario: 2
---

# REP-S2: Julián Reviews Valentina, and the Profile Says the Review Isn't Tied to a Purchase

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-REP-2 (Annex scenario REP-2, Ungated Individual-Seller Review); FR-REP-3 (label); FR-REP-7

---

## Transaction (Q1)

**What this scenario covers:**
- Anyone signed in can review an individual seller with a complete profile. There is no purchase or trade check, and the review is stored with `purchaseVerified = false`.
- The profile says so up front, next to the average: "Las reseñas no están ligadas a compras".
- The one-review-per-target rule still applies.

---

## Business Goal (Q2)

**Goal:** CAP-7, with the SPEC's flagged risk stated to readers instead of hidden from them.
**Objective:**
- A review of Valentina succeeds with no order between the two accounts (FR-REP-2 acceptance).
- No individual-seller review ever shows the "Compra verificada" marker.

---

## User & Situation (Q3)

**Persona:** Julián, collector (UJ-2).
**Situation:** 10 oct 2026, 7:15 p. m. The trade with Valentina completed at 6:30 p. m. (TRD-S4): they met at a café in Chapinero and both confirmed. There is no order between them, only a trade. He wants to tell other collectors she was reliable.

**Scenario fixture** (the §3 seed does not fix Valentina's reviews): after REP-S4, Valentina's profile has 6 visible reviews summing 28 stars, so it reads "4,7 · 6 reseñas".

---

## Driving Forces (Q4)

**Hope:** A quick way to vouch for a good trading partner.
**Worry (other buyers):** Taking an individual's stars at face value when nobody checked anything.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (R).
**Entry:** Valentina's name on one of her listings (2.2) → 11.2 → "Escribir una reseña" → 11.1.

---

## Best Outcome (Q7)

**User Success:**
- **The form.** 11.1 shows, above the form, "Las reseñas de vendedores no están ligadas a compras: cualquier persona con cuenta puede reseñar a Valentina." He picks 5 stars, writes "Intercambio en persona, todo como acordamos.", and taps "Publicar reseña".
- **The result.** 11.2 opens with the live-region message "Publicaste tu reseña de Valentina." The summary reads "4,7 · 7 reseñas · Las reseñas no están ligadas a compras". His card shows the stars, the text and "10 oct 2026", with no purchase marker.

**Business Success:**
- `purchaseVerified = false` is stored; no call to `orders.hasClosedPurchase` is made.
- The aggregate is 33 / 7 = 4,71 → "4,7" (`ADD-§2.9`).

---

## Shortest Path (Q8)

1. **Seller Reputation Profile (11.2)** — "Escribir una reseña".
2. **Write a Review (11.1)** — 5 stars, "Publicar reseña".
3. **Seller Reputation Profile (11.2)** — his review and the ungated label. ✓

---

## Trigger Map Connections

**Persona:** Julián (writer); every later reader of Valentina's profile

**Driving Forces Addressed:**
- ✅ **Want:** Vouch for a seller in a few taps.
- ❌ **Fear:** Mistaking an ungated rating for a verified one.

**Business Goal:** FR-REP-2 (accepted with no order); FR-REP-3 label.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| REP-S2.1 | [`11.2-seller-reputation-profile/`](11.2-seller-reputation-profile/11.2-seller-reputation-profile.md) | Open Valentina's profile | "Escribir una reseña" |
| REP-S2.2 | [`11.1-write-a-review/`](11.1-write-a-review/11.1-write-a-review.md) | Write the ungated review | "Publicar reseña" |
| REP-S2.3 | [`11.2-seller-reputation-profile/`](11.2-seller-reputation-profile/11.2-seller-reputation-profile.md) | Read it with the ungated label | Scenario success ✓ |

**First step** (REP-S2.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Incomplete profile:** an account that has not completed the individual-seller profile step (1.2) has no public profile to review. 11.2 does not offer "Escribir una reseña" for it, and a deep link to 11.1 shows "Solo puedes reseñar tiendas verificadas y vendedores con perfil completo." (`TargetNotFound`).

**Second review:** same as REP-S1: edit mode on load; `DuplicateReview` with "Editar mi reseña" if a second tab submits.

**Own profile:** 11.2 does not show "Escribir una reseña" on the viewer's own profile. This is a courtesy, not a rule: self-review detection is out of scope (PRD §5, FR-REP-2), and a direct request is not refused by the server.
