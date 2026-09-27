---
design_intent: D
design_status: specified
module: ORD
annex_scenario: 3
---

# ORD-S3: A Person's Card Is Arranged Directly, Not Bought Through TEZG

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-ORD-1 (`NotBusinessListing`), FR-INV-7, FR-MSG-1 (Annex scenario ORD-3, Individual Listing Refusal)

---

## Transaction (Q1)

**What this scenario covers:**
- A listing from an individual seller never offers "Comprar". It offers "Contactar al vendedor".
- A purchase forced through the API returns `NotBusinessListing`. It creates no order and no reservation, and the quantity stays the same.
- The refusal copy explains why and points to direct contact.

---

## Business Goal (Q2)

**Goal:** PRD §1, "individuals arrange sales directly; only verified businesses transact through TEZG".
**Objective:** 0 orders exist on individual listings, including forced calls (checked 100× in 6.4).

---

## User & Situation (Q3)

**Personas:**
- Camila, a buyer;
- a developer, who forces the call.

**Situation:** On 2.2 for Pikachu ex, Juan P. lists one LP copy for $88.000, 12,4 km away. He is an individual seller.

---

## Driving Forces (Q4)

**Hope (Camila):** Get the cheaper Pikachu ex without a runaround.
**Worry (Camila):** Not knowing why there's no "Comprar" button, or whether the listing is fake.
**Hope (developer):** Prove the rule holds on the server, not just in the UI.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Camila on her phone (R); the developer on desktop (H, `/dev/ord`).
**Entry:**
- Camila: 3.1 or 2.1 → 2.2 → Juan P.'s row.
- Developer: 6.4 → the "Compra forzada a publicación individual" preset.

---

## Best Outcome (Q7)

**User Success:**
- Juan P.'s row shows "Vende una persona · se acuerda directamente" and the action "Contactar al vendedor" → 12.1.
- A short line under the row explains the difference: "Las tiendas verificadas venden a través de TEZG; con personas, el pago y la entrega se acuerdan entre ustedes."
- If a stale page or deep link reaches 6.1 for this listing, the banner reads "Esta carta la vende una persona, no una tienda, así que se acuerda directamente con Juan P. Escríbele para comprarla.", with "Contactar al vendedor".

**Business Success:**
- In 6.4 the forced call returns `NotBusinessListing` 100/100 times, with quantity before = after, 0 orders and 0 reservation rows.

---

## Shortest Path (Q8)

1. **Card Detail (2.2)** — Juan P.'s row, with no "Comprar".
2. **Contact Seller Composer (12.1)** — a WhatsApp or copied message. ✓

---

## Trigger Map Connections

**Personas:** Camila; developer

**Driving Forces Addressed:**
- ✅ **Want:** A clear route to the individual seller.
- ❌ **Fear:** A button that silently doesn't work; platform confusion about who handles the money.

**Business Goal:** FR-ORD-1 rule 4 and FR-INV-3 (the listing-type check comes before any decrement).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| ORD-S3.1 | [`../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/`](../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/2.2-card-detail-price-provenance.md) | An individual's row offers contact, not purchase | "Contactar al vendedor" → 12.1 |
| ORD-S3.2 | [`6.4-order-timeline-simulator/`](6.4-order-timeline-simulator/6.4-order-timeline-simulator.md) | Force the purchase; `NotBusinessListing`; quantity unchanged | Inspect the Decision |
| ORD-S3.3 | [`../12-msg-messaging/12.1-contact-seller-composer/`](../12-msg-messaging/12.1-contact-seller-composer/12.1-contact-seller-composer.md) | Direct contact with Juan P. | Scenario success ✓ |

**First step** (ORD-S3.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Precedence note:** a forced purchase on an individual's last unit with quantity 0 still returns `NotBusinessListing`, not `InsufficientQuantity`, because `reserveForPurchase` checks the listing type first (FR-INV-3 order of checks).
