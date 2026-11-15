import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { OfferFacts } from '../domain/trd.js';
import type { ContactHandoffDTO, OpenOfferDTO, TradeReservationRefDTO } from '../dto/trd.dto.js';

// Outbound ports — TRD.

/** Neighbour port: listings' offered trade surface (AD-4, AD-6, AD-MSG-1). */
export interface ListingsForTrading {
  /** Throws the listings-owned refusal (ListingNotOpenToTrade, ListingNotFound, …) unchanged. */
  getTradeability(listingId: CuidId): Promise<{ sellerId: CuidId; availability: number }>;
  /** Throws InsufficientQuantity (owner listings) when the unit is gone. */
  reserveForTrade(tx: Tx, listingId: CuidId, qty: 1): Promise<{ reservationRef: TradeReservationRefDTO; exhaustedListingIds: CuidId[] }>;
  generateContactMessage(input: { kind: 'trade'; listingId: CuidId; requesterId: CuidId; tradeSummary: string }): Promise<ContactHandoffDTO>;
}

export interface ITradeOfferRepository {
  /** pg_advisory_xact_lock(hashtextextended('trd:seller:' || sellerId, 0)) — AD-TRD-2 rule 1. */
  lockSeller(tx: Tx, sellerId: CuidId): Promise<void>;
  facts(offerId: CuidId): Promise<(OfferFacts & { listingId: CuidId; version: number }) | null>;
  /** AD-TRD-1 rule 1 for accept. Returns the affected-row count. */
  acceptConditionally(tx: Tx, offerId: CuidId, version: number, now: Date): Promise<0 | 1>;
  storeReservation(tx: Tx, offerId: CuidId, ref: TradeReservationRefDTO): Promise<void>;
  /** AD-TRD-2 rule 2 step 6; returns the ids marked. */
  markSiblingsUnfulfillable(tx: Tx, exhaustedListingIds: readonly CuidId[], exceptOfferId: CuidId, now: Date): Promise<CuidId[]>;
  markOwnUnfulfillable(tx: Tx, offerId: CuidId, now: Date): Promise<void>;
  findOpen(listingId: CuidId, proposerId: CuidId, now: Date): Promise<OpenOfferDTO | null>;
}
