import type { Condition, Cop, CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';
import type { ContactMessageDTO, ReservationRefDTO } from '../../listings/index.js';
import type { OfferRole, OfferStatus } from '../domain/trd.js';

// Solu-2 DTOs — TRD (contracts.md §8, §15). trading reads listings' public types (AD-1).

export interface TradeTermsDTO {
  offeredItems: { itemRef: CuidId; condition: Condition; qty: number }[];
  cashCop: Cop;
  requestedQty: 1;
}

// TRD-1 acceptOffer
export interface AcceptOfferRequest { offerId: CuidId; expectedVersion: number; sellerId: CuidId }
export interface AcceptOfferResponse {
  offerId: CuidId;
  status: 'Accepted';
  reservationRef: ReservationRefDTO;
  unfulfillableOfferIds: CuidId[];
  handoff: ContactMessageDTO | null;
  decision: ExplanationDTO;
}

// TRD-2 counterOffer
export interface CounterOfferRequest { offerId: CuidId; terms: TradeTermsDTO; expectedVersion: number; actorId: CuidId }
export interface CounterOfferResponse { offerId: CuidId; version: number; turn: OfferRole; roundCount: number; decision: ExplanationDTO }

// TRD-3 cancelTrade
export interface CancelTradeRequest { offerId: CuidId; actorId: CuidId }
export interface CancelTradeResponse { offerId: CuidId; status: 'Cancelled'; cancelledBy: CuidId; decision: ExplanationDTO }

// S-FR-TRD-1 make offer
export interface MakeOfferRequest { listingId: CuidId; terms: TradeTermsDTO; proposerId: CuidId }
export interface MakeOfferResponse { offerId: CuidId; status: 'Open'; turn: 'seller'; version: number; expiresAt: IsoInstant; decision: ExplanationDTO }

// S-FR-TRD-2w reject / withdraw
export interface ResolveOfferRequest { offerId: CuidId; expectedVersion: number; actorId: CuidId; action: 'reject' | 'withdraw' }
export interface ResolveOfferResponse { offerId: CuidId; status: 'Rejected' | 'Withdrawn'; decision: ExplanationDTO }

// S-FR-TRD-3 reads
export interface OfferRoundDTO { round: number; actor: OfferRole; action: string; terms: TradeTermsDTO | null; at: IsoInstant }
export interface OfferViewDTO {
  offerId: CuidId;
  listingId: CuidId;
  status: OfferStatus;
  turn: OfferRole;
  version: number;
  roundCount: number;
  expiresAt: IsoInstant;
  rounds: OfferRoundDTO[];
  decision: ExplanationDTO;
}
export interface GetOfferRequest { offerId: CuidId; actorId: CuidId }
export type GetOfferResponse = OfferViewDTO;
export interface GetHandoffRequest { offerId: CuidId; actorId: CuidId }
export type GetHandoffResponse = ContactMessageDTO;

// S-FR-TRD-7 confirm completion
export interface ConfirmCompletionRequest { offerId: CuidId; actorId: CuidId }
export interface ConfirmCompletionResponse { offerId: CuidId; completed: boolean; confirmedAt: IsoInstant; decision: ExplanationDTO }

// S-FR-TRD-9 expiry materialization (job)
export interface ExpireDueOffersRequest { trigger: 'tick' | 'daily-morning' | 'daily-night' }
export interface ExpireDueOffersResponse { expired: number }
