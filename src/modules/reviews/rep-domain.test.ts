// The pure REP domain (AD-SYS-6): the target rule of REP-1 P3 and the BigInt half-up average of REP-3 Q1 (ADD-§2.9).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { averageTenths, reviewableKind } from './domain/rep.js';

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
