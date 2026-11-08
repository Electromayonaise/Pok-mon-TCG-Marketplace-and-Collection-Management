// ORD domain (AD-ORD-1, AD-ORD-2, ADD-§4.2): pure rules, no database.
import { describe, expect, it } from 'vitest';
import {
  AWAITING_BUSINESS_SUPPORT_MS, closedLines, comprobanteUploadPrefix, isComprobanteUploadKey, decodeOrderCursor, deriveStatus, encodeOrderCursor, expiryUnmaterialized, itemReceivedLoserCode, openOrderOverflow, orderView, paidLoserCode,
  paymentReceivedLoserCode, sniffComprobanteType, type OrderFacts,
} from './domain/ord.js';

const NOW = new Date('2026-10-01T15:00:00.000Z');
const before = (h: number) => new Date(NOW.getTime() - h * 3_600_000);
const after = (h: number) => new Date(NOW.getTime() + h * 3_600_000);
const facts = (o: Partial<OrderFacts> = {}): OrderFacts => ({
  buyerPaidConfirmedAt: null, sellerReceivedConfirmedAt: null, buyerItemReceivedConfirmedAt: null, cancelledAt: null, expiredAt: null,
  expiresAt: after(47), hasComprobante: true, ...o,
});

describe('deriveStatus (ADD-§4.2, AD-ORD-2 rule 8)', () => {
  it('derives the six states from the facts alone', () => {
    expect([
      facts(), facts({ buyerPaidConfirmedAt: before(1) }), facts({ buyerPaidConfirmedAt: before(2), sellerReceivedConfirmedAt: before(1) }),
      facts({ buyerPaidConfirmedAt: before(2), buyerItemReceivedConfirmedAt: before(1) }), facts({ cancelledAt: before(1) }), facts({ expiredAt: before(1), expiresAt: before(2) }),
    ].map((f) => deriveStatus(f, NOW))).toEqual(['AwaitingPayment', 'Paid', 'PaymentConfirmed', 'Closed', 'Cancelled', 'Expired']);
  });

  it('an unpaid order reads Expired from expiresAt = now on, materialized or not; a paid one never expires', () => {
    expect(deriveStatus(facts({ expiresAt: NOW }), NOW)).toBe('Expired');
    expect(deriveStatus(facts({ expiresAt: after(0.001) }), NOW)).toBe('AwaitingPayment');
    expect(deriveStatus(facts({ expiresAt: before(1), buyerPaidConfirmedAt: before(2) }), NOW)).toBe('Paid');
    expect([expiryUnmaterialized(facts({ expiresAt: NOW }), NOW), expiryUnmaterialized(facts({ expiresAt: before(1), expiredAt: before(1) }), NOW)]).toEqual([true, false]);
  });
});

describe('openOrderOverflow (AD-ORD-1 rule 2, OQ-11)', () => {
  const open = (...businesses: string[]) => businesses.map((b, i) => ({ id: `o${i}`, businessId: b }));
  it('fits under 3 overall and 0 with this business', () => {
    expect(openOrderOverflow(open('b1', 'b2'), 'b3')).toBeNull();
  });
  it('one open order with this business blocks, and so do 3 overall; either way every open order is cited (ORD-1 P4)', () => {
    expect(openOrderOverflow(open('b1', 'b2'), 'b2')).toEqual(['o0', 'o1']);
    expect(openOrderOverflow(open('b1', 'b2', 'b3'), 'b4')).toEqual(['o0', 'o1', 'o2']);
  });
});

describe('the loser mappings of a 0-row fact update (AD-ORD-2 rule 3)', () => {
  it('ORD-2 P2–P5 in order: not the buyer, already paid, no longer active, no comprobante', () => {
    expect(paidLoserCode(facts({ buyerPaidConfirmedAt: before(1) }), false, NOW)).toBe('OrderNotOwnedByCaller');
    expect(paidLoserCode(facts({ buyerPaidConfirmedAt: before(1) }), true, NOW)).toBe('OrderAlreadyConfirmedByRole');
    expect(paidLoserCode(facts({ expiresAt: NOW, hasComprobante: false }), true, NOW)).toBe('OrderNoLongerActive');
    expect(paidLoserCode(facts({ hasComprobante: false }), true, NOW)).toBe('ComprobanteNotYetUploaded');
    expect(paidLoserCode(facts(), true, NOW)).toBeNull();
  });

  it('ORD-3 P2–P5 in order: not the business, no comprobante, already confirmed, no longer active', () => {
    const paid = facts({ buyerPaidConfirmedAt: before(1) });
    expect(paymentReceivedLoserCode(paid, false, NOW)).toBe('OrderNotOwnedByCaller');
    expect(paymentReceivedLoserCode({ ...paid, hasComprobante: false }, true, NOW)).toBe('ComprobanteMissingOnConfirm');
    expect(paymentReceivedLoserCode({ ...paid, sellerReceivedConfirmedAt: NOW }, true, NOW)).toBe('OrderAlreadyConfirmedByRole');
    expect(paymentReceivedLoserCode(paid, true, NOW)).toBeNull();
  });

  it('ORD-4 P2–P5 in order: a terminated order precedes out-of-order, which precedes a repeat', () => {
    expect(itemReceivedLoserCode(facts(), false, NOW)).toBe('OrderNotOwnedByCaller');
    expect(itemReceivedLoserCode(facts({ expiresAt: before(1) }), true, NOW)).toBe('OrderNoLongerActive');
    expect(itemReceivedLoserCode(facts(), true, NOW)).toBe('OrderConfirmationOutOfOrder');
    expect(itemReceivedLoserCode(facts({ buyerPaidConfirmedAt: before(2), buyerItemReceivedConfirmedAt: before(1) }), true, NOW)).toBe('OrderAlreadyConfirmedByRole');
  });
});

