-- Migration: 001_create_identity_user_and_profile.sql
-- Owner: identity (IDN). Contracts: requireListingEligibility, claimSellerTrack,
-- getSellerVerification (docs/solu-1/planning/contracts.md §1).

-- Better Auth core table, extended through additionalFields (ARCH §6.1).
-- Better Auth is configured with generateId = cuid2 (contracts §0, review F-04).
CREATE TABLE IF NOT EXISTS "User" (
  id                      TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  name                    TEXT NOT NULL,
  email                   TEXT NOT NULL UNIQUE,
  "emailVerified"         BOOLEAN NOT NULL DEFAULT false,
  image                   TEXT NULL,
  "isAdmin"               BOOLEAN NOT NULL DEFAULT false,
  -- allowed: NULL (no seller track) | 'individual' | 'business'  (AD-IDN-2)
  "sellerTrack"           TEXT NULL CHECK ("sellerTrack" IN ('individual', 'business')),
  "signupConsentAt"       TIMESTAMPTZ NOT NULL,
  "signupConsentVersion"  TEXT NOT NULL,
  "createdAt"             TIMESTAMPTZ NOT NULL,
  "updatedAt"             TIMESTAMPTZ NOT NULL,
  -- Target of the composite foreign keys that make seller-track exclusivity
  -- physical (IndividualSellerProfile here, BusinessApplication in 002).
  CONSTRAINT user_id_track_unique UNIQUE (id, "sellerTrack")
);

-- One account per mailbox, whatever the letter case (review E-01): a second account
-- for the same person would bypass seller-track exclusivity.
CREATE UNIQUE INDEX IF NOT EXISTS user_email_case_insensitive ON "User"(lower(email));

CREATE TABLE IF NOT EXISTS "IndividualSellerProfile" (
  "userId"                      TEXT PRIMARY KEY,
  -- Discriminator: always 'individual'. With the composite FK below it makes
  -- "a profile exists => User.sellerTrack = 'individual'" a physical invariant,
  -- and ON UPDATE RESTRICT forbids moving the track away while the profile exists
  -- (AD-IDN-2 rules 1 and 4).
  "sellerTrack"                 TEXT NOT NULL DEFAULT 'individual' CHECK ("sellerTrack" = 'individual'),
  -- FR-IDN-2: 2–40 grapheme clusters. That exact rule is checked by the input parser
  -- (Intl.Segmenter). SQL counts code points, so the column only carries a backstop
  -- loose enough never to refuse a valid 40-grapheme name (≤ 10 code points each).
  "displayName"                 TEXT NOT NULL CHECK (char_length("displayName") BETWEEN 2 AND 400),
  "contactPhoneE164"            TEXT NOT NULL CHECK ("contactPhoneE164" ~ '^\+573[0-9]{9}$'),  -- regulated (AD-SYS-8)
  "phoneSharingConsentAt"       TIMESTAMPTZ NOT NULL,
  "phoneSharingConsentVersion"  TEXT NOT NULL,
  "meetingLat"                  DOUBLE PRECISION NOT NULL,
  "meetingLng"                  DOUBLE PRECISION NOT NULL,
  "meetingCity"                 TEXT NOT NULL CHECK (char_length("meetingCity") BETWEEN 2 AND 60),
  "completedAt"                 TIMESTAMPTZ NOT NULL,
  "createdAt"                   TIMESTAMPTZ NOT NULL,
  CONSTRAINT individual_profile_user_track_fk
    FOREIGN KEY ("userId", "sellerTrack") REFERENCES "User"(id, "sellerTrack")
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  -- ADD-§2.4 Colombia bounding box, inclusive; (0, 0) is the missing-point sentinel.
  CONSTRAINT individual_profile_meeting_point_in_colombia
    CHECK ("meetingLat" BETWEEN -4.23 AND 13.39
       AND "meetingLng" BETWEEN -81.73 AND -66.85
       AND NOT ("meetingLat" = 0 AND "meetingLng" = 0))
);
