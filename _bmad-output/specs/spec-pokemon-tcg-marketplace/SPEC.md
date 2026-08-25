---
id: SPEC-pokemon-tcg-marketplace
companions: ["stakeholders.md", "../../../docs/spec-task-1/SPEC.md", "../../A-Product-Brief/01-product-brief.md"]
sources: ["../../../docs/Problem-statement.pdf"]
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. `docs/spec-task-1/SPEC.md` carries the hand-authored Contract (exact operation signatures) that this kernel deliberately excludes by design — read it alongside this file, not instead of it. `01-product-brief.md` carries the strategic/GTM layer (positioning, business model rationale, tone of voice) this kernel distills but does not restate in full.

# Pokémon TCG Marketplace and Collection Management Platform

## Why

Colombian Pokémon TCG collectors, buyers, individual sellers, and businesses currently stitch together separate tools by hand for every purchase — a price-guide site, eBay (buying), PriceCharting (price verification), and Collectr (collection logging) — while absorbing months-long international shipping waits and import fees running up to ~20% of card value, since no formal local marketplace exists (only informal, unsearchable WhatsApp/Telegram seller groups). A centralized, Colombia-local platform gives collectors and buyers one consistent, COP-priced view of catalog, price, listings, and their own collection, and gives individual sellers and small businesses a single place to be discovered without building a storefront.

## Capabilities

- **CAP-1**
  - **intent:** User can browse and filter the catalog by set, era, Pokémon, color, style, artist, and listing location/distance, across both individual-seller and verified-business listings.
  - **success:** A filtered query, including location/distance filters, returns only matching catalog entries/listings from either seller type, including entries with zero active listings when no location filter narrows them out; results for individual-seller listings are marked as supporting in-person pickup, results for business listings are not.
- **CAP-2**
  - **intent:** Catalog entries exist independently of marketplace listings; a listing links to a catalog entry but is never required for the entry to exist.
  - **success:** A card with no listings is still retrievable from the catalog and displays `hasActiveListings=false` rather than being absent or erroring.
- **CAP-3**
  - **intent:** User can see current listing price, most recent transaction price, and historical price trend for a card as distinct values.
  - **success:** The card detail view renders three separately labeled price values — listing price in COP, and the two reference prices (last-transaction, historical trend) as USD/COP pairs — that never collapse into one unlabeled number.
- **CAP-4**
  - **intent:** Businesses and individual sellers can publish cards, card bundles, and sealed products as listings.
  - **success:** A seller of either type can create a listing tied to a valid catalog entry or bundle, and it becomes visible to buyers.
- **CAP-5**
  - **intent:** The platform applies different registration and transaction rules to verified businesses vs. individual sellers.
  - **success:** A business listing cannot display as verified until its application status is Approved; an individual-seller listing never requires that state.
- **CAP-6**
  - **intent:** A buyer can generate a pre-filled external-channel contact message (with product and listed price) to reach an individual seller.
  - **success:** Selecting contact-seller on an individual-seller listing produces message text containing the product name and listed price, ready to send via an external messaging app.
- **CAP-7**
  - **intent:** The platform supports user profiles, business profiles, and a review-based reputation mechanism.
  - **success:** A profile page displays accumulated reviews/ratings tied to that seller or business account.
- **CAP-8**
  - **intent:** User can add a card or product to one or more personal collections regardless of whether it was acquired through the platform.
  - **success:** A manually-added item and a platform-purchased item can both appear in the same collection, each tagged with its acquisition source.
- **CAP-9**
  - **intent:** User can see the value of a collection and how it has changed over time.
  - **success:** A collection view exposes a current total value (COP) and a trend over a prior period, derived from constituent item prices.
- **CAP-10**
  - **intent:** User can view a collection as a virtual binder organized to their own preference.
  - **success:** A binder view renders the collection's items in a user-chosen layout/order rather than one fixed system ordering.
