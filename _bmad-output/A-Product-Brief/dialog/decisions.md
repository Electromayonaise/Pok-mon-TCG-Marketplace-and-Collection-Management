# Key Decisions Log

**Project:** Pokémon TCG Marketplace and Collection Management Platform
**Format:** Append-only decision log

---

## Decision 1: Spec Task 1 materials as starting truth for the Product Brief

**Date:** 2026-08-24
**Step:** Step 1 — Init
**Session:** 1

**Context:**
Phase 0 registered six existing materials (SPEC.md, JUSTIFICATION.md, human draft, problem statement PDF, peer review PDF, standalone bmad-spec run). Before starting discovery, Saga asked whether to treat the existing SPEC.md as the starting truth to refine, or build the brief from scratch and reconcile afterward.

**What was decided:**
Use the existing Spec Task 1 materials as the starting truth. This Product Brief refines and deepens the strategic layer (vision, positioning, users, success criteria, constraints) that SPEC.md already implies at the capability/contract level, rather than re-deriving it independently.

**Why:**
The SPEC.md is already a reconciled, adversarially-reviewed, human-approved artifact (six-stage process, see JUSTIFICATION.md) — treating it as ground truth avoids contradicting decisions Martin already made deliberately (e.g., currency handling, business vs. individual-seller contact channels, review-eligibility gating).

**Impact:**
Vision, positioning, target users, and constraints sections of this brief should stay consistent with SPEC.md's Contract/Capabilities/Constraints/Non-Goals/Assumptions rather than introducing contradicting scope. Where SPEC.md left something as a flagged risky Assumption or Non-Goal, this brief can go deeper strategically but should not silently resolve it as if it were fact.

**Alternatives considered:**
- Build the brief from a blank slate and reconcile against SPEC.md afterward — rejected as duplicate effort and a risk of drifting from decisions already made deliberately in the six-stage spec process.

**Documented in:** `_bmad-output/A-Product-Brief/dialog/00-context.md`

---

## Decision 2: Team structure and internal driver confirmed

**Date:** 2026-08-24
**Step:** Step 1a — Client Profile
**Session:** 1

**Context:**
Saga asked about organisation, people/decision culture, and internal driver before starting product-level discovery.

**What was decided:**
This is a 2-person founding team — Martin (Product Owner) and Mateo Rubio (co-founder with real decision-making say, not just a document co-author). The project was triggered by personal frustration with existing tools (fragmented across research/pricing/seller-discovery/collection-tracking tools, oriented to the US market) and the wish for a unified platform usable in Colombia. Course deadline: end of November 2026. Martin has shipped digital products before — this is not a first build.

**Why:**
Establishes that this is a real product aspiration with a genuine market gap (Colombia vs. US-oriented competitors), not purely an academic exercise — this should inform Vision and Positioning next, and means recommendations can lean toward real-world viability, not just spec-completeness.

**Impact:**
Positioning work should explicitly address the Colombia-vs-US-market gap. Success criteria should account for both the course deadline (end of Nov 2026) and the founders' real product ambition. Decision-making in this brief treats Martin as primary but should flag anything that materially needs Mateo's buy-in.

**Alternatives considered:**
- None — straightforward factual capture.

**Documented in:** `_bmad-output/A-Product-Brief/dialog/client-profile.md`

---

## Decision 3: Product category and go-to-market sequencing

**Date:** 2026-08-24
**Step:** Step 3 — Positioning
**Session:** 1

**Context:**
Saga asked how Martin would categorize the product for someone hearing about it cold, and what would actually make a Colombian collector switch off eBay+PriceCharting+Collectr.

**What was decided:**
The product is a **collection tracker with a marketplace attached** — not a marketplace with tracking as a feature. This category framing is also the go-to-market sequence: launch collection-oriented (useful without marketplace liquidity), then grow the seller/marketplace community over time. Target customer is deliberately unsegmented — all Colombian collectors, buyers, individual sellers, and businesses from day one.

