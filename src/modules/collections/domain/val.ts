// Core domain — VAL. Pure BigInt arithmetic (AD-SYS-7, AD-VAL-1). No floats, no Math.round.
import { NotImplementedError } from '../../../shared-kernel/errors.js';

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

/** FR-VAL-2: true iff period ∈ {7, 30, 90, 365}. */
export function isValuationPeriod(_period: number): _period is ValuationPeriod {
  throw new NotImplementedError('collections.domain.isValuationPeriod');
}

/** AD-VAL-1 rules 2–4: exact BigInt valuation. */
export function valueEntries(_entries: readonly ValuationEntry[]): ValuationResult {
  throw new NotImplementedError('collections.domain.valueEntries');
}

/** ADD-§2.2: sign(n) × floor((|n| × 2 + base) / (2 × base)), n = (current − base) × 10000; null when base = 0. */
export function changePercentHundredths(_base: bigint, _current: bigint): bigint | null {
  throw new NotImplementedError('collections.domain.changePercentHundredths');
}
