import type { Cop, CuidId } from '../../../shared-kernel/types.js';
import type { Condition } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';
import type { CatalogEntryDTO, CatalogFilters, PriceProvenanceDTO } from '../../catalog/index.js';

// Solu-2 DTOs — DSC (contracts.md §4). listings consumes catalog's public types (AD-1).

export interface SearchArea { lat: number; lng: number; radiusKm: number }

// DSC-3 assertSearchArea (pure)
export interface AssertSearchAreaRequest { area: SearchArea }

// DSC-1 search
export interface SearchRequest {
  view: 'listings';
  catalogFilters?: CatalogFilters;
  area?: SearchArea;
  maxPriceCop?: Cop;
  condition?: Condition[];
  purchasableOnly?: boolean;
  includeSoldOut?: boolean;
  page: number;
  pageSize: 24;
}
export interface SearchRow {
  listingId: CuidId;
  catalogEntryIds: CuidId[];
  priceCop: Cop;
  distanceKm: number | null;
  sellerKind: 'business' | 'individual';
  verified: boolean;
  pickupAvailable: boolean;
  purchasable: boolean;
  explanation: ExplanationDTO;
}
export interface SearchResponse {
  results: SearchRow[];
  excluded: { unusableLocation: number };
  decision: ExplanationDTO;
}

// DSC-2 getCardDetail
export interface GetCardDetailRequest { catalogEntryId: CuidId; area: SearchArea | null }
export interface GetCardDetailResponse {
  entry: CatalogEntryDTO;
  provenance: PriceProvenanceDTO;
  listingPriceCop: Cop | null;
  hasActiveListings: boolean;
  listings: SearchRow[];
  excluded: { unusableLocation: number };
}
