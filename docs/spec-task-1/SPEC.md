# Pokémon TCG Marketplace and Collection Management Platform — System Spec

*AI Assisted Development Process Course — Spec Task 1. Source: `docs/Problem-statement.pdf`.*

## Contract

Core operations the system exposes at the interface level. Types/wire format are a later-stage decision; this fixes only inputs, outputs, and error behavior.

- **BrowseCatalog(filters)** → list of CatalogEntries (each flagged `hasActiveListings`). Empty filter matches return the full catalog; no matches return an empty list — never an error.
- **GetCardDetail(cardId)** → CardDetail {catalog info, active listings, current listing price, last transaction price, historical price trend — three separate values}. Errors: `NotFound` if cardId isn't in the catalog.
- **CreateListing(sellerId, itemRef, price, quantity, condition?)** → ListingId. Errors: `SellerNotVerified` (business sellers only, until approved), `InvalidItemRef`, `InvalidPrice` (≤ 0).
- **CreateBundle(sellerId, componentCardIds)** → BundleId, listable via CreateListing; each component stays independently visible in the catalog. Errors: `EmptyComponentList`, `InvalidItemRef`.
- **RequestSellerContact(userId, listingId)** → message text (product + listed price) for the user to send via an external app. Individual-seller listings only — the platform never brokers the transaction itself. Errors: `ListingNotFound`.
- **SubmitBusinessApplication(userId, legalIdentity, externalPresenceRef)** → ApplicationId, status = `Pending`. Errors: `MissingRequiredField`.
- **ReviewBusinessApplication(adminId, applicationId, decision)** → updates status to `Approved`/`Rejected`. Errors: `ApplicationNotPending`.
- **SubmitReview(reviewerId, targetSellerOrBusinessId, rating, comment)** → ReviewId. Errors: `TargetNotFound`.
- **AddToCollection(userId, itemRef, collectionId, source: PlatformPurchase\|Manual)** → CollectionEntryId. Errors: `CollectionNotFound`.
- **GetCollectionValueHistory(collectionId)** → time series of {date, totalValue}. Errors: `CollectionNotFound`.
- **AddToWishlist(userId, itemRef)** → WishlistEntryId. Errors: `InvalidItemRef`.

## Why

Colombian Pokémon TCG collectors, buyers, individual sellers, and businesses currently spread the same related hobby activities — researching cards, checking prices, finding sellers, negotiating, tracking a collection — across unrelated tools (social media, chat apps, foreign price trackers), forcing manual reconciliation of card identity, price, and ownership by hand. A centralized platform benefits collectors and buyers with one consistent view linking catalog, price, listings, and their own collection, and benefits individual sellers and small businesses with a single place to be discovered without building a storefront.

## Capabilities

- Users browse/filter the catalog by set, era, Pokémon, color, style, and artist, independent of whether an item has a listing.
- A card's detail view shows current listing price, last transaction price, and historical trend as three distinguishable values.
- Individual sellers publish listings for cards, bundles, and sealed products without completing business verification.
- A business listing is represented as "verified" only once an admin approves its pending application.
- A user generates a pre-filled contact message (product + price) to reach an individual seller through an external app.
- A bundle records its component cards, and each component remains independently browsable in the catalog.
- Users add any card/product to one or more personal collections, whether bought on-platform or elsewhere, and the record shows which.
- Users create distinct collection groupings (e.g., general, sealed, keep, for-sale) and view a collection as a virtual binder.
- A collection shows its current total value and how that value has changed over time.
- Users maintain a wish list of cards, independent of owned collections, and can sort it by price and availability.
- Users can leave a rating/review on a seller or business profile.
- Admins review, approve, or reject pending business applications and moderate listings/reviews.

## Constraints

- A card's existence in the catalog is independent of whether it has any listing — the catalog is never a derived view of listings.
- Listing price, recent transaction price, and historical market value are distinct, non-interchangeable fields.
- Individual sellers need no business-style verification to list; only businesses go through the application process (legal identity + external presence, e.g. Instagram/website).
- Business listings display as "verified" only after admin approval — no auto-approval.
- The platform does not process individual-seller transactions directly; it hands off to an external messaging app.
- The system must support multiple user-chosen ways of organizing a collection (date, value, set, artist, color, binder layout) — no single mandated taxonomy.
- Clear boundaries are required around user-generated content (listings, reviews, market data) to keep displayed information reliable and consistent.
- First-iteration scope: this spec must not fix internal module decomposition, database schema, UI/visual design, deployment architecture, or technology stack.

## Non-Goals

- Final internal module split, database schema, UI/visual design, deployment architecture, or technology stack.
- In-platform payment processing or transaction execution for individual-seller sales.
- The exact price-estimation/market-value algorithm.
- Definitive implementation of external integrations (messaging app, Instagram, external TCG data sources).
- Final business model, commissions, or monetization strategy.
- Logistics/physical delivery handling for marketplace transactions.
- In-platform dispute resolution between buyers and sellers.

## Success Signal

- Querying the catalog for a card with zero listings returns the card with an empty listings array, not an error or omission.
- A business-created listing is unmarked as "verified" until its application status is `Approved`; an individual-seller listing never requires that state.
- Adding a bundle records its component cards, and each component stays independently visible in the catalog.
- A collection entry preserves whether the item came from `PlatformPurchase` or `Manual` addition, and `GetCollectionValueHistory` returns a non-empty time series after at least one priced item is added.
- A card's display shows listing price, last transaction price, and historical trend as three separately labeled values, never merged into one number.

## Assumptions

- **Risky:** individual sellers are trusted to list accurately without identity verification, per the source's "lightweight" seller model.
- **Risky:** business-seller transactions are also off-platform in this iteration (payment/checkout unspecified) — the source only describes the external-handoff model for individual sellers.
- **Risky:** external messaging apps (e.g., WhatsApp) are the assumed contact channel; no in-app messaging is assumed.
- **Risky:** any registered user can leave a review, with no purchase-verification gate.
- **Risky:** all prices are denominated in a single currency (COP); the source never states currency.
- **Safe:** business-application review is a manual, human admin action, not automated.
- **Safe:** users have internet-connected devices capable of using a web or mobile client.
- **Safe:** a user can own multiple independent collections (not capped at one).
