// Core domain — COL. Pure (AD-SYS-6).

export type PromptStatus = 'Pending' | 'Accepted' | 'Dismissed';

/** AD-COL-1 rule 1 (G-2): the most collections an owner may keep. */
export const COLLECTION_LIMIT = 50;

/** AD-COL-1 rule 2: the collection a first-use add targets. */
export const GENERAL_COLLECTION = 'General';

/**
 * AD-COL-1 rule 5: floor(owned × 100 / count) in integers, null when the set has no card entries: the count is never
 * divided by when it is 0. `owned` is a subset of the count, so the result is 0–100.
 */
export function completionPercent(ownedDistinct: number, cardEntryCount: number): number | null {
  if (cardEntryCount <= 0) return null;
  return Math.floor((Math.min(ownedDistinct, cardEntryCount) * 100) / cardEntryCount);
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

// ---------------------------------------------------------------- S-FR-COL-3: external links (AD-COL-1 rule 4, R-28)

/** S-FR-COL-3 P: the longest `url` or `imageUrl`, in code points (the `CollectionEntry` CHECK's `char_length`). */
export const MAX_URL_LENGTH = 2_048;

/** A character no stored link may hold: whitespace, an ASCII control character, or a backslash (URL parsers fold it into `/`). */
const UNSAFE_URL_CHAR = /[\s\\\p{Cc}]/u;

/**
 * S-FR-COL-3 (AD-COL-1 rule 4, R-28): a plain https link the browser may open or load, never a scripted one. It starts
 * with the lowercase `https://` the database CHECK requires (so `HTTP://`, `javascript:`, `data:` and a scheme-relative
 * `//host` fail), holds at most 2,048 code points and no whitespace, control character or backslash, and parses as an
 * https URL with a host and no userinfo (`https://user:pass@host` hides the real host behind a trusted-looking name).
 */
export function isSafeHttpsUrl(value: string): boolean {
  if (!value.startsWith('https://') || [...value].length > MAX_URL_LENGTH || UNSAFE_URL_CHAR.test(value)) return false;
  const authority = value.slice('https://'.length).split(/[/?#]/, 1)[0]!;
  if (authority === '' || authority.includes('@')) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname !== '';
  } catch {
    return false;
  }
}

/** S-FR-COL-3: the first failing link field, or null when both links are safe (`imageUrl` is optional). */
export function invalidLinkField(link: { url: string; imageUrl: string | null }): 'url' | 'imageUrl' | null {
  if (!isSafeHttpsUrl(link.url)) return 'url';
  if (link.imageUrl !== null && !isSafeHttpsUrl(link.imageUrl)) return 'imageUrl';
  return null;
}

// ---------------------------------------------------------------- S-FR-COL-5: the binder (AD-COL-1 rule 5)

/** S-FR-COL-5: at most three sort keys; `entryId` always breaks the last tie. */
export const MAX_SORT_KEYS = 3;

/** S-FR-COL-5 P: the binder's rows and columns are each 1–5 (the `Collection` CHECK). */
export const isLayoutSize = (n: number): boolean => Number.isSafeInteger(n) && n >= 1 && n <= 5;

export type BinderOrderKey = 'setNumber' | 'name' | 'acquiredAt' | 'acquiredPriceCop' | 'manual';

/** What the binder order reads of one entry; catalog attributes are null for a link-added entry or a card the catalog no longer has. */
export interface BinderSortable {
  entryId: string;
  cardKind: 'catalog' | 'external';
  title: string;
  setId: string | null;
  number: string | null;
  acquiredAt: string;
  acquiredPriceCop: number | null;
  manualPosition: number;
}

/** Names and card numbers compare as people read them: accents and case aside, "2" before "10". */
const READING_ORDER = new Intl.Collator('es-CO', { sensitivity: 'base', numeric: true });

const byValue = (a: string | number, b: string | number): number => (a < b ? -1 : a > b ? 1 : 0);

/** A comparison where a missing value sorts after every present one. */
function nullsLast<T extends string | number>(a: T | null, b: T | null, compare: (x: T, y: T) => number): number {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
  return compare(a, b);
}

function compareBy(key: BinderOrderKey, a: BinderSortable, b: BinderSortable): number {
  switch (key) {
    case 'setNumber':
      // FR-COL-5: for a catalog-attribute key, link-added entries go after the catalog ones, by title.
      if (a.cardKind !== b.cardKind) return a.cardKind === 'catalog' ? -1 : 1;
      if (a.cardKind === 'external') return READING_ORDER.compare(a.title, b.title);
      return nullsLast(a.setId, b.setId, byValue) || nullsLast(a.number, b.number, READING_ORDER.compare);
    case 'name':
      return READING_ORDER.compare(a.title, b.title);
    case 'acquiredAt':
      return byValue(a.acquiredAt, b.acquiredAt);
    case 'acquiredPriceCop':
      return nullsLast(a.acquiredPriceCop, b.acquiredPriceCop, byValue);
    case 'manual':
      return a.manualPosition - b.manualPosition;
  }
}

/** S-FR-COL-5 P: a binder sort of at most `MAX_SORT_KEYS` keys, none of them repeated. */
export function isBinderSort(sort: readonly BinderOrderKey[]): boolean {
  return sort.length <= MAX_SORT_KEYS && new Set(sort).size === sort.length;
}

/** S-FR-COL-5.reorder: a manual order that names every entry of the collection exactly once, and nothing else. */
export function isExactOrder(ordered: readonly string[], current: readonly string[]): boolean {
  const have = new Set(current);
  const named = new Set(ordered);
  return named.size === ordered.length && named.size === have.size && ordered.every((e) => have.has(e));
}

/**
 * S-FR-COL-5 (AD-COL-1 rule 5): the binder order, ascending on each key in turn, then `entryId`, so two reads of the
 * same entries give the same order whatever order they were read in. No keys means the manual order.
 */
export function binderOrder<T extends BinderSortable>(entries: readonly T[], keys: readonly BinderOrderKey[]): T[] {
  const chain: readonly BinderOrderKey[] = keys.length === 0 ? ['manual'] : keys;
  return [...entries].sort((a, b) => {
    for (const key of chain) {
      const c = compareBy(key, a, b);
      if (c !== 0) return c;
    }
    return byValue(a.entryId, b.entryId);
  });
}

// ---------------------------------------------------------------- S-FR-COL-6: the wishlist

/** P-INV.availability: the most catalog ids one availability call carries. */
export const AVAILABILITY_BATCH = 500;

/** `items` cut into consecutive chunks of at most `size`. */
export function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** FR-COL-6: the wishlist by lowest price; an unavailable card (no price) sorts last, then by catalog id. */
export function wishlistOrder<T extends { catalogEntryId: string; lowestPriceCop: number | null }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => nullsLast(a.lowestPriceCop, b.lowestPriceCop, byValue) || byValue(a.catalogEntryId, b.catalogEntryId));
}
