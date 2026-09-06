---
title: TEZG — Seller/Business Track
created: 2026-09-04
updated: 2026-09-04
status: final
---

# PRD: TEZG — Seller/Business Track
*Track-scoped PRD for the "Plan-1: AI-Assisted Product Planning" course exercise, executed against TEZG (Pokémon TCG Marketplace and Collection Management Platform) in place of the course's default Smart Solar Flow case study. Analogous to the course's "Host" track. Second, incremental track — added after instructor confirmation that covering both tracks is valid for a single-app product; does not reopen or rewrite `docs/plan-1-buyer-track/prd.md`.*

## 0. Document Purpose

This PRD is for whoever picks up the Seller/Business journey next — UX design (`bmad-ux`/Freya) and architecture (`bmad-architecture`) workflows in this same exercise, and the instructor grading it. It covers the **Seller/Business track**: the two distinct seller-side personas TEZG's trigger map names — an occasional **Individual Seller** publishing and trading cards, and a **Verified Business** applying for verification and fulfilling in-platform sales. The **Buyer/Collector track** (catalog browsing, purchase, comprobante payment, order tracking) is a separate, already-finalized PRD — see `docs/plan-1-buyer-track/prd.md`; this document does not restate it.

**Functional Requirement IDs in this document are prefixed `FR-S` (FR-S1..FR-S9)**, distinct from the Buyer track's unprefixed `FR-1..FR-9`, so a finding or cross-reference between the two tracks' PRDs is never ambiguous about which document it points to.

This PRD builds on, and does not restate, TEZG's existing whole-system artifacts:
- `_bmad-output/specs/spec-pokemon-tcg-marketplace/SPEC.md` — canonical capability contract (CAP-1..28), cited by CAP number throughout.
- `_bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md` — 13 architecture decisions (AD-1..13), treated here as **[ADOPTED]** invariants, not re-derived.
- `_bmad-output/B-Trigger-Map/trigger-map.md` and its `personas/` folder — vision, personas, business goals.
- `_bmad-output/project-context.md` — implementation-facing rules derived from the ADs.
- `docs/plan-1-buyer-track/prd.md` and `addendum.md` — the sibling track, cited wherever this document's scope touches it (dual-role identity, Order read-ownership, comprobante ACL).

Features are grouped; Functional Requirements are nested under each and numbered globally within this document (FR-S1..FR-S9) so downstream work can reference them by stable ID. `[ASSUMPTION]` tags mark inferences made without a live confirmation; all are indexed in §10.

## 1. Vision

Valentina — the same collector from the Buyer/Collector track — has three cards she's not chasing anymore and lists them one evening instead of letting them sit in a binder or trading them informally on Discord. She completes a one-time seller profile step, publishes her first listing, marks it open to trade, and a week later fields an incoming trade offer for a card she does want — accepting it, and confirming the swap once it's actually happened, without either side needing an escrow or a stranger's word.

Andrés runs a small card shop that's been trading informally on Instagram for two years. He applies to become a verified TEZG business, submitting his legal identity and a link to his existing Instagram presence, and waits — no fast-track, an admin reviews it by hand. Once approved, he tops up a prepaid commission balance, and his listings go live and purchasable in-platform. When an order comes in, he opens it, looks at the buyer's uploaded proof of payment, and confirms he's been paid — knowing that only the buyer, not him, gets to close the order once the card physically arrives.

That's the whole value proposition of the Seller/Business track: give TEZG's two structurally different seller populations — the hobbyist trading a few cards on the side, and the small business trying to look credible without unpredictable costs — a path that fits each of them, without either one impersonating the other's account type.

## 2. Target User

### 2.1 Jobs To Be Done

**Individual Seller (Valentina):**
- List a card or bundle for sale or trade without a verification process that doesn't fit an occasional hobbyist seller (trigger-map.md: avoiding informal WhatsApp/Discord chaos, signaling trade-openness).
- See and act on incoming trade offers against her own listings without missing one or being unsure whether a trade actually went through.

**Verified Business (Andrés):**
- Establish credibility as a real, verified seller rather than another informal Instagram account, so buyers trust him enough to purchase in-platform (trigger-map.md: professional/credibility-seeking driving force).
- Know his commission balance status at a glance, and never have a listing silently vanish or get deleted because the balance ran out (trigger-map.md: wary of unpredictable commission costs; SPEC.md Success Signal: pause, never delete).
- Confirm he's been paid for a sale by actually seeing the buyer's proof, not just taking a claim on faith.

