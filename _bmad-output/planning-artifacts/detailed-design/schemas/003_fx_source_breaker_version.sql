-- Migration: 003_fx_source_breaker_version.sql
-- Architecture audit F2 (decision log Impl-2 #34): the TRM source's breaker moves like every other state
-- machine (AD-SYS-5 rule 1, ARCHITECTURE §6): one conditional UPDATE on its from-state and version, which it
-- bumps, still under the SELECT … FOR UPDATE of AD-CAT-3 rule 7. 002 is never edited in place
-- (scripts/lib/migrations.mjs), so the column arrives here, with 001's convention for a version column.

-- ===========================================================================
-- catalog — CAT (ARCH §6.3); the TRM source's circuit breaker (S-FR-CAT-8, NFR-CAT-4)
-- ===========================================================================

-- Bumped by every transition; a transition whose from-state or version no longer matches moves 0 rows,
-- and the catalog service raises it instead of ignoring it.
ALTER TABLE "FxSourceBreaker" ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 0 CHECK (version >= 0);
