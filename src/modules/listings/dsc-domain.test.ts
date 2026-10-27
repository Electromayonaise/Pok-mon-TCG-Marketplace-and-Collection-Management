// DSC domain (ADD-§2.3, ADD-§2.4, FR-DSC-5): pure rules, no database.
import { describe, expect, it } from 'vitest';
import { boundingBox, compareRank, EARTH_RADIUS_KM, haversineKm, insideRadius, validateSearchArea, type RankKey } from './domain/dsc.js';

const BOGOTA = { lat: 4.711, lng: -74.0721 };

describe('DSC-3 area rules', () => {
  it('the radius bounds are inclusive, 1–300 km', () => {
    expect([0.999, 1, 300, 300.001].map((radiusKm) => validateSearchArea({ ...BOGOTA, radiusKm }))).toEqual(['radiusOutOfRange', 'valid', 'valid', 'radiusOutOfRange']);
  });

  it('the centre lies in the Colombia box and is never (0, 0) or non-finite', () => {
    expect([{ lat: 0, lng: 0 }, { lat: 40.4, lng: -3.7 }, { lat: 13.39, lng: -66.85 }, { lat: Number.NaN, lng: -74 }].map((c) => validateSearchArea({ ...c, radiusKm: 5 })))
      .toEqual(['centreOutsideColombia', 'centreOutsideColombia', 'valid', 'centreOutsideColombia']);
    expect(validateSearchArea({ ...BOGOTA, radiusKm: Number.NaN })).toBe('radiusOutOfRange');
  });
});

describe('DSC distance', () => {
  it('haversine along a meridian is R·Δφ, and zero at the centre', () => {
    const north = { lat: BOGOTA.lat + (15 / EARTH_RADIUS_KM) * (180 / Math.PI), lng: BOGOTA.lng };
    expect(haversineKm(BOGOTA, north)).toBeCloseTo(15, 9);
    expect(haversineKm(BOGOTA, BOGOTA)).toBe(0);
  });

  it('inclusion tolerates 1e-6 km past the radius, no more', () => {
    expect([insideRadius(15, 15), insideRadius(15.000001, 15), insideRadius(15.0002, 15)]).toEqual([true, true, false]);
  });

  it('the bbox contains every point at the radius in the four directions', () => {
    const box = boundingBox({ ...BOGOTA, radiusKm: 300 });
    const d = (300 / EARTH_RADIUS_KM) * (180 / Math.PI);
    expect(box.maxLat).toBeGreaterThan(BOGOTA.lat + d);
    expect(box.minLat).toBeLessThan(BOGOTA.lat - d);
    const east = { lat: BOGOTA.lat, lng: box.maxLng };
    expect(haversineKm(BOGOTA, east)).toBeGreaterThan(300);
  });
});

describe('FR-DSC-5 order', () => {
  const k = (listingId: string, distanceKm: number | null, priceCop: number, soldOut = false): RankKey => ({ listingId, distanceKm, priceCop, soldOut });

  it('with an area: sold-out last, then distance, then price, then id', () => {
    const rows = [k('d', 1, 10, true), k('c', 2, 5), k('b', 1, 20), k('a', 1, 20), k('e', 1, 10)];
    expect(rows.sort((x, y) => compareRank(x, y, true)).map((r) => r.listingId)).toEqual(['e', 'a', 'b', 'c', 'd']);
  });

  it('without an area: sold-out last, then price, then id', () => {
    const rows = [k('c', 1, 5), k('b', null, 5), k('a', 9, 7)];
    expect(rows.sort((x, y) => compareRank(x, y, false)).map((r) => r.listingId)).toEqual(['b', 'c', 'a']);
  });
});
