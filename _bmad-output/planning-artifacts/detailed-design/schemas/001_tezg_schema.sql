-- Migration: 001_tezg_schema.sql
-- TEZG Solu-2 detailed design: every Plan-2 entity, in sections per owning module
-- (task statement Appendix B). Contracts: _bmad-output/planning-artifacts/detailed-design/contracts.md.
--
-- Conventions (inherited from Solu-1 decision log #9, refined by ARCHITECTURE v2):
--   * ids are TEXT cuid2 values issued by the IdGenerator port; no database default.
--     tezg_is_cuid() keeps them physically well-formed.
--   * timestamps are TIMESTAMPTZ NOT NULL with no DEFAULT: every value is bound from
--     the Clock port (AD-SYS-6 rules 1-2). A forgotten value fails NOT NULL instead of
--     silently taking wall-clock time.
--   * R-3: mutable tables carry "createdAt" and "updatedAt"; append-only and immutable
--     tables carry "createdAt" only (their grants forbid UPDATE, so an "updatedAt"
--     could never change). Named domain instants ("submittedAt", "openedAt", ...) stay
--     beside them.
--   * names follow the Plan-2 Prisma models: "PascalCase" tables, "camelCase" columns.
--     The one snake_case table, audit_events, is the name the course statement fixes.
--   * foreign keys exist only between tables of the same owning module (AD-8).
--   * this file is the schema source of truth (R-8); Prisma is generated from it.

-- ===========================================================================
-- shared-kernel (AD-SYS-2 rule 10 as refined by R-2)
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Shared immutable helper for generated "nameKey" columns.
CREATE OR REPLACE FUNCTION tezg_unaccent_lower(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, t)) $$;

-- cuid2 shape shared by every primary key (24 chars, leading lowercase letter).
CREATE OR REPLACE FUNCTION tezg_is_cuid(t text) RETURNS boolean
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT t ~ '^[a-z][0-9a-z]{23}$' $$;

CREATE TABLE IF NOT EXISTS "OutboxEvent" (          -- append-only
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),   -- the envelope's eventId (R-1)
  -- allowed: the seven ADD-§5 events
  type              TEXT NOT NULL CHECK (type IN (
                      'BusinessApplicationApproved', 'BusinessApplicationRejected',
                      'OrderPaymentConfirmedByBusiness', 'OrderClosed',
                      'CommissionBalanceExhausted', 'CommissionBalanceReplenished',
                      'TradeAccepted')),
  "aggregateId"     TEXT NOT NULL,                  -- first key of the payload (ARCH §7.1)
  "schemaVersion"   INT  NOT NULL CHECK ("schemaVersion" >= 1),   -- R-1
  payload           JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  "createdAt"       TIMESTAMPTZ NOT NULL            -- the envelope's occurredAt (R-1)
);
CREATE INDEX IF NOT EXISTS outbox_event_by_aggregate ON "OutboxEvent"("aggregateId", "createdAt");

CREATE TABLE IF NOT EXISTS "EventDelivery" (
  "eventId"        TEXT NOT NULL REFERENCES "OutboxEvent"(id),
  -- allowed: the three subscribing modules of ARCH §7.1
  subscriber       TEXT NOT NULL CHECK (subscriber IN ('commission', 'listings', 'collections')),
  -- allowed: pending | delivered | failed (AD-SYS-2 rule 3)
  status           TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts         INT  NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  "lastErrorCode"  TEXT NULL,                       -- a registry code, never a message
  "lastAttemptAt"  TIMESTAMPTZ NULL,
  "firstFailedAt"  TIMESTAMPTZ NULL,
  "lastFailedAt"   TIMESTAMPTZ NULL,
  "deliveredAt"    TIMESTAMPTZ NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL,
  "updatedAt"      TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("eventId", subscriber),
  CONSTRAINT event_delivery_delivered_iff_instant CHECK ((status = 'delivered') = ("deliveredAt" IS NOT NULL)),
  CONSTRAINT event_delivery_failed_has_evidence
    CHECK (status <> 'failed'
           OR ("firstFailedAt" IS NOT NULL AND "lastFailedAt" IS NOT NULL AND "lastErrorCode" IS NOT NULL)),
  -- AD-SYS-2 rule 4: at most 3 automatic attempts are ever counted before 'failed'.
  CONSTRAINT event_delivery_attempts_cap CHECK (status = 'failed' OR attempts <= 3)
);
CREATE INDEX IF NOT EXISTS event_delivery_pending_by_age ON "EventDelivery"("createdAt") WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS event_delivery_failed_by_age ON "EventDelivery"("firstFailedAt") WHERE status = 'failed';