### 2.2 Non-Users (v1)

- Buyers browsing or purchasing listings — covered by the Buyer/Collector track (`docs/plan-1-buyer-track/prd.md`), not restated here.
- An individual seller applying for business verification mid-flow, or a verified business creating a trade offer — SPEC.md's "Safe" assumption states a seller account is exclusively individual-seller *or* verified-business at any given time, never both simultaneously (§2.3 disambiguates this from the Buyer track's separate dual-role axis). This track's two protagonists each occupy exactly one of the two states for the duration of their scenarios; the transition between them (an individual seller "graduating" to verified business) is a SPEC.md-flagged Risky, unaddressed assumption platform-wide, and out of scope here (see §8, Open Question 4 note).
- Platform admins reviewing business applications or moderating listings (CAP-15, CAP-28) — an admin-actor flow, out of scope for a seller-facing PRD.

### 2.3 A note on two different "role" axes

This PRD and the Buyer/Collector PRD each rely on a role rule that sounds similar but is not the same axis:
- **Buyer track's axis (dual-role coexistence):** a single account can be a buyer *and* an individual seller *at the same time* — TEZG derives this from independent flags (`isIndividualSellerProfileComplete`, `businessId`, `isAdmin`), never one mutually-exclusive field (`project-context.md`). Valentina is this PRD's proof: she is simultaneously a buyer (Buyer track) and an individual seller (this track, S1-S2).
- **This track's axis (seller-type exclusivity):** the *seller* role itself is exclusively individual-seller *or* verified-business, never both (SPEC.md "Safe" assumption). Valentina is never also a verified business; Andrés is never also an individual seller. This is a constraint on the seller side of the account, orthogonal to whether that same account also buys.

These two rules do not contradict each other — they constrain different pairs of roles — but nothing in either PRD said so explicitly until now, closing a gap the Buyer track's adversarial review flagged (`docs/plan-1-buyer-track/review-prd-adversarial.md`, finding on the Glossary's "Dual-role user" entry).

### 2.4 Key User Journeys

