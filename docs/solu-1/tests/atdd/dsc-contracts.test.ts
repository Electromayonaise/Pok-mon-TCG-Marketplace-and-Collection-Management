// Solu-1 ATDD — DSC contracts (contracts.md §4). RED until implemented.
import { beforeEach, describe, expect, it } from 'vitest';
import { createDscModule, type CatalogForListings, type IdentityForListings } from '../../../../src/modules/listings/index.js';
import { DomainError } from '../../../../src/shared-kernel/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, httpOf } from '../../../../test-support/errors.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';
import { wiring, type Wiring } from '../../../../test-support/wiring.js';

const db = useTestDatabase();
let w: Wiring;
let calls: string[];
const kinds = new Map<string, { sellerKind: 'business' | 'individual'; verified: boolean }>();

const identity: IdentityForListings = {
  getSellerVerification: async (sellerId) => ({ status: kinds.get(sellerId)?.verified ? 'Approved' : 'none' }),
  getSellerKinds: async (userIds) => {
    calls.push('identity.getSellerKinds');
    return userIds.map((userId) => ({ userId, sellerKind: kinds.get(userId)?.sellerKind ?? 'none', verified: kinds.get(userId)?.verified ?? false }));
  },
};
const notFound = new DomainError('CatalogEntryNotFound', [{ rule: 'FR-CAT-2', inputs: { catalogEntryId: id('ghost') } }]);
const catalog: CatalogForListings = {
  matchEntryIds: async () => {
    calls.push('catalog.matchEntryIds');
    return 'tooBroad';
  },
  getEntry: async (entryId) => {
    calls.push('catalog.getEntry');
    if (entryId === id('ghost')) throw notFound;
    return { id: entryId, name: 'Pikachu', setId: id('setsv1'), number: '025/198', kind: 'card' };
  },
  getPriceProvenance: async () => {
    calls.push('catalog.getPriceProvenance');
    return new Map();
  },
};

beforeEach(() => {
  w = wiring(db);
  calls = [];
  kinds.clear();
});
const dsc = () => createDscModule({ sql: w.sql, clock: w.clock, identity, catalog });
const MEDELLIN = { lat: 6.2442, lng: -75.5812 };

/** Scene helper (review T-03): one individual seller with one unit and one single listing. */
async function individualListing(o: { seller: string; n: string; catalogEntryId?: string; condition?: string; lat?: number; lng?: number; priceCop?: number }) {
  await seed.inventoryUnit(db, { id: id(`unit${o.n}`), sellerId: o.seller, catalogEntryId: o.catalogEntryId ?? id(`card${o.n}`), condition: o.condition ?? 'NM', quantity: 1 });
  await seed.listing(db, {
    id: id(`l${o.n}`), sellerId: o.seller, sellerKind: 'individual', inventoryUnitId: id(`unit${o.n}`),
    ...(o.lat === undefined ? {} : { lat: o.lat }), ...(o.lng === undefined ? {} : { lng: o.lng }), ...(o.priceCop === undefined ? {} : { priceCop: o.priceCop }),
  });
}

/** Valentina (individual, 0.66 km) and Andrés (verified business, 6.33 km) near Medellín, plus rows that must not appear. */
async function medellinScene() {
  const valentina = await seed.individualSeller(db, 'valentina');
  const andres = await seed.business(db, 'andres', 'Approved');
  kinds.set(valentina, { sellerKind: 'individual', verified: false });
  kinds.set(andres, { sellerKind: 'business', verified: true });
  await seed.sellerCommissionState(db, { businessId: andres, paused: false });
  const unit = (n: string, seller: string, q = 1) => seed.inventoryUnit(db, { id: id(`unit${n}`), sellerId: seller, catalogEntryId: id(`card${n}`), quantity: q });
  const put = (n: string, seller: string, kind: 'business' | 'individual', lat: number | null, lng: number | null, extra = {}) =>
    seed.listing(db, { id: id(`l${n}`), sellerId: seller, sellerKind: kind, inventoryUnitId: id(`unit${n}`), lat, lng, priceCop: 30_000, ...extra });
  await unit('val', valentina); await put('val', valentina, 'individual', 6.25, -75.58);
  await unit('and', andres); await put('and', andres, 'business', 6.3, -75.57, { priceCop: 45_000 });
  await unit('bog', andres); await put('bog', andres, 'business', 4.711, -74.0721);
  await unit('hid', valentina); await put('hid', valentina, 'individual', 6.25, -75.58, { hiddenAt: '2026-10-01T14:00:00.000Z' });
  await unit('out', valentina, 0); await put('out', valentina, 'individual', 6.25, -75.58);
  await unit('edge', valentina); await put('edge', valentina, 'individual', 6.3791, -75.5812);
  await unit('nul', valentina); await put('nul', valentina, 'individual', null, null);
  await unit('zero', valentina); await put('zero', valentina, 'individual', 0, 0);
  return { valentina, andres };
}

