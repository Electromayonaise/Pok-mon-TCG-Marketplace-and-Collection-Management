# Glossary

Spec-authored companion to `SPEC.md`. Domain terms used across `SPEC.md`, `ARCHITECTURE-SPINE.md`, and the companion files, defined once here rather than re-explained inline each time they appear.

| Term | Definition |
| --- | --- |
| Catalog entry | A canonical record for a card, set, or product, independent of any listing (CAP-2). Never derived from or gated by a listing's existence. |
| Listing | A seller's offer of a catalog entry, bundle, or sealed product at a price and quantity. Individual-seller and verified-business listings follow different rules (CAP-5). |
| Bundle | A seller-created group of component cards, listed as one unit while each component stays independently browsable in the catalog (CAP-16). Only cards can be bundle components — sealed products never bundle. |
| Sealed product | An unopened product (booster box, box, pack) distinct from a single card. Always listed individually; never a bundle component and never shares inventory with another listing (AD-6). |
| Individual seller | A non-business account that can list and sell without business-style verification, after completing a one-time profile step (CAP-19). Sells are handed off externally — never processed in-platform. |
| Verified business | An account whose business application (legal identity + external presence) has been admin-approved (CAP-15). Only verified businesses can be purchased from in-platform and support in-app messaging. |
| Business application | The submission (legal identity, external-presence reference) a business account files to become verified; stays `Pending` until an admin approves or rejects it (CAP-15). |
| Comprobante | The uploaded proof-of-payment file a buyer attaches when confirming a business purchase (CAP-20). The platform stores the file reference; it never captures or holds payment itself. |
| Three-state order confirmation | The independent `buyerPaidConfirmedAt` / `sellerReceivedConfirmedAt` / `buyerItemReceivedConfirmedAt` timestamps that together track a business-purchase order without the platform ever custodying funds (AD-2, CAP-22). |
| Commission balance | A verified business's prepaid balance that gates whether its listings are purchasable; auto-deducted per confirmed sale, never invoiced after the fact (CAP-21, AD-3). |
| Open to trade | A flag on an individual-seller listing (off by default, never available on business listings) that makes it eligible to receive trade offers (CAP-25, AD-4). |
| Trade offer | A buyer's proposal (cards, product, and/or money) against an open-to-trade listing, which the seller accepts, rejects, or counters (CAP-25). Closes only once both parties independently confirm completion (CAP-26). |
| Collection | A user-owned, named grouping of catalog entries or externally-linked items, tagged by acquisition source (`PlatformPurchase` \| `Manual`, CAP-12). A user can own several. |
| Binder | The visual, user-organized view of a collection (CAP-10). A binder entry can exist without a matching catalog entry via an external link (CAP-24). |
| Wishlist | A user's list of desired-but-unowned cards, kept separate from owned collections and sortable by price/availability (CAP-13, CAP-14). |
| Historical trend | A card's price-change summary shown alongside its listing price — a delta (`period`, `changePercent`, `referencePriceAtStart`), not a full time series, sourced from an external price-reference feed (CAP-3). |
| Last-transaction price | A card's most recent observed sale price, shown as a single USD/COP reference point, sourced externally rather than derived from platform transaction volume (CAP-3). |
| Admin moderation | An admin's ability to hide (never delete) a listing or review that violates platform policy; hidden records stop appearing in browse/detail views but stay retained for audit (CAP-28, AD-12). |
| `InventoryUnit` | The architecture-level sole owner of a sellable quantity, keyed by `(sellerId, itemRef)`. For a card, shared across its bundle-component and individual-listing appearances; for a sealed product, always independent (AD-6). |
| `DomainError` | The shared, single-owner error-code enum every module throws from, never duplicated across modules (AD-11) — e.g. `NotBusinessListing`, `SellerNotVerified`, `IndividualSellerProfileIncomplete`. |