CREATE TABLE IF NOT EXISTS "EventReplayLog" (       -- append-only (ARCH §7.3)
  id            TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "adminId"     TEXT NOT NULL,
  "eventId"     TEXT NOT NULL REFERENCES "OutboxEvent"(id),
  subscriber    TEXT NOT NULL CHECK (subscriber IN ('commission', 'listings', 'collections')),
  -- allowed: delivered | failed | noop (a concurrent replay held the row)
  outcome       TEXT NOT NULL CHECK (outcome IN ('delivered', 'failed', 'noop')),
  "createdAt"   TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "FailedDeliveryDigest" ( -- one row per daily-morning run (AD-SYS-2 rule 9)
  date                    DATE PRIMARY KEY,
  count                   INT  NOT NULL CHECK (count >= 0),
  "oldestFirstFailedAt"   TIMESTAMPTZ NULL,
  "stuckPendingCount"     INT  NOT NULL CHECK ("stuckPendingCount" >= 0),
  "createdAt"             TIMESTAMPTZ NOT NULL,
  CONSTRAINT digest_oldest_iff_failures CHECK ((count = 0) = ("oldestFirstFailedAt" IS NULL))
);

CREATE TABLE IF NOT EXISTS "JobRun" (               -- ARCH §4
  id            TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  -- allowed: tick | daily-morning | daily-night | admin
  trigger       TEXT NOT NULL CHECK (trigger IN ('tick', 'daily-morning', 'daily-night', 'admin')),
  job           TEXT NOT NULL CHECK (job ~ '^[a-z][a-z-]+$'),
  "startedAt"   TIMESTAMPTZ NOT NULL,
  "finishedAt"  TIMESTAMPTZ NULL,
  -- allowed: running | succeeded | failed | skipped (single-flight lock not acquired)
  outcome       TEXT NOT NULL CHECK (outcome IN ('running', 'succeeded', 'failed', 'skipped')),
  "errorCode"   TEXT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL,
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT job_run_finished_iff_done CHECK ((outcome = 'running') = ("finishedAt" IS NULL)),
  CONSTRAINT job_run_error_iff_failed CHECK ((outcome = 'failed') = ("errorCode" IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS job_run_tick_health ON "JobRun"(trigger, "startedAt" DESC);

-- R-2: the uniform audit trail. Written only through AuditLog.record(tx, entry) in the
-- writer's transaction, so an audit row exists iff its change committed. The ten
-- per-module audit tables below keep the domain snapshots (EC-35).
CREATE TABLE IF NOT EXISTS audit_events (           -- append-only
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "actorId"         TEXT NULL,
  -- allowed: user | admin | system
  "actorKind"       TEXT NOT NULL CHECK ("actorKind" IN ('user', 'admin', 'system')),
  module            TEXT NOT NULL CHECK (module IN (
                      'shared-kernel', 'identity', 'catalog', 'listings', 'orders',
                      'commission', 'trading', 'messaging', 'collections', 'reviews')),
  -- '<module>.<aggregate>.<verb>', e.g. 'orders.fact.buyerPaid' (contracts §0.1)
  action            TEXT NOT NULL CHECK (action ~ '^[a-zA-Z-]+\.[a-zA-Z]+\.[a-zA-Z]+$'),
  "aggregateType"   TEXT NOT NULL,
  "aggregateId"     TEXT NOT NULL,
  "decisionCode"    TEXT NULL,
  data              JSONB NOT NULL CHECK (jsonb_typeof(data) = 'object'),   -- ids and non-regulated values only
  "createdAt"       TIMESTAMPTZ NOT NULL,
  -- Only the system acts without a user id (jobs, subscribers).
  CONSTRAINT audit_actor_present CHECK ("actorId" IS NOT NULL OR "actorKind" = 'system'),
  -- The action's module prefix is the writing module (one owner per audit row).
  CONSTRAINT audit_action_module CHECK (split_part(action, '.', 1) = module
                                        OR (module = 'identity' AND split_part(action, '.', 1) = 'verification')
                                        OR (module = 'listings' AND split_part(action, '.', 1) = 'discovery'))
);
CREATE INDEX IF NOT EXISTS audit_by_aggregate ON audit_events("aggregateType", "aggregateId", "createdAt");
CREATE INDEX IF NOT EXISTS audit_by_time ON audit_events("createdAt");

-- ===========================================================================
-- identity — IDN (ARCH §6.1)
-- ===========================================================================

-- Better Auth core table, extended through additionalFields. Better Auth is configured
-- with generateId = cuid2 (Solu-1 review F-04).
CREATE TABLE IF NOT EXISTS "User" (
  id                      TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  name                    TEXT NOT NULL,
  email                   TEXT NOT NULL UNIQUE,
  "emailVerified"         BOOLEAN NOT NULL DEFAULT false,
  image                   TEXT NULL,
  "isAdmin"               BOOLEAN NOT NULL DEFAULT false,
  -- allowed: NULL (no seller track) | 'individual' | 'business' (AD-IDN-2)
  "sellerTrack"           TEXT NULL CHECK ("sellerTrack" IN ('individual', 'business')),
  "signupConsentAt"       TIMESTAMPTZ NOT NULL,
  "signupConsentVersion"  TEXT NOT NULL,
  "createdAt"             TIMESTAMPTZ NOT NULL,
  "updatedAt"             TIMESTAMPTZ NOT NULL,
  -- Target of the composite FKs that make seller-track exclusivity physical.
  CONSTRAINT user_id_track_unique UNIQUE (id, "sellerTrack")
);
-- One account per mailbox, whatever the letter case (Solu-1 review E-01).
CREATE UNIQUE INDEX IF NOT EXISTS user_email_case_insensitive ON "User"(lower(email));

-- Better Auth defaults (owned by identity, never read by other modules). The IP address
-- column is not created: Better Auth runs with IP tracking disabled (S-7: no raw IP).
CREATE TABLE IF NOT EXISTS "Session" (
  id            TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "userId"      TEXT NOT NULL REFERENCES "User"(id),
  token         TEXT NOT NULL UNIQUE,
  "expiresAt"   TIMESTAMPTZ NOT NULL,
  "userAgent"   TEXT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL,
  "updatedAt"   TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS "Account" (
  id                       TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "userId"                 TEXT NOT NULL REFERENCES "User"(id),
  "accountId"              TEXT NOT NULL,
  "providerId"             TEXT NOT NULL,
  password                 TEXT NULL,          -- Better Auth's hash, never plain text
  "accessToken"            TEXT NULL,
  "refreshToken"           TEXT NULL,
  "accessTokenExpiresAt"   TIMESTAMPTZ NULL,
  "createdAt"              TIMESTAMPTZ NOT NULL,
  "updatedAt"              TIMESTAMPTZ NOT NULL,
  CONSTRAINT account_provider_unique UNIQUE ("providerId", "accountId")
);
CREATE TABLE IF NOT EXISTS "Verification" (
  id            TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  identifier    TEXT NOT NULL,
  value         TEXT NOT NULL,
  "expiresAt"   TIMESTAMPTZ NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL,
  "updatedAt"   TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "IndividualSellerProfile" (
  "userId"                      TEXT PRIMARY KEY,
  -- Discriminator, always 'individual': with the composite FK a profile exists only for
  -- a User whose sellerTrack is 'individual', and ON UPDATE RESTRICT forbids moving the
  -- track while it exists (AD-IDN-2 rules 1 and 4; Annex A IDN MEC).
  "sellerTrack"                 TEXT NOT NULL DEFAULT 'individual' CHECK ("sellerTrack" = 'individual'),
  -- FR-IDN-2: 2-40 grapheme clusters, checked by the parser; this is a code-point backstop.
  "displayName"                 TEXT NOT NULL CHECK (char_length("displayName") BETWEEN 2 AND 400),
  "contactPhoneE164"            TEXT NOT NULL CHECK ("contactPhoneE164" ~ '^\+573[0-9]{9}$'),  -- regulated
  "phoneSharingConsentAt"       TIMESTAMPTZ NOT NULL,
  "phoneSharingConsentVersion"  TEXT NOT NULL,
  "meetingLat"                  DOUBLE PRECISION NOT NULL,
  "meetingLng"                  DOUBLE PRECISION NOT NULL,
  "meetingCity"                 TEXT NOT NULL CHECK (char_length("meetingCity") BETWEEN 2 AND 60),
  "completedAt"                 TIMESTAMPTZ NOT NULL,
  "createdAt"                   TIMESTAMPTZ NOT NULL,
  "updatedAt"                   TIMESTAMPTZ NOT NULL,
  CONSTRAINT individual_profile_user_track_fk
    FOREIGN KEY ("userId", "sellerTrack") REFERENCES "User"(id, "sellerTrack")
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  -- ADD-§2.4 Colombia bounding box, inclusive; (0, 0) is the missing-point sentinel.
  CONSTRAINT individual_profile_meeting_point_in_colombia
    CHECK ("meetingLat" BETWEEN -4.23 AND 13.39
       AND "meetingLng" BETWEEN -81.73 AND -66.85
       AND NOT ("meetingLat" = 0 AND "meetingLng" = 0))
);

CREATE TABLE IF NOT EXISTS "AuthThrottleEvent" (    -- purged after 24 h (ARCH §13)
  id            TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  -- allowed: signInFail | signUp (AD-IDN-3)
  scope         TEXT NOT NULL CHECK (scope IN ('signInFail', 'signUp')),
  -- an account id, or ipHmac(ip) — never a raw IP (S-7)
  key           TEXT NOT NULL CHECK (tezg_is_cuid(key) OR key ~ '^[0-9a-f]{64}$'),
  "createdAt"   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_throttle_window ON "AuthThrottleEvent"(scope, key, "createdAt");

CREATE TABLE IF NOT EXISTS "CapabilityAuditRead" ( -- append-only (AD-IDN-1 rule 5)
  id               TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "adminId"        TEXT NOT NULL REFERENCES "User"(id),
  "targetUserId"   TEXT NOT NULL REFERENCES "User"(id),
  "createdAt"      TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS capability_audit_by_target ON "CapabilityAuditRead"("targetUserId", "createdAt");

-- ===========================================================================
-- identity — VER (ARCH §6.2)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "RejectionReason" (
  code            TEXT PRIMARY KEY CHECK (code ~ '^[A-Z][A-Za-z]+$'),   -- e.g. DataMismatch (ADD-§9.1)
  "textEsCo"      TEXT NOT NULL CHECK (char_length("textEsCo") BETWEEN 10 AND 300),
  barred          BOOLEAN NOT NULL,
  "cooldownDays"  INT NULL,
  active          BOOLEAN NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL,
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT rejection_reason_policy_shape
    CHECK ((barred AND "cooldownDays" IS NULL) OR (NOT barred AND "cooldownDays" BETWEEN 0 AND 365))
);

CREATE TABLE IF NOT EXISTS "RejectionReasonChange" ( -- append-only (AD-VER-1 rule 6)
  id            TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  code          TEXT NOT NULL REFERENCES "RejectionReason"(code),
  "adminId"     TEXT NOT NULL,
  before        JSONB NULL,          -- null on creation
  after         JSONB NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "BusinessApplication" (
  id                      TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "businessId"            TEXT NOT NULL,
  -- Discriminator, always 'business': an application exists only for a User whose
  -- sellerTrack is 'business' (AD-IDN-2, AD-18; Annex A IDN MEC, physical half).
  "sellerTrack"           TEXT NOT NULL DEFAULT 'business' CHECK ("sellerTrack" = 'business'),
  -- allowed: Pending | Approved | Rejected (ADD-§4.1)
  status                  TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  version                 INT  NOT NULL DEFAULT 0 CHECK (version >= 0),
  "businessName"          TEXT NOT NULL CHECK (char_length("businessName") BETWEEN 2 AND 80),
  city                    TEXT NOT NULL CHECK (char_length(city) BETWEEN 2 AND 60),
  "externalPresenceUrl"   TEXT NOT NULL CHECK ("externalPresenceUrl" ~ '^https://' AND char_length("externalPresenceUrl") <= 2048),
  "submittedAt"           TIMESTAMPTZ NOT NULL,
  "consentAt"             TIMESTAMPTZ NOT NULL,
  "consentVersion"        TEXT NOT NULL,
  "decidedBy"             TEXT NULL,
  "decidedAt"             TIMESTAMPTZ NULL,
  "rejectionReasonCode"   TEXT NULL REFERENCES "RejectionReason"(code),
  "rejectionNote"         TEXT NULL CHECK (char_length("rejectionNote") <= 500),
  "reapplyNotBefore"      TIMESTAMPTZ NULL,
  "reapplyBarred"         BOOLEAN NOT NULL DEFAULT false,
  "createdAt"             TIMESTAMPTZ NOT NULL,
  "updatedAt"             TIMESTAMPTZ NOT NULL,
  CONSTRAINT business_application_user_track_fk
    FOREIGN KEY ("businessId", "sellerTrack") REFERENCES "User"(id, "sellerTrack")
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  -- Invariant (AD-VER-1): Pending <=> undecided; a decision always names its admin.
  CONSTRAINT business_application_pending_iff_undecided CHECK ((status = 'Pending') = ("decidedAt" IS NULL)),
  CONSTRAINT business_application_decided_has_admin CHECK ((status = 'Pending') = ("decidedBy" IS NULL)),
  -- Invariant (AD-VER-1 rule 5): a rejection snapshots its reason and its policy.
  CONSTRAINT business_application_rejection_snapshot
    CHECK (status <> 'Rejected'
           OR ("rejectionReasonCode" IS NOT NULL AND ("reapplyBarred" OR "reapplyNotBefore" IS NOT NULL))),
  CONSTRAINT business_application_only_rejection_has_policy
    CHECK (status = 'Rejected'
           OR ("rejectionReasonCode" IS NULL AND NOT "reapplyBarred" AND "reapplyNotBefore" IS NULL)),
  CONSTRAINT business_application_note_only_on_rejection CHECK (status = 'Rejected' OR "rejectionNote" IS NULL)
);
-- Invariant (AD-VER-3 rule 2): at most one Pending application per business.
CREATE UNIQUE INDEX IF NOT EXISTS business_application_one_pending
  ON "BusinessApplication"("businessId") WHERE status = 'Pending';
CREATE INDEX IF NOT EXISTS business_application_latest
  ON "BusinessApplication"("businessId", "submittedAt" DESC, id DESC);
CREATE INDEX IF NOT EXISTS business_application_queue
  ON "BusinessApplication"("submittedAt", id) WHERE status = 'Pending';

-- Regulated (AD-13, AD-VER-2): read and written only by legalIdentityRepository.
CREATE TABLE IF NOT EXISTS "BusinessApplicationLegalIdentity" (   -- immutable
  "applicationId"   TEXT PRIMARY KEY REFERENCES "BusinessApplication"(id),
  -- allowed: NIT | CC (FR-VER-1)
  type              TEXT NOT NULL CHECK (type IN ('NIT', 'CC')),
  -- CC: 6-10 digits; NIT: a 6-10 digit base plus one check digit (ADD-§2.5).
  number            TEXT NOT NULL CHECK (
                      (type = 'CC'  AND number ~ '^[0-9]{6,10}$') OR
                      (type = 'NIT' AND number ~ '^[0-9]{7,11}$')),
  "documentKeys"    TEXT[] NOT NULL CHECK (cardinality("documentKeys") BETWEEN 1 AND 3),
  "createdAt"       TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "ApplicationDecisionLog" (   -- append-only
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "applicationId"   TEXT NOT NULL UNIQUE REFERENCES "BusinessApplication"(id),   -- second guard (AD-VER-1 rule 4)
  "adminId"         TEXT NOT NULL,
  decision          TEXT NOT NULL CHECK (decision IN ('Approved', 'Rejected')),
  "reasonCode"      TEXT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL,
  CONSTRAINT application_decision_reason_iff_rejected CHECK ((decision = 'Rejected') = ("reasonCode" IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS "LegalIdentityAccessLog" (   -- append-only (AD-VER-2)
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "actorId"         TEXT NULL,
  "applicationId"   TEXT NOT NULL REFERENCES "BusinessApplication"(id),
  "fieldsRead"      TEXT[] NOT NULL,
  -- allowed: granted | denied
  outcome           TEXT NOT NULL CHECK (outcome IN ('granted', 'denied')),
  procedure         TEXT NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL,
  -- Only a job (orphan sweep, retention purge) reads without an actor (AD-VER-2 rule 6).
  CONSTRAINT legal_access_actor_or_job CHECK ("actorId" IS NOT NULL OR procedure LIKE 'job:%'),
  -- A denial reads nothing.
  CONSTRAINT legal_access_denied_reads_nothing CHECK (outcome = 'granted' OR cardinality("fieldsRead") = 0)
);
CREATE INDEX IF NOT EXISTS legal_access_by_application ON "LegalIdentityAccessLog"("applicationId", "createdAt");

CREATE TABLE IF NOT EXISTS "BusinessProfile" (
  "businessId"            TEXT PRIMARY KEY,
  -- Solu-1 review E-02: payment instructions exist only for a business-track account.
  "sellerTrack"           TEXT NOT NULL DEFAULT 'business' CHECK ("sellerTrack" = 'business'),
  "publicName"            TEXT NOT NULL CHECK (char_length("publicName") BETWEEN 2 AND 80),
  city                    TEXT NOT NULL CHECK (char_length(city) BETWEEN 2 AND 60),
  "externalPresenceUrl"   TEXT NOT NULL CHECK ("externalPresenceUrl" ~ '^https://'),
  "bankName"              TEXT NOT NULL,
  -- allowed: savings (Ahorros) | checking (Corriente) — UX 5.1
  "accountType"           TEXT NOT NULL CHECK ("accountType" IN ('savings', 'checking')),
  "accountNumber"         TEXT NOT NULL CHECK ("accountNumber" ~ '^[0-9]{6,20}$'),
  "holderName"            TEXT NOT NULL,
  "qrObjectKey"           TEXT NULL,
  "createdAt"             TIMESTAMPTZ NOT NULL,
  "updatedAt"             TIMESTAMPTZ NOT NULL,
  CONSTRAINT business_profile_user_track_fk
    FOREIGN KEY ("businessId", "sellerTrack") REFERENCES "User"(id, "sellerTrack")
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- ===========================================================================
-- catalog — CAT (ARCH §6.3); no module dependencies
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "CatalogSet" (
  id            TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  era           TEXT NOT NULL,
  "releaseDate" DATE NULL,
  "cardCount"   INT  NULL CHECK ("cardCount" >= 0),
  "createdAt"   TIMESTAMPTZ NOT NULL,
  "updatedAt"   TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "CatalogEntry" (
  id              TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  -- Invariant (AD-CAT-1 rule 5, AD-7; Annex A CAT MEC): one externalKey <=> one id, for ever.
  "externalKey"   TEXT NOT NULL UNIQUE,
  "setId"         TEXT NOT NULL REFERENCES "CatalogSet"(id),
  -- allowed: card | sealedProduct. Never changed by an upsert (KindChanged quarantine).
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
  "startedAt"      TIMESTAMPTZ NOT NULL,
  "endedAt"        TIMESTAMPTZ NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL,
  "updatedAt"      TIMESTAMPTZ NOT NULL,
  CONSTRAINT feed_run_running_iff_open CHECK ((status = 'Running') = ("endedAt" IS NULL)),
  CONSTRAINT feed_run_lease_pair CHECK (("leaseUntil" IS NULL) = ("leaseToken" IS NULL))
);
-- Invariant (AD-CAT-1 rule 1; Annex A CAT): at most one Running run, physically.
CREATE UNIQUE INDEX IF NOT EXISTS feed_run_single_running ON "FeedIngestionRun"((true)) WHERE status = 'Running';

CREATE TABLE IF NOT EXISTS "CatalogEntryRevision" (   -- append-only
  id                 TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "catalogEntryId"   TEXT NOT NULL REFERENCES "CatalogEntry"(id),
  "runId"            TEXT NOT NULL REFERENCES "FeedIngestionRun"(id),
  "changedFields"    TEXT[] NOT NULL CHECK (cardinality("changedFields") >= 1),
  before             JSONB NOT NULL,
  after              JSONB NOT NULL,
  "createdAt"        TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS catalog_entry_revision_by_entry ON "CatalogEntryRevision"("catalogEntryId", "createdAt");

CREATE TABLE IF NOT EXISTS "QuarantinedFeedRow" (     -- immutable
  id              TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "runId"         TEXT NOT NULL REFERENCES "FeedIngestionRun"(id),
  "rowNumber"     INT  NOT NULL CHECK ("rowNumber" >= 1),
  "externalKey"   TEXT NULL,
  -- allowed: ADD-§8.2 defect kinds + KindChanged (Solu-1 GAP-4)
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
  CONSTRAINT reference_price_once UNIQUE ("catalogEntryId", source, "observedAt"),
  CONSTRAINT reference_price_fx_provenance
    CHECK (("copDerivation" = 'fxDerived') = ("fxRateDate" IS NOT NULL AND "usdCents" IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS reference_price_as_of
  ON "ReferencePriceObservation"("catalogEntryId", "observedAt" DESC, source, id);

CREATE TABLE IF NOT EXISTS "FxRate" (                 -- immutable (AD-CAT-3)
  id                    TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "copPerUsdCentavos"   BIGINT NOT NULL CHECK ("copPerUsdCentavos" > 0),
  "validFrom"           DATE NOT NULL,
  "validTo"             DATE NOT NULL,
  source                TEXT NOT NULL,
  "fetchedAt"           TIMESTAMPTZ NOT NULL,
  "createdAt"           TIMESTAMPTZ NOT NULL,
  CONSTRAINT fx_rate_range_ordered CHECK ("validTo" >= "validFrom"),
  -- Invariant (AD-CAT-3): validity ranges never overlap, so a date has at most one rate.
  CONSTRAINT fx_rate_no_overlap EXCLUDE USING gist (daterange("validFrom", "validTo", '[]') WITH &&)
);

-- ===========================================================================
-- listings — INV (+ DSC reads, MSG contact log, REP listing moderation) (ARCH §6.4)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "InventoryUnit" (
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "sellerId"        TEXT NOT NULL,
  "catalogEntryId"  TEXT NOT NULL,          -- catalog id; no cross-module FK (AD-8)
  -- allowed: NM | LP | MP | HP | DMG for cards; Sealed for sealed products (FR-INV-1)
  condition         TEXT NOT NULL CHECK (condition IN ('NM', 'LP', 'MP', 'HP', 'DMG', 'Sealed')),
  -- Invariant (AD-6, AD-INV-1 rule 3; Annex A INV MEC): stock never goes below zero.
  quantity          INT  NOT NULL CHECK (quantity >= 0),
  "createdAt"       TIMESTAMPTZ NOT NULL,
  "updatedAt"       TIMESTAMPTZ NOT NULL,
  -- Invariant (AD-INV-1): one pool per (seller, item, condition).
  CONSTRAINT inventory_unit_one_pool UNIQUE ("sellerId", "catalogEntryId", condition),
  CONSTRAINT inventory_unit_id_seller UNIQUE (id, "sellerId"),
  CONSTRAINT inventory_unit_id_seller_item UNIQUE (id, "sellerId", "catalogEntryId", condition)
);

CREATE TABLE IF NOT EXISTS "Listing" (
  id                          TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "sellerId"                  TEXT NOT NULL,
  -- allowed: business | individual
  "sellerKindAtCreation"      TEXT NOT NULL CHECK ("sellerKindAtCreation" IN ('business', 'individual')),
  -- allowed: single | bundle
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
  -- allowed: the listing reasons of ADD-§9.2
  "hiddenReason"              TEXT NULL CHECK ("hiddenReason" IN ('Counterfeit', 'ProhibitedItem', 'MisleadingListing', 'PersonalData', 'Spam', 'Other')),
  "hiddenBy"                  TEXT NULL,
  "deactivatedAt"             TIMESTAMPTZ NULL,
  version                     INT NOT NULL DEFAULT 0 CHECK (version >= 0),
  "createdAt"                 TIMESTAMPTZ NOT NULL,
  "updatedAt"                 TIMESTAMPTZ NOT NULL,
  CONSTRAINT listing_single_has_unit CHECK ((kind = 'single') = ("inventoryUnitId" IS NOT NULL)),
  CONSTRAINT listing_bundle_has_title CHECK (kind = 'single' OR title IS NOT NULL),
  -- Invariant (AD-4): only individual-seller listings can be open to trade.
  CONSTRAINT listing_trade_individual_only CHECK (NOT "openToTrade" OR "sellerKindAtCreation" = 'individual'),
  -- Invariant (AD-INV-3 rule 6): individual-seller listings are never paused.
  CONSTRAINT listing_individual_never_paused CHECK ("sellerKindAtCreation" = 'business' OR "pausedAt" IS NULL),
  CONSTRAINT listing_hide_complete
    CHECK (("hiddenAt" IS NULL) = ("hiddenReason" IS NULL) AND ("hiddenAt" IS NULL) = ("hiddenBy" IS NULL)),
  CONSTRAINT listing_withdraw_complete CHECK (("withdrawnAt" IS NULL) = ("withdrawnReason" IS NULL)),
  CONSTRAINT listing_location_pair CHECK ((lat IS NULL) = (lng IS NULL)),
  CONSTRAINT listing_unit_same_seller FOREIGN KEY ("inventoryUnitId", "sellerId") REFERENCES "InventoryUnit"(id, "sellerId"),
  CONSTRAINT listing_id_seller UNIQUE (id, "sellerId")
);
CREATE INDEX IF NOT EXISTS listing_by_seller ON "Listing"("sellerId");
CREATE INDEX IF NOT EXISTS listing_by_location ON "Listing"(lat, lng);
CREATE INDEX IF NOT EXISTS listing_visible
  ON "Listing"(id) WHERE "hiddenAt" IS NULL AND "withdrawnAt" IS NULL AND "deactivatedAt" IS NULL;

CREATE TABLE IF NOT EXISTS "BundleComponent" (        -- immutable
  "listingId"        TEXT NOT NULL,
  "inventoryUnitId"  TEXT NOT NULL,
  "sellerId"         TEXT NOT NULL,
  "catalogEntryId"   TEXT NOT NULL,
  -- Invariant (AD-INV-1 rule 5): a sealed product is never a bundle component.
  condition          TEXT NOT NULL CHECK (condition IN ('NM', 'LP', 'MP', 'HP', 'DMG')),
  "perBundleQty"     INT  NOT NULL CHECK ("perBundleQty" BETWEEN 1 AND 4),
  "createdAt"        TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("listingId", "inventoryUnitId"),
  CONSTRAINT bundle_component_listing_seller FOREIGN KEY ("listingId", "sellerId") REFERENCES "Listing"(id, "sellerId"),
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
  "createdAt"        TIMESTAMPTZ NOT NULL,
  "updatedAt"        TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "AppliedApplicationDecision" (   -- immutable (AD-INV-3 rule 5)
  "applicationId"   TEXT PRIMARY KEY,
  "businessId"      TEXT NOT NULL,
  decision          TEXT NOT NULL CHECK (decision IN ('Approved', 'Rejected')),
  "decidedAt"       TIMESTAMPTZ NOT NULL,
  "appliedAt"       TIMESTAMPTZ NOT NULL,
  ignored           BOOLEAN NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS applied_decision_newest ON "AppliedApplicationDecision"("businessId", "decidedAt");

CREATE TABLE IF NOT EXISTS "ListingModerationLog" (   -- append-only (AD-REP-3)
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "listingId"       TEXT NOT NULL REFERENCES "Listing"(id),
  action            TEXT NOT NULL CHECK (action IN ('hide', 'unhide')),
  "reasonCode"      TEXT NOT NULL CHECK ("reasonCode" IN ('Counterfeit', 'ProhibitedItem', 'MisleadingListing', 'PersonalData', 'Spam', 'Other')),
  note              TEXT NULL CHECK (char_length(note) <= 500),
  "adminId"         TEXT NOT NULL,
  "titleSnapshot"   TEXT NOT NULL,
  "sellerId"        TEXT NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL,
  CONSTRAINT listing_log_other_has_note CHECK ("reasonCode" <> 'Other' OR char_length(note) BETWEEN 10 AND 500)
);
CREATE INDEX IF NOT EXISTS listing_log_by_time ON "ListingModerationLog"("createdAt");

CREATE TABLE IF NOT EXISTS "ContactRequestLog" (      -- purged after 7 days (ARCH §13)
  id              TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "requesterId"   TEXT NOT NULL,
  "listingId"     TEXT NOT NULL,
  "sellerId"      TEXT NOT NULL,
  "ipHmac"        TEXT NULL CHECK ("ipHmac" ~ '^[0-9a-f]{64}$'),   -- HMAC-SHA256, never a raw IP (S-7)
  -- allowed: purchase | trade (trade handoffs are not logged in V1, EC-37)
  kind            TEXT NOT NULL CHECK (kind IN ('purchase', 'trade')),
  counted         BOOLEAN NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS contact_log_by_requester ON "ContactRequestLog"("requesterId", "createdAt");
CREATE INDEX IF NOT EXISTS contact_log_by_requester_seller ON "ContactRequestLog"("requesterId", "sellerId", "createdAt");
CREATE INDEX IF NOT EXISTS contact_log_by_ip ON "ContactRequestLog"("ipHmac", "createdAt");

-- ===========================================================================
-- orders — ORD (ARCH §6.6)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "Order" (
  id                                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "buyerId"                         TEXT NOT NULL,
  "businessId"                      TEXT NOT NULL,
  "listingId"                       TEXT NOT NULL,   -- listings id; no cross-module FK (AD-8)
  "listingSnapshot"                 JSONB NOT NULL CHECK (jsonb_typeof("listingSnapshot") = 'object'),
  qty                               INT    NOT NULL CHECK (qty >= 1),
  "unitPriceCop"                    BIGINT NOT NULL CHECK ("unitPriceCop" BETWEEN 1000 AND 100000000),
  "totalCop"                        BIGINT NOT NULL,
  "paymentInstructionsSnapshot"     JSONB NOT NULL CHECK (jsonb_typeof("paymentInstructionsSnapshot") = 'object'),
  "reservationRef"                  JSONB NOT NULL CHECK (jsonb_typeof("reservationRef") = 'object'),
  "reservedUnitIds"                 TEXT[] NOT NULL CHECK (cardinality("reservedUnitIds") >= 1),
  "comprobanteObjectKey"            TEXT NULL,       -- regulated (AD-17)
  "comprobanteUploadedAt"           TIMESTAMPTZ NULL,
  -- The three independent confirmation facts (AD-2). No status, balance or escrow column.
  "buyerPaidConfirmedAt"            TIMESTAMPTZ NULL,
  "sellerReceivedConfirmedAt"       TIMESTAMPTZ NULL,
  "buyerItemReceivedConfirmedAt"    TIMESTAMPTZ NULL,
  "cancelledAt"                     TIMESTAMPTZ NULL,
  -- allowed: Unpaid (expiry) | BuyerCancelled (FR-ORD-7) — R-5
  "cancelReason"                    TEXT NULL CHECK ("cancelReason" IN ('Unpaid', 'BuyerCancelled')),
  "expiredAt"                       TIMESTAMPTZ NULL,
  "expiresAt"                       TIMESTAMPTZ NOT NULL,   -- createdAt + 48 h
  version                           INT NOT NULL DEFAULT 0 CHECK (version >= 0),
  "createdAt"                       TIMESTAMPTZ NOT NULL,
  "updatedAt"                       TIMESTAMPTZ NOT NULL,
  CONSTRAINT order_total_exact CHECK ("totalCop" = "unitPriceCop" * qty),
  CONSTRAINT order_no_self_purchase CHECK ("buyerId" <> "businessId"),
  CONSTRAINT order_expiry_after_creation CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT order_comprobante_pair CHECK (("comprobanteObjectKey" IS NULL) = ("comprobanteUploadedAt" IS NULL)),
  CONSTRAINT order_paid_requires_comprobante CHECK ("buyerPaidConfirmedAt" IS NULL OR "comprobanteObjectKey" IS NOT NULL),
  -- Invariants (AD-2, FR-ORD-6; Annex A ORD MEC): facts set in order.
  CONSTRAINT order_seller_after_paid CHECK ("sellerReceivedConfirmedAt" IS NULL OR "buyerPaidConfirmedAt" IS NOT NULL),
  CONSTRAINT order_item_after_paid CHECK ("buyerItemReceivedConfirmedAt" IS NULL OR "buyerPaidConfirmedAt" IS NOT NULL),
  CONSTRAINT order_not_cancelled_and_expired CHECK (NOT ("cancelledAt" IS NOT NULL AND "expiredAt" IS NOT NULL)),
  -- Invariant (AD-ORD-2): a paid order is never cancelled or expired.
  CONSTRAINT order_paid_never_terminated
    CHECK (("cancelledAt" IS NULL AND "expiredAt" IS NULL) OR "buyerPaidConfirmedAt" IS NULL),
  -- R-5: an expiry records 'Unpaid', a buyer cancel 'BuyerCancelled'.
  CONSTRAINT order_expiry_reason CHECK ("expiredAt" IS NULL OR "cancelReason" = 'Unpaid'),
  CONSTRAINT order_cancel_reason CHECK ("cancelledAt" IS NULL OR "cancelReason" = 'BuyerCancelled'),
  CONSTRAINT order_reason_iff_terminated CHECK (("cancelReason" IS NULL) = ("cancelledAt" IS NULL AND "expiredAt" IS NULL)),
  CONSTRAINT order_seller_not_before_paid
    CHECK ("sellerReceivedConfirmedAt" IS NULL OR "sellerReceivedConfirmedAt" >= "buyerPaidConfirmedAt"),
  CONSTRAINT order_item_not_before_paid
    CHECK ("buyerItemReceivedConfirmedAt" IS NULL OR "buyerItemReceivedConfirmedAt" >= "buyerPaidConfirmedAt"),
  CONSTRAINT order_comprobante_not_after_paid
    CHECK ("buyerPaidConfirmedAt" IS NULL OR "comprobanteUploadedAt" <= "buyerPaidConfirmedAt"),
  CONSTRAINT order_reserved_units_match_ref
    CHECK (cardinality("reservedUnitIds") = jsonb_array_length("reservationRef"->'units'))
);
CREATE INDEX IF NOT EXISTS order_by_buyer ON "Order"("buyerId", "createdAt");
CREATE INDEX IF NOT EXISTS order_by_business_paid ON "Order"("businessId", "buyerPaidConfirmedAt");
CREATE INDEX IF NOT EXISTS order_open_by_expiry
  ON "Order"("expiresAt") WHERE "buyerPaidConfirmedAt" IS NULL AND "cancelledAt" IS NULL AND "expiredAt" IS NULL;
CREATE INDEX IF NOT EXISTS order_reserved_units ON "Order" USING gin ("reservedUnitIds");
CREATE INDEX IF NOT EXISTS order_closed_by_pair
  ON "Order"("buyerId", "businessId") WHERE "buyerItemReceivedConfirmedAt" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "OrderLookupLog" (         -- append-only (AD-ORD-3 rule 3)
  id                 TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "adminId"          TEXT NOT NULL,
  query              JSONB NOT NULL CHECK (jsonb_typeof(query) = 'object'),   -- ids only
  "resultOrderIds"   TEXT[] NOT NULL,
  "createdAt"        TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "SupportContactSetting" (
  id               TEXT PRIMARY KEY CHECK (id = 'singleton'),
  email            TEXT NOT NULL CHECK (email ~ '^[^@\s]+@[^@\s]+$'),
  "whatsappE164"   TEXT NULL CHECK ("whatsappE164" ~ '^\+[1-9][0-9]{7,14}$'),
  "createdAt"      TIMESTAMPTZ NOT NULL,
  "updatedAt"      TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "SupportContactChange" (   -- append-only
  id            TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "adminId"     TEXT NOT NULL,
  before        JSONB NULL,
  after         JSONB NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL
);

-- ===========================================================================
-- commission — COM (ARCH §6.7)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "CommissionAccount" (
  "businessId"   TEXT PRIMARY KEY,            -- opened once, by the approval subscriber (AD-COM-1 rule 5)
  "balanceCop"   BIGINT NOT NULL,             -- may be negative (AD-19)
  -- allowed: Funded | Exhausted (ADD-§4.4)
  state          TEXT NOT NULL CHECK (state IN ('Funded', 'Exhausted')),
  "ledgerSeq"    BIGINT NOT NULL CHECK ("ledgerSeq" >= 0),
  version        INT NOT NULL DEFAULT 0 CHECK (version >= 0),
  "openedAt"     TIMESTAMPTZ NOT NULL,
  "createdAt"    TIMESTAMPTZ NOT NULL,
  "updatedAt"    TIMESTAMPTZ NOT NULL,
  -- Invariant (AD-COM-1): the state is a function of the balance.
  CONSTRAINT commission_account_state_matches_balance CHECK ((state = 'Funded') = ("balanceCop" > 0))
);

CREATE TABLE IF NOT EXISTS "TopUpRequest" (
  id                    TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  -- R-7 (as amended): a request needs an open account, so the FK is now physical.
  "businessId"          TEXT NOT NULL REFERENCES "CommissionAccount"("businessId"),
  "amountCop"           BIGINT NOT NULL CHECK ("amountCop" BETWEEN 20000 AND 10000000),
  "transferReference"   TEXT NOT NULL CHECK (char_length("transferReference") BETWEEN 4 AND 40),
  "proofObjectKey"      TEXT NOT NULL,       -- regulated (AD-SYS-8)
  -- allowed: Pending | Confirmed | Rejected
  status                TEXT NOT NULL CHECK (status IN ('Pending', 'Confirmed', 'Rejected')),
  "rejectionReason"     TEXT NULL CHECK (char_length("rejectionReason") BETWEEN 10 AND 300),
  "decidedBy"           TEXT NULL,
  "decidedAt"           TIMESTAMPTZ NULL,
  version               INT NOT NULL DEFAULT 0 CHECK (version >= 0),
  "submittedAt"         TIMESTAMPTZ NOT NULL,
  "createdAt"           TIMESTAMPTZ NOT NULL,
  "updatedAt"           TIMESTAMPTZ NOT NULL,
  CONSTRAINT top_up_pending_iff_undecided CHECK ((status = 'Pending') = ("decidedAt" IS NULL)),
  CONSTRAINT top_up_decided_has_admin CHECK ((status = 'Pending') = ("decidedBy" IS NULL)),
  CONSTRAINT top_up_rejection_has_reason CHECK ((status = 'Rejected') = ("rejectionReason" IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS top_up_queue ON "TopUpRequest"(status, "submittedAt");

CREATE TABLE IF NOT EXISTS "TopUpDecisionLog" (       -- append-only (AD-COM-3)
  id                 TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "topUpRequestId"   TEXT NOT NULL UNIQUE REFERENCES "TopUpRequest"(id),
  "adminId"          TEXT NOT NULL,
  decision           TEXT NOT NULL CHECK (decision IN ('Confirmed', 'Rejected')),
  "createdAt"        TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "CommissionLedgerEntry" (  -- append-only
  id                        TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "businessId"              TEXT NOT NULL REFERENCES "CommissionAccount"("businessId"),
  seq                       BIGINT NOT NULL CHECK (seq >= 1),
  -- allowed: TopUp | Deduction
  kind                      TEXT NOT NULL CHECK (kind IN ('TopUp', 'Deduction')),
  "amountCop"               BIGINT NOT NULL CHECK ("amountCop" >= 0),
  "orderId"                 TEXT NULL,
  "topUpRequestId"          TEXT NULL REFERENCES "TopUpRequest"(id),
  "rateBps"                 INT NULL CHECK ("rateBps" BETWEEN 0 AND 10000),
  "baseCop"                 BIGINT NULL CHECK ("baseCop" >= 0),
  -- allowed: businessConfirmed | buyerClosed (AD-SYS-3 rule 2)
  trigger                   TEXT NULL CHECK (trigger IN ('businessConfirmed', 'buyerClosed')),
  "commissionTriggeredAt"   TIMESTAMPTZ NULL,
  "balanceAfter"            BIGINT NOT NULL,
  "createdAt"               TIMESTAMPTZ NOT NULL,
  CONSTRAINT ledger_seq_unique UNIQUE ("businessId", seq),
  CONSTRAINT ledger_topup_positive CHECK (kind = 'Deduction' OR "amountCop" > 0),
  CONSTRAINT ledger_deduction_has_order CHECK ((kind = 'Deduction') = ("orderId" IS NOT NULL)),
  CONSTRAINT ledger_topup_has_request CHECK ((kind = 'TopUp') = ("topUpRequestId" IS NOT NULL)),
  CONSTRAINT ledger_deduction_priced
    CHECK (kind <> 'Deduction'
           OR ("rateBps" IS NOT NULL AND "baseCop" IS NOT NULL AND trigger IS NOT NULL AND "commissionTriggeredAt" IS NOT NULL)),
  -- Invariant (ADD-§2.6, AD-COM-2 rule 1; Annex A COM): the charged amount IS the rounding rule.
  CONSTRAINT ledger_deduction_rounding_rule
    CHECK (kind <> 'Deduction' OR "amountCop" = ("baseCop" * "rateBps" + 5000) / 10000)
);
-- Invariant (AD-COM-2, AD-SYS-3 rule 3; Annex A COM MEC): exactly one deduction per order.
CREATE UNIQUE INDEX IF NOT EXISTS ledger_one_deduction_per_order
  ON "CommissionLedgerEntry"("orderId") WHERE kind = 'Deduction';
CREATE UNIQUE INDEX IF NOT EXISTS ledger_one_credit_per_top_up
  ON "CommissionLedgerEntry"("topUpRequestId") WHERE kind = 'TopUp';

CREATE TABLE IF NOT EXISTS "CommissionRateSetting" (  -- append-only
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "rateBps"         INT NOT NULL CHECK ("rateBps" BETWEEN 0 AND 10000),
  "effectiveFrom"   TIMESTAMPTZ NOT NULL UNIQUE,
  "setBy"           TEXT NULL,                    -- null only for the migration seed row
  "createdAt"       TIMESTAMPTZ NOT NULL          -- Plan-2's setAt
);

CREATE TABLE IF NOT EXISTS "ReconciliationRun" (      -- immutable (AD-COM-1 rule 4)
  id                  TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  scope               TEXT NOT NULL CHECK (scope = 'all' OR tezg_is_cuid(scope)),
  "accountsChecked"   INT  NOT NULL CHECK ("accountsChecked" >= 0),
  discrepancies       JSONB NOT NULL CHECK (jsonb_typeof(discrepancies) = 'array'),
  "createdAt"         TIMESTAMPTZ NOT NULL
);

-- Seed row (AD-COM-2 rule 6, A-24): the rate lookup always finds a row. The instants
-- are fixed literals, not the wall clock (AD-SYS-6).
INSERT INTO "CommissionRateSetting" (id, "rateBps", "effectiveFrom", "setBy", "createdAt")
VALUES ('seedrate0000000000000001', 800, '1970-01-01T00:00:00Z', NULL, '1970-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- trading — TRD (ARCH §6.8)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "TradeOffer" (
  id                     TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "listingId"            TEXT NOT NULL,       -- listings id; no cross-module FK (AD-8)
  "sellerId"             TEXT NOT NULL,
  "proposerId"           TEXT NOT NULL,
  -- allowed: ADD-§4.3 states
  status                 TEXT NOT NULL CHECK (status IN (
                           'Open', 'Accepted', 'Rejected', 'Withdrawn', 'Expired', 'Unfulfillable', 'Cancelled')),
  turn                   TEXT NOT NULL CHECK (turn IN ('proposer', 'seller')),
  terms                  JSONB NOT NULL CHECK (jsonb_typeof(terms) = 'object'),   -- the current round's terms
  -- Counts offer and counter rounds only (Solu-1 review E-10).
  "roundCount"           INT  NOT NULL CHECK ("roundCount" BETWEEN 1 AND 10),
  version                INT  NOT NULL DEFAULT 0 CHECK (version >= 0),
  "reservationRef"       JSONB NULL,
  "unfulfillableReason"  TEXT NULL CHECK ("unfulfillableReason" IN ('ListingNoLongerAvailable')),
  "proposerConfirmedAt"  TIMESTAMPTZ NULL,
  "sellerConfirmedAt"    TIMESTAMPTZ NULL,
  "cancelledBy"          TEXT NULL,
  "cancelledAt"          TIMESTAMPTZ NULL,
  "acceptedAt"           TIMESTAMPTZ NULL,
  "expiresAt"            TIMESTAMPTZ NOT NULL,   -- createdAt + 7 days (ADD-§9.3)
  "createdAt"            TIMESTAMPTZ NOT NULL,
  "updatedAt"            TIMESTAMPTZ NOT NULL,
  CONSTRAINT trade_offer_no_self_trade CHECK ("proposerId" <> "sellerId"),
  -- Invariant (AD-TRD-3; Annex A TRD): only accepted offers hold stock.
  CONSTRAINT trade_offer_reservation_states CHECK (status IN ('Accepted', 'Cancelled') OR "reservationRef" IS NULL),
  CONSTRAINT trade_offer_accepted_has_reservation CHECK (status <> 'Accepted' OR "reservationRef" IS NOT NULL),
  CONSTRAINT trade_offer_accepted_instant CHECK (("acceptedAt" IS NOT NULL) = (status IN ('Accepted', 'Cancelled'))),
  CONSTRAINT trade_offer_unfulfillable_reason CHECK ((status = 'Unfulfillable') = ("unfulfillableReason" IS NOT NULL)),
  CONSTRAINT trade_offer_confirmations_on_accepted
    CHECK (("proposerConfirmedAt" IS NULL AND "sellerConfirmedAt" IS NULL) OR status = 'Accepted'),
  CONSTRAINT trade_offer_cancel_actor
    CHECK ((status = 'Cancelled') = ("cancelledBy" IS NOT NULL) AND ("cancelledBy" IS NULL) = ("cancelledAt" IS NULL)),
  CONSTRAINT trade_offer_expiry_after_creation CHECK ("expiresAt" > "createdAt")
);
-- Invariant (AD-TRD-1 rule 6; Annex A TRD): one live offer per proposer and listing.
CREATE UNIQUE INDEX IF NOT EXISTS trade_offer_one_open_per_proposer
  ON "TradeOffer"("listingId", "proposerId") WHERE status = 'Open';
CREATE INDEX IF NOT EXISTS trade_offer_by_listing ON "TradeOffer"("listingId", status);
CREATE INDEX IF NOT EXISTS trade_offer_by_seller ON "TradeOffer"("sellerId", status);
CREATE INDEX IF NOT EXISTS trade_offer_open_by_expiry ON "TradeOffer"("expiresAt") WHERE status = 'Open';

CREATE TABLE IF NOT EXISTS "TradeOfferRound" (        -- immutable
  "offerId"     TEXT NOT NULL REFERENCES "TradeOffer"(id),
  round         INT  NOT NULL CHECK (round >= 1),
  actor         TEXT NOT NULL CHECK (actor IN ('proposer', 'seller')),
  action        TEXT NOT NULL CHECK (action IN (
                  'offer', 'counter', 'accept', 'reject', 'withdraw', 'markedUnfulfillable', 'cancel')),
  terms         JSONB NULL,          -- { offeredItems[], cashCop, requestedQty: 1 } on offer/counter
  note          TEXT NULL CHECK (char_length(note) <= 300),
  "createdAt"   TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("offerId", round),
  CONSTRAINT trade_round_terms_on_proposals CHECK ((action IN ('offer', 'counter')) = (terms IS NOT NULL))
);

-- ===========================================================================
-- messaging — MSG in-app (ARCH §6.9)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "Conversation" (
  id               TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "buyerId"        TEXT NOT NULL,
  "businessId"     TEXT NOT NULL,
  "lastSeq"        BIGINT NOT NULL DEFAULT 0 CHECK ("lastSeq" >= 0),
  "lastMessageAt"  TIMESTAMPTZ NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL,
  "updatedAt"      TIMESTAMPTZ NOT NULL,
  -- Invariant (AD-MSG-2 rule 1; Annex A MSG): one conversation per buyer-business pair.
  CONSTRAINT conversation_one_per_pair UNIQUE ("buyerId", "businessId"),
  CONSTRAINT conversation_distinct_parties CHECK ("buyerId" <> "businessId"),
  CONSTRAINT conversation_last_message_iff_seq CHECK (("lastSeq" = 0) = ("lastMessageAt" IS NULL))
);

CREATE TABLE IF NOT EXISTS "ConversationParticipant" (
  "conversationId"  TEXT NOT NULL REFERENCES "Conversation"(id),
  "userId"          TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('buyer', 'business')),
  "lastReadSeq"     BIGINT NOT NULL DEFAULT 0 CHECK ("lastReadSeq" >= 0),
  "mutedAt"         TIMESTAMPTZ NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL,
  "updatedAt"       TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("conversationId", "userId"),
  -- Invariant (FR-MSG-8): mute is buyer-only (R-11 keeps user input from reaching it).
  CONSTRAINT participant_mute_buyer_only CHECK (role = 'buyer' OR "mutedAt" IS NULL),
  CONSTRAINT participant_one_per_role UNIQUE ("conversationId", role)
);

CREATE TABLE IF NOT EXISTS "Message" (                -- immutable
  id                              TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "conversationId"                TEXT NOT NULL REFERENCES "Conversation"(id),
  seq                             BIGINT NOT NULL CHECK (seq >= 1),
  "senderId"                      TEXT NOT NULL,
  body                            TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000 AND body IS NFC NORMALIZED),   -- regulated
  "clientMessageId"               TEXT NOT NULL CHECK ("clientMessageId" ~ '^[A-Za-z0-9_-]{1,64}$'),
  "recipientVerificationAtSend"   TEXT NOT NULL CHECK ("recipientVerificationAtSend" IN ('Approved', 'Pending')),
  "createdAt"                     TIMESTAMPTZ NOT NULL,
  CONSTRAINT message_seq_unique UNIQUE ("conversationId", seq),
  -- Invariant (AD-MSG-2 rule 4; Annex A MSG): a retry never duplicates a message.
  CONSTRAINT message_idempotent_send UNIQUE ("conversationId", "senderId", "clientMessageId"),
  CONSTRAINT message_sender_is_participant
    FOREIGN KEY ("conversationId", "senderId") REFERENCES "ConversationParticipant"("conversationId", "userId")
);

-- ===========================================================================
-- collections — COL (+ VAL reads) (ARCH §6.10)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "Collection" (
  id             TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "ownerId"      TEXT NOT NULL,
  name           TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  "nameKey"      TEXT GENERATED ALWAYS AS (tezg_unaccent_lower(name)) STORED,
  "binderRows"   INT NOT NULL DEFAULT 3 CHECK ("binderRows" BETWEEN 1 AND 5),
  "binderCols"   INT NOT NULL DEFAULT 3 CHECK ("binderCols" BETWEEN 1 AND 5),
  "createdAt"    TIMESTAMPTZ NOT NULL,
  "updatedAt"    TIMESTAMPTZ NOT NULL,
  CONSTRAINT collection_name_unique_per_owner UNIQUE ("ownerId", "nameKey")
);

CREATE TABLE IF NOT EXISTS "CollectionEntry" (
  id                  TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "collectionId"      TEXT NOT NULL REFERENCES "Collection"(id) ON DELETE CASCADE,   -- FR-COL-1; G-15
  -- allowed: catalog | external — a tagged union (AD-7, AD-COL-1; Annex A COL)
  "cardKind"          TEXT NOT NULL CHECK ("cardKind" IN ('catalog', 'external')),
  "catalogEntryId"    TEXT NULL,
  "externalUrl"       TEXT NULL,
  "externalTitle"     TEXT NULL,
  "externalImageUrl"  TEXT NULL CHECK ("externalImageUrl" ~ '^https://'),
  source              TEXT NOT NULL CHECK (source IN ('Manual', 'PlatformPurchase')),
  "orderId"           TEXT NULL,
  qty                 INT  NOT NULL CHECK (qty BETWEEN 1 AND 999),
  "acquiredAt"        DATE NOT NULL,            -- America/Bogota calendar date
  "acquiredPriceCop"  BIGINT NULL CHECK ("acquiredPriceCop" BETWEEN 0 AND 100000000),
  "manualPosition"    INT  NOT NULL CHECK ("manualPosition" >= 0),
  "createdAt"         TIMESTAMPTZ NOT NULL,
  "updatedAt"         TIMESTAMPTZ NOT NULL,
  CONSTRAINT collection_entry_catalog_tag CHECK (("cardKind" = 'catalog') = ("catalogEntryId" IS NOT NULL)),
  CONSTRAINT collection_entry_external_shape
    CHECK ("cardKind" = 'catalog'
           OR ("externalUrl" ~ '^https://' AND char_length("externalUrl") <= 2048
               AND char_length("externalTitle") BETWEEN 1 AND 120)),
  CONSTRAINT collection_entry_catalog_has_no_link
    CHECK ("cardKind" = 'external' OR ("externalUrl" IS NULL AND "externalTitle" IS NULL AND "externalImageUrl" IS NULL)),
  CONSTRAINT collection_entry_source_order CHECK ((source = 'PlatformPurchase') = ("orderId" IS NOT NULL)),
  -- A platform purchase is always a catalog card (the order snapshot names the catalog entry).
  CONSTRAINT collection_entry_purchase_is_catalog CHECK (source = 'Manual' OR "cardKind" = 'catalog')
);
CREATE INDEX IF NOT EXISTS collection_entry_binder_order ON "CollectionEntry"("collectionId", "manualPosition");

CREATE TABLE IF NOT EXISTS "WishlistEntry" (
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "ownerId"         TEXT NOT NULL,
  "catalogEntryId"  TEXT NOT NULL,
  "maxPriceCop"     BIGINT NULL CHECK ("maxPriceCop" BETWEEN 1000 AND 100000000),
  note              TEXT NULL CHECK (char_length(note) <= 200),
  "createdAt"       TIMESTAMPTZ NOT NULL,
  "updatedAt"       TIMESTAMPTZ NOT NULL,
  CONSTRAINT wishlist_one_per_card UNIQUE ("ownerId", "catalogEntryId")
);

CREATE TABLE IF NOT EXISTS "PostPurchasePrompt" (
  id                               TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  -- Invariant (AD-COL-2 rule 1; Annex A COL MEC): one prompt per closed order.
  "orderId"                        TEXT NOT NULL UNIQUE,
  "buyerId"                        TEXT NOT NULL,
  lines                            JSONB NOT NULL CHECK (jsonb_typeof(lines) = 'array' AND jsonb_array_length(lines) >= 1),
  "buyerItemReceivedConfirmedAt"   TIMESTAMPTZ NOT NULL,
  status                           TEXT NOT NULL CHECK (status IN ('Pending', 'Accepted', 'Dismissed')),
  "resolvedAt"                     TIMESTAMPTZ NULL,
  "acceptedIntoCollectionId"       TEXT NULL,      -- recorded, never followed (Solu-1 review E-16)
  version                          INT NOT NULL DEFAULT 0 CHECK (version >= 0),
  "createdAt"                      TIMESTAMPTZ NOT NULL,
  "updatedAt"                      TIMESTAMPTZ NOT NULL,
  CONSTRAINT prompt_pending_iff_unresolved CHECK ((status = 'Pending') = ("resolvedAt" IS NULL)),
  CONSTRAINT prompt_accepted_iff_collection CHECK ((status = 'Accepted') = ("acceptedIntoCollectionId" IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS prompt_by_buyer ON "PostPurchasePrompt"("buyerId", status);

-- ===========================================================================
-- reviews — REP (ARCH §6.12)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "Review" (
  id                   TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "reviewerId"         TEXT NOT NULL,
  "targetUserId"       TEXT NOT NULL,
  "targetKind"         TEXT NOT NULL CHECK ("targetKind" IN ('business', 'individual')),
  "purchaseVerified"   BOOLEAN NOT NULL,
  rating               SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text                 TEXT NOT NULL CHECK (char_length(text) <= 1000),
  "hiddenAt"           TIMESTAMPTZ NULL,
  "hiddenReason"       TEXT NULL CHECK ("hiddenReason" IN ('Harassment', 'PersonalData', 'Spam', 'OffTopic', 'Other')),
  "hiddenBy"           TEXT NULL,
  "editedAt"           TIMESTAMPTZ NULL,
  version              INT NOT NULL DEFAULT 0 CHECK (version >= 0),
  "createdAt"          TIMESTAMPTZ NOT NULL,
  "updatedAt"          TIMESTAMPTZ NOT NULL,
  CONSTRAINT review_one_per_pair UNIQUE ("reviewerId", "targetUserId"),
  CONSTRAINT review_not_self CHECK ("reviewerId" <> "targetUserId"),
  -- Invariant (AD-2, AD-REP-1 rule 2; Annex A REP): business reviews are purchase-verified.
  CONSTRAINT review_business_iff_verified CHECK (("targetKind" = 'business') = "purchaseVerified"),
  CONSTRAINT review_hide_complete
    CHECK (("hiddenAt" IS NULL) = ("hiddenReason" IS NULL) AND ("hiddenAt" IS NULL) = ("hiddenBy" IS NULL))
);
CREATE INDEX IF NOT EXISTS review_visible_by_target
  ON "Review"("targetUserId", "createdAt" DESC) WHERE "hiddenAt" IS NULL;

CREATE TABLE IF NOT EXISTS "ReviewModerationLog" (   -- append-only
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "reviewId"        TEXT NOT NULL REFERENCES "Review"(id),
  action            TEXT NOT NULL CHECK (action IN ('hide', 'unhide')),
  "reasonCode"      TEXT NOT NULL CHECK ("reasonCode" IN ('Harassment', 'PersonalData', 'Spam', 'OffTopic', 'Other')),
  note              TEXT NULL CHECK (char_length(note) <= 500),
  "adminId"         TEXT NOT NULL,
  "ratingSnapshot"  SMALLINT NOT NULL CHECK ("ratingSnapshot" BETWEEN 1 AND 5),
  "textSnapshot"    TEXT NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL,
  CONSTRAINT review_log_other_has_note CHECK ("reasonCode" <> 'Other' OR char_length(note) BETWEEN 10 AND 500)
);
CREATE INDEX IF NOT EXISTS review_log_by_time ON "ReviewModerationLog"("createdAt");

-- ===========================================================================
-- Grants (AD-SYS-8 rule 10, AD-12, R-2). Applied last.
-- ===========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tezg_app') THEN
    CREATE ROLE tezg_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tezg_retention') THEN
    CREATE ROLE tezg_retention NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO tezg_app, tezg_retention;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tezg_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tezg_app;

-- Append-only and immutable: insert and read only, for the application role.
REVOKE UPDATE, DELETE ON
  audit_events, "OutboxEvent", "EventReplayLog",
  "CapabilityAuditRead", "RejectionReasonChange", "ApplicationDecisionLog",
  "LegalIdentityAccessLog", "BusinessApplicationLegalIdentity",
  "CatalogEntryRevision", "ReferencePriceObservation", "QuarantinedFeedRow", "FxRate",
  "BundleComponent", "AppliedApplicationDecision", "ListingModerationLog",
  "OrderLookupLog", "SupportContactChange",
  "TopUpDecisionLog", "CommissionLedgerEntry", "CommissionRateSetting", "ReconciliationRun",
  "TradeOfferRound", "Message", "ReviewModerationLog"
FROM tezg_app;

-- Hide, never delete (AD-12, NFR-REP-3).
REVOKE DELETE ON "Review", "Listing" FROM tezg_app;

-- The regulated retention purge runs under its own role (AD-SYS-8 rule 10), in dry-run
-- until TEZG_RETENTION_LEGAL_APPROVED=true (launch gate LG-2).
GRANT SELECT, DELETE ON "BusinessApplicationLegalIdentity", "LegalIdentityAccessLog" TO tezg_retention;
