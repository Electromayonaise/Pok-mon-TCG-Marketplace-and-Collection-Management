---
design_intent: D
design_status: not-started
---

# 01: Valentina Finds Her First Card

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-04
**Method:** Whiteport Design Studio (WDS)
**Realizes:** `docs/plan-1-buyer-track/prd.md` UJ-1, FR-1, FR-2, FR-3

---

## Transaction (Q1)

**What this scenario covers:**
Create an account and browse the catalog to a card detail view trustworthy enough that Valentina keeps exploring instead of tabbing out to double-check the price elsewhere.

---

## Business Goal (Q2)

**Goal:** Goal 1 — Become the go-to Pokémon TCG platform in Colombia (Primary Outcome)
**Objective:** Objective 1.2 — Zero need to leave the platform to sanity-check a price; every card detail view shows external reference prices inline alongside platform listings.

---

## User & Situation (Q3)

**Persona:** Valentina, 27, Bogotá (Priority 1 — Release-Driven Collector)
**Situation:** New to TEZG, tired of juggling eBay, PriceCharting, and Collectr to figure out what a card is actually worth. Arrives via a friend's referral, on her phone, between sets at a release event.

---

## Driving Forces (Q4)

**Hope:** Finally see a price she can trust without cross-checking three other apps.

**Worry:** This is just another marketplace with made-up or stale prices.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (browser)
**Entry:** Arrives on her phone from a friend's referral link while away from her desktop, at a release event.

---

## Best Outcome (Q7)

**User Success:**
Sees listing price, last-transaction reference price, and historical trend as three distinct, clearly labeled values on her first card detail view, and trusts the number enough to keep browsing instead of switching to PriceCharting.

**Business Success:**
A new signup reaches a trust-establishing card detail view within her first session — Objective 1.2 realized at first contact, before any purchase decision is even made.

---

## Shortest Path (Q8)

1. **Sign Up / Account Creation** — Creates her account; reaches the catalog immediately, no onboarding step blocking access.
2. **Catalog Browse & Filter** — Filters by set and Pokémon to find the card she's chasing.
3. **Card Detail View** — Sees listing price, reference price, and historical trend as three distinct, separately labeled values — never a single collapsed number. ✓

---

## Trigger Map Connections

**Persona:** Valentina — Release-Driven Collector (Priority 1)

**Driving Forces Addressed:**
- ✅ **Want:** Trusting the displayed price is the real Colombian market price, not stale or inflated (Design Focus Statement).
- ❌ **Fear:** Being another marketplace with unverifiable or inflated prices, no better than the fragmented eBay/PriceCharting/Collectr workflow she already has.

**Business Goal:** Goal 1, Objective 1.2 (price-trust visible inline, at the point of decision).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| 01.1 | `1.1-sign-up/` | Create an account with no onboarding blocker | Taps "Create account", lands on catalog |
| 01.2 | `1.2-catalog-browse-filter/` | Filter the catalog to find the chased card | Taps into a card's detail view from search results |
| 01.3 | `1.3-card-detail-view/` | See listing price, reference price, and trend as three distinct values | Scenario success — trusts the number, keeps browsing ✓ |

**First step** (01.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**On-step interactions** (e.g., typing a search filter without leaving the page) are documented as storyboard items within each page spec in Phase 4.
