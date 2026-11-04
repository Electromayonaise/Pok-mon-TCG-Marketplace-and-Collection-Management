// COL's pure rules: the Bogotá calendar date, the future-date check and the date shape; completion, the link rule,
// the binder order and the wishlist order (Story 11.5).
import { describe, expect, it } from 'vitest';
import { AVAILABILITY_BATCH, binderOrder, type BinderSortable, bogotaDate, chunks, completionPercent, entryQuantities, invalidLinkField, isAfterToday, isCalendarDate, isIsoInstant, isLayoutSize, isSafeHttpsUrl, wishlistOrder } from './domain/col.js';

describe('bogotaDate (AD-COL-2 rule 2)', () => {
  it('is the UTC−5 calendar date, so an instant before 05:00 UTC is the previous day', () => {
    expect(bogotaDate(new Date('2026-10-01T03:30:00.000Z'))).toBe('2026-09-30');
    expect(bogotaDate(new Date('2026-10-01T05:00:00.000Z'))).toBe('2026-10-01');
  });
});

describe('isAfterToday (COL-3 P2, C-GAP-2)', () => {
  it('refuses tomorrow in Bogotá and allows today, even when UTC has already moved on', () => {
    const now = new Date('2026-10-02T02:00:00.000Z'); // 2026-10-01 21:00 in Bogotá
    expect(isAfterToday('2026-10-01', now)).toBe(false);
    expect(isAfterToday('2026-10-02', now)).toBe(true);
    expect(isAfterToday('2025-01-31', now)).toBe(false);
  });
});

describe('isCalendarDate', () => {
  it('accepts a real YYYY-MM-DD day only', () => {
    expect(['2026-02-28', '2024-02-29'].map(isCalendarDate)).toEqual([true, true]);
    expect(['2026-02-29', '2026-13-01', '2026-1-01', '', '0000-01-01'].map(isCalendarDate)).toEqual([false, false, false, false, false]);
    expect(isCalendarDate('0001-01-01')).toBe(true);
  });
});

describe('isIsoInstant (COL-2 P2)', () => {
  it('accepts the outbox\'s UTC instant only', () => {
    expect(['2026-10-01T03:30:00.000Z', '2026-10-01T03:30:00Z'].map(isIsoInstant)).toEqual([true, true]);
    expect(['10/01/2026', '2026', '2026-10-01', '2026-10-01T03:30:00+05:00', '2026-02-30T00:00:00Z'].map(isIsoInstant)).toEqual([false, false, false, false, false]);
  });
});

describe('entryQuantities (COL-1 Q2, R1)', () => {
  it('splits a line into entries of at most 999 copies', () => {
    expect(entryQuantities(1)).toEqual([1]);
    expect(entryQuantities(999)).toEqual([999]);
    expect(entryQuantities(2000)).toEqual([999, 999, 2]);
  });
});

describe('completionPercent (AD-COL-1 rule 5, S-FR-COL-5)', () => {
  it('is floor(owned × 100 / count): 37/191 is 19 %, a full set is 100 %, and it never passes 100 %', () => {
    expect([completionPercent(37, 191), completionPercent(191, 191), completionPercent(0, 10), completionPercent(2, 3)]).toEqual([19, 100, 0, 66]);
    expect(completionPercent(12, 10)).toBe(100);
  });

  it('is null for a set with 0 card entries, never a division', () => {
    expect([completionPercent(0, 0), completionPercent(3, 0)]).toEqual([null, null]);
  });
});

describe('isSafeHttpsUrl and invalidLinkField (S-FR-COL-3, AD-COL-1 rule 4, R-28)', () => {
  const padded = (length: number) => `https://promos.example/${'a'.repeat(length - 'https://promos.example/'.length)}`;

  it('accepts a plain https link, with a port, a query and a fragment, up to exactly 2,048 characters', () => {
    expect(['https://promos.example/pikachu', 'https://promos.example:8443/a?b=c#d', 'https://xn--pkmon-dsa.example/', padded(2_048)].map(isSafeHttpsUrl)).toEqual([true, true, true, true]);
  });

  it('refuses every other scheme, case or shape: javascript:, data:, http://, HTTP://, HTTPS://, //host, userinfo, an empty host, whitespace, a control character, a backslash, 2,049 characters', () => {
    const refused = [
      'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'http://promos.example/a', 'HTTP://promos.example/a', 'HTTPS://promos.example/a',
      '//promos.example/a', 'https://user:pass@promos.example/a', 'https://@promos.example/a', 'https://', 'https:///promos.example/a', 'https://?q=1',
      'https://promos.example/a b', ' https://promos.example/a', 'https://promos.example/a\n', 'https://promos.example/\u0000', 'https://promos.example\\evil.example/',
      'https://[::1', padded(2_049),
    ];
    expect(refused.filter(isSafeHttpsUrl)).toEqual([]);
  });

  it('names the first failing field: url before imageUrl; a null imageUrl is allowed', () => {
    expect(invalidLinkField({ url: 'https://promos.example/a', imageUrl: null })).toBeNull();
    expect(invalidLinkField({ url: 'https://promos.example/a', imageUrl: 'https://img.example/a.png' })).toBeNull();
    expect(invalidLinkField({ url: 'https://promos.example/a', imageUrl: 'http://img.example/a.png' })).toBe('imageUrl');
    expect(invalidLinkField({ url: 'javascript:alert(1)', imageUrl: 'javascript:alert(1)' })).toBe('url');
  });
});

