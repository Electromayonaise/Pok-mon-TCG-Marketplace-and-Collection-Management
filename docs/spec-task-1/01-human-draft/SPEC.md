# Pokémon TCG Marketplace and Collection Management — System Spec (Draft v1, plain-reasoning pass)

> Stage 1 of 3: drafted directly from `docs/Problem-statement.pdf` by reasoning, without the `bmad-spec` tool. Superseded by the reconciled `docs/spec-task-1/SPEC.md`.

## Contract

Core operations the system must expose at the interface level (plain-language signatures; final data types are a later-stage decision):

- **BrowseCatalog(filters: set, incl. availability)** → list of CatalogEntries (cards/products, each flagged `hasActiveListings: bool`). Always returns a list, empty if no matches; never errors on zero results.
- **GetCardDetail(cardId)** → CardDetail {catalog info, linked active listings, price history}. Errors: `NotFound` if cardId doesn't exist in the catalog.
- **CreateListing(sellerId, itemRef, price, quantity, sellerType)** → ListingId. Errors: `SellerNotVerified` (business sellers only, until admin-approved), `InvalidItemRef` (not in catalog), `InvalidPrice` (≤ 0).
- **CreateBundle(sellerId, componentCardIds: non-empty list)** → BundleId, listable via CreateListing. Errors: `EmptyComponentList`, `InvalidItemRef` (any component not in catalog).
- **RequestSellerContact(userId, listingId)** → pre-filled message (product name + listed price) for the user to send via an external messaging app. Applies only to individual-seller listings — the platform never brokers the transaction itself. Errors: `ListingNotFound`.
- **SubmitBusinessApplication(userId, legalInfo, externalPresenceRef)** → ApplicationId, status = `Pending`. Errors: `MissingRequiredField`.
- **ReviewBusinessApplication(adminId, applicationId, decision: Approve|Reject)** → updates status. Errors: `ApplicationNotPending`.
- **AddToCollection(userId, itemRef, collectionId, source: PlatformPurchase|Manual)** → CollectionEntryId. Errors: `CollectionNotFound`.
- **AddToWishlist(userId, itemRef)** → WishlistEntryId. Errors: `InvalidItemRef`.

## Why

Colombian Pokémon TCG collectors, buyers, individual sellers, and businesses currently spread the same related hobby activities — researching cards, checking prices, finding sellers, negotiating, and tracking a personal collection — across unrelated tools (social media, chat apps, foreign price trackers). This forces every user to manually reconcile "is this the same card," "is this a fair price," and "do I already own this" by hand. Collectors and casual buyers benefit from a single consistent source of truth linking cards, prices, listings, and their own collection; individual sellers and small businesses benefit from one place to be discovered without needing a professional storefront.

## Capabilities

- Users can browse and filter the card/product catalog by set, era, Pokémon, color, style, and artist, independent of whether an item currently has a listing.
- Users can view a card's current active listings, its most recent transaction price, and its historical price trend as three distinguishable values.
- Individual sellers can publish listings for cards, bundles, and sealed products without completing business verification.
- Businesses can only have listings represented as "verified business" after an admin approves their application; before approval the application shows as pending.
- A user can generate a pre-filled contact message (product + price) to reach an individual seller through an external messaging app.
- A seller creating a bundle must specify its component cards, and the system links the bundle to those catalog entries.
- Users can add any card/product to one or more personal collections, whether it was bought on-platform or elsewhere, and the record shows which.
- Users can create distinct collection groupings (e.g., general, sealed, keep, for-sale) and view a collection as a virtual binder.
- Users can maintain a wish list of cards independent of their owned collections.
- Admins can review, approve, or reject pending business applications and moderate listings/user content.

## Constraints

- First-iteration spec only: must not fix architecture, database schema, UI/visual design, deployment, or technology stack (per course problem statement).
- The platform never processes individual-seller transactions directly; those are handed off to an external messaging app.
- A card's existence in the catalog is independent of whether it has any listing — the catalog must not be implemented as a derived view of listings.
- Listing price, recent transaction price, and historical market value must be stored/displayed as distinct, non-interchangeable fields.
- Business sellers require admin-approved verification before being represented as "approved business"; individual sellers require none.
- Deliverable format constraint (course): plain language, no code, ≤ 2 pages, exact section order.

## Non-Goals

- Final internal module decomposition, database schema, UI/visual design, deployment architecture, or technology stack.
- In-platform payment processing or transaction execution for individual-seller sales.
- The exact price-estimation/market-value algorithm.
- Definitive implementation of external integrations (messaging app, Instagram, external TCG data sources).
- Final business model, commissions, or monetization strategy.
- Logistics/physical delivery handling for marketplace transactions.
- Dispute resolution between buyers and sellers.

## Success Signal

- Test: querying the catalog for a card with zero listings returns the card with an empty listings array, not an error or omission.
- Test: a business-created listing is hidden/unmarked as "verified" until its application status flips to `Approved`; an individual-seller listing never requires this state.
- Test: adding a bundle records its component cards, and each component remains independently visible in the catalog.
- Test: a user's collection entry preserves whether the item came from `PlatformPurchase` or `Manual` addition.
- Test: displaying a card shows listing price, last transaction price, and historical trend as three separately labeled values, never merged into one number.

## Assumptions

- **Risky:** Individual sellers can be trusted to list accurately without identity verification (no ID check), matching the problem statement's "lightweight" seller model.
- **Risky:** External messaging apps (e.g., WhatsApp) are the assumed contact channel; no in-app messaging is assumed to exist.
- **Risky:** Catalog seed data (card/set metadata) is assumed obtainable from an existing external source rather than manually authored.
- **Safe:** Business application review is a manual, human admin action, not automated.
- **Safe:** Users have internet-connected devices capable of using a web or mobile client.
- **Safe:** A single currency (COP) is assumed for all prices in this iteration.
