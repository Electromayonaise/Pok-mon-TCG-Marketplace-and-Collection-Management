-- Migration: 007_create_trading.sql
-- Owner: trading (TRD). Contracts: assertActorTurn, acceptOffer, findOpenOffer
-- (contracts.md §8).

CREATE TABLE IF NOT EXISTS "TradeOffer" (
  id                     TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "listingId"            TEXT NOT NULL,       -- listings id; no cross-module FK (AD-8)
  "sellerId"             TEXT NOT NULL,
  "proposerId"           TEXT NOT NULL,
  -- allowed: ADD-§4.3 states
  status                 TEXT NOT NULL CHECK (status IN (
                           'Open', 'Accepted', 'Rejected', 'Withdrawn', 'Expired', 'Unfulfillable', 'Cancelled')),
  -- allowed: proposer | seller — whose move it is while Open
  turn                   TEXT NOT NULL CHECK (turn IN ('proposer', 'seller')),
  -- Counts offer and counter rounds only. accept, reject, withdraw, cancel and
  -- markedUnfulfillable rounds take max(round) + 1 in TradeOfferRound and never
  -- increment it (review E-10), so marking a sibling at 10 rounds cannot breach this CHECK.
  "roundCount"           INT  NOT NULL CHECK ("roundCount" BETWEEN 1 AND 10),
  version                INT  NOT NULL DEFAULT 0 CHECK (version >= 0),
  "reservationRef"       JSONB NULL,
  -- allowed: ListingNoLongerAvailable (FR-TRD-5)
  "unfulfillableReason"  TEXT NULL CHECK ("unfulfillableReason" IN ('ListingNoLongerAvailable')),
  "proposerConfirmedAt"  TIMESTAMPTZ NULL,
  "sellerConfirmedAt"    TIMESTAMPTZ NULL,
  "cancelledBy"          TEXT NULL,
  "acceptedAt"           TIMESTAMPTZ NULL,
  "expiresAt"            TIMESTAMPTZ NOT NULL,   -- createdAt + 7 days (ADD-§9.3)
  "createdAt"            TIMESTAMPTZ NOT NULL,
  CONSTRAINT trade_offer_no_self_trade CHECK ("proposerId" <> "sellerId"),
  -- Invariant (AD-TRD-3): only an Accepted or Cancelled offer ever held a reservation,
  -- and an Accepted one always holds it.
  CONSTRAINT trade_offer_reservation_states CHECK (status IN ('Accepted', 'Cancelled') OR "reservationRef" IS NULL),
  CONSTRAINT trade_offer_accepted_has_reservation CHECK (status <> 'Accepted' OR "reservationRef" IS NOT NULL),
  CONSTRAINT trade_offer_accepted_instant CHECK (("acceptedAt" IS NOT NULL) = (status IN ('Accepted', 'Cancelled'))),
  CONSTRAINT trade_offer_unfulfillable_reason CHECK ((status = 'Unfulfillable') = ("unfulfillableReason" IS NOT NULL)),
  -- Completion facts exist only on an accepted trade; a cancel requires neither (AD-TRD-3 rule 3).
  CONSTRAINT trade_offer_confirmations_on_accepted
    CHECK (("proposerConfirmedAt" IS NULL AND "sellerConfirmedAt" IS NULL) OR status = 'Accepted'),
  CONSTRAINT trade_offer_cancel_actor CHECK ((status = 'Cancelled') = ("cancelledBy" IS NOT NULL)),
  -- review E-11: an offer is never born expired.
  CONSTRAINT trade_offer_expiry_after_creation CHECK ("expiresAt" > "createdAt")
);
-- Invariant (AD-TRD-1 rule 6): one live offer per proposer and listing.
CREATE UNIQUE INDEX IF NOT EXISTS trade_offer_one_open_per_proposer
  ON "TradeOffer"("listingId", "proposerId") WHERE status = 'Open';
CREATE INDEX IF NOT EXISTS trade_offer_by_listing ON "TradeOffer"("listingId", status);
CREATE INDEX IF NOT EXISTS trade_offer_by_seller ON "TradeOffer"("sellerId", status);

CREATE TABLE IF NOT EXISTS "TradeOfferRound" (   -- immutable
  "offerId"   TEXT NOT NULL REFERENCES "TradeOffer"(id),
  round       INT  NOT NULL CHECK (round >= 1),
  -- allowed: proposer | seller (ARCH §6.8). A markedUnfulfillable round carries
  -- actor='seller': the seller's accept on a sibling offer is what marks it.
  actor       TEXT NOT NULL CHECK (actor IN ('proposer', 'seller')),
  action      TEXT NOT NULL CHECK (action IN (
                'offer', 'counter', 'accept', 'reject', 'withdraw', 'markedUnfulfillable', 'cancel')),
  terms       JSONB NULL,          -- { offeredItems[], cashCop, requestedQty: 1 } on offer/counter
  note        TEXT NULL CHECK (char_length(note) <= 300),
  at          TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("offerId", round),
  CONSTRAINT trade_round_terms_on_proposals CHECK ((action IN ('offer', 'counter')) = (terms IS NOT NULL))
);
