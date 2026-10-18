-- Migration: 003_create_catalog.sql
-- Owner: catalog (CAT). Contracts: assertCatalogAdmin, startFeedRun,
-- upsertCatalogEntry, getReferencePriceAsOf (contracts.md §3).

CREATE TABLE IF NOT EXISTS "CatalogSet" (
  id            TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  era           TEXT NOT NULL,
  "releaseDate" DATE NULL,
  "cardCount"   INT  NULL CHECK ("cardCount" >= 0),   -- printed total
  "createdAt"   TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "CatalogEntry" (
  id              TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  -- Invariant (AD-CAT-1 rule 5, AD-7): one externalKey <=> one id, for ever.
  "externalKey"   TEXT NOT NULL UNIQUE,
  "setId"         TEXT NOT NULL REFERENCES "CatalogSet"(id),
  -- allowed: card | sealedProduct. Never changed by an upsert (GAP-4: KindChanged).
  kind            TEXT NOT NULL CHECK (kind IN ('card', 'sealedProduct')),
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  "nameKey"       TEXT GENERATED ALWAYS AS (tezg_unaccent_lower(name)) STORED,
  number          TEXT NOT NULL,
  "numberSort"    INT  NOT NULL,
  pokemon         TEXT NULL,
  colour          TEXT NULL,
  style           TEXT NULL,
  artist          TEXT NULL,
  "imageUrl"      TEXT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL,
  "updatedAt"     TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS catalog_entry_set_order ON "CatalogEntry"("setId", "numberSort");
CREATE INDEX IF NOT EXISTS catalog_entry_name_key ON "CatalogEntry"("nameKey" text_pattern_ops);

CREATE TABLE IF NOT EXISTS "FeedIngestionRun" (
  id               TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  -- allowed: Running | Completed | Failed (AD-CAT-1)
  status           TEXT NOT NULL CHECK (status IN ('Running', 'Completed', 'Failed')),
  cursor           INT  NOT NULL DEFAULT 0 CHECK (cursor >= 0),
  "leaseUntil"     TIMESTAMPTZ NULL,
  "leaseToken"     TEXT NULL,
  created          INT  NOT NULL DEFAULT 0 CHECK (created >= 0),
  updated          INT  NOT NULL DEFAULT 0 CHECK (updated >= 0),
  unchanged        INT  NOT NULL DEFAULT 0 CHECK (unchanged >= 0),
  quarantined      INT  NOT NULL DEFAULT 0 CHECK (quarantined >= 0),
  "deferredNoFx"   INT  NOT NULL DEFAULT 0 CHECK ("deferredNoFx" >= 0),
  "startedAt"      TIMESTAMPTZ NOT NULL,      -- creation instant (template created_at)
  "endedAt"        TIMESTAMPTZ NULL,
  -- Invariant: a run has ended iff it is no longer Running.
  CONSTRAINT feed_run_running_iff_open CHECK ((status = 'Running') = ("endedAt" IS NULL)),
  CONSTRAINT feed_run_lease_pair CHECK (("leaseUntil" IS NULL) = ("leaseToken" IS NULL))
);

-- Invariant (AD-CAT-1 rule 1): at most one Running run, physically.
CREATE UNIQUE INDEX IF NOT EXISTS feed_run_single_running
  ON "FeedIngestionRun"((true)) WHERE status = 'Running';

CREATE TABLE IF NOT EXISTS "CatalogEntryRevision" (
  id                 TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "catalogEntryId"   TEXT NOT NULL REFERENCES "CatalogEntry"(id),
  "runId"            TEXT NOT NULL REFERENCES "FeedIngestionRun"(id),
  "changedFields"    TEXT[] NOT NULL CHECK (cardinality("changedFields") >= 1),
  before             JSONB NOT NULL,
  after              JSONB NOT NULL,
  at                 TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS catalog_entry_revision_by_entry ON "CatalogEntryRevision"("catalogEntryId", at);

CREATE TABLE IF NOT EXISTS "QuarantinedFeedRow" (
  id              TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "runId"         TEXT NOT NULL REFERENCES "FeedIngestionRun"(id),
  "rowNumber"     INT  NOT NULL CHECK ("rowNumber" >= 1),
  "externalKey"   TEXT NULL,
  -- allowed: ADD-§8.2 defect kinds + KindChanged (GAP-4, decision log #12)
  "reasonCode"    TEXT NOT NULL CHECK ("reasonCode" IN (
                    'MissingRequiredField', 'UnknownSet', 'BadNumberFormat',
                    'InvalidPrice', 'CurrencyPairInconsistent', 'KindChanged')),
  "rawRow"        JSONB NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT quarantined_row_once_per_run UNIQUE ("runId", "rowNumber")
);

CREATE TABLE IF NOT EXISTS "ReferencePriceObservation" (   -- append-only (AD-CAT-2)
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "catalogEntryId"  TEXT NOT NULL REFERENCES "CatalogEntry"(id),
  source            TEXT NOT NULL,
  "observedAt"      TIMESTAMPTZ NOT NULL,
  "usdCents"        BIGINT NULL CHECK ("usdCents" >= 0),
  cop               BIGINT NOT NULL CHECK (cop >= 0),
  -- allowed: sourceNative | fxDerived (AD-SYS-7 ReferencePrice)
  "copDerivation"   TEXT NOT NULL CHECK ("copDerivation" IN ('sourceNative', 'fxDerived')),
  "fxRateDate"      DATE NULL,
  "runId"           TEXT NOT NULL REFERENCES "FeedIngestionRun"(id),
  "createdAt"       TIMESTAMPTZ NOT NULL,
  -- Invariant: one observation per entry, source and instant (rerun-safe insert).
  CONSTRAINT reference_price_once UNIQUE ("catalogEntryId", source, "observedAt"),
  -- Invariant: an FX-derived COP value always names its USD input and its TRM date.
  CONSTRAINT reference_price_fx_provenance
    CHECK (("copDerivation" = 'fxDerived') = ("fxRateDate" IS NOT NULL AND "usdCents" IS NOT NULL))
);
-- getReferencePriceAsOf order: (observedAt DESC, source ASC, id ASC) — review F-11.
CREATE INDEX IF NOT EXISTS reference_price_as_of
  ON "ReferencePriceObservation"("catalogEntryId", "observedAt" DESC, source, id);
