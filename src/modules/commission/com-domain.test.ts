// COM domain (AD-SYS-3 rule 2, ADD-§2.6, AD-COM-1 rules 3 and 4, AD-COM-2 rule 6, AD-COM-3 rule 3): pure rules, no database.
import { describe, expect, it } from 'vitest';
import {
  accountDiscrepancies, commissionOf, commissionTrigger, crossing, decodeLedgerCursor, encodeLedgerCursor, isLowBalance, isTopUpProofUploadKey, isValidRateBps, isValidTopUpAmount, neededToResume, rateInForce,
  scheduledEffectiveFrom, sniffProofType,
} from './domain/com.js';

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

describe('accountDiscrepancies (COM-3 Q1, AD-COM-1 rule 4)', () => {
  const b = 'b'.repeat(24);
  const acct = (balanceCop: bigint, ledgerSeq: bigint) => ({ businessId: b, balanceCop, ledgerSeq });

  it('a consistent account, and a new one with an empty ledger, have none', () => {
    expect(accountDiscrepancies(acct(46_400n, 2n), { sum: 46_400n, entries: 2n, maxSeq: 2n })).toEqual([]);
    expect(accountDiscrepancies(acct(0n, 0n), { sum: 0n, entries: 0n, maxSeq: 0n })).toEqual([]);
  });

  it('reports a tampered balance as decimal strings, beyond 2^53 too', () => {
    expect(accountDiscrepancies(acct(46_000n, 2n), { sum: 46_400n, entries: 2n, maxSeq: 2n }))
      .toEqual([{ businessId: b, kind: 'balanceMismatch', expected: '46400', actual: '46000' }]);
    expect(accountDiscrepancies(acct(-9_007_199_254_740_993n, 1n), { sum: -9_007_199_254_740_992n, entries: 1n, maxSeq: 1n })[0])
      .toMatchObject({ expected: '-9007199254740992', actual: '-9007199254740993' });
  });

  it('reports a missing seq by the count, and a seq past ledgerSeq by the highest seq', () => {
    expect(accountDiscrepancies(acct(46_400n, 3n), { sum: 46_400n, entries: 2n, maxSeq: 3n }))
      .toEqual([{ businessId: b, kind: 'seqGap', expected: '3', actual: '2' }]);
    expect(accountDiscrepancies(acct(46_400n, 2n), { sum: 46_400n, entries: 2n, maxSeq: 3n }))
      .toEqual([{ businessId: b, kind: 'seqGap', expected: '2', actual: '3' }]);
  });

  it('reports both kinds at once, balance first', () => {
    expect(accountDiscrepancies(acct(1n, 5n), { sum: 2n, entries: 4n, maxSeq: 4n }).map((d) => d.kind)).toEqual(['balanceMismatch', 'seqGap']);
  });
});

describe('rate settings (S-FR-COM-7, S-FR-COM-7.list, AD-COM-2 rule 6)', () => {
  const now = at(30);
  const ms = (offset: number) => new Date(now.getTime() + offset);

  it('a rate is an integer from 0 to 10,000 basis points', () => {
    expect([0, 800, 10_000, -1, 10_001, 850.5, Number.NaN].map(isValidRateBps)).toEqual([true, true, true, false, false, false, false]);
  });

  it('accepts an effectiveFrom up to 60 s in the past and stores it from now; a later one is kept as asked', () => {
    expect([scheduledEffectiveFrom(ms(-60_000), now), scheduledEffectiveFrom(ms(-1), now), scheduledEffectiveFrom(now, now), scheduledEffectiveFrom(ms(86_400_000), now)])
      .toEqual([now, now, now, ms(86_400_000)]);
  });

  it('refuses an effectiveFrom more than 60 s in the past (CommissionRateNotFutureDated)', () => {
    expect([scheduledEffectiveFrom(ms(-60_001), now), scheduledEffectiveFrom(ms(-61_000), now)]).toEqual([null, null]);
  });

  it('the rate in force is the greatest effectiveFrom at or before the instant, in any input order', () => {
    const seed = { rateBps: 800, effectiveFrom: new Date(0) };
    const sep = { rateBps: 900, effectiveFrom: at(0) };
    const later = { rateBps: 1_000, effectiveFrom: at(60) };
    expect(rateInForce([later, seed, sep], now)).toBe(sep);
    expect(rateInForce([sep, later, seed], at(0))).toBe(sep);
    expect(rateInForce([seed, sep, later], at(60))).toBe(later);
    expect(rateInForce([later, sep], new Date(0))).toBeNull();
    expect(rateInForce([], now)).toBeNull();
  });
});

describe('the admin ledger cursor (S-FR-COM-8.ledger, decision log Impl-2 #13)', () => {
  const b = 'b'.repeat(24);
  const enc = (text: string) => Buffer.from(text, 'utf8').toString('base64url');

  it('round-trips the account and the seq, up to the BIGINT maximum', () => {
    expect([decodeLedgerCursor(encodeLedgerCursor(b, 51n), b), decodeLedgerCursor(encodeLedgerCursor(b, 9_223_372_036_854_775_807n), b)]).toEqual([51n, 9_223_372_036_854_775_807n]);
  });

  it('refuses a cursor of another account, another list, or a malformed seq', () => {
    expect([
      decodeLedgerCursor(encodeLedgerCursor('c'.repeat(24), 51n), b),
      decodeLedgerCursor(enc(`${new Date(0).toISOString()}|${b}`), b),
      decodeLedgerCursor(enc(`ledger|${b}`), b),
      decodeLedgerCursor(enc(`ledger|${b}|0`), b),
      decodeLedgerCursor(enc(`ledger|${b}|-3`), b),
      decodeLedgerCursor(enc(`ledger|${b}|051`), b),
      decodeLedgerCursor(enc(`ledger|${b}|9223372036854775808`), b),
      decodeLedgerCursor(enc(`ledger|${b}|5|x`), b),
      decodeLedgerCursor('not a cursor', b),
    ]).toEqual([null, null, null, null, null, null, null, null, null]);
  });
});
