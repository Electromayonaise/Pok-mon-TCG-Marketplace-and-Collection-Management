---
design_intent: D
design_status: not-started
---

# 03: Valentina Pays Without a Payment Gateway

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-04
**Method:** Whiteport Design Studio (WDS)
**Realizes:** `docs/plan-1-buyer-track/prd.md` UJ-3, FR-4, FR-5

---

## Transaction (Q1)

**What this scenario covers:**
Confirm an in-platform purchase and complete payment peer-to-peer, using only a photo of the bank transfer as proof — no payment gateway, no escrow.

---

## Business Goal (Q2)

**Goal:** Goal 2 — Build sustainable business-side revenue
**Objective:** Objective 2.2 — Grow transaction volume through verified-business in-platform purchases. Objective 2.3 — Maintain zero collections risk via peer-to-peer settlement, no after-the-fact invoicing.

---

## User & Situation (Q3)

**Persona:** Valentina, 27, Bogotá (Priority 1 — Release-Driven Collector)
**Situation:** Same session, decision already made — she's on the verified-business listing she picked in Scenario 02, ready to buy.

---

## Driving Forces (Q4)

**Hope:** Pay quickly via her own banking app and have proof she did her part.

**Worry:** Sending money with no receipt and no way to prove she paid if something goes wrong.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (browser + camera for the comprobante photo)
**Entry:** Taps "Buy" directly from the listing she picked in Scenario 02 — a same-session continuation, not a new arrival.

---

## Best Outcome (Q7)

**User Success:**
The order visibly shows a buyer-paid state the moment her comprobante is uploaded and confirmed — she has proof she did her part, without TEZG ever touching her money.

**Business Success:**
A completed peer-to-peer transaction is recorded with photographic proof, at zero payment-gateway integration cost or collections risk (Objective 2.3), while advancing Objective 2.2's transaction-volume goal.

---

## Shortest Path (Q8)

1. **Purchase Confirmation Screen** — Confirms the purchase; receives an OrderId and the business's payment details (QR/bank account).
2. **Comprobante Upload & Payment Confirmation** — Pays via her own banking app outside TEZG, returns, uploads a photo of the transfer confirmation, and confirms "I paid." ✓

---

## Trigger Map Connections

**Persona:** Valentina — Release-Driven Collector (Priority 1)

**Driving Forces Addressed:**
- ✅ **Want:** A COP-native, peer-to-peer purchase path without a payment gateway or a stranger's word to trust.
- ❌ **Fear:** Her money vanishing into a stranger's account with no recourse or record.

**Business Goal:** Goal 2, Objectives 2.2 and 2.3.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| 03.1 | `3.1-purchase-confirmation-screen/` | Confirm purchase, receive OrderId and payment details | Pays externally via banking app, returns to TEZG |
| 03.2 | `3.2-comprobante-upload-payment-confirmation/` | Upload proof of payment and confirm "I paid" | Final — scenario success, order shows buyer-paid state ✓ |

**First step** (03.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