**Why:**
Marketplace value depends on network effects (enough local sellers to be worth using instead of eBay); collection-tracking value doesn't. Leading with the tracker makes the product genuinely useful on day one, before the marketplace side has scale — an honest, defensible launch strategy rather than assuming instant marketplace liquidity.

**Impact:**
Success Criteria (next relevant step) should likely define phased metrics — e.g. collection-tracking adoption/accuracy metrics for an early phase, marketplace liquidity/transaction metrics for a later phase — rather than a single blended metric set. Product Concept and feature prioritization should treat collection/tracking features as the initial core, not parity-launch everything at once.

**Alternatives considered:**
- Marketplace-first framing (lead with buying/selling) — rejected: without an existing seller base, a marketplace-first product would launch with no liquidity and no distinct day-one value over informal WhatsApp/Telegram groups.

**Documented in:** `_bmad-output/A-Product-Brief/dialog/07-positioning.md`, `_bmad-output/A-Product-Brief/01-product-brief.md`

---

## Decision 4: Business model — monetize businesses only at launch

**Date:** 2026-08-24
**Step:** Step 5 — Business Model
**Session:** 1

**Context:**
Saga flagged that SPEC.md leaves "final business model, commissions, or monetization strategy" as an explicit Non-Goal, and asked who pays, referencing the SPEC.md split between individual sellers (external handoff, no in-platform payment) and verified businesses (in-platform purchase). Martin's first answer proposed both listing fees (individual sellers) and commission/subscription (businesses); on reflection, he walked back the individual-seller fee.

**What was decided:**
Both B2C (individual collectors/sellers) and B2B (verified businesses) exist as distinct segments, but **monetization at launch is business-only**: commission on in-platform business sales, possibly a subscription tied to the verified badge. Individual sellers are not charged, since their sales complete off-platform and a fee for an outcome the platform can't see/guarantee felt wrong. Bringing individual-seller transactions in-platform (and monetizing them) is explicitly deferred to a later stage.

