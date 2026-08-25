# Product Brief: Pokémon TCG Marketplace and Collection Management Platform

> Complete Strategic Foundation — built through the Phase 1 dialog with Saga, on top of the existing Spec Task 1 materials (SPEC.md, JUSTIFICATION.md, problem statement, peer review) as the starting truth.

**Created:** 2026-08-24
**Author:** Martin
**Brief Type:** Complete

---

## Strategic Summary

The go-to Pokémon TCG platform in Colombia — replacing the fragmented eBay + PriceCharting + Collectr chain (and the months-long shipping waits, ~20% import fees, and manual reconciliation that come with it) with one place to search, verify prices, buy locally, organize collections into virtual binders, and track wishlists.

It's for all Colombian TCG participants — collectors/buyers, individual sellers (often the same person, occasionally selling), and verified businesses — with no initial segment narrowing. The primary archetype is a release-driven collector who browses weekly and logs purchases monthly, fighting two frustrations: cross-border shipping/import costs, and manual collection-tracking overhead. No formal local marketplace exists today — just informal WhatsApp/Telegram groups with no search — and the existing tool chain, while individually excellent, is US-centric and disconnected, forcing manual reconciliation for every purchase.

Positioning is deliberate: not a marketplace with tracking bolted on, but a **collection tracker with a marketplace attached**, sequenced so it's useful from day one on the tracking side while the seller community grows in over time. Structurally, this is "one canonical card, three lenses" (marketplace, collection/binder, market price) — catalog IA modeled on tcgwatchtower.com, binder IA modeled on pkmnbindr.com.

Success is tracked directionally for now (active users, registered businesses, transaction volume — no hard numbers yet), with the qualitative bar being zero need to leave the platform to sanity-check a price. Everything is targeted for completion by end of November 2026, except the transactional/payments piece, which is allowed to slip.

The team is self-funded, free-tier-first, building a responsive web app with equal device priority. What's fixed and non-negotiable: Colombia-only scope, the tracker, the binder, the trading system. What's flexible: the revenue mechanism (a prepaid commission balance, deliberately built without a payment gateway) and the sell/delivery-confirmation flow, which leans on identity-backed reputation instead of escrow.

The moat isn't first-mover advantage — any idea can be copied and becomes an execution/marketing race. It's structural: even if a competitor, or eBay itself, went Colombia-local, they'd still be a marketplace, not a unified tracker-and-marketplace with a genuinely different data model.

---

## Vision

The go-to Pokémon TCG platform in Colombia: one place where a Colombian collector can search the catalog, check market trends, buy directly from local sellers, organize their collection into virtual binders, and track wishlist cards — replacing the current fragmented workflow of eBay (buying) + PriceCharting (pricing) + Collectr (collection logging), plus the international shipping and import-tax costs that come with sourcing from abroad.

**Key Insights from Discussion:**
- Today's workaround is genuinely three separate tools stitched together by hand (eBay → PriceCharting → Collectr) for every single card purchase — a concrete, recurring pain, not a hypothetical one.
- There is no formal local marketplace today — the closest substitute is informal WhatsApp/Telegram seller communities, which is exactly the gap SPEC.md's individual-seller flow (external contact handoff) already accounts for.
- The core differentiator vs. existing (US-oriented) solutions is being Colombia-first: local sellers, avoiding cross-border shipping/import-tax friction, and unifying discovery + pricing + collection tracking + direct seller contact in one place.
- Long-term ambition is category leadership in Colombia specifically (not immediately multi-country or multi-TCG) — a deliberate scope anchor for later positioning/competitive-landscape discussion.

---

## Positioning Statement

For Colombian Pokémon TCG collectors, buyers, individual sellers, and businesses who are stuck stitching together eBay, PriceCharting, and Collectr — and eating international shipping and import-tax costs to do it — the platform is a collection tracker with a local marketplace attached that gives them one accurate, COP-priced view of their collection's value, market trends, and wishlist, growing into a way to buy and sell directly with other Colombian sellers as the community builds. Unlike the fragmented eBay/PriceCharting/Collectr chain or informal WhatsApp/Telegram groups, it's genuinely unified, local-first, and useful from day one on the collection side — even before the marketplace has full seller liquidity.

**Breakdown:**

- **Target Customer:** All Colombian Pokémon TCG participants — collectors, buyers, individual sellers, and businesses (no initial segment narrowing)
- **Need/Opportunity:** Reliable price tracking, fast local shipping, good filtering, and an active seller community — the combination needed to actually switch off the status quo
- **Category:** A collection tracker with a marketplace attached (not a marketplace with tracking bolted on)
- **Key Benefit:** One accurate, Colombia-local source of truth for collection value and market trends, with a growing path to local buying/selling
- **Differentiator:** Local-first (COP, Colombian sellers, no import friction), genuinely unified (replaces 3 tools), and deliberately collection-first in launch sequencing so it's useful before marketplace liquidity exists

