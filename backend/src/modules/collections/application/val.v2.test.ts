// ValServiceV2 against Postgres: the edges the ATDD tests leave out — the like-for-like market change (R1) and the safe-integer
// percentages of the Epic 12 close review (decision log Impl-1 #37).
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught } from '../../../../test-support/errors.js';
import { at, collection, DAY, entry, fake, id, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import type { CatalogForVal } from '../ports/val.v2.js';
import { ValServiceV2 } from './val.v2.js';

const db = useTestDatabase();

/** A catalog whose as-of read answers from fixed observations: catalog id → (observedAt, cop)[]. */
function val(prices: Record<string, { observedAt: string; cop: number }[]>) {
  const catalog = fake<CatalogForVal>('catalog', {
    getReferencePricesAsOf: async ({ catalogEntryIds, asOf }) => ({
      prices: catalogEntryIds.map((c) => {
        const o = (prices[c] ?? []).filter((x) => x.observedAt <= asOf).at(-1);
        return { catalogEntryId: c, stale: false, price: o ? { usdCents: null, cop: o.cop, observedAt: o.observedAt, source: 'fixture', copDerivation: 'sourceNative' as const, fxRateDate: null } : null };
      }),
    }),
  });
  return new ValServiceV2({ ...wiring(db), catalog });
}

describe('valuationTrend (VAL-2 Q2, AD-VAL-2 rule 4)', () => {
  it('leaves a card first priced after the start out of the market change, but not out of the change (R1)', async () => {
    await user(db, { id: id('valentina') });
    await collection(db, { id: id('coll1'), ownerId: id('valentina') });
    await entry(db, { id: id('e1'), collectionId: id('coll1'), catalogEntryId: id('char'), acquiredAt: '2026-08-01' });
    await entry(db, { id: id('e2'), collectionId: id('coll1'), catalogEntryId: id('late'), acquiredAt: '2026-08-01', position: 1 });
    const result = await val({ [id('char')]: [{ observedAt: at(-40 * DAY), cop: 40_000 }, { observedAt: at(-DAY), cop: 44_000 }], [id('late')]: [{ observedAt: at(-DAY), cop: 40_000 }] })
      .valuationTrend({ collectionId: id('coll1'), period: 30, actorId: id('valentina') });
    expect(result).toMatchObject({ valueAtStartCop: 40_000, valueNowCop: 84_000, changePercentHundredths: 11_000, marketChangePercentHundredths: 1_000 });
  });

  it('refuses a percentage beyond 2^53 − 1 as Unexpected instead of losing precision', async () => {
    await user(db, { id: id('valentina') });
    await collection(db, { id: id('coll1'), ownerId: id('valentina') });
    await entry(db, { id: id('e1'), collectionId: id('coll1'), catalogEntryId: id('a'), qty: 2, acquiredAt: '2026-08-01' });
    const error = await caught(() => val({ [id('a')]: [{ observedAt: at(-40 * DAY), cop: 1 }, { observedAt: at(-DAY), cop: 1_000_000_000_000 }] })
      .valuationTrend({ collectionId: id('coll1'), period: 30, actorId: id('valentina') }));
    // 2 → 2 × 10^12 is 9,999,999,999,990,000 hundredths of a percent: over 2^53 − 1, while every COP amount is still safe.
    expect(codeOf(error)).toBe('Unexpected');
  });
});
