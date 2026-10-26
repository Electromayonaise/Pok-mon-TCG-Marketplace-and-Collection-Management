// ATDD — VAL (contracts.md §11). Red phase: every test must fail with NotImplementedError.
// VAL owns no tables: entries are real rows, reference prices come from a catalog fake.
import { describe, expect, it } from 'vitest';
import { ValServiceV2 } from '../../../src/modules/collections/index.js';
import type { CatalogForVal } from '../../../src/modules/collections/index.js';
import type { ObservedPriceDTO } from '../../../src/modules/catalog/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { caught } from '../../../test-support/errors.js';
import { codeOf, race } from '../../../test-support/concurrency.js';
import { at, collection, DAY, entry, explainAssert, fake, id, T0, user, wiring } from '../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();

/** Reference prices by catalog id: a list of (observedAt, cop, fx?) observations. */
type Prices = Record<string, { observedAt: string; cop: number; fx?: boolean }[]>;
function setup(prices: Prices = {}, asOfCalls: string[] = []) {
  const obs = (c: string, o: { observedAt: string; cop: number; fx?: boolean }): ObservedPriceDTO => ({ usdCents: o.fx ? Math.round(o.cop / 41) : null, cop: o.cop, observedAt: o.observedAt, source: 'fixture', copDerivation: o.fx ? 'fxDerived' : 'sourceNative', fxRateDate: o.fx ? o.observedAt.slice(0, 10) : null });
  const latest = (c: string, asOf: string) => (prices[c] ?? []).filter((o) => o.observedAt <= asOf).sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
  const catalog = fake<CatalogForVal>('catalog', {
    getReferencePricesAsOf: async ({ catalogEntryIds, asOf }) => {
      asOfCalls.push(asOf);
      return { prices: catalogEntryIds.map((c) => { const o = latest(c, asOf); return { catalogEntryId: c, price: o ? obs(c, o) : null, stale: o ? Date.parse(asOf) - Date.parse(o.observedAt) > 36 * 3_600_000 : false }; }) };
    },
    getPriceHistory: async ({ catalogEntryIds, from, to }) => ({
      series: catalogEntryIds.map((c) => {
        const all = (prices[c] ?? []).sort((a, b) => a.observedAt.localeCompare(b.observedAt));
        const before = all.filter((o) => o.observedAt < from).at(-1);
        return { catalogEntryId: c, observations: [...(before ? [before] : []), ...all.filter((o) => o.observedAt >= from && o.observedAt <= to)].map((o) => obs(c, o)) };
      }),
    }),
  });
  const w = wiring(db);
  return { w, val: new ValServiceV2({ ...w, catalog }) };
}
async function owner(): Promise<void> {
  await user(db, { id: id('valentina') });
  await collection(db, { id: id('coll1'), ownerId: id('valentina') });
}

