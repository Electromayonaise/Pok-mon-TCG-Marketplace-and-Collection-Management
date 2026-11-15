// CatServiceV2's prices and reads, the edges the bound tests leave out. getPriceProvenance (CAT-3): input order,
// no observation, a zero baseline, duplicate ids. fetchTrm and getFxRate (S-FR-CAT-8, AD-CAT-3): a stored row, an
// identical and a mismatched re-fetch, a throwing source, and a date with no rate at all.
// browseCatalog and the §15.11 ports: nameQuery's prefix and escaping, the facets, paging, the
// bounds, getEntry's 404, input order, asOf staleness and the history's from ≤ to.
// Split from cat.v2.test.ts by the Impl-2 test review (HIGH-5); the shared Given steps are in test-support/suites/cat.ts.
import { describe, expect, it } from 'vitest';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, httpOf } from '../../../../test-support/errors.js';
import { FixtureFeedSource, FixtureFxRateSource } from '../../../../test-support/simulated/index.js';
import { at, catalogEntry, catalogSet, DAY, explainAssert, feedRun, fxRate, HOUR, id, observation, rows, wiring } from '../../../../test-support/solu2/fixtures.js';
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import { CatServiceV2 } from './cat.v2.js';
import { useCatSuite } from '../../../../test-support/suites/cat.js';

const { db, setup } = useCatSuite();

describe('CatServiceV2.getPriceProvenance (CAT-3)', () => {
  it('answers in input order: no observation reads null, and a zero baseline gives no trend', async () => {
    await catalogEntry(db, id('none'));
    await catalogEntry(db, id('zero'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('zero'), cop: 0, observedAt: at(-40 * DAY), runId: id('run1') });
    await observation(db, { id: id('o2'), catalogEntryId: id('zero'), cop: 5_000, observedAt: at(-HOUR), runId: id('run1') });
    const { items } = await setup().cat.getPriceProvenance({ catalogEntryIds: [id('zero'), id('none')], period: 30 });
    expect(items.map((i) => i.catalogEntryId)).toEqual([id('zero'), id('none')]);
    expect(items[0]).toMatchObject({ freshness: 'fresh', trend: { referencePriceAtStart: { cop: 0 }, changePercentHundredths: null } });
    explainAssert(items[0]!.trend.decision, { code: 'TrendNoBaseline', rule: 'FR-CAT-6' });
    expect(items[1]).toMatchObject({ lastTransactionReference: null, freshness: null, trend: { changePercentHundredths: null } });
    explainAssert(items[1]!.decision, { code: 'ReferencePriceMissing', outcome: 'allowed', rule: 'FR-CAT-5' });
  });

  it('refuses duplicate ids, and cites every unknown id', async () => {
    await catalogEntry(db, id('pika'));
    const { cat } = setup();
    expect(codeOf(await caught(() => cat.getPriceProvenance({ catalogEntryIds: [id('pika'), id('pika')], period: 30 })))).toBe('RequestValidationFailed');
    const error = await caught(() => cat.getPriceProvenance({ catalogEntryIds: [id('pika'), id('g1'), id('g2')], period: 7 }));
    explainAssert(error, { code: 'CatalogEntryNotFound', rule: 'FR-CAT-5', inputs: { missingIds: `${id('g1')},${id('g2')}` } });
    expect(codeOf(await caught(() => cat.getPriceProvenance({ catalogEntryIds: [id('pika')], period: 14 as 30 })))).toBe('RequestValidationFailed');
  });
});

