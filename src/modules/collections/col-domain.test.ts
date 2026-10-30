// COL's pure rules: the Bogotá calendar date, the future-date check and the date shape.
import { describe, expect, it } from 'vitest';
import { bogotaDate, entryQuantities, isAfterToday, isCalendarDate, isIsoInstant } from './domain/col.js';

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
