-- Migration: 009_create_collections.sql
-- Owner: collections (COL; VAL reads these tables and owns none — ARCH §6.11).
-- Contracts: assertCollectionOwner, acceptPrompt, getSetCompletion,
-- valueCollection, changePercent (contracts.md §10, §11).

CREATE TABLE IF NOT EXISTS "Collection" (
  id             TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "ownerId"      TEXT NOT NULL,
  name           TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  "nameKey"      TEXT GENERATED ALWAYS AS (tezg_unaccent_lower(name)) STORED,
  "binderRows"   INT NOT NULL DEFAULT 3 CHECK ("binderRows" BETWEEN 1 AND 5),
  "binderCols"   INT NOT NULL DEFAULT 3 CHECK ("binderCols" BETWEEN 1 AND 5),
  "createdAt"    TIMESTAMPTZ NOT NULL,
  -- Invariant (FR-COL-1): names are unique per owner, case- and accent-insensitive.
  CONSTRAINT collection_name_unique_per_owner UNIQUE ("ownerId", "nameKey")
);

CREATE TABLE IF NOT EXISTS "CollectionEntry" (
  id                  TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "collectionId"      TEXT NOT NULL REFERENCES "Collection"(id) ON DELETE CASCADE,
  -- allowed: catalog | external — a tagged union (AD-7, AD-COL-1)
  "cardKind"          TEXT NOT NULL CHECK ("cardKind" IN ('catalog', 'external')),
  "catalogEntryId"    TEXT NULL,
  "externalUrl"       TEXT NULL,
  "externalTitle"     TEXT NULL,
  "externalImageUrl"  TEXT NULL CHECK ("externalImageUrl" ~ '^https://'),
  -- allowed: Manual | PlatformPurchase
  source              TEXT NOT NULL CHECK (source IN ('Manual', 'PlatformPurchase')),
  "orderId"           TEXT NULL,
  qty                 INT  NOT NULL CHECK (qty BETWEEN 1 AND 999),
  "acquiredAt"        DATE NOT NULL,            -- America/Bogota calendar date
  "acquiredPriceCop"  BIGINT NULL CHECK ("acquiredPriceCop" BETWEEN 0 AND 100000000),  -- one copy (FR-COL-2)
  "manualPosition"    INT  NOT NULL CHECK ("manualPosition" >= 0),
  "createdAt"         TIMESTAMPTZ NOT NULL,
  -- Invariant (AD-7): a catalog entry names its catalog id; an external one never does.
  CONSTRAINT collection_entry_catalog_tag CHECK (("cardKind" = 'catalog') = ("catalogEntryId" IS NOT NULL)),
  CONSTRAINT collection_entry_external_shape
    CHECK ("cardKind" = 'catalog'
           OR ("externalUrl" ~ '^https://' AND char_length("externalUrl") <= 2048
               AND char_length("externalTitle") BETWEEN 1 AND 120)),
  CONSTRAINT collection_entry_catalog_has_no_link
    CHECK ("cardKind" = 'external' OR ("externalUrl" IS NULL AND "externalTitle" IS NULL AND "externalImageUrl" IS NULL)),
  -- Invariant (AD-COL-2): a PlatformPurchase entry always names its order, a Manual one never does.
  CONSTRAINT collection_entry_source_order CHECK ((source = 'PlatformPurchase') = ("orderId" IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS collection_entry_binder_order ON "CollectionEntry"("collectionId", "manualPosition");

CREATE TABLE IF NOT EXISTS "PostPurchasePrompt" (
  id                               TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  -- Invariant (AD-COL-2 rule 1): one prompt per closed order, whatever the redeliveries.
  "orderId"                        TEXT NOT NULL UNIQUE,
  "buyerId"                        TEXT NOT NULL,
  lines                            JSONB NOT NULL CHECK (jsonb_typeof(lines) = 'array' AND jsonb_array_length(lines) >= 1),
  "buyerItemReceivedConfirmedAt"   TIMESTAMPTZ NOT NULL,   -- copied from OrderClosed (decision log Plan-2 #45)
  -- allowed: Pending | Accepted | Dismissed (ADD-§4.5)
  status                           TEXT NOT NULL CHECK (status IN ('Pending', 'Accepted', 'Dismissed')),
  "resolvedAt"                     TIMESTAMPTZ NULL,
  -- No FK by design (review E-16, rejected): the id records where the prompt was
  -- accepted and is never followed; it may outlive a deleted collection.
  "acceptedIntoCollectionId"       TEXT NULL,
  version                          INT NOT NULL DEFAULT 0 CHECK (version >= 0),
  "createdAt"                      TIMESTAMPTZ NOT NULL,
  CONSTRAINT prompt_pending_iff_unresolved CHECK ((status = 'Pending') = ("resolvedAt" IS NULL)),
  CONSTRAINT prompt_accepted_iff_collection CHECK ((status = 'Accepted') = ("acceptedIntoCollectionId" IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS prompt_by_buyer ON "PostPurchasePrompt"("buyerId", status);
