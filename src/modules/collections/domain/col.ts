// Core domain — COL. Pure (AD-SYS-6).
import { NotImplementedError } from '../../../shared-kernel/errors.js';

export type PromptStatus = 'Pending' | 'Accepted' | 'Dismissed';

/** AD-COL-1 rule 1 (G-2): the most collections an owner may keep. */
export const COLLECTION_LIMIT = 50;

/** AD-COL-1 rule 2: the collection a first-use add targets. */
export const GENERAL_COLLECTION = 'General';

/** AD-COL-1 rule 5: floor(owned × 100 / count), null when count = 0. */
export function completionPercent(_ownedDistinct: number, _cardEntryCount: number): number | null {
  throw new NotImplementedError('collections.domain.completionPercent');
}

/** AD-COL-2 rule 2: the America/Bogota calendar date (YYYY-MM-DD) of an instant (UTC−5, no daylight saving). */
export function bogotaDate(instant: Date): string {
  return new Date(instant.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
}

/** COL-3 P2 (C-GAP-2): a calendar date after today in Bogotá; today itself is allowed. Dates compare as `YYYY-MM-DD` strings. */
export function isAfterToday(date: string, now: Date): boolean {
  return date > bogotaDate(now);
}

/** COL-3 P1: a calendar date `YYYY-MM-DD` that names a real day Postgres can store (year 0001 on; it has no year 0). */
export function isCalendarDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '0001-01-01') return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

/** COL-2 P2: an ISO 8601 UTC instant, as the outbox writes it (`YYYY-MM-DDTHH:mm:ss.sssZ`). */
export function isIsoInstant(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value)) return false;
  const ms = Date.parse(value);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 19) === value.slice(0, 19);
}

/** The most copies one `"CollectionEntry"` holds (its `qty` CHECK). */
export const MAX_ENTRY_QTY = 999;

/** COL-1 Q2 (decision log Impl-1 #36, R1): a line's copies as entry quantities of at most 999 each, in order. */
export function entryQuantities(qty: number): number[] {
  const parts: number[] = [];
  for (let left = qty; left > 0; left -= MAX_ENTRY_QTY) parts.push(Math.min(left, MAX_ENTRY_QTY));
  return parts;
}
