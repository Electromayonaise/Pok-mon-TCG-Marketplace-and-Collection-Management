# 00 — UX Scenarios Index

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-27
**Method:** Whiteport Design Studio (WDS) — scenarios and page specifications
**Inputs:** [prd.md](../../planning/prd.md) (FRs, NFRs, UJ-1…UJ-5, Annex scenarios) · [DESIGN.md](../DESIGN.md) · [EXPERIENCE.md](../EXPERIENCE.md) · [microcopy-es-CO.md](../microcopy-es-CO.md)

This index covers the Plan-2 UX package:
- it lists every scenario and page;
- it fixes the cast and the clock that all scenarios share;
- it traces every functional requirement to the scenario that exercises it (one requirement is covered by a page only).

The spines (DESIGN.md, EXPERIENCE.md) win on any conflict with a page spec.

**Counts:** 12 modules · 48 scenarios (4 per module, one per Annex scenario) · 43 page specs · 96 functional requirements (FR-MSG-8 added at the Phase 2 gate), all traced.

---

## 1. Cast

The same people appear across modules, so a scenario in one module can hand off to another without introducing anyone new.

| Persona | Role | Main appearances |
|---------|------|------------------|
| Camila | Buyer in Medellín, email verified | UJ-1; DSC, CAT-S2, ORD, COL-S3/S4, REP-S1/S3, MSG-S1…S3 |
| Valentina | Individual seller and collector in Bogotá | UJ-2, UJ-5; IDN, CAT-S1, INV-S2, TRD, COL-S1/S2, VAL, REP-S2 (reviewed) |
| Andrés | Owner of Tienda Andrés in Medellín. Pending, then Rejected, then Pending again, then Approved | UJ-3; INV-S1/S3/S4, VER, ORD-S2, COM, REP-S1/S3, MSG-S2/S3 |
| Julián | Individual trader | TRD, REP-S2 (author), MSG-S4 |
| Juan P. | Individual seller (fixture), 12,4 km from Camila | ORD-S3, MSG-S1, 2.2 |
| Sebastián | Admin | UJ-4; IDN-S4, CAT-S3, VER-S2…S4, COM-S1/S4, REP-S4, DSC-S4 |
| The developer | Runs the H consoles in non-production builds | Every module's H page |

---

## 2. Form factors

| Code | Meaning | Form of address |
|------|---------|-----------------|
| R | Responsive web, mobile-first (360 px) | tú for buyers and individual sellers; usted in business chrome (ADD-§1.1) |
| D | Desktop-first admin panel or business desk | usted |
| H | Developer console under `/dev/<mod>`, non-production builds only | Neutral and technical |

---

## 3. Time model

All scenarios run on the PRD's injectable virtual clock, seeded at `2026-10-01T15:00:00Z`. In `America/Bogota` that is **1 oct 2026, 10:00 a. m.**
- Every time in a scenario is Bogotá local time. Times are converted only in the presentation layer (NFR-SYS-4).
- Events before the seed instant are seeded history.
- Events after it are reached by advancing the clock in the scenario's harness.
- No scenario depends on wall-clock time.

The dates below are the ones the scenarios state. They form one consistent story, so a fixture built for one module does not contradict another.

