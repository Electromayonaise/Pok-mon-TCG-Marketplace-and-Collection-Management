// VAL's pure rules: the exact BigInt valuation, its branded input and the safe-integer boundary (AD-VAL-1, AD-SYS-7).
import { describe, expect, it } from 'vitest';
import { assertSafeInteger, chunks, referencePrice, valueEntries, type ValuationEntry } from './domain/val.js';
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
