// MSG-1 P2: the body's NFC normalization and bounds, and the clientMessageId pattern (FR-MSG-5, Solu-1 GAP-3).
import { describe, expect, it } from 'vitest';
import { CLIENT_MESSAGE_ID, normalizeBody } from './domain/msg.js';

describe('normalizeBody (FR-MSG-5)', () => {
  it('normalizes to NFC and counts code points, as the schema does', () => {
    expect(normalizeBody('Ñandú')).toBe('Ñandú');
    expect(normalizeBody('😀'.repeat(2000))).toBe('😀'.repeat(2000));
    expect(normalizeBody('x'.repeat(2000))).toHaveLength(2000);
  });

  it('refuses an empty body and one over 2,000 code points', () => {
    expect(normalizeBody('')).toBeNull();
    expect(normalizeBody('x'.repeat(2001))).toBeNull();
  });
});

describe('CLIENT_MESSAGE_ID (GAP-3)', () => {
  it('accepts 1–64 characters of [A-Za-z0-9_-] only', () => {
    expect(CLIENT_MESSAGE_ID.test('cm-1_A')).toBe(true);
    expect(CLIENT_MESSAGE_ID.test('x'.repeat(64))).toBe(true);
    expect(CLIENT_MESSAGE_ID.test('x'.repeat(65))).toBe(false);
    expect(CLIENT_MESSAGE_ID.test('')).toBe(false);
    expect(CLIENT_MESSAGE_ID.test('cm 1')).toBe(false);
  });
});