- **CAP-11**
  - **intent:** User can create multiple named collection groupings (e.g., general, sealed products, keep, for-sale).
  - **success:** A user can create at least two distinct collections and move/copy an item's membership between them.
- **CAP-12**
  - **intent:** The platform distinguishes items acquired through the platform from items added manually by the user.
  - **success:** Every collection entry carries a source flag (`PlatformPurchase` or `Manual`) visible wherever the entry is displayed.
- **CAP-13**
  - **intent:** User can maintain a wish list / acquisition-planning list of cards they want to obtain, separate from owned collections.
  - **success:** Adding a card to the wish list does not create a collection entry, and the two lists are independently viewable.
- **CAP-14**
  - **intent:** User can plan acquisitions using price, availability, and seller/product location as factors.
  - **success:** Wish-list items can be filtered or sorted by at least price and availability against current listings.
- **CAP-15**
  - **intent:** An admin can review, approve, or reject pending business applications.
  - **success:** A submitted application is queryable in a Pending state until an admin action transitions it to Approved or Rejected, and only Approved businesses are represented as verified.
- **CAP-16**
  - **intent:** A seller creating a bundle identifies its component cards so the system can associate the bundle with those catalog entities.
  - **success:** A bundle record lists its component card references, and each component remains independently visible/queryable in the catalog.
- **CAP-17**
  - **intent:** A buyer can purchase a verified-business listing directly through the platform.
  - **success:** Purchasing a verified-business listing returns an OrderId and decrements listing quantity; the same action against an individual-seller listing is rejected (`NotBusinessListing`) rather than silently succeeding.
- **CAP-18**
  - **intent:** A user can send an in-app message to a verified business.
  - **success:** A message sent to a verified business is delivered in-app; the same action against a non-business account is rejected (`NotBusinessAccount`).
- **CAP-19**
  - **intent:** A first-time individual seller completes a short profile step before creating their first listing.
  - **success:** Attempting to list as an individual seller who hasn't completed the profile step errors with `IndividualSellerProfileIncomplete`; a business account is exempt from this specific gate (it has its own verification flow).
- **CAP-20**
  - **intent:** A business purchase is settled by the buyer paying the business directly (QR/bank transfer) and uploading proof of payment, mutually confirmed by both parties.
  - **success:** An order shows a buyer "paid" state only after a comprobante is uploaded and the buyer confirms payment; it shows "payment received" only after the business separately confirms.
- **CAP-21**
  - **intent:** A verified business maintains a prepaid commission balance that gates whether its listings are purchasable.
  - **success:** A business with a positive balance has purchasable listings that auto-deduct commission on each confirmed sale; a business whose balance reaches zero has its listings paused (still visible/editable, not purchasable) until the balance is topped up.
- **CAP-22**
  - **intent:** A business-purchase order tracks payment and fulfillment as three distinct, independently visible states rather than one collapsed "complete" status.
  - **success:** An order's state (paid / payment-received-by-seller / item-received-by-buyer) is individually queryable at each stage, and reaching "item-received-by-buyer" is the only state that closes the order.
- **CAP-24**
  - **intent:** A user can add a card to their virtual binder via an external link/reference when it has no catalog entry yet.
  - **success:** A link-added binder entry displays in the binder without requiring a matching catalog entry to exist.
- **CAP-25**
  - **intent:** A buyer can propose a trade offer (cards, product, and/or money) against an individual-seller listing marked "open to trade," and the seller can accept, reject, or counter it.
  - **success:** A trade offer against a listing not flagged "open to trade" is rejected/unavailable; against an eligible listing, the seller's accept/reject/counter action is recorded and visible to the buyer, and an accepted trade hands off exchange details the same way an individual-seller purchase does.
- **CAP-26**
  - **intent:** Both parties to an accepted trade offer can independently confirm the trade was completed.
  - **success:** A trade shows "completed" only once both the buyer and the seller have separately confirmed it; an accepted trade with only one confirmation stays open.