describe('CatServiceV2.fetchTrm and getFxRate (S-FR-CAT-8, AD-CAT-3)', () => {
  const RATE = { valor: '4130.005', validFrom: '2026-10-01', validTo: '2026-10-01' };
  const yesterday = () => fxRate(db, { id: id('fx0'), copPerUsdCentavos: 412_337, validFrom: '2026-09-30' });

  it("stores the source's row as delivered, rounded half-up to centavos, with one audit row", async () => {
    const { cat } = setup(undefined, new FixtureFxRateSource([RATE]));
    expect((await cat.fetchTrm({ trigger: 'daily-morning' })).outcome).toBe('stored');
    expect(await db.query(`SELECT "copPerUsdCentavos"::text AS c, "validFrom"::text AS f FROM "FxRate"`)).toEqual([{ c: '413001', f: '2026-10-01' }]);
    expect(await rows(db, 'audit_events', `action = 'catalog.fxRate.stored'`)).toHaveLength(1);
    expect(await cat.getFxRate({ date: '2026-10-01' })).toMatchObject({ copPerUsdCentavos: 413_001, stale: false, decision: { reasonCode: 'FxRateCovered' } });
  });

  it('a weekend range that overlaps a stored day with another value keeps the stored row and is logged', async () => {
    await fxRate(db, { id: id('fx1'), copPerUsdCentavos: 412_900, validFrom: '2026-09-29', validTo: '2026-09-30' });
    const { cat } = setup(undefined, new FixtureFxRateSource([{ ...RATE, validFrom: '2026-09-29' }]));
    const result = await cat.fetchTrm({ trigger: 'tick' });
    expect(result.outcome).toBe('mismatchKept');
    explainAssert(result.decision, { code: 'FxRateSourceMismatch', rule: 'FR-CAT-8', inputs: { storedCopPerUsdCentavos: 412_900, storedValidFrom: '2026-09-29' } });
    expect(await rows(db, 'FxRate')).toHaveLength(1);
    expect(await rows(db, 'audit_events', `action = 'catalog.fxRate.sourceMismatch'`)).toMatchObject([{ aggregateId: id('fx1') }]);
  });

  it('the same value over another range is still a kept mismatch (decision log Impl-1 #29)', async () => {
    await fxRate(db, { id: id('fx1'), copPerUsdCentavos: 413_001, validFrom: '2026-09-30' });
    const { cat } = setup(undefined, new FixtureFxRateSource([{ ...RATE, validFrom: '2026-09-30', validTo: '2026-10-02' }]));
    expect((await cat.fetchTrm({ trigger: 'tick' })).outcome).toBe('mismatchKept');
  });

  it('a delivered row that is unordered or does not cover today is sourceUnavailable; a missing adapter propagates', async () => {
    for (const bad of [{ ...RATE, validFrom: '2026-10-02', validTo: '2026-10-01' }, { ...RATE, validFrom: '2026-09-30', validTo: '2026-09-30' }]) {
      const fx = new FixtureFxRateSource([bad]);
      fx.getRateCovering = async () => ({ ...bad, source: 'fixture' });
      expect((await setup(undefined, fx).cat.fetchTrm({ trigger: 'tick' })).outcome).toBe('sourceUnavailable');
    }
    expect(await rows(db, 'FxRate')).toHaveLength(0);
    const unwired = { getRateCovering: async () => { throw new NotImplementedError('fx.getRateCovering'); } } as unknown as FixtureFxRateSource;
    expect(codeOf(await caught(() => setup(undefined, unwired).cat.fetchTrm({ trigger: 'admin' })))).toBe('NotImplementedError');
  });

  it('a re-fetch that races a stored identical row is alreadyCovered and writes nothing', async () => {
    const fx = new FixtureFxRateSource([RATE]);
    const racing = { getRateCovering: async (date: string) => {
      const r = await fx.getRateCovering(date);
      await fxRate(db, { id: id('fxr'), copPerUsdCentavos: 413_001, validFrom: '2026-10-01', fetchedAt: at(0) });
      return r;
    } };
    const w = wiring(db);
    const result = await new CatServiceV2({ ...w, feed: new FixtureFeedSource({ current: [], previous: [], defects: [], renamed: [] }), fx: racing }).fetchTrm({ trigger: 'admin' });
    expect(result.outcome).toBe('alreadyCovered');
    expect(await rows(db, 'FxRate')).toHaveLength(1);
    expect(await rows(db, 'audit_events')).toHaveLength(0);
  });

  it('a source that throws is sourceUnavailable, and a date with no rate at all is Unexpected', async () => {
    const { cat } = setup(undefined, { getRateCovering: async () => { throw new Error('timeout'); } } as unknown as FixtureFxRateSource);
    expect((await cat.fetchTrm({ trigger: 'tick' })).outcome).toBe('sourceUnavailable');
    expect(await rows(db, 'FxRate')).toHaveLength(0);
    expect(codeOf(await caught(() => cat.getFxRate({ date: '2026-10-01' })))).toBe('Unexpected');
    expect(codeOf(await caught(() => cat.getFxRate({ date: '2026-02-30' })))).toBe('RequestValidationFailed');
    await yesterday();
    expect(await cat.getFxRate({ date: '2026-10-03' })).toMatchObject({ validFrom: '2026-09-30', stale: true });
  });
});

