---
design_intent: D
design_status: not-started
---

# 04: Valentina Checks Her Orders — and Her Sales

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-04
**Method:** Whiteport Design Studio (WDS)
**Realizes:** `docs/plan-1-buyer-track/prd.md` UJ-4, FR-6, FR-7, FR-8, FR-9

---

## Transaction (Q1)

**What this scenario covers:**
Track an order through to closure, and — separately, in the same place — check her own individual-seller selling activity, without the app treating her as either "just a buyer" or "just a seller."

---

## Business Goal (Q2)

**Goal:** Goal 3 — Ship the non-negotiable core by the November 2026 deadline
**Objective:** Objective 3.3 — Replace the three-tool manual-reconciliation workflow with the "one canonical card, three lenses" unified data model, which natively supports a user being both buyer and seller at once.

---

## User & Situation (Q3)

**Persona:** Valentina, 27, Bogotá (Priority 1 — Release-Driven Collector, dual-role with Priority 2 Individual Seller)
**Situation:** A few days later, checking in on her purchase from wherever she is — not mid-session anymore, a return visit.

---

## Driving Forces (Q4)

**Hope:** See her card is on its way or has arrived, without having to message the seller to ask.

**Worry:** Not knowing whether her money or her card is stuck somewhere with no visibility.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (browser)
**Entry:** Opens the TEZG app days after her purchase and navigates to her Orders view from the account menu — a return visit, not a fresh session.

---

## Best Outcome (Q7)

**User Success:**
Confirms "item received" once her card physically arrives, accepts an add-to-collection prompt, and separately sees a summary of her own open individual-seller listings and pending trade offers — never wondering "am I a buyer or a seller here."

**Business Success:**
The Order closes only on the buyer's own confirmation, holding the peer-to-peer trust model (Goal 2, Objective 2.3), while the dual-role data model surfaces natively without a separate "become a seller" mode switch (Objective 3.3).

---

## Shortest Path (Q8)

1. **Orders List** — Sees her recent order's three independent states: paid, received-by-seller, received-by-buyer.
2. **Order Detail** — Confirms "item received" once her card physically arrives, closing the Order.
3. **Add-to-Collection Prompt** — Accepts the prompt; her new card appears in her binder tagged `PlatformPurchase`.
4. **My Sales Tab** — Separately checks a summary of the individual-seller listings she has open on the side. ✓

---

## Trigger Map Connections

**Persona:** Valentina — Release-Driven Collector (Priority 1), dual-role with Individual Seller (Priority 2)

**Driving Forces Addressed:**
- ✅ **Want:** Order status visibility without needing to message the seller to ask.
- ❌ **Fear:** Money or card in limbo with no way to check status, and being forced into an artificial "pick one role" experience.

**Business Goal:** Goal 3, Objective 3.3 (unified data model); Goal 2, Objective 2.3 (peer-to-peer trust, buyer-exclusive closure).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| 04.1 | `4.1-orders-list/` | See the order's three independent confirmation states | Opens the order for detail |
| 04.2 | `4.2-order-detail/` | Confirm "item received," closing the Order | Add-to-collection prompt appears |
| 04.3 | `4.3-add-to-collection-prompt/` | Accept or decline adding the item to her collection | Navigates to the My Sales tab |
| 04.4 | `4.4-my-sales-tab/` | Check her own open individual-seller listings and pending trade-offer count | Final — scenario success ✓ |

**First step** (04.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
