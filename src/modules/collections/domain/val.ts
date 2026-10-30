// Core domain — VAL. Pure BigInt arithmetic (AD-SYS-7, AD-VAL-1). No floats, no Math.round.
import { NotImplementedError, UnexpectedError } from '../../../shared-kernel/errors.js';

export type ValuationPeriod = 7 | 30 | 90 | 365;

/** A reference price as VAL receives it. Deliberately not assignable from a listing's Cop. */
export interface ReferencePriceInput {
  readonly __brand: 'ReferencePrice';
  cop: bigint;
  stale: boolean;
  copDerivation: 'sourceNative' | 'fxDerived';
}

export interface ValuationEntry {
  entryId: string;
  cardKind: 'catalog' | 'external';
  qty: bigint;
  price: ReferencePriceInput | null;
}

export interface ValuationResult {
  totalCop: bigint;
  valuedCount: number;
  notValued: { entryId: string; reasonCode: 'ExternalEntryNotInCatalog' | 'NoReferencePrice' }[];
  staleCount: number;
  conversionDriftBoundCop: bigint;
}

/** AD-VAL-1 rule 1: the most catalog ids one `getReferencePricesAsOf` or `getPriceHistory` call takes. */
export const PRICE_CHUNK = 500;

/** AD-VAL-1 rule 5: the only way a catalog observation becomes a valuation input. */
export function referencePrice(p: { cop: number; stale: boolean; copDerivation: 'sourceNative' | 'fxDerived' }): ReferencePriceInput {
  return { __brand: 'ReferencePrice', cop: BigInt(p.cop), stale: p.stale, copDerivation: p.copDerivation };
}

/** Solu-1 review E-20: a COP amount crosses the wire as a safe integer, else the read is 'Unexpected'. */
export function assertSafeInteger(value: bigint, what: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < -BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new UnexpectedError(`collections: ${what} ${value} is outside the safe integer range`);
  }
  return Number(value);
}

/** `items` in consecutive slices of at most `size`. */
export function chunks<T>(items: readonly T[], size: number = PRICE_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** FR-VAL-2: true iff period ∈ {7, 30, 90, 365}. */
export function isValuationPeriod(_period: number): _period is ValuationPeriod {
  throw new NotImplementedError('collections.domain.isValuationPeriod');
}

/** AD-VAL-1 rules 2–4: exact BigInt valuation. */
export function valueEntries(entries: readonly ValuationEntry[]): ValuationResult {
  let totalCop = 0n;
  let fxQty = 0n;
  let valuedCount = 0;
  let staleCount = 0;
  const notValued: ValuationResult['notValued'] = [];
  for (const e of entries) {
    if (e.cardKind === 'external') notValued.push({ entryId: e.entryId, reasonCode: 'ExternalEntryNotInCatalog' });
    else if (e.price === null) notValued.push({ entryId: e.entryId, reasonCode: 'NoReferencePrice' });
    else {
      totalCop += e.price.cop * e.qty;
      valuedCount++;
      if (e.price.stale) staleCount++;
      if (e.price.copDerivation === 'fxDerived') fxQty += e.qty;
    }
  }
  return { totalCop, valuedCount, notValued, staleCount, conversionDriftBoundCop: fxQty / 2n };
}

/** ADD-§2.2: sign(n) × floor((|n| × 2 + base) / (2 × base)), n = (current − base) × 10000; null when base = 0. */
export function changePercentHundredths(_base: bigint, _current: bigint): bigint | null {
  throw new NotImplementedError('collections.domain.changePercentHundredths');
}
