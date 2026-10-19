import type { Cop, CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { CardCondition, Condition } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';
import type { ReservationRefDTO } from './inv.dto.js';

// Solu-2 DTOs — INV, plus REP's listing moderation hosted in listings (contracts.md §5, §15).

export interface ListingSnapshotDTO {
  title: string;
  itemRef: CuidId | null;
  condition: Condition | null;
  unitPriceCop: Cop;
  components: { catalogEntryId: CuidId; perBundleQty: number }[] | null;
}

// INV-1 reserveForPurchase (called in the caller's tx)
export interface ReserveForPurchaseRequest { listingId: CuidId; qty: number; buyerId: CuidId }
export interface ReserveForPurchaseResponse {
  reservationRef: ReservationRefDTO;
  exhaustedListingIds: CuidId[];
  snapshot: ListingSnapshotDTO;
}

// INV-2 createListing
export interface CreateListingRequest {
  sellerId: CuidId;
  itemRef: CuidId;
  condition: Condition;
  priceCop: Cop;
  quantity: number;
  location: { lat: number; lng: number } | null;
  description: string;
  openToTrade: boolean;
}
export type ListingState = 'Active' | 'Unverified' | 'Paused';
export interface CreateListingResponse {
  listingId: CuidId;
  inventoryUnitId: CuidId;
  state: ListingState;
  availability: number;
  decision: ExplanationDTO;
}

// INV-3 applyCommissionProjection (subscriber)
export interface ApplyCommissionProjectionRequest {
  type: 'CommissionBalanceExhausted' | 'CommissionBalanceReplenished';
  businessId: CuidId;
  ledgerSeq: number;
  balanceAfter: number;
}
export interface ApplyCommissionProjectionResponse { applied: boolean; listingsChanged: number }

// S-FR-INV-2 createBundle
export interface CreateBundleRequest {
  sellerId: CuidId;
  title: string;
  priceCop: Cop;
  components: { itemRef: CuidId; condition: CardCondition; perBundleQty: number; quantity: number }[];
  location: { lat: number; lng: number } | null;
  description: string;
}
export interface CreateBundleResponse { listingId: CuidId; state: ListingState; availability: number; decision: ExplanationDTO }

// S-FR-INV-4 / S-FR-INV-10 listing detail and owner view
export interface ListingDetailDTO {
  listingId: CuidId;
  sellerId: CuidId;
  kind: 'single' | 'bundle';
  title: string;
  priceCop: Cop;
  availability: number;
  openToTrade: boolean;
  state: ListingState | 'Hidden' | 'Withdrawn' | 'Deactivated';
  decision: ExplanationDTO;
}
export interface GetListingRequest { listingId: CuidId; actorId: CuidId | null }
export type GetListingResponse = ListingDetailDTO;
export interface ListMyListingsRequest { sellerId: CuidId; cursor: string | null }
export interface ListMyListingsResponse { items: ListingDetailDTO[]; nextCursor: string | null }

// S-FR-INV-5 releaseReservation (called in the caller's tx)
export interface ReleaseReservationRequest { reservationRef: ReservationRefDTO }
export interface ReleaseReservationResponse { releasedUnits: number }

// S-FR-INV-8 application-decision subscriber
export interface ApplyApplicationDecisionRequest {
  type: 'BusinessApplicationApproved' | 'BusinessApplicationRejected';
  applicationId: CuidId;
  businessId: CuidId;
  decidedAt: IsoInstant;
}
export interface ApplyApplicationDecisionResponse { applied: boolean; ignored: boolean; listingsChanged: number }

// S-FR-INV-9 edit / restock / deactivate / reactivate
export interface UpdateListingRequest {
  actorId: CuidId;
  listingId: CuidId;
  expectedVersion: number;
  changes: { priceCop?: Cop; description?: string; openToTrade?: boolean };
}
export interface RestockListingRequest { actorId: CuidId; listingId: CuidId; delta: number }
export interface SetListingActiveRequest { actorId: CuidId; listingId: CuidId; active: boolean }
export interface ListingChangeResponse { listingId: CuidId; version: number; availability: number; decision: ExplanationDTO }

// S-FR-REP-5 listing hide / unhide (listings host)
export type ListingHideReason = 'Counterfeit' | 'ProhibitedItem' | 'MisleadingListing' | 'PersonalData' | 'Spam' | 'Other';
export interface SetListingHiddenRequest {
  adminId: CuidId;
  listingId: CuidId;
  hidden: boolean;
  reasonCode: ListingHideReason;
  note: string | null;
}
export interface SetListingHiddenResponse { decision: ExplanationDTO }

// S-FR-REP-6 listing moderation log
export interface ListListingModerationLogRequest { adminId: CuidId; cursor: string | null; reasonCode?: ListingHideReason }
export interface ListingModerationLogRow {
  logId: CuidId;
  listingId: CuidId;
  action: 'hide' | 'unhide';
  reasonCode: ListingHideReason;
  adminId: CuidId;
  titleSnapshot: string;
  at: IsoInstant;
}
export interface ListListingModerationLogResponse { rows: ListingModerationLogRow[]; nextCursor: string | null }

// Offered ports (contracts.md §15.11)
export interface GetListingForPurchaseRequest { listingId: CuidId }
export interface GetListingForPurchaseResponse { sellerId: CuidId; kind: 'single' | 'bundle'; visible: true }
export interface ReserveForTradeRequest { listingId: CuidId; qty: 1 }
export interface ReserveForTradeResponse { reservationRef: ReservationRefDTO; exhaustedListingIds: CuidId[] }
export interface GetTradeabilityRequest { listingId: CuidId }
export interface GetTradeabilityResponse { sellerId: CuidId; availability: number; decision: ExplanationDTO }
export interface GetInventoryUnitIdsRequest { listingId: CuidId }
export interface GetInventoryUnitIdsResponse { unitIds: CuidId[] }
export interface GetAvailabilitySummaryRequest { catalogEntryIds: CuidId[]; area: { lat: number; lng: number; radiusKm: number } | null }
export interface GetAvailabilitySummaryResponse { items: { catalogEntryId: CuidId; lowestPriceCop: Cop | null; availableCount: number }[] }
