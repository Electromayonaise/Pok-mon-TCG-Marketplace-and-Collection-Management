import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { Area, RankKey } from '../domain/dsc.js';
import type { PurchasabilityFacts } from '../domain/inv.js';
import type { AvailabilitySummaryRowDTO, ReservationRefDTO, ReservationSnapshotDTO } from '../dto/inv.dto.js';

// Outbound ports — listings (INV, DSC).

/** Neighbour port: identity's offered queries (AD-1 edge listings → identity). */
export interface IdentityForListings {
  getSellerVerification(sellerId: CuidId): Promise<{ status: 'Approved' | 'Pending' | 'Rejected' | 'none' }>;
  getSellerKinds(userIds: readonly CuidId[]): Promise<{ userId: CuidId; sellerKind: 'business' | 'individual' | 'none'; verified: boolean }[]>;
}

/** Neighbour port: catalog's offered queries (AD-1 edge listings → catalog). */
export interface CatalogForListings {
  matchEntryIds(filters: object): Promise<{ ids: CuidId[] } | 'tooBroad'>;
  getEntry(id: CuidId): Promise<{ id: CuidId; name: string; setId: CuidId; number: string; kind: 'card' | 'sealedProduct' }>;
  getPriceProvenance(ids: readonly CuidId[], period: 7 | 30 | 90): Promise<Map<CuidId, unknown>>;
}

export interface IListingRepository {
  ownershipFacts(listingId: CuidId): Promise<{ sellerId: CuidId; hiddenAt: Date | null; withdrawnAt: Date | null; deactivatedAt: Date | null } | null>;
  purchaseFacts(tx: Tx, listingId: CuidId): Promise<(Omit<PurchasabilityFacts, 'verification'> & { sellerId: CuidId; kind: 'single' | 'bundle' }) | null>;
}

export interface IInventoryUnitRepository {
  /** Units of a listing in ascending id order with the required decrement per unit. */
  unitsFor(tx: Tx, listingId: CuidId, qty: number): Promise<{ inventoryUnitId: CuidId; required: number }[]>;
  /** AD-INV-2 rule 3: UPDATE … SET quantity = quantity − :req WHERE id AND quantity >= :req RETURNING quantity. */
  decrementConditionally(tx: Tx, inventoryUnitId: CuidId, required: number): Promise<{ applied: true; quantity: number } | { applied: false; available: number }>;
  exhaustedListingIds(tx: Tx, unitIds: readonly CuidId[]): Promise<CuidId[]>;
  snapshot(tx: Tx, listingId: CuidId): Promise<ReservationSnapshotDTO>;
}

export interface IDiscoveryQuery {
  /** AD-DSC-1: the one SQL path for both seller kinds and both views. */
  searchListings(input: { catalogEntryIds: CuidId[] | null; area: Area | null; maxPriceCop: number | null; condition: string[] | null; includeSoldOut: boolean; offset: number; limit: number }): Promise<{ rows: (RankKey & { sellerId: CuidId; catalogEntryIds: CuidId[]; sellerKindAtCreation: 'business' | 'individual'; pausedAt: Date | null })[]; unusableLocation: number }>;
  availabilitySummary(catalogEntryIds: readonly CuidId[], area: Area | null): Promise<(AvailabilitySummaryRowDTO & { businessSellerIds: CuidId[] })[]>;
}

export type { ReservationRefDTO };
