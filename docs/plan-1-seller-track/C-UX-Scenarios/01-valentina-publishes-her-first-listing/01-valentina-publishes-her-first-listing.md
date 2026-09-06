---
design_intent: D
design_status: not-started
---

# 01: Valentina Publishes Her First Listing

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-05
**Method:** Whiteport Design Studio (WDS)
**Realizes:** `docs/plan-1-seller-track/prd.md` FR-S1, FR-S2

---

## Transaction (Q1)

**What this scenario covers:**
Turn a card Valentina no longer wants into a live listing buyers can find — including marking it open to trade — without needing business paperwork.

---

## Business Goal (Q2)

**Goal:** Goal 3 — Prove the trading system works end-to-end (non-negotiable core capability)
**Objective:** Also contributes seller-side liquidity to Goal 1 (become the go-to platform) — a catalog with real, current listings from both individual sellers and businesses.

---

## User & Situation (Q3)

**Persona:** Valentina, 27, Bogotá (Priority 2 — Individual Seller; same protagonist as the Buyer/Collector track, in her seller role)
**Situation:** Already an active TEZG buyer/collector. She has three cards she's stopped chasing and, instead of another loose WhatsApp/Discord trade, lists them one evening from her own account.

---

## Driving Forces (Q4)

**Hope:** Get this listed and visible to real buyers/traders tonight, without becoming "a business."

**Worry:** Getting stuck behind a paperwork-like gate, or having the listing sit invisible or pending like a business application.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile
**Entry:** From within her TEZG account, already logged in, she taps "Sell a card" one evening at home — low-stakes, no urgency.

---

## Best Outcome (Q7)

**User Success:**
Her listing is live and visible in catalog search within the same session, correctly flagged open-to-trade.

**Business Success:**
A new seller-side listing added within a single session with zero admin-review latency (Goal 3's trading system proven live), contributing directly to catalog liquidity (Goal 1).

---

## Shortest Path (Q8)

1. **Individual-Seller Profile Step** — Completes her one-time individual-seller profile (no business paperwork required).
2. **Create Listing** — Selects the catalog entry/bundle, sets price and condition, toggles open-to-trade.
3. **Listing Live Confirmation** — Sees her listing published and visible in catalog search. ✓

---

## Trigger Map Connections

**Persona:** Valentina — Individual Seller (Priority 2)

**Driving Forces Addressed:**
- ✅ **Want:** Signal trade-openness distinctly from a straight sale, and be found by a nearby buyer for in-person pickup avoiding shipping (`_bmad-output/B-Trigger-Map/personas/02-individual-seller.md`).
- ❌ **Fear:** Avoid the structurelessness of WhatsApp/Telegram groups — a listing that just works, with no business-application gate in the way.

**Business Goal:** Goal 3 (trading system, non-negotiable core), contributing to Goal 1 (go-to-platform liquidity).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| 01.1 | `1.1-individual-seller-profile-step/` | Complete the one-time individual-seller profile | Submits profile, proceeds to listing creation |
| 01.2 | `1.2-create-listing/` | Set price/condition, toggle open-to-trade | Taps "Publish listing" |
| 01.3 | `1.3-listing-live-confirmation/` | Confirm the listing is live and visible | Scenario success — sees it published ✓ |

**First step** (01.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**On-step interactions** (e.g., searching the catalog for the exact card within 1.2) are documented as storyboard items within each page spec in Phase 4.