| When (Bogotá) | Event | Scenario |
|---------------|-------|----------|
| 19 sep 2026 | Valentina adds Mew ex ×2 to "Kanto 151" from the catalog | COL-S2 (variant), VAL-S2, VAL-S4 |
| 28 sep 2026 | Valentina adds 2 store-event promos by link | COL-S2 |
| 29 sep 2026 | Last feed observation before the outage | CAT-S4 |
| 30 sep 2026 | Andrés applies as a shop and becomes Pending | VER-S1 |
| 1 oct, 8:10 a. m. | Camila writes to Tienda Andrés while it is Pending; Andrés replies at 8:42 a. m. | MSG-S3 |
| 1 oct, 10:00 a. m. | **Seed instant.** Sebastián rejects Andrés (`DataMismatch`, 7-day cooldown). Camila's send at 10:01 a. m. fails | VER-S3, MSG-S3 |
| 1 oct (seed day) | Binder sort; current value, trend, archive and history; the feed outage (40 h); the moderation hides | COL-S1, VAL-S1…S4, CAT-S4, REP-S4, DSC-S4 |
| 5 oct, 7:30 p. m. | Julián offers on Valentina's Lote Psíquico | TRD-S1 |
| 6 oct, 8:15 a. m. | Valentina counters | TRD-S2 |
| 6 oct, 12:40 p. m. | Julián accepts; the bundle is reserved and the handoff is generated | TRD-S3, MSG-S4 |
| 8 oct, 10:05 a. m. | Andrés reapplies after the cooldown and is Pending again | VER-S2, MSG-S3 |
| 8 oct, 11:34 a. m. | Sebastián approves; the badge appears and the commission account opens | VER-S2, COM-S1 |
| 9 oct, 9:40 a. m. | Andrés requests his first top-up; Sebastián confirms it at 11:15 a. m. | COM-S1 |
| 10 oct, 4:05 p. m. and 6:30 p. m. | Valentina confirms the swap, then Julián does, and the trade completes | TRD-S4 |
| 10 oct, 7:15 p. m. | Julián reviews Valentina | REP-S2 |
| 11 oct, evening | Camila reviews her wishlist; at 8:05 p. m. she contacts Juan P. on WhatsApp | COL-S3, MSG-S1, ORD-S3 |
| 12 oct, 9:12 a. m. | Camila asks Tienda Andrés about the Charizard; the shop replies at 9:40 a. m.; Camila reads it at 10:05 a. m. | MSG-S2 |
| 12 oct, before 4:20 p. m. | Camila reads Tienda Andrés's reputation | REP-S3 |
| 12 oct, 4:20 p. m. | Camila buys the Charizard ex NM for $180.000; the unit is reserved | ORD-S1 |
| 12 oct, 6:05 p. m. | Camila uploads the comprobante and confirms she paid | ORD-S2 |
| 13 oct, 9:12 a. m. | Andrés confirms the payment; a $14.400 commission is deducted | ORD-S2, COM-S2 |
| 14 oct, 7:40 p. m. | Camila tries to review the shop before the card arrives and is refused | REP-S1 |
| 16 oct, 1:30 p. m. | The card arrives; the order closes; Camila gets one post-purchase prompt | ORD-S4, COL-S4, REP-S1 |
| 23 oct, 10:05 a. m. | Andrés's balance runs out and his listings pause | COM-S3 |
| 24 oct, 8:50 a. m. | Andrés tops up; Sebastián confirms at 10:20 a. m.; the listings resume | COM-S4 |
| 1 nov, 12:00 a. m. | The new commission rate (850 bps) takes effect | COM-S4 |

Scenarios with no stated date run at the seed instant unless their harness says otherwise. These are IDN-S1…S4, CAT-S1…S3, DSC-S1…S3, INV-S1…S4 and VER-S4.

[NOTE: the PRD seed profile and UJ-4 ("a day") describe these events in relative terms. Aligning the seed fixture with the absolute dates above is deferred to Phase 3; see `reviews/review-ux-edge-cases.md`.]

---

## 4. User journeys → scenarios

| Journey | Scenario chain |
|---------|----------------|
| UJ-1 Camila buys a card from Andrés | DSC-S1 → CAT-S2 → REP-S3 and MSG-S2 (before buying) → ORD-S1 → ORD-S2 → COM-S2 → ORD-S4 → COL-S4 → REP-S1 |
| UJ-2 Valentina lists a card and trades it to Julián | IDN-S2 → INV-S2 → TRD-S1 → TRD-S2 → TRD-S3 → MSG-S4 → TRD-S4 → REP-S2 |
| UJ-3 Andrés becomes a verified business | VER-S1 → INV-S4 (listing while Pending) → MSG-S3 → VER-S3 (listings withdrawn) → VER-S2 (restored, badged) → COM-S1 |
| UJ-4 Sebastián runs the platform for a day | CAT-S3 → VER-S2 and VER-S3 (queue, reason policy) → COM-S1 and COM-S4 (top-ups) → REP-S4 and DSC-S4 → IDN-S4 |
| UJ-5 Valentina checks what her collection is worth | COL-S1 → VAL-S1 → VAL-S2 → VAL-S3 (stale price via CAT-S4) → VAL-S4 |

---

## 5. Scenario index

### IDN — Identity & Access Manager

| ID | Scenario | File |
|----|----------|------|
| IDN-S1 | Valentina Buys and Sells From One Account | [S1-dual-role-derivation.md](01-idn-access-manager/S1-dual-role-derivation.md) |
| IDN-S2 | Valentina Hits the Profile Gate on Her First Listing | [S2-first-listing-profile-gate.md](01-idn-access-manager/S2-first-listing-profile-gate.md) |
| IDN-S3 | One Seller Type Per Account, Even Under a Race | [S3-seller-type-exclusivity.md](01-idn-access-manager/S3-seller-type-exclusivity.md) |
| IDN-S4 | Sebastián Asks "What Can This Account Do, and Why?" | [S4-capability-audit-query.md](01-idn-access-manager/S4-capability-audit-query.md) |

### CAT — Catalog & Price Reference

| ID | Scenario | File |
|----|----------|------|
| CAT-S1 | Valentina Browses a Set by Artist and Colour | [S1-set-first-browse-filter.md](02-cat-catalog-price-reference/S1-set-first-browse-filter.md) |
| CAT-S2 | Three Prices, Never One Merged Number | [S2-three-distinct-prices.md](02-cat-catalog-price-reference/S2-three-distinct-prices.md) |
| CAT-S3 | Sebastián Ingests the Nightly Feed, Twice | [S3-feed-ingestion-idempotent-upsert.md](02-cat-catalog-price-reference/S3-feed-ingestion-idempotent-upsert.md) |
| CAT-S4 | The Feed Goes Quiet, and the Price Says So | [S4-stale-or-unavailable-feed.md](02-cat-catalog-price-reference/S4-stale-or-unavailable-feed.md) |

