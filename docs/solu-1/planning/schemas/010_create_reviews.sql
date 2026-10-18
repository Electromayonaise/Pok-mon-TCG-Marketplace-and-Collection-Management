-- Migration: 010_create_reviews.sql
-- Owner: reviews (REP). Contracts: assertVerifiedPurchaser, hideReview,
-- getAggregates (contracts.md §12).

CREATE TABLE IF NOT EXISTS "Review" (
  id                   TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "reviewerId"         TEXT NOT NULL,
  "targetUserId"       TEXT NOT NULL,
  -- allowed: business | individual
  "targetKind"         TEXT NOT NULL CHECK ("targetKind" IN ('business', 'individual')),
  "purchaseVerified"   BOOLEAN NOT NULL,
  rating               SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text                 TEXT NOT NULL CHECK (char_length(text) <= 1000),
  "hiddenAt"           TIMESTAMPTZ NULL,
  -- allowed: the review reasons of ADD-§9.2 (review E-17)
  "hiddenReason"       TEXT NULL CHECK ("hiddenReason" IN ('Harassment', 'PersonalData', 'Spam', 'OffTopic', 'Other')),
  "hiddenBy"           TEXT NULL,
  "editedAt"           TIMESTAMPTZ NULL,
  version              INT NOT NULL DEFAULT 0 CHECK (version >= 0),
  "createdAt"          TIMESTAMPTZ NOT NULL,
  -- Invariant (AD-REP-1 rule 3): one review per reviewer and target.
  CONSTRAINT review_one_per_pair UNIQUE ("reviewerId", "targetUserId"),
  CONSTRAINT review_not_self CHECK ("reviewerId" <> "targetUserId"),
  -- Invariant (AD-2, AD-REP-1 rule 2): a business review is purchase-verified,
  -- an individual-seller review never is.
  CONSTRAINT review_business_iff_verified CHECK (("targetKind" = 'business') = "purchaseVerified"),
  -- Invariant (AD-12): a hide always records its reason and admin.
  CONSTRAINT review_hide_complete
    CHECK (("hiddenAt" IS NULL) = ("hiddenReason" IS NULL) AND ("hiddenAt" IS NULL) = ("hiddenBy" IS NULL))
);
-- Visible reviews per target (AD-REP-2 rule 1).
CREATE INDEX IF NOT EXISTS review_visible_by_target
  ON "Review"("targetUserId", "createdAt" DESC) WHERE "hiddenAt" IS NULL;

CREATE TABLE IF NOT EXISTS "ReviewModerationLog" (    -- append-only (AD-SYS-8 rule 10)
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "reviewId"        TEXT NOT NULL REFERENCES "Review"(id),
  -- allowed: hide | unhide
  action            TEXT NOT NULL CHECK (action IN ('hide', 'unhide')),
  -- allowed: the review-applicable reasons of ADD-§9.2
  "reasonCode"      TEXT NOT NULL CHECK ("reasonCode" IN ('Harassment', 'PersonalData', 'Spam', 'OffTopic', 'Other')),
  note              TEXT NULL CHECK (char_length(note) <= 500),
  "adminId"         TEXT NOT NULL,
  "ratingSnapshot"  SMALLINT NOT NULL CHECK ("ratingSnapshot" BETWEEN 1 AND 5),
  "textSnapshot"    TEXT NOT NULL,
  at                TIMESTAMPTZ NOT NULL,
  -- ADD-§9.2: 'Other' requires an admin note of 10–500 characters.
  CONSTRAINT review_log_other_has_note CHECK ("reasonCode" <> 'Other' OR char_length(note) BETWEEN 10 AND 500)
);
CREATE INDEX IF NOT EXISTS review_log_by_time ON "ReviewModerationLog"(at);
