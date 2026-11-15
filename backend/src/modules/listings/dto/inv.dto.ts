import type { Condition, Cop, CuidId } from '../../../shared-kernel/types.js';

// DTOs — INV (contracts.md §5). Primitive fields only.

// assertListingOwner
export interface AssertListingOwnerRequestDTO {
  listingId: CuidId;
  actorId: CuidId;
}
export interface AssertListingOwnerResponseDTO {
  sellerId: CuidId;
  /** ISO instant when the listing is hidden; null when visible. */
  hiddenAt: string | null;
}

// reserveForPurchase
export interface ReserveForPurchaseRequestDTO {
  listingId: CuidId;
  /** Integer ≥ 1. */
  qty: number;
  buyerId: CuidId;
}
export interface ReservationRefDTO {
  listingId: CuidId;
  /** Ascending inventoryUnitId order (AD-INV-2 rule 3). */
  units: { inventoryUnitId: CuidId; qty: number }[];
}
export interface ReservationSnapshotDTO {
  title: string;
  /** The catalog entry id of a single listing; null for a bundle. */
  itemRef: CuidId | null;
  /** The unit's condition for a single listing; null for a bundle. */
  condition: Condition | null;
  unitPriceCop: Cop;
  /** Present for a bundle; null for a single listing. */
  components: { catalogEntryId: CuidId; perBundleQty: number }[] | null;
}
export interface ReserveForPurchaseResponseDTO {
  reservationRef: ReservationRefDTO;
  exhaustedListingIds: CuidId[];
  snapshot: ReservationSnapshotDTO;
}

// getAvailabilitySummary
export interface SearchAreaDTO {
  lat: number;
  lng: number;
  /** 1–300 km. */
  radiusKm: number;
}
export interface GetAvailabilitySummaryRequestDTO {
  /** 1–500 distinct ids; duplicates are refused by the parser (review E-22). */
  catalogEntryIds: CuidId[];
  /** Present when availability is restricted to listings near the caller. */
  area?: SearchAreaDTO;
}
export interface AvailabilitySummaryRowDTO {
  catalogEntryId: CuidId;
  /** null when availableCount = 0. */
  lowestPriceCop: Cop | null;
  availableCount: number;
}
/** Exactly one row per requested id, in request order. */
export type GetAvailabilitySummaryResponseDTO = AvailabilitySummaryRowDTO[];