### DSC — Location Discovery

| ID | Scenario | File |
|----|----------|------|
| DSC-S1 | Who Sells It Within 15 km? | [S1-radius-filter-both-seller-kinds.md](03-dsc-location-discovery/S1-radius-filter-both-seller-kinds.md) |
| DSC-S2 | "Recogida en persona" Is Never Stale | [S2-pickup-derived-on-read.md](03-dsc-location-discovery/S2-pickup-derived-on-read.md) |
| DSC-S3 | The Same Search, the Same Order, With Reasons | [S3-deterministic-ranking.md](03-dsc-location-discovery/S3-deterministic-ranking.md) |
| DSC-S4 | Hidden Means Gone From the Next Search | [S4-moderation-exclusion.md](03-dsc-location-discovery/S4-moderation-exclusion.md) |

### INV — Listing & Shared Inventory

| ID | Scenario | File |
|----|----------|------|
| INV-S1 | Andrés Publishes a Card, a Sealed Box and a Bundle | [S1-publish-card-bundle-sealed.md](04-inv-listing-shared-inventory/S1-publish-card-bundle-sealed.md) |
| INV-S2 | One Copy, Two Listings, Never Sold Twice | [S2-shared-quantity.md](04-inv-listing-shared-inventory/S2-shared-quantity.md) |
| INV-S3 | Fifty Buyers, One Card, One Winner | [S3-concurrent-last-unit.md](04-inv-listing-shared-inventory/S3-concurrent-last-unit.md) |
| INV-S4 | What Each Kind of Seller May List, and When | [S4-seller-type-listing-rules.md](04-inv-listing-shared-inventory/S4-seller-type-listing-rules.md) |

### VER — Business Verification

| ID | Scenario | File |
|----|----------|------|
| VER-S1 | Andrés Applies to Become a Verified Shop | [S1-submit-application.md](05-ver-business-verification/S1-submit-application.md) |
| VER-S2 | Sebastián Approves, and the Badge Appears | [S2-admin-approval.md](05-ver-business-verification/S2-admin-approval.md) |
| VER-S3 | Rejected for a Reason, With a Date to Come Back | [S3-rejection-and-reapplication.md](05-ver-business-verification/S3-rejection-and-reapplication.md) |
| VER-S4 | Legal Identity Is Read in One Place Only, and Every Read Is Logged | [S4-legal-identity-access-denial.md](05-ver-business-verification/S4-legal-identity-access-denial.md) |

### ORD — Order & Comprobante

| ID | Scenario | File |
|----|----------|------|
| ORD-S1 | Camila Buys from Tienda Andrés, and the Card Is Held Before She Pays | [S1-purchase-and-reserve.md](06-ord-order-comprobante/S1-purchase-and-reserve.md) |
| ORD-S2 | "Pagado" Only After Proof, and Andrés Confirms Separately | [S2-comprobante-and-paid-confirmation.md](06-ord-order-comprobante/S2-comprobante-and-paid-confirmation.md) |
| ORD-S3 | A Person's Card Is Arranged Directly, Not Bought Through TEZG | [S3-individual-listing-refusal.md](06-ord-order-comprobante/S3-individual-listing-refusal.md) |
| ORD-S4 | The Card Arrives, the Order Closes, and the Collection Asks First | [S4-item-received-and-close.md](06-ord-order-comprobante/S4-item-received-and-close.md) |

### COM — Commission Balance

| ID | Scenario | File |
|----|----------|------|
| COM-S1 | Andrés Funds His Balance, and His Listings Become Purchasable | [S1-top-up-and-funded-state.md](07-com-commission-balance/S1-top-up-and-funded-state.md) |
| COM-S2 | One Sale, One Commission, Whatever Arrives First | [S2-deduction-on-confirmed-sale.md](07-com-commission-balance/S2-deduction-on-confirmed-sale.md) |
| COM-S3 | The Balance Runs Out, and the Listings Pause (but Nothing Is Lost) | [S3-exhaustion-and-pause.md](07-com-commission-balance/S3-exhaustion-and-pause.md) |
| COM-S4 | Andrés Tops Up, and the Same Listings Come Back | [S4-replenish-and-resume.md](07-com-commission-balance/S4-replenish-and-resume.md) |

### TRD — Trading

| ID | Scenario | File |
|----|----------|------|
| TRD-S1 | Julián Offers a Card Plus Cash for Valentina's Bundle | [S1-offer-on-open-to-trade-listing.md](08-trd-trading/S1-offer-on-open-to-trade-listing.md) |
| TRD-S2 | Valentina Counters, and Only One Person Can Answer at a Time | [S2-reject-or-counter.md](08-trd-trading/S2-reject-or-counter.md) |
| TRD-S3 | Julián Accepts, the Bundle Is Reserved, and Competing Offers Close With a Reason | [S3-accept-and-reserve.md](08-trd-trading/S3-accept-and-reserve.md) |
| TRD-S4 | Both Confirm the Swap Happened, and the Trade Reads Completed | [S4-mutual-completion.md](08-trd-trading/S4-mutual-completion.md) |

