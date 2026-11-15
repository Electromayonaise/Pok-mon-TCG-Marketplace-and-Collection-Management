// The pure REP domain (AD-SYS-6): the target rule of REP-1 P3, the BigInt half-up average of REP-3 Q1 (ADD-§2.9), and the
// admin search's LIKE escaping and keyset cursors (S-FR-REP-6, AD-REP-3 rules 4–5; Story 13.5).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { averageTenths, decodeReviewCursor, encodeReviewCursor, escapeLike, purchaseVerifiedFor, reviewableKind } from './domain/rep.js';

describe('reviewableKind (AD-REP-1 rule 1)', () => {
  it('an individual seller and an Approved business are reviewable; an unverified business and no seller are not', () => {
    expect(reviewableKind({ kind: 'individual', verified: false })).toBe('individual');
    expect(reviewableKind({ kind: 'business', verified: true })).toBe('business');
    expect(reviewableKind({ kind: 'business', verified: false })).toBeNull();
    expect(reviewableKind({ kind: 'none', verified: false })).toBeNull();
  });
});

describe('averageTenths (ADD-§2.9, REP-3 Q1)', () => {
  it('rounds half up: 5, 4, 4 → 43; 4, 5 → 45; 1, 2 → 15; no review → null', () => {
    expect(averageTenths(13n, 3n)).toBe(43n);
    expect(averageTenths(9n, 2n)).toBe(45n);
    expect(averageTenths(3n, 2n)).toBe(15n);
    expect(averageTenths(0n, 0n)).toBeNull();
    expect(() => averageTenths(-1n, 1n)).toThrow(RangeError);
  });

  it('is the exact half-up rounding of 10 × sum / count for any ratings, far beyond a float’s range', () => {
    fc.assert(fc.property(fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 200 }), fc.bigInt({ min: 1n, max: 10n ** 15n }), (ratings, scale) => {
      const count = BigInt(ratings.length) * scale;
      const sum = BigInt(ratings.reduce((a, b) => a + b, 0)) * scale;
      const t = averageTenths(sum, count)!;
      // t = floor(10·sum/count + 1/2)  ⇔  2·count·t ≤ 20·sum + count < 2·count·(t + 1).
      expect(2n * count * t <= 20n * sum + count && 20n * sum + count < 2n * count * (t + 1n)).toBe(true);
      expect(t >= 10n && t <= 50n).toBe(true);
    }), { numRuns: 1_000 });
  });
});

/** Escapes a character for a RegExp source. */
const reLiteral = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The SQL `LIKE … ESCAPE` (backslash) semantics, as a reference: `%` any run, `_` one character, a backslash quotes the next. */
function likeMatches(text: string, pattern: string): boolean {
  let source = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === '\\') source += reLiteral(pattern[++i] ?? '');
    else if (c === '%') source += '[\\s\\S]*';
    else if (c === '_') source += '[\\s\\S]';
    else source += reLiteral(c);
  }
  return new RegExp(`^${source}$`).test(text);
}

describe('escapeLike (AD-REP-3 rule 4, EC-34)', () => {
  it('escapes the backslash, % and _ so each matches only itself', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
    expect(escapeLike('c:\\x')).toBe('c:\\\\x');
    expect(escapeLike('Excelente vendedor')).toBe('Excelente vendedor');
    expect(likeMatches('Precio 100% justo', `%${escapeLike('100%')}%`)).toBe(true);
    expect(likeMatches('Precio 1000 justo', `%${escapeLike('100%')}%`)).toBe(false);
  });

  it('makes LIKE an exact substring test for any query and text', () => {
    const chars = fc.constantFrom('a', 'b', '%', '_', '\\', ' ');
    fc.assert(fc.property(fc.string({ unit: chars, maxLength: 12 }), fc.string({ unit: chars, minLength: 1, maxLength: 4 }), (text, query) => {
      expect(likeMatches(text, `%${escapeLike(query)}%`)).toBe(text.includes(query));
    }), { numRuns: 1_000 });
  });
});

describe('review keyset cursors (S-FR-REP-6)', () => {
  const at = '2026-10-01T14:00:00.000Z';
  const rowId = 'a00000000000000000000001';
  const raw = (s: string) => Buffer.from(s, 'utf8').toString('base64url');

  it('round-trips the keyset of its own list', () => {
    expect(decodeReviewCursor('log', encodeReviewCursor('log', at, rowId))).toEqual({ at, id: rowId });
    expect(decodeReviewCursor('search', encodeReviewCursor('search', at, rowId))).toEqual({ at, id: rowId });
  });

  it('refuses another list’s cursor, a foreign shape, a bad id and a non-canonical instant', () => {
    expect(decodeReviewCursor('search', encodeReviewCursor('log', at, rowId))).toBeNull();
    expect(decodeReviewCursor('log', raw(`log|${at}|${rowId}|x`))).toBeNull();
    expect(decodeReviewCursor('log', raw(`log|${at}`))).toBeNull();
    expect(decodeReviewCursor('log', raw(`log||${rowId}`))).toBeNull();
    expect(decodeReviewCursor('log', raw(`log|${at}|NOT-A-CUID`))).toBeNull();
    expect(decodeReviewCursor('log', raw(`log|not-a-date|${rowId}`))).toBeNull();
    expect(decodeReviewCursor('log', raw(`log|2026-10-01T14:00:00Z|${rowId}`))).toBeNull();
  });
});

describe('purchaseVerifiedFor (AD-REP-1 rule 2, REP-1 I1)', () => {
  it('a business review is snapshotted verified, an individual seller\'s never is', () => {
    expect([purchaseVerifiedFor('business'), purchaseVerifiedFor('individual')]).toEqual([true, false]);
  });
});