**Why:**
Monetizing where money already flows through the platform (business purchases, per SPEC.md's `PurchaseListing`) is architecturally straightforward today. Monetizing individual sellers now would require either charging for an off-platform outcome (rejected on principle) or building in-platform payment for individual sellers, which is out of scope for this iteration.

**Impact:**
Reinforces the collection-first positioning (Decision 3): the marketplace/revenue side depends on business-side adoption reaching scale, so collection-tracking value must stand alone until then. Success Criteria should likely track platform-usage health and business-revenue viability as separate metric tracks on different timelines. The individual-seller monetization question stays open for a future phase, not resolved as a Non-Goal.

**Alternatives considered:**
- Flat listing fee for individual sellers — rejected: fee decoupled from an outcome the platform can't verify (sale happens off-platform).
- Leaving monetization entirely undecided (matching SPEC.md's Non-Goal as-is) — rejected: the Product Brief's job is to go deeper strategically than the SPEC kernel, and a business-only launch model was decidable now.

**Documented in:** `_bmad-output/A-Product-Brief/01-product-brief.md`

---

## Decision 5: Business customer profile (B2B segment)

**Date:** 2026-08-24
**Step:** Step 6 — Business Customers
**Session:** 1

**Context:**
Building on SPEC.md's business-application flow (legal identity + external presence, admin-approved verification), Saga asked what type/size of business is the core target, who decides to apply and pay, and what convinces a business to pay instead of relying on free social-media presence.

**What was decided:**
Business customers are a mix of solo sellers-as-business (already selling informally via Instagram) and small teams/shops — no single dominant type expected at launch. Decision-maker is realistically the owner or, for small teams, whoever holds spend authority — not a formal procurement process. The core value trade is distribution/discoverability: the platform gives a business the same kind of visibility gain a seller gets from eBay, solving the problem that a Colombian collector would rarely find a given store through social media alone.

**Why:**
This keeps the B2B customer profile consistent with SPEC.md's lightweight, informal business-application flow (no enterprise-grade onboarding implied) and grounds the value proposition in something concrete (visibility) rather than an abstract "professionalism" claim.

**Impact:**
Feature/UX work for the business side should not assume enterprise buying processes (e.g. no need for multi-seat procurement approval flows) — a single owner or very small team is the realistic unit. Marketing/positioning for business acquisition should lead with "get discovered by collectors who are already here to buy," not generic professionalism.

**Alternatives considered:**
- Narrowing to only registered/formal shops — rejected: solo Instagram-based sellers are an equally real, likely larger, initial segment.

**Documented in:** `_bmad-output/A-Product-Brief/01-product-brief.md`

---

## Decision 6: Primary user behavioral profile, and a new capability signal (location/distance filtering)

**Date:** 2026-08-24
**Step:** Step 7 — Target Users
**Session:** 1

**Context:**
With Trigger Mapping (Phase 2 personas) skipped, this step needed to carry more behavioral weight than usual. Saga asked for a week-in-the-life walkthrough, the most frustrating moment in the current workflow, underlying motivation, and whether individual sellers are a distinct type of person. Martin used his own habits as the day-one archetype, then added an unprompted point about casual selling.

**What was decided:**
Primary user: a Colombian collector following new releases + individual card pickups, routed today through price-guide site → eBay → PriceCharting → Collectr, with two frustrations (shipping/import-fee cost, manual reconciliation). Individual sellers are the same person occasionally selling, not a distinct persona — serious sellers graduate to a business account (matches SPEC.md's existing split). **New addition:** casual selling is discouraged today by eBay's listing friction; a platform with **distance/location filtering** (for in-person pickup or simply preferring local sellers) would meaningfully lower that friction — for both pickup-only and still-shipped scenarios.

**Why:**
Location/distance filtering is not currently in SPEC.md's `BrowseCatalog(filters)` dimensions (set/era/Pokémon/color/style/artist only). This surfaced organically from real usage reasoning, not from re-deriving the spec — exactly the kind of behavioral insight the Product Brief is meant to catch that a spec-level pass alone wouldn't.

**Impact:**
Flag location/distance filtering as a candidate capability for the next `bmad-spec`/`bmad-architecture` pass — it directly serves the "collection tracker first, marketplace grows in" positioning by making casual (non-business) selling more viable, which is exactly the segment the platform needs to bootstrap early marketplace activity without waiting on verified-business adoption.

**Alternatives considered:**
- Treating this as out of scope for the brief (spec-level detail) — rejected: it's a user-need signal, appropriately captured in the brief even if the actual filter mechanics are a later design/spec decision.

**Documented in:** `_bmad-output/A-Product-Brief/dialog/03-users.md`, `_bmad-output/A-Product-Brief/01-product-brief.md`

---

## Decision 7: Product concept — "one canonical card, three lenses," and two structural references

**Date:** 2026-08-24
**Step:** Step 7a — Product Concept
**Session:** 1

**Context:**
Saga asked for the founding structural idea, referencing SPEC.md's existing catalog-independence constraint as a possible starting point. Martin answered with concrete screenshots of two existing products whose *structure* (not category) is being borrowed: tcgwatchtower.com (catalog: set → chase cards/grid → detail-with-buy-panel) and pkmnbindr.com (binder: configurable grid, progress tracking, display toggles, multi-page, add-by-selection-or-link).

**What was decided:**
Core concept is "one canonical card, three lenses" — every catalog card is viewed through a marketplace lens, a collection/binder lens, and a market/price lens, all reading from one entry rather than separate records (directly extending SPEC.md's catalog-independence constraint). Catalog IA borrows tcgwatchtower's set-first browse/detail pattern, but the buy panel routes to the platform's own local marketplace listings instead of external retailers. Binder IA borrows pkmnbindr's configurable-grid/multi-page/progress-tracking/display-toggle model, including the "add via link" fallback for cards not yet in the registered catalog.

**Why:**
This structural unification is what actually solves the fragmentation problem named in the Vision — three tools each holding a partial, independently-drifting record of "this card" becomes one record with multiple views that can't drift out of sync with each other.

**Impact:**
This is a strong signal for `bmad-architecture` later: the catalog entity should be designed as the stable "spine" with marketplace/collection/pricing as attached relations, not siloed subsystems. Two concrete new capability signals for the next spec pass: (1) location/distance filtering (from Step 7), (2) add-to-binder-via-link for not-yet-indexed cards (from this step) — SPEC.md's current capabilities don't cover either.

**Alternatives considered:**
- Treating catalog, collection, and marketplace as three independently-designed modules that merely share a card ID — rejected implicitly by confirming the "one entry, three lenses" framing, since that would risk re-creating the same sync problem the vision is trying to escape.

**Documented in:** `_bmad-output/A-Product-Brief/dialog/04-concept.md`, `_bmad-output/A-Product-Brief/01-product-brief.md`

---

## Decision 8: Payment model — no gateway; peer-to-peer payment + prepaid commission balance

**Date:** 2026-08-24
**Step:** Step 8 — Success Criteria (detour, at Martin's explicit request, before finishing this step)
**Session:** 1

**Context:**
While discussing timeline (the transactional/payments piece is the one part allowed to slip past the November deadline), Martin raised that a payment gateway (e.g. Wompi) would eat into margins twice — once on the transaction fee, again when disbursing funds to businesses — since the platform is a pass-through, not the final destination of funds. He proposed instead: business registers a QR code or bank account at verification; buyer sees payment details, pays the business directly, uploads a comprobante (proof of payment) and hits "I've paid"; business confirms receipt. This solves the payment *mechanism* but left commission collection unsolved — an after-the-fact monthly invoice has no enforcement, and "disable after 1 month unpaid" still means eating a full month of losses per non-paying business.

**What was decided:**
No payment gateway. Payment is peer-to-peer (QR/bank transfer + comprobante + mutual confirmation), consistent with the platform never being the final destination of transaction funds. Commission is **prepaid into a balance/wallet** the business tops up before their listings are purchasable; each confirmed sale deducts commission automatically from that balance. If the balance hits zero, listings pause (not disabled/banned) until topped up.

**Why:**
This eliminates the collections-risk problem entirely rather than managing it reactively — the platform never processes a sale it wasn't already paid the commission for, so there's no first-month exposure, and pausing (not banning) keeps the consequence proportionate and reversible rather than punitive.

**Impact:**
This fills SPEC.md's currently-open Non-Goal ("the payment gateway/provider details are excluded") with an actual mechanism — a genuine refinement for the next spec pass, not a contradiction of it. `PurchaseListing`'s real-world semantics become "recorded with manual comprobante-based confirmation," not "processed via automated payment capture" — worth flagging precisely for `bmad-architecture`. Introduces new required data/state: business payment method (QR/bank account) at verification, a commission balance per business, and a per-transaction confirmation sequence (buyer paid → business received) — see Decision 9 for the third confirmation state this connects to.

**Alternatives considered:**
- Payment gateway (e.g. Wompi) — rejected: double-fee exposure (transaction fee + disbursement fee) on funds that were never the platform's to begin with.
- Post-hoc monthly invoicing with account-disable-on-nonpayment — rejected: guarantees at least one month of loss per business that churns without paying, and requires the platform to make an adversarial disable judgment call.

**Documented in:** conversation trail in this session; to be formally absorbed into Constraints (Step 10) and Platform Strategy (Step 10a).

---

## Decision 9: Delivery assurance without escrow — buyer-confirms-receipt + identity-backed reputation

**Date:** 2026-08-24
**Step:** Step 8 — Success Criteria (same detour)
**Session:** 1

**Context:**
Martin asked the natural follow-up to Decision 8: without a gateway holding funds, what stops a verified business from taking payment and not shipping — a payment gateway would let the platform hold funds until delivery-tracking shows "delivered," but peer-to-peer payment gives the platform no funds to hold.

**What was decided:**
Two mechanisms, deliberately not fund-holding: (1) a three-state confirmation sequence — buyer confirms paid → business confirms payment received → **buyer confirms item received** — so "paid" and "fulfilled" are distinct, visible states, not collapsed into one; (2) reliance on identity-backed reputation as the real enforcement lever — verified businesses already went through legal-identity + external-presence verification (per SPEC.md) and reviews are already gated on completed purchase, so non-delivery has real reputational consequence in a way an anonymous marketplace couldn't enforce. A forfeitable buyer-protection deposit (separate pool from the commission balance) was discussed as a possible v2 hardening, not adopted for v1.

**Why:**
True escrow requires the platform to hold the transaction funds, which the peer-to-peer payment model (Decision 8) deliberately avoids. Given that constraint, reputation tied to a real, verified identity is the strongest available lever, and it's already architecturally implied by SPEC.md's existing verification + purchase-gated-review design — this decision leans into an existing mechanism rather than inventing a new one.

**Impact:**
The three-state confirmation (paid / received-by-seller / received-by-buyer) needs to become an explicit state machine for `PurchaseListing` on verified-business orders in the next spec pass — currently SPEC.md only implies a single `OrderId` completion. Admin moderation (already a SPEC.md capability) becomes the escalation path for disputes.

**Alternatives considered:**
- Forfeitable buyer-protection deposit at verification — deferred to v2; adds real protection but also friction and platform financial exposure not needed to ship v1.
- Extending prepay/escrow logic to individual-to-individual (client-to-client) transactions — explicitly rejected as solving the wrong problem: individual sellers aren't monetized (Decision 4/5) and their sales remain off-platform entirely, so neither commission-prepay nor delivery-assurance mechanisms apply to them the same way.

**Documented in:** conversation trail in this session; to be formally absorbed into Constraints (Step 10) and Platform Strategy (Step 10a).

---

## Decision 10: Trading system for individual sellers (offer/counter-offer, off-platform exchange)

**Date:** 2026-08-24
**Step:** Step 8 — Success Criteria (same detour)
**Session:** 1

**Context:**
Following the payments/delivery discussion, Martin raised a previously-uncaptured requirement: the platform should support trading, not just buying/selling, for individual sellers.

**What was decided:**
A listing can be marked "open to trade" by its seller. A buyer can then propose a trade offer combining cards, other product, and/or money in any mix against that listing. The seller can accept, reject, or counter-offer. The negotiation (offers, counter-offers, acceptance) happens entirely on-platform; the actual exchange happens off-platform — the same external-handoff model already used for individual-seller purchases. Trade offers are only possible on listings explicitly flagged as open to trade, not on any individual-seller listing by default.

**Why:**
Trading is a natural extension of the individual-seller model already in SPEC.md (external handoff, no in-platform payment) — it doesn't introduce new payment/trust-model complexity because, like regular individual sales, the platform never has custody of the actual exchange.

**Impact:**
This is a genuinely new capability not present anywhere in SPEC.md's current Contract/Capabilities — needs new operations for the next spec pass (e.g. something like `CreateTradeOffer`, `RespondToTradeOffer` with accept/reject/counter, and a listing-level "open to trade" flag). Should be scoped as individual-seller-only, consistent with the existing individual-vs-business Constraint split.

**Alternatives considered:**
- None discussed — captured as a direct requirement addition, not a choice among options.

**Documented in:** conversation trail in this session; a new capability signal for the next `bmad-spec` pass, alongside location/distance filtering (Decision 6) and add-to-binder-via-link (Decision 7).

---

## Decision 11: Competitive landscape and unfair advantage

**Date:** 2026-08-24
**Step:** Step 9 — Competitive Landscape
**Session:** 1

**Context:**
Saga pushed through all four required angles: alternatives explored fairly (eBay+PriceCharting+Collectr chain, WhatsApp/Telegram groups), the do-nothing case, the unfair advantage, and a reality-check stress test (what if eBay went Colombia-local, or a competitor copied the idea).

**What was decided:**
Price-data trust isn't the hard problem (same underlying sources, platform is an aggregator) — platform trust as a transaction venue is, and has to be earned over time. WhatsApp/Telegram groups lose on structural search/discoverability, not on trust or cost. Do-nothing is a real, quantified cost (months of wait, ~20% import fees, stacked eBay markup), not tolerable friction. Unfair advantage is market focus (Colombia-specific, non-overlapping with US-centric incumbents) plus the unified data model. On the reality-check: Martin explicitly accepted that idea-copying is a real risk and becomes an execution/marketing race — but the deeper moat is structural (collection-tracker-with-marketplace, not marketplace-only), so even a "competitor copies the idea" scenario doesn't erase the differentiation.

**Why:**
This is an honest, not inflated, competitive analysis — it doesn't claim an uncopyable idea, it claims a structurally different product shape as the actual defensibility, which is consistent with the Product Concept ("one canonical card, three lenses") and Positioning (Decision 3) work already done.

**Impact:**
Reinforces that the "collection tracker first" positioning isn't just a launch-sequencing choice — it's the actual competitive moat. Any future prioritization trade-off that would weaken the collection/tracking side to speed up the marketplace side should be flagged as risking the core differentiator, not just a scope decision.

**Alternatives considered:**
- Claiming first-mover advantage as the moat — explicitly rejected by Martin ("it just becomes a matter of who implements it first and markets it better") in favor of the structural-differentiation argument.

**Documented in:** `_bmad-output/A-Product-Brief/01-product-brief.md`

---

## Decision 12: Constraints — what's fixed vs. flexible

**Date:** 2026-08-24
**Step:** Step 10 — Constraints
**Session:** 1

**Context:**
Saga asked about budget, technical, and brand parameters, plus a flexibility check (what's most fixed vs. most negotiable). Martin's first answer ("everything we have") was ambiguous enough to warrant a direct clarifying question before documenting, rather than guessing which reading was meant.

**What was decided:**
Fixed/non-negotiable: Colombia-only scope, the collection tracker, the virtual binder, and the trading system. Flexible: the revenue mechanism and the sell/payment-confirmation mechanism specifically — these can be simplified or redesigned under time pressure. Budget is self-funded, free-tier-first. Technical: responsive web, not mobile-first; tech stack itself stays undecided per SPEC.md's existing Non-Goal. Brand name is genuinely open.

**Why:**
Distinguishing "core product" (tracker, binder, trades, Colombia focus) from "monetization/transaction mechanics" as the flexible layer is consistent with the whole brief's throughline: the collection-tracker-first positioning (Decision 3) and the competitive moat argument (Decision 11) both depend on the tracker/binder/Colombia-scope staying intact even if revenue mechanics have to be simplified for time.

**Impact:**
If November time pressure forces cuts, the payments/commission/delivery-confirmation system (Decisions 8-9) is the correct place to simplify first — not the catalog, binder, or trading features. This should directly inform sprint/epic prioritization once this brief moves into implementation planning.

**Alternatives considered:**
- None — this was a clarification of an ambiguous first answer, not a choice among strategic options.

**Documented in:** `_bmad-output/A-Product-Brief/01-product-brief.md`

---

## Decision 13: Platform & device strategy — responsive web, equal device priority

**Date:** 2026-08-24
**Step:** Step 10a — Platform Strategy
**Session:** 1

**Context:**
Building on the Constraints step's "responsive web, not mobile-first" answer, Saga asked for the specifics: device priority, offline needs, native feature requirements, and future platform plans. Martin clarified that "not mobile-first" meant equal priority with desktop, not desktop-first.

**What was decided:**
Responsive web application, equal priority across desktop/tablet/mobile (not desktop-first, not mobile-first). No offline functionality needed. No native device features required (no camera, no push notifications) for the current build. Native mobile app is a realistic future possibility, explicitly out of scope now.

**Why:**
A single responsive codebase is the correct choice given the self-funded/free-tier budget constraint (Decision 12) — it avoids the cost of separate native builds while still serving the primary user's actual behavior pattern (weekly browsing, monthly collection updates) across whatever device they happen to be on.

**Impact:**
Design and development work should target one responsive experience, not device-specific variants. No native-API dependencies (camera/push) should be assumed in the next spec/architecture pass. Leave room architecturally for a future native app without committing to it now.

**Alternatives considered:**
- Desktop-first (assuming binder organization is a "sit down and focus" task) — not adopted; Martin explicitly corrected toward equal priority.

**Documented in:** `_bmad-output/A-Product-Brief/01-product-brief.md`

---

## Decision 14: Tone of voice — trustworthy, precise, peer-to-peer, locally grounded

**Date:** 2026-08-24
**Step:** Step 11 — Tone of Voice
**Session:** 1

**Context:**
Per this step's design, Saga synthesized tone attributes from accumulated product context (peer-to-peer payment model, aggregator positioning, founder-as-collector framing, Colombia-first scope) rather than asking Martin to define tone from scratch, then presented them for confirmation.

**What was decided:**
Four attributes: trustworthy & transparent, precise & credible, warm/peer-to-peer, locally grounded. Confirmed without changes on first presentation.

**Why:**
Trustworthy/transparent is the highest-stakes attribute given the peer-to-peer payment/comprobante system (Decisions 8-9) has no automated safety net — clear, honest microcopy about payment/trade state is doing real trust-building work, not just polish.

**Impact:**
UI microcopy for payment confirmations, balance/pause states, and trade notifications should be written with extra care per these guidelines — this is where the product's trustworthiness is actually felt moment-to-moment, not just claimed in marketing copy.

**Alternatives considered:**
- None — presented once, confirmed on first pass.

**Documented in:** `_bmad-output/A-Product-Brief/01-product-brief.md`

---

### Product Brief Synthesis (Step 12)

**Final narrative presented:** Yes — full strategic narrative (Vision, Who It's For, Problem & Opportunity, Positioning, Success Looks Like, The Reality, What Makes You Win) presented as a coherent story.

**Adjustments during synthesis:** None — confirmed on first presentation.

**User confirmation:** Confirmed.

**Brief generated:** `_bmad-output/A-Product-Brief/01-product-brief.md`

**Completion:** 2026-08-24

---

## Decision 15: Brand name — TEZG

**Date:** 2026-09-01
**Step:** Post-brief (naming, deferred at Decision 12)
**Session:** 2

**Context:**
Decision 12 (Constraints) left the brand name "genuinely open," not a blocker for the Product Brief. Naming surfaced again while producing user-facing collateral (the repo README) that needed a real name instead of the generic "the platform" placeholder used throughout SPEC.md and the brief.

**What was decided:**
The product is named **TEZG** — a deliberate respelling of "TCG" with "EZ" swapped in for the "C" (TCG → TEZG), read aloud as "the TCG, but EZ." Chosen by Martin.

**Why:**
Keeps the card-game category instantly legible (still reads as "TCG") while signaling the product's actual differentiator from Positioning (Decision 3) and Product Concept (Decision 7) — unifying three fragmented tools into one easy, local experience — in the name itself, without needing a tagline to explain it.

**Impact:**
Replaces the "the platform" / generic-name placeholder used in `07-positioning.md`'s Positioning Statement, `project-brief.md`'s Brand line, and `progress-tracker.md`'s constraints summary. Doesn't change any prior strategic decision — it closes the one item Decision 12 explicitly left open.

**Alternatives considered:**
- None presented as options — Martin supplied the name directly.

**Documented in:** `_bmad-output/A-Product-Brief/dialog/07-positioning.md`, `_bmad-output/A-Product-Brief/project-brief.md`, `_bmad-output/A-Product-Brief/dialog/progress-tracker.md`, root `README.md`

---

_Continue appending decisions as they're made throughout the Product Brief process._
