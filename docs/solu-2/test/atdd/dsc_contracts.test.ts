// ATDD — DSC (contracts.md §4). Red phase: every test must fail with NotImplementedError.
// DSC owns no tables: the neighbours (catalog, identity) are fakes, the listings are real rows.
import { describe, expect, it } from 'vitest';
import { DscServiceV2 } from '../../../../src/modules/listings/index.js';
import type { CatalogForDsc, IdentityForDsc } from '../../../../src/modules/listings/index.js';
import type { CatalogEntryDTO, PriceProvenanceDTO } from '../../../../src/modules/catalog/index.js';
import { DomainError } from '../../../../src/shared-kernel/errors.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { business, catalogEntry, commissionState, explainAssert, fake, id, listing, T0, unit, user, wiring } from '../../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();
const R = 6371.0088; // ADD-§2.3 mean Earth radius, km
const ORIGIN = { lat: 4.711, lng: -74.0721 }; // Bogotá
/** A point exactly `km` north of ORIGIN: along a meridian the haversine distance is R·Δφ. */
const north = (km: number) => ({ lat: ORIGIN.lat + (km / R) * (180 / Math.PI), lng: ORIGIN.lng });
const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const ENTRY: CatalogEntryDTO = { catalogEntryId: id('char'), setId: id('set1'), kind: 'card', name: 'Charizard ex', number: '006', pokemon: 'Charizard', colour: null, style: null, artist: null, imageUrl: null };
const PROVENANCE: PriceProvenanceDTO = {
  catalogEntryId: id('char'), lastTransactionReference: null, freshness: null,
  trend: { period: 30, referencePriceAtStart: null, changePercentHundredths: null, decision: { outcome: 'excluded', reasonCode: 'TrendNoBaseline', humanMessage: 'Sin referencia.', citations: [{ rule: 'FR-CAT-6', inputs: {} }], occurredAt: T0 } },
  decision: { outcome: 'allowed', reasonCode: 'ReferencePriceStale', humanMessage: 'Sin precio.', citations: [{ rule: 'FR-CAT-6', inputs: {} }], occurredAt: T0 },
};

function setup(calls: string[] = [], o: { tooBroad?: boolean; unknownEntry?: boolean } = {}) {
  const catalog = fake<CatalogForDsc>('catalog', {
    getEntry: async () => { calls.push('getEntry'); if (o.unknownEntry) throw new DomainError('CatalogEntryNotFound', [{ rule: 'FR-CAT-2', inputs: {} }]); return ENTRY; },
    getPriceProvenance: async () => { calls.push('getPriceProvenance'); return { items: [PROVENANCE] }; },
    matchEntryIds: async () => { calls.push('matchEntryIds'); return o.tooBroad ? { ids: [], tooBroad: true } : { ids: [id('char')], tooBroad: false }; },
  });
  const identity = fake<IdentityForDsc>('identity', {
    getSellerKinds: async ({ userIds }) => { calls.push('getSellerKinds'); return { sellers: userIds.map((u) => ({ userId: u, sellerKind: u === id('valentina') ? 'individual' as const : 'business' as const, verified: true })) }; },
  });
  return new DscServiceV2({ ...wiring(db), catalog, identity });
}

/** Andrés (business, funded) and Valentina (individual), each with listings of Charizard at given points. */
async function scene(points: { key: string; seller: 'andres' | 'valentina'; at: { lat: number; lng: number } | null; priceCop?: number; hiddenAt?: string }[]) {
  await business(db, id('andres'), 'Approved');
  await commissionState(db, id('andres'));
  await user(db, { id: id('valentina'), sellerTrack: 'individual' });
  await catalogEntry(db, id('char'));
  await unit(db, { id: id('ua'), sellerId: id('andres'), catalogEntryId: id('char'), quantity: 5 });
  await unit(db, { id: id('uv'), sellerId: id('valentina'), catalogEntryId: id('char'), quantity: 5 });
  for (const p of points) {
    await listing(db, { id: id(p.key), sellerId: id(p.seller), unitId: id(p.seller === 'andres' ? 'ua' : 'uv'), sellerKind: p.seller === 'andres' ? 'business' : 'individual', priceCop: p.priceCop ?? 45_000, lat: p.at?.lat ?? null, lng: p.at?.lng ?? null, hiddenAt: p.hiddenAt ?? null });
  }
}
const area = (radiusKm: number) => ({ lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm });

