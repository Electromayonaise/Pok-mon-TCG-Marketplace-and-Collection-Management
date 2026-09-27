---
design_intent: D
design_status: specified
module: IDN
annex_scenario: 2
---

# IDN-S2: Valentina Hits the Profile Gate on Her First Listing

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-IDN-3, FR-IDN-2 (Annex scenario IDN-2, First-Listing Profile Gate)

---

## Transaction (Q1)

**What this scenario covers:**
Valentina tries to publish before completing the individual-seller profile. The refusal explains itself and leads straight into the profile step, and she returns to her draft listing with nothing lost. A business account is exempt from this gate.

---

## Business Goal (Q2)

**Goal:** PRD §1, "defensively specified": every refusal explains itself and cites its rule.
**Objective:** `IndividualSellerProfileIncomplete` behaves as a doorway, not a dead end. PRD §22 counter-metric: "I don't understand why X was refused" tickets stay ≤ 2 % of refusals.

---

## User & Situation (Q3)

**Persona:** Valentina, 27, Bogotá.
**Situation:** She is a buyer who has never sold. She wants to list a duplicate Charizard ex she pulled at a release night and has filled the listing form on her phone.

---

## Driving Forces (Q4)

**Hope:** Publish tonight, while the card is fresh.

**Worry:** Losing what she typed, or being asked for a pile of business paperwork just to sell one card.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (R).
**Entry:** Cuenta → Vender → "Nueva publicación" (4.1), with the form filled in, then "Publicar".

---

## Best Outcome (Q7)

**User Success:**
One banner says exactly what's missing: display name, phone and meeting point. "Completar perfil" opens a three-field form, and she returns to her listing, intact, with "Publicar" now working.

**Business Success:**
The gate is enforced server-side in the documented order (FR-IDN-3). The profile writes atomically with its phone-sharing consent (FR-IDN-2). The draft is preserved client-side, and nothing is published until eligibility is `allowed`.

---

## Shortest Path (Q8)

1. **Create Listing (4.1)** — "Publicar" → banner `IndividualSellerProfileIncomplete` with the action "Completar perfil"; the draft is kept.
2. **Individual-Seller Profile Step (1.2)** — she enters her name, +57 phone, consent and meeting point, then "Guardar y volver a mi publicación".
3. **Create Listing (4.1)** — the draft is restored and "Publicar" succeeds. ✓

---

## Trigger Map Connections

**Persona:** Valentina — first-time individual seller

**Driving Forces Addressed:**
- ✅ **Want:** A short, understandable path to her first sale.
- ❌ **Fear:** Losing her input or facing a "business" onboarding she doesn't need.

**Business Goal:** Explained-decision coverage (NFR-SYS-1); CAP-19 profile-step gate.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| IDN-S2.1 | [`../04-inv-listing-shared-inventory/4.1-create-listing-bundle/`](../04-inv-listing-shared-inventory/4.1-create-listing-bundle/4.1-create-listing-bundle.md) | Attempt to publish; the gate refuses with an explanation | Taps "Completar perfil" |
| IDN-S2.2 | [`1.2-individual-seller-profile-step/`](1.2-individual-seller-profile-step/1.2-individual-seller-profile-step.md) | Complete the profile step | Taps "Guardar y volver a mi publicación" |
| IDN-S2.3 | [`../04-inv-listing-shared-inventory/4.1-create-listing-bundle/`](../04-inv-listing-shared-inventory/4.1-create-listing-bundle/4.1-create-listing-bundle.md) | Publish the restored draft | Scenario success: listing Active ✓ |

**First step** (IDN-S2.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**Exemption check:** when Andrés (a `Pending` business) opens 4.1, no profile-gate banner appears (FR-IDN-3 rule 2).
