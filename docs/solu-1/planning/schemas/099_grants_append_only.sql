-- Migration: 099_grants_append_only.sql
-- Owner: shared-kernel (AD-SYS-8 rule 10, AD-REP-2 rule 3). Applied last.
-- The application connects as role tezg_app. Append-only tables cannot be
-- updated or deleted by it, and "Review" cannot be deleted (hide, never delete).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tezg_app') THEN
    CREATE ROLE tezg_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO tezg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tezg_app;
-- review E-18: tables created by later migrations get the same base grant;
-- every later migration that adds an append-only table adds its REVOKE here.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tezg_app;

-- Append-only: insert and read only.
REVOKE UPDATE, DELETE ON
  "ApplicationDecisionLog",
  "CatalogEntryRevision",
  "ReferencePriceObservation",
  "CommissionLedgerEntry",
  "CommissionRateSetting",
  "TradeOfferRound",
  "ReviewModerationLog",
  "OutboxEvent"
FROM tezg_app;

-- Hide, never delete (AD-12, NFR-REP-3).
REVOKE DELETE ON "Review", "Listing" FROM tezg_app;
