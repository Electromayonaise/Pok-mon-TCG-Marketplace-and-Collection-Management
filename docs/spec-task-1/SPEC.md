# Pokémon TCG Marketplace and Collection Management Platform — System Spec

*AI Assisted Development Process Course — Spec Task 1. Source: `docs/Problem-statement.pdf`.*

## Contract

Core operations the system exposes at the interface level. Types/wire format are a later-stage decision; this fixes only inputs, outputs, and error behavior.

- **BrowseCatalog(filters)** → list of CatalogEntries (each flagged `hasActiveListings`). Empty filter matches return the full catalog; no matches return an empty list — never an error.
- **GetCardDetail(cardId)** → CardDetail {catalog info, active listings, current listing price (COP), last transaction price, historical price trend (latter two as USD/COP pairs) — three separate values}. Errors: `NotFound` if cardId isn't in the catalog.
- **CreateListing(sellerId, itemRef, price, quantity, condition?)** → ListingId. `itemRef` is a catalog card or a `BundleId`. Errors: `SellerNotVerified` (business, until approved), `IndividualSellerProfileIncomplete` (individual sellers, before first listing), `InvalidItemRef`, `InvalidPrice` (≤ 0).
- **CreateBundle(sellerId, componentCardIds)** → BundleId, listable via CreateListing; each component stays independently visible in the catalog. Errors: `EmptyComponentList`, `InvalidItemRef`.
- **RequestSellerContact(userId, listingId)** → message text (product + listed price) for the user to send via an external app. Individual-seller listings only. Errors: `ListingNotFound`, `NotIndividualSellerListing` (business listings use PurchaseListing/SendBusinessMessage instead).
- **PurchaseListing(userId, listingId, quantity)** → OrderId. Verified-business listings only — the platform processes the transaction directly. Errors: `ListingNotFound`, `NotBusinessListing` (individual-seller listings use RequestSellerContact instead), `InsufficientQuantity`.
- **SendBusinessMessage(userId, businessId, messageText)** → MessageId, delivered in-app. Verified-business accounts only. Errors: `NotBusinessAccount`.
- **SubmitBusinessApplication(userId, legalIdentity, externalPresenceRef)** → ApplicationId, status = `Pending`. Errors: `MissingRequiredField`.
- **ReviewBusinessApplication(adminId, applicationId, decision)** → updates status to `Approved`/`Rejected`. Errors: `ApplicationNotPending`.
- **SubmitReview(reviewerId, targetSellerOrBusinessId, rating, comment)** → ReviewId. Business targets require a completed purchase from that business. Errors: `TargetNotFound`, `NotVerifiedPurchaser` (business targets only).
- **AddToCollection(userId, itemRef, collectionId, source: PlatformPurchase\|Manual)** → CollectionEntryId. Errors: `CollectionNotFound`.
- **GetCollectionValueHistory(collectionId)** → time series of {date, totalValue (COP)}. Errors: `CollectionNotFound`.
- **AddToWishlist(userId, itemRef)** → WishlistEntryId. Errors: `InvalidItemRef`.

## Why

Colombian Pokémon TCG collectors, buyers, individual sellers, and businesses currently spread the same related hobby activities — researching cards, checking prices, finding sellers, negotiating, tracking a collection — across unrelated tools (social media, chat apps, foreign price trackers), forcing manual reconciliation of card identity, price, and ownership by hand. A centralized platform benefits collectors and buyers with one consistent view linking catalog, price, listings, and their own collection, and benefits individual sellers and small businesses with a single place to be discovered without building a storefront.

## Capabilities

- Users browse/filter the catalog by set, era, Pokémon, color, style, and artist, independent of whether an item has a listing.
- A card's detail view shows current listing price (COP), last transaction price, and historical trend (each shown as a USD/COP pair) as three distinguishable values.
- Any non-business user account can act as an individual seller alongside buying — there is no separate individual-seller account type, but a first-time individual seller completes a short profile step (short of full business verification) before publishing listings for cards, bundles, and sealed products.
- A business listing is represented as "verified" only once an admin approves its pending application.
- A user generates a pre-filled contact message (product + price) to reach an individual seller through an external app; individual sellers have no in-app messaging entry point.
- A buyer sends an in-app message directly to a verified business.
- A user purchases a verified-business listing directly through the platform; individual-seller listings never support this and always route to external contact instead.
- A bundle records its component cards, and each component remains independently browsable in the catalog.
- Users add any card/product to one or more personal collections, whether bought on-platform or elsewhere, and the record shows which.
- Users create distinct collection groupings (e.g., general, sealed, keep, for-sale) and view a collection as a virtual binder.
- A collection shows its current total value and how that value has changed over time.
- Users maintain a wish list of cards, independent of owned collections, and can sort it by price and availability.
- A user can leave a rating/review on a verified business only after a completed platform purchase from it; a review on an individual seller has no such gate.
- Admins review, approve, or reject pending business applications and moderate listings/reviews.

