import { describe, expect, it } from 'vitest';
import { CUID_PATTERN } from '../types.js';
import { CuidIds } from './cuid-ids.js';

describe('CuidIds', () => {
  it('issues distinct ids that satisfy CUID_PATTERN (and so the schema check tezg_is_cuid)', () => {
    const ids = new CuidIds();
    const issued = Array.from({ length: 2_000 }, () => ids.next());
    expect(issued.filter((id) => !CUID_PATTERN.test(id))).toEqual([]);
    expect(new Set(issued).size).toBe(issued.length);
  });
});
