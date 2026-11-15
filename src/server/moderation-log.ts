// The admin moderation audit (UX 11.4, S-FR-REP-6, AD-REP-3 rule 5; Story 13.5): `reviews` and `listings` each serve
// their own log, newest first by `(at desc, id)`, and the admin view merges the two pages here. Neither module reads the
// other's table (AD-8), and no edge joins them (ARCH §6.12, alternative 3).
import type { ListingModerationLogRow } from '../modules/listings/index.js';
import type { ReviewModerationLogRow } from '../modules/reviews/index.js';

/** One merged row: which log it came from, and the row as that module served it. */
export type ModerationLogEntry =
  | { kind: 'review'; at: string; logId: string; row: ReviewModerationLogRow }
  | { kind: 'listing'; at: string; logId: string; row: ListingModerationLogRow };

/** AD-REP-3 rule 5: the merged view's page size. */
export const MODERATION_LOG_PAGE = 50;

/** `(at desc, id desc)`: the order each module's log query already reads in. */
const newerFirst = (a: ModerationLogEntry, b: ModerationLogEntry): number =>
  a.at === b.at ? (a.logId < b.logId ? 1 : a.logId > b.logId ? -1 : 0) : a.at < b.at ? 1 : -1;

/**
 * Merges a page of each log into one page of at most `limit` rows, newest first by `(at desc, id desc)`. Each input
 * is already in that order, so the merge interleaves them by time and never reorders a module's own rows.
 */
export function mergeModerationLogs(reviews: readonly ReviewModerationLogRow[], listings: readonly ListingModerationLogRow[], limit = MODERATION_LOG_PAGE): ModerationLogEntry[] {
  const entries: ModerationLogEntry[] = [
    ...reviews.map((row) => ({ kind: 'review' as const, at: row.at, logId: row.logId, row })),
    ...listings.map((row) => ({ kind: 'listing' as const, at: row.at, logId: row.logId, row })),
  ];
  return entries.sort(newerFirst).slice(0, limit);
}
