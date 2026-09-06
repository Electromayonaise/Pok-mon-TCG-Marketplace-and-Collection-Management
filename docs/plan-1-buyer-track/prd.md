---
title: TEZG — Buyer/Collector Track
created: 2026-09-04
updated: 2026-09-04
status: final
---

# PRD: TEZG — Buyer/Collector Track
*Track-scoped PRD for the "Plan-1: AI-Assisted Product Planning" course exercise, executed against TEZG (Pokémon TCG Marketplace and Collection Management Platform) in place of the course's default Smart Solar Flow case study. Analogous to the course's "Guest" track.*

## 0. Document Purpose

This PRD is for whoever picks up the Buyer/Collector journey next — UX design (`bmad-ux`/Freya) and architecture (`bmad-architecture`) workflows in this same exercise, and the instructor grading it. It covers only the **Buyer/Collector track**: the journey of a collector who browses the catalog, buys from a verified business, and tracks her orders — including the "My Sales" summary she sees because TEZG's data model lets one user be a buyer and an occasional individual seller at the same time. The **Seller/Business track** (a verified-business protagonist, commission-balance management, listing creation) is a separate, deliberately out-of-scope track — see §5 Non-Goals.

This PRD builds on, and does not restate, TEZG's existing whole-system artifacts:
- `_bmad-output/specs/spec-pokemon-tcg-marketplace/SPEC.md` — canonical capability contract (CAP-1..28), cited by CAP number throughout.
- `_bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md` — 13 architecture decisions (AD-1..13), treated here as **[ADOPTED]** invariants, not re-derived.
- `_bmad-output/A-Product-Brief/project-brief.md` and `_bmad-output/B-Trigger-Map/trigger-map.md` — vision, personas, business goals.
- `_bmad-output/project-context.md` — implementation-facing rules derived from the ADs.

Features are grouped; Functional Requirements are nested under each and numbered globally (FR-1..FR-N) so downstream work can reference them by stable ID. `[ASSUMPTION]` tags mark inferences made without a live confirmation; all are indexed in §10.

## 1. Vision

Valentina opens TEZG on her phone between sets at a release event, spots a card she's been chasing, checks that the listed price actually matches what the card is really trading for in Colombia right now, buys it from a verified local business without ever leaving the app or emailing a stranger on WhatsApp, pays by bank transfer, snaps a photo of the transfer confirmation, and watches the order move from "paid" to "received" without wondering whether her money just vanished into a stranger's account with no recourse.

That's the whole value proposition of the Buyer/Collector track: replace the fragmented eBay + PriceCharting + informal-WhatsApp-seller flow with one COP-native, price-trustworthy, peer-to-peer-settled purchase path — for the person TEZG's own trigger map names as its primary archetype, the Release-Driven Collector, who is often the same person as an occasional Individual Seller on a different day.

**Design-target decision:** for this track's four scenarios specifically, mobile is declared the *primary* design surface within TEZG's equal-priority responsive framework (all four UJs below open on "mobile browser") — a design-emphasis choice, not a SPEC violation (SPEC.md still requires the platform work on all devices; see decision log).

## 2. Target User

### 2.1 Jobs To Be Done

