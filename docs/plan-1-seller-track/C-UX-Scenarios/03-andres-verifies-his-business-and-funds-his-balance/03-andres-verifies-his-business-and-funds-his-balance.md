---
design_intent: D
design_status: not-started
---

# 03: Andrés Verifies His Business and Funds His Balance

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-05
**Method:** Whiteport Design Studio (WDS)
**Realizes:** `docs/plan-1-seller-track/prd.md` FR-S5, FR-S6, FR-S9

---

## Transaction (Q1)

**What this scenario covers:**
Turn an informal Instagram storefront into a credible, purchasable-in-platform shop, without unpredictable costs.

---

## Business Goal (Q2)

**Goal:** Goal 2 — Generate recurring commission revenue (Andrés is the direct revenue source).
**Objective:** Also contributes to Goal 1 (go-to-platform) — verified-business inventory adds credible, trustworthy supply to the catalog.

---

## User & Situation (Q3)

**Persona:** Andrés (Priority 4 — Verified Business)
**Situation:** Owner of a small card shop, already selling informally via Instagram for two years, applying for TEZG's business verification to get a more credible in-platform presence.

---

## Driving Forces (Q4)

**Hope:** Get a credibility signal that separates him from an anonymous Instagram account.

**Worry:** Getting invoiced unpredictably, or a listing silently disappearing without warning if his balance runs low.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Responsive web, multi-surface — no single primary device; decided per-page in Phase 3 UX design (confirmed via AskUserQuestion — Andrés's journeys don't share the Buyer track's mobile-primary declaration, since his context is running a shop, not browsing on the go).
**Entry:** Discovers TEZG's business-verification path while already running his Instagram storefront, and decides to apply for a more credible in-platform presence.

---

## Best Outcome (Q7)

**User Success:**
His application is approved, his verified badge is visible, his balance is funded, and his listings are purchasable — no surprise invoicing.

**Business Success:**
A verified business activated with a funded commission balance, contributing recurring commission revenue (Goal 2).

---

## Shortest Path (Q8)

1. **Business Verification Application** — Submits legal identity plus an Instagram/website link as external presence proof.
2. **Application Status** — Sees his application move from Pending to Approved.
3. **Commission Balance Management** — Tops up his commission balance and creates his first listing, which becomes purchasable. ✓

---

## Trigger Map Connections

**Persona:** Andrés — Verified Business (Priority 4)

**Driving Forces Addressed:**
- ✅ **Want:** Be seen as a credible, verified shop distinct from an anonymous social-media seller; know commission cost predictably in advance (`_bmad-output/B-Trigger-Map/personas/04-verified-business.md`).
- ❌ **Fear:** Avoid listings silently going invisible/unpurchasable without a clear reason.

**Business Goal:** Goal 2 (commission revenue), contributing to Goal 1 (go-to-platform credibility).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| 03.1 | `3.1-business-verification-application/` | Submit legal identity + external presence proof | Submits application, status becomes Pending |
| 03.2 | `3.2-application-status/` | See the application move to Approved | Taps through to balance management once Approved |
| 03.3 | `3.3-commission-balance-management/` | Top up balance, create first listing (FR-S9) | Scenario success — listing becomes purchasable ✓ |

**First step** (03.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**On-step interactions** (e.g., re-checking status without a state change in 3.2) are documented as storyboard items within each page spec in Phase 4.

**Note:** page 1.2 (Create Listing, from Scenario 01) is narratively related to this scenario's listing-creation moment but is not re-documented here — FR-S9 reuses FR-S1's creation mechanism with different gating (business-eligibility instead of profile-completion), per the approved page-to-chain assignment (Step 3).