- **CAP-27**
  - **intent:** After a business-purchase order reaches item-received-by-buyer, the buyer is prompted to add the item to a collection, without it being created automatically.
  - **success:** Accepting the prompt creates a collection entry with `source=PlatformPurchase`; declining or ignoring it creates no entry, and the order still shows as closed either way.

## Constraints

- Catalog/listing independence: a card's presence in the catalog must never be derived from or gated by the existence of a listing.
- Price provenance: listing price (COP), recent transaction price, and historical market value (both as USD/COP pairs) must be stored and displayed as distinct fields, never merged or treated as interchangeable.
- Individual sellers require no business-style verification to publish listings; only businesses go through the legal-identity + external-presence application process.
- Business applications remain Pending until an admin approves them; a business cannot be represented as verified before approval.
- Individual-seller listings are never purchased in-platform — the platform's role ends at generating an external contact message; verified-business listings are always purchased in-platform.
- A bundle must track its component cards individually so bundle contents remain associated with catalog entities.
- A bundle's component card and that seller's individual listing of the same card (if any) share one inventory quantity; a sale through either path decrements the shared count — quantities are never tracked independently across a bundle and an individual listing of the same physical card.
- Collection ownership is independent of platform purchase; manual addition of externally-acquired items must be supported.
- The system must support multiple, user-chosen ways of organizing a collection (date, value, set, Pokémon, artist, color, binder layout) rather than one fixed taxonomy.
- The platform must establish clear boundaries around user-generated content, seller information, reviews, listings, and market data so the reliability and consistency of information presented to users can be maintained.
- Business applications require legal identity and external-presence information (e.g., Instagram profile or website) as submitted fields.
- In-app messaging exists only for verified businesses; individual-seller listings are reachable only via the generated external-contact message, never in-app.
- A review targeting a verified business requires the reviewer to have a completed platform purchase against that business; no equivalent purchase gate exists for individual-seller reviews.
- A listing may carry a seller-specific condition attribute distinct from the catalog entry's canonical identity.
- A binder entry does not require a corresponding catalog entry to exist (distinct from catalog/listing independence, which governs listings, not binder entries).
- The platform never holds or disburses transaction funds for business purchases; settlement is peer-to-peer between buyer and business, verified by an uploaded comprobante and mutual confirmation, not an automated payment capture — rules out any escrow or hold-and-release payment flow.
- Commission is collected as a prepaid balance deduction per confirmed sale, never as a post-hoc invoice.
- A zero commission balance pauses a business's listings; it must not delete, hide, or ban the business account or its listing records.
- Delivery assurance for business purchases relies on the three-state confirmation sequence plus identity-backed seller reputation, not fund-holding/escrow.
- Trade offers are only possible on individual-seller listings explicitly flagged "open to trade"; the flag is off by default and never available on verified-business listings.
- Trade completion requires independent confirmation from both parties; it is a lightweight closure/reputation signal distinct from the three-state purchase-payment confirmation and never involves a comprobante or payment step.
- Location/distance filtering applies platform-wide across all listing types; only individual-seller listings carry the in-person-pickup/local-preference semantics attached to it — a business listing's proximity is a convenience signal, never a pickup guarantee.
- A `PurchaseListing` action never auto-creates a collection entry; it may only surface a suggested `AddToCollection` prompt that the buyer accepts or dismisses.
- Individual sellers are not charged any commission, listing, or subscription fee at launch.
- The platform is a single responsive web app (desktop/tablet/mobile, equal device priority) — no native app, no offline mode, no native-device-feature dependency (camera, push notifications) for this iteration.
- First-iteration scope: this spec must not fix internal module decomposition, database schema, UI/visual design, deployment architecture, or technology stack.

## Non-goals