### COL — Collections

| ID | Scenario | File |
|----|----------|------|
| COL-S1 | Valentina Arranges Her Binder Her Way, and Every Page Reads the Same Twice | [S1-binder-layout-and-sort.md](09-col-collections/S1-binder-layout-and-sort.md) |
| COL-S2 | Valentina Adds Two Promos the Catalog Doesn't Have, by Link | [S2-link-added-entry.md](09-col-collections/S2-link-added-entry.md) |
| COL-S3 | Camila Keeps a Wishlist That Never Pretends to Be Her Collection | [S3-wishlist-vs-collection.md](09-col-collections/S3-wishlist-vs-collection.md) |
| COL-S4 | Camila Closes Her Order and Gets Exactly One Offer to Add the Card | [S4-post-purchase-prompt.md](09-col-collections/S4-post-purchase-prompt.md) |

### VAL — Valuation

| ID | Scenario | File |
|----|----------|------|
| VAL-S1 | Valentina Sees What "Kanto 151" Is Worth Today, Card by Card, in Whole Pesos | [S1-current-value.md](10-val-valuation/S1-current-value.md) |
| VAL-S2 | Valentina Sees How Much Her Cards Moved in 30 Days, and Camila Sees "New" Instead of a Broken Percentage | [S2-period-trend.md](10-val-valuation/S2-period-trend.md) |
| VAL-S3 | Valentina's 500-Card Archive Explains Every Card It Couldn't Value | [S3-unpriced-and-stale.md](10-val-valuation/S3-unpriced-and-stale.md) |
| VAL-S4 | Valentina Reads Her Collection's History, Including the Day She Bought Two Mew ex | [S4-value-history.md](10-val-valuation/S4-value-history.md) |

### REP — Reputation & Moderation

| ID | Scenario | File |
|----|----------|------|
| REP-S1 | Camila Can't Review Tienda Andrés Until the Card Arrives | [S1-gated-business-review.md](11-rep-reputation-moderation/S1-gated-business-review.md) |
| REP-S2 | Julián Reviews Valentina, and the Profile Says the Review Isn't Tied to a Purchase | [S2-ungated-individual-review.md](11-rep-reputation-moderation/S2-ungated-individual-review.md) |
| REP-S3 | Tienda Andrés Reads 4,3, Not 4,2, and the Hidden Review Counts Nowhere | [S3-aggregate-reputation.md](11-rep-reputation-moderation/S3-aggregate-reputation.md) |
| REP-S4 | Sebastián Hides a Harassing Review and a Counterfeit Listing, and the Audit Shows Each Once | [S4-admin-hide-and-audit.md](11-rep-reputation-moderation/S4-admin-hide-and-audit.md) |

### MSG — Messaging

| ID | Scenario | File |
|----|----------|------|
| MSG-S1 | Camila Writes to Juan P. on WhatsApp With a Message TEZG Prepared | [S1-contact-individual-seller.md](12-msg-messaging/S1-contact-individual-seller.md) |
| MSG-S2 | Camila Asks Tienda Andrés About the Charizard, and Both Unread Counts Stay Right | [S2-in-app-message-to-verified-business.md](12-msg-messaging/S2-in-app-message-to-verified-business.md) |
| MSG-S3 | A Pending Shop Can Be Messaged With a Notice, a Rejected One Cannot, and a Message Composed Across the Rejection Is Not Lost | [S3-ineligible-recipient.md](12-msg-messaging/S3-ineligible-recipient.md) |
| MSG-S4 | Julián's Trade Handoff Comes From the Same Contact Service, With the Trade Summary Filled In | [S4-trade-handoff-reuse.md](12-msg-messaging/S4-trade-handoff-reuse.md) |

---

## 6. Page index and coverage

Each page lists the scenarios that pass through it: the scenarios named in the page's header plus those whose Scenario Steps table links to it. Every page is reached by at least one scenario, and every scenario walks through at least one page.