describe('Solu-1 ATDD: DSC — assertSearchArea (guard, FR-DSC-1, ADD-§2.4)', () => {
  it('RED: a Medellín 15 km area and the radius bounds 1 and 300 are valid', () => {
    expect(() => dsc().assertSearchArea({ ...MEDELLIN, radiusKm: 15 })).not.toThrow();
    expect(() => dsc().assertSearchArea({ ...MEDELLIN, radiusKm: 1 })).not.toThrow();
    expect(() => dsc().assertSearchArea({ ...MEDELLIN, radiusKm: 300 })).not.toThrow();
  });

  it('RED: radius 0 or 301, or a centre outside Colombia, gets InvalidSearchArea (400)', async () => {
    for (const area of [{ ...MEDELLIN, radiusKm: 0 }, { ...MEDELLIN, radiusKm: 301 }, { lat: 40.4168, lng: -3.7038, radiusKm: 15 }]) {
      const error = await caught(() => dsc().assertSearchArea(area));
      expect(codeOf(error)).toBe('InvalidSearchArea');
      expect(httpOf(error)).toBe(400);
    }
  });
});

describe('Solu-1 ATDD: DSC — search (concurrency-safe read, FR-DSC-1..6)', () => {
  it('RED: one query returns both seller kinds within 15 km, nearest first, pickup only for the individual', async () => {
    await medellinScene();
    const result = await dsc().search({ view: 'listings', area: { ...MEDELLIN, radiusKm: 15 }, page: 1, pageSize: 24 });
    expect(result.results.map((r) => r.listingId)).toEqual([id('lval'), id('land')]);
    expect(result.results[0]).toMatchObject({ sellerKind: 'individual', pickupAvailable: true });
    expect(result.results[0]!.distanceKm).toBeCloseTo(0.6584, 3);
    expect(result.results[1]).toMatchObject({ sellerKind: 'business', pickupAvailable: false, verified: true, purchasable: true });
    expect(result.results[1]!.distanceKm).toBeCloseTo(6.327, 3);
    // AD-DSC-2 rule 1, on the successful path the rule is about (review T-06)
    expect(calls.length).toBeLessThanOrEqual(3);
  });

  it('RED: hidden, sold-out, out-of-radius (15.0002 km) and unusable-location rows are excluded; unusable ones are counted', async () => {
    await medellinScene();
    const result = await dsc().search({ view: 'listings', area: { ...MEDELLIN, radiusKm: 15 }, page: 1, pageSize: 24 });
    const ids = result.results.map((r) => r.listingId);
    expect(ids).not.toContain(id('lhid'));
    expect(ids).not.toContain(id('lout'));
    expect(ids).not.toContain(id('ledge'));
    expect(ids).not.toContain(id('lbog'));
    expect(result.excluded).toEqual({ unusableLocation: 2 });
  });

  it('RED: the inclusive boundary — a listing 4.99 km from Bogotá is inside a 5 km radius (ADD-§2.3 vector)', async () => {
    const valentina = await seed.individualSeller(db, 'valentina');
    kinds.set(valentina, { sellerKind: 'individual', verified: false });
    await individualListing({ seller: valentina, n: 'b', lat: 4.711, lng: -74.0271 });
    const result = await dsc().search({ view: 'listings', area: { lat: 4.711, lng: -74.0721, radiusKm: 5 }, page: 1, pageSize: 24 });
    expect(result.results.map((r) => r.listingId)).toEqual([id('lb')]);
  });

  it('RED: identical calls return byte-identical orderings, and equal distance and price tie-break by listingId', async () => {
    const valentina = await seed.individualSeller(db, 'valentina');
    kinds.set(valentina, { sellerKind: 'individual', verified: false });
    for (const n of ['tieb', 'tiea', 'tiec']) await individualListing({ seller: valentina, n, lat: 6.25, lng: -75.58 });
    const input = { view: 'listings' as const, area: { ...MEDELLIN, radiusKm: 15 }, page: 1, pageSize: 24 as const };
    const first = await dsc().search(input);
    const second = await dsc().search(input);
    expect(first.results.map((r) => r.listingId)).toEqual([id('ltiea'), id('ltieb'), id('ltiec')]);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('RED: filters matching more than 20,000 entries get SearchFilterTooBroad (400); at most 3 neighbour calls', async () => {
    const error = await caught(() => dsc().search({ view: 'listings', catalogFilters: { pokemon: ['Pikachu'] }, page: 1, pageSize: 24 }));
    expect(codeOf(error)).toBe('SearchFilterTooBroad');
    expect(httpOf(error)).toBe(400);
    expect(calls.length).toBeLessThanOrEqual(3);
  });
});

describe('Solu-1 ATDD: DSC — getCardDetail (resolver, FR-DSC-7)', () => {
  it('RED (mandatory edge case): an entry whose listings are all in Bogotá, queried 15 km around Medellín, is present with no listings', async () => {
    const andres = await seed.business(db, 'andres', 'Approved');
    kinds.set(andres, { sellerKind: 'business', verified: true });
    await seed.sellerCommissionState(db, { businessId: andres, paused: false });
    await seed.inventoryUnit(db, { id: id('unitbog'), sellerId: andres, catalogEntryId: id('pikachu'), quantity: 2 });
    await seed.listing(db, { id: id('lbog'), sellerId: andres, sellerKind: 'business', inventoryUnitId: id('unitbog'), lat: 4.711, lng: -74.0721 });
    const detail = await dsc().getCardDetail({ catalogEntryId: id('pikachu'), area: { ...MEDELLIN, radiusKm: 15 } });
    expect(detail.entry.id).toBe(id('pikachu'));
    expect(detail).toMatchObject({ listingPriceCop: null, hasActiveListings: false, listings: [] });
    expect(calls.length).toBeLessThanOrEqual(3);
  });

  it('RED: the listing price is the lowest price among the returned listings', async () => {
    const valentina = await seed.individualSeller(db, 'valentina');
    kinds.set(valentina, { sellerKind: 'individual', verified: false });
    await individualListing({ seller: valentina, n: 'nm', catalogEntryId: id('pikachu'), condition: 'NM', priceCop: 52_000 });
    await individualListing({ seller: valentina, n: 'lp', catalogEntryId: id('pikachu'), condition: 'LP', priceCop: 38_000 });
    const detail = await dsc().getCardDetail({ catalogEntryId: id('pikachu') });
    expect(detail).toMatchObject({ listingPriceCop: 38_000, hasActiveListings: true });
    expect(detail.listings.map((l) => l.listingId)).toEqual([id('llp'), id('lnm')]);
  });

  it("RED: an unknown entry propagates catalog's CatalogEntryNotFound (404) unchanged and makes no further call", async () => {
    const error = await caught(() => dsc().getCardDetail({ catalogEntryId: id('ghost') }));
    expect(codeOf(error)).toBe('CatalogEntryNotFound');
    expect(error).toBe(notFound);
    expect(httpOf(error)).toBe(404);
    expect(calls).toEqual(['catalog.getEntry']);
  });
});
