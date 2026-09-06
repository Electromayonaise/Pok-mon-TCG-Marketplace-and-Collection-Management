---
design_intent: D
design_status: not-started
---

# 02: Valentina Manages a Trade Offer

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-05
**Method:** Whiteport Design Studio (WDS)
**Realizes:** `docs/plan-1-seller-track/prd.md` FR-S3, FR-S4

---

## Transaction (Q1)

**What this scenario covers:**
Respond to an incoming trade offer and get to a trade she can actually trust is done — not just claimed done by the other side.

---

## Business Goal (Q2)

**Goal:** Goal 3 — Prove the trading system works end-to-end, specifically mutual-confirmation trade completion.
**Objective:** A completed peer-to-peer trade cycle, validated by both parties, not a one-sided claim.

---

## User & Situation (Q3)

**Persona:** Valentina, 27, Bogotá (Priority 2 — Individual Seller)
**Situation:** A week after listing a card open-to-trade (Scenario 01), she checks her account and finds a buyer has made an offer.

---

## Driving Forces (Q4)

**Hope:** Get a real trade that finalizes cleanly, not another ghosted deal like the WhatsApp groups she's used before.

**Worry:** Accepting an offer that then goes nowhere, with no way to prove the other person actually followed through.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile
**Entry:** Notices a badge/count in her account menu and opens her Trade Offers area to see what came in.

---

## Best Outcome (Q7)

**User Success:**
The trade shows as fully completed once both sides confirm — she has proof it wasn't just a claim by the other party.

**Business Success:**
A completed peer-to-peer trade cycle validated end-to-end (Goal 3), with the listing's inventory correctly reserved and released — no stuck or ambiguous listing state.

---

## Shortest Path (Q8)

1. **Trade Offers Inbox** — Sees the incoming offer against her listing.
2. **Trade Offer Detail** — Reviews what's being offered and accepts it.
3. **Trade Completion Confirmation** — Confirms "trade completed" after the physical exchange happens. ✓

---

## Trigger Map Connections

**Persona:** Valentina — Individual Seller (Priority 2)

**Driving Forces Addressed:**
- ✅ **Want:** Signal trade-openness honored through to a real, finished trade (`_bmad-output/B-Trigger-Map/personas/02-individual-seller.md`).
- ❌ **Fear:** Avoid being ghosted or scammed by a buyer — a documented product-limitation gap this scenario's mutual-confirmation model directly addresses.

**Business Goal:** Goal 3 (trading system, non-negotiable core capability, proven via mutual confirmation).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| 02.1 | `2.1-trade-offers-inbox/` | See incoming trade offer(s) | Taps into a specific offer |
| 02.2 | `2.2-trade-offer-detail/` | Review and accept the offer | Taps "Accept" |
| 02.3 | `2.3-trade-completion-confirmation/` | Confirm the trade completed after physical exchange | Scenario success — trade shows fully completed ✓ |

**First step** (02.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**On-step interactions** (e.g., filtering multiple pending offers within 2.1) are documented as storyboard items within each page spec in Phase 4.