describe('VAL-1 — valueCollection (contracts.md §11)', () => {
  it('[VAL-1.Q1] the total is Σ cop × qty over priced entries; external and unpriced entries are notValued with their codes; stale ones are counted', async () => {
    await owner();
    await entry(db, { id: id('e1'), collectionId: id('coll1'), catalogEntryId: id('char'), qty: 2 });
    await entry(db, { id: id('e2'), collectionId: id('coll1'), catalogEntryId: id('pika'), qty: 1 });
    await entry(db, { id: id('e3'), collectionId: id('coll1'), catalogEntryId: id('nopr'), qty: 1 });
    await entry(db, { id: id('e4'), collectionId: id('coll1'), external: true });
    const { w, val } = setup({ [id('char')]: [{ observedAt: at(-DAY), cop: 45_000 }], [id('pika')]: [{ observedAt: at(-3 * DAY), cop: 9_999 }] });
    const result = await val.valueCollection({ collectionId: id('coll1'), actorId: id('valentina') });
    expect(result).toMatchObject({ totalCop: 99_999, valuedCount: 2, staleCount: 1, asOf: w.clock.iso(), conversionDriftBoundCop: 0 });
    expect(result.notValued).toEqual(expect.arrayContaining([{ entryId: id('e3'), reasonCode: 'NoReferencePrice' }, { entryId: id('e4'), reasonCode: 'ExternalEntryNotInCatalog' }]));
    explainAssert(result.decision, { rule: 'FR-VAL-1', inputs: { valuedCount: 2, notValuedCount: 2, staleCount: 1 } });
  });

  it('[VAL-1.P1] another owner’s collection is CollectionNotFound (404)', async () => {
    await owner();
    await user(db, { id: id('julian') });
    expect(codeOf(await caught(() => setup().val.valueCollection({ collectionId: id('coll1'), actorId: id('julian') })))).toBe('CollectionNotFound');
  });

  it('[VAL-1.I1] the sum is exact BigInt arithmetic: 999 × 99,999,999 over 90 entries is never rounded (AD-VAL-1, AD-SYS-7)', async () => {
    await owner();
    const prices: Prices = {};
    for (let i = 0; i < 90; i++) {
      await entry(db, { id: id(`e${i}`), collectionId: id('coll1'), catalogEntryId: id(`c${i}`), qty: 999, position: i });
      prices[id(`c${i}`)] = [{ observedAt: at(-DAY), cop: 99_999_999 }];
    }
    const result = await setup(prices).val.valueCollection({ collectionId: id('coll1'), actorId: id('valentina') });
    expect(BigInt(result.totalCop)).toBe(90n * 999n * 99_999_999n);
  });

  it('[VAL-1.I2] every price chunk is read as of the same instant, for 600 distinct cards (two chunks of ≤ 500, Solu-1 GAP-2)', async () => {
    await owner();
    const prices: Prices = {};
    for (let i = 0; i < 600; i++) {
      await entry(db, { id: id(`e${i}`), collectionId: id('coll1'), catalogEntryId: id(`c${i}`), position: i });
      prices[id(`c${i}`)] = [{ observedAt: at(-DAY), cop: 1_000 }];
    }
    const asOfCalls: string[] = [];
    const result = await setup(prices, asOfCalls).val.valueCollection({ collectionId: id('coll1'), actorId: id('valentina') });
    expect(result.totalCop).toBe(600_000);
    expect(asOfCalls).toEqual([T0, T0]);
  });

  it('[VAL-1.MEC] 500 entries mixing native and FX-derived prices: the total equals the reference sum exactly, and the drift bound is ⌊Σ qty(fx) / 2⌋ (NFR-VAL-1)', async () => {
    await owner();
    const prices: Prices = {};
    let expected = 0n;
    let fxQty = 0;
    for (let i = 0; i < 500; i++) {
      const qty = (i % 7) + 1;
      // A deterministic spread over 1,000–250,999 COP: 7,919 is prime, so i × 7,919 mod 250,000 never repeats within 500 entries.
      const cop = 1_000 + ((i * 7_919) % 250_000);
      const fx = i % 3 === 0;
      await entry(db, { id: id(`e${i}`), collectionId: id('coll1'), catalogEntryId: id(`c${i}`), qty, position: i });
      prices[id(`c${i}`)] = [{ observedAt: at(-DAY - (i % 5) * DAY), cop, fx }];
      expected += BigInt(cop) * BigInt(qty);
      if (fx) fxQty += qty;
    }
    const outcome = await race(5, () => setup(prices).val.valueCollection({ collectionId: id('coll1'), actorId: id('valentina') }));
    expect(outcome.rejected.map(codeOf)).toEqual([]);
    for (const r of outcome.fulfilled) {
      expect(BigInt(r.totalCop)).toBe(expected);
      expect(r.conversionDriftBoundCop).toBe(Math.floor(fxQty / 2));
    }
  });
});