describe('binderOrder (S-FR-COL-5, AD-COL-1 rule 5)', () => {
  const e = (entryId: string, o: Partial<BinderSortable> = {}): BinderSortable => ({
    entryId, cardKind: 'catalog', title: 'Pikachu', setId: 'set-a', number: '1', acquiredAt: '2026-09-01', acquiredPriceCop: 1_000, manualPosition: 0, ...o,
  });
  const ids = (entries: BinderSortable[], keys: Parameters<typeof binderOrder>[1]) => binderOrder(entries, keys).map((x) => x.entryId);

  it('breaks every tie by entryId, whatever order the entries were read in', () => {
    const tied = [e('eb'), e('ec'), e('ea')];
    expect(ids(tied, ['acquiredAt'])).toEqual(['ea', 'eb', 'ec']);
    expect(ids([...tied].reverse(), ['acquiredAt'])).toEqual(['ea', 'eb', 'ec']);
  });

  it('with no keys is the manual order, then entryId', () => {
    expect(ids([e('e1', { manualPosition: 2 }), e('e2', { manualPosition: 0 }), e('e0', { manualPosition: 2 })], [])).toEqual(['e2', 'e0', 'e1']);
  });

  it('sorts by set then card number as read ("2" before "10"); link-added entries go last by title; a card the catalog lost goes after its set', () => {
    const entries = [
      e('x1', { cardKind: 'external', title: 'Zapdos promo', setId: null, number: null }),
      e('c3', { setId: 'set-b', number: '1' }),
      e('c2', { setId: 'set-a', number: '10' }),
      e('c1', { setId: 'set-a', number: '2' }),
      e('x0', { cardKind: 'external', title: 'arcanine promo', setId: null, number: null }),
      e('c0', { setId: null, number: null, title: 'Carta fuera del catálogo' }),
      e('c4', { setId: 'set-a', number: null }),
    ];
    expect(ids(entries, ['setNumber'])).toEqual(['c1', 'c2', 'c4', 'c3', 'c0', 'x0', 'x1']);
  });

  it('sorts names ignoring case and accents, then the next key, then entryId', () => {
    const entries = [e('n1', { title: 'Éevee', acquiredAt: '2026-09-02' }), e('n2', { title: 'eevee', acquiredAt: '2026-09-01' }), e('n0', { title: 'Abra' }), e('n3', { title: 'eevee', acquiredAt: '2026-09-01' })];
    expect(ids(entries, ['name', 'acquiredAt'])).toEqual(['n0', 'n2', 'n3', 'n1']);
  });

  it('sorts by price paid with unknown prices last, and by acquisition date', () => {
    const entries = [e('p0', { acquiredPriceCop: null, acquiredAt: '2026-01-01' }), e('p1', { acquiredPriceCop: 5_000, acquiredAt: '2026-03-01' }), e('p2', { acquiredPriceCop: 0, acquiredAt: '2026-02-01' }), e('p3', { acquiredPriceCop: null, acquiredAt: '2026-01-01' })];
    expect(ids(entries, ['acquiredPriceCop'])).toEqual(['p2', 'p1', 'p0', 'p3']);
    expect(ids(entries, ['acquiredAt', 'acquiredPriceCop'])).toEqual(['p0', 'p3', 'p2', 'p1']);
  });

  it('never reorders its input array', () => {
    const entries = [e('b'), e('a')];
    binderOrder(entries, ['manual']);
    expect(entries.map((x) => x.entryId)).toEqual(['b', 'a']);
  });
});

describe('the layout bounds, the batch chunks and the wishlist order (S-FR-COL-5, S-FR-COL-6)', () => {
  it('allows 1–5 rows or columns only', () => {
    expect([0, 1, 3, 5, 6, 2.5].map(isLayoutSize)).toEqual([false, true, true, true, false, false]);
  });

  it('cuts ids into calls of at most 500', () => {
    expect(chunks(Array.from({ length: 1_001 }, (_, i) => i), AVAILABILITY_BATCH).map((c) => c.length)).toEqual([500, 500, 1]);
    expect(chunks([], AVAILABILITY_BATCH)).toEqual([]);
  });

  it('puts the cheapest first and unavailable cards last, ties by catalog id', () => {
    const rows = [{ catalogEntryId: 'c', lowestPriceCop: null }, { catalogEntryId: 'b', lowestPriceCop: 42_000 }, { catalogEntryId: 'a', lowestPriceCop: null }, { catalogEntryId: 'd', lowestPriceCop: 42_000 }, { catalogEntryId: 'e', lowestPriceCop: 9_000 }];
    expect(wishlistOrder(rows).map((r) => r.catalogEntryId)).toEqual(['e', 'b', 'd', 'a', 'c']);
  });
});
