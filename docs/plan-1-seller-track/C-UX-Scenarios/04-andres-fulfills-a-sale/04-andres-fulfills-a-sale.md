---
design_intent: D
design_status: not-started
---

# 04: Andrés Fulfills a Sale

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-05
**Method:** Whiteport Design Studio (WDS)
**Realizes:** `docs/plan-1-seller-track/prd.md` FR-S7, FR-S8

---

## Transaction (Q1)

**What this scenario covers:**
See a real sale through to his own side of confirmation, with actual proof of payment — not just a buyer's claim.

---

## Business Goal (Q2)

**Goal:** Goal 2 — Generate recurring commission revenue; this scenario validates the in-platform sale/commission cycle from the business's side.
**Objective:** Commission revenue realized only once the business confirms receipt — the cycle must complete, not just start.

---

## User & Situation (Q3)

**Persona:** Andrés (Priority 4 — Verified Business), now verified and purchasable (Scenario 03 complete)
**Situation:** A buyer has just completed a purchase against one of his listings; Andrés needs to confirm he actually got paid.

---

## Driving Forces (Q4)

**Hope:** Confirm he's actually been paid and move on with confidence.

**Worry:** A purchase completing with no clear way to confirm payment or delivery status — his own stated fear as a persona.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Responsive web, multi-surface — no single primary device; decided per-page in Phase 3 UX design (same convention as Scenario 03).
**Entry:** Notices a new Order against one of his listings via a badge/notification and opens his incoming-orders view.

---

## Best Outcome (Q7)

**User Success:**
Confirms payment received, sees the commission auto-deduct correctly, and is done.

**Business Success:**
The tri-state settlement cycle is completed from the business side — commission revenue realized (Goal 2).

---

## Shortest Path (Q8)

1. **Incoming Orders List** — Sees the new Order against his listing.
2. **Order Detail — Review Comprobante & Confirm Payment Received** — Reviews the buyer's uploaded proof of payment and confirms payment received. ✓

---

## Trigger Map Connections

**Persona:** Andrés — Verified Business (Priority 4)

**Driving Forces Addressed:**
- ✅ **Want:** Know commission cost predictably in advance — this scenario is where that commission is actually realized (`_bmad-output/B-Trigger-Map/personas/04-verified-business.md`).
- ❌ **Fear:** Avoid a purchase completing without a clear way to confirm payment/delivery status.

**Business Goal:** Goal 2 (commission revenue), realized via the tri-state Order settlement cycle.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| 04.1 | `4.1-incoming-orders-list/` | See the new Order against his listing | Taps into the Order |
| 04.2 | `4.2-order-detail-confirm-payment/` | Review comprobante, confirm payment received | Scenario success — `sellerReceivedConfirmedAt` set ✓ |

**First step** (04.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**On-step interactions** (e.g., zooming the comprobante image within 4.2) are documented as storyboard items within each page spec in Phase 4.

**Note:** Andrés can never close this Order himself — closing is exclusive to the buyer (AD-2, [ADOPTED]). This scenario's Shortest Path ends at his own confirmation, which is his full scope of action, not a limitation of this outline.
