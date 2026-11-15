-- Migration: 002_fx_source_breaker.sql
-- Story 4.6 (decision log Impl-2 #31): the circuit breaker of the TRM source. 001 is never edited
-- in place (scripts/lib/migrations.mjs), so the table arrives in its own migration, with the
-- conventions of 001: every instant bound from the Clock port, no DEFAULT, "createdAt" and
-- "updatedAt" on a mutable table.

-- ===========================================================================
-- catalog — CAT (ARCH §6.3); the TRM source's circuit breaker (S-FR-CAT-8, NFR-CAT-4)
-- ===========================================================================

-- One row per outbound source the breaker guards; V1 has one, the FxRateSource port. Every
-- instance reads and moves the same row under SELECT … FOR UPDATE, so a job run and an admin
-- retry never both probe a half-open source, and no failure count is lost. No row reads as closed.
CREATE TABLE IF NOT EXISTS "FxSourceBreaker" (      -- mutable
  port                  TEXT PRIMARY KEY CHECK (port IN ('FxRateSource')),
  -- allowed: closed | open | halfOpen
  state                 TEXT NOT NULL CHECK (state IN ('closed', 'open', 'halfOpen')),
  "consecutiveFailures" INT  NOT NULL CHECK ("consecutiveFailures" >= 0),
  "openedAt"            TIMESTAMPTZ NULL,
  -- open: the end of the cool-down; halfOpen: the end of the probe's lease; closed: NULL
  "retryAt"             TIMESTAMPTZ NULL,
  "probeToken"          TEXT NULL,
  "createdAt"           TIMESTAMPTZ NOT NULL,
  "updatedAt"           TIMESTAMPTZ NOT NULL,
  CONSTRAINT fx_source_breaker_retry CHECK ((state = 'closed') = ("retryAt" IS NULL)),
  CONSTRAINT fx_source_breaker_opened CHECK ((state = 'closed') = ("openedAt" IS NULL)),
  CONSTRAINT fx_source_breaker_probe CHECK ((state = 'halfOpen') = ("probeToken" IS NOT NULL))
);

GRANT SELECT, INSERT, UPDATE ON "FxSourceBreaker" TO tezg_app;
