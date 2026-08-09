---
id: SPEC-pokemon-tcg-marketplace
companions: ["stakeholders.md"]
sources: ["docs/Problem-statement.pdf"]
---

> **Canonical contract.** This SPEC is the complete, preservation-validated contract for what to build, test, and validate. `docs/Problem-statement.pdf` is listed for traceability only.

# Pokémon TCG Marketplace and Collection Management Platform

## Why

Colombian Pokémon TCG collectors, buyers, individual sellers, and businesses currently split card research, price-checking, seller discovery, negotiation, and collection tracking across unrelated tools (social networks, messaging apps, foreign price-tracking platforms). This forces every user to manually reconcile card identity, price, and ownership across sources by hand. A centralized platform is a pain-to-solve for collectors and casual buyers (one consistent view linking catalog, price, listings, and their own collection) and an opportunity-to-capture for individual sellers and small businesses (a single place to be discovered without building a professional storefront).

## Capabilities

- **CAP-1**
  - **intent:** User can browse and filter the card/product catalog by set, era, Pokémon, color, style, and artist.
  - **success:** A filtered query returns only catalog entries matching all applied filters, including entries with zero active listings.
- **CAP-2**
  - **intent:** Catalog entries exist independently of marketplace listings; a listing links to a catalog entry but is never required for the entry to exist.
  - **success:** A card with no listings is still retrievable from the catalog and displays `hasActiveListings=false` rather than being absent or erroring.
- **CAP-3**
  - **intent:** User can see current listing price, most recent transaction price, and historical price trend for a card as distinct values.
  - **success:** The card detail view renders three separately labeled price values that never collapse into one number.
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
  - **success:** A collection view exposes a current total value and a trend over a prior period, derived from constituent item prices.
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

## Constraints

- Catalog/listing independence: a card's presence in the catalog must never be derived from or gated by the existence of a listing.
- Price provenance: listing price, recent transaction price, and historical market value must be stored and displayed as distinct fields, never merged or treated as interchangeable.
- Individual sellers require no business-style verification to publish listings; only businesses go through the legal-identity + external-presence application process.
- Business applications remain Pending until an admin approves them; a business cannot be represented as verified before approval.
- Individual-seller transactions are not necessarily processed by the platform; the platform's role for that path ends at generating a contact message for an external channel.
- A bundle must track its component cards individually so bundle contents remain associated with catalog entities.
- Collection ownership is independent of platform purchase; manual addition of externally-acquired items must be supported.
- The system must support multiple, user-chosen ways of organizing a collection (date, value, set, Pokémon, artist, color, binder layout) rather than one fixed taxonomy.
- The platform must establish clear boundaries around user-generated content, seller information, reviews, listings, and market data so the reliability and consistency of information presented to users can be maintained.
- Business applications require legal identity and external-presence information (e.g., Instagram profile or website) as submitted fields.
- First-iteration scope: this spec must not fix internal module decomposition, database schema, UI/visual design, deployment architecture, or technology stack.

## Non-goals

- Final internal module split of the platform.
- Exact database schema and data model.
- Exact user interface and visual design.
- Final deployment architecture.
- Exact technology stack.
- Definitive implementation of external integrations (external messaging app, Instagram, external Pokémon TCG data sources).
- The exact price-estimation or market-value calculation algorithm.
- Final business model, commissions, or monetization strategy.
- Detailed logistics and physical delivery process for marketplace transactions.
- In-platform dispute resolution between buyers and sellers.

## Success signal

The platform is working as specified when a user can, in one session, find a card in the catalog regardless of listing status, see its price context (listing / recent-sale / historical as distinct values), reach a seller (individual via a generated external message, or business once approved) and record the item into a personal collection with correct source attribution (`PlatformPurchase` vs. `Manual`) — without needing a second external tool to reconcile any of those facts.

## Assumptions

- **Risky:** the external messaging channel for individual-seller contact is a consumer chat app (e.g., WhatsApp) reachable from a generated deep link or copyable message; source names "any messaging app" without specifying integration depth.
- **Risky:** catalog seed data (card/set metadata, artwork references) will come from an existing external Pokémon TCG data source rather than being manually authored; source treats the catalog as pre-existing structured data without naming its origin.
- **Risky:** a single seller account is exclusively either an individual seller or a verified business at a given time, not both simultaneously; source describes two distinct interaction models without addressing dual-role accounts.
- **Safe:** business-application review is a manual human admin action rather than automated approval.
- **Safe:** users access the platform via internet-connected web or mobile clients; no offline mode is implied anywhere in the source.
- **Safe:** each user can own multiple independent collections (not capped at one), consistent with the source's explicit "one or more personal collections" language.

## Open Questions

- For business-seller listings, does the platform process the transaction/payment directly, or is it also handed off externally like individual sellers? Source specifies the external-handoff model only for individual sellers.
- What currency (or currencies) are prices denominated in? Source establishes a Colombia focus but never states currency.
- Who is eligible to leave a review on a seller/business — any user, or only users with a completed transaction?
- Can a single card be simultaneously part of an active bundle and individually listed by the same seller, and if so how does inventory/quantity reconcile?
- Can a listing carry seller-specific attributes (condition, grading, language) distinct from the catalog's canonical card identity?
- What specific actions can a platform administrator take on user-generated content beyond business-application approval — edit, hide, or only remove?
- Is there any limit on how many collections, wish lists, or bundles a single user/seller can create?
