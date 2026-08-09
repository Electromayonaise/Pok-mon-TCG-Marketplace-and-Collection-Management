# Pokémon TCG Marketplace and Collection Management Platform — System Spec

*AI Assisted Development Process Course — Spec Task 1. Source: `docs/Problem-statement.pdf`.*

## Contract

Core operations the system exposes at the interface level. Types/wire format are a later-stage decision; this fixes only inputs, outputs, and error behavior.

- **BrowseCatalog(filters)** → list of CatalogEntries (flagged `hasActiveListings`). Empty/no-match filters return the full or an empty list — never an error.
- **GetCardDetail(cardId)** → CardDetail {catalog info, active listings, listing price (COP), last transaction price, historical trend (latter two as USD/COP pairs)}. Errors: `NotFound`.
- **CreateListing(sellerId, itemRef, price, quantity, condition?)** → ListingId. `itemRef`: card or `BundleId`. Errors: `SellerNotVerified`, `IndividualSellerProfileIncomplete`, `InvalidItemRef`, `InvalidPrice` (≤ 0).
- **CreateBundle(sellerId, componentCardIds)** → BundleId, listable via CreateListing; components stay independently visible. Errors: `EmptyComponentList`, `InvalidItemRef`.
- **RequestSellerContact(userId, listingId)** → contact message text (product + price) for external send. Individual-seller listings only. Errors: `ListingNotFound`, `NotIndividualSellerListing`.
- **PurchaseListing(userId, listingId, quantity)** → OrderId. Verified-business listings only, processed in-platform. Errors: `ListingNotFound`, `NotBusinessListing`, `InsufficientQuantity`.
- **SendBusinessMessage(userId, businessId, messageText)** → MessageId, in-app. Verified businesses only. Errors: `NotBusinessAccount`.
- **SubmitBusinessApplication(userId, legalIdentity, externalPresenceRef)** → ApplicationId (`Pending`). Errors: `MissingRequiredField`.
- **ReviewBusinessApplication(adminId, applicationId, decision)** → status `Approved`/`Rejected`. Errors: `ApplicationNotPending`.
- **SubmitReview(reviewerId, targetSellerOrBusinessId, rating, comment)** → ReviewId. Business targets require a completed purchase. Errors: `TargetNotFound`, `NotVerifiedPurchaser`.
- **AddToCollection(userId, itemRef, collectionId, source: PlatformPurchase\|Manual)** → CollectionEntryId. Errors: `CollectionNotFound`.
- **GetCollectionValueHistory(collectionId)** → time series {date, totalValue (COP)}. Errors: `CollectionNotFound`.
- **AddToWishlist(userId, itemRef)** → WishlistEntryId. Errors: `InvalidItemRef`.

## Why

Colombian Pokémon TCG collectors, buyers, individual sellers, and businesses currently split card research, pricing, seller discovery, and collection tracking across unrelated tools (social media, chat apps, foreign price trackers), forcing manual reconciliation by hand. A centralized platform gives collectors and buyers one consistent view of catalog, price, listings, and their own collection, and gives individual sellers and small businesses a single place to be discovered without building a storefront.

## Capabilities

- Users browse/filter the catalog by set, era, Pokémon, color, style, and artist, independent of listing status.
- A card's detail view shows listing price, last transaction price, and historical trend as three distinct values (COP; USD shown alongside the two reference prices).
- Any non-business account can sell individually; a first-time seller completes a short profile step (short of business verification) before listing cards, bundles, or sealed products.
- A business listing shows "verified" only once an admin approves its application.
- Individual sellers are reached via a generated external contact message; verified businesses are reached via in-app messaging and support in-platform purchase — individual-seller listings never do.
- A bundle records its component cards, each independently browsable in the catalog.
- Users add cards/products to one or more personal collections regardless of source, tagged by origin, and organize them into named groupings viewable as a virtual binder.
- A collection shows its current total value and how that value has changed over time.
- Users maintain a wish list, sortable by price and availability, separate from owned collections.
- Reviewing a verified business requires a completed platform purchase; individual-seller reviews have no such gate.
- Admins review, approve, or reject pending business applications and moderate listings/reviews.

## Constraints

- The catalog is never a derived view of listings — a card's existence doesn't depend on having one.
- Listing price, recent transaction price, and historical market value are distinct, non-interchangeable fields.
- Individual sellers need no business-style verification; only businesses go through the application process (legal identity + external presence, e.g. Instagram/website).
- Business listings display as "verified" only after admin approval — no auto-approval.
- Verified-business listings are always purchased in-platform; individual-seller listings always hand off externally — in-app messaging exists only for verified businesses.
- A review on a verified business requires a completed platform purchase; no equivalent gate exists for individual-seller reviews.
- Collections support multiple user-chosen organizing schemes (date, value, set, artist, color, binder layout) — no single mandated taxonomy.
- Clear boundaries are required around user-generated content (listings, reviews, market data) to keep displayed information reliable.
- First-iteration scope: must not fix module decomposition, database schema, UI/visual design, deployment architecture, or technology stack.

## Non-Goals

- Final module split, database schema, UI/visual design, deployment architecture, or technology stack.
- In-platform payment processing for individual-seller sales (external handoff only); for business purchases, only the payment gateway/provider details are excluded.
- The exact fields collected in the individual-seller profile step.
- Anti-abuse safeguards for reviews (self-review/collusion prevention) beyond the purchase-verification gate.
- The currency-conversion source, rate, and refresh mechanism for USD→COP display.
- The price-estimation/market-value algorithm.
- Implementation of external integrations (messaging app, Instagram, external TCG data sources).
- Final business model, commissions, or monetization strategy.
- Logistics/delivery handling and in-platform dispute resolution for marketplace transactions.

## Success Signal

- A card with zero listings still returns from the catalog with an empty listings array, never an error.
- A business listing shows "verified" only once its application is `Approved`; an individual-seller listing never requires that state.
- Purchasing a verified-business listing returns an OrderId and decrements quantity; purchasing an individual-seller listing errors with `NotBusinessListing` rather than silently succeeding.
- A bundle's component cards stay independently visible in the catalog after creation.
- A collection entry preserves its `PlatformPurchase`/`Manual` source, and `GetCollectionValueHistory` returns a non-empty series once a priced item is added.
- Reviewing a verified business without a completed purchase errors with `NotVerifiedPurchaser`; the same action against an individual seller succeeds without that check.
- Listing as a first-time individual seller who hasn't completed the profile step errors with `IndividualSellerProfileIncomplete`.

## Assumptions

- **Risky:** the individual-seller profile step collects enough contact/identity info to discourage bad-faith listings, short of business-style verification — exact fields unspecified (see Non-Goals).
- **Risky:** individual-seller reviews default to the platform's no-gate baseline (unlike business reviews) since off-platform transactions can't be confirmed — a fake-review risk flagged, not decided.
- **Risky:** bundle/individual-listing inventory reconciliation and the individual-seller-to-business account transition are both unaddressed by the source — left as gaps, not guessed.
- **Risky:** a successful `PurchaseListing` doesn't automatically create a collection entry — `AddToCollection` is inferred to be a separate, buyer-initiated action from the Contract treating them independently, not stated explicitly by the source.
- **Safe:** business-application review is a manual, human admin action, not automated.
- **Safe:** users have internet-connected devices capable of using a web or mobile client.
- **Safe:** a user can own multiple independent collections (not capped at one).