| Page | Title | Form | Route | Scenarios |
|------|-------|------|-------|-----------|
| [1.1](01-idn-access-manager/1.1-capability-api-explorer/1.1-capability-api-explorer.md) | Capability API Explorer | H | `/dev/idn` | IDN-S1, IDN-S3, IDN-S4, VER-S4 |
| [1.2](01-idn-access-manager/1.2-individual-seller-profile-step/1.2-individual-seller-profile-step.md) | Individual-Seller Profile Step | R | set in Phase 3 | IDN-S2, IDN-S3 |
| [1.3](01-idn-access-manager/1.3-account-capability-inspector/1.3-account-capability-inspector.md) | Account Capability Inspector | D | `/admin/cuentas` | IDN-S4 |
| [2.1](02-cat-catalog-price-reference/2.1-catalog-browse-filter/2.1-catalog-browse-filter.md) | Catalog Browse & Filter | R | set in Phase 3 | CAT-S1 |
| [2.2](02-cat-catalog-price-reference/2.2-card-detail-price-provenance/2.2-card-detail-price-provenance.md) | Card Detail & Price Provenance | R | `/c/<catalogEntryId>` | CAT-S1, CAT-S2, CAT-S4, ORD-S1, ORD-S3, TRD-S1, COL-S3, REP-S3, MSG-S1, MSG-S2 |
| [2.3](02-cat-catalog-price-reference/2.3-feed-ingestion-console/2.3-feed-ingestion-console.md) | Feed Ingestion Console | D | `/admin/catalogo` | CAT-S3, CAT-S4 |
| [3.1](03-dsc-location-discovery/3.1-nearby-listings/3.1-nearby-listings.md) | Nearby Listings | R | `/cerca` | DSC-S1, DSC-S2, DSC-S3, DSC-S4 |
| [3.2](03-dsc-location-discovery/3.2-discovery-explanation-inspector/3.2-discovery-explanation-inspector.md) | Discovery Explanation Inspector | H | `/dev/dsc` | DSC-S1, DSC-S2, DSC-S3, DSC-S4 |
| [4.1](04-inv-listing-shared-inventory/4.1-create-listing-bundle/4.1-create-listing-bundle.md) | Create Listing & Bundle | R | `/vender/nueva` | IDN-S2, INV-S1, INV-S2, INV-S4 |
| [4.2](04-inv-listing-shared-inventory/4.2-my-listings/4.2-my-listings.md) | My Listings | R | `/vender` | IDN-S1, INV-S1, INV-S2, INV-S4, VER-S2, COM-S3, COM-S4, REP-S4 |
| [4.3](04-inv-listing-shared-inventory/4.3-inventory-console-race-simulator/4.3-inventory-console-race-simulator.md) | Inventory Console & Race Simulator | H | `/dev/inv` | INV-S2, INV-S3, COM-S3 |
| [5.1](05-ver-business-verification/5.1-business-application-form/5.1-business-application-form.md) | Business Application Form | R | `/tienda/solicitud` | IDN-S3, VER-S1, VER-S3 |
| [5.2](05-ver-business-verification/5.2-application-status/5.2-application-status.md) | Application Status | R | `/tienda/estado` | INV-S4, VER-S1, VER-S2, VER-S3 |
| [5.3](05-ver-business-verification/5.3-admin-review-queue/5.3-admin-review-queue.md) | Admin Review Queue | D | `/admin/solicitudes` | VER-S2, VER-S3, VER-S4 |
| [5.4](05-ver-business-verification/5.4-legal-identity-access-audit/5.4-legal-identity-access-audit.md) | Legal-Identity Access Audit | D | `/admin/auditoria/datos-legales` | VER-S4 |
| [5.5](05-ver-business-verification/5.5-rejection-reason-policy/5.5-rejection-reason-policy.md) | Rejection-Reason Policy | D | `/admin/politicas/motivos` | VER-S3 |
| [6.1](06-ord-order-comprobante/6.1-purchase-payment-instructions/6.1-purchase-payment-instructions.md) | Purchase & Payment Instructions | R | `/comprar/<listingId>` | IDN-S1, INV-S3, ORD-S1, ORD-S3 |
| [6.2](06-ord-order-comprobante/6.2-buyer-order-detail/6.2-buyer-order-detail.md) | Buyer Order Detail | R | `/pedidos/<orderId>` | ORD-S1, ORD-S2, ORD-S4, COL-S4, REP-S1 |
| [6.3](06-ord-order-comprobante/6.3-business-order-desk/6.3-business-order-desk.md) | Business Order Desk | D | `/tienda/pedidos` | ORD-S2, ORD-S4, COM-S2 |
| [6.4](06-ord-order-comprobante/6.4-order-timeline-simulator/6.4-order-timeline-simulator.md) | Order Timeline Simulator | H | `/dev/ord` | ORD-S3, ORD-S4 |
| [7.1](07-com-commission-balance/7.1-balance-top-up/7.1-balance-top-up.md) | Balance & Top-Up | R | `/tienda/saldo` | COM-S1, COM-S3, COM-S4 |
| [7.2](07-com-commission-balance/7.2-commission-ledger/7.2-commission-ledger.md) | Commission Ledger | D | `/tienda/movimientos` | COM-S2, COM-S3 |
| [7.3](07-com-commission-balance/7.3-admin-top-up-queue/7.3-admin-top-up-queue.md) | Admin Top-Up Queue | D | `/admin/recargas` | COM-S1, COM-S4 |
| [7.4](07-com-commission-balance/7.4-rate-settings-reconciliation/7.4-rate-settings-reconciliation.md) | Rate Settings & Reconciliation | D | `/admin/comisiones/ajustes` | COM-S4 |
| [7.5](07-com-commission-balance/7.5-concurrent-deduction-simulator/7.5-concurrent-deduction-simulator.md) | Concurrent-Deduction Simulator | H | `/dev/com` | COM-S2 |
| [8.1](08-trd-trading/8.1-make-an-offer/8.1-make-an-offer.md) | Make an Offer | R | `/intercambios/nueva?listing=<listingId>` | TRD-S1 |
| [8.2](08-trd-trading/8.2-trade-negotiation-timeline/8.2-trade-negotiation-timeline.md) | Trade Negotiation Timeline | R | `/intercambios/<offerId>` | TRD-S1, TRD-S2, TRD-S3, TRD-S4, MSG-S4 |
| [8.3](08-trd-trading/8.3-my-trades/8.3-my-trades.md) | My Trades | R | `/intercambios` | TRD-S2, TRD-S3, TRD-S4 |
| [8.4](08-trd-trading/8.4-trade-state-viewer/8.4-trade-state-viewer.md) | Trade State Viewer | H | `/dev/trd` | TRD-S3 |
| [9.1](09-col-collections/9.1-collections-binder/9.1-collections-binder.md) | Collections & Binder | R | `/coleccion` | COL-S1, COL-S2, COL-S4 |
| [9.2](09-col-collections/9.2-add-entry/9.2-add-entry.md) | Add Entry | R | `/coleccion/<collectionId>/agregar` | COL-S2 |
| [9.3](09-col-collections/9.3-wishlist/9.3-wishlist.md) | Wishlist | R | `/coleccion/deseos` | COL-S3 |
| [9.4](09-col-collections/9.4-post-purchase-prompts/9.4-post-purchase-prompts.md) | Post-Purchase Prompts | R | `/sugerencias` | ORD-S4, COL-S4 |
| [10.1](10-val-valuation/10.1-collection-value/10.1-collection-value.md) | Collection Value | R | `/coleccion/valor?coleccion=<collectionId>&periodo=30` | VAL-S1, VAL-S2, VAL-S3, VAL-S4 |
| [10.2](10-val-valuation/10.2-value-history/10.2-value-history.md) | Value History | R | `/coleccion/valor/historial?coleccion=<collectionId>&periodo=30` | VAL-S4 |
| [10.3](10-val-valuation/10.3-valuation-lab/10.3-valuation-lab.md) | Valuation Lab | H | `/dev/val` | VAL-S1, VAL-S2, VAL-S3, VAL-S4 |
| [11.1](11-rep-reputation-moderation/11.1-write-a-review/11.1-write-a-review.md) | Write a Review | R | `/perfil/<userId>/resena` | ORD-S4, REP-S1, REP-S2 |
| [11.2](11-rep-reputation-moderation/11.2-seller-reputation-profile/11.2-seller-reputation-profile.md) | Seller Reputation Profile | R | `/perfil/<userId>` | REP-S1, REP-S2, REP-S3, REP-S4 |
| [11.3](11-rep-reputation-moderation/11.3-moderation-queue/11.3-moderation-queue.md) | Moderation Queue | D | `/admin/moderacion` | DSC-S4, REP-S4 |
| [11.4](11-rep-reputation-moderation/11.4-moderation-audit/11.4-moderation-audit.md) | Moderation Audit | D | `/admin/auditoria/moderacion` | REP-S4 |
| [12.1](12-msg-messaging/12.1-contact-seller-composer/12.1-contact-seller-composer.md) | Contact Seller Composer | R | `/contactar/<listingId>` | ORD-S3, MSG-S1, MSG-S4 |
| [12.2](12-msg-messaging/12.2-inbox-thread/12.2-inbox-thread.md) | Inbox & Thread | R | `/mensajes` | MSG-S2, MSG-S3 |
| [12.3](12-msg-messaging/12.3-messaging-api-explorer/12.3-messaging-api-explorer.md) | Messaging API Explorer | H | `/dev/msg` | MSG-S1, MSG-S2, MSG-S3, MSG-S4 |

