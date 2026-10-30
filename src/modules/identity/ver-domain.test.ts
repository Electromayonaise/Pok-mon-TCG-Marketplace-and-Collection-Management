// VER-2 P2 and P5–P7: the DIAN NIT check digit (the ADD-§2.5 vectors), the CC length, and the
// submission verdict judged from the latest application's snapshot only (AD-VER-3, FR-VER-6).
// MSG-3's eligibility mapping. S-FR-VER-7's copy, S-FR-VER-2's queue cursor and S-FR-VER-5.audit's access-log cursor.
import { describe, expect, it } from 'vitest';
import { decodeAccessLogCursor, decodeQueueCursor, encodeAccessLogCursor, encodeQueueCursor, evaluateSubmission, isValidCc, isValidNit, messagingEligibility, nitCheckDigit, verificationCopy } from './domain/ver.js';

describe('nitCheckDigit / isValidNit (ADD-§2.5)', () => {
  it.each([
    ['800197268', 4], ['890903938', 8], ['860034313', 7], ['900373913', 4],
    ['811001234', 3], ['79123456', 0], ['1020304050', 8], ['900123456', 8],
  ])('the body %s has the check digit %i', (body, digit) => {
    expect(nitCheckDigit(body)).toBe(digit);
    expect(isValidNit(`${body}${digit}`)).toBe(true);
  });

  it('refuses a wrong check digit, a body outside 6–10 digits and anything but digits', () => {
    expect(isValidNit('8001972685')).toBe(false);
    expect(isValidNit('9001234563')).toBe(false);
    expect(isValidNit('123450')).toBe(false);
    expect(isValidNit('123456789012')).toBe(false);
    expect(isValidNit('800.197.268-4')).toBe(false);
  });
});

describe('isValidCc', () => {
  it.each([['123456', true], ['1234567890', true], ['12345', false], ['12345678901', false], ['12a456', false]] as const)('%s is %s', (n, ok) => {
    expect(isValidCc(n)).toBe(ok);
  });
});

describe('evaluateSubmission (FR-VER-1, FR-VER-6)', () => {
  const now = new Date('2026-10-01T15:00:00Z');
  const rejected = (o: { reapplyBarred?: boolean; reapplyNotBefore?: Date | null } = {}) =>
    ({ status: 'Rejected' as const, reapplyBarred: false, reapplyNotBefore: null, ...o });

  it('a first application is allowed', () => {
    expect(evaluateSubmission(null, now)).toBe('allowed');
  });

  it('a Pending or Approved latest application refuses', () => {
    expect(evaluateSubmission({ status: 'Pending', reapplyBarred: false, reapplyNotBefore: null }, now)).toBe('ApplicationAlreadyPending');
    expect(evaluateSubmission({ status: 'Approved', reapplyBarred: false, reapplyNotBefore: null }, now)).toBe('AlreadyVerifiedBusiness');
  });

  it('a barred rejection refuses before its cooldown is looked at', () => {
    expect(evaluateSubmission(rejected({ reapplyBarred: true, reapplyNotBefore: new Date(now.getTime() - 1) }), now)).toBe('ReapplicationBarred');
  });

  it('the cooldown is half-open: refused 1 ms before reapplyNotBefore, allowed at the instant and with no cooldown', () => {
    expect(evaluateSubmission(rejected({ reapplyNotBefore: new Date(now.getTime() + 1) }), now)).toBe('ReapplicationCooldownActive');
    expect(evaluateSubmission(rejected({ reapplyNotBefore: now }), now)).toBe('allowed');
    expect(evaluateSubmission(rejected(), now)).toBe('allowed');
  });
});

describe('verificationCopy (S-FR-VER-7)', () => {
  it('names the copy from the latest snapshot only', () => {
    expect(verificationCopy(null)).toBe('VerificationNone');
    expect(verificationCopy({ status: 'Pending', reapplyBarred: false })).toBe('VerificationPending');
    expect(verificationCopy({ status: 'Approved', reapplyBarred: false })).toBe('VerificationApproved');
    expect(verificationCopy({ status: 'Rejected', reapplyBarred: false })).toBe('VerificationRejected');
    expect(verificationCopy({ status: 'Rejected', reapplyBarred: true })).toBe('VerificationBarred');
  });
});

describe('encodeQueueCursor / decodeQueueCursor (S-FR-VER-2)', () => {
  const key = { submittedAt: '2026-10-01T15:00:00.000Z', id: 'appandresx00000000000000' };
  const raw = (parts: unknown) => Buffer.from(JSON.stringify(parts)).toString('base64url');

  it('round-trips the sort key of a page', () => {
    expect(decodeQueueCursor(encodeQueueCursor(key))).toEqual(key);
  });

  it.each([
    ['not base64url JSON', '!!!'],
    ['another list tag', raw(['orders', key.submittedAt, key.id])],
    ['a short tuple', raw(['queue', key.submittedAt])],
    ['a non-canonical instant', raw(['queue', '2026-10-01T15:00:00Z', key.id])],
    ['year 0000', raw(['queue', '0000-01-01T00:00:00.000Z', key.id])],
    ['an id that is no cuid2', raw(['queue', key.submittedAt, 'APP-1'])],
  ])('refuses %s', (_label, cursor) => {
    expect(decodeQueueCursor(cursor)).toBeNull();
  });
});

describe('encodeAccessLogCursor / decodeAccessLogCursor (S-FR-VER-5.audit)', () => {
  const key = { createdAt: '2026-10-01T15:00:00.000Z', id: 'logx00000000000000000001' };

  it('round-trips the sort key of a page', () => {
    expect(decodeAccessLogCursor(encodeAccessLogCursor(key))).toEqual(key);
  });

  it('the two lists refuse each other\'s cursors', () => {
    expect(decodeAccessLogCursor(encodeQueueCursor({ submittedAt: key.createdAt, id: key.id }))).toBeNull();
    expect(decodeQueueCursor(encodeAccessLogCursor(key))).toBeNull();
  });
});

describe('messagingEligibility (MSG-3 Q1, Q-fail)', () => {
  it('maps Approved and Pending to eligible, and every other status to null', () => {
    expect(messagingEligibility('Approved')).toEqual({ status: 'Approved', verified: true });
    expect(messagingEligibility('Pending')).toEqual({ status: 'Pending', verified: false });
    expect(messagingEligibility('Rejected')).toBeNull();
    expect(messagingEligibility('none')).toBeNull();
  });
});
