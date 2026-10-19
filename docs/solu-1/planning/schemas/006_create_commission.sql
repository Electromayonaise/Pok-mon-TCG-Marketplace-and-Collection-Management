-- Migration: 006_create_commission.sql
-- Owner: commission (COM). Contracts: assertTopUpVisible, applyOrderDeduction,
-- findCommissionAccount (contracts.md §7).

CREATE TABLE IF NOT EXISTS "CommissionAccount" (
  "businessId"   TEXT PRIMARY KEY,           -- identity id; opened once (AD-COM-1 rule 5)
  "balanceCop"   BIGINT NOT NULL,            -- may be negative (AD-19)
  -- allowed: Funded | Exhausted (ADD-§4.4)
  state          TEXT NOT NULL CHECK (state IN ('Funded', 'Exhausted')),
  "ledgerSeq"    BIGINT NOT NULL CHECK ("ledgerSeq" >= 0),
  version        INT NOT NULL DEFAULT 0 CHECK (version >= 0),
  "openedAt"     TIMESTAMPTZ NOT NULL,       -- creation instant (template created_at)
  -- Invariant (AD-COM-1): the state is a function of the balance, never stored apart from it.
  CONSTRAINT commission_account_state_matches_balance CHECK ((state = 'Funded') = ("balanceCop" > 0))
);

CREATE TABLE IF NOT EXISTS "TopUpRequest" (
  id                    TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "businessId"          TEXT NOT NULL,       -- no FK: Plan-2 does not fix whether a request may precede the account
  "amountCop"           BIGINT NOT NULL CHECK ("amountCop" BETWEEN 20000 AND 10000000),
  "transferReference"   TEXT NOT NULL CHECK (char_length("transferReference") BETWEEN 4 AND 40),
  "proofObjectKey"      TEXT NOT NULL,       -- regulated (AD-SYS-8)
  -- allowed: Pending | Confirmed | Rejected
  status                TEXT NOT NULL CHECK (status IN ('Pending', 'Confirmed', 'Rejected')),
  "rejectionReason"     TEXT NULL,
  "decidedBy"           TEXT NULL,
  "decidedAt"           TIMESTAMPTZ NULL,
  version               INT NOT NULL DEFAULT 0 CHECK (version >= 0),
  "submittedAt"         TIMESTAMPTZ NOT NULL,  -- creation instant
  CONSTRAINT top_up_pending_iff_undecided CHECK ((status = 'Pending') = ("decidedAt" IS NULL)),
  CONSTRAINT top_up_decided_has_admin CHECK ((status = 'Pending') = ("decidedBy" IS NULL)),
  CONSTRAINT top_up_rejection_has_reason CHECK ((status = 'Rejected') = ("rejectionReason" IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS top_up_queue ON "TopUpRequest"(status, "submittedAt");

CREATE TABLE IF NOT EXISTS "CommissionLedgerEntry" (    -- append-only (AD-SYS-8 rule 10)
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
  at                        TIMESTAMPTZ NOT NULL,
  -- Invariant (AD-COM-1 rule 2): seqs are unique per business (gapless is checked by reconcile).
  CONSTRAINT ledger_seq_unique UNIQUE ("businessId", seq),
  -- A top-up credits a positive amount; a zero-amount deduction is allowed (AD-COM-2 rule 4).
  CONSTRAINT ledger_topup_positive CHECK (kind = 'Deduction' OR "amountCop" > 0),
  CONSTRAINT ledger_deduction_has_order CHECK ((kind = 'Deduction') = ("orderId" IS NOT NULL)),
  CONSTRAINT ledger_topup_has_request CHECK ((kind = 'TopUp') = ("topUpRequestId" IS NOT NULL)),
  CONSTRAINT ledger_deduction_priced
    CHECK (kind <> 'Deduction'
           OR ("rateBps" IS NOT NULL AND "baseCop" IS NOT NULL AND trigger IS NOT NULL
               AND "commissionTriggeredAt" IS NOT NULL)),
  -- Invariant (ADD-§2.6, AD-COM-2 rule 1): the charged amount IS the rounding rule,
  -- floor((base x bps + 5000) / 10000), enforced physically on every deduction row.
  CONSTRAINT ledger_deduction_rounding_rule
    CHECK (kind <> 'Deduction' OR "amountCop" = ("baseCop" * "rateBps" + 5000) / 10000)
);
-- Invariant (AD-COM-2, AD-SYS-3 rule 3): exactly one deduction per order.
CREATE UNIQUE INDEX IF NOT EXISTS ledger_one_deduction_per_order
  ON "CommissionLedgerEntry"("orderId") WHERE kind = 'Deduction';
-- One credit per confirmed top-up.
CREATE UNIQUE INDEX IF NOT EXISTS ledger_one_credit_per_top_up
  ON "CommissionLedgerEntry"("topUpRequestId") WHERE kind = 'TopUp';

CREATE TABLE IF NOT EXISTS "CommissionRateSetting" (    -- append-only (AD-SYS-8 rule 10)
  id                TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "rateBps"         INT NOT NULL CHECK ("rateBps" BETWEEN 0 AND 10000),
  "effectiveFrom"   TIMESTAMPTZ NOT NULL UNIQUE,
  "setBy"           TEXT NULL,                          -- null only for the migration seed row
  "setAt"           TIMESTAMPTZ NOT NULL
);

-- Seed row (AD-COM-2 rule 6, A-24): the rate lookup always finds a row.
-- The instants are fixed literals, not the wall clock (AD-SYS-6).
INSERT INTO "CommissionRateSetting" (id, "rateBps", "effectiveFrom", "setBy", "setAt")
VALUES ('seedrate0000000000000001', 800, '1970-01-01T00:00:00Z', NULL, '1970-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;