describe('DSC-3 — assertSearchArea (contracts.md §4)', () => {
  it('[DSC-3.Q1] a 15 km area around Bogotá is accepted', () => {
    expect(setup().assertSearchArea({ area: area(15) })).toBeUndefined();
  });

  it('[DSC-3.QF1] a 301 km radius is InvalidSearchArea (400) citing the inputs', () => {
    let error: unknown;
    try { setup().assertSearchArea({ area: area(301) }); } catch (e) { error = e; }
    expect(codeOf(error)).toBe('InvalidSearchArea');
    expect(httpOf(error)).toBe(400);
    expect(citedInputs(error)).toEqual({ lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 301 });
  });

  it('[DSC-3.QF2] the (0, 0) sentinel and a centre outside Colombia are InvalidSearchArea', () => {
    const codes = [{ lat: 0, lng: 0, radiusKm: 5 }, { lat: 40.4, lng: -3.7, radiusKm: 5 }].map((a) => { try { setup().assertSearchArea({ area: a }); return 'ok'; } catch (e) { return codeOf(e); } });
    expect(codes).toEqual(['InvalidSearchArea', 'InvalidSearchArea']);
  });

  it('[DSC-3.I1] the radius bounds are inclusive: 1 km and 300 km are accepted (ADD-§2.4 constants)', () => {
    expect([1, 300].map((r) => setup().assertSearchArea({ area: area(r) }))).toEqual([undefined, undefined]);
  });
});

describe('DSC-1 — search (contracts.md §4)', () => {
  it('[DSC-1.Q1] results inside the area are ranked by distance, then price, then id, each with its explanation', async () => {
    await scene([{ key: 'far', seller: 'andres', at: north(10) }, { key: 'near', seller: 'valentina', at: north(2) }, { key: 'out', seller: 'andres', at: north(40) }]);
    const result = await setup().search({ view: 'listings', area: area(15), page: 1, pageSize: 24 });
    expect(result.results.map((r) => r.listingId)).toEqual([id('near'), id('far')]);
    explainAssert(result.results[0]!.explanation, { outcome: 'ranked', rule: 'FR-DSC-5' });
  });

  it('[DSC-1.I1] one query path serves both seller kinds: business and individual rows come back together (AD-5)', async () => {
    await scene([{ key: 'lb', seller: 'andres', at: north(1) }, { key: 'li', seller: 'valentina', at: north(3) }]);
    const result = await setup().search({ view: 'listings', area: area(15), page: 1, pageSize: 24 });
    expect(result.results.map((r) => [r.listingId, r.sellerKind, r.pickupAvailable])).toEqual([[id('lb'), 'business', false], [id('li'), 'individual', true]]);
  });

  it('[DSC-1.I2] a hidden listing is never returned (AD-12)', async () => {
    await scene([{ key: 'shown', seller: 'andres', at: north(1) }, { key: 'hid', seller: 'andres', at: north(1), hiddenAt: T0 }]);
    const result = await setup().search({ view: 'listings', area: area(15), page: 1, pageSize: 24 });
    expect(result.results.map((r) => r.listingId)).toEqual([id('shown')]);
  });

  it('[DSC-1.I4] the SQL distance equals the haversine reference within 1 m (AD-DSC-1, NFR-DSC-2)', async () => {
    const points = [north(0.5), { lat: 4.65, lng: -74.1 }, { lat: 4.75, lng: -74.02 }];
    await scene(points.map((p, i) => ({ key: `p${i}`, seller: 'andres' as const, at: p })));
    const result = await setup().search({ view: 'listings', area: area(30), page: 1, pageSize: 24 });
    for (const r of result.results) {
      const p = points[Number(r.listingId === id('p0') ? 0 : r.listingId === id('p1') ? 1 : 2)]!;
      expect(Math.abs((r.distanceKm ?? -1) - haversine(ORIGIN, p))).toBeLessThan(0.001);
    }
    expect(result.results).toHaveLength(3);
  });

  it('[DSC-1.Q4] listings with no usable coordinates are excluded and counted, explained with ListingLocationUnusable', async () => {
    await scene([{ key: 'ok', seller: 'andres', at: north(1) }, { key: 'nocoords', seller: 'andres', at: null }]);
    const result = await setup().search({ view: 'listings', area: area(15), page: 1, pageSize: 24 });
    expect(result.excluded.unusableLocation).toBe(1);
    explainAssert(result.decision, { code: 'ListingLocationUnusable', rule: 'FR-DSC-3', inputs: { unusableLocation: 1 } });
  });

  it('[DSC-1.P2] catalog filters that match more than 20,000 entries are SearchFilterTooBroad (400)', async () => {
    const error = await caught(() => setup([], { tooBroad: true }).search({ view: 'listings', catalogFilters: { pokemon: 'Pikachu' }, page: 1, pageSize: 24 }));
    expect(codeOf(error)).toBe('SearchFilterTooBroad');
    expect(citedInputs(error)).toMatchObject({ threshold: 20000 });
  });

  it('[DSC-1.R1] the read is repeat-safe and concurrency-safe: 10 concurrent equal searches return byte-identical results (NFR-DSC-3)', async () => {
    await scene([{ key: 'a', seller: 'andres', at: north(2), priceCop: 45_000 }, { key: 'b', seller: 'andres', at: north(2), priceCop: 45_000 }, { key: 'c', seller: 'valentina', at: north(5) }]);
    const outcome = await race(10, () => setup().search({ view: 'listings', area: area(15), page: 1, pageSize: 24 }));
    expect(outcome.rejected.map(codeOf)).toEqual([]);
    expect(new Set(outcome.fulfilled.map((r) => JSON.stringify(r.results))).size).toBe(1);
  });
});

