// Core domain — DSC. Pure (AD-SYS-6). No I/O, no clock, no randomness.
import { NotImplementedError } from '../../../shared-kernel/errors.js';

export interface Area {
  lat: number;
  lng: number;
  radiusKm: number;
}

/** FR-DSC-1 + ADD-§2.4: 'valid' or the reason the area is refused (InvalidSearchArea). */
export function validateSearchArea(_area: Area): 'valid' | 'radiusOutOfRange' | 'centreOutsideColombia' {
  throw new NotImplementedError('listings.domain.validateSearchArea');
}

/** ADD-§2.3 haversine, R = 6371.0088 km, double precision — the TypeScript reference (AD-DSC-1 rule 3). */
export function haversineKm(_a: { lat: number; lng: number }, _b: { lat: number; lng: number }): number {
  throw new NotImplementedError('listings.domain.haversineKm');
}

/** ADD-§2.3 inclusion: d ≤ r + 0.000001 km. */
export function insideRadius(_distanceKm: number, _radiusKm: number): boolean {
  throw new NotImplementedError('listings.domain.insideRadius');
}

export interface RankKey {
  listingId: string;
  distanceKm: number | null;
  priceCop: number;
  soldOut: boolean;
}

/** FR-DSC-5 total order: (soldOut last, distance, price, id) with an area; (soldOut, price, id) without. */
export function compareRank(_a: RankKey, _b: RankKey, _withArea: boolean): number {
  throw new NotImplementedError('listings.domain.compareRank');
}
