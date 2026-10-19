-- Migration: 004_create_listings_inventory.sql
-- Owner: listings (INV; DSC reads these tables and owns none — ARCH §6.5).
-- Contracts: assertListingOwner, reserveForPurchase, getAvailabilitySummary,
-- search, getCardDetail (contracts.md §4, §5).

CREATE TABLE IF NOT EXISTS "InventoryUnit" (
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "sellerId"        TEXT NOT NULL,
  "catalogEntryId"  TEXT NOT NULL,          -- catalog id; no cross-module FK (AD-8)
  -- allowed: NM | LP | MP | HP | DMG for cards; Sealed for sealed products (FR-INV-1)
  condition         TEXT NOT NULL CHECK (condition IN ('NM', 'LP', 'MP', 'HP', 'DMG', 'Sealed')),
  -- Invariant (AD-6, AD-INV-1 rule 3): stock never goes below zero, physically.
  quantity          INT  NOT NULL CHECK (quantity >= 0),
  "createdAt"       TIMESTAMPTZ NOT NULL,
  "updatedAt"       TIMESTAMPTZ NOT NULL,
  -- Invariant (AD-INV-1): one pool per (seller, item, condition).
  CONSTRAINT inventory_unit_one_pool UNIQUE ("sellerId", "catalogEntryId", condition),
  -- Targets of the ownership FKs below (review E-05, E-06).
  CONSTRAINT inventory_unit_id_seller UNIQUE (id, "sellerId"),
  CONSTRAINT inventory_unit_id_seller_item UNIQUE (id, "sellerId", "catalogEntryId", condition)
);

CREATE TABLE IF NOT EXISTS "Listing" (
  id                          TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "sellerId"                  TEXT NOT NULL,
  -- allowed: business | individual
  "sellerKindAtCreation"      TEXT NOT NULL CHECK ("sellerKindAtCreation" IN ('business', 'individual')),
  -- allowed: single | bundle (a bundle is Listing.kind='bundle' + BundleComponent)
  kind                        TEXT NOT NULL CHECK (kind IN ('single', 'bundle')),
  "inventoryUnitId"           TEXT NULL,
  title                       TEXT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  "priceCop"                  BIGINT NOT NULL CHECK ("priceCop" BETWEEN 1000 AND 100000000),
  lat                         DOUBLE PRECISION NULL,   -- unusable values are counted by DSC, not refused here
  lng                         DOUBLE PRECISION NULL,
  description                 TEXT NOT NULL CHECK (char_length(description) <= 1000),
  "openToTrade"               BOOLEAN NOT NULL DEFAULT false,
  "pausedAt"                  TIMESTAMPTZ NULL,
  "withdrawnAt"               TIMESTAMPTZ NULL,
  -- allowed: ApplicationRejected (FR-INV-8)
  "withdrawnReason"           TEXT NULL CHECK ("withdrawnReason" IN ('ApplicationRejected')),
  "withdrawnByApplicationId"  TEXT NULL,
  "hiddenAt"                  TIMESTAMPTZ NULL,
  -- allowed: the listing reasons of ADD-§9.2 (review E-17)
  "hiddenReason"              TEXT NULL CHECK ("hiddenReason" IN ('Counterfeit', 'ProhibitedItem', 'MisleadingListing', 'PersonalData', 'Spam', 'Other')),
  "hiddenBy"                  TEXT NULL,
  "deactivatedAt"             TIMESTAMPTZ NULL,
  version                     INT NOT NULL DEFAULT 0 CHECK (version >= 0),
  "createdAt"                 TIMESTAMPTZ NOT NULL,
  "updatedAt"                 TIMESTAMPTZ NOT NULL,
  -- A single listing points at exactly one unit; a bundle at none (it uses BundleComponent).
  CONSTRAINT listing_single_has_unit CHECK ((kind = 'single') = ("inventoryUnitId" IS NOT NULL)),
  CONSTRAINT listing_bundle_has_title CHECK (kind = 'single' OR title IS NOT NULL),
  -- Invariant (AD-4, FR-INV-1 rule 2): only individual-seller listings can be open to trade.
  CONSTRAINT listing_trade_individual_only CHECK (NOT "openToTrade" OR "sellerKindAtCreation" = 'individual'),
  -- Invariant (AD-INV-3 rule 6): individual-seller listings are never paused.
  CONSTRAINT listing_individual_never_paused CHECK ("sellerKindAtCreation" = 'business' OR "pausedAt" IS NULL),
  -- Invariant (AD-12): a hide always records its reason and admin.
  CONSTRAINT listing_hide_complete
    CHECK (("hiddenAt" IS NULL) = ("hiddenReason" IS NULL) AND ("hiddenAt" IS NULL) = ("hiddenBy" IS NULL)),
  CONSTRAINT listing_withdraw_complete CHECK (("withdrawnAt" IS NULL) = ("withdrawnReason" IS NULL)),
  CONSTRAINT listing_location_pair CHECK ((lat IS NULL) = (lng IS NULL)),
  -- review E-05: a single listing sells only its own seller's stock.
  CONSTRAINT listing_unit_same_seller
    FOREIGN KEY ("inventoryUnitId", "sellerId") REFERENCES "InventoryUnit"(id, "sellerId"),
  CONSTRAINT listing_id_seller UNIQUE (id, "sellerId")
);
CREATE INDEX IF NOT EXISTS listing_by_seller ON "Listing"("sellerId");
CREATE INDEX IF NOT EXISTS listing_by_location ON "Listing"(lat, lng);
-- Default-read predicate (AD-12, AD-DSC-1 rule 6).
CREATE INDEX IF NOT EXISTS listing_visible
  ON "Listing"(id) WHERE "hiddenAt" IS NULL AND "withdrawnAt" IS NULL AND "deactivatedAt" IS NULL;

CREATE TABLE IF NOT EXISTS "BundleComponent" (
  "listingId"        TEXT NOT NULL,
  "inventoryUnitId"  TEXT NOT NULL,
  "sellerId"         TEXT NOT NULL,
  "catalogEntryId"   TEXT NOT NULL,
  -- Invariant (AD-INV-1 rule 5): a sealed product is never a bundle component.
  condition          TEXT NOT NULL CHECK (condition IN ('NM', 'LP', 'MP', 'HP', 'DMG')),
  "perBundleQty"     INT  NOT NULL CHECK ("perBundleQty" BETWEEN 1 AND 4),
  "createdAt"        TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("listingId", "inventoryUnitId"),
  -- review E-06: the bundle and every component unit belong to one seller, and the
  -- copied display attributes can never drift from the unit.
  CONSTRAINT bundle_component_listing_seller
    FOREIGN KEY ("listingId", "sellerId") REFERENCES "Listing"(id, "sellerId"),
  CONSTRAINT bundle_component_unit_matches
    FOREIGN KEY ("inventoryUnitId", "sellerId", "catalogEntryId", condition)
    REFERENCES "InventoryUnit"(id, "sellerId", "catalogEntryId", condition)
);

-- Fail-closed commission projection (AD-INV-3): an absent row means paused.
CREATE TABLE IF NOT EXISTS "SellerCommissionState" (
  "businessId"       TEXT PRIMARY KEY,
  "lastAppliedSeq"   BIGINT NOT NULL CHECK ("lastAppliedSeq" >= 0),
  paused             BOOLEAN NOT NULL,
  "appliedAt"        TIMESTAMPTZ NOT NULL,
  "createdAt"        TIMESTAMPTZ NOT NULL
);