describe('DSC-2 — getCardDetail (contracts.md §4)', () => {
  it('[DSC-2.Q1] the card detail makes exactly three neighbour calls and keeps the three prices separate', async () => {
    await scene([{ key: 'l1', seller: 'andres', at: north(1), priceCop: 45_000 }, { key: 'l2', seller: 'valentina', at: north(2), priceCop: 40_000 }]);
    const calls: string[] = [];
    const result = await setup(calls).getCardDetail({ catalogEntryId: id('char'), area: area(15) });
    expect(calls.sort()).toEqual(['getEntry', 'getPriceProvenance', 'getSellerKinds']);
    expect(result.listingPriceCop).toBe(40_000);
    expect(result.provenance).toEqual(PROVENANCE);
  });

  it('[DSC-2.MEC] boundaries: 15.0002 km is excluded and 15.0000 km included at radius 15; 4.99 km included at radius 5; missing coordinates counted', async () => {
    await scene([{ key: 'edge', seller: 'andres', at: north(15) }, { key: 'over', seller: 'andres', at: north(15.0002) }, { key: 'in5', seller: 'valentina', at: north(4.99) }, { key: 'none', seller: 'andres', at: null }]);
    const r15 = await setup().getCardDetail({ catalogEntryId: id('char'), area: area(15) });
    expect(r15.listings.map((l) => l.listingId)).toEqual([id('in5'), id('edge')]);
    expect(r15.excluded.unusableLocation).toBe(1);
    const r5 = await setup().getCardDetail({ catalogEntryId: id('char'), area: area(5) });
    expect(r5.listings.map((l) => l.listingId)).toEqual([id('in5')]);
  });

  it('[DSC-2.MEC2] an entry whose every listing is outside the area is still returned, with no listing price', async () => {
    await scene([{ key: 'far', seller: 'andres', at: north(100) }]);
    const result = await setup().getCardDetail({ catalogEntryId: id('char'), area: area(15) });
    expect(result).toMatchObject({ entry: ENTRY, listingPriceCop: null, hasActiveListings: false, listings: [] });
  });

  it('[DSC-2.P1] an unknown entry propagates CatalogEntryNotFound (404) and makes no further call', async () => {
    const calls: string[] = [];
    const error = await caught(() => setup(calls, { unknownEntry: true }).getCardDetail({ catalogEntryId: id('ghost'), area: null }));
    expect(codeOf(error)).toBe('CatalogEntryNotFound');
    expect(httpOf(error)).toBe(404);
    expect(calls).toEqual(['getEntry']);
  });
});