describe('closedLines (AD-ORD-2 rule 5)', () => {
  it('a card is one line at the snapshot price; a bundle one line per component, perBundleQty × qty, with no price', () => {
    expect(closedLines({ title: 'Charizard ex', itemRef: 'e1', unitPriceCop: 45_000, components: null }, 2)).toEqual([{ itemRef: 'e1', title: 'Charizard ex', qty: 2, unitPriceCop: 45_000 }]);
    expect(closedLines({ title: 'Trío', itemRef: null, unitPriceCop: 90_000, components: [{ catalogEntryId: 'e1', perBundleQty: 1 }, { catalogEntryId: 'e2', perBundleQty: 3 }] }, 2))
      .toEqual([{ itemRef: 'e1', title: 'Trío', qty: 2 }, { itemRef: 'e2', title: 'Trío', qty: 6 }]);
  });
});

describe('sniffComprobanteType (AD-SYS-8 rule 6)', () => {
  it('reads the type from the magic bytes only', () => {
    expect([[0xff, 0xd8, 0xff, 0], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], [0x25, 0x50, 0x44, 0x46, 0x2d], [0x47, 0x49, 0x46]].map((b) => sniffComprobanteType(new Uint8Array(b))))
      .toEqual(['image/jpeg', 'image/png', 'application/pdf', null]);
  });
});

// Flow C backfill (decision log Impl-2 #8): the order page's state line, per derived status.
describe('orderView (FR-ORD-1..8, NFR-ORD-4)', () => {
  it('names each status with its code, rule and the instant it shows', () => {
    expect(orderView(facts(), NOW)).toEqual({ status: 'AwaitingPayment', code: 'OrderAwaitingPayment', rule: 'FR-ORD-1', at: after(47) });
    expect(orderView(facts({ buyerPaidConfirmedAt: before(1), sellerReceivedConfirmedAt: before(1) }), NOW)).toMatchObject({ code: 'OrderPaymentConfirmed', rule: 'FR-ORD-4', at: before(1) });
    expect(orderView(facts({ buyerPaidConfirmedAt: before(3), buyerItemReceivedConfirmedAt: before(2) }), NOW)).toMatchObject({ status: 'Closed', code: 'OrderCompleted', at: before(2) });
    expect(orderView(facts({ cancelledAt: before(1) }), NOW)).toMatchObject({ code: 'OrderCancelled', rule: 'FR-ORD-7', at: before(1) });
  });

  it('an Expired order shows its written expiry, or expiresAt while no transaction has written it', () => {
    expect(orderView(facts({ expiredAt: before(1), expiresAt: before(2) }), NOW)).toMatchObject({ status: 'Expired', at: before(1) });
    expect(orderView(facts({ expiresAt: before(2) }), NOW)).toMatchObject({ status: 'Expired', code: 'OrderExpired', at: before(2) });
  });

  it('a paid order turns to OrderAwaitingBusiness at exactly 7 days without the business, never before', () => {
    const paidAt = new Date(NOW.getTime() - AWAITING_BUSINESS_SUPPORT_MS);
    expect(orderView(facts({ buyerPaidConfirmedAt: paidAt }), NOW)).toMatchObject({ code: 'OrderAwaitingBusiness', rule: 'NFR-ORD-4', at: paidAt });
    expect(orderView(facts({ buyerPaidConfirmedAt: new Date(paidAt.getTime() + 1) }), NOW)).toMatchObject({ code: 'OrderPaid', rule: 'FR-ORD-3' });
  });
});

describe('itemReceivedLoserCode (ORD-4 P2–P5)', () => {
  it('a paid, open order not yet received refuses nothing', () => {
    expect(itemReceivedLoserCode(facts({ buyerPaidConfirmedAt: before(1) }), true, NOW)).toBeNull();
  });
});

describe('the orders cursor', () => {
  it('round-trips, and refuses one this service never issued', () => {
    const cursor = encodeOrderCursor('2026-10-01T15:00:00.000Z', 'c'.repeat(24));
    expect(decodeOrderCursor(cursor)).toEqual({ createdAt: '2026-10-01T15:00:00.000Z', id: 'c'.repeat(24) });
    expect(decodeOrderCursor('not-a-cursor')).toBeNull();
  });
});

describe('the comprobante upload key (AD-SYS-8 rule 5.3)', () => {
  const buyer = 'camilax00000000000000000';

  it('is exactly the buyer\'s prefix and one id segment of 1–64 lowercase letters or digits, so no other object is named', () => {
    expect(comprobanteUploadPrefix(buyer)).toBe(`comprobante/${buyer}/`);
    expect([`comprobante/${buyer}/k1`, `comprobante/${buyer}/${'a'.repeat(64)}`].map((k) => isComprobanteUploadKey(k, buyer))).toEqual([true, true]);
    const refused = [
      `comprobante/julianx00000000000000000/k1`, `comprobante/${buyer}/`, `comprobante/${buyer}/k1/x`, `comprobante/${buyer}/K1`, `comprobante/${buyer}/${'a'.repeat(65)}`,
      `comprobante/${buyer}/../k1`, `topup-proof/${buyer}/k1`, `order-comprobantes/${buyer}/k1`,
    ];
    expect(refused.filter((k) => isComprobanteUploadKey(k, buyer))).toEqual([]);
  });
});
