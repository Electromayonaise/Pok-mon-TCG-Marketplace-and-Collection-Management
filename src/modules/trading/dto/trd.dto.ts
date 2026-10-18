import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { OfferRole } from '../domain/trd.js';

export type { OfferRole };

// DTOs — TRD (contracts.md §8). Primitive fields only.

// assertActorTurn
export interface AssertActorTurnRequestDTO {
  offerId: CuidId;
  actorId: CuidId;
}
export interface AssertActorTurnResponseDTO {
  role: OfferRole;
  version: number;
}

// acceptOffer
export interface AcceptOfferRequestDTO {
  offerId: CuidId;
  sellerId: CuidId;
  /** The offer version the seller's page last read (optimistic predicate, AD-TRD-1 rule 1). */
  version: number;
}
export interface TradeReservationRefDTO {
  listingId: CuidId;
  units: { inventoryUnitId: CuidId; qty: number }[];
}
export interface ContactHandoffDTO {
  text: string;
  /** https://wa.me/<E164>?text=… — built, never called (AD-MSG-1). */
  externalUrl: string;
  copyText: string;
}
export interface AcceptOfferResponseDTO {
  offerId: CuidId;
  status: 'Accepted';
  reservationRef: TradeReservationRefDTO;
  /** Sibling offers moved Open → Unfulfillable by this accept (FR-TRD-5). */
  unfulfillableOfferIds: CuidId[];
  /** null when the post-commit handoff failed; 8.2 regenerates it (review F-14). */
  handoff: ContactHandoffDTO | null;
}

// findOpenOffer
export interface FindOpenOfferRequestDTO {
  listingId: CuidId;
  proposerId: CuidId;
}
export interface OpenOfferDTO {
  offerId: CuidId;
  version: number;
  turn: OfferRole;
  expiresAt: IsoInstant;
}
/** null when no live Open offer exists (silent; expiry not materialized). */
export type FindOpenOfferResponseDTO = OpenOfferDTO | null;