- Know, at the moment of deciding to buy, that a listed price is the real Colombian market price — not stale, not inflated (trigger-map.md's Design Focus Statement: the single highest-scoring driving force for this persona).
- Buy a card from a verified business without a payment gateway, an escrow account, or leaving the platform to coordinate a bank transfer by hand.
- Know exactly where an order stands (paid? received by the seller? did my card arrive?) without messaging the seller to ask.
- See her own occasional card sales without the app treating her as either "just a buyer" or "just a seller" — she's both, and TEZG's data model already supports that natively.

### 2.2 Non-Users (v1)

- Buyers transacting exclusively with individual sellers (CAP-6's contact-generation flow, not an in-platform purchase) — no Order is created in that path, so it doesn't exercise this track's purchase/payment/order FRs. Browsing individual-seller listings is still in scope (F1); purchasing one in-platform is rejected by the system — FR-4's Out of Scope is the source of truth for this constraint.
- Verified-business sellers managing their own listings, commission balance, or admin approval — that's the Seller/Business track (§5).

### 2.3 Key User Journeys

- **UJ-1. Valentina finds her first card on TEZG.**
  - **Persona + context:** Valentina, 27, Bogotá — a release-driven collector, new to TEZG, tired of juggling eBay/PriceCharting/Collectr.
  - **Entry state:** Unauthenticated, mobile browser, arriving from a friend's referral.
  - **Path:** Creates an account → lands on the catalog → filters by set and Pokémon → opens a card's detail view.
  - **Climax:** The card detail view shows listing price, last-transaction reference price, and historical trend as three distinct, clearly labeled values (CAP-3) — she immediately sees this isn't a guess.
  - **Resolution:** She trusts the number enough to keep browsing instead of tabbing out to PriceCharting to double-check.
  - **Edge case:** A card she searches for has zero active listings — it still appears in the catalog with `hasActiveListings=false` (CAP-2), not a dead end or an error.

- **UJ-2. Valentina picks a listing she trusts.**
  - **Persona + context:** Same session, now comparing options.
  - **Entry state:** Authenticated, viewing catalog search results for one card.
  - **Path:** Filters results by location/distance → sees both individual-seller and verified-business listings for the same card → compares listed price against the reference price shown inline → picks a verified-business listing because it's purchasable in-platform.
  - **Climax:** The listing clearly signals it's a verified-business listing, purchasable directly, versus an individual-seller listing that would only generate a contact message (CAP-6, CAP-17).
  - **Resolution:** She proceeds to purchase rather than switching to WhatsApp.
  - **Edge case:** If she instead tries to purchase an individual-seller listing in-platform, the system rejects it with `NotBusinessListing` (FR-4, CAP-17) rather than silently failing or charging her.

- **UJ-3. Valentina pays without a payment gateway.**
  - **Persona + context:** Same session, decision made.
  - **Entry state:** Authenticated, on a verified-business listing's purchase confirmation screen.
  - **Path:** Confirms purchase → receives an OrderId and the business's payment details (QR/bank account) → pays via her own banking app, outside TEZG → returns to TEZG → uploads a photo of the transfer confirmation (comprobante) → confirms "I paid."
  - **Climax:** The order visibly shows a buyer-paid state the moment her comprobante is uploaded and confirmed (CAP-20) — she has proof she did her part, without TEZG ever touching her money.
  - **Resolution:** She waits for the business to separately confirm receipt; the order does not claim "complete" yet.
  - **Edge case:** If she tries to confirm payment without uploading a comprobante, the confirmation is rejected — there is no "paid" state without a stored comprobante reference (CAP-20).

- **UJ-4. Valentina checks her orders — and her own sales.**
  - **Persona + context:** A few days later, checking in.
  - **Entry state:** Authenticated, opens her account's Orders view.
  - **Path:** Sees each order's three independent states — paid / received-by-seller / received-by-buyer (CAP-22) — for her recent purchase → confirms "item received" once her card physically arrives → gets an add-to-collection prompt (CAP-27) → separately, taps a "My Sales" tab and sees a summary of the individual-seller listings she has open on the side.
  - **Climax:** The order only shows as fully closed once *she* confirms receipt — not when the seller says "sent" — so she never has to take a stranger's word for it.
  - **Resolution:** She accepts the add-to-collection prompt; her new card appears in her binder tagged `PlatformPurchase` (CAP-12). Separately, her My Sales tab reflects that she is, right now, also selling three cards to other collectors — the same dual-role reality project-context.md's auth rules already assume.
  - **Edge case:** If she declines the add-to-collection prompt, the order still shows closed — declining never blocks order closure (CAP-27).

## 3. Glossary

- **Catalog entry** — A card or product's canonical record, independent of whether any listing currently exists for it (CAP-2).
- **Listing** — A seller's (individual or verified-business) offer of a catalog entry, bundle, or sealed product at a price. Carries `sellerType` (individual | business).
- **Verified business** — A seller whose business application has reached `Approved` status (CAP-5, CAP-15). Only verified-business listings are purchasable in-platform (CAP-17).
- **Individual seller** — A seller with no business-verification requirement (CAP-4); their listings are reachable only via a generated external-contact message (CAP-6) — see FR-4 Out of Scope for the authoritative statement of why they can't be purchased in-platform.
- **Dual-role user** — A single account that is simultaneously a buyer and an individual seller; TEZG derives role from independent flags (`isIndividualSellerProfileComplete`, `businessId`, `isAdmin`) rather than one mutually-exclusive field (`project-context.md`). This is a distinct axis from **seller-type exclusivity**: the seller role itself is exclusively individual-seller *or* verified-business, never both at once (SPEC.md "Safe" assumption; see `docs/plan-1-seller-track/prd.md` §2.3 for the full disambiguation). A dual-role user's individual-seller side is never simultaneously a verified business — the two rules constrain different pairs of roles and do not conflict.
- **Reference price** — The last-transaction USD/COP price point sourced from an external price feed, shown distinct from listing price (CAP-3).
- **Historical trend** — A period/changePercent/referencePriceAtStart delta, not a full price series (CAP-3).
- **Order** — The record of an in-platform purchase against a verified-business listing. Tracks three independently-timestamped confirmations (CAP-22): `buyerPaidConfirmedAt`, `sellerReceivedConfirmedAt`, `buyerItemReceivedConfirmedAt`.
- **Comprobante** — The uploaded photo proof of a peer-to-peer bank transfer/QR payment, stored as a file reference on the Order aggregate (CAP-20; never inline payment data).
- **Tri-state confirmation** — The paid / received-by-seller / received-by-buyer sequence gating an Order's closure (CAP-22); only the last state closes the order.
- **My Sales tab** — This PRD's name for the summary view a dual-role user sees of her own open individual-seller listings and a count of pending trade offers (sourced from `docs/plan-1-seller-track/prd.md` FR-S3/FR-S4). Scoped to a summary only in this track — see §5 Non-Goals.
- **Binder** — A user's customizable virtual-collection view (CAP-10).
- **Pickup available** — A derived (never stored) boolean, true only for individual-seller listings, signaling in-person pickup possibility (`project-context.md`, AD-5).

## 4. Features

### 4.1 Catalog Discovery & Price Trust
**Description:** Lets Valentina find a card and trust what she's looking at before she decides to buy. Realizes UJ-1, UJ-2. This feature is read-only against the catalog/listings modules; it creates no state.

#### FR-1: Account creation and catalog entry
A first-time visitor can create an account and immediately reach the catalog. Realizes UJ-1.

**Consequences (testable):**
- A newly created account can browse the catalog with no additional onboarding step blocking access.
- The catalog view is reachable without first creating any collection, listing, or order.

#### FR-2: Browse and filter the catalog
A user can browse and filter the catalog by set, era, Pokémon, color, style, artist, and listing location/distance, across both individual-seller and verified-business listings. Realizes UJ-1, UJ-2. (CAP-1)

**Consequences (testable):**
- A filtered query, including a location/distance filter, returns only matching catalog entries/listings from either seller type.
- A catalog entry with zero active listings is still returned (not excluded), whether or not a location filter is applied, and displays `hasActiveListings=false` — a location/distance filter narrows *which listings* appear, it never excludes a catalog entry that simply has none nearby (SPEC.md Success Signal).
- Individual-seller listing results are marked as supporting in-person pickup; business listing results are not (`pickupAvailable`, derived on read, never cached — AD-5).

#### FR-3: Price-trust card detail view
A user viewing a card detail sees listing price, last-transaction reference price, and historical trend as three distinct, separately labeled values. Realizes UJ-1, UJ-2. (CAP-3)

**Consequences (testable):**
- The three values never collapse into a single unlabeled number.
- Historical trend renders as a period/changePercent/referencePriceAtStart delta, not a full time series.

**Feature-specific NFRs:**
- Catalog browse/filter queries target roughly 1-2s response, for a catalog on the order of a few thousand to tens of thousands of entries (SPEC.md Constraints — course-project scale, not a load-tested SLA).

### 4.2 Purchase & Peer-to-Peer Settlement
**Description:** Takes Valentina from "I want this" to a confirmed, in-platform purchase against a verified business — settled peer-to-peer, with a photo as the only proof of payment. Realizes UJ-2, UJ-3.

#### FR-4: Purchase a verified-business listing
A buyer can purchase a verified-business listing directly through the platform. Realizes UJ-2. (CAP-17)

**Consequences (testable):**
- Purchasing a verified-business listing returns an `OrderId` and decrements listing quantity.
- The same purchase action against an individual-seller listing is rejected with `NotBusinessListing`, never silently succeeding.

**Out of Scope:**
- Purchasing an individual-seller listing in-platform at all — that path only ever produces a contact message (CAP-6), never an Order.

#### FR-5: Upload comprobante and confirm payment
A buyer can upload a photo proof of a peer-to-peer payment and confirm "I paid" against an Order. Realizes UJ-3. (CAP-20)

**Consequences (testable):**
- An Order shows a buyer-"paid" state only after a comprobante is uploaded *and* the buyer confirms payment — neither alone is sufficient.
- Confirming "paid" without an uploaded comprobante is rejected.
- The comprobante is stored as a file reference on the Order aggregate, never inline payment data (`project-context.md`).

**Feature-specific NFRs:**
- Comprobante upload completes within the same purchase session, in under 10 seconds on a typical mobile connection, for an image up to 5 MB (no resolution cap). *(Both numbers set by user during Discovery — SPEC.md has no upload-time or file-size figure; see decision log.)*

### 4.3 Order Tracking & Post-Purchase
**Description:** Lets Valentina see exactly where her order stands, add a completed purchase to her collection on her own terms, and — because she's also an occasional seller — see a lightweight view of her own selling activity in the same place. Realizes UJ-4.

#### FR-6: Tri-state order status
A buyer can view an Order's three independently-timestamped confirmation states: paid, received-by-seller, received-by-buyer. Realizes UJ-4. (CAP-22)

**Consequences (testable):**
- Each of the three states is individually queryable at every point, never collapsed into one "complete" flag.
- Reaching received-by-buyer is the only state that closes the Order — a seller-side confirmation alone never closes it.

#### FR-7: Buyer confirms item received
A buyer can confirm she received a purchased item, closing the Order. Realizes UJ-4. (CAP-22)

**Consequences (testable):**
- Confirming item-received sets `buyerItemReceivedConfirmedAt` and the Order's status becomes closed.
- No party other than the buyer can set this confirmation.

#### FR-8: Add-to-collection prompt after order closure
After an Order reaches item-received-by-buyer, the buyer is shown a dismissible prompt to add the purchased item to a collection — never created automatically. Realizes UJ-4. (CAP-27)

**Consequences (testable):**
- Accepting the prompt creates a collection entry tagged `source=PlatformPurchase`.
- Declining or ignoring the prompt creates no entry, and the Order's closed status is unaffected either way.

#### FR-9: My Sales summary tab
A dual-role user (buyer who is also an individual seller) can view a summary tab showing her own open individual-seller listings and a count of pending trade offers against them. Realizes UJ-4.

**Consequences (testable):**
- The tab is visible to any authenticated user; its content is empty-state ("You're not selling anything yet") for a user with no individual-seller listings, rather than the tab being hidden.
- The tab shows counts only (open listings, pending trade offers) — no listing-creation, editing, trade-offer response, or commission/balance information.
- The precondition for this tab to show anything beyond its empty state — completing the individual-seller profile step — is defined by `docs/plan-1-seller-track/prd.md` FR-S1 (CAP-19), not by this document; this tab only reads that state, it does not gate or implement it.
- The "pending trade offers" count is sourced from trade-offer data owned by `docs/plan-1-seller-track/prd.md` FR-S3/FR-S4 (CAP-25, CAP-26) — this tab summarizes that data, it does not create, store, or respond to trade offers itself. There is no equivalent "pending contact requests" count: CAP-6's contact-message generation is a one-time, stateless action with no persisted, seller-visible object to summarize.

**Out of Scope:**
- Creating, editing, or pausing an individual-seller listing, or accepting/rejecting/countering a trade offer, from this tab — that functionality is FR-S1 through FR-S4 in `docs/plan-1-seller-track/prd.md`, a separate track surface, not this tab.
- Anything relating to verified-business selling (commission balance, business analytics) — out of scope for this dual-role buyer/individual-seller tab entirely; a verified-business account is a mutually exclusive seller state from an individual seller (see Glossary, "Dual-role user").

**Notes:** This tab is deliberately a thin summary; full seller-side functionality now lives in `docs/plan-1-seller-track/prd.md` (FR-S1..FR-S9), not as a future placeholder but as an already-specified sibling track. *(Scope explicitly confirmed by the user during Discovery — see decision log.)*

## 5. Non-Goals (Explicit)

- **The Seller/Business track as a whole** — a verified-business protagonist, commission-balance management (CAP-21), business-application review (CAP-15), and full individual-seller listing creation/management. Now specified separately in `docs/plan-1-seller-track/prd.md` (FR-S1..FR-S9), per instructor confirmation that a second track is valid for this single-app product (see decision log); see FR-9's Notes for how the two tracks connect.
- **Full Collection/Binder curation** (CAP-8–11) — this track's only touchpoint with Collection/Binder is FR-8's add-to-collection prompt and the resulting entry becoming visible in the buyer's existing binder (UJ-4); creating additional named collections, customizing binder layout, or viewing collection value trends (CAP-9, CAP-11) are real TEZG capabilities not exercised by this track's four scenarios.
- **Trading (CAP-25, CAP-26)** — card-for-card trade offers are a distinct flow from purchase/payment and are not part of this track's 4 scenarios.
- **In-app messaging with verified businesses (CAP-18)** and **reviews/reputation (CAP-7)** — real TEZG capabilities, but not exercised by UJ-1..UJ-4.
- **Payment-gateway integration of any kind** — explicitly rejected platform-wide (SPEC.md Non-Goals), not merely unspecified for this track.
- **Admin moderation (CAP-28), business application approval (CAP-15)** — internal/admin-actor flows, out of scope for a buyer-facing PRD.
- **Wishlist / acquisition planning (CAP-13, CAP-14)** — a real TEZG capability, orthogonal to the four scenarios chosen for this track; not covered here.
- **Native app, offline mode, or camera/push-notification device dependencies** — ruled out platform-wide (SPEC.md Constraints); the comprobante upload in FR-5 uses a standard web file/camera input, not a native capability.

## 6. MVP Scope

### 6.1 In Scope
- Account creation and catalog browsing (FR-1, FR-2, FR-3).
- Purchasing a verified-business listing (FR-4).
- Comprobante upload and buyer payment confirmation (FR-5).
- Tri-state order visibility and buyer-confirmed closure (FR-6, FR-7).
- Add-to-collection prompt after closure (FR-8).
- My Sales summary tab for dual-role users (FR-9).

### 6.2 Out of Scope for MVP
- Everything listed in §5 Non-Goals.
- Full seller-side listing management from the My Sales tab — that functionality is FR-S1 through FR-S4 in `docs/plan-1-seller-track/prd.md` (see FR-9's Notes).

## 7. Cross-Cutting NFRs

- **Performance:** Catalog browse/filter ~1-2s response (SPEC.md, course-project scale). Comprobante upload <10s within session (FR-5, user-set target — see decision log).
- **Security/Privacy:** Who may read a stored comprobante file, and under what access-control model, is **not resolved by this PRD** — it is a **shared cross-track architecture decision** (both this track and `docs/plan-1-seller-track/prd.md` FR-S7 depend on it), resolved once in whichever track's Architecture phase runs first, per the governing plan. This is not purely a security detail: FR-6's tri-state flow depends functionally on the verified business being able to actually view the comprobante image to decide its own `sellerReceivedConfirmedAt` confirmation (CAP-20) — the ACL mechanism is an open architecture question, but that the business *must* be able to read it is a functional precondition this PRD asserts now. Separately, the comprobante itself (typically showing a bank account number and holder name) may carry its own Ley 1581 personal-data obligations independent of `ARCHITECTURE-SPINE.md` AD-13, whose Scope note restricts that AD to `legalIdentity` documents only — this is flagged here as a distinct compliance question for the Architecture phase, not assumed to be covered by AD-13 by proximity.
- **Consistency:** An Order's three confirmation states must never be read as a single collapsed status anywhere in the buyer-facing UI (CAP-22) — this is a display discipline, not just a data-model rule.
- **Reliability:** No formal SLA beyond SPEC.md's course-project-scale framing; a stalled Order (buyer paid, business never confirms receipt) has no auto-escalation by design (`project-context.md`) — this track's UX must communicate that state honestly rather than implying an incident is being handled.

## 8. Open Questions

1. Should the My Sales tab (FR-9) be visible before a user completes the individual-seller profile step (CAP-19), or only after? This PRD assumes "always visible, empty-state before completion" (see §10) — confirm during UX phase.
2. ~~Exact max file size / resolution for the comprobante photo (FR-5).~~ **Resolved:** 5 MB per image, no resolution cap (user decision during Buyer-track triage; see FR-5 and decision log).
3. Whether the individual-seller-to-verified-business account transition affects what the My Sales tab shows (SPEC.md flags this as a Risky, unaddressed assumption platform-wide) — out of scope for this track unless it blocks FR-9. `docs/plan-1-seller-track/prd.md` §2.2/§5 independently flags the same transition as out of scope for its own protagonists; neither track resolves the underlying SPEC.md gap.
4. ~~Pending the instructor's answer on track scope.~~ **Resolved:** instructor confirmed covering both tracks is valid; Seller/Business is its own `prd.md` in `docs/plan-1-seller-track/` (see decision log).
5. The comprobante's own potential Ley 1581 exposure (distinct from `ARCHITECTURE-SPINE.md` AD-13's `legalIdentity`-only scope) — flagged in §7, not resolved here; carry to the Architecture phase alongside the comprobante-ACL decision.
6. No `DomainError` code currently exists in `ARCHITECTURE-SPINE.md` AD-11's taxonomy for FR-5's "reject confirm-paid-without-comprobante" case — needed before this Consequence is implementable; carry to the Architecture phase as a candidate new code (or confirm an existing code covers it).

## 9. Success Metrics

**Primary**
- **SM-1:** Catalog browse/filter response time — target ~1-2s (SPEC.md). Validates FR-2, FR-3.
- **SM-2:** Comprobante upload-to-confirmation time — target <10s within session. Validates FR-5.

**Secondary**
- **SM-3 (qualitative, not directly instrumented):** Anecdotal/support-channel signal of buyers contacting a seller outside the app to ask about Order status — no FR in this track logs out-of-app contact, so this cannot be measured as a hard KPI from in-platform data alone; tracked only as a qualitative signal (e.g. via support tickets or user interviews) of whether the tri-state view (FR-6) is actually legible enough that buyers don't feel the need to ask. Validates FR-6, FR-7.
- **SM-4 (risk flag, not a target):** No metric in this section measures listing-price-vs-reference-price accuracy, despite the entire trust narrative in §1 Vision resting on it (CAP-3). This is a known, accepted gap: CAP-3's reference-price data source is flagged `Risky`/unverified in SPEC.md's Assumptions, and this track's FRs have no instrumentation for price accuracy. Not remediated by this PRD.

**Counter-metrics (do not optimize)**
- **SM-C1:** Comprobante image compression/quality — do not sacrifice legibility to hit the <10s upload target (SM-2); an illegible comprobante defeats CAP-20's entire trust mechanism. Counterbalances SM-2.
- **SM-C2:** Catalog result count/breadth — do not narrow default filters purely to make queries faster (SM-1) at the cost of CAP-1's requirement that zero-listing catalog entries still return. Counterbalances SM-1.

## 10. Assumptions Index

- From §4.3 FR-9 / Open Question 1 — `[ASSUMPTION]` The My Sales tab is visible to every authenticated user, showing an empty state before the individual-seller profile step (CAP-19) is complete, rather than being hidden until then.
- From §2.2 Non-Users — `[ASSUMPTION]` Contacting an individual seller (CAP-6) never produces an Order, so it is fully out of this track's purchase/payment/order FRs; only verified-business purchases (CAP-17) exercise FR-4 through FR-8.
- From §4.2 FR-5 — `[ASSUMPTION]` The comprobante upload NFR (<10s, 5 MB max, no resolution cap) assumes a single photo upload to Supabase Storage on the free tier, not a multi-file or video upload. File-size ceiling resolved via user decision during Buyer-track triage (see decision log); upload-time target remains a `[ASSUMPTION]`.
- From §1 Vision / trigger-map.md — `[ASSUMPTION]` Valentina's dual role (buyer + occasional individual seller) is representative enough of the Priority-1/Priority-2 persona overlap to justify FR-9 existing in this track's scope at all, now that `docs/plan-1-seller-track/prd.md` exists as the sibling track owning her individual-seller-side functionality.
- From §4.3 FR-9 — `[ASSUMPTION]` The "pending trade offers" count surfaced by this tab reads live from `docs/plan-1-seller-track/prd.md` FR-S3/FR-S4's trade-offer data rather than this track maintaining its own duplicate count; the exact read mechanism (query vs. denormalized count) is left to the Architecture phase.
- From §9 SM-4 — `[ASSUMPTION]` The CAP-3 reference-price data risk is accepted as a known gap for this PRD's scope; no FR in this track is expected to add price-accuracy instrumentation to close it.