- Final internal module split of the platform.
- Exact database schema and data model.
- Exact user interface and visual design.
- Final deployment architecture.
- Exact technology stack.
- Definitive implementation of external integrations (external messaging app, Instagram, external Pokémon TCG data sources).
- The exact price-estimation or market-value calculation algorithm.
- The exact commission percentage/rate, and whether/how it pairs with a subscription tied to the verified badge.
- The individual-seller-profile-step's exact required fields.
- The currency-conversion source, rate, and refresh mechanism for USD→COP display.
- Review anti-abuse safeguards (self-review/collusion prevention) beyond the purchase-verification gate.
- Payment-gateway integration of any kind — explicitly rejected in favor of peer-to-peer settlement (CAP-20), not merely unspecified.
- A forfeitable buyer-protection deposit or any escrow-like hardening beyond the three-state delivery confirmation — a possible v2 item, not this iteration.
- The individual-seller monetization mechanism — a deferred, genuinely open strategic question, not a decided exclusion.
- A native mobile app — a realistic future possibility, explicitly out of scope now.
- Offline functionality.
- Detailed logistics and physical delivery process for marketplace transactions.
- In-platform dispute resolution between buyers and sellers, beyond admin moderation as an escalation path.

## Success signal

- A card with zero listings still returns from the catalog with an empty listings array, never an error; a location/distance filter narrows returned listings without excluding catalog entries that simply have none nearby.
- Purchasing a verified-business listing returns an OrderId, decrements quantity, and only reaches "payment received" after a comprobante is uploaded and both parties confirm; the same purchase attempt against an individual-seller listing errors with `NotBusinessListing`.
- An order's state (paid / received-by-seller / received-by-buyer) is independently queryable at each step, and only "received-by-buyer" closes the order.
- A verified business's listings stop being purchasable the moment its commission balance hits zero, and resume — without recreating the listings — once topped up.
- Reviewing a verified business without a completed purchase errors with `NotVerifiedPurchaser`; the same action against an individual seller succeeds without that check.
- Listing as a first-time individual seller who hasn't completed the profile step errors with `IndividualSellerProfileIncomplete`.
- A trade offer against a listing not flagged "open to trade" is rejected; against an eligible listing, the seller's accept/reject/counter action is recorded and visible to the buyer.
- An accepted trade stays open until both buyer and seller separately confirm "trade completed"; a single-sided confirmation does not close it.
- A card added to a binder via link, with no catalog entry, still displays correctly in the binder.
- A collection entry preserves its `PlatformPurchase`/`Manual` source, and `GetCollectionValueHistory` returns a non-empty, COP-denominated series once a priced item is added.
- After an order reaches item-received-by-buyer, the buyer sees an add-to-collection prompt; accepting it creates a `PlatformPurchase`-sourced entry, declining it creates none, and the order's closed status is unaffected either way.
- Selling a card through its bundle listing decrements the same quantity as selling it through the seller's individual listing of that card, and vice versa — the two paths never oversell independently.

## Assumptions

- **Risky:** individual-seller reviews default to the platform-wide no-gate baseline (no purchase-verification requirement), since off-platform transactions can't be confirmed by the platform — an abuse-risk flagged, not decided.
- **Risky:** the individual-seller-to-verified-business account transition (what happens to existing individual listings when a seller graduates to verified-business status) is unaddressed by any source to date.
- **Risky:** the external messaging channel for individual-seller contact is a consumer chat app (e.g., WhatsApp) reachable from a generated deep link or copyable message; no source specifies integration depth beyond "external messaging app."
- **Risky:** catalog seed data (card/set metadata, artwork references) will come from an existing external Pokémon TCG data source rather than being manually authored by the team.
- **Safe:** a single seller account is exclusively either an individual seller or a verified business at a given time, not both simultaneously — sellers "graduate" from individual to business rather than holding both roles at once, per the Product Brief's framing (the transition mechanics themselves remain the open item flagged above).
- **Safe:** business-application review is a manual human admin action rather than automated approval.
- **Safe:** each user can own multiple independent collections (not capped at one).

## Open Questions

None outstanding — the prior two entries (location-filter scope, trade-completion signal) were resolved in session 2 and are now reflected in Capabilities/Constraints/Success signal above.
