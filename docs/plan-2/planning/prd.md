---
title: TEZG — Plan-2 Subsystem Modules (Single Package)
created: 2026-09-23
updated: 2026-09-27
status: final
---

# PRD: TEZG — Plan-2 Subsystem Modules (Single Package)

*One PRD for the 12 Plan-2 subsystem modules of TEZG (Pokémon TCG Marketplace and Collection Management, Colombia). It is planned as one integrated package with the instructor's approval (`docs/plan-2/task-statement.md`, Appendix B). Stakes: **launch rigor**. The platform is meant to launch for real, so every requirement is written to be implementable and testable, not illustrative.*

## 0. Document Purpose

**Readers.** This PRD is written for three groups:
- The UX phase (`bmad-ux`, `wds-3-scenarios`, `wds-4-ux-design`), which turns each module's four scenarios into outlines and page specs.
- The architecture phase (`bmad-architecture`), which turns the rules marked here as *Phase 3* into `AD-SYS-n` / `AD-<CODE>-n` invariants.
- The implementation readiness gate and the instructor.

**Structure.**
- **Shared part (§1–§8).** Covers the vision, the protagonists, cross-module journeys, the seed profile and the 12→9 module map. It also holds the ownership registry for tables, events and errors, the global boundaries and non-goals, the explainable-decision shape and the system-wide NFRs (`NFR-SYS-n`).
- **Module sections (§9–§20).** One section per module, in AD-1 dependency order: IDN → VER → CAT → INV → DSC → ORD → COM → TRD → MSG → COL → VAL → REP.
- **Closing sections (§21–§23).** Open questions, success metrics and the assumptions index.

**Contents of each module section:**
- purpose and protagonists;
- what the module **owns** and **consumes**;
- its seed;
- its functional requirements (`FR-<CODE>-n`), each citing the CAP(s) it realises;
- its NFRs (`NFR-<CODE>-n`) with numbers;
- the Annex scenario → FR trace;
- the mandatory edge case;
- what is out of scope.

**Inherited, not restated.** These sources are adopted by reference:
- `SPEC.md` for CAP-1..28 (there is no CAP-23).
- `ARCHITECTURE-SPINE.md` for AD-1..13.
- The Plan-1 `ARCHITECTURE.md` files for AD-14..19 and their DomainError additions.
- `project-context.md`.
- The two Plan-1 PRDs (`FR-1..9`, `FR-S1..S9`).

A Plan-2 requirement may *refine* an inherited rule but never contradicts one. Where this PRD found a tension inside the baseline itself, it is raised as an open question (§21), not silently resolved.

**Supporting files.**
- `addendum.md` (same folder) holds the technical depth that does not belong in the requirements narrative: formulas, state-transition tables, event payloads, the error registry with trigger conditions, seed details and the FX source contract. Requirements cite it as `ADD-§n`.
- `.memlog.md` is the decision trail for this PRD.
- `[ASSUMPTION]` marks an inference made without explicit confirmation. All of them are indexed in §23.

**ID conventions.**
- `FR-<CODE>-n` and `NFR-<CODE>-n` identify requirements; rules spanning modules use `NFR-SYS-n`.
- Module codes are the Annex codes.
- Plan-1 IDs keep their own form: `FR-n` for the buyer track and `FR-S<n>` for the seller track.

## 1. Vision

TEZG is **a collection tracker with a local marketplace attached**: one COP-priced place where a Colombian collector sees the catalog, trustworthy reference prices, nearby sellers and their own collection. The marketplace side lets collectors buy, sell and trade directly with other collectors and with small verified businesses. It never holds anyone's money.

Plan-1 proved the product-level journeys work. Plan-2 must prove each of the 12 subsystems behind those journeys:
- is **semantically coherent** (one owner per concept);
- is **mathematically sound** (distances, money, trends and commission computed exactly, with stated rounding);
- is **defensively specified** (every rejection, pause, hide or stale value explains itself and cites the rule);
- is **independently testable** (each module runs against fakes of its neighbours, fixture feeds and a virtual clock).

All 12 must also compose into one modular monolith without contradiction.

**Why launch rigor changes the bar.** Plan-1 tolerated "accepted gaps". Some of them are harmless at launch; others would cost real money or real trust. This PRD separates the two:
- **Kept as-is:** gaps that are harmless at launch, for example no auto-escalation for a stalled order (AD-2).
- **Closed or escalated to the gate:** gaps that would lose money or trust at launch. Examples:
  - a reserved unit held forever by an abandoned order (FR-ORD-8);
  - a commission deduction lost to a failed subscriber (NFR-SYS-6);
  - a business that avoids commission by never confirming receipt (closed at the gate: a buyer-closed order is also charged, FR-COM-4).

## 2. Protagonists and Cross-Module Journeys

### 2.1 Protagonists

| Name | Who | Modules where they lead |
| --- | --- | --- |
| **Valentina** | 27, Bogotá. Release-driven collector who buys, sells a few cards as an **individual seller** from the same account, trades, and tracks her collection's value. Reused from the TEZG personas and Plan-1. | IDN, INV, DSC, TRD, MSG, COL, VAL, CAT |
| **Andrés** | Owner of a small card shop that has sold informally on Instagram for two years. Applies to become a **verified business**, keeps a prepaid commission balance, and fulfils in-platform orders. Reused from Plan-1. | VER, INV, ORD, COM, MSG, REP |
| **Sebastián** *(new)* | **Platform Admin**. Reviews business applications, configures rejection policies, confirms commission top-ups, ingests the catalog feed, moderates listings and reviews, and audits what an account can do and why. | IDN, VER, CAT, COM, REP |
| **Camila** *(new)* | 31, Medellín. Casual buyer who wants a card from someone nearby. Buys from verified businesses, keeps a wishlist and a small starter collection, and reviews sellers. | DSC, ORD, MSG, COL, VAL, REP |
| **Julián** *(new)* | 22, Bogotá. Trade-minded collector who offers cards plus some cash for cards he wants. | TRD |

The Annex introduces these five protagonists. No generic "the user" appears in a requirement. Where a rule applies to any account, the requirement names the role (buyer, individual seller, business, admin).

### 2.2 Cross-module journeys

The four scenarios per module (48 in total) are the unit of traceability. The five journeys below show how modules hand off to each other, and they are the seams the adversarial review must test.