Admin (D) pages share the admin rail. The business-desk D pages (6.3 and the business variant of 7.2) share the "Mi tienda" navigation. All H pages share the `/dev` index.

**Wireframes.** Every page spec carries an ASCII layout block under "Layout Structure". Two key screens also have drawn wireframes, each an SVG with its editable Excalidraw source, annotated with the page's Object IDs:
- [5.3 Admin Review Queue](../wireframes/5.3-admin-review-queue.svg) ([.excalidraw](../wireframes/5.3-admin-review-queue.excalidraw)): D, 1280 px. Shows the queue, the review detail, both decision dialogs and the lost-race banner.
- [8.2 Trade Negotiation Timeline](../wireframes/8.2-trade-negotiation-timeline.svg) ([.excalidraw](../wireframes/8.2-trade-negotiation-timeline.excalidraw)): R, 360 px. Shows the round-2 negotiation and the accepted state with the contact handoff.

Wireframes are illustrative. The page specs and the spines win on any conflict.

**Mockups.** Each module also has one interactive HTML key-screen mock in [`../mockups/`](../mockups/index.html). The mocks are 1.3, 2.2, 3.1, 4.3, 5.2, 6.2, 7.1, 8.1, 9.1, 10.1, 11.2 and 12.2. Each one draws every row of its page's state table, uses only copy from the page spec or `microcopy-es-CO.md`, and marks illustrative data in English mock notes. Like the wireframes, the mocks are illustrative: the page specs and the spines win on any conflict.

