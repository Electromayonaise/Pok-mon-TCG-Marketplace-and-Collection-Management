# UX Scenarios: TEZG — Seller/Business Track

> Scenario outlines connecting Trigger Map personas to concrete user journeys

**Created:** 2026-09-05
**Author:** Martin with Saga (Scenario Outline)
**Method:** Whiteport Design Studio (WDS)

---

## Scenario Summary

| ID | Scenario | Persona | Pages | Priority | Status |
|----|----------|---------|-------|----------|--------|
| 01 | Valentina Publishes Her First Listing | Valentina (Individual Seller) | 3 | ⭐ P1 | ✅ Outlined |
| 02 | Valentina Manages a Trade Offer | Valentina (Individual Seller) | 3 | ⭐ P1 | ✅ Outlined |
| 03 | Andrés Verifies His Business and Funds His Balance | Andrés (Verified Business) | 3 | P2 | ✅ Outlined |
| 04 | Andrés Fulfills a Sale | Andrés (Verified Business) | 2 | P2 | ✅ Outlined |

---

## Scenarios

### [01: Valentina Publishes Her First Listing](01-valentina-publishes-her-first-listing/01-valentina-publishes-her-first-listing.md)
**Persona:** Valentina — signal trade-openness distinctly, avoid the structurelessness of WhatsApp/Telegram groups
**Pages:** 1.1 Individual-Seller Profile Step, 1.2 Create Listing, 1.3 Listing Live Confirmation
**User Value:** Lists a card in one evening session, live and correctly flagged open-to-trade, with no business-paperwork gate
**Business Value:** New seller-side listing added with zero admin-review latency, proving Goal 3's trading system live and contributing to Goal 1's catalog liquidity

---

### [02: Valentina Manages a Trade Offer](02-valentina-manages-a-trade-offer/02-valentina-manages-a-trade-offer.md)
**Persona:** Valentina — wants a trade that finalizes cleanly, fears being ghosted or scammed
**Pages:** 2.1 Trade Offers Inbox, 2.2 Trade Offer Detail, 2.3 Trade Completion Confirmation
**User Value:** A trade that shows fully completed once both sides confirm, not just a one-sided claim
**Business Value:** Completed peer-to-peer trade cycle validated end-to-end (Goal 3), inventory correctly reserved and released

---

### [03: Andrés Verifies His Business and Funds His Balance](03-andres-verifies-his-business-and-funds-his-balance/03-andres-verifies-his-business-and-funds-his-balance.md)
**Persona:** Andrés — wants credibility distinct from an anonymous Instagram account, fears unpredictable invoicing
**Pages:** 3.1 Business Verification Application, 3.2 Application Status, 3.3 Commission Balance Management
**User Value:** Approved, badge visible, balance funded, listings purchasable — no surprise invoicing
**Business Value:** A verified business activated with a funded commission balance, contributing recurring commission revenue (Goal 2)

---

### [04: Andrés Fulfills a Sale](04-andres-fulfills-a-sale/04-andres-fulfills-a-sale.md)
**Persona:** Andrés — wants to confirm payment with confidence, fears a purchase completing with no clear confirmation path
**Pages:** 4.1 Incoming Orders List, 4.2 Order Detail — Review Comprobante & Confirm Payment Received
**User Value:** Confirms payment received, sees commission auto-deduct correctly, done
**Business Value:** Tri-state settlement cycle completed from the business side — commission revenue realized (Goal 2)

---

## Page Coverage Matrix

| Page | Scenario | Purpose in Flow |
|------|----------|----------------|
| 1.1 Individual-Seller Profile Step | 01 | Complete the one-time profile, no business paperwork |
| 1.2 Create Listing | 01 | Set price/condition, toggle open-to-trade |
| 1.3 Listing Live Confirmation | 01 | Confirm listing published and visible |
| 2.1 Trade Offers Inbox | 02 | See incoming trade offer(s) |
| 2.2 Trade Offer Detail | 02 | Review and accept the offer |
| 2.3 Trade Completion Confirmation | 02 | Confirm trade completed after physical exchange |
| 3.1 Business Verification Application | 03 | Submit legal identity + external presence proof |
| 3.2 Application Status | 03 | See status move from Pending to Approved |
| 3.3 Commission Balance Management | 03 | Top up balance, create first listing (FR-S9, reuses 1.2's mechanism with different gating) |
| 4.1 Incoming Orders List | 04 | See the new Order against his listing |
| 4.2 Order Detail — Review Comprobante & Confirm Payment Received | 04 | Review comprobante, confirm payment received |

**Coverage:** 11/11 pages assigned to scenarios

---

## Next Phase

These scenario outlines feed into **Phase 3: UX Design** (`bmad-ux` + `wds-4-ux-design`) where each page gets:
- Detailed page specifications
- Wireframe sketches
- Component definitions
- Interaction details

---

_Generated with Whiteport Design Studio framework_