**Key Insight:** Go-to-market is deliberately phased — collection-tracking value ships and stands alone first; the seller/marketplace community is built over time on top of it. This should inform Success Criteria phasing later in the brief.

---

## Business Model

**Model:** Both — two distinct segments (B2C individual collectors/sellers, B2B verified businesses) — but monetization is deliberately business-only at launch.

**Revenue streams:**
- **Verified businesses:** commission on in-platform sales (`PurchaseListing` is business-only per SPEC.md, so money already flows through the platform here), plus possibly a subscription tied to the verified badge / in-app messaging access — commission vs. subscription relationship not yet fully decided.
- **Individual sellers/collectors:** **not charged initially.** A listing fee was considered but rejected — their sales complete off-platform (SPEC.md constraint: individual-seller listings never process payment in-platform), and charging a fee for an outcome the platform can't see or guarantee didn't sit right.

**Future possibility (explicitly later-stage, not initial scope):** bringing individual-seller transactions in-platform, which would open the door to monetizing that segment directly.

**Rationale:**
Monetizing where money already flows through the platform (verified-business purchases) is straightforward and consistent with SPEC.md's existing Contract. Monetizing individual sellers now would require either fee collection for an off-platform outcome (uncomfortable) or building in-platform payment for individual sellers (out of scope — a Non-Goal / architectural decision for later).

**Implications:**
- Business model reinforces the "collection tracker first, marketplace grows in" positioning: the business/marketplace side needs to reach real usage before it generates revenue, so the collection-tracking value has to stand on its own in the meantime.
- Success Criteria should likely separate "platform usage/health" metrics (collection tracking adoption) from "business viability" metrics (verified business signups, commission revenue) since they're on different timelines.
- The individual-seller listing-fee question is a genuine open strategic question, not a decided Non-Goal — worth revisiting once the business-side monetization is validated.

---

## Business Customer Profile (B2B)

A mix of two shapes, with no single dominant type expected at launch:
- **Solo sellers-as-business:** individuals already selling informally via Instagram/social, applying for verification to gain formal distribution.
- **Small teams/shops:** physical or online-only shops, potentially with more than one person involved (e.g. one person running the storefront day-to-day, another approving spend) — but still informal/small, not a procurement structure.

**Value trade for applying/paying:** Distribution and discoverability — equivalent to what a seller gains from selling through eBay. Without the platform, a Colombian collector realistically never finds a given store through Instagram/social alone; verification puts listings directly in front of a public already there to buy Pokémon cards.

### Buying Roles

| Role | Description |
|------|-------------|
| **Buyer** | Owner (solo case) or whoever holds spend-approval authority (small-team case) — decides to apply and pay commission/subscription |
| **Champion** | Same as Buyer in the solo case; in a small team, could be whoever manages the storefront day-to-day and pushes for the visibility gain |
| **User** | Whoever manages listings/messaging day-to-day post-verification — may be the owner or a team member |

---

## Ideal Customer Profile (ICP)

**Primary user — the Colombian collector:** Follows new set releases closely and continuously picks up individual cards of interest. Today's routine: price-guide site (set awareness) → eBay (buy) → PriceCharting (verify price) → Collectr (log purchase, batched roughly monthly). Two core frustrations: (1) international shipping — months-long waits plus up to ~20% of card value in import fees on top of shipping; (2) manual reconciliation — remembering and re-entering newly acquired cards into a separate tracker.

**What they're trying to achieve:** Stay current with releases, acquire cards at a fair/verified price, and keep an accurate, low-effort record of their collection's contents and value over time.

**Open question, deliberately flagged rather than assumed:** Whether this specific pattern is universal to the average Colombian collector or reflects the primary respondent's own habits — treated as the working assumption for now, not yet validated against other collectors.

### Secondary Users

- **Casual individual seller** — the same person as the primary collector, occasionally selling cards they no longer want. Currently discouraged by how tedious eBay listing is. A direct buyer-seller match with **distance/location filtering** would help — enabling in-person pickup (avoiding shipping entirely) or simply preferring local sellers while still shipping. **New signal not yet in SPEC.md:** `BrowseCatalog(filters)` currently covers set/era/Pokémon/color/style/artist, not location/distance — worth carrying into the next spec/architecture pass.
- **Verified business** — see Business Customer Profile above (solo Instagram-sellers-as-business, or small teams/shops seeking distribution/discoverability).

---

## Product Concept

