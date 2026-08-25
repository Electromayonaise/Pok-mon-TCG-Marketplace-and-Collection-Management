# Step 7: User Definition

**Completed:** 2026-08-24
**Session:** 1

---

## Opening Question

**Agent asked:**
Since Trigger Mapping/personas (Phase 2) was skipped, Saga asked for behavioral depth on the primary user: weekly routine, most frustrating moment in the current eBay/PriceCharting/Collectr workflow, underlying goal/motivation, and whether individual sellers are a distinct type of person from collectors.

**User's initial response:**
Walked through the actual weekly/monthly routine in concrete detail (see below), rather than a demographic description.

---

## User Exploration

### Primary User Discovery

**Key exchanges:**

**Agent:** Walk me through a typical week around this hobby.
**User:** Checks set lists via price-guide sites (e.g. JustInBasil) on new set releases and buys most/all of each release; also continuously finds individual cards of interest outside releases. For any card: search eBay, check PriceCharting for the trend, buy if it checks out, or leave it sitting in an eBay cart if undecided. Browsing is weekly regardless of buying; Collectr logging happens roughly monthly, in a batch.

**Agent:** What's the most frustrating moment?
**User:** Two distinct frustrations: (1) international shipping — months-long waits, plus up to ~20% of card value in import fees on top of shipping cost; (2) manual reconciliation — after buying, having to remember which new cards arrived and manually search + re-enter each into Collectr.

**Agent:** Are individual sellers a different type of person from collectors?
**User:** No — same person, occasionally selling. Someone selling seriously enough would open a business account instead (maps directly to SPEC.md's individual-vs-business split).

**Follow-up — casual seller behavior (user-initiated addition):**
**User:** Listing on eBay as a casual seller is also tedious enough to discourage selling. A platform that matches individual buyers/sellers directly — with **distance/location filters** — would help: find a seller in the same city for in-person pickup (no shipping at all), or simply prefer local sellers even when still shipping.

---

## Reflection Checkpoint

**Agent's synthesis:**
Primary user is a Colombian collector (Martin's own habits used as the day-one archetype) who follows new releases closely, buys individual cards they like, checks price via eBay+PriceCharting, and logs purchases into Collectr in monthly batches. Two frustrations: shipping/import-fee cost of buying abroad, and manual collection-logging friction. Individual sellers are the same person wearing a "casual seller" hat, distinct from the business-account path for serious sellers. Casual selling is currently discouraged by how tedious eBay listing is; location/distance filtering (for pickup or simply preferring local sellers) would meaningfully lower that friction.

**User response:**
- [x] Confirmed
- [ ] Corrected

**Corrections (if any):**
None — the casual-seller/location-filter angle was a user-initiated addition, not a correction of a misunderstanding.

---

## Primary User Definition

**Who they are:**
A Colombian Pokémon TCG collector who actively follows new set releases and individual card acquisitions — Martin's own usage pattern is treated as the representative day-one archetype (see open question below on how universal this is).

**Their context:**
Checks price-guide sites on new releases, browses for cards of interest weekly, and reconciles purchases into a collection tracker (Collectr today) roughly monthly.

**Their frustrations:**
1. International shipping — multi-month waits plus up to ~20% of card value in import fees stacked on shipping cost.
2. Manual reconciliation — remembering and re-entering newly acquired cards into a separate collection tracker after every purchase.
3. (Secondary, as casual seller) Listing tediousness on eBay discourages selling cards they no longer want.

**What they're trying to achieve:**
Stay current with new releases, acquire cards they like at a fair/verified price, and maintain an accurate, low-effort record of their collection and its value over time.

**How they currently solve this:**
Three-tool chain: price-guide site (set awareness) → eBay (buy) → PriceCharting (price-check) → Collectr (log), plus informal WhatsApp/Telegram groups for anything local-seller-adjacent.

---

## Secondary Users (if applicable)

**User 2 (Casual individual seller):** The same person as the primary collector, occasionally selling cards they no longer want. Currently discouraged by eBay's listing friction. Would benefit from direct buyer-seller matching with distance/location filters — enabling in-person pickup (no shipping) or simply a preference for local sellers even when shipping.

**User 3 (Verified business):** Covered in Step 6 (Business Customers) — solo Instagram-sellers-as-business or small teams/shops seeking distribution/discoverability.

---

## User Scenarios Captured

**Scenario 1:** New set releases → user checks the set list on a price-guide site, likes several cards, searches each on eBay, checks PriceCharting for trend, buys the ones that check out — repeated per card, no unified flow.

**Scenario 2:** User wants to sell a card they no longer want. Currently: lists on eBay (tedious) or doesn't bother. With location/distance filtering, could instead find a nearby Colombian buyer for pickup (no shipping) or simply match with a local buyer while still shipping.

---

## Open Question (flagged, not resolved)

Whether the specific motivational pattern (new-release-driven + individual liked-card pickups, tracked over time) is universal to "the average Colombian collector" or specific to Martin — not resolved in this session; treated as the working assumption for the primary persona until validated.

---

**Documented in:** `wds-project-outline.yaml` → `users`
