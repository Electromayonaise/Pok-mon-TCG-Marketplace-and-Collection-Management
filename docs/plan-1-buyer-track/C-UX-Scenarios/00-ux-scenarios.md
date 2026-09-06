# UX Scenarios: TEZG — Buyer/Collector Track

> Scenario outlines connecting Trigger Map personas to concrete user journeys

**Created:** 2026-09-04
**Author:** Martin with Saga (Scenario Outline)
**Method:** Whiteport Design Studio (WDS)
**Realizes:** `docs/plan-1-buyer-track/prd.md` UJ-1 through UJ-4

---

## Scenario Summary

| ID | Scenario | Persona | Pages | Priority | Status |
|----|----------|---------|-------|----------|--------|
| 01 | Valentina Finds Her First Card | Valentina (Release-Driven Collector) | 3 | ⭐ P1 | ✅ Outlined |
| 02 | Valentina Picks a Listing She Trusts | Valentina (Release-Driven Collector) | 1 | ⭐ P1 | ✅ Outlined |
| 03 | Valentina Pays Without a Payment Gateway | Valentina (Release-Driven Collector) | 2 | ⭐ P1 | ✅ Outlined |
| 04 | Valentina Checks Her Orders — and Her Sales | Valentina (dual-role: Collector + Individual Seller) | 4 | P2 | ✅ Outlined |

---

## Scenarios

### [01: Valentina Finds Her First Card](01-valentina-finds-her-first-card/01-valentina-finds-her-first-card.md)
**Persona:** Valentina — Hope: finally see a price she can trust; Worry: another marketplace with made-up or stale prices
**Pages:** Sign Up, Catalog Browse & Filter, Card Detail View
**User Value:** Goes from no account to a card detail view she trusts enough to act on, in one sitting.
**Business Value:** Realizes Goal 1 Objective 1.2 — zero need to leave the platform to sanity-check price.

---

### [02: Valentina Picks a Listing She Trusts](02-valentina-picks-a-listing-she-trusts/02-valentina-picks-a-listing-she-trusts.md)
**Persona:** Valentina — Hope: find a listing she can commit to without a second-guessing detour; Worry: paying a premium to an anonymous, unverifiable seller
**Pages:** Listing Search Results & Comparison
**User Value:** Chooses a listing she trusts on price and seller legitimacy without leaving the page.
**Business Value:** Realizes Goal 1 Objective 1.3 + Goal 2 Objective 2.2 — verified-business listings win trust-driven purchase decisions.

---

### [03: Valentina Pays Without a Payment Gateway](03-valentina-pays-without-a-payment-gateway/03-valentina-pays-without-a-payment-gateway.md)
**Persona:** Valentina — Hope: a purchase that doesn't feel sketchy despite no payment gateway; Worry: sending money with no proof it ever arrived
**Pages:** Purchase Confirmation Screen, Comprobante Upload & Payment Confirmation
**User Value:** Completes a bank-transfer purchase with a durable, visible proof-of-payment record.
**Business Value:** Realizes Goal 2 Objective 2.2 + 2.3 — transaction volume grows under a zero-collections-risk, prepaid/pause model.

---

### [04: Valentina Checks Her Orders — and Her Sales](04-valentina-checks-her-orders-and-her-sales/04-valentina-checks-her-orders-and-her-sales.md)
**Persona:** Valentina — Hope: see her card is on its way without messaging the seller; Worry: money or card stuck in limbo with no visibility
**Pages:** Orders List, Order Detail, Add-to-Collection Prompt, My Sales Tab
**User Value:** Closes the loop on a purchase and checks her own selling activity in one place, never forced into a single-role mode.
**Business Value:** Realizes Goal 3 Objective 3.3 — the "one canonical card, three lenses" data model natively supports dual buyer/seller identity.

---

## Page Coverage Matrix

| Page | Scenario | Purpose in Flow |
|------|----------|----------------|
| Sign Up | 01 | Create an account as the entry point into the catalog |
| Catalog Browse & Filter | 01 | Browse/filter toward a card of interest |
| Card Detail View | 01 | See the three-value trustworthy price display — scenario climax |
| Listing Search Results & Comparison | 02 | Compare listings and pick one to trust |
| Purchase Confirmation Screen | 03 | Confirm intent to buy and see bank-transfer instructions |
| Comprobante Upload & Payment Confirmation | 03 | Upload proof of payment to complete the purchase |
| Orders List | 04 | See the order's three independent confirmation states |
| Order Detail | 04 | Confirm item-received, closing the Order |
| Add-to-Collection Prompt | 04 | Accept/decline adding the purchased card to her collection |
| My Sales Tab | 04 | Check her own open individual-seller listings and pending trade offers |

**Coverage:** 10/10 pages assigned to scenarios

---

## Next Phase

These scenario outlines feed into **Phase 3 (Part B): UX Design** (`wds-4-ux-design`) where each page gets:
- Detailed page specifications
- Wireframe sketches
- Component definitions
- Interaction details

---

_Generated with Whiteport Design Studio framework_