**Core structural idea: one canonical card, three lenses.** Every card lives once in the catalog (never a derived view of listings, per SPEC.md), and that same entry is viewed through three lenses that all point back to it rather than existing as separate records: **marketplace** (who's selling it locally, individual or verified-business), **collection/binder** (do I own it, where does it sit in my binder), and **market** (price/trend history). This directly prevents the exact fragmentation the Vision names — no more three separate partial records of "this card" across eBay, PriceCharting, and Collectr.

**Catalog IA** (modeled on tcgwatchtower.com's structure): browse by **Set** → ranked "Chase Cards" highlight + full grid → **Card Detail** view with market price/trend and local marketplace listings — replacing an external-retailer buy panel with in-platform Colombian sellers/businesses.

**Binder IA** (modeled on pkmnbindr.com's structure): named, multi-page **virtual binders** with configurable grid (rows/columns, combinable slots), collection-progress tracking, display toggles (show market price on cards, dim missing/collected), custom sorting, and cards addable either by selecting from the catalog or **via link** for cards not yet indexed (promos, errors, very new releases).

**Features stemming from this concept:**
1. Set-first catalog browsing with a "Chase Cards" (ranked by market price) highlight.
2. Card detail view unifying price/trend + local marketplace listings.
3. Configurable virtual binder (grid, multi-page, progress tracking, display toggles, custom sorting).
4. Add-to-binder-via-link fallback for not-yet-indexed cards — a new capability signal alongside the location/distance filtering signal from Target Users.

---

## Success Criteria

**Two tracks, on different timelines** (consistent with the "collection tracker first, marketplace grows in" positioning): platform-usage health (collection side) and business/revenue viability (marketplace side).

- **User behavior:** Number of active users and how much collection activity has genuinely moved off Collectr. No concrete numbers yet — deliberately tracked as directional metrics at this stage, not hard targets (too early for a pre-launch project to commit to a number honestly).
- **Business outcome:** Number of registered/verified businesses and transaction volume, also directional for now.
- **Experience quality:** Two bars — (1) becoming the go-to place to purchase cards in Colombia; (2) a collector never needing to leave the platform to sanity-check a price — the card detail view should show reference prices from external sources (e.g. PriceCharting, TCGplayer) inline, alongside the platform's own listings, so there's no reason to tab out.
- **Timeline:** Course deadline is end of November 2026. Goal is to have everything built by then — the one piece explicitly allowed to slip past that date is the transactional/payments part of the platform, since it's the most complex to get right (see Payments & Trust Model below).

---

## Platform Mechanics — Payments, Trust & Trading (captured here, to be formalized in Constraints / Platform Strategy)

These emerged directly out of Success Criteria's timeline discussion (Martin flagged the transactional piece as highest-risk for the November deadline) and are significant enough to record now rather than lose. Full rationale and alternatives considered are in `dialog/decisions.md` (Decisions 8–10).

**No payment gateway.** A gateway (e.g. Wompi) would cost twice — a transaction fee plus a disbursement fee — on funds that were never the platform's to begin with, since the platform is a pass-through to businesses, not the final destination. Instead: payment is peer-to-peer (buyer pays the business directly via a QR code or bank account the business registers at verification), confirmed via an uploaded comprobante and a mutual "I've paid" / "payment received" confirmation.

**Commission is prepaid, not invoiced.** Verified businesses maintain a commission balance, topped up before their listings are purchasable; each confirmed sale deducts commission automatically. A zero balance pauses (not disables) their listings until topped up. This removes collections risk entirely rather than managing it after the fact.

**Delivery assurance without escrow.** Since the platform never holds transaction funds, it can't hold-and-release like a gateway would. Instead: a three-state confirmation (buyer paid → business received payment → **buyer received item**) keeps "paid" and "fulfilled" distinct and visible, and identity-backed reputation (verified businesses already went through legal-identity verification; reviews are already purchase-gated per SPEC.md) is the real enforcement lever against non-delivery. A forfeitable buyer-protection deposit was discussed as a possible v2 hardening, not adopted for v1.

**Trading, for individual sellers.** A listing explicitly marked "open to trade" can receive trade offers combining cards, other product, and/or money in any mix; the seller can accept, reject, or counter-offer. Negotiation happens on-platform; the actual exchange happens off-platform, matching the existing individual-seller external-handoff model.

**New capability signals for the next `bmad-spec`/`bmad-architecture` pass** (none of these exist in the current SPEC.md): the payment/commission/confirmation mechanics above, plus location/distance filtering and add-to-binder-via-link (both flagged earlier in this brief).

---

## Competitive Landscape

**eBay + PriceCharting + Collectr (the current chain):** Individually trustworthy — the platform's own price data will be sourced from the same places (an aggregator, not a competing data source), so price-data trust isn't the hard part. Platform-level trust (as a place to actually transact) has to be earned over time through safeguards, not assumed from day one.

**WhatsApp/Telegram seller groups:** Free and socially trust-based, but structurally limited — no search, effectively only recent messages are visible. The platform matches the "free to list" property for individual sellers while adding real discoverability/search, which the groups can't offer.

**Do-nothing:** A real, ongoing cost, not a nagging annoyance — months-long waits on international shipments (especially Japanese imports), eBay markup stacked with shipping and up to ~20% import fees. Local Colombian shipping resolves most of this directly.

### Our Unfair Advantage

1. **Market focus** — Colombia-specific; existing players (eBay, PriceCharting) are US-centric and don't structurally compete for the same market.
2. **Unified data model** — no existing player offers catalog + marketplace + collection tracking + pricing together in one place.
3. **Structural differentiation, not just first-mover advantage** — acknowledged openly that any idea can be copied and becomes an execution/marketing race. The real moat is being a "collection tracker with a marketplace attached," a structurally different product from a marketplace-only competitor (even a hypothetical Colombia-focused eBay) — not merely having thought of it first.

---

## Constraints

**Fixed / non-negotiable design parameters:**
- Colombia-only scope
- The collection tracker
- The virtual binder
- The trading system

**Flexible design parameters:**
- The revenue mechanism (commission/prepaid-balance details)
- The sell mechanism (payment/delivery-confirmation flow)
- Timeline for the transactional/payments piece specifically (can slip past November if needed)

**Budget:** Self-funded (2-person founding team, no outside investment) — services and technology choices are constrained to free-tier options initially.

**Technical:** Responsive web, not mobile-first. Tech stack itself remains deliberately undecided at this stage (Non-Goal per SPEC.md) — this brief doesn't change that.

**Brand:** No product name yet — genuinely open, not yet a blocker for this brief.

---

## Platform & Device Strategy

**Primary Platform:** Responsive web application.

**Supported Devices:** Desktop, tablet, and mobile — all via the same responsive web app.

**Device Priority:** Equal priority. No device is designed-for-first; desktop and mobile sit at the same level.

**Interaction Models:** Standard web interaction (mouse/keyboard on desktop, touch on mobile/tablet) — nothing beyond what responsive web natively provides.

**Technical Requirements:**
- **Offline Functionality:** Not required — always-online is a safe assumption.
- **Native Features:** None required for now — no camera access, no push notifications, no native-feature dependency.

**Platform Rationale:**
Consistent with the self-funded, free-tier-first budget constraint (Step 10) — a single responsive web codebase avoids the cost and complexity of separate native builds while still serving desktop and mobile collectors equally.

**Future Platform Plans:** A native mobile app is a realistic possibility later, explicitly out of scope for the current build.

---

## Tone of Voice

**For UI Microcopy & System Messages**

### Tone Attributes

1. **Trustworthy & transparent**: Every payment/trade state (comprobante uploaded, payment confirmed, balance paused) is stated plainly and honestly — the highest-stakes tone job given the peer-to-peer payment model (Decision 8-9).
2. **Precise & credible**: Prices, trends, and collection values read like they come from someone who knows the hobby, not marketing fluff — matches the "aggregator you can trust" positioning (Decision 11).
3. **Warm, peer-to-peer**: Voice of a knowledgeable friend in the hobby, not a corporate platform — reflects the founders being collectors themselves.
4. **Locally grounded**: Colombian-first, plainspoken — not a translated-from-English international product.

### Examples

**Payment/System Messages:**
- ✅ "Payment confirmed — the seller's been notified."
- ❌ "Transaction status: SUCCESS"

**Low Balance / Pause State:**
- ✅ "Your listings are paused until you top up your balance."
- ❌ "Account suspended due to insufficient funds."

**Empty States:**
- ✅ "This binder's empty — add your first card."
- ❌ "No items found."

**Trade Offer Notification:**
- ✅ "You've got a trade offer on [card] — take a look."
- ❌ "New trade proposal pending review."

**Price Display:**
- ✅ "COP 45,000 · trending up over the last 30 days"
- ❌ "Price: $45000. Trend: +positive"

### Guidelines

**Do:**
- State payment/trade/balance states plainly and specifically — never vague ("something went wrong")
- Write prices and trends the way a knowledgeable collector would say them out loud
- Keep language plainspoken and Colombian-first, not a stiff translation

**Don't:**
- Use generic corporate system-status language ("Operation completed", "Error: Invalid input")
- Talk down to users — they're fellow collectors, not customers being onboarded

---

*Note: Tone of Voice applies to UI microcopy. Strategic content (headlines, feature descriptions, value propositions) uses the Content Creation Workshop based on page-specific purpose and context.*

---

**Status:** Product Brief Complete
**Next Phase:** Trigger Mapping (Phase 2) is explicitly skipped for this project (per course exercise scope) — next is distilling this brief into `SPEC.md` via the `bmad-spec` skill, then `ARCHITECTURE-SPINE.md` via `bmad-architecture`.
**Last Updated:** 2026-08-24
