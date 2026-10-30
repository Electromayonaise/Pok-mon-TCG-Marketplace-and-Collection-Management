// Core domain — VAL. Pure BigInt arithmetic (AD-SYS-7, AD-VAL-1). No floats, no Math.round.
import { UnexpectedError } from '../../../shared-kernel/errors.js';
import { bogotaDate } from './col.js';

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
export function isValuationPeriod(period: number): period is ValuationPeriod {
  return period === 7 || period === 30 || period === 90 || period === 365;
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

/**
 * AD-VAL-2 rule 3: `num / den` rounded half away from zero, in BigInt. BigInt division truncates toward zero,
 * so the magnitude is rounded and the sign restored; a zero result is 0n, never −0.
 */
export function roundHalfAwayFromZero(num: bigint, den: bigint): bigint {
  if (den <= 0n) throw new UnexpectedError(`collections: roundHalfAwayFromZero needs a positive denominator, got ${den}`);
  const q = ((num < 0n ? -num : num) * 2n + den) / (2n * den);
  return num < 0n ? -q : q;
}

/** ADD-§2.2: sign(n) × floor((|n| × 2 + base) / (2 × base)), n = (current − base) × 10000; null when base = 0. */
export function changePercentHundredths(base: bigint, current: bigint): bigint | null {
  return base === 0n ? null : roundHalfAwayFromZero((current - base) * 10_000n, base);
}

/** FR-CAT-7: a price strictly older than 36 h at the instant it is read is stale. */
export const FRESHNESS_MS = 36 * 3_600_000;
const DAY_MS = 86_400_000;
/** America/Bogota is UTC−5 with no daylight saving: a Bogotá day starts at 05:00 UTC. */
const BOGOTA_OFFSET_MS = 5 * 3_600_000;

/** The Bogotá calendar date `n` days after `date` (YYYY-MM-DD); `n` may be negative. */
export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** The UTC instant (ms) at which the Bogotá calendar day `date` starts. */
export function bogotaDayStart(date: string): number {
  return Date.parse(`${date}T00:00:00.000Z`) + BOGOTA_OFFSET_MS;
}

/** One entry of the history: its quantity, its acquisition date and its card's observations, oldest first (AD-CAT-2 rule 5). */
export interface HistoryEntry {
  qty: bigint;
  acquiredAt: string;
  observations: readonly { observedAt: string; cop: number }[];
}

export interface HistoryPoint { date: string; valueCop: bigint; stale: boolean }

/**
 * AD-VAL-2 rule 5, VAL-3 Q1–Q2: one point per Bogotá day from `max(earliest acquiredAt of a priced entry,
 * today − days + 1)` to today. A day's value sums `cop × qty` over the entries acquired on or before it whose card has
 * an observation at or before the day's end (`now` for today): the last price carried forward, never interpolated.
 * A point is stale when a price it sums is older than 36 h at that instant. No priced entry → no point.
 */
export function series(entries: readonly HistoryEntry[], days: number, now: Date): HistoryPoint[] {
  const priced = entries.filter((e) => e.observations.length > 0).map((e) => ({ ...e, times: e.observations.map((o) => Date.parse(o.observedAt)), next: 0 }));
  if (priced.length === 0) return [];
  const today = bogotaDate(now);
  const earliest = priced.reduce((min, e) => (e.acquiredAt < min ? e.acquiredAt : min), priced[0]!.acquiredAt);
  const windowStart = addDays(today, -(days - 1));
  const points: HistoryPoint[] = [];
  for (let date = earliest > windowStart ? earliest : windowStart; date <= today; date = addDays(date, 1)) {
    const end = Math.min(bogotaDayStart(addDays(date, 1)), now.getTime());
    let valueCop = 0n;
    let stale = false;
    for (const e of priced) {
      // Days only move forward, so each entry's pointer only advances past observations at or before the day's end.
      while (e.next < e.times.length && e.times[e.next]! <= end) e.next++;
      if (e.acquiredAt > date || e.next === 0) continue;
      valueCop += BigInt(e.observations[e.next - 1]!.cop) * e.qty;
      if (end - e.times[e.next - 1]! > FRESHNESS_MS) stale = true;
    }
    points.push({ date, valueCop, stale });
  }
  return points;
}
