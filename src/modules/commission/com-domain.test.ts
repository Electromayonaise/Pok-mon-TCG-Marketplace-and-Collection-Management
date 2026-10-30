// COM domain (AD-SYS-3 rule 2, ADD-§2.6, AD-COM-1 rule 3, AD-COM-3 rule 3): pure rules, no database.
import { describe, expect, it } from 'vitest';
import { commissionOf, commissionTrigger, crossing, isLowBalance, isTopUpProofUploadKey, isValidTopUpAmount, neededToResume, sniffProofType } from './domain/com.js';

const at = (m: number) => new Date(Date.UTC(2026, 9, 1, 15, m));

describe('commissionTrigger (AD-SYS-3 rule 2)', () => {
  it('takes the earlier non-null fact, businessConfirmed on a tie or with no item fact', () => {
    expect([
      commissionTrigger({ sellerReceivedConfirmedAt: at(0), buyerItemReceivedConfirmedAt: null }),
      commissionTrigger({ sellerReceivedConfirmedAt: null, buyerItemReceivedConfirmedAt: at(5) }),
      commissionTrigger({ sellerReceivedConfirmedAt: at(9), buyerItemReceivedConfirmedAt: at(5) }),
      commissionTrigger({ sellerReceivedConfirmedAt: at(5), buyerItemReceivedConfirmedAt: at(5) }),
    ]).toEqual([
      { commissionTriggeredAt: at(0), trigger: 'businessConfirmed' },
      { commissionTriggeredAt: at(5), trigger: 'buyerClosed' },
      { commissionTriggeredAt: at(5), trigger: 'buyerClosed' },
      { commissionTriggeredAt: at(5), trigger: 'businessConfirmed' },
    ]);
  });

  it('with neither fact there is no trigger (COM-1 P2)', () => {
    expect(commissionTrigger({ sellerReceivedConfirmedAt: null, buyerItemReceivedConfirmedAt: null })).toBeNull();
  });
});

describe('commissionOf (ADD-§2.6, NFR-COM-4)', () => {
  it('rounds half up in BigInt', () => {
    expect([commissionOf(45_000n, 800n), commissionOf(12_345n, 800n), commissionOf(6_250n, 800n), commissionOf(6_249n, 800n), commissionOf(0n, 800n), commissionOf(45_000n, 0n)])
      .toEqual([3_600n, 988n, 500n, 500n, 0n, 0n]);
    expect(commissionOf(9_007_199_254_740_993n, 10_000n)).toBe(9_007_199_254_740_993n);
  });

  it('refuses a negative input', () => {
    expect(() => commissionOf(-1n, 800n)).toThrow(RangeError);
  });
});

describe('crossing and the account notices (AD-COM-1 rule 3, AD-COM-3 rule 3)', () => {
  it('names a crossing only at the zero boundary', () => {
    expect([crossing(1n, 0n), crossing(5_000n, -2_200n), crossing(0n, 1n), crossing(-5n, 100n), crossing(0n, -1n), crossing(10n, 5n), crossing(0n, 0n)])
      .toEqual(['exhausted', 'exhausted', 'replenished', 'replenished', null, null, null]);
  });

  it('needs 1 − balance to resume at or below 0, and the low-balance notice is 0 < b < 20,000', () => {
    expect([neededToResume(0n), neededToResume(-25_000n), neededToResume(1n)]).toEqual([1n, 25_001n, null]);
    expect([isLowBalance(0n), isLowBalance(1n), isLowBalance(19_999n), isLowBalance(20_000n)]).toEqual([false, true, true, false]);
  });
});

describe('top-up input rules (S-FR-COM-2, AD-SYS-8)', () => {
  it('bounds the amount to 20,000–10,000,000 integers', () => {
    expect([19_999, 20_000, 10_000_000, 10_000_001, 20_000.5].map(isValidTopUpAmount)).toEqual([false, true, true, false, false]);
  });

  it('accepts only the business prefix plus one id segment, and sniffs the type from the bytes', () => {
    const b = 'b'.repeat(24);
    expect([`topup-proof/${b}/abc1`, `topup-proof/${b}/`, `topup-proof/${b}/a/b`, `topup-proof/${b}/../x`, `topup-proof/${'c'.repeat(24)}/abc`].map((k) => isTopUpProofUploadKey(k, b)))
      .toEqual([true, false, false, false, false]);
    expect([sniffProofType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])), sniffProofType(new Uint8Array([1, 2, 3]))]).toEqual(['application/pdf', null]);
  });
});