- **UJ-1. Camila buys a card from Andrés.**
  1. DSC: Camila searches within 15 km of Medellín and sees Andrés's verified listing marked "purchasable · 4.2 km away".
  2. CAT: the card detail shows three distinct prices with provenance.
  3. ORD: she purchases (inventory reserved at creation, INV), pays Andrés by bank transfer outside TEZG, uploads the comprobante and confirms "I paid". Andrés confirms receipt.
  4. COM: commission is deducted exactly once.
  5. ORD: the card arrives and Camila confirms receipt, which closes the order.
  6. COL: a dismissible prompt offers to add the card to her collection.
  7. REP: she can now review Andrés.
  - *Seams:* INV↔ORD (reservation in the caller's transaction), ORD→COM (event, exactly-once), ORD→COL (event, one prompt), ORD→REP (closed-purchase query).
- **UJ-2. Valentina lists a card and trades it to Julián.**
  1. IDN: Valentina completes the individual-seller profile step.
  2. INV: she lists a card with `openToTrade=true`.
  3. TRD: Julián offers a card plus COP 20,000. Valentina counters and Julián accepts the counter-offer; accepting reserves the unit, and competing offers on that listing become unfulfillable.
  4. MSG: the contact-message service produces the WhatsApp handoff text.
  5. TRD: both confirm the trade happened, and it shows as completed.
  - *Seams:* IDN→INV (profile gate), TRD→INV (reservation, `openToTrade`), TRD→listings contact service.
- **UJ-3. Andrés becomes a verified business, including a first rejection.**
  1. VER: Andrés submits his application with consent recorded, and it enters `Pending`.
  2. INV: while `Pending` he creates listings, which are visible, unbadged and not purchasable.
  3. MSG: while `Pending` he receives in-app messages that carry a "not yet verified" notice.
  4. VER: Sebastián rejects the application for `DataMismatch` (7-day cooldown).
  5. INV: his listings are withdrawn but retained.
  6. VER: after the cooldown he reapplies, and Sebastián approves.
  7. INV: his listings are restored, with the verified badge.
  8. COM: he tops up his balance, the admin confirms the top-up, and his listings become purchasable.
  - *Seams:* VER→INV (application events), VER→COM (account creation on approval), IDN guard (AD-18).
- **UJ-4. Sebastián runs the platform for a day.**
  1. CAT: ingests the nightly catalog/price feed; malformed rows are quarantined with a reason.
  2. VER: works the application queue oldest-first and edits a rejection reason's cooldown.
  3. COM: confirms two top-ups.
  4. REP: hides an abusive review and a counterfeit listing.
  5. IDN: answers a support question with the capability trace of one account.
  - *Seams:* admin-only surfaces, audit trails, `legalIdentity` access scoping (AD-13).
- **UJ-5. Valentina checks what her collection is worth.**
  1. COL: she opens her binder (3×3, sorted by set then Pokémon).
  2. VAL: sees today's COP value and the 30-day trend. Two link-added promos are listed as "not valued (no catalog entry)", and one card's price is labelled stale because the feed missed a day.
  - *Seams:* COL→VAL (same host), VAL→CAT (reference prices, TRM), CAT freshness policy.

## 3. Reference Seed Profile

The default fixtures follow the task statement (§2 "Reference Seed Profile"). Each module section states its own seed; a module that needs more (for example VAL's 500-entry collection) adds to this baseline and never contradicts it.

| Dimension | Package seed |
| --- | --- |
| Catalog | 10,000 `CatalogEntry` rows across 50 sets and 5 eras, with at least 90 days of reference-price observations for 2,000 of them. 300 entries have no price at all. |
| FX | Fixture TRM table covering the same 90 days. It includes a weekend gap and one missing business day. |
| Accounts | 300 users in total. 3 are admins. 60 are individual sellers with the profile step complete. 14 are business accounts:<br>• 8 Approved, one of which was previously Rejected and then re-applied;<br>• 3 Pending;<br>• 3 Rejected: one `DataMismatch` with a 7-day cooldown expiring at seed time + 3 days, one whose cooldown has already expired, and one barred for `FraudSuspected`.<br>The rest are buyers only. All seeded accounts have consent recorded and email verified, except 5 buyers left unverified for FR-IDN-1 tests. |
| Listings | 1,500 in total: about 1,000 individual-seller and about 500 business. They include 60 bundles and 120 sealed-product listings, 40 cards listed both individually and in a bundle (shared units), 25 hidden listings, 10 withdrawn listings (spread across the Rejected businesses) and 5 listings with missing or out-of-Colombia coordinates. |
| Locations | Seller meeting points spread over Bogotá, Medellín, Cali and Barranquilla. |
| Orders | 200 historical business orders in mixed confirmation states, including 10 unpaid orders older than the expiry window (FR-ORD-8). |
| Commission | 8 commission accounts: 6 funded, 1 at zero and 1 transiently negative. |
| Trades | 50 trade offers in mixed states, including 3 listings each with competing open offers for a last unit. |
| Collections | 300 collections across 120 users. One collection holds 500 entries, 20 of them link-added. There are 150 wishlist entries. |
| Reviews | 400 reviews, 15 of them hidden. |
| Time | An injectable virtual clock seeded at `2026-10-01T15:00:00Z`. Timestamps are stored in UTC and rendered in `America/Bogota` at presentation only. |

## 4. The 12 Modules on the 9 Code Modules

### 4.1 Module map

| # | Module | Code | Host code module(s) | Tier | Core decision logic |
| --- | --- | --- | --- | --- | --- |
| 1 | User, Role & Seller-Type Access Manager | IDN | `identity` | Foundation | Derived capabilities + atomic seller-type exclusivity guard |
| 5 | Business Verification Workflow | VER | `identity` | Intermediate | Application state machine + rejection-reason policy + regulated-data access |
| 2 | Catalog & Price Reference Service | CAT | `catalog` | Foundation | Feed ingestion/idempotent upsert + price provenance + freshness + TRM |
| 4 | Listing & Shared Inventory Engine | INV | `listings` | Advanced | Shared-pool reservation under concurrency + listing state rules |
| 3 | Marketplace Browse & Location Discovery | DSC | `listings` | Intermediate | Geodesic filter + deterministic ranking + derived flags |
| 6 | Order & Comprobante Confirmation | ORD | `orders` | Advanced | Three-fact confirmation machine + reservation lifecycle |
| 7 | Commission Ledger & Purchasability | COM | `commission` | Advanced | Atomic ledger + exactly-once deduction + flap-free pause/resume |
| 8 | Trade Offer Negotiation | TRD | `trading` | Advanced | Turn-based negotiation machine + shared reservation |
| 12 | Messaging & External Contact Handoff | MSG | `messaging` + `listings` (contact-message service, AD-4) | Foundation | Eligibility policy + deterministic message rendering |
| 9 | Collection, Binder & Wishlist | COL | `collections` | Intermediate | Tagged-union entries + ordering + prompt idempotency |
| 10 | Collection Valuation & Trend | VAL | `collections` | Intermediate | Integer valuation + trend formula + money-shape safety |
| 11 | Reviews, Reputation & Moderation | REP | `reviews` + `listings` (listing hide) | Foundation | Purchase-gate policy + aggregate + hide-never-delete visibility |

No module adds a code module or a dependency edge outside the AD-1 graph. The event subscriptions this PRD needs are listed in §4.3; the one edge that needed checking is recorded in OQ-6.

### 4.2 Ownership registry

Each table, event and DomainError code has **exactly one** owning module across the package. Inherited codes are shown in plain text; codes proposed by this PRD are marked **(new)**. ARCHITECTURE §8.1 kept those names and added eleven codes of its own; those are marked **(new, ARCH §8.1)**. `ADD-§3` gives the trigger condition for every code.

| Host | Planning module | Tables / aggregates (written only by this module) | Events published | DomainError codes thrown |
| --- | --- | --- | --- | --- |
| `identity` | IDN | `User` account facts (including the sign-up consent columns `signupConsentAt` and `signupConsentVersion`), `IndividualSellerProfile`, `CapabilityAuditRead` | — | `IndividualSellerProfileIncomplete`, `NotBusinessAccount`, `AlreadyVerifiedBusiness`, `IndividualSellerProfileAlreadyComplete`, `BusinessApplicationOnFile` **(new)**, `NotAuthenticated` **(new)**, `AdminOnly` **(new)**, `EmailNotVerified` **(new)**, `AuthRateLimited` **(new)** |
| `identity` | VER | `BusinessApplication` (with the AD-13 consent fields), `BusinessProfile`, `RejectionReason`, `RejectionReasonChange`, `LegalIdentityAccessLog` | `BusinessApplicationApproved`, `BusinessApplicationRejected` **(new)** | `SellerNotVerified`, `ApplicationNotPending`, `MissingRequiredField`, `ApplicationAlreadyPending` **(new)**, `ApplicationNotFound` **(new)**, `ReapplicationCooldownActive` **(new)**, `ReapplicationBarred` **(new)**, `LegalIdentityAccessDenied` **(new)**, `RejectionReasonUnknown` **(new)**, `InvalidDocumentFile` **(new, ARCH §8.1)**, `LastActiveReasonRequired` **(new, ARCH §8.1)** |
| `catalog` | CAT | `CatalogSet`, `CatalogEntry`, `CatalogEntryRevision`, `ReferencePriceObservation`, `FxRate`, `FeedIngestionRun`, `QuarantinedFeedRow` | — | `CatalogEntryNotFound` **(new)**, `FeedRunInProgress` **(new)** |
| `listings` | INV | `Listing`, `Bundle`, `BundleComponent`, `InventoryUnit`, `ListingModerationLog`, `SellerCommissionState` (local projection of COM events, keyed by `ledgerSeq`) | — | `InvalidItemRef`, `InvalidPrice`, `EmptyComponentList`, `NotBusinessListing`, `NotIndividualSellerListing`, `InsufficientQuantity`, `ListingNotFound`, `SealedProductInBundle` **(new)**, `OpenToTradeNotAllowed` **(new)**, `ListingNotOwnedByCaller` **(new)**, `ListingNotPurchasable` **(new)**, `InvalidLocation` **(new)**, `ListingNotOpenToTrade` **(new)**, thrown by `getTradeability` and propagated by `trading` |
| `listings` | DSC | — (read-only query over INV's tables) | — | `InvalidSearchArea` **(new)**, `SearchFilterTooBroad` **(new, ARCH §8.1)** |
| `listings` | MSG (contact service) | — (stateless apart from the rate-limit log `ContactRequestLog`, purged after 7 days) | — | `ContactRateLimited` **(new)** |
| `orders` | ORD | `Order` (three facts, comprobante reference, payment-instruction snapshot) | `OrderPaymentConfirmedByBusiness`, `OrderClosed` | `OrderNotVisibleToCaller`, `ComprobanteNotYetUploaded`, `ComprobanteMissingOnConfirm`, `OrderAlreadyConfirmedByRole`, `OrderNotOwnedByCaller`, `SelfPurchaseNotAllowed` **(new)**, `OrderConfirmationOutOfOrder` **(new)**, `ComprobanteInvalidFile` **(new)**, `ComprobanteLocked` **(new)**, `OrderNotCancellable` **(new)**, `OrderNoLongerActive` **(new)**, `TooManyOpenOrders` **(new)** |
| `commission` | COM | `CommissionAccount`, `CommissionLedgerEntry`, `TopUpRequest`, `CommissionRateSetting` | `CommissionBalanceExhausted`, `CommissionBalanceReplenished` | `TopUpAmountInvalid` **(new)**, `TopUpNotPending` **(new)**, `TopUpNotVisibleToCaller` **(new)**, `CommissionRateNotFutureDated` **(new, ARCH §8.1)**, `TopUpNotFound` **(new, ARCH §8.1)**, `TopUpProofInvalidFile` **(new, ARCH §8.1)** |
| `trading` | TRD | `TradeOffer`, `TradeOfferRound` | `TradeAccepted` | `SelfTradeNotAllowed` **(new)**, `NotYourTurn` **(new)**, `TradeOfferNotOpen` **(new)**, `DuplicateOpenOffer` **(new)**, `EmptyTradeOffer` **(new)**, `TradeNotAccepted` **(new)**, `TradeAlreadyConfirmedByRole` **(new)**, `TradeOfferNotVisibleToCaller` **(new)**, `TradeNotCancellable` **(new)**, `TradeCounterUnchanged` **(new, ARCH §8.1)**, `TradeRoundLimitReached` **(new, ARCH §8.1)** |
| `messaging` | MSG (in-app) | `Conversation`, `Message`, `ConversationParticipant` (holds the read state as `lastReadSeq`) | — | `ConversationNotVisibleToCaller` **(new)**, `BusinessCannotInitiate` **(new)** |
| `collections` | COL | `Collection` (with its binder layout and sort), `CollectionEntry`, `WishlistEntry`, `PostPurchasePrompt` | — | `CollectionNotFound`, `CollectionNameTaken` **(new)**, `CollectionEntryNotFound` **(new)**, `InvalidExternalLink` **(new)**, `PromptAlreadyResolved` **(new)**, `CollectionLimitReached` **(new, ARCH §8.1)**, `InvalidCatalogEntry` **(new, ARCH §8.1)** |
| `collections` | VAL | — (computed read model over COL's tables and CAT's queries; no stored valuation) | — | `InvalidValuationPeriod` **(new)** |
| `reviews` | REP | `Review`, `ReviewModerationLog` | — | `TargetNotFound`, `NotVerifiedPurchaser`, `DuplicateReview` **(new)**, `ReviewNotFound` **(new)** |
| `shared-kernel` | (API boundary) | — | — | `RequestValidationFailed` **(new)**, which covers shape-level input errors (type, length, required, enum) with per-field issues. It is kept separate from the domain codes above, which are reserved for domain-rule violations. OQ-7 is resolved: `shared-kernel` owns the boundary code, and only the tRPC input parser raises it (AD-SYS-1 rule 7). `EventDeliveryNotReplayable` **(new, ARCH §8.1)** is refused by the admin replay of a failed event delivery (AD-SYS-2). |

**Two ownership notes that refine AD-11 without contradicting it:**
- **`SellerNotVerified` owner.** AD-11 assigns `SellerNotVerified` to `identity`, and this PRD keeps it there under VER because its trigger is an application state: it fires only when the latest application is `Rejected` (FR-IDN-3, FR-VER-6); a `Pending` business may list. `listings` calls identity's listing-eligibility check and propagates the error unchanged.
- **`NotBusinessAccount` owner.** `NotBusinessAccount` stays with `identity` (IDN). `messaging` calls identity's messaging-eligibility check and propagates the error.

### 4.3 Cross-module interactions used by this package

Every interaction is one of the two AD-6/AD-9 patterns: a **synchronous command/query** in the caller's transaction, or a **post-commit event**.

| From → To | Kind | Interface (public application service) | Used by |
| --- | --- | --- | --- |
| listings → identity | sync query | `identity.getListingEligibility(userId)` · `identity.getSellerKinds(userIds[])` · `identity.isVerifiedBusiness(userId)` · `identity.getContactDetails(userId)` | FR-INV-1, FR-DSC-4, FR-INV-7, FR-MSG-1 |
| listings → catalog | sync query | `catalog.resolveItemRefs(refs[])` · `catalog.getEntries(ids[])` · `catalog.getPriceProvenance(ids[])` | FR-INV-1, FR-DSC-1, FR-DSC-7 |
| orders → listings | sync command in the caller's transaction | `listings.reserveForPurchase(tx, listingId, qty, buyerId)` · `listings.releaseReservation(tx, reservationRef)` | FR-ORD-1, FR-ORD-8 |
| orders → identity | sync query | `identity.getBusinessPaymentInstructions(businessId)` | FR-ORD-1 |
| trading → listings | sync query + sync command in the caller's transaction | `listings.getTradeability(listingId)` · `listings.resolveItemRefs(refs[])` · `listings.reserveForTrade(tx, listingId, 1)` · `listings.releaseReservation(tx, …)` · `listings.generateContactMessage(...)` | FR-TRD-1, FR-TRD-4, FR-TRD-6 |
| messaging → identity | sync query | `identity.getMessagingEligibility(recipientUserId)` | FR-MSG-4 |
| collections → catalog | sync query | `catalog.getEntries` · `catalog.getReferencePricesAsOf(ids[], dates)` · `catalog.getPriceProvenance(ids[])` · `catalog.getFxRate(date)` | FR-COL-*, FR-VAL-* |
| collections → listings | sync query | `listings.getAvailabilitySummary(catalogEntryIds[], area?)` | FR-COL-6 |
| reviews → orders | sync query | `orders.hasClosedPurchase(buyerId, businessId)` | FR-REP-1 |
| reviews → identity | sync query | `identity.getReviewTarget(userId)` | FR-REP-1, FR-REP-2 |
| commission → identity | event subscription | `BusinessApplicationApproved` → create the `CommissionAccount` | FR-COM-1 |
| listings ⇠ identity | event subscription | `BusinessApplicationRejected` → withdraw; `BusinessApplicationApproved` → restore + badge | FR-INV-8 |
| commission ⇠ orders | event subscription | `OrderPaymentConfirmedByBusiness` or `OrderClosed`, whichever arrives first → deduct once per order | FR-COM-4 |
| listings ⇠ commission | event subscription | `CommissionBalanceExhausted` / `Replenished` → pause / resume | FR-INV-7 |
| collections ⇠ orders | event subscription | `OrderClosed` → one prompt | FR-COL-7 |

`listings ⇠ identity` and `commission ⇠ identity` follow compile-time edges that AD-1 already allows (`listings → identity`, `commission → identity`). **`trading → catalog` is not an AD-1 edge.** For that reason `trading` validates offered item references through `listings.resolveItemRefs`, which delegates to `catalog` (OQ-6).

## 5. Global Boundaries and Non-Goals

**Inherited and non-negotiable** (task statement §5, Constraint 8):
- No payment gateway, no funds-held state, no escrow.
- Module boundaries are real (AD-1, AD-8).
- Cross-module writes use one of exactly two patterns (AD-6, AD-9, AD-10).
- Money is integer COP, and USD/COP reference pairs are a separate value object.
- Dates are stored as UTC ISO 8601 and rendered in `America/Bogota`; IDs are `cuid2`.
- Errors are `DomainError` codes with exactly one owner each (AD-11).
- Moderation hides and never deletes (AD-12).
- The platform is Colombia-only, with Ley 1581 treatment of regulated data (AD-13, AD-17).

**Non-goals for this package.** The SPEC non-goals are inherited, and these are added or restated for Plan-2:
- **Payment gateway or provider webhook in V1** — that includes commission top-ups. The top-up confirmation sits behind a port (FR-COM-2) so a provider webhook can be added in v2. Adding one would need a SPEC amendment, because SPEC rules out payment-gateway integration of any kind.
- **Choosing the production catalog/price feed.** The feed is a port. Development and tests use a fixture. The production source, and its licensing, is an open question (OQ-9).
- **Changing the commission rate value.** The rate is a configurable parameter (FR-COM-7); its value is a SPEC non-goal.
- **The individual-seller → verified-business transition.** SPEC flags it as Risky and it stays out of scope; AD-18 only prevents the invalid simultaneous state. The reverse path (a Rejected business completing the individual profile) is decided in OQ-1.
- **Revoking an already-Approved business.** An admin can hide that business's listings (FR-REP-5); a revocation state machine is v2 [ASSUMPTION].
- **Account suspension or deactivation.** V1 has no account status beyond "authenticated, consented, email verified" (FR-IDN-1). Abusive users are handled by hiding their content [ASSUMPTION].
- **Buyer-side block and reporting in messaging.** Deferred (review F-29). Revisit if harassment reports arrive after launch. The lighter buyer-side mute was adopted at the Phase 2 gate as FR-MSG-8.
- **Cédula de extranjería applicants.** Business verification accepts NIT only (FR-VER-1) [ASSUMPTION].
- **Dispute resolution, buyer-protection deposits, stalled-order escalation** (SPEC non-goals, AD-2).
- **Review anti-abuse beyond the purchase gate**, including self-review and collusion detection for individual-seller reviews (SPEC non-goal). The reputation UI shows the gated/ungated distinction instead (FR-REP-3).
- **User-submitted moderation reports.** CAP-28 fixes the admin mechanism, not a reporting channel [ASSUMPTION].
- **Real-time push, native app, offline mode** (SPEC constraints). In-app message freshness is achieved by polling (NFR-MSG-2).
- **Ley 1581 data-subject request tooling** (access, correction, deletion). Requests go through the published contact channel (AD-13) and are handled manually by an admin at launch. Deletion versus hide-never-delete is spine-deferred. Retention periods per regulated-data class are decided in OQ-12.

## 6. The Explainable Decision Shape

Every automated decision returns the same shape (task statement Constraint 4). That covers rejections, gates, pauses, hides, withdrawals, staleness labels, price-provenance choices and result placements. The architecture phase fixes the type once (Phase 3); this PRD fixes its required content.

```text
Decision {
  outcome:      'allowed' | 'allowedWithNotice' | 'rejected' | 'paused' | 'unverified' | 'withdrawn' | 'hidden'
              | 'stale' | 'excluded' | 'ranked' | 'notValued' | 'unfulfillable'   // closed set; adding a value is a PRD change
  reasonCode:   DomainError code (for a rejection) or a module-owned PascalCase DecisionCode (for a non-error decision)
  humanMessage: plain-language text in the TEZG tone of voice, rendered in es-CO at launch
  citations:    [{ rule: 'CAP-17' | 'AD-6' | 'FR-INV-3' | 'POL-VER-DataMismatch' | ..., inputs: { name: value, ... } }]  // ≥ 1 entry
  occurredAt:   UTC timestamp from the virtual clock
}
```

**Rules for every decision:**
- **Specific messages.** A `humanMessage` names what happened and what the person can do next, and never uses generic status language. The list of forbidden phrases lives in `ADD-§1.2` and is enforced by NFR-SYS-1. The tone examples come from the product brief: "Your listings are paused until you top up your balance.", not "Account suspended due to insufficient funds."
- **Mandatory citations.** `citations[].inputs` carries the values that triggered the decision, for example `{ requested: 2, available: 1 }`. It never carries regulated values such as `legalIdentity` fields, comprobante keys or phone numbers (NFR-SYS-2).
- **DecisionCode ownership.** DecisionCodes (for example `ListingPausedBalanceExhausted`, `ReferencePriceStale`) follow the same one-owner rule as DomainError codes. They are listed per module in `ADD-§3.2`.
- **Language.** UI copy launches in Spanish (Colombia) [ASSUMPTION: es-CO is the launch locale, and English copy in this PRD is illustrative]. Messages are locale-keyed templates filled with typed inputs, never concatenated strings.

## 7. System-Wide Non-Functional Requirements

**Measurement protocol for every latency NFR in this document**, unless a requirement says otherwise [ASSUMPTION]:
- **Environment:** the Docker Compose stack on a reference machine with 4 vCPU and 8 GB RAM, loaded with the §3 seed.
- **Sampling:** a 50-request warm-up, then 500 requests.
- **Reporting:** the p95 of server-side handler time, excluding network and client rendering.
- **Scope of the verdict:** latency and concurrency targets are verified in this reference environment. Production (Vercel plus the Supabase pooler) differs, so a **non-gating production smoke check** runs the same read and command mix at low volume after each deploy and reports p95 without blocking. Whether interactive transactions and row locks behave identically through the production pooler is proven in Phase 3 (an architecture decision candidate).

- **NFR-SYS-1 Explainability coverage.**
  - **Decision coverage:** 100% of rejection and gate responses across the 12 modules return a `Decision` with a non-empty `reasonCode`, a `humanMessage` and at least one citation with its triggering inputs. This is verified by a contract test that runs every DomainError trigger listed in `ADD-§3`.
  - **Forbidden phrases:** zero `humanMessage` templates match the forbidden-phrase list (`ADD-§1.2`), checked in CI.
- **NFR-SYS-2 Regulated data never leaks.** Zero occurrences of any of the following in application logs, error messages, `Decision.citations`, event payloads or analytics:
  - a `legalIdentity` field value or document key;
  - a comprobante object key or signed URL;
  - a top-up comprobante key;
  - an individual seller's phone number;
  - an in-app message body.

  This is verified by a log-capture scan over the full test suite, seeded with canary values.
- **NFR-SYS-3 Independent executability.** Each module's test suite runs with only PostgreSQL (Docker Compose) and fakes of its neighbours' public interfaces. No test makes an outbound network call; the test harness fails any socket opened outside Postgres. A clean checkout runs any single module's suite with one command.
- **NFR-SYS-4 Virtual time.** Every time-dependent rule reads an injectable clock: cooldowns, freshness, offer and order expiry, trend windows and `occurredAt`. Domain and application code make zero direct reads of the system clock, enforced by a lint rule. Dates are rendered in `America/Bogota` only in the presentation layer.
- **NFR-SYS-5 Money-shape safety.**
  - **Integer COP:** all COP amounts are integers, and no floating-point arithmetic touches COP. This is enforced by the type system (`Cop` and `ReferencePrice` are distinct branded types) and by a lint rule banning `number` arithmetic on `Cop` outside the money helpers.
  - **No cross-assignment:** zero code paths assign a `ReferencePrice` component to a `Cop` listing or transaction field.
  - **Rounding:** every rounding rule is named and lives in `ADD-§2`.
- **NFR-SYS-6 Post-commit events are exactly-once in effect.** AD-10's dispatch is adopted. Because this is a launch, the following is added:
  - **Idempotent subscribers:** every subscriber is idempotent by a natural key (`orderId`, `applicationId`, ledger sequence).
  - **Failure log:** every subscriber failure is recorded in a failed-delivery log with the full snapshot payload. Payloads there are redacted per NFR-SYS-2, keeping only ids.
  - **Admin replay:** an admin can replay a logged delivery. Replaying any delivery N ≥ 2 times produces the same end state as delivering it once, and each subscriber has a test proving that.
  - **No automatic retry of a recorded failure**, consistent with AD-10. A delivery whose failure was never recorded (the process died mid-attempt) gets at most 3 automatic attempts, then is recorded as failed (ARCHITECTURE AD-SYS-2).
  - **Alerting:** the admin console shows a badge with the count and age of unreplayed failures and the count of deliveries stuck undelivered for more than 24 h, and admins receive a daily digest while any exist. Target: zero deliveries unresolved for more than 24 h, counting recorded failures from their first failure and deliveries stuck undelivered from their creation (§22).
  - *(OQ-4 is resolved: the log is the shared-kernel `EventDelivery` table, and replay runs from the event panel on page 2.3. See AD-SYS-2 and ARCHITECTURE §7.3.)*
- **NFR-SYS-7 Server-side authorization.** Every command and every non-public query checks the actor server-side from the session's `userId`. Roles are derived per request (AD-16) and never read from a client claim. Unauthenticated calls to protected procedures return `NotAuthenticated`; admin procedures called by a non-admin return `AdminOnly`. This is verified by a generated test that calls every protected procedure without a session and with a non-admin session.
- **NFR-SYS-8 Admin audit trail.** Every admin action writes an append-only audit record `{adminId, action, targetId, reason?, before?, after?, at}` in the owning module's own table (AD-12: no shared moderation table). That covers approve, reject, rejection-reason change, top-up confirm or reject, hide, unhide, capability-trace read, `legalIdentity` read, feed run and failed-event replay. The records are never updated or deleted. Retention: indefinite at launch [ASSUMPTION].
- **NFR-SYS-9 Latency baseline.** Unless a module NFR states otherwise:
  - interactive reads return within **p95 ≤ 1,000 ms**;
  - commands return within **p95 ≤ 800 ms**, excluding file-upload transfer time.
- **NFR-SYS-10 Concurrency proofs run on PostgreSQL.** Every concurrency NFR runs against the Docker Compose PostgreSQL instance under real concurrent connections (at least 50 in the pool), never against SQLite or in-memory stores. Each proof runs 100 repetitions with zero violations. At minimum this covers IDN, VER, INV, ORD, COM, TRD and COL.
- **NFR-SYS-11 Accessibility.** Responsive (R) and desktop-first (D) surfaces meet WCAG 2.2 AA: contrast, keyboard operation, focus order, and status messages announced through live regions. Status is never conveyed by colour alone, which matters for the Trusted Ledger `status-*` tokens. Verified by automated axe checks with zero serious or critical violations, plus a manual keyboard pass per page spec.
- **NFR-SYS-12 Platform personal-data consent** [ASSUMPTION; extends beyond AD-13's `legalIdentity`-only scope, see OQ-5].
  - **At sign-up:** account creation records `signupConsentVersion` and `signupConsentAt` on `User`, in the same insert as the `User` row, so no personal data is stored without them (AD-IDN-3).
  - **At profile completion:** the individual-seller profile step records a separate consent to share the contact phone number with buyers who request contact (FR-IDN-2).
- **NFR-SYS-13 Error-code integrity.** In CI:
  - every thrown `DomainError` resolves to exactly one owning module in the registry (§4.2 / `ADD-§3`);
  - no module declares a code another module owns;
  - no DomainError is caught and re-thrown as a different code across a module boundary (AD-11).
- **NFR-SYS-14 Abuse baseline** [ASSUMPTION: values are OQ-11 parameters].
  - **Auth throttling:** sign-in is limited to 10 failed attempts per account per 15 minutes and 30 per IP per 15 minutes; sign-up to 5 per IP per hour. A throttled attempt is refused with `AuthRateLimited` (identity), whose message says when to retry.
  - **Email verification:** an account must have a verified email before its first contact request, order, trade offer or message (FR-IDN-1 `canBuy`, FR-MSG-1, FR-ORD-1, FR-TRD-1, FR-MSG-5).
  - **Per-IP contact limit:** at most 60 contact requests per IP per hour, on top of the per-requester limits in FR-MSG-3. This blunts phone harvesting through multiple free accounts.
  - **Upload scanning:** every uploaded file (applicant documents, comprobantes, top-up proofs) passes the AD-SYS-8 pipeline: size, magic bytes, then `MalwareScanner`. The V1 scanner is `StructuralScanner` (gate item G-4); ClamAV-class scanning is deferred (ARCHITECTURE §14). Admins open uploads only in the platform's sandboxed viewer, never as downloads.
  - **Verification:** a test per limit proves that the (N+1)th attempt in the window is refused and that the window resets on the virtual clock.

## 8. Glossary of Listing and Account States

These states are used across modules; each is defined once here.

| State | Applies to | Visible in browse | Purchasable | Editable by owner | Set by |
| --- | --- | --- | --- | --- | --- |
| **Active** | any listing | yes | business: when Approved and not paused; individual: never in-platform (CAP-6) | yes | INV |
| **Unverified** | business listing while the application is `Pending` | yes, without the verified badge | no | yes | derived from VER state (FR-INV-7) |
| **Paused** | business listing when the commission balance is ≤ 0 | yes, labelled "paused" | no | yes | INV on COM events (AD-3) |
| **Withdrawn** | business listing after the application is `Rejected` | no | no | view only | INV on VER events (FR-INV-8) |
| **Hidden** | any listing or review | no (admin view only) | no | view only, with the moderation reason | REP moderation (AD-12) |
| **Sold out** | any listing whose inventory unit(s) have 0 available | yes, labelled "sold out" | no | yes (restock) | derived from `InventoryUnit` |
| **Deactivated** | any listing the seller turned off | no | no | yes (reactivate) | INV (seller action) |

**Seller kind** is derived from account facts by IDN (FR-IDN-1) and is never stored on a listing:
- `individual`: the profile step is complete.
- `business`: the latest business application is Pending, Approved or Rejected, and the profile step is not complete.
- `none`: neither.

`pickupAvailable` = (seller kind = `individual`), computed on read (AD-5).


## How to Read a Module Section

Every FR has the same five facets:
- **Trigger:** who or what invokes it.
- **Inputs:** with their bounds.
- **Rules:** validation and behaviour, in evaluation order. Evaluation happens in two stages:
  - **Shape and field validation first.** Type, length, required-field and enum checks (`RequestValidationFailed`, `MissingRequiredField`) run before any domain rule and **aggregate** every field issue into one response.
  - **Domain rules second, first-fail.** When several domain rules fail, the first failing rule's code is returned.
- **Output:** the success result, and its `Decision` where one applies.
- **Acceptance:** a condition that a test can check.

Traces sit on the FR's heading line: CAPs first, then the inherited ADs the FR relies on. "Explained" means the response carries the §6 `Decision` shape. Error trigger conditions are consolidated in `ADD-§3`.

---

## 9. IDN — User, Role & Seller-Type Access Manager

**Host:** `identity` · **Tier:** Foundation · **Form factor:** H (capability API explorer) + D (admin account inspector) · **Protagonists:** Valentina, Andrés, Sebastián

**Purpose.** Give every other module one trustworthy, server-side answer to "what can this account do right now, and why?", derived from independent account facts. Also keep the individual-seller and business states mutually exclusive, even under concurrent requests.

**Owns.** Account facts on `User`:
- `isAdmin`
- `isIndividualSellerProfileComplete`
- the privacy-consent fields
- the latest-business-application pointer, read from VER

It also owns:
- `IndividualSellerProfile`: display name, contact phone, phone-sharing consent, default meeting point;
- the capability-derivation function;
- the listing-, messaging- and review-target eligibility queries;
- the seller-type exclusivity guard (AD-18);
- the admin capability-trace read and its audit rows.

**Consumes.** The Better Auth session (`userId` only) and VER's application state, which lives in the same host, through VER's in-module query.

**Fakes in the module's own suite.**
- a fixture session carrying `userId`;
- a VER stub returning a scripted application state;
- a caller stub that simulates `listings.createListing` asking for eligibility.

**Seed.** The §3 account set. Of those, 20 accounts are purpose-built:
- 5 with both roles possible but neither started;
- 5 individual sellers mid-profile;
- 3 Pending, 3 Approved and the 3 Rejected businesses from §3 (one in cooldown, one with an expired cooldown, one barred);
- 1 admin who is also a buyer;
- the 5 buyers from §3 whose email is not yet verified.

### Functional requirements

**FR-IDN-1 — Derive capabilities server-side.** · CAP-19, CAP-5 · AD-16
- *Trigger:* any protected procedure, and `identity.getCapabilities(userId)`.
- *Inputs:* `userId` from the session. No role, seller-kind or capability claim is accepted from the client; unknown input keys fail with `RequestValidationFailed`.
- *Rules:* Capabilities are computed on every call from current facts and never cached across requests.
  - `canBuy` = the session is authenticated, sign-up consent is recorded (NFR-SYS-12) and the email is verified (NFR-SYS-14). V1 has no suspension state (§5). Commands that need `canBuy` and find it false are refused with `EmailNotVerified`, whose message names the verification step.
  - `canListAsIndividual` = `isIndividualSellerProfileComplete`.
  - `canListAsBusiness` = the latest application is `Pending` or `Approved`.
  - `isVerifiedBusiness` = the latest application is `Approved`.
  - `canReceiveInAppMessages` = the latest application is `Pending` or `Approved`.
  - `canModerate` = `isAdmin`.
  - `sellerKind` follows §8.
  - Buyer and seller capabilities are not exclusive: a user can hold `canBuy` and `canListAsIndividual` at once.
- *Output:* `{ capabilities: {name: boolean}, sellerKind, derivedFrom: [{fact, value}] }`.
- *Acceptance:*
  - Valentina's account (profile complete, no application) yields `canBuy=true`, `canListAsIndividual=true` and `canListAsBusiness=false` from a single call.
  - Sending `role: "business"` in the request body yields `RequestValidationFailed`, and no capability changes.
  - A seeded buyer with an unverified email yields `canBuy=false`, with `derivedFrom` citing `emailVerified=false`.

**FR-IDN-2 — Complete the individual-seller profile step.** · CAP-19 · AD-18
- *Trigger:* a buyer who wants to sell as an individual (for example Valentina) submits the profile step.
- *Inputs:*
  - `displayName`: 2–40 Unicode grapheme clusters.
  - `contactPhone`: a Colombian mobile number, stored in E.164 form as `+57` followed by 10 digits starting with `3`.
  - `phoneSharingConsent`: must be `true`.
  - `defaultMeetingPoint`: lat/lng inside the Colombia bounding box (`ADD-§2.4`) plus a city label of 2–60 characters.
- *Rules:*
  1. If the latest application is `Approved`, reject with `AlreadyVerifiedBusiness`.
  2. If the latest application is `Pending` or `Rejected`, reject with `BusinessApplicationOnFile`. For `Rejected` this is an [ASSUMPTION] pending OQ-1.
  3. If the profile is already complete, reject with `IndividualSellerProfileAlreadyComplete`.
  4. Otherwise write the profile and set `isIndividualSellerProfileComplete=true`, together with `phoneSharingConsentAt` and `phoneSharingConsentVersion`. The write is one atomic conditional update, so rules 1–3 are re-checked at write time (FR-IDN-4).
- *Output:* the updated capabilities (FR-IDN-1).
- *Acceptance:*
  - After success, FR-IDN-1 returns `canListAsIndividual=true`.
  - Invalid input (for example a phone number that doesn't start with 3) returns field-level `RequestValidationFailed` issues, and no flag changes.

**FR-IDN-3 — Answer listing eligibility.** · CAP-19, CAP-5 · AD-11
- *Trigger:* `identity.getListingEligibility(userId)`, called by `listings` before creating a listing and before re-enabling a deactivated one.
- *Rules:* Checked in this order:
  1. If `sellerKind='business'` and the latest application is `Rejected`, answer `SellerNotVerified`. The citation says whether the business is in cooldown, with the reapply date, or permanently barred (FR-VER-6).
  2. If `sellerKind='business'` and the application is `Pending` or `Approved`, answer allowed, with `listingKind='business'` and `verified` = (status is `Approved`).
  3. If `sellerKind='individual'`, answer allowed, with `listingKind='individual'`.
  4. If `sellerKind='none'`, answer `IndividualSellerProfileIncomplete`. The citation names the profile step as the way forward.
- `listings` propagates the error unchanged. A business account is exempt from the profile-step gate (CAP-19).
- *Output:* a `Decision` with `outcome` `allowed` or `rejected` and `listingKind`.
- *Acceptance:*
  - A `Pending` business is allowed with `verified=false`.
  - A `Rejected` business gets `SellerNotVerified`, never `IndividualSellerProfileIncomplete`.
  - An account with neither state gets `IndividualSellerProfileIncomplete`, never `SellerNotVerified`.

**FR-IDN-4 — Guard seller-type exclusivity atomically.** · CAP-5, CAP-19 · AD-18
- *Trigger:* FR-IDN-2 (profile completion) and FR-VER-1 (application submission).
- *Rules:* Each state-granting action is a single conditional write that succeeds only if the opposing state is absent at write time.
  - Profile completion requires "no application on file".
  - Submission requires "profile not complete".
  - A read-then-write check is prohibited.
  - The loser of a race receives the explained code for the state that won: `AlreadyVerifiedBusiness` or `BusinessApplicationOnFile` when completing the profile, and `IndividualSellerProfileAlreadyComplete` when submitting an application.
  - There is no "graduation" path in either direction (§5).
- *Output:* success for exactly one action; an explained rejection for the other.
- *Acceptance:* covered by the mandatory edge case (NFR-IDN-2).

**FR-IDN-5 — Capability audit trace for admins.** · CAP-15 (support) · AD-16, AD-13
- *Trigger:* Sebastián requests `identity.traceCapabilities(targetUserId)` from the account inspector.
- *Rules:*
  - Admin only; others get `AdminOnly`.
  - The trace lists every capability from FR-IDN-1 with its value and the facts, and fact timestamps, that produced it. Examples: "`canListAsBusiness=false` because the latest application `appl_…` is `Rejected` (reason `DataMismatch`, reapply from 2026-10-08)".
  - `legalIdentity` values are never part of the trace (AD-13).
  - Every trace read writes a `CapabilityAuditRead` row (NFR-SYS-8).
- *Output:* the trace, rendered in the TEZG tone, one line per capability.
- *Acceptance:* the trace for any seed account names at least one source fact per capability, and a matching audit row exists after the read.

**FR-IDN-6 — Messaging, review-target and seller-kind queries.** · CAP-18, CAP-7, CAP-1 · AD-1
- `getMessagingEligibility(recipientId)`:
  - A business that is `Approved` → allowed, `verified=true`.
  - A business that is `Pending` → allowed, `verified=false`, with notice code `RecipientNotYetVerified`.
  - Anything else → `NotBusinessAccount`, including a `Rejected` business [ASSUMPTION], an individual seller, and a buyer.
- `getReviewTarget(userId)` returns `{ kind: 'business' | 'individual' | 'none', verified }`.
- `getSellerKinds(userIds[])` returns `sellerKind` for up to 500 ids in one call.
- *Acceptance:* each query answers with the current state on every call. A status change is reflected on the next call, with no cache.

**FR-IDN-7 — Authentication and admin gating.** · CAP-15, CAP-28 (admin gating); cross-cutting to every authenticated CAP (authentication) · AD-16, AD-12
- *Rules:* A missing or expired session returns `NotAuthenticated`. A non-admin calling an admin procedure receives `AdminOnly`. Both return a `Decision` whose human message says what to do next, for example "Sign in to continue."
- *Acceptance:* NFR-SYS-7's generated test passes for every procedure.

### Non-functional requirements

- **NFR-IDN-1:** `getCapabilities`, `getListingEligibility` and `getSellerKinds` (500 ids, the interface maximum) each respond in p95 ≤ 50 ms under the §7 protocol, because they run inside other modules' request paths.
- **NFR-IDN-2 (mandatory edge case):** 100 repetitions of the race below, each on a fresh account, give exactly one success and one explained rejection every time.
  - The race: FR-IDN-2 and FR-VER-1 fire truly concurrently for the same account, on separate connections released by a barrier.
  - Both-succeeded is observed 0 times, and neither-succeeded is observed 0 times.
  - The database never holds `isIndividualSellerProfileComplete=true` together with an application on file. This is checked by a query after each repetition.
- **NFR-IDN-3:** 0 procedures accept a client-supplied role, seller-kind or capability field, verified by a schema scan of every tRPC input.

### Scenario trace

| Annex scenario | FRs | Proof |
| --- | --- | --- |
| 1 Dual-role derivation | FR-IDN-1 | Valentina: one call returns buyer + individual seller, derived from facts |
| 2 First-listing profile gate | FR-IDN-3, FR-IDN-2 | `IndividualSellerProfileIncomplete`, then the step is completed, then listing is allowed; a `Pending` business is exempt |
| 3 Seller-type exclusivity | FR-IDN-4, FR-IDN-2, FR-VER-1 | the second state-granting action is rejected with an explained code |
| 4 Capability audit query | FR-IDN-5 | Sebastián receives the trace; an audit row is written |
| Edge: simultaneous profile + application | FR-IDN-4 | NFR-IDN-2 |

**Out of scope:** account deletion and data-subject tooling (§5); social login providers (a Better Auth configuration choice, `addendum`); converting a seller of one kind into the other kind.

---

## 10. VER — Business Verification Workflow

**Host:** `identity` · **Tier:** Intermediate · **Form factor:** D (admin review queue, rejection-policy settings) + R (applicant form and status) · **Protagonists:** Andrés, Sebastián

**Purpose.** Move a business from application to a verified state only through an explicit admin action. Treat the application's legal identity as regulated personal data. Let a rejected business reapply under a per-reason policy that admins control.

**Owns.**
- `BusinessApplication`: status machine, submitted fields, `legalIdentityConsentGivenAt` and `legalIdentityConsentVersion` (AD-13), `decidedBy`, `decidedAt`, `rejectionReasonCode`, `rejectionNote`, `reapplyNotBefore` and `reapplyBarred`.
- `BusinessProfile`: public name, city, external presence URL, and the payment instructions shown to buyers.
- `RejectionReason`: the policy table.
- `RejectionReasonChange`: that table's audit.
- `LegalIdentityAccessLog`.
- The events `BusinessApplicationApproved` and `BusinessApplicationRejected`.

**Consumes.** Object storage for legal-identity documents, with private bucket paths. IDN's exclusivity guard (FR-IDN-4).

**Fakes.**
- an in-memory object store;
- an IDN stub;
- a recording event publisher standing in for `listings` and `commission` subscribers.

**Seed.**
- The 14 business accounts of §3, with 15 applications in total. The one Approved business that was previously rejected carries a two-application history: Rejected (`DataMismatch`), then Approved.
- The 3 Rejected businesses cover each reapplication path: cooldown active, cooldown expired, and barred.
- The default rejection-reason table (`ADD-§9`).
- 3 admins.

### Functional requirements

**FR-VER-1 — Submit a business application.** · CAP-15, CAP-5 · AD-13, AD-18
- *Trigger:* Andrés submits the applicant form.
- *Inputs:*
  - `businessName`: 2–80 characters.
  - `legalIdentity`:
    - `type` is `NIT` or `CC`.
    - `number` is 6–10 digits for a CC. For a NIT it is a base of 6–10 digits plus a check digit, and the check digit is validated with the DIAN mod-11 algorithm (`ADD-§2.5`). The 6–10 range covers personas naturales, whose NIT base is their cédula, as well as companies' 9-digit NITs. Cédula de extranjería is out of scope at launch (§5).
    - `document` is 1–3 files, each PDF, JPEG or PNG and ≤ 5 MB.
  - `externalPresenceUrl`: https, ≤ 2,048 characters, pointing to an Instagram profile or a website.
  - `city`: one of the supported cities, or free text of 2–60 characters.
  - `paymentInstructions`: bank name, account type, account number of 6–20 digits, account-holder name, and an optional QR image under the same file rules.
  - `consentAccepted`: must be `true`, and `consentVersion` must equal the current privacy-notice version.
- *Rules:*
  1. The IDN exclusivity guard (FR-IDN-4) applies.
  2. If an application is `Pending`, the submission is rejected with `ApplicationAlreadyPending`, with the citation "an application is already under review".
  3. If the latest application is `Rejected`, apply FR-VER-6.
  4. If the latest application is `Approved`, reject with `AlreadyVerifiedBusiness`.
  5. A missing required field yields `MissingRequiredField` naming each missing field. A malformed field yields `RequestValidationFailed` with one issue per field. Both are field-level, and all issues are reported in one response. This is the shape-validation stage ("How to Read"): it runs before rules 1–4, which are first-fail.
  6. On success, create a new `BusinessApplication` in `Pending` with the consent timestamp. Earlier applications stay retained, and history is never overwritten.
- *Output:* `{ applicationId, status: 'Pending', submittedAt }`. The status view (FR-VER-7) shows "We're reviewing your application — we'll let you know here."
- *Acceptance:*
  - A valid submission creates exactly one `Pending` row whose consent fields are non-null.
  - A submission missing `externalPresenceUrl` and with a bad NIT check digit returns two field-level issues and creates no row.

**FR-VER-2 — Admin review queue.** · CAP-15 · AD-13
- *Trigger:* Sebastián opens the queue.
- *Rules:*
  - Admin only.
  - Lists `Pending` applications oldest-first by `submittedAt`, with `applicationId` as the tie-break, 25 per page.
  - Each row shows the business name, city, external presence URL, submission age and prior-application count.
  - `legalIdentity` is available only inside the review detail (FR-VER-5).
  - Opening, approving or rejecting an unknown application id returns `ApplicationNotFound` (this applies to FR-VER-3, FR-VER-4 and FR-VER-5 as well).
- *Acceptance:* with 1,000 pending applications the ordering is total and stable across page loads.

**FR-VER-3 — Approve.** · CAP-15, CAP-5 · AD-13
- *Trigger:* Sebastián approves from the review detail.
- *Rules:*
  - A single conditional transition `Pending → Approved`, applied where status = `Pending`, stamping `decidedBy` and `decidedAt`.
  - If zero rows are affected, return `ApplicationNotPending` with the current status, the deciding admin and the decision time.
  - The admin audit row is written in the same transaction.
  - After commit, publish `BusinessApplicationApproved` with the snapshot `{ applicationId, businessId, businessName, approvedAt, approvedBy }`.
- *Effects (via subscribers):*
  - INV restores withdrawn listings and shows the verified badge (FR-INV-8).
  - COM creates the commission account (FR-COM-1).
- *Acceptance:* before approval, none of Andrés's listings carries the verified badge; after the event is handled, all of them do.

**FR-VER-4 — Reject with a policy reason.** · CAP-15 · AD-13
- *Trigger:* Sebastián rejects the application, picking a `RejectionReason` and optionally adding a note of up to 500 characters that the applicant will see.
- *Rules:*
  - The same conditional-transition rule as FR-VER-3 applies (`Pending → Rejected`).
  - An inactive or unknown reason code is refused with `RejectionReasonUnknown`.
  - At decision time the transition snapshots the reason's policy onto the application:
    - `reapplyNotBefore` = `decidedAt` + cooldown days, or
    - `reapplyBarred=true`.
  - Later policy edits never change an already-decided application [ASSUMPTION].
  - After commit, publish `BusinessApplicationRejected` with the snapshot `{ applicationId, businessId, reasonCode, reapplyNotBefore | barred, rejectedAt }`.
- *Effects:* INV withdraws the business's listings (FR-INV-8).
- *Output to Andrés:* the reason's plain-language text plus the reapplication condition. For example: "Some of the details you sent don't match your registration documents. You can apply again from 8 Oct 2026."
- *Acceptance:* the applicant view shows the reason text and the exact reapply date (or "you can't reapply") taken from the snapshot.

**FR-VER-5 — Access to legal identity only through admin review.** · CAP-15 · AD-13, AD-17
- *Rules:*
  - `legalIdentity` values and documents are readable through exactly one procedure: `identity.getApplicationForReview(applicationId)`, which is admin only.
  - Documents are served through signed URLs with a 10-minute TTL, and no public object URL exists.
  - Every read writes a `LegalIdentityAccessLog` row `{adminId, applicationId, fieldsRead, at}`.
  - Every other path is refused with `LegalIdentityAccessDenied`, explained, and audited with the denied actor. That covers any other procedure, a non-admin caller, and any other module's query. Other modules' public queries return business data without `legalIdentity`.
- *Acceptance:*
  - A non-admin session calling `getApplicationForReview` receives `LegalIdentityAccessDenied`, and a denial row is written.
  - A code scan finds no reference to the `legalIdentity` columns outside the VER review repository.

**FR-VER-6 — Reapplication policy.** · CAP-15 · (Plan-2 decision)
- *Rules:*
  - If the latest application is `Rejected` and barred, reject the new submission with `ReapplicationBarred`. The message is "This application can't be resubmitted" plus the reason, and it cites the reason code.
  - If the latest application is `Rejected` and `now < reapplyNotBefore`, reject with `ReapplicationCooldownActive`, citing `reapplyNotBefore` rendered in `America/Bogota`.
  - Otherwise the new submission proceeds per FR-VER-1.
  - While the latest application is `Rejected`, listing creation is refused with `SellerNotVerified` (FR-IDN-3).
  - Supersedes Plan-1 OQ4, which assumed there was no cooldown.
- *Acceptance:* with the virtual clock set 1 second before the reapply date the submission is refused; at the exact reapply instant it succeeds.

**FR-VER-7 — Applicant status view.** · CAP-15
- *Rules:* Andrés sees:
  - his latest application's status and submission date;
  - for `Rejected`: the reason text, the note and the reapply condition;
  - for `Pending`: what `Pending` allows. Listing is allowed without the badge and without purchases (FR-INV-7), and in-app messages are received with a notice (FR-MSG-4).
- He never sees admin identities.
- *Acceptance:* each status renders its matching copy from `ADD-§1`, and none of it contains internal codes.

**FR-VER-8 — Rejection-reason policy settings.** · CAP-15 · NFR-SYS-8
- *Trigger:* Sebastián edits the rejection-policy section of the admin panel.
- *Rules:* Each `RejectionReason` has:
  - `code`: PascalCase and immutable;
  - applicant-facing text in es-CO, 10–300 characters;
  - `policy`: either `cooldownDays` (an integer from 0 to 365) or `barred`;
  - `active`: a boolean.

  Further rules:
  - Reasons are never deleted, only deactivated.
  - Every change writes a `RejectionReasonChange` row with before and after values.
  - At least one active reason must exist at all times (refused otherwise, with `LastActiveReasonRequired`).
- *Acceptance:* changing `DataMismatch` from 7 to 14 days affects only rejections decided after the change. Existing snapshots are unchanged.

**FR-VER-9 — Business payment instructions for orders.** · CAP-20 · AD-15
- `identity.getBusinessPaymentInstructions(businessId)` returns the current instructions of an `Approved` business. `orders` snapshots them onto the order (FR-ORD-1).
- The business edits its instructions from its profile. Edits never alter existing orders.
- *Acceptance:* editing the account number after an order exists leaves that order's snapshot unchanged.

### Non-functional requirements

- **NFR-VER-1 (mandatory edge case):** in 100 repetitions, two admins act on the same `Pending` application concurrently, one approving and one rejecting.
  - Exactly one terminal transition is persisted each time.
  - The other admin receives `ApplicationNotPending` naming the winning decision.
  - Exactly one event is published, of the winner's type.
  - 0 half-applied states: no decided application is missing `decidedBy` or `decidedAt`, and no event exists for the losing decision.
- **NFR-VER-2:** 100% of `legalIdentity` reads and denials are audited, verified by comparing the access-log count with the number of instrumented reads in the test suite.
- **NFR-VER-3:** the review queue, with 1,000 pending applications, responds in p95 ≤ 1,000 ms. A document signed URL is issued in p95 ≤ 300 ms.
- **NFR-VER-4:** document uploads are ≤ 5 MB per file and at most 3 files. Upload plus validation completes in p95 ≤ 10 s on a 10 Mbps link.

### Scenario trace

| Annex scenario | FRs | Proof |
| --- | --- | --- |
| 1 Submit application | FR-VER-1 | `Pending` row with consent timestamp; field-level errors |
| 2 Admin approval | FR-VER-3, FR-INV-7 | the badge appears only after approval |
| 3 Rejection and explanation (reapplication decided) | FR-VER-4, FR-VER-6, FR-VER-7, FR-VER-8 | reason text plus cooldown or bar, from the policy snapshot |
| 4 Legal-identity access denial | FR-VER-5 | `LegalIdentityAccessDenied` plus an audit row |
| Edge: two admins at once | FR-VER-3, FR-VER-4 | NFR-VER-1 |

**Out of scope:**
- automated identity checks against RUES or DIAN;
- revoking an `Approved` business (§5);
- withdrawal of a `Pending` application by the applicant [ASSUMPTION: not needed at launch].

---

## 11. CAT — Catalog & Price Reference Service

**Host:** `catalog` · **Tier:** Foundation · **Form factor:** R (browser, card detail) + D (feed ingestion console) · **Protagonists:** Valentina, Sebastián

**Purpose.** Hold each card and sealed product exactly once, independent of listings. Browse it by collector attributes. Publish reference prices and the TRM with provenance and honest freshness, never a fabricated or merged number.

**Owns.**
- `CatalogSet`: code, name, era, release date, card count.
- `CatalogEntry`: stable `catalogEntryId` and `externalKey`; `kind` is `card` or `sealedProduct` [ASSUMPTION: sealed products are catalog entries of kind `sealedProduct`]; name, set, number, Pokémon, colour/type, style/rarity, artist and image.
- `CatalogEntryRevision`.
- `ReferencePriceObservation`, stored as the `ReferencePrice` value object.
- `FxRate`.
- `FeedIngestionRun` and `QuarantinedFeedRow`.

**Consumes.** Nothing inside TEZG; `catalog` has no dependencies (AD-1). Externally it depends on:
- the catalog/price feed port, with a fixture adapter in V1 (OQ-9);
- the TRM port, whose adapter calls `datos.gov.co` dataset `32sa-8pi3` (`ADD-§6`).

**Fakes.**
- a fixture feed adapter with a fault switch: `down`, `stale`, `malformedRows`, `renamedRows`;
- a fixture TRM adapter;
- a stub of the `listings` availability query, used only in the card-detail composition test (OQ-8).

**Seed.** The §3 catalog: 10,000 entries in 50 sets, 90 days of prices for 2,000 entries, and 300 unpriced entries. It also includes:
- a 10,000-row fixture feed file with 50 malformed rows (10 each of 5 defect kinds, `ADD-§8`);
- a second feed file with 30 attribute changes (renames, artist corrections) and 5 reprints;
- 90 days of TRM with a weekend gap and one missing business day.

### Functional requirements

**FR-CAT-1 — Browse and filter the catalog by collector attributes.** · CAP-1, CAP-2 · AD-8
- *Trigger:* Valentina filters the catalog.
- *Inputs:*
  - filters on `set[]`, `era[]`, `pokemon[]`, `colour[]`, `style[]` and `artist[]`, each list holding 0–20 values;
  - `kind` (card or sealedProduct);
  - `text`, 0–60 characters, a case- and accent-insensitive prefix match on the name;
  - `page`, with a page size of 48 (maximum 100).
- *Rules:*
  - Values within one dimension are OR-ed; dimensions are AND-ed.
  - The default sort is set release date descending, then card number ascending, then `catalogEntryId`.
  - Entries with zero listings are always included. `hasActiveListings` is composed by the `listings` browse query, not by `catalog` (OQ-8, FR-DSC-1).
  - An unknown filter value yields an empty result, not an error.
- *Output:* entries, a total count, and the facet counts per dimension for the current filter.
- *Acceptance:* filtering by set = "Surging Sparks", artist = "Mitsuhiro Arita" and colour = "Fire" returns exactly the matching seed entries, including those with zero listings.

**FR-CAT-2 — One stable identity per card or product.** · CAP-2, CAP-16 · AD-7
- *Rules:*
  - `catalogEntryId` (cuid2) is assigned once and never changes or gets reused.
  - `externalKey` is the feed's identifier and is unique.
  - An entry is retrievable by id whether or not any listing, binder entry or wishlist item references it. Requesting a single unknown id on card detail or provenance returns `CatalogEntryNotFound`.
  - `catalog.getEntries(ids[])` returns up to 500 entries per call; unknown ids come back in `missing[]`, not as an error.
  - `catalog.resolveItemRefs(refs[])` validates item references for `listings` and returns `kind` for each.
- *Acceptance:* for an entry with no listings, `getEntries` returns the entry and the browse composition shows `hasActiveListings=false`.

**FR-CAT-3 — Feed ingestion with idempotent upsert and quarantine.** · CAP-2, CAP-3 · AD-8
- *Trigger:* Sebastián starts a run from the ingestion console, or the scheduled daily run starts.
- *Rules:*
  - Only one run at a time; a concurrent start gets `FeedRunInProgress`.
  - Each row is validated (`ADD-§8.1`: required fields, set exists, number format, price non-negative integer, currency pair consistent).
  - A valid row is upserted by `externalKey`: insert if new, update if attributes differ (FR-CAT-4), no-op if identical.
  - An invalid row is written to `QuarantinedFeedRow` with `{runId, rowNumber, externalKey?, reasonCode, rawRow}` and never partially applied.
  - The run records `created`, `updated`, `unchanged` and `quarantined` counts, plus start and end times.
  - A crash mid-run leaves already-committed batches valid; rerunning the same file converges on the same end state.
- *Output:* the run summary, and the quarantine list filterable by reason.
- *Acceptance:*
  - First run of the 10,000-row file: 9,950 created and 50 quarantined, each with one of the 5 reason codes.
  - Immediate rerun: 0 created, 0 updated, 9,950 unchanged, 50 quarantined. The `CatalogEntry` count is unchanged.

**FR-CAT-4 — Attribute changes keep the identity.** · CAP-2 · AD-7
- *Rules:* When a row with an existing `externalKey` carries changed attributes (name, artist, number, rarity, image), the entry is updated in place:
  - `catalogEntryId` stays the same;
  - the previous attribute values are appended to `CatalogEntryRevision` with `{runId, changedFields, before, after}`.

  A reprint arrives with a new `externalKey` and becomes a new entry. Two entries are never merged automatically [ASSUMPTION: the feed gives reprints distinct keys].
- *Acceptance:* after the change file is applied, the 30 changed entries keep their ids. All seeded listings, binder entries and wishlist items that reference them still resolve, and 30 revision rows exist.

**FR-CAT-5 — Reference prices as a distinct value object.** · CAP-3 · money rule
- *Rules:*
  - A reference price is `ReferencePrice { usdCents: int, cop: int, observedAt, source, copDerivation: 'sourceNative' | 'fxDerived', fxRateDate? }`.
  - When the feed provides only USD, `cop` is derived with the TRM in force on the observation date, using the rounding rule `ADD-§2.1`, and `fxRateDate` is stored.
  - Observations are append-only and idempotent by `(catalogEntryId, source, observedAt)`.
  - The platform never computes a reference price from its own sales volume.
- *Acceptance:* no code path assigns a `ReferencePrice` to a `Cop` field (NFR-SYS-5). Ingesting the same observation twice leaves one row.

**FR-CAT-6 — Price provenance for the card detail.** · CAP-3
- *Trigger:* `catalog.getPriceProvenance(ids[])`, used by card detail (OQ-8) and VAL.
- *Output per entry:*
  - `lastTransactionReference`: a single `ReferencePrice` with its source name and observed date, or `none`.
  - `trend` over the default period of 30 days (also 7 and 90): `{ period, changePercent, referencePriceAtStart }`, following `ADD-§2.2`. When there is no starting observation, `changePercent` is `null` and the decision reason is `TrendNoBaseline`.
  - `freshness`: `fresh` or `stale`, following FR-CAT-7.
- **Three distinct prices on the card detail:** the view shows three separately labelled values with provenance. The listing price (COP, from `listings`) is the lowest active purchasable or contactable listing, or "no active listings". The other two are the last-transaction reference (USD/COP) and the trend. They are never summed, averaged or shown unlabelled.
- *Acceptance:* the rendered card detail for a priced seed entry contains exactly three price blocks, each with its label and provenance line. For an unpriced entry, the last two read "No reference price yet" instead of a number.

**FR-CAT-7 — Freshness and feed outage.** · CAP-3
- *Rules:*
  - A reference price is `stale` when `now − observedAt > freshnessThreshold`.
  - `freshnessThreshold` is a configuration parameter equal to the source's update period, plus a grace window. It is measured during implementation (Discovery decision); the fixture default is 24 h period + 12 h grace = 36 h [ASSUMPTION].
  - When the feed is down or late, the service keeps serving the last known observation, labelled `stale` with its date.
  - It never returns a blank for a previously priced entry, never interpolates, and never substitutes another source's value.
  - Entries that never had a price show "No reference price yet".
- *Output:* `Decision { outcome: 'stale', reasonCode: 'ReferencePriceStale', citations: [{ rule: 'FR-CAT-7', inputs: { observedAt, thresholdHours } }] }`.
- *Acceptance:* with the fault switch at `down` and the clock 40 h after the last observation, the detail shows the last value, the label "Price from 29 Sep — the feed hasn't updated since", and no other number.

**FR-CAT-8 — Official exchange rate (TRM).** · CAP-3, CAP-9 · money rule
- *Rules:*
  - The TRM is fetched daily through the TRM port.
  - It is stored as `FxRate { copPerUsdCentavos: int, validFrom, validTo, source: 'datos.gov.co/32sa-8pi3', fetchedAt }`, where for example 4,123.45 COP/USD is stored as 412345.
  - `catalog.getFxRate(date)` returns the rate whose validity covers the date. Weekends and holidays are covered by the source's own validity ranges.
  - If no rate covers the date, the most recent earlier rate is returned with `stale=true` and its date. The decision carries the DecisionCode `FxRateCarriedForward`.
  - Every displayed conversion shows "TRM as of \<date\>".
  - The adapter can be swapped without touching domain code.
- *Acceptance:*
  - Against the fixture, a Saturday resolves to the Friday-published rate that covers it.
  - The missing business day resolves to the previous rate with `stale=true`.

### Non-functional requirements

- **NFR-CAT-1:** FR-CAT-1 over 10,000 entries in p95 ≤ 1,000 ms. `getPriceProvenance` for 48 entries in p95 ≤ 300 ms.
- **NFR-CAT-2:** a 10,000-row ingestion run completes in ≤ 120 s. A rerun creates 0 duplicates, verified by a uniqueness constraint on `externalKey` and a count comparison.
- **NFR-CAT-3:** 0 fabricated prices. When the fault switch is set to `down`, `stale` or `malformedRows`, every displayed reference price equals a stored observation byte-for-byte, and every stale one carries the stale label.
- **NFR-CAT-4:** The daily TRM job runs outside request paths. It makes one attempt per hour from 07:00 to 20:00 `America/Bogota` until a rate covering today is stored (`ADD-§6`). Each attempt retries transport failures at most 3 times with backoff. Until a rate arrives, the last known rate is served with its date (`FxRateCarriedForward`).

### Scenario trace

| Annex scenario | FRs | Proof |
| --- | --- | --- |
| 1 Set-first browse and filter | FR-CAT-1, FR-CAT-2, FR-DSC-1 | entries with zero listings included, `hasActiveListings=false` |
| 2 Three distinct prices | FR-CAT-6, FR-CAT-5 | three labelled blocks with provenance |
| 3 Feed ingestion and idempotent upsert | FR-CAT-3 | counts on first run and rerun; quarantine reasons |
| 4 Stale or unavailable feed | FR-CAT-7, FR-CAT-8 | last known value plus staleness label; nothing fabricated |
| Edge: attribute change keeps `catalogEntryId` | FR-CAT-4 | the ids and references survive |

**Out of scope:** choosing and licensing the production feed (OQ-9); admin hand-editing of catalog entries in V1 [ASSUMPTION: corrections come through the feed]; image hosting and CDN choices (addendum).

---

## 12. INV — Listing & Shared Inventory Engine

**Host:** `listings` · **Tier:** Advanced · **Form factor:** H (developer console, reservation race simulator) + R (seller listing forms) · **Protagonists:** Andrés, Valentina

**Purpose.** Let both seller kinds publish cards, bundles and sealed products. Keep one quantity per physical stock pool. Never oversell under concurrency, including when a trade and a purchase race for the same unit.

**Owns.**
- `Listing`: `itemRef`, `condition`, `priceCop`, `location`, `openToTrade`, `pausedAt`, `withdrawnAt`/`withdrawnReason`, `hiddenAt`/`hiddenReason`, `deactivatedAt`, `sellerKind` snapshot for display.
- `Bundle` and `BundleComponent`.
- `InventoryUnit`.
- `SellerCommissionState`: the last applied commission ledger sequence per business.
- `ListingModerationLog`.

It also owns the reservation commands, the contact-message service (MSG, §17), listing hide (REP, §20) and the browse query (DSC, §13).

**Consumes:**
- `identity`: eligibility, seller kinds, verification;
- `catalog`: item-ref resolution;
- events from `identity` (application approved or rejected) and from `commission` (exhausted or replenished).

**Fakes:**
- a catalog stub;
- an identity stub with scripted states;
- a fixture event publisher for the commission and application events;
- a caller harness that opens a transaction, reserves, then commits or aborts.

**Seed.** The §3 listings. It also includes:
- the 40 shared-unit cards;
- a Valentina fixture: one copy of card X, listed individually and inside a 3-card bundle;
- an Andrés fixture: 5 sealed Elite Trainer Boxes and one bundle of 3 cards;
- 20 last-unit listings for the race simulator.

### Functional requirements

**FR-INV-1 — Create a card or sealed-product listing.** · CAP-4, CAP-5, CAP-19 · AD-6, AD-7
- *Trigger:* a seller submits the listing form.
- *Inputs:*
  - `itemRef`: a catalog entry, resolved and kind-checked (`InvalidItemRef` if unknown).
  - `condition`: required for cards, one of `NM`, `LP`, `MP`, `HP`, `DMG`. For sealed products it is `Sealed`.
  - `priceCop`: an integer from 1,000 to 100,000,000 (`InvalidPrice`).
  - `quantity`: an integer from 1 to 999.
  - `location`: lat/lng inside the Colombia bounding box (`InvalidLocation`), defaulting to the seller's meeting point.
  - `description`: 0–1,000 characters.
  - `openToTrade`: defaults to `false`.
- *Rules:*
  1. Eligibility comes from FR-IDN-3, and its error propagates unchanged.
  2. `openToTrade=true` on a business listing is refused with `OpenToTradeNotAllowed` (AD-4).
  3. The listing attaches to the seller's `InventoryUnit` for `(sellerId, itemRef, condition)` [ASSUMPTION, OQ-10].
     - If the unit is absent, it is created with `quantity`.
     - If the unit exists, the listing links to it **unchanged**, and `quantity` is ignored; the form shows the unit's current stock instead of a quantity field. A second listing of the same copy therefore never adds stock (the same rule as bundles in FR-INV-2). Stock changes only through restock (FR-INV-9).
- *Output:* the listing id and its state (§8: `Active` or `Unverified`).
- *Acceptance:*
  - Valentina has 1 copy of card X listed at one price. Listing the same card and condition again at a second price leaves the unit at 1, and both listings show availability 1.
  - A `Pending` business creates a listing and it is visible without the badge and not purchasable.
  - A `Rejected` business receives `SellerNotVerified`.
  - Valentina before the profile step receives `IndividualSellerProfileIncomplete`.

**FR-INV-2 — Create a bundle.** · CAP-4, CAP-16 · AD-7
- *Inputs:*
  - `components`: 2 to 20 entries of `{ catalogEntryId, condition, perBundleQty 1–4 }`;
  - `priceCop`, `location`, `description`;
  - `bundleQuantity`, the number of bundles offered (1–99).
- *Rules:*
  - An empty list is refused with `EmptyComponentList`; a single-component list is refused with `RequestValidationFailed` [ASSUMPTION: a bundle has at least 2 cards].
  - Any component whose catalog kind is `sealedProduct` is refused with `SealedProductInBundle`, which names the offending item. Nothing is created.
  - Each component links to the seller's `InventoryUnit (sellerId, catalogEntryId, condition)`. A missing unit is created with `quantity = perBundleQty × bundleQuantity`; an existing unit is left as is.
  - Bundle availability is `min over components of floor(unit.quantity / perBundleQty)`, computed on read.
  - Each component remains independently queryable in the catalog.
- *Acceptance:*
  - Andrés's bundle with a sealed product among its components is refused with `SealedProductInBundle`, and no bundle or unit rows are created.
  - A 3-card bundle succeeds, and each component's catalog entry is unchanged.

**FR-INV-3 — Reserve inventory atomically in the caller's transaction.** · CAP-17, CAP-25 · AD-6
- *Trigger:* `listings.reserveForPurchase(tx, listingId, qty, buyerId)` (ORD) or `listings.reserveForTrade(tx, listingId, 1)` (TRD).
- *Rules:*
  - It runs only inside the caller's interactive transaction (`tx` is required).
  - `reserveForPurchase` first checks the listing, in this order:
    1. It exists and is visible (`ListingNotFound`).
    2. It is a business listing (`NotBusinessListing`).
    3. It is purchasable per FR-INV-7 (`ListingNotPurchasable`, citing the reason: unverified, paused, withdrawn or deactivated).
  - `reserveForTrade` checks that the listing exists and is visible (`ListingNotFound`) and that it is an individual-seller listing (`NotIndividualSellerListing`).
  - Each affected `InventoryUnit` is then decremented with one conditional update, applied where `quantity ≥ required`.
    - A card or sealed listing needs `required = qty`.
    - A bundle needs `required = perBundleQty × qty` for each component. Components are processed in ascending `inventoryUnitId` order so concurrent callers cannot deadlock.
  - If any update affects 0 rows, the call throws `InsufficientQuantity` with `{requested, available}`, and the caller's transaction aborts.
  - No read-then-write is permitted.
- *Output:* `{ reservationRef: {listingId, units: [{inventoryUnitId, qty}]}, exhaustedListingIds[] }`. The caller stores `reservationRef` so it can release later. `exhaustedListingIds` lists every listing (this one and any sibling sharing a unit, FR-INV-4) whose availability reached 0 in this reservation. TRD uses it to resolve competing offers (FR-TRD-5).
- *Acceptance:* covered by NFR-INV-1 and NFR-INV-2.

**FR-INV-4 — Shared-quantity reconciliation.** · CAP-4, CAP-16 · AD-6
- *Rules:* Every listing that references the same `InventoryUnit` reads availability from that one row. A card listing's availability is the unit quantity, and a bundle's comes from FR-INV-2. A sale through any path decrements the unit once, per FR-INV-3. A listing whose availability reaches 0 shows `Sold out` (§8) and is not purchasable.
- *Acceptance:*
  - Valentina has 1 copy of card X, listed individually and inside a bundle.
  - Reserving the bundle takes the unit to 0, so the individual listing shows `Sold out`. The decrement happens exactly once: 1 row changed, quantity goes from 1 to 0.

**FR-INV-5 — Release a reservation.** · CAP-17, CAP-25 · AD-6
- *Trigger:* `listings.releaseReservation(tx, reservationRef)`, called by ORD (cancel or expiry) and TRD (cancel), inside their own transaction together with their state transition.
- *Rules:* Increments each unit by the reserved amount. The caller guarantees release happens exactly once by pairing it with a conditional transition of its own record (FR-ORD-7, FR-ORD-8, FR-TRD-8).
- *Acceptance:* releasing once restores the pre-reservation quantity. A second release attempt never reaches `listings`, because the caller's conditional transition affects 0 rows.

**FR-INV-6 — Aborted caller transaction restores quantity.** · CAP-17, CAP-25 · AD-6
- *Rules:* Because the decrement runs in the caller's transaction, any abort after a successful reserve rolls back the decrement. That covers a failed `Order` insert, a thrown error and a lost connection. There is no compensating write and no reservation-hold table.
- *Acceptance:* the mandatory edge case (NFR-INV-3).

**FR-INV-7 — Purchasability, verified badge and commission pause.** · CAP-5, CAP-21 · AD-3
- *Rules:*
  - A business listing is purchasable only when:
    - the seller's latest application is `Approved`;
    - `pausedAt` is null;
    - availability is ≥ 1;
    - it is not hidden, withdrawn or deactivated.
  - The verified badge is shown if and only if the application is `Approved`, checked on read (FR-IDN-6). A business listing while the application is `Pending` is visible but not purchasable, with the DecisionCode `ListingUnverified`.
  - **Fail-closed commission state.** A business with no `SellerCommissionState` row is treated as paused (`ListingPausedBalanceExhausted`). A newly approved business is therefore never purchasable in the window before COM's first event arrives, and a lost event can never result in commission-free selling. It becomes purchasable only on a `Replenished` event.
  - On `CommissionBalanceExhausted { businessId, ledgerSeq }`, all of that business's listings get `pausedAt` set. On `CommissionBalanceReplenished { businessId, ledgerSeq }`, `pausedAt` is cleared.
  - An event is applied only if there is no `SellerCommissionState` row yet, or its `ledgerSeq` > `lastAppliedSeq`. The row is created by the first applied event, so the seq-0 `Exhausted` published at account opening (FR-COM-1) is applied. Redelivered or out-of-order events are no-ops.
  - Paused listings stay visible and editable, and are never deleted or recreated.
  - Individual-seller listings are never purchasable in-platform and are never paused.
- *Output:* browse and detail show a `Decision` label, for example "Paused — this shop is topping up its balance".
- *Acceptance:*
  - After Exhausted, an order attempt gets `ListingNotPurchasable`, citing `ListingPausedBalanceExhausted`.
  - After Replenished, the same listing id becomes purchasable again.
  - Delivering Exhausted a second time after Replenished changes nothing.
  - A business approved with no commission event yet delivered is not purchasable (fail-closed). Delivering the seq-0 `Exhausted` creates its state row, and a later `Replenished` makes its listings purchasable.

**FR-INV-8 — Withdraw on rejection, restore on approval.** · CAP-5, CAP-15 · (Plan-2 decision)
- *Rules:*
  - On `BusinessApplicationRejected`, every listing of that business that is not already withdrawn gets `withdrawnAt` set, with `withdrawnReason='ApplicationRejected'` and the application id.
  - Withdrawn listings are excluded from browse, detail (for non-owners) and purchase, and are retained, never deleted.
  - Open orders are unaffected. A withdrawn listing cannot be purchasable, and an order's existing reservation stands.
  - On `BusinessApplicationApproved`, listings withdrawn for `ApplicationRejected` are restored with their previous field values.
  - Both handlers are idempotent by `applicationId`.
- *Acceptance:*
  - Andrés's 3 `Pending`-era listings disappear from browse on rejection and reappear, badged, after re-approval.
  - Their ids and quantities are unchanged.

**FR-INV-9 — Edit, restock and deactivate.** · CAP-4 · AD-6
- *Rules:*
  - Owner only (`ListingNotOwnedByCaller`).
  - Editable fields: `priceCop`, `description`, `location`, `openToTrade` (individual only), `deactivated`.
  - Price edits never change existing orders or offers, which hold snapshots.
  - Restock is a signed delta on the `InventoryUnit`:
    - positive deltas are unconditional;
    - negative deltas use the conditional update from FR-INV-3 and fail with `InsufficientQuantity` rather than going below 0.
  - Setting a withdrawn or hidden listing active is refused, and the refusal cites its state.
- *Acceptance:* editing the price of a listing with an open order leaves the order total unchanged.

**FR-INV-10 — Listing detail and owner view.** · CAP-4, CAP-28 · AD-12
- *Rules:*
  - Buyers can read a listing if it is not hidden, withdrawn or deactivated; otherwise they get `ListingNotFound`, with no hint that it was moderated.
  - The owner always sees their listing and its state, including the moderation reason when hidden.
  - Admins see everything in the moderation view (FR-REP-6).
- *Acceptance:* hiding a listing makes a buyer's detail request return `ListingNotFound` on the next call, while the owner's view shows `Hidden` with the reason.

### Non-functional requirements

- **NFR-INV-1 (Annex scenario 3):** 100 repetitions of the race below. Each time exactly 1 order or trade reservation succeeds and the other 49 receive `InsufficientQuantity`.
  - The race: 50 concurrent `reserveForPurchase` calls on a last-unit listing, each in its own transaction on its own connection.
  - The final quantity is 0, never negative, enforced also by a `CHECK (quantity >= 0)` constraint.
- **NFR-INV-2:** a mixed race of purchases and trades gives the same result as NFR-INV-1.
  - The race: 25 purchase reservations and 25 trade reservations on shared-unit listings (individual and bundle paths).
  - Across all repetitions, the number of successful reservations never exceeds the starting quantity.
- **NFR-INV-3 (mandatory edge case):** in 100 repetitions, the caller reserves and then aborts after the reserve.
  - The abort is either a forced `Order` insert failure or a thrown error.
  - The `InventoryUnit.quantity` after the abort equals its value before, every time.
  - No compensating write is recorded, and no reservation row exists.
- **NFR-INV-4:** a single reservation completes in p95 ≤ 150 ms (a bundle of 20 components in p95 ≤ 300 ms). Listing creation completes in p95 ≤ 800 ms.

### Scenario trace

| Annex scenario | FRs | Proof |
| --- | --- | --- |
| 1 Publish card, bundle and sealed listings | FR-INV-1, FR-INV-2 | a sealed product in a bundle is refused with `SealedProductInBundle` |
| 2 Shared-quantity reconciliation | FR-INV-4, FR-INV-3 | one decrement; the individual listing shows `Sold out` |
| 3 Concurrent last-unit reservation | FR-INV-3 | NFR-INV-1 |
| 4 Seller-type listing rules | FR-INV-1, FR-INV-7, FR-IDN-3 | `Pending` may list; pause only on Exhausted; `openToTrade` refused on business; `SellerNotVerified` only when `Rejected` |
| Edge: caller transaction aborts after reserve | FR-INV-6 | NFR-INV-3 |

**Out of scope:** bulk import of listings; photos per listing beyond the catalog image [ASSUMPTION: V1 uses catalog images plus the description]; a multi-location inventory for one seller.

---

## 13. DSC — Marketplace Browse & Location Discovery

**Host:** `listings` · **Tier:** Intermediate · **Form factor:** R · **Protagonists:** Camila, Valentina

**Purpose.** Answer "who sells this card near me?" through **one** geodesic query path that serves both seller kinds. The path computes correct distances, orders results deterministically, derives pickup on read, excludes hidden and withdrawn listings, and explains every row.

**Owns.**
- the browse query;
- distance computation;
- the location validity rule;
- ranking and row explanations;
- the card-detail composition, which adds the listing price and `hasActiveListings` to catalog data (OQ-8).

No tables of its own.

**Consumes:**
- `catalog.getEntries`, `resolveItemRefs` and `getPriceProvenance`;
- `identity.getSellerKinds`;
- INV's tables, which live in the same host.

**Fakes:**
- a catalog stub;
- a seller-kind stub whose answer can be switched between calls;
- fixture listings with `hiddenAt` toggles.

**Seed.**
- The §3 listings across Bogotá, Medellín, Cali and Barranquilla.
- 6 geometry fixtures around Medellín centre (6.2442, −75.5812):
  - exactly 15.000 km away;
  - 14.999 km away;
  - 15.001 km away;
  - missing coordinates;
  - (0, 0);
  - a point in Quito.
- A catalog entry whose only listings lie in Bogotá.

### Functional requirements

**FR-DSC-1 — One browse query for both seller kinds.** · CAP-1, CAP-2 · AD-5
- *Trigger:* Camila searches.
- *Inputs:*
  - catalog filters (as in FR-CAT-1);
  - an optional `area { lat, lng, radiusKm }`, where the radius is 1–300 km and the centre is inside the Colombia bounding box (`InvalidSearchArea` otherwise);
  - optional `maxPriceCop`, `condition[]`, `purchasableOnly`;
  - `view`: `entries` or `listings`;
  - `page`, with 24 results per page.
- *Rules:*
  - One predicate function selects listings for both views and both seller kinds. There are no seller-kind branches in the query path (AD-5).
  - It excludes listings that are hidden, withdrawn or deactivated, or sold out (unless `includeSoldOut=true`).
  - `view=entries` returns every catalog entry matching the catalog filters. Each entry carries `listings[]`, the top 5 listings passing the listing filters ranked per FR-DSC-5; `moreCount`, the number of further matching listings; and `hasActiveListings = (listings.length + moreCount) > 0`. The full list is reached through the card detail (FR-DSC-7) or `view=listings`.
  - `view=listings` returns the listings flat, ranked per FR-DSC-5.
  - With `view=listings`, catalog filters that match more than 20,000 entries are refused with `SearchFilterTooBroad`, which asks the caller to narrow them.
- *Output:* results plus `excluded: { unusableLocation: n }` (FR-DSC-3).
- *Acceptance:* with Camila at Medellín centre and `radiusKm=15`, `view=listings` returns both individual and business rows from the same call.

**FR-DSC-2 — Correct geodesic distance and an inclusive boundary.** · CAP-1 · AD-5
- *Rules:*
  - Distance is haversine great-circle distance on a sphere of radius 6,371.0088 km (`ADD-§2.3`), computed in double precision.
  - A listing is included when `distanceKm ≤ radiusKm + 0.000001` (a 1 mm tolerance for floating-point representation), so the boundary is inclusive.
  - Displayed distance is rounded half-up to 0.1 km. Ranking and inclusion use the unrounded value.
- *Acceptance:* the fixtures at 15.000 km and 14.999 km are included and the one at 15.001 km is excluded. Each computed distance is within 1 m of an independent haversine reference implementation with the same radius (NFR-DSC-2). A comparison against Vincenty on WGS-84 is documented for information only; the spherical model's error of up to about 0.5% is accepted and never fails the test.

**FR-DSC-3 — Unusable locations are excluded and explained.** · CAP-1
- *Rules:*
  - A listing with missing coordinates, coordinates outside the Colombia bounding box (`ADD-§2.4`), or the sentinel (0, 0) is excluded from any area-filtered query.
  - It is counted in `excluded.unusableLocation` with the DecisionCode `ListingLocationUnusable`.
  - Without an area filter it is included with `distanceKm=null` and ranked after located rows.
  - New listings cannot be created with such coordinates (`InvalidLocation`, FR-INV-1). The rule exists for legacy or imported data, and for the seed.
- *Acceptance:* the missing, (0, 0) and Quito fixtures are absent from the 15 km search and counted as `excluded.unusableLocation=3`, and the call does not error.

**FR-DSC-4 — Pickup is derived on read.** · CAP-1 · AD-5
- *Rules:*
  - `pickupAvailable = (sellerKind of the listing's seller == 'individual')`, taken from `identity.getSellerKinds` at query time.
  - It is never stored and never cached across requests.
  - Business rows always show `pickupAvailable=false`.
- *Acceptance:* switching the seller-kind stub for a seller between two calls changes that seller's rows on the second call, with no other write.

**FR-DSC-5 — Deterministic ranking with an explanation for each row.** · CAP-1
- *Rules:*
  - With an area: distance ascending, then `priceCop` ascending, then `listingId` ascending (a total order).
  - Without an area: `priceCop` ascending, then `listingId`.
  - Sold-out rows, when included, come last.
  - Each row carries an explanation assembled from typed parts. For example:
    - "12.4 km away · pickup available"
    - "4.2 km away · verified shop · purchasable"
    - "8.0 km away · paused (shop topping up)"
- *Acceptance:* 10 repeated identical queries return byte-identical orderings, and two rows at an equal distance and price are ordered by `listingId`.

**FR-DSC-6 — Moderation and state exclusion take effect immediately.** · CAP-28, CAP-1 · AD-12
- *Rules:*
  - Every default read filters `hiddenAt IS NULL AND withdrawnAt IS NULL AND deactivatedAt IS NULL`.
  - No browse result is cached across requests at launch [ASSUMPTION], so a hide is effective on the next query.
  - The record is retained.
- *Acceptance:* after `hideListing` commits, the next browse call excludes the listing, and the admin moderation view still lists it.

**FR-DSC-7 — Card detail composition.** · CAP-3, CAP-2 · (OQ-8)
- *Rules:* `listings.getCardDetail(catalogEntryId, area?)` returns:
  - the catalog entry;
  - `catalog.getPriceProvenance`;
  - the lowest-priced active listing in COP, as the listing price;
  - `hasActiveListings`;
  - the ranked listings.

  This keeps the AD-1 edge `listings → catalog` and avoids a `catalog → listings` edge.
- *Acceptance:* for the entry whose only listings are in Bogotá, a Medellín 15 km query returns the entry with `hasActiveListings=false` and `listings=[]`, and the entry is neither absent nor an error.

### Non-functional requirements

- **NFR-DSC-1:** `view=listings` with a 15 km area responds in p95 ≤ 1,000 ms on the §3 seed and in p95 ≤ 1,500 ms on a scale seed of 50,000 listings [ASSUMPTION: the launch-year upper bound]. `view=entries` meets the same targets on a scale seed where one entry has 500 matching listings, and its page payload stays bounded by the 5-per-entry cap.
- **NFR-DSC-2:** distance error is ≤ 1 m against the haversine reference for 1,000 random Colombian point pairs.
- **NFR-DSC-3:** ordering is deterministic, verified by 10 identical runs producing 0 differences in ordering.

### Scenario trace

| Annex scenario | FRs | Proof |
| --- | --- | --- |
| 1 Radius filter across seller types | FR-DSC-1, FR-DSC-2 | one call returns both kinds |
| 2 Pickup semantics | FR-DSC-4 | derived on read; a seller-kind flip is reflected at once |
| 3 Deterministic ranking | FR-DSC-5 | total order; per-row explanation |
| 4 Moderation exclusion | FR-DSC-6 | excluded on the next query; retained |
| Edge: boundary, bad coordinates, fully filtered-out entry | FR-DSC-2, FR-DSC-3, FR-DSC-7 | inclusive boundary; `excluded` count; `hasActiveListings=false` with an empty array |

**Out of scope:** a map tile provider and geocoding of free-text addresses [ASSUMPTION: the buyer picks a point or uses browser geolocation]; travel-time or road distance; personalised ranking.

---

## 14. ORD — Order & Comprobante Confirmation

**Host:** `orders` · **Tier:** Advanced · **Form factor:** R (buyer order page) + D (business order detail) · **Protagonists:** Camila, Andrés

**Purpose.** Track a business purchase through three independent confirmation facts, reserving inventory at creation. Settlement happens entirely outside the platform, and the platform never models funds held. Every out-of-order or duplicate action is safe and explained.

**Owns.**
- `Order`:
  - `buyerId`, the `businessId` snapshot (AD-15), a listing snapshot (title, `itemRef`, condition, unit price COP), `qty` and `totalCop`. For a bundle listing, the snapshot has no single `itemRef`; it stores the bundle title and its components `[{ catalogEntryId, condition, perBundleQty }]`;
  - the payment-instructions snapshot;
  - `reservationRef` and the comprobante object reference;
  - `buyerPaidConfirmedAt`, `sellerReceivedConfirmedAt` and `buyerItemReceivedConfirmedAt`;
  - `cancelledAt` and `expiredAt`, with their reasons;
  - `expiresAt`.
- The events `OrderPaymentConfirmedByBusiness` and `OrderClosed`.
- The order-visibility rules.

**Consumes:**
- `listings.reserveForPurchase` and `releaseReservation`;
- `identity.getBusinessPaymentInstructions`;
- object storage for comprobantes.

**Fakes:**
- a listings stub with scripted `reserve` results, including a forced `NotBusinessListing`;
- an identity stub;
- an in-memory object store;
- a recording event bus.

**Seed.**
- The §3 orders: 200 in total, spread across every fact combination, including 10 unpaid orders past `expiresAt`.
- Fixture comprobantes: a valid JPEG, a valid PDF, a 6 MB file and a `.exe` renamed to `.jpg`.

### Functional requirements

**FR-ORD-1 — Purchase and reserve at creation.** · CAP-17 · AD-6, AD-15
- *Trigger:* Camila purchases a listing.
- *Inputs:* `listingId`; `qty` from 1 up to the available quantity.
- *Rules:*
  1. The buyer must hold `canBuy` (FR-IDN-1); otherwise the identity error propagates unchanged (`EmailNotVerified`).
  2. If the buyer is the listing's seller, reject with `SelfPurchaseNotAllowed`.
  3. **Open-order limits.** A buyer may hold at most `maxOpenOrdersPerBuyer` (default 3) orders in `AwaitingPayment`, and at most `maxOpenOrdersPerBuyerPerBusiness` (default 1) with the same business [ASSUMPTION, OQ-11]. Over either limit, reject with `TooManyOpenOrders`, naming the open order(s) to pay or cancel first. The count is taken inside the transaction of rule 4, under a per-buyer lock, so two concurrent purchases cannot both pass it. These limits stop one account from locking a shop's stock indefinitely and from harvesting payment instructions at scale.
  4. Open one interactive transaction and call `listings.reserveForPurchase(tx, …)`. Its errors propagate unchanged: `ListingNotFound`, `NotBusinessListing`, `ListingNotPurchasable`, `InsufficientQuantity`.
  5. In the same transaction, insert the `Order` with its snapshots, `totalCop = unitPriceCop × qty` (exact integer), and `expiresAt = createdAt + unpaidOrderTtl` (default 48 h [ASSUMPTION], configurable).
  6. Commit. No event is published at creation.
- *Output:* `{ orderId, totalCop, paymentInstructions, expiresAt }`. The page shows "Pay \<business\> directly using the details below, then upload your comprobante."
- *Acceptance:*
  - The order id is returned and `InventoryUnit.quantity` has dropped by `qty` before any confirmation exists.
  - A buyer with one `AwaitingPayment` order at shop A is refused a second order at shop A with `TooManyOpenOrders`, but can order from shop B. A fourth open order anywhere is refused. Two concurrent purchase attempts at the per-business limit yield exactly one order.

**FR-ORD-2 — Upload or replace the comprobante.** · CAP-20 · AD-14, AD-17
- *Trigger:* Camila uploads proof of payment.
- *Rules:*
  - Buyer only (`OrderNotOwnedByCaller`).
  - The file must be JPEG, PNG or PDF, validated by content signature and not by extension, and ≤ 5 MB (`ComprobanteInvalidFile`, with the specific cause).
  - Allowed while `buyerPaidConfirmedAt` is null; after that it is refused with `ComprobanteLocked`.
  - It is stored in a private bucket. The object key is never exposed or logged (NFR-SYS-2).
- *Acceptance:* the 6 MB file and the renamed `.exe` are each refused with a cause-specific message, and the order keeps no reference to them.

**FR-ORD-3 — Buyer confirms "I paid".** · CAP-20, CAP-22 · AD-2
- *Rules:*
  - Buyer only.
  - With no comprobante, reject with `ComprobanteNotYetUploaded`.
  - If the order is cancelled or expired, including an order past `expiresAt` whose expiry is not yet stored, reject with `OrderNoLongerActive`, citing which terminal state and when.
  - Otherwise a conditional update sets the fact where `buyerPaidConfirmedAt IS NULL AND cancelledAt IS NULL AND expiredAt IS NULL AND expiresAt > now`. The predicates close the check-then-act race with expiry (FR-ORD-8): whichever write commits first wins, and the loser affects 0 rows.
  - If 0 rows are affected, re-read the order: if the fact is already set, return `OrderAlreadyConfirmedByRole` with the original timestamp (a safe retry; nothing changes); if the order became cancelled or expired, return `OrderNoLongerActive`.
  - From this fact onward the business can see the order (AD-15).
- *Acceptance:* a double submit yields one timestamp and one explained repeat response. "Paid" appears only after both the upload and the confirmation.

**FR-ORD-4 — Business confirms payment received.** · CAP-20, CAP-22 · AD-2, AD-3
- *Rules:*
  - Caller must be the order's `businessId` (`OrderNotOwnedByCaller`).
  - Before `buyerPaidConfirmedAt` the business cannot see the order, so it gets `OrderNotVisibleToCaller` (AD-14's single code).
  - With no comprobante, reject with `ComprobanteMissingOnConfirm`. This is defensive, since FR-ORD-3 prevents that state.
  - Otherwise a conditional update sets `sellerReceivedConfirmedAt` where it is null and `cancelledAt` and `expiredAt` are null. On 0 rows, return `OrderAlreadyConfirmedByRole` or `OrderNoLongerActive` as in FR-ORD-3. (Once the buyer has confirmed payment an order can no longer be cancelled or expire, so the second case is defensive.)
  - After commit, publish `OrderPaymentConfirmedByBusiness { orderId, businessId, buyerId, totalCop, lines, sellerReceivedConfirmedAt, buyerItemReceivedConfirmedAt }` (`ADD-§5`). The last field is null unless the buyer already closed the order. The delivery guarantee for the deduction is covered in OQ-2.
- *Acceptance:* confirming before the buyer's paid confirmation is refused with an explanation. Confirming twice publishes the event once.

**FR-ORD-5 — Buyer confirms item received; the order closes.** · CAP-22, CAP-27 · AD-2
- *Rules:*
  - Buyer only.
  - Requires `buyerPaidConfirmedAt`, otherwise `OrderConfirmationOutOfOrder`.
  - `sellerReceivedConfirmedAt` is **not** required, because the item can arrive before the business confirms payment. Closing still triggers the commission deduction if the business has not confirmed (FR-COM-4, gate decision on OQ-3).
  - A conditional update sets `buyerItemReceivedConfirmedAt` where it is null and `cancelledAt` and `expiredAt` are null. This is the only fact that closes the order. On 0 rows, return `OrderAlreadyConfirmedByRole` or `OrderNoLongerActive` as in FR-ORD-3.
  - After commit, publish `OrderClosed { orderId, buyerId, businessId, totalCop, lines: [{ itemRef, title, qty }], sellerReceivedConfirmedAt, buyerItemReceivedConfirmedAt }`, where `sellerReceivedConfirmedAt` is null if the business has not confirmed. For a card or sealed listing there is one line. For a bundle, `lines` expands to one line per component, with `itemRef` = the component's catalog entry and `qty = perBundleQty × order qty`.
  - The order never creates a collection entry.
- *Acceptance:*
  - The order shows as closed only after this fact exists.
  - `OrderClosed` carries the full snapshot. Closing an order for 2 of a 3-card bundle whose components each have `perBundleQty=1` publishes 3 lines, each with `qty=2`.
  - No `CollectionEntry` exists until the buyer accepts the prompt (FR-COL-7).

**FR-ORD-6 — Visibility and fact queries.** · CAP-22, CAP-20 · AD-14, AD-15
- *Rules:*
  - The buyer always sees their orders.
  - The business sees an order from `buyerPaidConfirmedAt` onward, indefinitely.
  - Anyone else gets `OrderNotVisibleToCaller`, and so does the business before that point.
  - The three facts are returned individually with timestamps. A display status is derived from them (`ADD-§4.2`), and a closed order stays closed whatever the business confirmation is.
  - Of the 8 combinations of the three facts, only 5 are reachable, because the business confirmation and the item confirmation both require the paid confirmation:
    - none → `AwaitingPayment` (or `Cancelled` / `Expired` when those timestamps are set);
    - paid → `Paid`;
    - paid + business → `PaymentConfirmed`;
    - paid + item → `Closed`;
    - paid + business + item → `Closed`.
  - The comprobante is viewable by the buyer and by a business with visibility, through a signed URL with a 10-minute TTL.
  - "My Sales" always renders for dual-role accounts (AD-16).
- *Acceptance:*
  - Each of the 5 reachable combinations, plus cancelled and expired, renders the status listed above, giving the 6 distinct statuses of `ADD-§4.2`.
  - Each of the 3 unreachable combinations (business without paid, item without paid, business + item without paid) is proven impossible: the commands that would produce it are refused with `OrderNotVisibleToCaller` or `OrderConfirmationOutOfOrder` (NFR-ORD-1).
  - The comprobante URL expires after 600 s.

**FR-ORD-7 — Buyer cancels before paying.** · CAP-17 · AD-6
- *Rules:*
  - Buyer only.
  - Allowed while `buyerPaidConfirmedAt` is null and the order is not cancelled or expired; otherwise `OrderNotCancellable`.
  - In one transaction: a conditional update sets `cancelledAt` where both it and `buyerPaidConfirmedAt` are null, then `listings.releaseReservation`.
- *Acceptance:* the quantity is restored exactly once, even if the buyer cancels twice.

**FR-ORD-8 — Expire unpaid orders.** · CAP-17 · AD-6, AD-2
- *Rules:*
  - Expiry is derived at read and enforced by every command: an order with `buyerPaidConfirmedAt IS NULL` and `now ≥ expiresAt` is shown as expired and refused with `OrderNoLongerActive`, whether or not the expiry is stored yet.
  - Scheduled jobs materialize it hourly and daily, and a new purchase on the same listing materializes it first. In tests it runs on demand (virtual clock).
  - Materializing an order is one transaction: a conditional update sets `expiredAt` where `buyerPaidConfirmedAt`, `cancelledAt` and `expiredAt` are all null and `expiresAt ≤ now`, and the reservation is released only if that update affected 1 row.
  - Materialization is idempotent and safe to run concurrently.
  - The buyer sees "This order expired because payment wasn't confirmed within 48 hours."
  - Orders the buyer has confirmed as paid **never** expire automatically. A stalled paid order has no escalation (AD-2 accepted gap). This is shown to the buyer as "Waiting for \<business\> to confirm payment", with no deadline.
- *Acceptance:*
  - The 10 seeded stale orders show as expired at once, and after materialization their units are restored.
  - A second materialization run changes nothing.
  - Paid-but-unconfirmed seed orders are untouched.

**FR-ORD-9 — Closed-purchase query.** · CAP-7 · AD-2
- `orders.hasClosedPurchase(buyerId, businessId)` returns `{ closed: boolean, latestState }`. `closed` is true when at least one order between them has `buyerItemReceivedConfirmedAt` set.
- *Acceptance:* a paid-but-not-closed order returns `closed=false` with `latestState='paid'`.

**FR-ORD-10 — Admin order lookup and support contact.** · CAP-22 (support) · AD-12, NFR-SYS-8
- *Trigger:* Sebastián looks up an order from the admin console, by `orderId` or by buyer or business account.
- *Rules:*
  - Admin only (`AdminOnly`), and **read-only**. The admin sees the three facts with timestamps, the derived status, the snapshots and the event-delivery history. There is no admin action on the order itself (AD-2).
  - The comprobante is viewable through the same 10-minute signed URL as in FR-ORD-6.
  - Every lookup writes an audit row (NFR-SYS-8).
  - The support contact shown to users (NFR-ORD-4) is a configuration value (an email address and an optional WhatsApp number) edited in the admin panel, with its changes audited.
- *Acceptance:* a non-admin gets `AdminOnly`. An admin lookup of a stalled paid order shows all three facts and writes one audit row.

### Non-functional requirements

- **NFR-ORD-1 (mandatory edge case):** out-of-order and duplicate confirmations are safe. The following sequences run for 100 repetitions:
  - the business confirming before the buyer's paid confirmation;
  - the business confirming before any comprobante;
  - double-clicks on every confirmation;
  - two concurrent tabs per role;
  - the buyer's paid confirmation racing expiry at `now = expiresAt`: the order ends either paid with its reservation held, or expired with the reservation released exactly once and the buyer told `OrderNoLongerActive`, never both.

  In every repetition:
  - each fact is set at most once;
  - every rejected action returns an explained code;
  - each event is published at most once per order;
  - no fact is set out of the FR-ORD-3 → FR-ORD-4 and FR-ORD-3 → FR-ORD-5 orderings.
- **NFR-ORD-2:** order creation (including the reservation) responds in p95 ≤ 800 ms. A 5 MB comprobante upload plus validation completes in p95 ≤ 10 s on a 10 Mbps link (Plan-1 NFR).
- **NFR-ORD-3:** 0 funds-held states or payment-gateway calls, verified by a schema check (no balance, escrow or payment-status column on `Order`) and by the NFR-SYS-3 network guard.
- **NFR-ORD-4:** the stalled-order gap is documented in UI copy. A paid order with no business confirmation after 7 days shows the "Waiting for confirmation" state and a link to the configured support contact (FR-ORD-10). No automated action is taken.

### Scenario trace

| Annex scenario | FRs | Proof |
| --- | --- | --- |
| 1 Purchase and reserve | FR-ORD-1, FR-INV-3 | order id returned; quantity decremented at creation |
| 2 Comprobante and paid confirmation | FR-ORD-2, FR-ORD-3, FR-ORD-4, FR-ORD-6 | "paid" only after upload and confirmation; business confirms separately |
| 3 Purchase against an individual-seller listing | FR-ORD-1 | `NotBusinessListing` propagated; no order and no reservation |
| 4 Item received and close | FR-ORD-5, FR-COL-7 | `OrderClosed` snapshot; prompt suggested, not created |
| Edge: out-of-order or duplicate confirmations; stalled order | FR-ORD-3, FR-ORD-4, FR-ORD-5, FR-ORD-8 | NFR-ORD-1, NFR-ORD-4 |

**Out of scope:**
- partial payment;
- multi-listing carts [ASSUMPTION: one listing per order at launch];
- shipping tracking;
- refunds;
- dispute handling (§5).

---

## 15. COM — Commission Ledger & Purchasability

**Host:** `commission` · **Tier:** Advanced · **Form factor:** D (ledger console, top-up review) + R (business balance page) + H (concurrent-deduction simulator) · **Protagonists:** Andrés, Sebastián

**Purpose.** Keep each verified business's prepaid commission balance in an append-only ledger. The ledger reconciles to the peso, charges each confirmed sale exactly once, and pauses and resumes purchasability through one event per threshold crossing. Top-ups are manual in V1, behind a port.

**Owns.**
- `CommissionAccount`: `businessId`, `balanceCop` (an integer that may be negative), `state` (`Funded` or `Exhausted`), `ledgerSeq`.
- `CommissionLedgerEntry`, append-only:
  - `seq`, `kind` (`TopUp` or `Deduction`), `amountCop`;
  - `orderId` (unique for deductions) or `topUpRequestId`;
  - `rateBps`, `baseCop` and `trigger` (`businessConfirmed` or `buyerClosed`) for deductions;
  - `balanceAfter` and `at`.
- `TopUpRequest`.
- `CommissionRateSetting`.
- The events `CommissionBalanceExhausted` and `CommissionBalanceReplenished`.

**Consumes:**
- events: `OrderPaymentConfirmedByBusiness`, `OrderClosed` and `BusinessApplicationApproved`;
- object storage for top-up comprobantes.

**Fakes:**
- a fixture publisher for order and application events, including duplicate and out-of-order delivery;
- a recording subscriber standing in for `listings`;
- a manual top-up adapter.

**Seed.**
- 8 accounts as in §3.
- A ledger of 2,000 historical entries.
- A rate of 800 bps [ASSUMPTION: a fixture value only; the real rate is a SPEC non-goal].
- 3 pending top-up requests.

### Functional requirements

**FR-COM-1 — Open an account on approval.** · CAP-21 · AD-3
- *Rules:*
  - On `BusinessApplicationApproved`, an account is created with `balanceCop=0` and `state=Exhausted`, idempotent by `businessId`.
  - A `CommissionBalanceExhausted { businessId, ledgerSeq: 0, balanceAfter: 0 }` event is published. `listings` already treats a business with no commission state as paused (fail-closed, FR-INV-7), so this event records the state explicitly and is never the only thing keeping the business paused.
  - If the account already exists, which happens only on redelivery of the same approval event, nothing happens and no second event is published.
- *Acceptance:*
  - After approval, Andrés's listings are badged but not purchasable, and they show "Top up your balance to start selling."
  - That holds both before and after the seq-0 event is delivered. Delivering the approval event twice creates one account and publishes one event.

**FR-COM-2 — Request a top-up (manual V1 behind a port).** · CAP-21 · (Plan-2 decision)
- *Trigger:* Andrés transfers money to the platform's account and submits a request.
- *Inputs:*
  - `amountCop`: an integer from 20,000 to 10,000,000 [ASSUMPTION] (`TopUpAmountInvalid`).
  - `transferReference`: 4–40 characters.
  - `comprobante`: the same file rules as FR-ORD-2.
- *Rules:*
  - The request is created in `Pending` and shown to Andrés as "We're checking your transfer."
  - The platform's bank details come from configuration.
  - Confirmation happens through the `TopUpConfirmationPort`:
    - The V1 adapter is the admin action in FR-COM-3.
    - A v2 provider-webhook adapter implements the same port with no domain change (`ADD-§7`), subject to a SPEC amendment (§5).
- *Acceptance:* the request appears in the admin top-up queue oldest-first. The balance does not change until confirmation.

**FR-COM-3 — Admin confirms or rejects a top-up.** · CAP-21 · NFR-SYS-8
- *Rules:*
  - Admin only.
  - A conditional transition `Pending → Confirmed` or `Pending → Rejected`. A second actor gets `TopUpNotPending`.
  - On confirmation, in the same transaction, the ledger is credited: a `TopUp` entry is appended, `balanceCop` is incremented atomically, and `seq` is incremented.
  - If the balance crosses from ≤ 0 to > 0, the account is set to `Funded`, and `CommissionBalanceReplenished { businessId, ledgerSeq, balanceAfter }` is published after commit.
  - A rejection carries a reason that Andrés sees, for example "We couldn't find a transfer with that reference."
  - A business sees only its own requests (`TopUpNotVisibleToCaller`).
  - **Negative balance guidance.** While `balanceCop ≤ 0`, the balance page shows the amount needed to resume, `X = 1 − balanceCop`: "Recarga al menos $X COP para reactivar tus publicaciones." The confirmation message for every top-up states whether listings resumed. When the balance is still ≤ 0 it reads, for example: "Recibimos tu recarga de $20.000 COP. Tu saldo es −$5.000 COP; recarga al menos $5.001 COP para reactivar tus publicaciones."
- *Acceptance:*
  - Confirming a COP 100,000 top-up on an `Exhausted` account with balance 0 gives a balance of 100,000, one ledger entry and one Replenished event.
  - Confirming COP 20,000 on a balance of −25,000 gives −5,000, publishes no event, and the confirmation names 5,001 as the amount needed.

**FR-COM-4 — Deduct commission exactly once per order.** · CAP-21 · AD-3, AD-19, AD-10
- *Trigger:* `OrderPaymentConfirmedByBusiness` or `OrderClosed`, whichever is delivered first (gate decision on OQ-3).
- *Rules:*
  - In one transaction:
    1. Insert a `Deduction` ledger entry keyed uniquely by `orderId`. A duplicate delivery hits the unique key and becomes a no-op success.
    2. Apply one atomic conditional decrement: `balanceCop = balanceCop − c`, returning `before` and `after`. No read-modify-write (AD-19).
  - `c` follows FR-COM-5.
  - The balance may go negative, so a confirmed sale is never refused (AD-19).
  - If the balance crosses from > 0 to ≤ 0, the account is set to `Exhausted` and `CommissionBalanceExhausted { businessId, ledgerSeq, balanceAfter }` is published after commit.
  - **Either trigger deducts, once.** Both events carry both timestamps, and the deduction's effective time is `commissionTriggeredAt = min(sellerReceivedConfirmedAt, buyerItemReceivedConfirmedAt)` over the non-null values. Whichever event is delivered first creates the entry. The second hits the unique `orderId` key and is a no-op, so delivery order never changes the amount or the rate.
  - The entry records `trigger`: `businessConfirmed` if `sellerReceivedConfirmedAt` is the earlier fact or ties with `buyerItemReceivedConfirmedAt`, otherwise `buyerClosed`. One pure function, `commissionTrigger(facts)`, computes both values for both events. For `buyerClosed`, the business's ledger line reads, for example: "Comisión cobrada porque el comprador confirmó que recibió el producto; no habías confirmado el pago." The line points to the support contact (FR-ORD-10) for disputes.
  - Deduction is triggered only by these events, never by a direct call from `orders` (AD-3, amended at the Phase 1 gate to add `OrderClosed` as a trigger; the amendment is recorded as AD-SYS-3).
  - Sebastián can list closed orders whose deduction trigger was `buyerClosed` (FR-COM-8).
- *Resolved conflict:* AD-19 says the decrement happens "in the same transaction as setting `sellerReceivedConfirmedAt`". That contradicts AD-3 and AD-10, which make it a post-commit event subscriber. This PRD states the requirement independently of that choice: exactly one deduction per `orderId`, and a deduction lost to a subscriber failure is recoverable (NFR-SYS-6). OQ-2 is resolved by a transactional outbox with post-commit dispatch (AD-SYS-2) and a deduction keyed by `orderId` (AD-SYS-3, AD-COM-2).
- *Acceptance:*
  - Delivering the same event 3 times creates 1 ledger entry and 1 decrement.
  - An order closed by the buyer with no business confirmation is charged once, with `trigger=buyerClosed`. A later business confirmation of the same order adds no second entry.
  - For an order where the business confirmed at t1 and the buyer closed at t2, delivering `OrderClosed` first and `OrderPaymentConfirmedByBusiness` second yields the same entry (rate at t1, `trigger=businessConfirmed`) as the reverse order.

**FR-COM-5 — Commission amount and rounding rule.** · CAP-21
- *Rules:*
  - The commission is computed as `c = floor((totalCop × rateBps + 5,000) / 10,000)`.
    - `rateBps` is the rate in basis points, an integer from 0 to 10,000.
    - This is round-half-up to the whole peso, computed in exact integer arithmetic (`ADD-§2.6`).
  - `rateBps` and `baseCop` are snapshotted on the entry.
  - The rate used is the one in force at `commissionTriggeredAt` (FR-COM-4), not when the event was processed.
- *Acceptance:* with a rate of 800 bps:
  - `totalCop` 45,000 gives 3,600;
  - 45,006 gives 3,600 (3,600.48);
  - 45,007 gives 3,601 (3,600.56);
  - 1 gives 0.

**FR-COM-6 — Threshold events without flapping.** · CAP-21 · AD-3, AD-9
- *Rules:*
  - Exhausted is published only on a transition from > 0 to ≤ 0, and Replenished only on a transition from ≤ 0 to > 0.
  - Each transition is detected from the `before` and `after` values of the same atomic update.
  - Row-level serialisation on the account makes concurrent updates observe consecutive values.
  - Each event carries `ledgerSeq`, so `listings` applies it only if it is newer (FR-INV-7).
- *Acceptance:* the mandatory edge case (NFR-COM-1).

**FR-COM-7 — Configure the commission rate.** · CAP-21 · NFR-SYS-8
- *Rules:*
  - Admin only.
  - `rateBps` must be an integer from 0 to 10,000, with an `effectiveFrom` of now or a future time. A past `effectiveFrom` is refused with `CommissionRateNotFutureDated`.
  - A migration seeds the A-24 rate (800 bps) effective from the epoch, so a rate always applies.
  - Settings are append-only, so the history is kept.
  - Every change is audited.
  - The value itself is out of scope (SPEC non-goal).
- *Acceptance:* a deduction for an event confirmed before a rate change uses the old rate.

**FR-COM-8 — Ledger views and reconciliation.** · CAP-21
- *Rules:*
  - Andrés sees his own balance, state and ledger, newest first, with each deduction linked to its order id.
  - Sebastián sees any account's ledger, and can filter deductions by `trigger` to review buyer-closed charges.
  - `commission.reconcile(businessId?)` verifies `balanceCop = Σ TopUp − Σ Deduction` and `seq` continuity.
  - A daily job reconciles all accounts and records any discrepancy as an admin alert, with a target of 0.
- *Acceptance:* after the seed and all tests, reconciliation reports 0 discrepancies.

**FR-COM-9 — Low-balance notice.** · CAP-21 · (Plan-1 OQ3)
- *Rules:*
  - When `0 < balanceCop < lowBalanceThresholdCop` (default 20,000 [ASSUMPTION], configurable), Andrés's dashboard shows "Your balance is running low — top up to keep your listings purchasable."
  - This is display-only: no event and no pause.
- *Acceptance:* at a balance of 15,000 the notice shows, and at 0 the paused copy shows instead.

### Non-functional requirements

- **NFR-COM-1 (mandatory edge case):** in 100 repetitions:
  - Setup: two orders, each owing 3,600, are confirmed at the same instant against a balance of 5,000, and one of the events is delivered twice.
  - Each order produces exactly 1 ledger entry.
  - The final balance is 5,000 − 7,200 = −2,200, and the reconciliation identity holds exactly.
  - `CommissionBalanceExhausted` is published exactly once, with 0 Replenished events.
  - A subsequent duplicate delivery changes nothing.
  - Variant: `OrderPaymentConfirmedByBusiness` and `OrderClosed` for the same order are delivered concurrently, 100 repetitions. Exactly 1 ledger entry and 1 decrement result each time.
- **NFR-COM-2:** reconciliation is exact over a randomised sequence of 10,000 top-ups and deductions with 20% duplicate deliveries: `balance = Σ top-ups − Σ deductions` with a difference of 0 pesos.
- **NFR-COM-3:** the deduction handler runs in p95 ≤ 200 ms, and a top-up confirmation in p95 ≤ 800 ms.
- **NFR-COM-4:** 0 floating-point operations on COP in the commission code path, enforced by lint (NFR-SYS-5) and a property test against a BigInt reference.

### Scenario trace

| Annex scenario | FRs | Proof |
| --- | --- | --- |
| 1 Top-up and funded state | FR-COM-2, FR-COM-3, FR-INV-7 | manual confirmation → Replenished → purchasable |
| 2 Deduction on a confirmed sale | FR-COM-4, FR-COM-5 | one entry per `orderId`, from whichever trigger arrives first; redelivery is a no-op |
| 3 Exhaustion → pause | FR-COM-6, FR-INV-7 | one Exhausted; listings paused, visible and editable |
| 4 Replenish → resume | FR-COM-3, FR-COM-6, FR-INV-7 | same listing ids resume |
| Edge: two concurrent confirmations plus a duplicate | FR-COM-4, FR-COM-6 | NFR-COM-1 |

**Out of scope:**
- automatic top-up through a gateway or webhook in V1 (§5);
- invoicing, tax (IVA) or accounting exports [ASSUMPTION: handled outside the platform at launch];
- refunding a commission when an order is later disputed.

---

## 16. TRD — Trade Offer Negotiation

**Host:** `trading` · **Tier:** Advanced · **Form factor:** R · **Protagonists:** Valentina, Julián

**Purpose.** Let collectors negotiate trades of cards, product and cash against individual-seller listings flagged `openToTrade`, with strict turn-taking. Acceptance reserves inventory through the same path as purchases. When the last unit is taken, competing offers are resolved deterministically. Completion is mutual and computed.

**Owns.**
- `TradeOffer`:
  - `listingId` and `sellerId`, `proposerId`;
  - `status` (`Open`, `Accepted`, `Rejected`, `Withdrawn`, `Expired`, `Unfulfillable`, `Cancelled`);
  - `turn` (`seller` or `proposer`) and `version`;
  - `reservationRef`;
  - `proposerConfirmedAt` and `sellerConfirmedAt` (a trade has no buyer, so the parties are named by role in the offer);
  - `expiresAt`.
- `TradeOfferRound`, immutable: `{ round, actor, action, terms: { offeredItems[], cashCop, requestedQty: 1 }, at }`.
- The `TradeAccepted` event.

**Consumes:**
- from `listings`: `getTradeability`, `resolveItemRefs`, `reserveForTrade`, `releaseReservation` and `generateContactMessage`;
- `identity` for party checks.

**Fakes:**
- a listings stub with scripted `openToTrade` values and reservation outcomes;
- an identity stub;
- a two-actor harness that can fire concurrent accepts.

**Seed.**
- The §3 trades: 50 offers.
- 3 last-unit listings, each with 2–4 competing open offers.
- Valentina's `openToTrade` listing and Julián's inventory (5 cards).

### Functional requirements

**FR-TRD-1 — Make an offer on an open-to-trade listing.** · CAP-25 · AD-4
- *Trigger:* Julián submits an offer.
- *Inputs:*
  - `listingId`;
  - `offeredItems[]`: 0–10 entries of `{ itemRef, condition, qty 1–4 }`, validated through `listings.resolveItemRefs`;
  - `cashCop`: an integer from 0 to 10,000,000;
  - `note`: 0–300 characters.
- *Rules:*
  0. The proposer must hold `canBuy` (FR-IDN-1); otherwise `EmailNotVerified` propagates unchanged.
  1. If the proposer is the listing's seller, reject with `SelfTradeNotAllowed`.
  2. Call `listings.getTradeability`. A business listing gets `NotIndividualSellerListing`, propagated unchanged.
  3. If `openToTrade` is false, `listings.getTradeability` throws `ListingNotOpenToTrade` (owned by `listings`), and it is propagated unchanged.
  4. If availability is 0, `getTradeability` throws `InsufficientQuantity` (owned by `listings`), and `trading` propagates it unchanged.
  5. If there are no items and no cash, reject with `EmptyTradeOffer`.
  6. If the proposer already has an `Open` offer on this listing, reject with `DuplicateOpenOffer`.
  7. Otherwise create the offer with `status=Open`, `turn=seller`, round 1, and `expiresAt = now + 7 days` [ASSUMPTION].
- No reservation is made at offer time [ASSUMPTION: an offer is non-binding until it is accepted].
- *Acceptance:*
  - Julián's offer of one card plus COP 20,000 is created in `Open`.
  - The same offer on a listing with `openToTrade=false` is refused with the explanation "Valentina hasn't opened this card to trades."

**FR-TRD-2 — Turn-taking: reject, counter, withdraw.** · CAP-25
- *Rules:*
  - The party whose `turn` it is may `accept`, `reject` or `counter`. The proposer may `withdraw` an `Open` offer at any time.
  - An action out of turn gets `NotYourTurn`, citing whose turn it is.
  - An action on a non-`Open` offer gets `TradeOfferNotOpen`, citing the current status.
  - Every action is a conditional update on `(status='Open', turn=actor, version=v)`, so a stale tab gets `TradeOfferNotOpen` or `NotYourTurn`, never a double action.
  - `counter` replaces the terms (validated as in FR-TRD-1), appends a round and flips the turn.
  - A counter whose terms equal the current round's terms (the same items and quantities, the same cash) is refused with `TradeCounterUnchanged`.
  - At most 10 rounds [ASSUMPTION]; after that only accept or reject are allowed, and an 11th counter is refused with `TradeRoundLimitReached`.
  - `reject` ends the offer.
  - Every round is visible to both parties.
- *Acceptance:* after Valentina counters, a second counter from her gets `NotYourTurn`, and Julián sees the counter terms and the round history.

**FR-TRD-3 — Visibility.** · CAP-25
- *Rules:*
  - Only the proposer and the listing's seller see an offer. Anyone else gets `TradeOfferNotVisibleToCaller`.
  - Admins see offers only in aggregate counts [ASSUMPTION].
- *Acceptance:* a third account requesting the offer id gets `TradeOfferNotVisibleToCaller`.

**FR-TRD-4 — Accept and reserve.** · CAP-25 · AD-4, AD-6
- *Trigger:* the party whose turn it is accepts (the seller on an original offer, the proposer on a counter).
- *Rules:*
  - In one interactive transaction:
    1. A conditional transition `Open → Accepted` on `(status, turn, version)`.
    2. `listings.getTradeability(tx)` re-checks `openToTrade`; if it is false, the call fails with `ListingNotOpenToTrade` and the transaction aborts.
    3. `listings.reserveForTrade(tx, listingId, 1)`; if it throws `InsufficientQuantity`, the transaction aborts.
    4. Store `reservationRef`.
    5. Apply FR-TRD-5 to the `Open` offers on every listing in the reservation's `exhaustedListingIds` (this listing and any sibling sharing its unit, FR-INV-3).
  - After commit, publish `TradeAccepted { tradeOfferId, listingId, sellerId, proposerId, terms, acceptedAt }` and generate the contact handoff (FR-TRD-6).
- *Acceptance:* after acceptance the listing's quantity has dropped by 1 and both parties see the handoff message.

**FR-TRD-5 — Competing offers become unfulfillable.** · CAP-25 · (Plan-2 decision, from the Plan-1 assumption)
- *Rules:*
  - In the accepting transaction, every other `Open` offer on each listing in `exhaustedListingIds` becomes `Unfulfillable`, with reason `ListingNoLongerAvailable`. This includes **sibling listings** that share the exhausted unit (FR-INV-4), for example Valentina's individual listing of card X when a trade on her bundle takes the last copy.
  - Offers on listings whose availability is still ≥ 1 stay `Open`.
  - Proposers see the explanation "Valentina accepted another offer for this card, so this one can't go ahead." The reason is recorded with the round history.
  - If an `Unfulfillable` offer's listing is restocked or a reservation is released, the offer is **not** reopened [ASSUMPTION]; the proposer can make a new offer.
  - **The losing accept.** The winner's marking must never wait on an offer row held by a concurrent accept; the requirement is no deadlock and no lost resolution, and Phase 3 picks the mechanism (for example, skipping locked rows). An acceptance attempt that loses a last-unit race ends in one of two ways:
    - `InsufficientQuantity`, or a refusal from `getTradeability` (the listing is gone, hidden, deactivated or no longer open to trade): its transaction is aborted. It then runs a follow-up conditional transaction `Open → Unfulfillable` on its own offer, which is a no-op if the winner already marked it. Either way the offer's final state is `Unfulfillable`.
    - `TradeOfferNotOpen`: the winner has already marked it. The citation shows its `Unfulfillable` status.
  - No offer on an exhausted listing is left `Open` once both transactions have finished.
- *Acceptance:* the mandatory edge case (NFR-TRD-1).

**FR-TRD-6 — Contact handoff reuses the listings service.** · CAP-25, CAP-6 · AD-4
- *Rules:*
  - On acceptance, `trading` calls `listings.generateContactMessage({ kind: 'trade', listingId, requesterId, tradeSummary })` (FR-MSG-1), where `requesterId` is the proposer.
  - The trade summary lists the offered items (name and condition), the cash in COP and the listing card.
  - The proposer receives the seller's external-contact link; the seller receives a copyable summary and the proposer's display name.
  - `trading` renders nothing itself.
- *Acceptance:* the handoff text contains the listing name, every offered item and "$20.000 COP" formatted per `ADD-§2.7`, and it is produced by the listings service (verified by the fake recording the call).

**FR-TRD-7 — Mutual completion (computed).** · CAP-26 · AD-4
- *Rules:*
  - On an `Accepted` offer, each party can confirm once, setting `proposerConfirmedAt` or `sellerConfirmedAt` with a conditional update where it is null.
  - A repeat confirmation gets `TradeAlreadyConfirmedByRole`. Confirming a non-accepted offer gets `TradeNotAccepted`.
  - `completed = proposerConfirmedAt IS NOT NULL AND sellerConfirmedAt IS NOT NULL` is computed on read and never stored.
  - A one-sided confirmation shows "Waiting for Julián to confirm."
- *Acceptance:* after one confirmation the trade reads `completed=false`; after both it reads `completed=true`. No `completed` column exists.

**FR-TRD-8 — Cancel an accepted trade before confirmation.** · CAP-26 · AD-6
- *Rules:*
  - Either party may cancel while neither has confirmed completion [ASSUMPTION]. Otherwise the cancellation is refused with `TradeNotCancellable`.
  - In one transaction, a conditional transition `Accepted → Cancelled` is applied and the reservation is released.
  - The other party sees the cancellation along with who cancelled.
- *Acceptance:* the listing's quantity is restored exactly once, even under a double submit.

**FR-TRD-9 — Expire open offers.** · CAP-25
- *Rules:*
  - A sweep marks `Open` offers with `now ≥ expiresAt` as `Expired`. It is idempotent and driven by the virtual clock.
  - `Accepted` trades never expire automatically [ASSUMPTION], mirroring AD-2.
- *Acceptance:* at `expiresAt` the offer reads `Expired`, and an accept attempt gets `TradeOfferNotOpen`.

### Non-functional requirements

- **NFR-TRD-1 (mandatory edge case):** in 100 repetitions:
  - Setup: a last-unit listing with two `Open` offers, and Valentina accepting both concurrently from two sessions.
  - Exactly one offer ends `Accepted` with a reservation.
  - The other ends `Unfulfillable`, and its accepting request receives an explained error (`InsufficientQuantity` or `TradeOfferNotOpen`).
  - Listing quantity ends at 0, never negative.
  - Exactly one `TradeAccepted` event and one contact handoff are produced.
  - A sibling variant runs the same race with the two offers on two listings that share one last unit (an individual listing and a bundle). The same outcomes hold, and 0 deadlock aborts are observed.
- **NFR-TRD-2:** accept responds in p95 ≤ 800 ms and other actions in p95 ≤ 500 ms.
- **NFR-TRD-3:** a trade-versus-purchase race on a shared unit never oversells (NFR-INV-2).

### Scenario trace

| Annex scenario | FRs | Proof |
| --- | --- | --- |
| 1 Offer on an open-to-trade listing | FR-TRD-1 | offer created; `ListingNotOpenToTrade` otherwise |
| 2 Reject or counter | FR-TRD-2, FR-TRD-3 | recorded rounds; `NotYourTurn` |
| 3 Accept and reserve | FR-TRD-4, FR-TRD-5, FR-TRD-6 | reservation; handoff; competing offers `Unfulfillable` |
| 4 Mutual completion | FR-TRD-7 | computed `completed` |
| Edge: two accepts from two tabs | FR-TRD-4, FR-TRD-5 | NFR-TRD-1 |

**Out of scope:**
- multi-listing trades, where one offer covers several of the seller's listings;
- reputation for trades [ASSUMPTION: individual-seller reviews are ungated, FR-REP-2];
- adding a traded card to a collection automatically. CAP-27 covers business orders only.

---

## 17. MSG — Messaging & External Contact Handoff

**Host:** `messaging` (in-app, CAP-18) + `listings` (the contact-message service, CAP-6, AD-4; decision-log #3) · **Tier:** Foundation · **Form factor:** H (API explorer with a message preview) + R (composer, inbox) · **Protagonists:** Camila, Valentina, Andrés

**Purpose.** Two contact paths. Each is unambiguous and renders deterministically.
- **External handoff** to individual sellers: a generated message plus a link. The platform never calls the external application.
- **In-app threads** with businesses: available only while the business is `Approved` or `Pending`, and a `Pending` business is shown with an explicit "not yet verified" notice.

**Owns.**
- In `messaging`: `Conversation` (unique per buyer–business pair), `Message` (body, `recipientVerificationAtSend`) and `ConversationReadState`.
- In `listings`: the contact-message service `generateContactMessage` and the `ContactRequestCounter` used for rate limiting.

**Consumes:**
- `identity.getMessagingEligibility`, which gives `messaging` its only dependency (AD-1);
- for the contact service: listing data in its own host, plus the seller's display name and phone from `identity`.

**Fakes:**
- an identity stub whose verification state can change between compose and send;
- fixture listings with edge-case names;
- an external-app stub that asserts it is never called.

**Seed.**
- Fixture listing names, including:
  - "Pokémon Center Exclusivo — Pikachu & Zekrom GX (Niñez) ⚡🔥" (73 characters, with ñ, accent, emoji and ampersand);
  - a 500-character name;
  - a name containing a URL-like string.
- 40 conversations, 10 of them with a `Pending` business.
- 1 `Rejected` business with a prior thread.

### Functional requirements

**FR-MSG-1 — Generate an external contact message (listings service).** · CAP-6, CAP-25 · AD-4
- *Trigger:* Camila selects "contact seller" on an individual-seller listing, or `trading` calls the service on acceptance (FR-TRD-6).
- *Inputs:* `{ kind: 'purchase' | 'trade', listingId, requesterId, tradeSummary? }`.
- *Rules:*
  - Requester must be authenticated (`NotAuthenticated`) and hold `canBuy`, which requires a verified email (`EmailNotVerified`, NFR-SYS-14).
  - A business listing gets `NotIndividualSellerListing`, since business listings use in-app messaging and purchase.
  - A hidden, withdrawn or deactivated listing gets `ListingNotFound`.
  - The text comes from a locale-keyed template filled with typed values, including:
    - the product name;
    - condition;
    - the listed price, formatted per `ADD-§2.7`;
    - for trades, the trade summary.

    Example (es-CO, shown in English for this document): "Hi Valentina! I saw your Charizard ex (NM) on TEZG for $45.000 COP. Is it still available?"
  - The output is:
    - `text`;
    - `externalUrl = https://wa.me/<E.164 without +>?text=<percent-encoded text>` [ASSUMPTION: WhatsApp is the external app at launch; the template is channel-agnostic];
    - `copyText`.
  - The platform performs no request to the external application.
  - The seller's phone appears only in `externalUrl`, and only for authenticated requesters.
- *Acceptance:* for a seed listing, `text` contains the exact product name and "$45.000 COP", and `externalUrl` decodes back to `text` byte-for-byte.

**FR-MSG-2 — Deterministic rendering and edge-safe encoding.** · CAP-6
- *Rules:*
  - Names are NFC-normalised.
  - Encoding is UTF-8 percent-encoding per RFC 3986, and emoji and `ñ` are preserved.
  - If the encoded `externalUrl` would exceed 2,000 characters [ASSUMPTION], text is shortened in this fixed order until it fits, always at grapheme-cluster boundaries with "…":
    1. the product name, down to a minimum of 20 graphemes;
    2. for trades, each offered item's name, longest first, down to a minimum of 20 graphemes each;
    3. for trades, the trailing offered items collapse into "+N more items", keeping at least the first one.

    The price, cash amount, conditions, quantities and seller name are never truncated.
  - `copyText` is never truncated.
  - The same inputs always produce byte-identical outputs.
  - URL-like substrings in names are rendered as plain text.
- *Acceptance:* for the 500-character fixture name:
  - `externalUrl` is ≤ 2,000 characters;
  - it decodes to valid UTF-8 with no broken surrogate pairs;
  - it contains the full price.

  Running the generator 1,000 times gives 1 distinct output. A maximal trade handoff (10 offered items, each with a 200-character name, plus cash) also produces an `externalUrl` ≤ 2,000 characters that keeps the cash amount and every condition, and `copyText` lists all 10 items in full.

**FR-MSG-3 — Protect sellers' phone numbers.** · CAP-6 · NFR-SYS-2
- *Rules:*
  - At most 30 contact messages per requester per rolling hour and 10 per requester per seller per day [ASSUMPTION]. Beyond that the request gets `ContactRateLimited`, citing when it can be retried.
  - A per-IP limit of 60 contact messages per rolling hour applies on top of the per-requester limits, with the same code (NFR-SYS-14). It blunts harvesting through several free accounts.
  - A repeat request for the same `(requesterId, listingId)` within 60 minutes returns the same message and is not counted.
  - Trade handoffs (FR-TRD-6) are not rate-limited.
  - Phone numbers are never logged or included in `Decision` citations.
- *Acceptance:* the 31st request in an hour is refused and cites the retry time.

**FR-MSG-4 — In-app messaging eligibility.** · CAP-18 · AD-11 (Plan-2 decision)
- *Rules:*
  - The recipient must pass `identity.getMessagingEligibility`:
    - `Approved` → allowed.
    - `Pending` → allowed, with notice `RecipientNotYetVerified`, shown in the composer and on every message in the thread: "This shop hasn't been verified by TEZG yet."
    - Anything else → `NotBusinessAccount`, with the message "In-app messages are only for shops on TEZG. For individual sellers, use Contact seller." This covers a `Rejected` business [ASSUMPTION], an individual seller and a buyer.
  - A business cannot open a new conversation with a buyer (`BusinessCannotInitiate`) [ASSUMPTION: an anti-spam default]. It can reply in existing conversations.
  - A business cannot message itself.
- *Acceptance:*
  - Messaging an individual seller's account fails with `NotBusinessAccount`.
  - Messaging a `Pending` business succeeds and the notice is displayed.

**FR-MSG-5 — Send a message.** · CAP-18
- *Inputs:* `recipientBusinessId` (or `conversationId`); `body` of 1–2,000 characters of plain text, NFC-normalised and with no HTML rendering.
- *Rules:*
  - A buyer starting a conversation must hold `canBuy` (verified email, `EmailNotVerified`).
  - Eligibility (FR-MSG-4) is evaluated at send time, not at compose time.
  - The conversation for the pair is created on the first message; it is unique per pair.
  - The message stores `recipientVerificationAtSend` (`Approved` or `Pending`).
  - "Delivered" means persisted and visible to the recipient on their next inbox fetch.
- *Acceptance:* a message is visible in the business's inbox on its next poll.

**FR-MSG-6 — Verification changes between compose and send.** · CAP-18
- *Rules:* The compose view receives the recipient's state when it opens. At send time:
  - If the state has changed from `Pending` to `Approved`, the message is sent and the notice disappears from that point on.
  - If it has changed to `Rejected`, the send fails with `NotBusinessAccount`, citing the state change. The composed text is returned in the error so it isn't lost.
  - If it has changed from `Approved` to `Pending`, which cannot happen (§5: no revocation), that is treated as an invariant breach and logged.
- Earlier messages keep their `recipientVerificationAtSend` snapshot.
- *Acceptance:* flipping the stub from `Pending` to `Rejected` between compose and send yields `NotBusinessAccount`, and no message row is created.

**FR-MSG-7 — Inbox and read state.** · CAP-18
- *Rules:*
  - Each participant has `lastReadMessageId`, which moves forward when they open the thread and never moves back.
  - Unread count = the number of messages from the other party after `lastReadMessageId`.
  - Conversations are ordered by `lastMessageAt` descending, then `conversationId`.
  - Only the two participants can read a thread (`ConversationNotVisibleToCaller`). Message bodies are not visible to admins [ASSUMPTION], and not to any other module.
  - A thread with a `Rejected` business stays readable and cannot receive new messages.
- *Acceptance:* the unread counts are correct after interleaved sends from both sides, and opening the thread sets the reader's count to 0.

**FR-MSG-8 — Mute a conversation (buyer side).** · CAP-18 · added at the Phase 2 gate (review F-29, UX-A-1)
- *Rules:*
  - The buyer participant of a conversation can mute and unmute it. The business participant cannot mute (a shop must see buyer questions).
  - A muted conversation still receives messages and keeps its per-reader read state (FR-MSG-7). Its unread messages are excluded from the caller's total unread count, and it is listed under a "muted" filter instead of the default list.
  - Muting is private: the other participant is never told, and nothing about it appears in the thread.
  - Mute state is one nullable per-participant timestamp (`mutedAt`). Unmuting clears it; unread messages received while muted count again from that moment.
  - Muting is not blocking: the other party can still send, and sends are never refused because of a mute.
- *Acceptance:* after a mute, new messages from the business raise the thread's own unread count but not the caller's total; the business's view is byte-identical with and without the mute; unmute restores the total.

### Non-functional requirements

- **NFR-MSG-1:** contact-message generation takes p95 ≤ 200 ms. Output is deterministic: 1 distinct output per input across 1,000 runs.
- **NFR-MSG-2:** in-app freshness through polling, with no real-time push (§5). The inbox and open threads poll every 30 s. A sent message is visible to the recipient within ≤ 35 s at p95. Send takes p95 ≤ 500 ms.
- **NFR-MSG-3:** 0 outbound calls to external messaging services (NFR-SYS-3 guard).
- **NFR-MSG-4 (mandatory edge case):** every fixture name renders correctly. That covers ñ, accents, emoji, the 500-character name and URL-like text. Correct means:
  - the URL is within the length limit;
  - the round-trip decode is exact;
  - the price is formatted per `ADD-§2.7` for values from 1,000 to 100,000,000.

  The compose→send race behaves per FR-MSG-6 in 100/100 repetitions.

### Scenario trace

| Annex scenario | FRs | Proof |
| --- | --- | --- |
| 1 Contact an individual seller | FR-MSG-1, FR-MSG-2 | name and COP price present; encoded link decodes exactly |
| 2 In-app message to a verified business | FR-MSG-5, FR-MSG-7 | delivered; read/unread tracked |
| 3 Ineligible recipient (`Pending` decided) | FR-MSG-4 | `NotBusinessAccount`; `Pending` allowed with a notice |
| 4 Trade handoff reuse | FR-MSG-1, FR-TRD-6 | same service; trade summary; nothing reimplemented |
| Edge: long or special names, COP formatting, verification changes | FR-MSG-2, FR-MSG-6 | NFR-MSG-4 |
| Phase 2 gate addition: mute a conversation | FR-MSG-8 | the muted thread leaves the total unread count; the business sees no difference (MSG-S2 variant) |

**Out of scope:**
- attachments in in-app messages;
- email or push notifications of new messages [ASSUMPTION: in-app unread badge only at launch];
- message moderation and reporting;
- buyer-to-individual-seller in-app chat (not a CAP).

---

## 18. COL — Collection, Binder & Wishlist

**Host:** `collections` · **Tier:** Intermediate · **Form factor:** R · **Protagonists:** Valentina, Camila

**Purpose.** Let collectors keep several named collections. Every entry carries its acquisition source, and a binder is arranged the collector's way. Cards missing from the catalog can be added by link. The wishlist is kept separate from collections. Closing a business order produces exactly one dismissible add-to-collection prompt.

**Owns.**
- `Collection`: name, `ownerId`, `binderLayout`.
- `CollectionEntry`:
  - `cardRef`, a tagged union: `{ kind: 'catalog', catalogEntryId }` or `{ kind: 'external', url, title, imageUrl? }`;
  - `source` (required): `Manual` or `PlatformPurchase`;
  - `orderId?` and `qty`;
  - `acquiredAt` and `acquiredPriceCop?`;
  - `manualPosition`.
- `WishlistEntry`.
- `PostPurchasePrompt`.

AD-7's `BinderEntry` is realised as `CollectionEntry` plus the collection's binder layout. There is no separate binder table (ARCHITECTURE §6.10, A-41).

**Consumes:**
- `catalog.getEntries`;
- `listings.getAvailabilitySummary`;
- the `OrderClosed` event.

**Fakes:**
- a catalog stub;
- a listings availability stub;
- a fixture `OrderClosed` publisher that can deliver twice.

**Seed.**
- The §3 collections.
- Valentina's collection "Kanto 151": 120 entries in a 3×3 binder, including 2 promos added by link.
- Camila's wishlist of 15 entries with mixed availability.
- 5 closed orders with prompts in each state (pending, accepted, dismissed).

### Functional requirements

**FR-COL-1 — Named collections.** · CAP-11
- *Rules:*
  - A name is 1–60 characters and unique per owner, case- and accent-insensitive (`CollectionNameTaken`).
  - An owner has at most 50 collections (`CollectionLimitReached`).
  - A "General" collection is created on first use.
  - A collection can be renamed.
  - Deleting a collection requires an explicit confirmation and removes its entries [ASSUMPTION: this is user-owned data, not moderated content, so hide-never-delete does not apply].
  - Unknown or foreign ids get `CollectionNotFound`.
- *Acceptance:* Valentina creates "Keep" and "For trade", and a second "keep" is refused with `CollectionNameTaken`.

**FR-COL-2 — Add an entry manually.** · CAP-8, CAP-12 · AD-7
- *Inputs:*
  - `collectionId`;
  - `cardRef`;
  - `qty`, 1–999;
  - `acquiredAt`, a date not in the future (default today, `America/Bogota`);
  - `acquiredPriceCop`, optional, an integer from 0 to 100,000,000.
- *Rules:*
  - `source` is always `Manual` on this path. `PlatformPurchase` can be set only through FR-COL-7.
  - A catalog `cardRef` must resolve (`InvalidItemRef`, owned by `listings`, is not reused here; unknown ids get `InvalidCatalogEntry`).
  - The same card can appear in several entries, for example with different acquisition dates.
- *Acceptance:* a `Manual` entry and a `PlatformPurchase` entry sit in the same collection, each showing its source badge.

**FR-COL-3 — Add an entry by link.** · CAP-24 · AD-7
- *Rules:*
  - External `cardRef` fields:
    - `url`: https only, ≤ 2,048 characters;
    - `title`: 1–120 characters;
    - `imageUrl`: optional, https only.
  - Anything else is refused with `InvalidExternalLink`, citing the failing field.
  - The platform never fetches the URL server-side [ASSUMPTION: this avoids SSRF; the image loads in the client with a referrer policy].
  - **No `CatalogEntry` is ever created**, and the catalog tables are never written by `collections` (AD-8).
  - The entry displays with its title, the source domain and an "Added by link" badge.
- *Acceptance:* after adding 2 promos by link, the `CatalogEntry` count is unchanged, and both promos render in the binder.

**FR-COL-4 — Move and copy between collections.** · CAP-11
- *Rules:*
  - Move changes `collectionId`.
  - Copy creates a new entry with the same `cardRef`, `source`, `orderId`, `qty` and `acquiredAt`.
  - Both require ownership of the source and target collections.
  - An unknown or foreign entry id on move, copy, edit or remove gets `CollectionEntryNotFound`, with no hint that the entry exists for another user.
- *Acceptance:* a copied `PlatformPurchase` entry keeps `source=PlatformPurchase` and its `orderId`.

**FR-COL-5 — Binder layout, sorting and completion.** · CAP-10
- *Rules:*
  - Layout: `rows × cols`, each from 1 to 5 (default 3×3). The page size is rows × cols.
  - Sort: up to 3 keys from `acquiredAt`, `value` (from VAL), `set`, `number`, `pokemon`, `artist`, `colour` and `manual`, each ascending or descending.
    - The final tie-break is always `entryId` ascending.
    - For catalog-attribute keys, external-link entries sort after catalog entries, by title.
  - The layout and sort are saved per collection.
  - `manual` order uses `manualPosition` and supports drag-to-reorder.
  - Completion progress, for a collection filtered to one set = distinct `kind=card` catalog entries owned from that set ÷ the number of `kind=card` catalog entries in that set. The denominator is counted from the catalog, not from the printed `CatalogSet.cardCount`, so secret rares numbered above the printed total (for example 191/165) are included. Sealed products and link-added entries never count. The numerator is a subset of the denominator, so completion never exceeds 100%. It is shown as a whole percentage, rounded down, plus the count, for example "37/191 (19%)".
- *Acceptance:*
  - Sorting 120 entries by set then Pokémon in a 3×3 layout gives 14 pages, the same page content on every render, and the 2 link entries on the last page.
  - Owning every card of a set that has secret rares shows exactly 100%. Owning a sealed product from the set doesn't change the count.

**FR-COL-6 — Wishlist, separate from collections.** · CAP-13, CAP-14
- *Rules:*
  - A wishlist entry is `{ catalogEntryId, maxPriceCop?, note? }`, one per catalog entry per user.
  - Adding to the wishlist never creates a `CollectionEntry`.
  - The wishlist is viewable independently.
  - Sorting is by `lowestPriceCop` (from `listings.getAvailabilitySummary`), by `availableCount`, or by date added. Unavailable items sort last, then by `entryId`.
  - An optional area (as in FR-DSC-1) restricts availability to nearby listings.
  - A "within your max price" marker shows when `lowestPriceCop ≤ maxPriceCop`.
- *Acceptance:* Camila's 15-item wishlist sorted by price puts the 4 items with no listings last, and her collection count is unchanged.

**FR-COL-7 — Exactly one post-purchase prompt per closed order.** · CAP-27 · AD-9, AD-10
- *Rules:*
  - On `OrderClosed`, a `PostPurchasePrompt { orderId (unique), buyerId, lines snapshot, buyerItemReceivedConfirmedAt (the order's close fact, which sets the entries' acquired date), status: Pending }` is created. A redelivery hits the unique key and does nothing.
  - Accept (`collectionId`): a conditional transition `Pending → Accepted`, and in the same transaction one entry per line with `source=PlatformPurchase`, the `orderId` and `qty`. A second accept gets `PromptAlreadyResolved` and creates nothing.
  - Dismiss: a conditional transition `Pending → Dismissed`.
  - Ignoring the prompt leaves it `Pending` with no expiry [ASSUMPTION], and it creates nothing.
  - The order's closed state is never read or written by `collections`.
- *Acceptance:* the mandatory edge case (NFR-COL-1).

### Non-functional requirements

- **NFR-COL-1 (mandatory edge case):** in 100 repetitions:
  - Setup: `OrderClosed` is delivered twice, then the prompt is accepted twice concurrently from two sessions.
  - Exactly 1 prompt row exists and exactly 1 entry per order line.
  - The second accept receives `PromptAlreadyResolved`.
- **NFR-COL-2:** a binder page render (sorted, 500-entry collection) takes p95 ≤ 800 ms. A wishlist of 200 items with availability takes p95 ≤ 1,000 ms.
- **NFR-COL-3:** there are 0 `CatalogEntry` writes from `collections`, verified by table-ownership lint (AD-8) and by a count assertion around the FR-COL-3 tests.

### Scenario trace

| Annex scenario | FRs | Proof |
| --- | --- | --- |
| 1 Binder layout and sort | FR-COL-5 | deterministic pages and completion |
| 2 Link-added entry | FR-COL-3 | renders; no placeholder `CatalogEntry` |
| 3 Wishlist vs collection | FR-COL-6 | separate; sorted by price and availability |
| 4 Post-purchase prompt | FR-COL-7 | accept creates `PlatformPurchase`; dismiss or ignore creates nothing; order unaffected |
| Edge: `OrderClosed` twice plus accept twice | FR-COL-7 | NFR-COL-1 |

**Out of scope:**
- importing collections from other apps;
- sharing or publishing a collection publicly [ASSUMPTION: collections are private at launch];
- prompts for completed trades.

---

## 19. VAL — Collection Valuation & Trend

**Host:** `collections` · **Tier:** Intermediate · **Form factor:** R · **Protagonists:** Valentina, Camila

**Purpose.** Tell a collector what a collection is worth today in COP, how that changed over a chosen period, and how it evolved over time. The arithmetic is exact and integer. USD and COP never mix. Every unpriced or stale item is explained.

**Owns.**
- the valuation read model, computed on request, with no stored valuation [ASSUMPTION: it is recomputed each time; caching is a Phase 3 option];
- the trend and history formulas;
- the `notValued` explanations.

**Consumes:**
- COL entries, from the same host;
- `catalog.getReferencePricesAsOf` and `getPriceProvenance`;
- `catalog.getFxRate`, only for displaying a USD equivalent.

**Fakes:**
- a catalog stub with a time-travel price table and an FX fixture editor;
- a COL fixture of 500 entries.

**Seed.**
- Valentina's 500-entry collection:
  - 20 entries added by link;
  - 30 entries with no reference price;
  - 25 entries with stale prices;
  - 15 entries acquired within the last 30 days;
  - quantities from 1 to 12.
- Camila's 6-entry starter collection, all acquired 10 days ago. This gives the zero-baseline case.

### Functional requirements

**FR-VAL-1 — Current value in integer COP.** · CAP-9 · money rule
- *Rules:*
  - For each entry with a catalog `cardRef` and a reference price as of the valuation date, `entryValueCop = unitCop × qty`.
    - `unitCop` is the `cop` component of the latest `ReferencePrice`, already an integer; the conversion rounding happens exactly once, at the catalog (`ADD-§2.1`).
    - The multiplication by `qty` is exact.
  - `totalCop = Σ entryValueCop`, as an exact integer sum. Because every term is an integer, **the sum of per-item values equals the total by construction**.
  - The only possible drift is between this total and a hypothetical "convert the USD totals once" figure, `convertOnce`. Because each observation is converted with the TRM of its own date (FR-CAT-5), `convertOnce` is defined per rate date: the FX-derived entries are grouped by `fxRateDate`, and `convertOnce = Σ over groups g of round_half_up(ΣUSD_g × rate_g)` (`ADD-§2.8`).
  - The drift `|Σ fx-derived entryValueCop − convertOnce|` is bounded by `conversionDriftBoundCop = floor(Σ qty over fx-derived entries / 2)` pesos. Entries priced natively in COP (`copDerivation='sourceNative'`) carry no conversion error and are left out. The bound is reported and never applied to the total.
- *Output:* `{ totalCop, valuedCount, notValued[], staleCount, asOf, conversionDriftBoundCop }`.
- *Acceptance:* for the 500-entry seed, `totalCop` equals an independent BigInt recomputation exactly (0 pesos difference).

**FR-VAL-2 — Period trend with a defined zero baseline.** · CAP-9, CAP-3
- *Inputs:* `period` of 7, 30 (default), 90 or 365 days. Any other value gets `InvalidValuationPeriod`.
- *Rules:*
  - `start = asOf − period`.
  - `V(t)` = the value of entries held at `t` (`acquiredAt ≤ t`), priced as of `t`. "Held" is reconstructed from the entries that exist **now** [ASSUMPTION]. Removed, moved or deleted entries leave no history, so `V(t)` is "what your current cards were worth at `t`", not a record of past holdings. The UI labels the trend and history that way (`ADD-§1`).
  - `referencePriceAtStart = V(start)`.
  - `changeCop = V(asOf) − V(start)`.
  - If `V(start) > 0`, then `changePercent = round_half_up(changeCop × 10,000 / V(start)) / 100`, an exact rational rounded to 2 decimal places (`ADD-§2.2`).
  - If `V(start) = 0`, either because nothing was held or nothing was priced at the start, then `changePercent = null` with reason `ValuationNoBaseline`. The UI shows the absolute `changeCop` and "New this period" instead of a percentage. There is never a division by zero, `Infinity` or `NaN`.
  - A secondary `marketChangePercent` uses only the entries held for the whole period, so the price-only change is visible separately from acquisitions [ASSUMPTION].
- *Acceptance:*
  - Camila's collection gives `changePercent=null` with `ValuationNoBaseline`.
  - Valentina's gives a finite value that matches the reference computation to 0.01.

**FR-VAL-3 — Unpriced and stale items.** · CAP-9, CAP-12
- *Rules:*
  - Entries added by link are excluded from the total, with reason `ExternalEntryNotInCatalog` ("Added by link — no catalog price").
  - Catalog entries with no reference price are excluded, with reason `NoReferencePrice`.
  - Stale prices (FR-CAT-7) are included and labelled "stale · price from \<date\>".
  - The summary line reads "Valued 450 of 500 items · 25 with stale prices."
- *Acceptance:* the 500-entry seed reports `valuedCount=450`, 50 `notValued` items (20 link-added and 30 unpriced), each with a reason, and `staleCount=25`.

**FR-VAL-4 — Value history series.** · CAP-9
- *Rules:*
  - Daily points `(date, V(date))` from `max(earliest acquiredAt, asOf − 365 days)` to `asOf`, in `America/Bogota` calendar days.
  - A day without a new observation carries the last known price forward, and the point is marked stale.
  - The series is non-empty whenever at least one priced entry exists, and every value is integer COP.
  - A priced entry acquired mid-period produces a step on its `acquiredAt` date.
  - The series is labelled "What your current cards were worth" (FR-VAL-2), and it is recomputed from current entries on every request.
- *Acceptance:*
  - Adding a priced entry dated 12 days ago produces a series whose value rises by exactly `entryValueCop` on that date, and the series has one point per day.
  - Removing that entry removes its step from every past point, as the label states.

**FR-VAL-5 — Money-shape separation.** · CAP-3, CAP-9 · money rule
- *Rules:*
  - Totals, trend and history are `Cop` only.
  - A per-item USD reference may be shown as a separate labelled field, "USD 12.34 · TRM as of \<date\>", and is never summed into a COP figure.
  - The types make mixing them a compile error (NFR-SYS-5).
- *Acceptance:* a type-level test attempting to add a `ReferencePrice` to a `Cop` fails to compile.

### Non-functional requirements

- **NFR-VAL-1 (mandatory edge case):**
  - The zero baseline yields `changePercent=null`, never `NaN` or `Infinity`, across the empty collection, the all-unpriced collection and the all-new collection.
  - For the 500-entry collection, `Σ entryValueCop == totalCop` exactly, and `|Σ fx-derived entryValueCop − convertOnce| ≤ conversionDriftBoundCop`, with `convertOnce` grouped by `fxRateDate` (FR-VAL-1). This is property-tested over 1,000 random collections of 1–500 entries, spanning several TRM dates and mixing native-COP and FX-derived prices.
- **NFR-VAL-2:** current value plus the 30-day trend for 500 entries takes p95 ≤ 1,500 ms, and the 365-day history p95 ≤ 2,500 ms.
- **NFR-VAL-3:** 0 floating-point operations on COP in valuation code. Percentages are computed in exact integer or rational arithmetic and formatted at presentation.

### Scenario trace

| Annex scenario | FRs | Proof |
| --- | --- | --- |
| 1 Current value | FR-VAL-1 | exact integer total; rounding stated once at the catalog |
| 2 Period trend | FR-VAL-2 | `period`, `changePercent`, `referencePriceAtStart`; `null` on zero baseline |
| 3 Unpriced or stale items | FR-VAL-3 | excluded with reasons; stale labelled |
| 4 Value history series | FR-VAL-4 | step at the acquisition date; non-empty COP series |
| Edge: zero baseline and 500-entry drift | FR-VAL-1, FR-VAL-2 | NFR-VAL-1 |

**Out of scope:**
- valuation based on the platform's own sale prices (never; CAP-3);
- condition-adjusted valuation [ASSUMPTION: reference prices are condition-agnostic at launch];
- portfolio analytics beyond total, trend and history.

---

## 20. REP — Reviews, Reputation & Moderation

**Host:** `reviews` + `listings` (the listing hide command, AD-12) · **Tier:** Foundation · **Form factor:** R (review form, profile) + D (moderation queue) · **Protagonists:** Camila, Andrés, Sebastián

**Purpose.** A reputation that means what it says:
- reviews of businesses are gated on a completed purchase, which is stricter than "paid";
- reviews of individual sellers are openly labelled as ungated;
- aggregates are exact and exclude hidden reviews immediately;
- moderation hides content and never deletes it, with a reason and a full audit trail.

**Owns.**
- `Review`: `reviewerId`, `targetUserId`, `targetKind`, `rating` (1–5), `text` (0–1,000), `purchaseVerified` (a boolean snapshot), `hiddenAt`/`hiddenReason`/`hiddenBy`, `editedAt`.
- `ReviewModerationLog`.
- The aggregate computation.
- `reviews.hideReview` and `reviews.unhideReview`.

In `listings`: `listings.hideListing` and `listings.unhideListing`, with `ListingModerationLog`.

**Consumes:**
- `orders.hasClosedPurchase`;
- `identity.getReviewTarget`.

**Fakes:**
- an orders stub with scripted closed and paid-not-closed states;
- an identity stub;
- a listings hide fake for the module's own suite.

**Seed.**
- The §3 reviews: 400, of which 15 are hidden.
- Andrés with 13 reviews (1 hidden). The 12 visible ratings sum to 51, so the average sits exactly on a rounding boundary (4.25 → 4.3, `ADD-§2.9`).
- One of Camila's orders in paid-but-not-closed state.
- A policy-reason list (`ADD-§9.2`).

### Functional requirements

**FR-REP-1 — Gated review of a business.** · CAP-7 · AD-2
- *Rules:*
  - The target must be a business whose application is `Approved`. Any other business target, and any account that isn't a seller, gets `TargetNotFound`.
  - `orders.hasClosedPurchase(reviewer, business)` must be `closed=true`. Otherwise the review is refused with `NotVerifiedPurchaser`, and the message explains the difference: "You can review Andrés's shop once you've confirmed the item arrived — paying isn't enough." The citation includes `latestState`.
  - Each reviewer can hold one review per target (`DuplicateReview`). They can edit it, which sets `editedAt`.
  - `purchaseVerified=true` is snapshotted on the review.
- *Acceptance:*
  - Camila, with only a paid order, gets `NotVerifiedPurchaser`.
  - After the order closes, the same request succeeds.

**FR-REP-2 — Ungated review of an individual seller.** · CAP-7 · (SPEC flagged risk)
- *Rules:*
  - The target must have a complete individual-seller profile (`TargetNotFound` otherwise).
  - There is no purchase check, and `purchaseVerified=false`.
  - The one-review-per-target rule applies.
  - Self-review and collusion detection are out of scope (§5).
- *Acceptance:* a review of Valentina succeeds with no order between the two accounts.

**FR-REP-3 — Aggregate reputation with a stated rounding rule.** · CAP-7 · AD-12
- *Rules:*
  - The aggregate uses visible reviews only (`hiddenAt IS NULL`).
    - `count` is their number.
    - `average` = `round_half_up(10 × sum / count) / 10`, computed from the integer sum and count, so it is exact to one decimal (`ADD-§2.9`).
  - With `count = 0` the profile shows "No reviews yet", never 0.0.
  - The aggregate is computed from the same snapshot as the review list in one read, so a list and an average never disagree.
  - A business profile says "From verified purchases". An individual seller's profile says "Reviews aren't linked to purchases".
- *Acceptance:*
  - Andrés's 12 visible reviews give 4.3 (sum 51, count 12), not 4.2.
  - Hiding one changes `count` and `average` on the next read.

**FR-REP-4 — Hide and unhide a review.** · CAP-28 · AD-12
- *Rules:*
  - Admin only.
  - Hide sets `hiddenAt`, `hiddenBy` and `hiddenReason` (a policy reason code plus a note of up to 500 characters), and writes a `ReviewModerationLog` row.
  - Unhide clears the fields and logs the action.
  - Both are conditional, so a double hide gets an explained no-op that cites the existing hide.
  - An unknown review id on edit, hide or unhide is refused with `ReviewNotFound`.
  - A hidden review disappears from default reads and the aggregate on the next read. The row is never deleted.
  - The author sees their review marked "Hidden by TEZG moderation", with the reason.
- *Acceptance:* hide, then unhide, restores the prior aggregate exactly, and 2 log rows exist.

**FR-REP-5 — Hide and unhide a listing (listings host).** · CAP-28 · AD-12
- *Rules:*
  - Uses the same shape as FR-REP-4, on `Listing`, through `listings.hideListing`, admin only.
  - A hidden listing is excluded from browse and detail at once (FR-DSC-6, FR-INV-10), and new orders and offers against it fail with `ListingNotFound`.
  - Existing orders and accepted trades proceed [ASSUMPTION: hiding does not cancel commitments already made], and open offers stay visible to their parties.
  - Unhiding restores the listing in place.
- *Acceptance:* a hidden counterfeit listing is absent from browse on the next call and present in the moderation view with its reason.

**FR-REP-6 — Moderation queue and audit view.** · CAP-28 · NFR-SYS-8
- *Rules:*
  - Admin only.
  - A combined view reads each module's own log through its public query (no shared table): hidden reviews and listings with reason, actor, time and unhide history.
  - It can be filtered by type, reason and date, 50 items per page.
- *Acceptance:* every hide and unhide performed in the tests appears exactly once in the audit view.

**FR-REP-7 — Profile page with reviews.** · CAP-7
- *Rules:*
  - The profile shows the aggregate, the purchase-verified label, and visible reviews newest first, 20 per page.
  - Each review shows its rating, text, date, the "verified purchase" marker where applicable, and "edited" where applicable.
- *Acceptance:* the profile page never renders a hidden review to a non-admin.

### Non-functional requirements

- **NFR-REP-1 (mandatory edge case):**
  - A review submitted while the order is paid but not closed is refused with `NotVerifiedPurchaser` in 100/100 cases.
  - A hide and a new post on the same target run concurrently, 100 repetitions. Every subsequent read shows `count` and `sum` consistent with exactly the set of visible committed reviews: the hidden one is never counted and the new one is never dropped.
- **NFR-REP-2:** a profile read (aggregate plus the first page) takes p95 ≤ 300 ms. A hide takes effect on the very next read (0 s cache).
- **NFR-REP-3:** 0 hard deletes of `Review` or `Listing` rows, verified by revoking the application's DB role's `DELETE` privilege on those tables in a test that runs the full suite.

### Scenario trace

| Annex scenario | FRs | Proof |
| --- | --- | --- |
| 1 Gated review of a business | FR-REP-1 | refused before close with a "paid isn't enough" explanation; accepted after |
| 2 Ungated individual-seller review | FR-REP-2 | accepted with no order |
| 3 Aggregate reputation | FR-REP-3 | stated rounding; hidden excluded |
| 4 Admin hide and audit | FR-REP-4, FR-REP-5, FR-REP-6 | vanish at once; retained with a reason; unhide |
| Edge: review while paid-not-closed; hide concurrent with a post | FR-REP-1, FR-REP-3 | NFR-REP-1 |

**Out of scope:**
- user-submitted reports (§5);
- replies from businesses to reviews [ASSUMPTION: v2];
- review anti-abuse beyond the purchase gate (SPEC non-goal).

---

## 21. Open Questions

Each open question has an owner phase and a recommended answer. **Gate** means the Phase 1 human gate must answer it. **Phase 3** means the architecture resolves it with an AD.

| # | Question | Why it matters | Recommendation | Owner |
| --- | --- | --- | --- | --- |
| OQ-1 | Can a business whose latest application is `Rejected` complete the individual-seller profile instead? | It is the reverse of the "graduation" path, and AD-18 is silent on it. | No: keep them blocked with `BusinessApplicationOnFile` while any application is on file. This is simpler and consistent with no graduation. | **Resolved at gate:** No (as recommended) |
| OQ-2 | AD-19 places the deduction "in the same transaction as setting `sellerReceivedConfirmedAt`", while AD-3 and AD-10 make it a post-commit event subscriber that is never retried. Which holds? | A deduction lost to a failed subscriber is lost revenue at launch. | Keep the event (AD-3) and add a durable delivery record so a failed deduction is detectable and replayable (NFR-SYS-6, for example a transactional outbox). Record an AD-SYS that supersedes AD-19's transaction clause. | **Resolved in Phase 3:** AD-SYS-2, AD-SYS-3 (ARCHITECTURE §12.1) |
| OQ-3 | FR-ORD-5 lets a buyer close an order before the business confirms payment. A business that never confirms is never charged commission. | Commission avoidance. | Add an admin view of closed-but-unconfirmed orders at launch (the audited lookup in FR-ORD-10 is the base for it), and decide at the gate whether `OrderClosed` without a prior seller confirmation should also trigger a deduction. That would amend AD-3's "only" trigger. | **Resolved at gate:** charge on whichever comes first, business confirmation or buyer close, once per order (FR-COM-4). Phase 3 records the AD-3 amendment as an AD-SYS. |
| OQ-4 | Where do the failed-delivery log and admin replay live (NFR-SYS-6)? | Durability of event effects. | A shared-kernel outbox table written in the publisher's transaction, with a dispatcher; each subscriber stays idempotent. | **Resolved in Phase 3:** AD-SYS-2, ARCHITECTURE §7.3 |
| OQ-5 | Platform-wide personal-data consent (NFR-SYS-12) goes beyond AD-13's `legalIdentity` scope. Is it adopted? | Ley 1581 applies to phone numbers, locations and message bodies. | Adopt it: record the sign-up consent and the phone-sharing consent. | **Resolved at gate:** adopted |
| OQ-6 | `trading → catalog` is not an AD-1 edge. | Validating offered items. | Route through `listings.resolveItemRefs`, which delegates to `catalog`. No new edge. | **Resolved in Phase 3:** as recommended, AD-TRD-3 rule 5 |
| OQ-7 | Can `shared-kernel` own a boundary error code (`RequestValidationFailed`)? | AD-11 lists module owners only. | Yes, as the single transport-validation code, kept separate from domain codes. | **Resolved in Phase 3:** yes, produced only by the input parser (AD-SYS-1 rule 7) |
| OQ-8 | Card detail and catalog browse need `hasActiveListings` and the listing price, but `catalog` cannot depend on `listings`. | AD-1 direction. | Compose them in `listings` (FR-DSC-7, FR-DSC-1). `catalog` stays dependency-free. | **Resolved in Phase 3:** as recommended, AD-DSC-2 |
| OQ-9 | Which production catalog and price feed, and under what licence? | Launch blocker outside the architecture. | Keep the feed behind a port and evaluate candidate providers before launch. Fixtures are used until then. | Team, pre-launch |
| OQ-10 | AD-6 keys `InventoryUnit` by `(sellerId, itemRef)`, but `condition` lives on `Listing` (AD-7). Two copies in different conditions cannot share a pool. | Oversell or under-sell across conditions. | Key the unit by `(sellerId, itemRef, condition)`, and record an `AD-INV` refining AD-6. | **Resolved in Phase 3:** as recommended, AD-INV-1 |
| OQ-11 | Product parameters: unpaid-order TTL (48 h); open-offer TTL (7 days); contact rate limits (30/h, 10 per seller per day, 60/h per IP); top-up bounds (COP 20,000–10,000,000); open-order limits (3 per buyer, 1 per buyer per business); auth throttles (10 failed attempts per account and 30 per IP per 15 min, 5 sign-ups per IP per hour). | They affect the UX and abuse resistance. | Adopt the stated defaults as configuration, and revisit them after 30 days of launch data. | **Resolved at gate:** defaults adopted as configuration |
| OQ-12 | How long is each class of regulated personal data kept: legal-identity documents (including rejected and barred applicants), payment comprobantes, top-up proofs, phone numbers, message bodies? | Ley 1581 requires a stated purpose and retention period. Keeping everything forever is a liability, and deleting too early breaks audits and disputes. | Adopt `[ASSUMPTION]` defaults for launch: legal-identity documents for 5 years after the last decision; buyer comprobantes for 5 years; top-up proofs for 10 years, since they support the platform's own accounting (`ADD-§9.4`); phone numbers and message bodies until account closure plus 1 year. Get legal review before launch. Data-subject requests (access, correction, deletion) are handled manually by an admin at launch. | **Resolved at gate:** defaults adopted; legal review before launch remains a pre-launch task |

## 22. Success Metrics and Counter-Metrics

The metrics the platform tracks after launch. Every target is measured weekly from application data (`ADD-§10`).

| Metric | Target | Counter-metric (must not degrade) |
| --- | --- | --- |
| Oversell incidents (reservations exceeding stock) | 0 | Reservation-failure rate for single-buyer, non-contended purchases < 0.5% |
| Commission ledger discrepancies (daily reconcile) | 0 pesos | Median top-up confirmation time ≤ 24 h, so manual review does not stall sellers |
| Explained-decision coverage (NFR-SYS-1) | 100% | Support tickets saying "I don't understand why X was refused" ≤ 2% of refusals |
| Business applications decided within 3 business days | ≥ 90% | Re-rejection rate after reapplication ≤ 30% (the reason texts are actionable) |
| Stale reference prices shown (share of card-detail views) | ≤ 5% | Zero fabricated or merged price values (NFR-CAT-3) |
| Orders reaching "closed" within 14 days of creation | ≥ 70% | Unpaid-order expiry rate ≤ 25% (the TTL isn't too aggressive) |
| Post-purchase prompts accepted | tracked, no target | Prompts created per closed order = 1.00 exactly |
| Event deliveries unresolved for more than 24 h: failed (from the first failure) or stuck pending (from creation) (NFR-SYS-6) | 0 | Replays that produce a duplicate effect = 0 (subscribers stay idempotent) |

## 23. Assumptions Index

Every `[ASSUMPTION]` in this document, for triage at the gate. "Blocking?" says whether UX or architecture can proceed with the default.

| # | Where | Assumption | Blocking? |
| --- | --- | --- | --- |
| A-1 | §6 | es-CO is the launch locale; the English copy is illustrative | No |
| A-2 | §7 | Latency measurement protocol (4 vCPU / 8 GB, 500 samples, p95 server-side) | No |
| A-3 | NFR-SYS-8 | Admin audit records are retained indefinitely | No |
| A-4 | NFR-SYS-12 | Platform-wide consent at sign-up and phone-sharing consent (OQ-5) | Resolved at gate |
| A-5 | §5 | No revocation of `Approved` businesses in V1 | No |
| A-6 | §5 | No user-submitted moderation reports | No |
| A-7 | FR-IDN-2 | A `Rejected` business cannot complete the individual profile (OQ-1) | Resolved at gate |
| A-8 | FR-IDN-6, FR-MSG-4 | A `Rejected` business is not eligible for in-app messages | No |
| A-9 | FR-VER-4 | Policy edits don't affect already-decided rejections | No |
| A-10 | §10 out of scope | No applicant withdrawal of a `Pending` application | No |
| A-11 | §11 | Sealed products are `CatalogEntry` rows of kind `sealedProduct` | No |
| A-12 | FR-CAT-4 | The feed gives reprints distinct external keys | No |
| A-13 | FR-CAT-7 | Fixture freshness threshold 36 h (24 h period + 12 h grace); the real value is measured at implementation | No |
| A-14 | §11 out of scope | No admin hand-editing of catalog entries in V1 | No |
| A-15 | FR-INV-1 | `InventoryUnit` keyed by condition as well (OQ-10) | Resolved in Phase 3 (AD-INV-1) |
| A-16 | FR-INV-2 | A bundle has at least 2 cards | No |
| A-17 | §12 out of scope | No per-listing photos in V1 | No |
| A-18 | FR-DSC-6 | No caching of browse results at launch | No |
| A-19 | NFR-DSC-1 | 50,000 listings is the launch-year scale bound | No |
| A-20 | §13 out of scope | No free-text geocoding; the buyer picks a point or uses geolocation | No |
| A-21 | FR-ORD-1 | Unpaid-order TTL 48 h (OQ-11) | Resolved at gate |
| A-22 | FR-ORD-8 | Expiry sweep every 10 minutes | Retired in Phase 3: expiry is derived; jobs only materialize it (AD-ORD-2) |
| A-23 | §14 out of scope | One listing per order (no cart) | No |
| A-24 | §15 seed | Fixture commission rate 800 bps | No |
| A-25 | FR-COM-2 | Top-up bounds COP 20,000–10,000,000 | Resolved at gate (OQ-11) |
| A-26 | FR-COM-9 | Low-balance threshold COP 20,000 | No |
| A-27 | §15 out of scope | Tax and invoicing outside the platform | No |
| A-28 | FR-TRD-1 | Offers are non-binding until accepted; open-offer TTL 7 days | Resolved at gate (OQ-11) |
| A-29 | FR-TRD-2 | Maximum of 10 negotiation rounds | No |
| A-30 | FR-TRD-3 | Admins see trades only in aggregate | No |
| A-31 | FR-TRD-5 | `Unfulfillable` offers are not reopened on restock | No |
| A-32 | FR-TRD-8 | Cancellation is allowed only before either completion confirmation | No |
| A-33 | FR-TRD-9 | Accepted trades never expire automatically | No |
| A-34 | FR-MSG-1 | WhatsApp (`wa.me`) is the launch external channel | No |
| A-35 | FR-MSG-2 | Maximum external URL length of 2,000 characters | No |
| A-36 | FR-MSG-3 | Contact rate limits 30/h and 10 per seller per day | Resolved at gate (OQ-11) |
| A-37 | FR-MSG-4 | Businesses cannot initiate conversations | No |
| A-38 | FR-MSG-7 | Admins cannot read message bodies | No |
| A-39 | §17 out of scope | No email or push notifications for messages | No |
| A-40 | FR-COL-1 | Deleting a collection removes its entries | No |
| A-41 | §18 | `BinderEntry` is realised as `CollectionEntry` plus the binder layout | Phase 3 |
| A-42 | FR-COL-3 | No server-side fetch of external links | No |
| A-43 | FR-COL-7 | Prompts never expire | No |
| A-44 | §18 out of scope | Collections are private | No |
| A-45 | §19 | Valuations are computed on request, not stored | No |
| A-46 | FR-VAL-2 | A secondary like-for-like `marketChangePercent` | No |
| A-47 | §19 out of scope | Reference prices are condition-agnostic | No |
| A-48 | FR-REP-5 | Hiding a listing doesn't cancel existing orders or trades | No |
| A-49 | §20 out of scope | No business replies to reviews in V1 | No |
| A-50 | §5 | No account suspension or deactivation in V1; moderation acts on content (FR-REP-4, FR-REP-5) | No |
| A-51 | §5, FR-VER-1 | Cédula de extranjería is out of scope; NIT (6–10 digits plus DV) covers companies and personas naturales | No |
| A-52 | FR-ORD-1 | Open-order limits: 3 per buyer, 1 per buyer per business (OQ-11) | Resolved at gate (OQ-11) |
| A-53 | NFR-SYS-14 | Auth throttles (10 per account and 30 per IP per 15 min, 5 sign-ups per IP per hour) and 60 contacts per IP per hour (OQ-11) | Resolved at gate (OQ-11) |
| A-54 | FR-VAL-2 | Valuation history is computed from the current entries and labelled "what your current cards were worth" | No |
| A-55 | FR-MSG-2 | Truncation minimums: 20 graphemes for the product name and for each offered item name | No |
| A-56 | FR-DSC-1 | `view=entries` shows at most 5 listings per entry plus `moreCount` | No |
| A-57 | FR-ORD-10 | The support contact (email plus optional WhatsApp) is a configuration value | No |
| A-58 | §21 OQ-12 | Retention defaults: legal-identity documents and buyer comprobantes 5 years; top-up proofs 10 years; phones and message bodies until account closure plus 1 year (`ADD-§9.4`) | Resolved at gate (OQ-12) |