describe('VAL-2 — valuationTrend (contracts.md §11)', () => {
  it('[VAL-2.Q1] 40,000 → 45,000 over 30 days is +12.50 %, with the market change and the "current cards" label', async () => {
    await owner();
    await entry(db, { id: id('e1'), collectionId: id('coll1'), catalogEntryId: id('char'), acquiredAt: '2026-08-01' });
    const { w, val } = setup({ [id('char')]: [{ observedAt: at(-40 * DAY), cop: 40_000 }, { observedAt: at(-DAY), cop: 45_000 }] });
    const result = await val.valuationTrend({ collectionId: id('coll1'), period: 30, actorId: id('valentina') });
    expect(result).toMatchObject({ period: 30, start: new Date(w.clock.now().getTime() - 30 * DAY).toISOString(), valueAtStartCop: 40_000, valueNowCop: 45_000, changeCop: 5_000, changePercentHundredths: 1_250, marketChangePercentHundredths: 1_250, label: 'current-cards-were-worth' });
  });

  it('[VAL-2.I1] a zero baseline (empty, all unpriced, all new) is null with ValuationNoBaseline, never NaN or Infinity (NFR-VAL-1)', async () => {
    await owner();
    await collection(db, { id: id('unpriced'), ownerId: id('valentina'), name: 'Sin precio' });
    await entry(db, { id: id('u1'), collectionId: id('unpriced'), catalogEntryId: id('nopr') });
    await collection(db, { id: id('new'), ownerId: id('valentina'), name: 'Nuevas' });
    await entry(db, { id: id('n1'), collectionId: id('new'), catalogEntryId: id('char'), acquiredAt: '2026-09-30' });
    const { val } = setup({ [id('char')]: [{ observedAt: at(-40 * DAY), cop: 40_000 }] });
    for (const c of [id('coll1'), id('unpriced'), id('new')]) {
      const r = await val.valuationTrend({ collectionId: c, period: 30, actorId: id('valentina') });
      expect(r.changePercentHundredths).toBeNull();
      expect(Number.isFinite(r.changeCop)).toBe(true);
      explainAssert(r.decision, { code: 'ValuationNoBaseline', rule: 'FR-VAL-2', inputs: { valueAtStartCop: 0 } });
    }
  });

  it('[VAL-2.P2] a 14-day period is InvalidValuationPeriod (400)', async () => {
    await owner();
    expect(codeOf(await caught(() => setup().val.valuationTrend({ collectionId: id('coll1'), period: 14 as 30, actorId: id('valentina') })))).toBe('InvalidValuationPeriod');
  });

  it('[VAL-2.I3] rounding is half away from zero and symmetric: 3 → 4 is +33.33 %, 30,000 → 29,999 is 0 (never −0) (AD-VAL-2 rule 3)', async () => {
    await owner();
    await entry(db, { id: id('e1'), collectionId: id('coll1'), catalogEntryId: id('a'), acquiredAt: '2026-08-01' });
    await collection(db, { id: id('c2'), ownerId: id('valentina'), name: 'Dos' });
    await entry(db, { id: id('e2'), collectionId: id('c2'), catalogEntryId: id('b'), acquiredAt: '2026-08-01' });
    const { val } = setup({ [id('a')]: [{ observedAt: at(-40 * DAY), cop: 3 }, { observedAt: at(-DAY), cop: 4 }], [id('b')]: [{ observedAt: at(-40 * DAY), cop: 30_000 }, { observedAt: at(-DAY), cop: 29_999 }] });
    expect((await val.valuationTrend({ collectionId: id('coll1'), period: 30, actorId: id('valentina') })).changePercentHundredths).toBe(3_333);
    expect(Object.is((await val.valuationTrend({ collectionId: id('c2'), period: 30, actorId: id('valentina') })).changePercentHundredths, 0)).toBe(true);
  });
});

describe('VAL-3 — valuationHistory (contracts.md §11)', () => {
  it('[VAL-3.Q1] one point per Bogotá day, and a card acquired 12 days ago steps the series up by exactly its value on that date', async () => {
    await owner();
    await entry(db, { id: id('old'), collectionId: id('coll1'), catalogEntryId: id('char'), acquiredAt: '2026-08-01' });
    await entry(db, { id: id('new'), collectionId: id('coll1'), catalogEntryId: id('pika'), qty: 2, acquiredAt: '2026-09-19' });
    const { val } = setup({ [id('char')]: [{ observedAt: at(-60 * DAY), cop: 40_000 }], [id('pika')]: [{ observedAt: at(-60 * DAY), cop: 9_000 }] });
    const { points } = await val.valuationHistory({ collectionId: id('coll1'), days: 30, actorId: id('valentina') });
    expect(points).toHaveLength(30);
    const byDate = new Map(points.map((p) => [p.date, p.valueCop]));
    expect(byDate.get('2026-09-18')).toBe(40_000);
    expect(byDate.get('2026-09-19')).toBe(58_000);
  });

  it('[VAL-3.Q4] with no priced entry the series is empty, explained', async () => {
    await owner();
    await entry(db, { id: id('e1'), collectionId: id('coll1'), catalogEntryId: id('nopr') });
    const result = await setup().val.valuationHistory({ collectionId: id('coll1'), days: 30, actorId: id('valentina') });
    expect(result.points).toEqual([]);
    explainAssert(result.decision, { rule: 'FR-VAL-4', inputs: { pricedEntries: 0 } });
  });

  it('[VAL-3.I2] a day with no new observation carries the last price forward, marked stale after 36 h, never interpolated', async () => {
    await owner();
    await entry(db, { id: id('e1'), collectionId: id('coll1'), catalogEntryId: id('char'), acquiredAt: '2026-08-01' });
    const { val } = setup({ [id('char')]: [{ observedAt: '2026-09-20T15:00:00.000Z', cop: 40_000 }, { observedAt: '2026-09-25T15:00:00.000Z', cop: 50_000 }] });
    const { points } = await val.valuationHistory({ collectionId: id('coll1'), days: 12, actorId: id('valentina') });
    const p = (d: string) => points.find((x) => x.date === d);
    expect(p('2026-09-22')).toEqual({ date: '2026-09-22', valueCop: 40_000, stale: true });
    expect(p('2026-09-25')).toMatchObject({ valueCop: 50_000 });
  });

  it('[VAL-3.P1] another owner’s collection is CollectionNotFound', async () => {
    await owner();
    await user(db, { id: id('julian') });
    expect(codeOf(await caught(() => setup().val.valuationHistory({ collectionId: id('coll1'), days: 30, actorId: id('julian') })))).toBe('CollectionNotFound');
  });
});
