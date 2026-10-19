// Solu-1 ATDD — VAL contracts (contracts.md §11). RED until implemented.
import fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';
import { createValModule, type CatalogForCollections } from '../../../../src/modules/collections/index.js';
import type { ReferencePriceInput } from '../../../../src/modules/collections/domain/val.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, httpOf } from '../../../../test-support/errors.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';
import { wiring, type Wiring } from '../../../../test-support/wiring.js';

const db = useTestDatabase();
let w: Wiring;
let prices: Map<string, ReferencePriceInput | null>;
let asOfSeen: string[];
const price = (cop: number, o: Partial<Omit<ReferencePriceInput, '__brand' | 'cop'>> = {}): ReferencePriceInput =>
  ({ __brand: 'ReferencePrice', cop: BigInt(cop), stale: false, copDerivation: 'sourceNative', ...o }) as ReferencePriceInput;
const catalog: CatalogForCollections = {
  getEntries: async () => ({ entries: [], missing: [] }),
  getSetSummaries: async () => [],
  getReferencePricesAsOf: async (ids, asOf) => {
    asOfSeen.push(asOf.toISOString());
    return new Map(ids.map((i) => [i, prices.get(i) ?? null]));
  },
};
beforeEach(() => {
  w = wiring(db);
  prices = new Map();
  asOfSeen = [];
});
const val = () => createValModule({ sql: w.sql, transactions: w.transactions, clock: w.clock, ids: w.ids, catalog });
const valentina = id('valentina');

describe('Solu-1 ATDD: VAL — assertValuationPeriod (guard, FR-VAL-2)', () => {
  it('RED: 7, 30, 90 and 365 are valid periods', () => {
    for (const period of [7, 30, 90, 365]) expect(() => val().assertValuationPeriod({ period })).not.toThrow();
  });

  it('RED: 31 gets InvalidValuationPeriod (400)', async () => {
    const error = await caught(() => val().assertValuationPeriod({ period: 31 }));
    expect(codeOf(error)).toBe('InvalidValuationPeriod');
    expect(httpOf(error)).toBe(400);
  });
});

describe('Solu-1 ATDD: VAL — valueCollection (concurrency-safe read, AD-VAL-1)', () => {
  it('RED: total = Σ cop × qty; link-added and unpriced entries are listed as not valued; stale ones counted', async () => {
    await seed.collection(db, { id: id('colval'), ownerId: valentina });
    await seed.collectionEntry(db, { id: id('epika'), collectionId: id('colval'), catalogEntryId: id('pikachu'), qty: 2 });
    await seed.collectionEntry(db, { id: id('echar'), collectionId: id('colval'), catalogEntryId: id('charizard'), position: 1 });
    await seed.collectionEntry(db, { id: id('enone'), collectionId: id('colval'), catalogEntryId: id('unpriced'), position: 2 });
    await seed.collectionEntry(db, { id: id('elink'), collectionId: id('colval'), external: { url: 'https://example.com/promo', title: 'Promo' }, position: 3 });
    prices.set(id('pikachu'), price(45_000));
    prices.set(id('charizard'), price(320_000, { stale: true }));
    const result = await val().valueCollection({ collectionId: id('colval'), actorId: valentina });
    expect(result).toMatchObject({ totalCop: 410_000, valuedCount: 2, staleCount: 1, asOf: w.clock.iso(), conversionDriftBoundCop: 0 });
    expect(result.notValued).toEqual(
      expect.arrayContaining([
        { entryId: id('enone'), reasonCode: 'NoReferencePrice' },
        { entryId: id('elink'), reasonCode: 'ExternalEntryNotInCatalog' },
      ]),
    );
  });

  it('RED (mandatory edge case): 500 entries at an FX-derived 401 COP — the exact BigInt total and the drift bound floor(500 / 2)', async () => {
    await seed.collection(db, { id: id('colval'), ownerId: valentina });
    for (let i = 0; i < 500; i++) {
      await seed.collectionEntry(db, { id: id(`e${i}`), collectionId: id('colval'), catalogEntryId: id(`card${i}`), position: i });
      prices.set(id(`card${i}`), price(401, { copDerivation: 'fxDerived' }));
    }
    const result = await val().valueCollection({ collectionId: id('colval'), actorId: valentina });
    expect(result).toMatchObject({ totalCop: 200_500, valuedCount: 500, conversionDriftBoundCop: 250 });
  });

  it('RED (GAP-2): more than 500 distinct cards are priced in chunks that all use the same asOf; two equal calls are byte-identical', async () => {
    await seed.collection(db, { id: id('colval'), ownerId: valentina });
    for (let i = 0; i < 501; i++) {
      await seed.collectionEntry(db, { id: id(`e${i}`), collectionId: id('colval'), catalogEntryId: id(`card${i}`), position: i });
      prices.set(id(`card${i}`), price(1_000));
    }
    const first = await val().valueCollection({ collectionId: id('colval'), actorId: valentina });
    const second = await val().valueCollection({ collectionId: id('colval'), actorId: valentina });
    expect(asOfSeen).toEqual([w.clock.iso(), w.clock.iso(), w.clock.iso(), w.clock.iso()]);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.totalCop).toBe(501_000);
  });

  it("RED: someone else's collection gets CollectionNotFound (404) and catalog is never called", async () => {
    await seed.collection(db, { id: id('colval'), ownerId: valentina });
    const error = await caught(() => val().valueCollection({ collectionId: id('colval'), actorId: id('camila') }));
    expect(codeOf(error)).toBe('CollectionNotFound');
    expect(asOfSeen).toEqual([]);
  });
});

describe('Solu-1 ATDD: VAL — changePercent (resolver, ADD-§2.2)', () => {
  it('RED: the ADD-§2.2 vectors in hundredths of a percent, half away from zero, never −0', () => {
    expect(val().changePercent({ base: 40_000, current: 45_000 })).toEqual({ hundredths: 1250 });
    expect(val().changePercent({ base: 3, current: 4 })).toEqual({ hundredths: 3333 });
    const tiny = val().changePercent({ base: 30_000, current: 29_999 });
    expect(Object.is(tiny?.hundredths, 0)).toBe(true);
  });

  it('RED: a zero baseline resolves to null — no division is attempted', () => {
    expect(val().changePercent({ base: 0, current: 45_000 })).toBeNull();
  });

  it('RED (property): the result is sign-symmetric for 1,000 random baselines and deltas', () => {
    // A concrete example first, so an unimplemented resolver fails on its own error, not on fast-check's wrapper.
    expect(val().changePercent({ base: 1, current: 1 })).toEqual({ hundredths: 0 });
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100_000_000 }), fc.integer({ min: 0, max: 100_000_000 }), (base, delta) => {
        fc.pre(delta <= base);
        const up = val().changePercent({ base, current: base + delta });
        const down = val().changePercent({ base, current: base - delta });
        expect(up!.hundredths).toBe(-down!.hundredths || 0);
      }),
      { numRuns: 1_000, seed: 20261001 },
    );
  });
});
