import type { Condition, Cop, CuidId } from '../../../shared-kernel/types.js';
import type { SearchAreaDTO } from './inv.dto.js';

export type { SearchAreaDTO };

// DTOs — DSC (contracts.md §4). Primitive fields only.

// assertSearchArea
export type AssertSearchAreaRequestDTO = SearchAreaDTO;

// search (view = 'listings'; FR-DSC-1's 'entries' view is outside this contract, review F-18)
export interface CatalogFiltersDTO {
  setIds?: CuidId[];
  eraCodes?: string[];
  pokemon?: string[];
  colours?: string[];
  styles?: string[];
  artists?: string[];
}
export interface SearchRequestDTO {
  view: 'listings';
  /** Present when the buyer filters by catalog attributes (FR-CAT-1). */
  catalogFilters?: CatalogFiltersDTO;
  /** Present when the buyer searches near a point. */
  area?: SearchAreaDTO;
  /** Present when the buyer caps the price. */
  maxPriceCop?: Cop;
  /** Present when the buyer filters conditions. */
  condition?: Condition[];
  /** Present and true to keep only purchasable business listings. */
  purchasableOnly?: boolean;
  /** Present and true to include sold-out rows, ranked last (default false). */
  includeSoldOut?: boolean;
  /** Integer 1..417 (⌈10,000 seeded listings / 24⌉, review E-19). */
  page: number;
  pageSize: 24;
}
export interface SearchRowDTO {
  listingId: CuidId;
  catalogEntryIds: CuidId[];
  priceCop: Cop;
  /** null without an area, or for an unusable location ranked last. */
  distanceKm: number | null;
  sellerKind: 'business' | 'individual';
  verified: boolean;
  /** Derived per request: sellerKind = 'individual' (AD-DSC-2 rule 3). */
  pickupAvailable: boolean;
  purchasable: boolean;
  explanation: string;
}
export interface SearchResponseDTO {
  results: SearchRowDTO[];
  excluded: { unusableLocation: number };
}

// getCardDetail
export interface GetCardDetailRequestDTO {
  catalogEntryId: CuidId;
  /** Present when the detail is filtered to nearby listings. */
  area?: SearchAreaDTO;
}
export interface CardDetailResponseDTO {
  entry: { id: CuidId; name: string; setId: CuidId; number: string; kind: 'card' | 'sealedProduct' };
  /** catalog.getPriceProvenance output for the entry (FR-CAT-6), passed through unchanged. */
  provenance: {
    lastTransactionReference: { usdCents: number | null; cop: number; observedAt: string; source: string } | null;
    trend: { period: 7 | 30 | 90; changePercentHundredths: number | null; referencePriceAtStart: number | null };
    freshness: 'fresh' | 'stale';
  };
  /** null when no listing survives the filters. */
  listingPriceCop: Cop | null;
  hasActiveListings: boolean;
  listings: SearchRowDTO[];
}
