import { describe, expect, it } from 'vitest';
import { textIssue } from './text.js';

describe('textIssue (decision log Impl-1 #38)', () => {
  it('refuses a NUL at any length, before the length', () => {
    expect(textIssue('ab\u0000cd', 0, 10)).toBe('nul');
    expect(textIssue('\u0000', 0, 0)).toBe('nul');
  });

  it('counts the minimum after trim and the maximum as written, in code points', () => {
    expect(textIssue('          ', 10, 500)).toBe('length');
    expect(textIssue('  abcdefghij  ', 10, 14)).toBeNull();
    expect(textIssue('  abcdefghij  ', 10, 13)).toBe('length');
    expect(textIssue('🃏'.repeat(3), 3, 3)).toBeNull();
    expect(textIssue('   ', 0, 3)).toBeNull();
    expect(textIssue('', 0, 1000)).toBeNull();
    expect(textIssue('', 1, 60)).toBe('length');
  });
});
