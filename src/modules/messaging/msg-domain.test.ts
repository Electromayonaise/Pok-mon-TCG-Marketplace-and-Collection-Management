// MSG-1 P2: the body's NFC normalization and bounds, and the clientMessageId pattern (FR-MSG-5, Solu-1 GAP-3).
// Story 9.6: the read-state rules (clamp, unread, mute) and the inbox cursor (AD-MSG-3, decision log Impl-2 #15).
import { describe, expect, it } from 'vitest';
import { clampReadSeq, CLIENT_MESSAGE_ID, decodeInboxCursor, encodeInboxCursor, isSeq, muteChange, normalizeBody, readMarkAdvances, unreadOf } from './domain/msg.js';

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

describe('read state (AD-MSG-3 rules 1–2; Story 9.6)', () => {
  it('isSeq accepts whole numbers from 0 only', () => {
    expect([0, 1, 2 ** 53 - 1].map(isSeq)).toEqual([true, true, true]);
    expect([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53].map(isSeq)).toEqual([false, false, false, false, false]);
  });

  it('a read mark is clamped to lastSeq, and unread is lastSeq − lastReadSeq, never negative', () => {
    expect([clampReadSeq(3, 5), clampReadSeq(9, 5), clampReadSeq(5, 5)]).toEqual([3, 5, 5]);
    expect([unreadOf(5, 2), unreadOf(5, 5), unreadOf(3, 4)]).toEqual([3, 0, 0]);
  });

  it('a read mark moves only forward: a stale tab, the same seq or a seq past the last message already read writes nothing', () => {
    // lastSeq 5, lastReadSeq 3: 4 and 5 move it, and 9 moves it to 5; 3 (the same) and 1 (a stale tab) do not.
    expect([4, 5, 9, 3, 1, 0].map((seq) => readMarkAdvances(seq, 5, 3))).toEqual([true, true, true, false, false, false]);
    // Everything read already (lastReadSeq = lastSeq): even a tab ahead of the server moves nothing.
    expect([readMarkAdvances(7, 5, 5), readMarkAdvances(0, 0, 0)]).toEqual([false, false]);
  });

  it('a buyer mute sets or clears mutedAt; a business mute is a no-op (C-GAP-4)', () => {
    const now = '2026-10-01T15:00:00.000Z';
    expect(muteChange('buyer', true, now)).toEqual({ kind: 'set', mutedAt: now });
    expect(muteChange('buyer', false, now)).toEqual({ kind: 'set', mutedAt: null });
    expect(muteChange('business', true, now)).toEqual({ kind: 'businessNoOp' });
  });
});

describe('the inbox cursor (decision log Impl-2 #15)', () => {
  const actor = 'camilax00000000000000000';
  const conversationId = 'c1x000000000000000000000';
  const raw = (text: string) => Buffer.from(text, 'utf8').toString('base64url');

  it('round-trips a key with an instant and one with no message yet', () => {
    for (const key of [{ lastMessageAt: '2026-10-01T15:00:00.000Z', conversationId }, { lastMessageAt: null, conversationId }]) {
      expect(decodeInboxCursor(encodeInboxCursor(actor, key), actor)).toEqual(key);
    }
  });

  it('refuses another reader\'s cursor, another tag, a malformed instant or id, extra parts, and noise', () => {
    const cursor = encodeInboxCursor(actor, { lastMessageAt: null, conversationId });
    expect(decodeInboxCursor(cursor, 'julianx00000000000000000')).toBeNull();
    expect(decodeInboxCursor(raw(`ledger|${actor}|-|${conversationId}`), actor)).toBeNull();
    expect(decodeInboxCursor(raw(`inbox|${actor}|2026-10-01|${conversationId}`), actor)).toBeNull();
    expect(decodeInboxCursor(raw(`inbox|${actor}|-|C1`), actor)).toBeNull();
    expect(decodeInboxCursor(raw(`inbox|${actor}|-|${conversationId}|x`), actor)).toBeNull();
    expect(decodeInboxCursor(raw(`inbox|${actor}|-`), actor)).toBeNull();
    expect(decodeInboxCursor('not-a-cursor', actor)).toBeNull();
  });
});
