// Core domain — DSC. Pure (AD-SYS-6). No I/O, no clock, no randomness.
import { isValidLocation } from './inv.js';

export interface Area {
  lat: number;
  lng: number;
  radiusKm: number;
}

/** ADD-§2.3: the mean Earth radius, km. */
export const EARTH_RADIUS_KM = 6371.0088;
/** ADD-§2.4: the radius bounds, km, inclusive. */
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 300;
/** ADD-§2.3: the inclusive distance tolerance, km. */
export const RADIUS_EPSILON_KM = 1e-6;

/** FR-DSC-1 + ADD-§2.4: 'valid' or the reason the area is refused (InvalidSearchArea). */
export function validateSearchArea(area: Area): 'valid' | 'radiusOutOfRange' | 'centreOutsideColombia' {
  if (!(area.radiusKm >= MIN_RADIUS_KM && area.radiusKm <= MAX_RADIUS_KM)) return 'radiusOutOfRange';
  // The one ADD-§2.4 box, shared with InvalidLocation (DSC-3 I1).
  return isValidLocation(area) ? 'valid' : 'centreOutsideColombia';
}

/** ADD-§2.3 haversine, R = 6371.0088 km, double precision — the TypeScript reference (AD-DSC-1 rule 3). */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** ADD-§2.3 inclusion: d ≤ r + 0.000001 km. */
export function insideRadius(distanceKm: number, radiusKm: number): boolean {
  return distanceKm <= radiusKm + RADIUS_EPSILON_KM;
}

/**
 * AD-DSC-1 rule 2: the bbox that contains every point within `radiusKm` of the centre, with a 0.1 %
 * margin, so the prefilter never drops a row the distance would keep.
 */
export function boundingBox(area: Area): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const dLat = ((area.radiusKm + RADIUS_EPSILON_KM) / EARTH_RADIUS_KM) * (180 / Math.PI) * 1.001;
  const farLat = Math.min(89, Math.abs(area.lat) + dLat);
  const dLng = dLat / Math.cos((farLat * Math.PI) / 180);
  return { minLat: area.lat - dLat, maxLat: area.lat + dLat, minLng: area.lng - dLng, maxLng: area.lng + dLng };
}

export interface RankKey {
  listingId: string;
  distanceKm: number | null;
  priceCop: number;
  soldOut: boolean;
}

/** FR-DSC-5 total order: (soldOut last, distance, price, id) with an area; (soldOut, price, id) without. */
export function compareRank(a: RankKey, b: RankKey, withArea: boolean): number {
  if (a.soldOut !== b.soldOut) return a.soldOut ? 1 : -1;
  if (withArea && a.distanceKm !== b.distanceKm) {
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  }
  if (a.priceCop !== b.priceCop) return a.priceCop - b.priceCop;
  return a.listingId < b.listingId ? -1 : a.listingId > b.listingId ? 1 : 0;
}
