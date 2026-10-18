-- Migration: 005_create_orders.sql
-- Owner: orders (ORD). Contracts: assertOrderVisible, confirmPaid,
-- hasClosedPurchase (contracts.md §6).

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
  -- The three independent confirmation facts (AD-2). No status, balance or escrow column exists.
  "buyerPaidConfirmedAt"            TIMESTAMPTZ NULL,
  "sellerReceivedConfirmedAt"       TIMESTAMPTZ NULL,
  "buyerItemReceivedConfirmedAt"    TIMESTAMPTZ NULL,
  "cancelledAt"                     TIMESTAMPTZ NULL,
  "cancelReason"                    TEXT NULL,
  "expiredAt"                       TIMESTAMPTZ NULL,
  "expiresAt"                       TIMESTAMPTZ NOT NULL,  -- createdAt + unpaidOrderTtl (48 h)
  version                           INT NOT NULL DEFAULT 0 CHECK (version >= 0),
  "createdAt"                       TIMESTAMPTZ NOT NULL,
  CONSTRAINT order_total_exact CHECK ("totalCop" = "unitPriceCop" * qty),
  CONSTRAINT order_no_self_purchase CHECK ("buyerId" <> "businessId"),
  CONSTRAINT order_expiry_after_creation CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT order_comprobante_pair CHECK (("comprobanteObjectKey" IS NULL) = ("comprobanteUploadedAt" IS NULL)),
  -- Invariant (FR-ORD-3): "paid" requires a comprobante, physically.
  CONSTRAINT order_paid_requires_comprobante
    CHECK ("buyerPaidConfirmedAt" IS NULL OR "comprobanteObjectKey" IS NOT NULL),
  -- Invariants (AD-2, FR-ORD-6): the three unreachable fact combinations.
  CONSTRAINT order_seller_after_paid
    CHECK ("sellerReceivedConfirmedAt" IS NULL OR "buyerPaidConfirmedAt" IS NOT NULL),
  CONSTRAINT order_item_after_paid
    CHECK ("buyerItemReceivedConfirmedAt" IS NULL OR "buyerPaidConfirmedAt" IS NOT NULL),
  CONSTRAINT order_not_cancelled_and_expired
    CHECK (NOT ("cancelledAt" IS NOT NULL AND "expiredAt" IS NOT NULL)),
  -- Invariant (AD-ORD-2): a paid order is never cancelled or expired.
  CONSTRAINT order_paid_never_terminated
    CHECK (("cancelledAt" IS NULL AND "expiredAt" IS NULL) OR "buyerPaidConfirmedAt" IS NULL),
  -- An expiry always records the reason 'Unpaid' (AD-ORD-2 rule 6).
  CONSTRAINT order_expiry_reason CHECK ("expiredAt" IS NULL OR "cancelReason" = 'Unpaid'),
  -- review E-07: a reason exists only on a terminated order.
  CONSTRAINT order_reason_iff_terminated
    CHECK (("cancelReason" IS NULL) = ("cancelledAt" IS NULL AND "expiredAt" IS NULL)),
  -- review E-08: the facts are ordered in time, not only in presence.
  CONSTRAINT order_seller_not_before_paid
    CHECK ("sellerReceivedConfirmedAt" IS NULL OR "sellerReceivedConfirmedAt" >= "buyerPaidConfirmedAt"),
  CONSTRAINT order_item_not_before_paid
    CHECK ("buyerItemReceivedConfirmedAt" IS NULL OR "buyerItemReceivedConfirmedAt" >= "buyerPaidConfirmedAt"),
  CONSTRAINT order_comprobante_not_after_paid
    CHECK ("buyerPaidConfirmedAt" IS NULL OR "comprobanteUploadedAt" <= "buyerPaidConfirmedAt"),
  -- review E-09: reservedUnitIds lists exactly the units of reservationRef.
  CONSTRAINT order_reserved_units_match_ref
    CHECK (cardinality("reservedUnitIds") = jsonb_array_length("reservationRef"->'units'))
);
CREATE INDEX IF NOT EXISTS order_by_buyer ON "Order"("buyerId", "createdAt");
CREATE INDEX IF NOT EXISTS order_by_business_paid ON "Order"("businessId", "buyerPaidConfirmedAt");
-- Expiry materialization scan (AD-ORD-2 rule 7).
CREATE INDEX IF NOT EXISTS order_open_by_expiry
  ON "Order"("expiresAt") WHERE "buyerPaidConfirmedAt" IS NULL AND "cancelledAt" IS NULL AND "expiredAt" IS NULL;
CREATE INDEX IF NOT EXISTS order_reserved_units ON "Order" USING gin ("reservedUnitIds");
-- hasClosedPurchase (AD-ORD-3 rule 4).
CREATE INDEX IF NOT EXISTS order_closed_by_pair
  ON "Order"("buyerId", "businessId") WHERE "buyerItemReceivedConfirmedAt" IS NOT NULL;
