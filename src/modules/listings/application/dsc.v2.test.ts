// DSC against Postgres: the edges the ATDD tests leave out.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { business, catalogEntry, commissionState, fake, id, listing, unit, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { COLOMBIA_BBOX } from '../../../shared-kernel/types.js';
import { haversineKm } from '../domain/dsc.js';
import { distanceSql } from '../infra/pg.js';
import type { CatalogForDsc, IdentityForDsc } from '../ports/dsc.v2.js';
import { DscServiceV2 } from './dsc.v2.js';

const db = useTestDatabase();

/** A deterministic LCG in [0, 1), so the 1,000 pairs are the same on every run. */
function lcg(seed: number): () => number {
  let x = seed;
  return () => { x = (x * 1_103_515_245 + 12_345) % 2_147_483_648; return x / 2_147_483_648; };
}

describe('AD-DSC-1 rule 3: the SQL distance equals the TypeScript reference', () => {
  it('1,000 Colombian pairs agree within 1e-6 km', async () => {
    const next = lcg(42);
    const point = () => ({ lat: COLOMBIA_BBOX.minLat + next() * (COLOMBIA_BBOX.maxLat - COLOMBIA_BBOX.minLat), lng: COLOMBIA_BBOX.minLng + next() * (COLOMBIA_BBOX.maxLng - COLOMBIA_BBOX.minLng) });
    const pairs = Array.from({ length: 1_000 }, () => [point(), point()] as const);
    const sql = await db.query<{ d: number }>(
      `SELECT ${distanceSql('l.clat', 'l.clng')} AS d FROM unnest($1::float8[], $2::float8[], $3::float8[], $4::float8[]) WITH ORDINALITY AS l(clat, clng, lat, lng, n) ORDER BY n`,
      [pairs.map(([c]) => c.lat), pairs.map(([c]) => c.lng), pairs.map(([, p]) => p.lat), pairs.map(([, p]) => p.lng)],
    );
    const errors = sql.map((r, k) => Math.abs(r.d - haversineKm(pairs[k]![0], pairs[k]![1])));
    expect(errors.filter((e) => !(e <= 1e-6))).toEqual([]);
  });
});

describe('DSC-1 search edges', () => {
  const kinds = fake<IdentityForDsc>('identity', { getSellerKinds: async ({ userIds }) => ({ sellers: userIds.map((userId) => ({ userId, sellerKind: 'business' as const, verified: userId === id('andres') })) }) });
  const dsc = (calls: string[] = []) => new DscServiceV2({ ...wiring(db), identity: kinds, catalog: fake<CatalogForDsc>('catalog', {
    matchEntryIds: async () => { calls.push('matchEntryIds'); return { ids: [id('char')], tooBroad: false }; },
  }) });

  async function scene() {
    await business(db, id('andres'), 'Approved');
    await commissionState(db, id('andres'));
    await business(db, id('pending'), 'Pending');
    await commissionState(db, id('pending'));
    await catalogEntry(db, id('char'));
    await catalogEntry(db, id('pika'));
    await unit(db, { id: id('ua'), sellerId: id('andres'), catalogEntryId: id('char'), quantity: 2 });
    await unit(db, { id: id('uz'), sellerId: id('andres'), catalogEntryId: id('pika'), quantity: 0 });
    await unit(db, { id: id('up'), sellerId: id('pending'), catalogEntryId: id('char'), quantity: 2 });
    await listing(db, { id: id('la'), sellerId: id('andres'), unitId: id('ua'), priceCop: 50_000 });
    await listing(db, { id: id('lz'), sellerId: id('andres'), unitId: id('uz'), priceCop: 10_000 });
    await listing(db, { id: id('lp'), sellerId: id('pending'), unitId: id('up'), priceCop: 20_000 });
  }

  it('without an area the order is price then id; sold-out rows come only when asked, and last', async () => {
    await scene();
    expect((await dsc().search({ view: 'listings', page: 1, pageSize: 24 })).results.map((r) => [r.listingId, r.distanceKm])).toEqual([[id('lp'), null], [id('la'), null]]);
    expect((await dsc().search({ view: 'listings', includeSoldOut: true, page: 1, pageSize: 24 })).results.map((r) => r.listingId)).toEqual([id('lp'), id('la'), id('lz')]);
  });

  it('purchasableOnly keeps the verified, funded, available business rows; rankKey is the position in the whole result', async () => {
    await scene();
    const result = await dsc().search({ view: 'listings', purchasableOnly: true, page: 1, pageSize: 24 });
    expect(result.results.map((r) => [r.listingId, r.purchasable])).toEqual([[id('la'), true]]);
    const all = await dsc().search({ view: 'listings', page: 1, pageSize: 24 });
    expect(all.results.map((r) => r.explanation.citations[0].inputs.rankKey)).toEqual([1, 2]);
    explainNone(all.decision);
  });

  it('catalog filters call matchEntryIds once, empty filters never; page 418 is refused before any call', async () => {
    await scene();
    const calls: string[] = [];
    await dsc(calls).search({ view: 'listings', catalogFilters: { pokemon: 'Charizard' }, page: 1, pageSize: 24 });
    await dsc(calls).search({ view: 'listings', catalogFilters: {}, page: 1, pageSize: 24 });
    expect(calls).toEqual(['matchEntryIds']);
    const error = await dsc(calls).search({ view: 'listings', catalogFilters: { pokemon: 'x' }, page: 418, pageSize: 24 }).catch((e: unknown) => e);
    expect([(error as { code?: string }).code, calls.length]).toEqual(['RequestValidationFailed', 1]);
  });

  it('a page beyond the results is empty and makes no identity call', async () => {
    await user(db, { id: id('camila') });
    const result = await new DscServiceV2({ ...wiring(db), identity: fake<IdentityForDsc>('identity', {}), catalog: fake<CatalogForDsc>('catalog', {}) })
      .search({ view: 'listings', page: 3, pageSize: 24 });
    expect(result).toMatchObject({ results: [], excluded: { unusableLocation: 0 }, decision: { reasonCode: 'SearchRanked' } });
  });
});

function explainNone(decision: { reasonCode: string; citations: { inputs: Record<string, unknown> }[] }) {
  expect([decision.reasonCode, decision.citations[0]?.inputs.unusableLocation]).toEqual(['SearchRanked', 0]);
}
