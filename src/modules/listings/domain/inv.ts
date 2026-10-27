// Core domain — INV. Pure (AD-SYS-6).
import { COLOMBIA_BBOX } from '../../../shared-kernel/types.js';

export type ListingKind = 'single' | 'bundle';
export type VerificationStatus = 'Approved' | 'Pending' | 'Rejected' | 'none';
/** AD-INV-3 rule 3: the business's commission projection as a listing sees it. */
export type ProjectionState = 'absent' | 'paused' | 'funded';

export interface PurchasabilityFacts {
  sellerKindAtCreation: 'business' | 'individual';
  verification: VerificationStatus;
  pausedAt: Date | null;
  hiddenAt: Date | null;
  withdrawnAt: Date | null;
  deactivatedAt: Date | null;
  availability: number;
  /** Absent means paused (AD-3); omitted by the Solu-1 port, which predates the projection. */
  projection?: ProjectionState;
}

/**
 * AD-INV-3 rule 1: the one TypeScript predicate for purchasability.
 * 'purchasable' or the DecisionCode / state that blocks it, in the order a reserve checks them.
 */
export function purchasable(
  facts: PurchasabilityFacts,
): 'purchasable' | 'ListingUnverified' | 'ListingPausedBalanceExhausted' | 'NotVisible' | 'SoldOut' | 'IndividualListing' {
  if (facts.hiddenAt !== null || facts.withdrawnAt !== null || facts.deactivatedAt !== null) return 'NotVisible';
  if (facts.sellerKindAtCreation === 'individual') return 'IndividualListing';
  if (facts.verification !== 'Approved') return 'ListingUnverified';
  if (facts.pausedAt !== null || (facts.projection ?? 'funded') !== 'funded') return 'ListingPausedBalanceExhausted';
  if (facts.availability < 1) return 'SoldOut';
  return 'purchasable';
}

/** AD-INV-1 rule 2: single → quantity; bundle → min(floor(quantity / perBundleQty)). */
export function availability(kind: ListingKind, units: readonly { quantity: number; perBundleQty: number }[]): number {
  if (units.length === 0) return 0;
  if (kind === 'single') return units[0]!.quantity;
  return Math.min(...units.map((u) => Math.floor(u.quantity / u.perBundleQty)));
}

/** INV-2 P3: a condition fits a catalog kind (`Sealed` ⇔ `sealedProduct`). */
export function conditionFitsKind(condition: string, kind: 'card' | 'sealedProduct'): boolean {
  return (condition === 'Sealed') === (kind === 'sealedProduct');
}

/** INV-2 P4: an integer price of 1,000–100,000,000 COP. */
export function isValidPrice(priceCop: number): boolean {
  return Number.isInteger(priceCop) && priceCop >= 1_000 && priceCop <= 100_000_000;
}

/** INV-2 P5 (ADD-§2.4): inside the Colombia bounding box, inclusive; (0, 0) is the missing-point sentinel. */
export function isValidLocation(location: { lat: number; lng: number }): boolean {
  const { lat, lng } = location;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return false;
  return lat >= COLOMBIA_BBOX.minLat && lat <= COLOMBIA_BBOX.maxLat && lng >= COLOMBIA_BBOX.minLng && lng <= COLOMBIA_BBOX.maxLng;
}

/** INV-2 Q1.3: a business listing is inserted paused unless its projection says funded (AD-INV-3 rule 3). */
export function pausedAtInsert(listingKind: 'business' | 'individual', projection: ProjectionState | null): boolean {
  return listingKind === 'business' && projection !== 'funded';
}

/** INV-2 Q2: the state a new listing reports. */
export function createdState(o: { paused: boolean; listingKind: 'business' | 'individual'; verified: boolean }): 'Active' | 'Unverified' | 'Paused' {
  if (o.paused) return 'Paused';
  return o.listingKind === 'business' && !o.verified ? 'Unverified' : 'Active';
}

export type ListingDetailState = 'Active' | 'Unverified' | 'Paused' | 'Hidden' | 'Withdrawn' | 'Deactivated';

/**
 * S-FR-INV-10: the state a listing reports, most severe first. A business listing is Paused while its
 * `pausedAt` is set or its projection is not funded (AD-3), and Unverified while its seller is not Approved.
 */
export function detailState(f: {
  hidden: boolean; withdrawn: boolean; deactivated: boolean; paused: boolean;
  sellerKindAtCreation: 'business' | 'individual'; projection: ProjectionState; verification: VerificationStatus | null;
}): ListingDetailState {
  if (f.hidden) return 'Hidden';
  if (f.withdrawn) return 'Withdrawn';
  if (f.deactivated) return 'Deactivated';
  if (f.sellerKindAtCreation === 'individual') return 'Active';
  if (f.paused || f.projection !== 'funded') return 'Paused';
  return f.verification === 'Approved' ? 'Active' : 'Unverified';
}

/**
 * S-FR-INV-9, S-FR-INV-10 (S-2): who may act on a listing. A non-owner never learns that an
 * invisible listing exists: it reads exactly like an unknown id.
 */
export function ownerCheck(listing: { sellerId: string; visible: boolean } | null, actorId: string | null): 'owner' | 'notFound' | 'notOwner' {
  if (listing === null) return 'notFound';
  if (listing.sellerId === actorId) return 'owner';
  return listing.visible ? 'notOwner' : 'notFound';
}

/** S-FR-INV-10.mine: the keyset `("createdAt", id)` of the last row, opaque to the client. */
export function encodeListingCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`, 'utf8').toString('base64url');
}

/** The cursor's keyset, or null when it is not one this service issued. */
export function decodeListingCursor(cursor: string): { createdAt: string; id: string } | null {
  const [createdAt, id, ...rest] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  if (rest.length > 0 || !createdAt || !id || !/^[a-z][0-9a-z]{23}$/.test(id)) return null;
  const at = Date.parse(createdAt);
  return Number.isNaN(at) || new Date(at).toISOString() !== createdAt ? null : { createdAt, id };
}