## Constraints

- A card's existence in the catalog is independent of whether it has any listing — the catalog is never a derived view of listings.
- Listing price, recent transaction price, and historical market value are distinct, non-interchangeable fields.
- Individual sellers need no business-style verification to list; only businesses go through the application process (legal identity + external presence, e.g. Instagram/website).
- Business listings display as "verified" only after admin approval — no auto-approval.
- Verified-business listings are always purchased in-platform (mandatory, no external-only option); individual-seller listings are never processed by the platform and always hand off to an external messaging app instead.
- In-app messaging exists only for verified businesses, by design — individual-seller transactions and their aftermath stay entirely off-platform.
- A review on a verified business requires a completed platform purchase from that business; no equivalent gate exists for individual-seller reviews.
- The system must support multiple user-chosen ways of organizing a collection (date, value, set, artist, color, binder layout) — no single mandated taxonomy.
- Clear boundaries are required around user-generated content (listings, reviews, market data) to keep displayed information reliable and consistent.
- First-iteration scope: this spec must not fix internal module decomposition, database schema, UI/visual design, deployment architecture, or technology stack.

## Non-Goals

- Final internal module split, database schema, UI/visual design, deployment architecture, or technology stack.
- In-platform payment processing for individual-seller sales — always out of scope, external handoff only. (In-platform business purchases *are* in scope; only the specific payment gateway/provider and its integration details are excluded.)
- The exact fields collected in an individual seller's first-listing profile step.
- Anti-abuse safeguards for reviews (e.g., self-review or collusion prevention) beyond the purchase-verification gate already specified.
- The exact currency-conversion source, rate, and refresh mechanism for USD→COP reference-price display.
- The exact price-estimation/market-value algorithm.
- Definitive implementation of external integrations (messaging app, Instagram, external TCG data sources).
- Final business model, commissions, or monetization strategy.
- Logistics/physical delivery handling for marketplace transactions.
- In-platform dispute resolution between buyers and sellers.

## Success Signal

- Querying the catalog for a card with zero listings returns the card with an empty listings array, not an error or omission.
- A business-created listing is unmarked as "verified" until its application status is `Approved`; an individual-seller listing never requires that state.
- Purchasing a verified-business listing returns an OrderId and decrements its quantity; attempting to purchase an individual-seller listing errors with `NotBusinessListing` rather than silently succeeding.
- Adding a bundle records its component cards, and each component stays independently visible in the catalog.
- A collection entry preserves whether the item came from `PlatformPurchase` or `Manual` addition, and `GetCollectionValueHistory` returns a non-empty time series after at least one priced item is added.
- A card's display shows listing price, last transaction price, and historical trend as three separately labeled values, never merged into one number; the two reference prices show both USD and COP, the listing price COP only.
- Submitting a review on a verified business without a matching completed purchase errors with `NotVerifiedPurchaser`; the same action against an individual-seller target succeeds without that check.
- Creating a listing as a first-time individual seller who hasn't completed the profile step errors with `IndividualSellerProfileIncomplete` rather than silently succeeding.

## Assumptions

- **Risky:** the individual-seller profile step collects enough contact/identity info to discourage bad-faith listings, but stops short of business-style verification — exact fields unspecified (see Non-Goals).
- **Risky:** individual-seller reviews default to the platform's no-purchase-verification-gate baseline (unlike business reviews) since off-platform transactions can't be confirmed; a fake-review/abuse risk flagged for a later iteration, not a decided design.
- **Risky:** a card sold both individually and as part of a bundle by the same seller has no defined quantity reconciliation between the two listings — unaddressed by the source, left as a gap rather than a decided design.
- **Risky:** a successful `PurchaseListing` does not automatically create a collection entry — `AddToCollection` is a separate, buyer-initiated action, inferred from the Contract treating them as independent operations, not stated explicitly by the source.
- **Risky:** an individual seller's existing listings are unaffected when their account is later approved as a business — the source describes the two seller types without addressing the transition between them.
- **Safe:** business-application review is a manual, human admin action, not automated.
- **Safe:** users have internet-connected devices capable of using a web or mobile client.
- **Safe:** a user can own multiple independent collections (not capped at one).
