// VAL's pure rules: the exact BigInt valuation, its branded input, the safe-integer boundary, the rounding and the daily
// series (AD-VAL-1, AD-VAL-2, AD-SYS-7).
import { describe, expect, it } from 'vitest';
import {
  addDays, assertSafeInteger, changePercentHundredths, chunks, isValuationPeriod, referencePrice, roundHalfAwayFromZero, series, valueEntries, type ValuationEntry,
} from './domain/val.js';
import type { Cop } from '../../shared-kernel/types.js';

const priced = (entryId: string, cop: number, qty: number, o: { stale?: boolean; fx?: boolean } = {}): ValuationEntry => ({
  entryId, cardKind: 'catalog', qty: BigInt(qty), price: referencePrice({ cop, stale: o.stale ?? false, copDerivation: o.fx ? 'fxDerived' : 'sourceNative' }),
});

describe('valueEntries (AD-VAL-1 rules 2–4)', () => {
  it('sums cop × qty over priced entries, explains external and unpriced ones, and counts stale ones', () => {
    const result = valueEntries([
      priced('a', 45_000, 2), priced('b', 9_999, 1, { stale: true }),
      { entryId: 'c', cardKind: 'catalog', qty: 1n, price: null }, { entryId: 'd', cardKind: 'external', qty: 3n, price: null },
    ]);
    expect(result).toEqual({
      totalCop: 99_999n, valuedCount: 2, staleCount: 1, conversionDriftBoundCop: 0n,
      notValued: [{ entryId: 'c', reasonCode: 'NoReferencePrice' }, { entryId: 'd', reasonCode: 'ExternalEntryNotInCatalog' }],
    });
  });

  it('values an empty collection at 0 with no valued entry', () => {
    expect(valueEntries([])).toEqual({ totalCop: 0n, valuedCount: 0, notValued: [], staleCount: 0, conversionDriftBoundCop: 0n });
  });

  it('reports ⌊Σ qty(fxDerived) / 2⌋ as the drift bound and never applies it to the total', () => {
    const result = valueEntries([priced('a', 1_001, 3, { fx: true }), priced('b', 7, 2, { fx: true }), priced('c', 5, 4)]);
    expect(result.conversionDriftBoundCop).toBe(2n);
    expect(result.totalCop).toBe(3_003n + 14n + 20n);
  });

  it('accepts only a ReferencePrice: a listing Cop does not type-check (AD-VAL-1 rule 5, FR-VAL-5)', () => {
    const listingPrice = 45_000 as Cop;
    // @ts-expect-error a listing's Cop is not a ReferencePriceInput
    const entry: ValuationEntry = { entryId: 'x', cardKind: 'catalog', qty: 1n, price: listingPrice };
    expect(entry.entryId).toBe('x');
  });
});

describe('assertSafeInteger (Solu-1 review E-20)', () => {
  it('passes a safe total and refuses one above Number.MAX_SAFE_INTEGER as Unexpected', () => {
    expect(assertSafeInteger(BigInt(Number.MAX_SAFE_INTEGER), 'totalCop')).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => assertSafeInteger(BigInt(Number.MAX_SAFE_INTEGER) + 1n, 'totalCop')).toThrow(/safe integer/);
  });
});

describe('chunks (AD-VAL-1 rule 1)', () => {
  it('splits 1,001 ids into 500, 500 and 1, and no ids into no chunk', () => {
    expect(chunks(Array.from({ length: 1_001 }, (_, i) => i)).map((c) => c.length)).toEqual([500, 500, 1]);
    expect(chunks([])).toEqual([]);
  });
});

describe('isValuationPeriod (FR-VAL-2, AD-VAL-2 rule 1)', () => {
  it('allows 7, 30, 90 and 365 days and nothing else', () => {
    expect([7, 30, 90, 365].every(isValuationPeriod)).toBe(true);
    expect([0, 1, 14, 31, 366, 30.5, Number.NaN].some(isValuationPeriod)).toBe(false);
  });
});

describe('roundHalfAwayFromZero and changePercentHundredths (AD-VAL-2 rule 3)', () => {
  it('rounds ±0.5 away from zero at both signs, and a zero result is 0, never −0', () => {
    expect(roundHalfAwayFromZero(5n, 2n)).toBe(3n);
    expect(roundHalfAwayFromZero(-5n, 2n)).toBe(-3n);
    expect(roundHalfAwayFromZero(4n, 10n)).toBe(0n);
    expect(Object.is(Number(roundHalfAwayFromZero(-4n, 10n)), 0)).toBe(true);
    expect(() => roundHalfAwayFromZero(1n, 0n)).toThrow(/positive denominator/);
  });

  it('is null on a zero baseline and symmetric: change(b, b + d) = −change(b, b − d)', () => {
    expect(changePercentHundredths(0n, 45_000n)).toBeNull();
    expect(changePercentHundredths(40_000n, 45_000n)).toBe(1_250n);
    for (const [b, d] of [[3n, 1n], [30_000n, 1n], [7n, 3n], [999n, 500n]] as const) {
      expect(changePercentHundredths(b, b + d)).toBe(-changePercentHundredths(b, b - d)!);
    }
  });
});

describe('series (AD-VAL-2 rule 5, VAL-3 Q1–Q2)', () => {
  const now = new Date('2026-10-01T15:00:00.000Z'); // 10:00 on 2026-10-01 in Bogotá

  it('is empty with no priced entry', () => {
    expect(series([{ qty: 1n, acquiredAt: '2026-09-01', observations: [] }], 30, now)).toEqual([]);
  });

  it('starts at the earliest priced acquisition inside the window and ends today, one point per day', () => {
    const points = series([{ qty: 1n, acquiredAt: '2026-09-28', observations: [{ observedAt: '2026-09-01T15:00:00.000Z', cop: 100 }] }], 30, now);
    expect(points.map((p) => p.date)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01']);
    expect(series([{ qty: 1n, acquiredAt: '2025-01-01', observations: [{ observedAt: '2025-01-01T15:00:00.000Z', cop: 1 }] }], 365, now)).toHaveLength(365);
  });

  it('never prices a day before the first observation, and counts an observation at 04:59 UTC on the previous Bogotá day', () => {
    const points = series([{ qty: 2n, acquiredAt: '2026-09-01', observations: [{ observedAt: '2026-09-30T04:59:00.000Z', cop: 500 }] }], 3, now);
    expect(points).toEqual([
      { date: '2026-09-29', valueCop: 1_000n, stale: false },
      { date: '2026-09-30', valueCop: 1_000n, stale: false },
      { date: '2026-10-01', valueCop: 1_000n, stale: false },
    ]);
    expect(series([{ qty: 1n, acquiredAt: '2026-09-01', observations: [{ observedAt: '2026-09-30T15:00:00.000Z', cop: 7 }] }], 3, now)[0]).toEqual({ date: '2026-09-29', valueCop: 0n, stale: false });
  });

  it('judges today against now, not the end of the day', () => {
    // 37 h before now is stale now; 35 h before now is not, though both are over 36 h old at today's end.
    expect(series([{ qty: 1n, acquiredAt: '2026-09-01', observations: [{ observedAt: '2026-09-30T02:00:00.000Z', cop: 1 }] }], 1, now)[0]!.stale).toBe(true);
    expect(series([{ qty: 1n, acquiredAt: '2026-09-01', observations: [{ observedAt: '2026-09-30T04:00:00.000Z', cop: 1 }] }], 1, now)[0]!.stale).toBe(false);
  });

  it('adds days across a month and a year end', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