- **S1. Valentina publishes her first listing.**
  - **Persona + context:** Valentina, 27, Bogotá — already an active buyer/collector on TEZG (see Buyer/Collector track), now listing a card she no longer wants.
  - **Entry state:** Authenticated, has never completed the individual-seller profile step.
  - **Path:** Opens "sell a card" → completes the one-time individual-seller profile step (CAP-19) → creates a listing against a catalog entry, sets a price and condition, decides whether to allow trade offers on it.
  - **Climax:** The listing publishes and becomes visible to buyers immediately — no admin review gate, unlike a business application (CAP-4, CAP-5).
  - **Resolution:** Her listing shows in catalog search (as covered by the Buyer track's FR-2) with `pickupAvailable=true` and, if she chose it, `openToTrade=true`.
  - **Edge case:** If she tries to create a listing before completing the profile step, the attempt is rejected with `IndividualSellerProfileIncomplete` (CAP-19) rather than silently succeeding with a partial profile.

- **S2. Valentina manages a trade offer.**
  - **Persona + context:** A week later, her open-to-trade listing has drawn interest.
  - **Entry state:** Authenticated, has at least one listing flagged `openToTrade=true`.
  - **Path:** Sees an incoming trade offer (cards/product/money) against that listing → reviews what's being offered → accepts it → later, once the physical exchange has actually happened, confirms "trade completed" on her side.
  - **Climax:** The trade only shows as fully completed once *both* she and the other party have independently confirmed it (CAP-26) — neither side can unilaterally declare it done.
  - **Resolution:** Accepting the trade reserves inventory the same way a purchase would (AD-6), so the same card can't simultaneously be sold and traded out from under her.
  - **Edge case:** If a trade offer arrives against a listing that isn't flagged `openToTrade`, the offer is rejected/unavailable rather than silently queued (CAP-25).

- **S3. Andrés becomes a verified business and manages his commission balance.**
  - **Persona + context:** Andrés, owner of a small card shop already active informally on Instagram, wants credibility beyond an Instagram DM-based storefront.
  - **Entry state:** Unauthenticated or newly authenticated, no business account yet.
  - **Path:** Submits a business application (legal identity + Instagram/website link) → application sits Pending → an admin manually approves or rejects it, on no fixed timeline → once Approved, tops up a prepaid commission balance → his existing draft listings become purchasable.
  - **Climax:** His listings show a verified badge and become the only seller-type purchasable in-platform (per the Buyer track's FR-4), the moment his balance is positive.
  - **Resolution:** If his balance later hits zero, his listings pause (still visible/editable, never deleted or hidden) until he tops up again — he never has to recreate anything.
  - **Edge case:** He can never set `openToTrade=true` on any of his listings — that flag is individual-seller-only, enforced by `listings` itself, not merely hidden in his UI (AD-4).

- **S4. Andrés fulfills a sale.**
  - **Persona + context:** A buyer has just purchased one of his listings through the platform (Buyer track FR-4).
  - **Entry state:** Authenticated as a verified business, has at least one Order against one of his listings.
  - **Path:** Sees the incoming Order → the buyer uploads a comprobante and confirms payment (Buyer track FR-5) → Andrés opens the Order, reviews the comprobante image → confirms "payment received" on his side.
  - **Climax:** His confirmation sets `sellerReceivedConfirmedAt` independently of the buyer's own confirmation — the Order still isn't "closed" from this action alone (CAP-20, CAP-22).
  - **Resolution:** Commission auto-deducts from his balance the moment he confirms receipt, off the same event (AD-3) — he never manually enters a commission amount.
  - **Edge case:** Even after he confirms receipt, he cannot close the Order himself — only the buyer's own `buyerItemReceivedConfirmedAt` confirmation closes it (AD-2). This is a documented, accepted limitation of the platform's peer-to-peer settlement model, not a bug: Andrés has no lever to force closure, by design.

## 3. Glossary

- **Individual seller** — See Buyer track Glossary; repeated here only where this track adds detail. Publishes listings with no business-verification requirement (CAP-4); may flag a listing `openToTrade` (CAP-25).
- **Verified business** — A seller whose business application has reached `Approved` (CAP-5, CAP-15); the only seller type whose listings are purchasable in-platform (CAP-17) and whose purchasability additionally gates on a positive commission balance (CAP-21).
- **Business application** — The legal-identity + external-presence submission an aspiring business makes; sits `Pending` until an admin transitions it to `Approved` or `Rejected` (CAP-15).
- **Commission balance** — A verified business's prepaid balance; auto-deducts per confirmed sale, pauses (never deletes) listings at zero (CAP-21, AD-3).
- **Open to trade** — A boolean flag on an individual-seller listing, default `false`, that a buyer can propose a trade offer against — see FR-S2 for the authoritative statement of its business-listing restriction.
- **Trade offer** — A buyer's proposal (cards/product/money) against an open-to-trade listing; the seller accepts, rejects, or counters it (CAP-25).
- **Trade completion** — Independent confirmation by both parties that an accepted trade actually happened; computed as `buyerConfirmed && sellerConfirmed` on read, never a separately stored status (CAP-26, AD-4).
- **Seller-received confirmation** — The business's own timestamp (`sellerReceivedConfirmedAt`) confirming it has reviewed the comprobante and considers itself paid; independent of, and never sufficient to close, the Order (AD-2).
- **Seller-type exclusivity** — The rule that a seller account is individual-seller *or* verified-business, never both at once (SPEC.md "Safe" assumption) — see §2.3 for how this differs from the Buyer track's dual-role axis.

## 4. Features

### 4.1 Individual-Seller Listing & Trade Management
**Description:** Takes Valentina from "I have a card to sell or trade" to a live listing, and from an incoming trade offer to a mutually confirmed trade. Realizes S1, S2.

#### FR-S1: Individual-seller profile completion and first listing
A first-time individual seller completes a one-time profile step, then can publish a listing against a catalog entry, bundle, or sealed product. Realizes S1. (CAP-4, CAP-16, CAP-19)

**Consequences (testable):**
- Attempting to publish a listing before completing the profile step is rejected with `IndividualSellerProfileIncomplete`, never silently succeeding with a partial profile.
- Once the profile step is complete, publishing a listing requires no admin approval and becomes visible to buyers immediately.
- A bundle listing records its component cards individually; sealed products are always listed individually and are never accepted as a bundle component.

**Out of Scope:**
- Any business-style verification step — that gate exists only for FR-S5's Verified Business flow, never for an individual seller (CAP-5).

#### FR-S2: Open-to-trade flag on a listing
An individual seller can flag her own listing as open to trade at creation or afterward. Realizes S1. (CAP-25, AD-4)

**Consequences (testable):**
- `openToTrade` defaults `false` on every new listing.
- Only an individual-seller listing can ever have `openToTrade=true`; the same action attempted against a verified-business listing is rejected, enforced by the listing's own owning logic — not merely hidden in a business-facing UI.

#### FR-S3: Review and respond to incoming trade offers
An individual seller can view trade offers against her open-to-trade listings and accept, reject, or counter each one. Realizes S2. (CAP-25)

**Consequences (testable):**
- A trade offer against a listing not flagged `openToTrade` never reaches this view — it is rejected at the point the buyer tries to propose it.
- Accepting a trade offer reserves inventory the same way a purchase reservation does, so the same unit cannot be simultaneously sold and traded.
- Rejecting a trade offer is recorded and visible to the buyer as rejected (CAP-25's success signal) — the offer's status is never left ambiguous or silently deleted.
- Countering a trade offer is recorded and visible to the buyer as a counter-proposal (CAP-25's success signal) — the original offer is superseded, not silently dropped; the buyer can accept, reject, or counter the counter-offer in turn.
- `[ASSUMPTION]` Once one trade offer against a listing is accepted and its inventory reserved, the listing's other pending trade offers are automatically marked unfulfillable and surfaced as such to their proposers, rather than left silently open indefinitely — SPEC.md doesn't specify this; see §8 Open Question 2.

#### FR-S4: Confirm trade completion
An individual seller can independently confirm that an accepted trade was actually completed. Realizes S2. (CAP-26)

**Consequences (testable):**
- A trade shows "completed" only once both the buyer and the seller have separately confirmed it — a single-sided confirmation leaves it open indefinitely.
- Confirming trade completion never involves a comprobante or payment step — it is a lightweight mutual-acknowledgment, structurally distinct from an Order's payment confirmation (AD-4).

**Notes:** FR-S3's and this FR's trade-offer data (counts of pending/accepted offers) is the data source `docs/plan-1-buyer-track/prd.md` FR-9's My Sales tab summarizes for Valentina's buyer-side view — this track owns the data, that track only reads it.

### 4.2 Business Verification, Listings & Commission Balance
**Description:** Takes Andrés from an informal Instagram seller to a verified, purchasable-in-platform business, and keeps his commission balance legible enough that he's never surprised by a paused listing. Realizes S3.

#### FR-S5: Apply for business verification
An aspiring business submits a legal-identity and external-presence application, which sits in a queryable Pending state until an admin approves or rejects it. Realizes S3. (CAP-5, CAP-15)

**Consequences (testable):**
- The application is queryable as `Pending` immediately after submission and remains so until an admin action transitions it.
- The business's listings, if any exist as drafts, are not represented as verified and are not purchasable in-platform until the application reaches `Approved`.
- No fixed review turnaround is guaranteed — see §7 NFRs.

**Notes:** `[NOTE FOR PM]` The legal-identity data collected here carries the same Ley 1581 handling as `ARCHITECTURE-SPINE.md` AD-13 (timestamped consent, admin-review-only access scoping) — this PRD assumes but does not restate AD-13's mechanism.

#### FR-S6: Manage commission balance
An approved verified business can top up a prepaid commission balance, and sees its listings automatically pause when that balance reaches zero — without any listing being deleted, hidden, or requiring recreation. Realizes S3. (CAP-21, AD-3)

**Consequences (testable):**
- A positive balance keeps the business's listings purchasable; balance auto-deducts per confirmed sale (triggered off FR-S8's confirmation, never entered manually).
- A balance reaching zero pauses (not deletes, not hides) the business's listings; they remain visible and editable to the business itself.
- Topping up a paused balance resumes purchasability on the existing listings, with no recreation step.

**Out of Scope:**
- The exact commission percentage/rate and whether it pairs with a subscription (SPEC.md Non-Goal, platform-wide) — not decided by this PRD.

#### FR-S9: Business creates a listing
A business — Pending or Approved — can create a listing against a catalog entry, bundle, or sealed product, using the same underlying listing-creation mechanism individual sellers use (FR-S1), but gated on business-application state rather than the individual-seller profile step. Realizes S3. (CAP-4, CAP-15, CAP-16, CAP-17)

*Added during Seller-track PRD triage to close a gap the adversarial review flagged: S3's narrative ("his existing draft listings become purchasable") presupposed a listing-creation path for businesses that no FR actually described.*

**Consequences (testable):**
- A business can create a listing while its application is still `Pending` — the listing exists (`sellerType=business`), but is not purchasable in-platform and does not display a verified badge until the application reaches `Approved` (CAP-17).
- Listing creation itself is never gated on commission balance — only purchasability is (FR-S6); a business with a zero balance can still create or edit listings.
- `openToTrade` is rejected at creation, and at any later edit, for a business listing (FR-S2, AD-4) — cited here, not restated as a separate rule.
- Bundle/sealed-product component rules (FR-S1) apply identically regardless of seller type.

**Out of Scope:**
- The listing-creation UI/form itself is shared infrastructure with FR-S1 — this FR specifies only the seller-type-gating differences, not a duplicate creation flow.

### 4.3 Order Fulfillment (Verified Business)
**Description:** Lets Andrés see an incoming sale through to his own side of the confirmation sequence, without ever gaining the ability to close the Order himself. Realizes S4.

#### FR-S7: View an incoming Order and its comprobante
A verified business can view an Order placed against its listing, including the buyer-uploaded comprobante, once the buyer has confirmed payment. Realizes S4. (CAP-20, CAP-22)

**Consequences (testable):**
- `[ASSUMPTION]` The Order is visible to the business the moment it exists, before `buyerPaidConfirmedAt` — this is not directly stated by CAP-22 or AD-2 (both describe the three confirmation states, not when the Order record itself first becomes visible to the business); flagged here as an inference, not a cited fact, pending confirmation during the Architecture phase.
- The comprobante displays as an image the business can actually view, not merely a file-reference identifier — this is a functional precondition for FR-S8, not only a security/access-control detail.

**Notes:** `[NOTE FOR PM]` The exact access-control mechanism governing who may read the comprobante's stored file (this business, only for its own Orders, never another seller's) is a **cross-track architecture decision**, already logged as shared in the governing plan — resolved once, in whichever track's Architecture phase runs first, and cited here as `[ADOPTED]` rather than re-opened as a new open question in this document. `docs/plan-1-buyer-track/prd.md` §7 Security/Privacy NFR independently asserts the same functional precondition (the business must be able to read the comprobante) from the buyer side — the two PRDs describe one shared requirement from opposite sides, not two competing ones.

#### FR-S8: Confirm payment received
A verified business can confirm it has received payment for an Order, independently of the buyer's own confirmations, but can never close the Order itself. Realizes S4. (CAP-20, CAP-22, AD-2)

**Consequences (testable):**
- Confirming payment-received sets `sellerReceivedConfirmedAt`, independently timestamped from `buyerPaidConfirmedAt` and `buyerItemReceivedConfirmedAt`.
- This confirmation alone never closes the Order and never triggers the add-to-collection prompt (Buyer track FR-8) — only the buyer's own item-received confirmation does that (AD-2).
- Confirming payment-received triggers commission deduction from the business's balance (FR-S6), off the same event, with no manual balance entry by the business.
- A second confirm-payment-received attempt on an Order that already has `sellerReceivedConfirmedAt` set is rejected, never re-triggering a second commission deduction — the exact `DomainError` code for this case does not yet exist in `ARCHITECTURE-SPINE.md` AD-11's taxonomy; see §8 Open Question 5.
- A business attempting to confirm payment-received on an Order not tied to one of its own listings is rejected by an ownership check — the exact `DomainError` code for this case is likewise undefined; see §8 Open Question 5.

**Out of Scope:**
- Any mechanism for the business to force, escalate, or dispute a stalled Order (buyer never confirms item-received) — this is a documented, accepted platform limitation (`project-context.md`), not a gap this FR fills.

## 5. Non-Goals (Explicit)

- **The Buyer/Collector track as a whole** — catalog browsing, purchase, comprobante upload from the buyer's side, and buyer-side order tracking. Covered by `docs/plan-1-buyer-track/prd.md`; not restated here.
- **Closing an Order** — exclusively a buyer action (AD-2); no FR in this track grants the business that ability, by design, not oversight (see FR-S8's Out of Scope).
- **Trading for verified businesses** — FR-S2/FR-S3/FR-S4 apply only to Valentina's individual-seller role; see FR-S2 for the source-of-truth statement of why a business listing can't be flagged open-to-trade.
- **The individual-seller-to-verified-business account transition** — SPEC.md flags this as an unaddressed, Risky assumption platform-wide; this track's two protagonists each stay in one seller state for the duration of their scenarios, and this PRD does not attempt to resolve the transition mechanics.
- **Admin review of business applications, or admin moderation** (CAP-15's approval action, CAP-28) — an admin-actor flow, out of scope for a seller-facing PRD; this track only covers the business's own side of submitting and waiting.
- **Exact commission percentage/rate, subscription pairing, or individual-seller monetization** — SPEC.md Non-Goals, platform-wide; not decided here.
- **Comprobante storage/ACL mechanism** — a functional requirement of FR-S7 that the business can read it, but the access-control mechanism itself is a shared cross-track architecture decision (see FR-S7 Notes), not resolved by this PRD.
- **Payment-gateway integration of any kind** — explicitly rejected platform-wide (SPEC.md Non-Goals).
- **Native app, offline mode, or camera/push-notification device dependencies** — ruled out platform-wide (SPEC.md Constraints).

## 6. MVP Scope

### 6.1 In Scope
- Individual-seller profile completion and first listing, including the open-to-trade flag (FR-S1, FR-S2).
- Trade offer review, response, and mutual completion confirmation (FR-S3, FR-S4).
- Business verification application and admin-gated approval visibility (FR-S5).
- Business listing creation, gated by application state rather than the individual-seller profile step (FR-S9).
- Commission balance top-up and pause/resume behavior (FR-S6).
- Viewing an incoming Order and its comprobante, and confirming payment received (FR-S7, FR-S8).

### 6.2 Out of Scope for MVP
- Everything listed in §5 Non-Goals.
- Any UI for an admin to actually perform the approval/rejection/moderation actions this track's FRs depend on (CAP-15, CAP-28) — assumed to exist as a separate, unbuilt admin surface.

## 7. Cross-Cutting NFRs

- **Performance:** No numeric SLA for business-application review — SPEC.md's Assumptions section states this is a manual human admin action, not automated; this PRD documents it as "manual review, no fixed turnaround" rather than inventing a number (same framing style as the Buyer track's stalled-order gap).
- **Security/Privacy:** Business-application `legalIdentity` data follows `ARCHITECTURE-SPINE.md` AD-13's Ley 1581 handling (timestamped consent, admin-review-only access scoping) — cited, not re-derived. Comprobante read access for the business (FR-S7) is a **shared cross-track architecture decision**, not resolved here (see FR-S7 Notes).
- **Consistency:** Commission balance pause/resume (FR-S6) must never require recreating a listing — this is a display and data-model discipline, not only a backend detail; a UI that hides a paused listing entirely (rather than showing it visibly paused) would violate this NFR even without touching the data model.
- **Reliability:** No formal SLA beyond SPEC.md's course-project-scale framing. A stalled Order (business confirms `sellerReceivedConfirmedAt`, buyer never confirms `buyerItemReceivedConfirmedAt`) has no auto-escalation by design (`project-context.md`) — this track's UX must communicate that state honestly to the business rather than implying an incident is being handled, consistent with the same gap already documented from the buyer's side (Buyer track §7).

## 8. Open Questions

1. Whether Valentina's path into FR-S1 (starting to sell) is entered from a dedicated "sell a card" entry point, or from the Buyer track's My Sales tab seam (`docs/plan-1-buyer-track/prd.md` FR-9's Notes) — a cross-track UX question, not decided in either PRD; confirm during the UX phase for whichever track reaches it first.
2. Whether an individual-seller listing can have more than one open, unresolved trade offer at a time, and if so how a seller chooses among them — SPEC.md doesn't cap this; this PRD assumes unlimited concurrent offers with first-accepted-wins enforced structurally by inventory reservation (AD-6), not by a listing-level lock, and that accepting one auto-marks the rest unfulfillable (see FR-S3, §10).
3. Whether a low (but nonzero) commission balance surfaces any warning to the business before it silently reaches zero and pauses listings — not specified in SPEC.md; not invented here.
4. Whether a `Rejected` business application permits reapplication, and on what timeline — SPEC.md doesn't address this; this PRD assumes reapplication is allowed with no cooldown (see §10), consistent with SPEC.md's Non-Goals not naming rejection-appeal mechanics as decided either way.
5. No `DomainError` code currently exists in `ARCHITECTURE-SPINE.md` AD-11's taxonomy for FR-S8's "duplicate confirm-payment-received" or "confirm on a non-owned Order" rejection cases — needed before those Consequences are implementable; carry to the Architecture phase as candidate new codes (mirrors the same class of gap already logged in `docs/plan-1-buyer-track/prd.md` §8 Open Question 6 for FR-5).
6. Whether a business's commission balance can go negative if a *different* Order's confirmation depletes it in the window between this Order's purchase and this business's own receipt-confirmation on it — `ARCHITECTURE-SPINE.md` AD-3 describes the deduction trigger but not this ordering edge case, and neither does this PRD; carry to the Architecture phase.

## 9. Success Metrics

**Primary**
- **SM-S1:** Share of individual sellers who, after hitting `IndividualSellerProfileIncomplete` on a first listing attempt, complete the profile step and successfully publish within the same session. Validates FR-S1.
- **SM-S2:** Median time from an accepted trade offer to both-sided completion confirmation (CAP-26). A proxy for whether the trade-confirmation flow (FR-S4) is legible enough that trades don't stall indefinitely. Validates FR-S3, FR-S4.

**Secondary**
- **SM-S3:** Share of `Approved` business applications that complete at least one commission-balance top-up before their first listing becomes purchasable. A business that verifies but never funds its balance never actually transacts — this metric would reveal that gap early. Validates FR-S5, FR-S6.

**Counter-metrics (do not optimize)**
- **SM-C-S1:** Do not loosen `IndividualSellerProfileIncomplete`'s gate to inflate SM-S1 — the profile-completion requirement (CAP-19) is a platform rule, not friction to be engineered around.
- **SM-C-S2:** Do not pressure businesses toward top-ups (e.g. aggressive low-balance prompts) to inflate SM-S3 in a way that undermines CAP-21's guarantee that a paused business's listings are never deleted, hidden, or otherwise penalized beyond pausing.

## 10. Assumptions Index

- From §2.2 Non-Users / §5 Non-Goals — `[ASSUMPTION]` The individual-seller-to-verified-business account transition is out of scope for this track; each protagonist (Valentina, Andrés) stays in exactly one seller state for the duration of their scenarios.
- From §8 Open Question 2 — `[ASSUMPTION]` A listing can have more than one open, unresolved trade offer at a time; the "who gets the card" question is resolved structurally by which trade is accepted-and-reserved first (AD-6), not by a listing-level lock preventing multiple offers from existing.
- From §8 Open Question 4 — `[ASSUMPTION]` A `Rejected` business application permits reapplication with no cooldown period.
- From FR-S7 Notes — `[ASSUMPTION]` The comprobante ACL mechanism that lets a business read its own Orders' comprobante images (and no other business's) will be resolved once, as a cross-track architecture decision, and both tracks' PRDs correctly defer to whichever `ARCHITECTURE.md` resolves it first.
- From FR-S7 Consequences — `[ASSUMPTION]` An Order becomes visible to the business the moment it exists, before `buyerPaidConfirmedAt` — not directly stated by CAP-22 or AD-2; flagged for confirmation during the Architecture phase (added during Seller-track triage, review finding on FR-S7).
- From FR-S3 Consequences / §8 Open Question 2 — `[ASSUMPTION]` Accepting one trade offer against a listing automatically marks that listing's other pending offers unfulfillable, surfaced as such to their proposers, rather than leaving them silently open (added during Seller-track triage).
- From FR-S9 — `[ASSUMPTION]` A business can create listings while its application is still `Pending`, ahead of `Approved` status; only purchasability, not creation, is gated on approval — added during Seller-track triage to close the review's finding that no FR previously described how a business creates a listing at all.
