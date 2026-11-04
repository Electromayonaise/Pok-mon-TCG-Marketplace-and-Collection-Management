// The merged moderation audit (S-FR-REP-6, AD-REP-3 rule 5; Story 13.5): two logs, each newest first, become one page.
import { describe, expect, it } from 'vitest';
import type { ListingModerationLogRow } from '../modules/listings/index.js';
import type { ReviewModerationLogRow } from '../modules/reviews/index.js';
import { mergeModerationLogs } from './moderation-log.js';

const at = (minute: number) => new Date(Date.UTC(2026, 9, 1, 15, minute)).toISOString();
const reviewRow = (logId: string, minute: number): ReviewModerationLogRow =>
  ({ logId, reviewId: 'r', action: 'hide', reasonCode: 'Spam', adminId: 'a', ratingSnapshot: 1, textSnapshot: 't', at: at(minute) });
const listingRow = (logId: string, minute: number): ListingModerationLogRow =>
  ({ logId, listingId: 'l', action: 'hide', reasonCode: 'Counterfeit', adminId: 'a', titleSnapshot: 'Charizard ex', at: at(minute) });

describe('mergeModerationLogs (AD-REP-3 rule 5)', () => {
  it('interleaves both logs by time, newest first, with the id breaking a tie at one instant', () => {
    const merged = mergeModerationLogs([reviewRow('r3', 30), reviewRow('r1', 10)], [listingRow('l4', 40), listingRow('l2b', 20), listingRow('l2a', 20)]);
    expect(merged.map((e) => [e.kind, e.logId])).toEqual([['listing', 'l4'], ['review', 'r3'], ['listing', 'l2b'], ['listing', 'l2a'], ['review', 'r1']]);
  });

  it('keeps at most one page, and an empty log leaves the other as it was', () => {
    const many = Array.from({ length: 60 }, (_, i) => reviewRow(`r${String(i).padStart(2, '0')}`, 59 - i));
    expect(mergeModerationLogs(many, [])).toHaveLength(50);
    expect(mergeModerationLogs([], [listingRow('l1', 1)], 50).map((e) => e.row)).toEqual([listingRow('l1', 1)]);
    expect(mergeModerationLogs([reviewRow('same', 5)], [listingRow('same', 5)]).map((e) => e.kind).sort()).toEqual(['listing', 'review']);
  });

  it('breaks a tie at one instant by the id across the two logs, and a smaller limit keeps the newest rows of both', () => {
    const merged = mergeModerationLogs([reviewRow('m2', 7), reviewRow('m0', 7)], [listingRow('m3', 7), listingRow('m1', 7)]);
    expect(merged.map((e) => [e.kind, e.logId])).toEqual([['listing', 'm3'], ['review', 'm2'], ['listing', 'm1'], ['review', 'm0']]);
    expect(mergeModerationLogs([reviewRow('r9', 9), reviewRow('r1', 1)], [listingRow('l5', 5), listingRow('l2', 2)], 3).map((e) => e.logId)).toEqual(['r9', 'l5', 'l2']);
  });
});
