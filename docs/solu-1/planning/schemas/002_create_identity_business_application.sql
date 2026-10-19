-- Migration: 002_create_identity_business_application.sql
-- Owner: identity (VER). Contracts: assertCanSubmitApplication, decideApplication,
-- getBusinessPaymentInstructions (contracts.md §2).

CREATE TABLE IF NOT EXISTS "RejectionReason" (
  code            TEXT PRIMARY KEY CHECK (code ~ '^[A-Z][A-Za-z]+$'),  -- e.g. DataMismatch (ADD-§9.1)
  "textEsCo"      TEXT NOT NULL CHECK (char_length("textEsCo") BETWEEN 10 AND 300),
  barred          BOOLEAN NOT NULL,
  "cooldownDays"  INT NULL,
  active          BOOLEAN NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL,
  -- A reason either bars reapplication or sets a 0..365-day cooldown (ARCH §6.2).
  CONSTRAINT rejection_reason_policy_shape
    CHECK ((barred AND "cooldownDays" IS NULL)
        OR (NOT barred AND "cooldownDays" BETWEEN 0 AND 365))
);

CREATE TABLE IF NOT EXISTS "BusinessApplication" (
  id                      TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "businessId"            TEXT NOT NULL,
  -- Discriminator: always 'business'; with the composite FK an application can
  -- exist only for a User whose sellerTrack is 'business' (AD-IDN-2, AD-18).
  "sellerTrack"           TEXT NOT NULL DEFAULT 'business' CHECK ("sellerTrack" = 'business'),
  -- allowed: Pending | Approved | Rejected (ADD-§4.1)
  status                  TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  version                 INT  NOT NULL DEFAULT 0 CHECK (version >= 0),
  "businessName"          TEXT NOT NULL CHECK (char_length("businessName") BETWEEN 2 AND 80),
  city                    TEXT NOT NULL CHECK (char_length(city) BETWEEN 2 AND 60),
  "externalPresenceUrl"   TEXT NOT NULL CHECK ("externalPresenceUrl" ~ '^https://' AND char_length("externalPresenceUrl") <= 2048),
  "submittedAt"           TIMESTAMPTZ NOT NULL,
  "consentAt"             TIMESTAMPTZ NOT NULL,     -- Ley 1581 consent (AD-13)
  "consentVersion"        TEXT NOT NULL,
  "decidedBy"             TEXT NULL,
  "decidedAt"             TIMESTAMPTZ NULL,
  "rejectionReasonCode"   TEXT NULL REFERENCES "RejectionReason"(code),
  "rejectionNote"         TEXT NULL CHECK (char_length("rejectionNote") <= 500),
  "reapplyNotBefore"      TIMESTAMPTZ NULL,         -- snapshot of the reason's cooldown
  "reapplyBarred"         BOOLEAN NOT NULL DEFAULT false,  -- snapshot of the reason's bar
  "createdAt"             TIMESTAMPTZ NOT NULL,
  CONSTRAINT business_application_user_track_fk
    FOREIGN KEY ("businessId", "sellerTrack") REFERENCES "User"(id, "sellerTrack")
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  -- Invariant (AD-VER-1): Pending <=> undecided; a decision always names its admin.
  CONSTRAINT business_application_pending_iff_undecided
    CHECK ((status = 'Pending') = ("decidedAt" IS NULL)),
  CONSTRAINT business_application_decided_has_admin
    CHECK ((status = 'Pending') = ("decidedBy" IS NULL)),
  -- Invariant (AD-VER-1 rule 5): a rejection snapshots its reason and its policy.
  CONSTRAINT business_application_rejection_snapshot
    CHECK (status <> 'Rejected'
           OR ("rejectionReasonCode" IS NOT NULL AND ("reapplyBarred" OR "reapplyNotBefore" IS NOT NULL))),
  CONSTRAINT business_application_only_rejection_has_policy
    CHECK (status = 'Rejected'
           OR ("rejectionReasonCode" IS NULL AND NOT "reapplyBarred" AND "reapplyNotBefore" IS NULL)),
  -- review E-03: only a rejection carries a note to the applicant.
  CONSTRAINT business_application_note_only_on_rejection
    CHECK (status = 'Rejected' OR "rejectionNote" IS NULL)
);

-- Invariant (AD-VER-3 rule 2): at most one Pending application per business.
CREATE UNIQUE INDEX IF NOT EXISTS business_application_one_pending
  ON "BusinessApplication"("businessId") WHERE status = 'Pending';

-- "Latest application" lookups (AD-IDN-1 rule 1).
CREATE INDEX IF NOT EXISTS business_application_latest
  ON "BusinessApplication"("businessId", "submittedAt" DESC, id DESC);

CREATE TABLE IF NOT EXISTS "ApplicationDecisionLog" (    -- append-only (AD-SYS-8 rule 10)
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "applicationId"   TEXT NOT NULL UNIQUE REFERENCES "BusinessApplication"(id),  -- second guard (AD-VER-1 rule 4)
  "adminId"         TEXT NOT NULL,
  decision          TEXT NOT NULL CHECK (decision IN ('Approved', 'Rejected')),
  "reasonCode"      TEXT NULL,
  at                TIMESTAMPTZ NOT NULL,
  CONSTRAINT application_decision_reason_iff_rejected
    CHECK ((decision = 'Rejected') = ("reasonCode" IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS "BusinessProfile" (
  "businessId"            TEXT PRIMARY KEY,
  -- review E-02: payment instructions exist only for a business-track account.
  "sellerTrack"           TEXT NOT NULL DEFAULT 'business' CHECK ("sellerTrack" = 'business'),
  "publicName"            TEXT NOT NULL CHECK (char_length("publicName") BETWEEN 2 AND 80),
  city                    TEXT NOT NULL CHECK (char_length(city) BETWEEN 2 AND 60),
  "externalPresenceUrl"   TEXT NOT NULL CHECK ("externalPresenceUrl" ~ '^https://'),
  "bankName"              TEXT NOT NULL,
  -- allowed: savings (Ahorros) | checking (Corriente)  — UX 5.1
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
