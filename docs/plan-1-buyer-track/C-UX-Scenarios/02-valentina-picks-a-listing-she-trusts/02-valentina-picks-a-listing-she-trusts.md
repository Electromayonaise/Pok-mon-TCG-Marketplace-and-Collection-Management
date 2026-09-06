---
design_intent: D
design_status: not-started
---

# 02: Valentina Picks a Listing She Trusts

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-04
**Method:** Whiteport Design Studio (WDS)
**Realizes:** `docs/plan-1-buyer-track/prd.md` UJ-2, FR-2, FR-4

---

## Transaction (Q1)

**What this scenario covers:**
Compare individual-seller and verified-business listings for the same card and choose the one she can actually buy in-platform, rather than falling back to an off-platform contact.

---

## Business Goal (Q2)

**Goal:** Goal 1 — Become the go-to Pokémon TCG platform in Colombia
**Objective:** Objective 1.3 — Become the recognized go-to place to purchase cards in Colombia. Also funnels into Goal 2, Objective 2.2 (transaction volume through verified-business in-platform purchases).

---

## User & Situation (Q3)

**Persona:** Valentina, 27, Bogotá (Priority 1 — Release-Driven Collector)
**Situation:** Same session as Scenario 01, now authenticated and comparing options for the card she just found trustworthy on its detail view.

---

## Driving Forces (Q4)

**Hope:** Find a listing she can buy immediately without leaving the app.

**Worry:** Ending up stuck emailing or messaging a stranger on WhatsApp with no purchase protection.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (browser)
**Entry:** Continues directly from the card detail view in the same session — taps into search results filtered by location/distance for that specific card.

---

## Best Outcome (Q7)

**User Success:**
Picks a verified-business listing, purchasable directly in-platform, instead of switching to WhatsApp to negotiate with an individual seller.

**Business Success:**
A browse session converts into in-platform purchase intent rather than an off-platform contact-message dead end — advances Objective 1.3 and feeds Objective 2.2's transaction volume.

---

## Shortest Path (Q8)

1. **Listing Search Results & Comparison** — Filters by location/distance, sees both individual-seller and verified-business listings for the same card, compares listed price against the inline reference price, and picks the verified-business listing because it's purchasable in-platform. ✓

---

## Trigger Map Connections

**Persona:** Valentina — Release-Driven Collector (Priority 1)

**Driving Forces Addressed:**
- ✅ **Want:** Trusting the displayed price, now applied to choosing between sellers with confidence.
- ❌ **Fear:** Being funneled into an unprotected, off-platform WhatsApp negotiation with no purchase path.

**Business Goal:** Goal 1, Objective 1.3; feeds Goal 2, Objective 2.2.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| 02.1 | `2.1-listing-search-results-comparison/` | Compare individual-seller vs. verified-business listings and pick one | Final — scenario success, proceeds into purchase (Scenario 03) ✓ |

**First step** (02.1) includes full entry context (Q3 + Q4 + Q5 + Q6). This scenario is a single-step comparison; the resulting purchase action is covered by Scenario 03.