describe('CatServiceV2.browseCatalog (S-FR-CAT-1)', () => {
  async function catalog(): Promise<void> {
    await catalogSet(db, { id: id('seta'), code: 'A' });
    await catalogSet(db, { id: id('setb'), code: 'B' });
    const entry = (key: string, setId: string, name: string, n: number, kind: 'card' | 'sealedProduct' = 'card') =>
      catalogEntry(db, id(key), { externalKey: key, setId, kind, name, number: String(n), numberSort: n });
    await entry('e1', id('seta'), 'Pikachu', 2);
    await entry('e2', id('seta'), 'Pikachú ex', 1);
    await entry('e3', id('setb'), 'Pika_100%', 1);
    await entry('e4', id('setb'), 'Caja Pikachu', 2, 'sealedProduct');
  }

  it('nameQuery is an accent-blind prefix whose % and _ are literal; facets count the matched set', async () => {
    await catalog();
    const { cat } = setup();
    const pika = await cat.browseCatalog({ filters: { nameQuery: 'PIKACHU' }, page: 1, pageSize: 24 });
    expect(pika.entries.map((e) => e.catalogEntryId)).toEqual([id('e2'), id('e1')]);
    expect(pika.facets).toEqual([{ name: 'setId', values: [{ value: id('seta'), count: 2 }] }, { name: 'kind', values: [{ value: 'card', count: 2 }] }]);
    expect((await cat.browseCatalog({ filters: { nameQuery: 'pika_' }, page: 1, pageSize: 24 })).entries.map((e) => e.catalogEntryId)).toEqual([id('e3')]);
    expect((await cat.browseCatalog({ filters: { nameQuery: '%' }, page: 1, pageSize: 24 })).total).toBe(0);
  });

  it('pages in (setId, numberSort, id) order with the total of every page, and refuses page 0 and pageSize 101', async () => {
    await catalog();
    const { cat } = setup();
    const second = await cat.browseCatalog({ filters: {}, page: 2, pageSize: 3 });
    expect([second.entries.map((e) => e.catalogEntryId), second.total]).toEqual([[id('e4')], 4]);
    expect(Object.keys(second.entries[0]!)).not.toContain('numberSort');
    expect(codeOf(await caught(() => cat.browseCatalog({ filters: {}, page: 0, pageSize: 3 })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => cat.browseCatalog({ filters: {}, page: 1, pageSize: 101 })))).toBe('RequestValidationFailed');
  });
});

describe('CatServiceV2 offered ports (contracts.md §15.11)', () => {
  it('getEntry raises CatalogEntryNotFound (404); the batch ports keep input order and refuse 0 or 501 ids', async () => {
    await catalogEntry(db, id('b'));
    await catalogEntry(db, id('a'));
    const { cat } = setup();
    const error = await caught(() => cat.getEntry({ catalogEntryId: id('ghost') }));
    expect([codeOf(error), httpOf(error)]).toEqual(['CatalogEntryNotFound', 404]);
    expect((await cat.getEntries({ catalogEntryIds: [id('b'), id('a'), id('b')] })).entries.map((e) => e.catalogEntryId)).toEqual([id('b'), id('a')]);
    expect(codeOf(await caught(() => cat.getEntries({ catalogEntryIds: [] })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => cat.resolveItemRefs({ refs: Array.from({ length: 501 }, (_, k) => id(`r${k}`)) })))).toBe('RequestValidationFailed');
  });

  it('asOf ages a price relative to asOf, and a missing price is null and not stale', async () => {
    await catalogEntry(db, id('char'));
    await catalogEntry(db, id('none'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('char'), cop: 40_000, observedAt: at(-3 * DAY), runId: id('run1') });
    const { prices } = await setup().cat.getReferencePricesAsOf({ catalogEntryIds: [id('none'), id('char')], asOf: at(-2 * DAY) });
    expect(prices).toEqual([{ catalogEntryId: id('none'), price: null, stale: false }, expect.objectContaining({ catalogEntryId: id('char'), stale: false })]);
    expect((await setup().cat.getReferencePricesAsOf({ catalogEntryIds: [id('char')], asOf: at(0) })).prices[0]?.stale).toBe(true);
    expect(codeOf(await caught(() => setup().cat.getReferencePricesAsOf({ catalogEntryIds: [id('char')], asOf: 'ayer' })))).toBe('RequestValidationFailed');
  });

  it('the history refuses from after to, and an entry with no observation has an empty series', async () => {
    await catalogEntry(db, id('none'));
    const { cat } = setup();
    expect(codeOf(await caught(() => cat.getPriceHistory({ catalogEntryIds: [id('none')], from: at(0), to: at(-DAY) })))).toBe('RequestValidationFailed');
    expect(await cat.getPriceHistory({ catalogEntryIds: [id('none')], from: at(-DAY), to: at(0) })).toEqual({ series: [{ catalogEntryId: id('none'), observations: [] }] });
  });
});