---

## 7. Functional requirement → scenario matrix

Built from each scenario's **Realizes** line. NFRs are traced in the scenarios and pages themselves and are not repeated here.

| FR | Requirement | Scenarios |
|----|-------------|-----------|
| FR-IDN-1 | Derive capabilities server-side | IDN-S1 |
| FR-IDN-2 | Complete the individual-seller profile step | IDN-S2, IDN-S3 |
| FR-IDN-3 | Answer listing eligibility | IDN-S2, INV-S4 |
| FR-IDN-4 | Guard seller-type exclusivity atomically | IDN-S3, VER-S1 |
| FR-IDN-5 | Capability audit trace for admins | IDN-S4 |
| FR-IDN-6 | Messaging, review-target and seller-kind queries | DSC-S2, MSG-S3 |
| FR-IDN-7 | Authentication and admin gating | IDN-S1, IDN-S4 |
| FR-VER-1 | Submit a business application | IDN-S3, VER-S1 |
| FR-VER-2 | Admin review queue | VER-S2 |
| FR-VER-3 | Approve | VER-S2 |
| FR-VER-4 | Reject with a policy reason | VER-S3 |
| FR-VER-5 | Access to legal identity only through admin review | VER-S2, VER-S4 |
| FR-VER-6 | Reapplication policy | VER-S3 |
| FR-VER-7 | Applicant status view | VER-S1, VER-S3 |
| FR-VER-8 | Rejection-reason policy settings | VER-S3 |
| FR-VER-9 | Business payment instructions for orders | ORD-S1 |
| FR-CAT-1 | Browse and filter the catalog by collector attributes | CAT-S1 |
| FR-CAT-2 | One stable identity per card or product | CAT-S1 |
| FR-CAT-3 | Feed ingestion with idempotent upsert and quarantine | CAT-S3 |
| FR-CAT-4 | Attribute changes keep the identity | CAT-S3 |
| FR-CAT-5 | Reference prices as a distinct value object | CAT-S2 |
| FR-CAT-6 | Price provenance for the card detail | CAT-S2 |
| FR-CAT-7 | Freshness and feed outage | CAT-S4, VAL-S3 |
| FR-CAT-8 | Official exchange rate (TRM) | CAT-S2, CAT-S4 |
| FR-INV-1 | Create a card or sealed-product listing | INV-S1, INV-S2, INV-S4 |
| FR-INV-2 | Create a bundle | INV-S1 |
| FR-INV-3 | Reserve inventory atomically in the caller's transaction | INV-S2, INV-S3, ORD-S1, TRD-S3 |
| FR-INV-4 | Shared-quantity reconciliation | INV-S2, TRD-S3 |
| FR-INV-5 | Release a reservation | ORD-S1 |
| FR-INV-6 | Aborted caller transaction restores quantity | INV-S3 |
| FR-INV-7 | Purchasability, verified badge and commission pause | INV-S4, VER-S2, ORD-S3, COM-S1, COM-S3, COM-S4 |
| FR-INV-8 | Withdraw on rejection, restore on approval | INV-S4, VER-S2, VER-S3 |
| FR-INV-9 | Edit, restock and deactivate | page-only: 4.2 |
| FR-INV-10 | Listing detail and owner view | REP-S4 |
| FR-DSC-1 | One browse query for both seller kinds | CAT-S1, DSC-S1 |
| FR-DSC-2 | Correct geodesic distance and an inclusive boundary | DSC-S1 |
| FR-DSC-3 | Unusable locations are excluded and explained | DSC-S1 |
| FR-DSC-4 | Pickup is derived on read | DSC-S2 |
| FR-DSC-5 | Deterministic ranking with an explanation for each row | DSC-S3 |
| FR-DSC-6 | Moderation and state exclusion take effect immediately | DSC-S4, REP-S4 |
| FR-DSC-7 | Card detail composition | CAT-S2 |
| FR-ORD-1 | Purchase and reserve at creation | ORD-S1, ORD-S3 |
| FR-ORD-2 | Upload or replace the comprobante | ORD-S2 |
| FR-ORD-3 | Buyer confirms "I paid" | ORD-S2 |
| FR-ORD-4 | Business confirms payment received | ORD-S2 |
| FR-ORD-5 | Buyer confirms item received; the order closes | ORD-S4 |
| FR-ORD-6 | Visibility and fact queries | ORD-S2, ORD-S4 |
| FR-ORD-7 | Buyer cancels before paying | ORD-S1 |
| FR-ORD-8 | Expire unpaid orders | ORD-S4 |
| FR-ORD-9 | Closed-purchase query | ORD-S4, REP-S1 |
| FR-ORD-10 | Admin order lookup and support contact | IDN-S4 |
| FR-COM-1 | Open an account on approval | VER-S2, COM-S1 |
| FR-COM-2 | Request a top-up (manual V1 behind a port) | COM-S1 |
| FR-COM-3 | Admin confirms or rejects a top-up | COM-S1, COM-S4 |
| FR-COM-4 | Deduct commission exactly once per order | COM-S2, COM-S3 |
| FR-COM-5 | Commission amount and rounding rule | COM-S2 |
| FR-COM-6 | Threshold events without flapping | COM-S3, COM-S4 |
| FR-COM-7 | Configure the commission rate | COM-S4 |
| FR-COM-8 | Ledger views and reconciliation | COM-S2, COM-S4 |
| FR-COM-9 | Low-balance notice | COM-S3 |
| FR-TRD-1 | Make an offer on an open-to-trade listing | TRD-S1 |
| FR-TRD-2 | Turn-taking: reject, counter, withdraw | TRD-S2 |
| FR-TRD-3 | Visibility | TRD-S2 |
| FR-TRD-4 | Accept and reserve | TRD-S3 |
| FR-TRD-5 | Competing offers become unfulfillable | TRD-S3 |
| FR-TRD-6 | Contact handoff reuses the listings service | TRD-S3, MSG-S4 |
| FR-TRD-7 | Mutual completion (computed) | TRD-S4 |
| FR-TRD-8 | Cancel an accepted trade before confirmation | TRD-S4 |
| FR-TRD-9 | Expire open offers | TRD-S1 |
| FR-MSG-1 | Generate an external contact message (listings service) | ORD-S3, TRD-S3, MSG-S1, MSG-S4 |
| FR-MSG-2 | Deterministic rendering and edge-safe encoding | MSG-S1, MSG-S4 |
| FR-MSG-3 | Protect sellers' phone numbers | MSG-S1 |
| FR-MSG-4 | In-app messaging eligibility | MSG-S2, MSG-S3 |
| FR-MSG-5 | Send a message | MSG-S2 |
| FR-MSG-6 | Verification changes between compose and send | MSG-S3 |
| FR-MSG-7 | Inbox and read state | MSG-S2, MSG-S3 |
| FR-MSG-8 | Mute a conversation (buyer side; Phase 2 gate) | MSG-S2 |
| FR-COL-1 | Named collections | COL-S1 |
| FR-COL-2 | Add an entry manually | COL-S2, COL-S4 |
| FR-COL-3 | Add an entry by link | COL-S2 |
| FR-COL-4 | Move and copy between collections | COL-S1, COL-S4 |
| FR-COL-5 | Binder layout, sorting and completion | COL-S1 |
| FR-COL-6 | Wishlist, separate from collections | COL-S3 |
| FR-COL-7 | Exactly one post-purchase prompt per closed order | ORD-S4, COL-S4 |
| FR-VAL-1 | Current value in integer COP | VAL-S1 |
| FR-VAL-2 | Period trend with a defined zero baseline | VAL-S2, VAL-S4 |
| FR-VAL-3 | Unpriced and stale items | VAL-S3 |
| FR-VAL-4 | Value history series | VAL-S4 |
| FR-VAL-5 | Money-shape separation | VAL-S1 |
| FR-REP-1 | Gated review of a business | ORD-S4, REP-S1 |
| FR-REP-2 | Ungated review of an individual seller | REP-S2 |
| FR-REP-3 | Aggregate reputation with a stated rounding rule | REP-S2, REP-S3 |
| FR-REP-4 | Hide and unhide a review | DSC-S4, REP-S4 |
| FR-REP-5 | Hide and unhide a listing (listings host) | REP-S4 |
| FR-REP-6 | Moderation queue and audit view | REP-S4 |
| FR-REP-7 | Profile page with reviews | REP-S1, REP-S2, REP-S3 |

**Page-only requirement.** FR-INV-9 has no Annex scenario. Its behaviour is fully specified on 4.2 (the row actions and the Edit & Restock sheet, including the lost-race state). It is logged in `reviews/review-ux-edge-cases.md` as a candidate for a 4.3 preset in Phase 3.

**FRs the PRD's per-module trace tables leave without an Annex scenario** (FR-IDN-6/7, FR-VER-2/9, FR-INV-5/8/9/10, FR-ORD-7/9/10, FR-COM-1/7/8/9, FR-TRD-8/9, FR-MSG-3, FR-COL-1/2/4, FR-VAL-5, FR-REP-7) are placed by this matrix. Each one is exercised in the scenario or page listed above.

---

_Created using Whiteport Design Studio (WDS) methodology_
