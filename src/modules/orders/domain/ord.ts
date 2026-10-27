// Core domain — ORD. Pure (AD-SYS-6).
import type { CuidId } from '../../../shared-kernel/types.js';

/** ADD-§4.2, derived from the three facts; never stored. */
export type OrderStatus = 'AwaitingPayment' | 'Paid' | 'PaymentConfirmed' | 'Closed' | 'Cancelled' | 'Expired';

export interface OrderFacts {
  buyerPaidConfirmedAt: Date | null;
  sellerReceivedConfirmedAt: Date | null;
  buyerItemReceivedConfirmedAt: Date | null;
  cancelledAt: Date | null;
  expiredAt: Date | null;
  expiresAt: Date;
  /** Whether a comprobante is attached; the key itself never reaches the domain (AD-17). */
  hasComprobante: boolean;
}

/** OQ-11: `maxOpenOrdersPerBuyer` and `maxOpenOrdersPerBuyerPerBusiness` (AD-ORD-1). */
export const MAX_OPEN_ORDERS = 3;
export const MAX_OPEN_ORDERS_PER_BUSINESS = 1;
/** AD-ORD-1 rule 2: `unpaidOrderTtl`, 48 h. */
export const UNPAID_ORDER_TTL_MS = 172_800_000;

/** AD-ORD-2 rule 8: Expired whenever expiresAt ≤ now with no payment, cancel or expiry. */
export function deriveStatus(facts: OrderFacts, now: Date): OrderStatus {
  if (facts.cancelledAt !== null) return 'Cancelled';
  if (facts.expiredAt !== null) return 'Expired';
  if (facts.buyerPaidConfirmedAt === null) return facts.expiresAt.getTime() <= now.getTime() ? 'Expired' : 'AwaitingPayment';
  if (facts.buyerItemReceivedConfirmedAt !== null) return 'Closed';
  return facts.sellerReceivedConfirmedAt !== null ? 'PaymentConfirmed' : 'Paid';
}

/**
 * AD-ORD-1 rule 2: the open orders that refuse one more purchase from `businessId`, or null when it
 * fits. `open` is the buyer's open orders by the derived predicate. At the overall limit every open
 * order blocks; under it, only those with this business.
 */
export function openOrderOverflow(open: readonly { id: CuidId; businessId: CuidId }[], businessId: CuidId): CuidId[] | null {
  if (open.length >= MAX_OPEN_ORDERS) return open.map((o) => o.id);
  const withBusiness = open.filter((o) => o.businessId === businessId);
  return withBusiness.length >= MAX_OPEN_ORDERS_PER_BUSINESS ? withBusiness.map((o) => o.id) : null;
}

/** AD-SYS-8 rule 5.1: the quarantine key of a buyer's comprobante upload. */
export function comprobanteUploadPrefix(buyerId: CuidId): string {
  return `comprobante/${buyerId}/`;
}

/** The listing snapshot an order stores (INV-1 Q2), as the domain reads it. */
export interface OrderSnapshot {
  title: string;
  itemRef: CuidId | null;
  unitPriceCop: number;
  components: { catalogEntryId: CuidId; perBundleQty: number }[] | null;
}

const terminated = (facts: OrderFacts, now: Date): boolean => {
  const status = deriveStatus(facts, now);
  return status === 'Cancelled' || status === 'Expired';
};

/**
 * AD-ORD-2 rule 3: maps a 0-row "paid" update to the loser's error, in the precedence of ORD-2
 * P2–P5, or null when nothing refuses it. `isBuyer` is false when the actor sees the order but is
 * not its buyer.
 */
export function paidLoserCode(
  facts: OrderFacts,
  isBuyer: boolean,
  now: Date,
): 'OrderNotOwnedByCaller' | 'OrderAlreadyConfirmedByRole' | 'OrderNoLongerActive' | 'ComprobanteNotYetUploaded' | null {
  if (!isBuyer) return 'OrderNotOwnedByCaller';
  if (facts.buyerPaidConfirmedAt !== null) return 'OrderAlreadyConfirmedByRole';
  if (terminated(facts, now)) return 'OrderNoLongerActive';
  if (!facts.hasComprobante) return 'ComprobanteNotYetUploaded';
  return null;
}

/** ORD-3 P2–P5 after a 0-row update, for an actor who sees the order (P1). */
export function paymentReceivedLoserCode(
  facts: OrderFacts,
  isBusiness: boolean,
  now: Date,
): 'OrderNotOwnedByCaller' | 'ComprobanteMissingOnConfirm' | 'OrderAlreadyConfirmedByRole' | 'OrderNoLongerActive' | null {
  if (!isBusiness) return 'OrderNotOwnedByCaller';
  if (!facts.hasComprobante) return 'ComprobanteMissingOnConfirm';
  if (facts.sellerReceivedConfirmedAt !== null) return 'OrderAlreadyConfirmedByRole';
  if (terminated(facts, now)) return 'OrderNoLongerActive';
  return null;
}

/**
 * ORD-4 P2–P5 after a 0-row update. A terminated order precedes an unpaid one, because it can
 * never become paid (contracts.md ORD-4 P3).
 */
export function itemReceivedLoserCode(
  facts: OrderFacts,
  isBuyer: boolean,
  now: Date,
): 'OrderNotOwnedByCaller' | 'OrderNoLongerActive' | 'OrderConfirmationOutOfOrder' | 'OrderAlreadyConfirmedByRole' | null {
  if (!isBuyer) return 'OrderNotOwnedByCaller';
  if (terminated(facts, now)) return 'OrderNoLongerActive';
  if (facts.buyerPaidConfirmedAt === null) return 'OrderConfirmationOutOfOrder';
  if (facts.buyerItemReceivedConfirmedAt !== null) return 'OrderAlreadyConfirmedByRole';
  return null;
}

/** AD-ORD-2 rule 4: an unpaid order past `expiresAt` whose expiry no transaction has written yet. */
export function expiryUnmaterialized(facts: OrderFacts, now: Date): boolean {
  return facts.buyerPaidConfirmedAt === null && facts.cancelledAt === null && facts.expiredAt === null && facts.expiresAt.getTime() <= now.getTime();
}

/**
 * AD-ORD-2 rule 5: the `OrderClosed` lines. A card or sealed product is one line at the snapshot's
 * unit price; a bundle is one line per component, `perBundleQty × qty`, under the bundle's title
 * and with no unit price.
 */
export function closedLines(snapshot: OrderSnapshot, qty: number): { itemRef: CuidId | null; title: string; qty: number; unitPriceCop?: number }[] {
  if (snapshot.components === null) return [{ itemRef: snapshot.itemRef, title: snapshot.title, qty, unitPriceCop: snapshot.unitPriceCop }];
  return snapshot.components.map((c) => ({ itemRef: c.catalogEntryId, title: snapshot.title, qty: c.perBundleQty * qty }));
}

/** AD-SYS-8 rule 6: the 5 MiB cap and the magic bytes of the three accepted comprobante types. */
export const MAX_COMPROBANTE_BYTES = 5 * 1024 * 1024;
const COMPROBANTE_MAGIC = [
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ['application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]],
] as const;

/** AD-SYS-8 rule 6: the declared type is what the magic bytes say, never the upload's header. */
export function sniffComprobanteType(bytes: Uint8Array): (typeof COMPROBANTE_MAGIC)[number][0] | null {
  return COMPROBANTE_MAGIC.find(([, magic]) => magic.every((b, i) => bytes[i] === b))?.[0] ?? null;
}

/** NFR-ORD-4: a paid order with no business confirmation after 7 days shows the support contact. */
export const AWAITING_BUSINESS_SUPPORT_MS = 7 * 86_400_000;

/** S-FR-ORD-6: the stored-only code a derived status reads with, and the fact it cites. */
export type OrderViewCode = 'OrderAwaitingPayment' | 'OrderPaid' | 'OrderAwaitingBusiness' | 'OrderPaymentConfirmed' | 'OrderCompleted' | 'OrderCancelled' | 'OrderExpired';

export function orderView(facts: OrderFacts, now: Date): { status: OrderStatus; code: OrderViewCode; rule: string; at: Date } {
  const status = deriveStatus(facts, now);
  switch (status) {
    case 'AwaitingPayment': return { status, code: 'OrderAwaitingPayment', rule: 'FR-ORD-1', at: facts.expiresAt };
    case 'Paid': {
      const paidAt = facts.buyerPaidConfirmedAt!;
      return now.getTime() - paidAt.getTime() >= AWAITING_BUSINESS_SUPPORT_MS
        ? { status, code: 'OrderAwaitingBusiness', rule: 'NFR-ORD-4', at: paidAt }
        : { status, code: 'OrderPaid', rule: 'FR-ORD-3', at: paidAt };
    }
    case 'PaymentConfirmed': return { status, code: 'OrderPaymentConfirmed', rule: 'FR-ORD-4', at: facts.sellerReceivedConfirmedAt! };
    case 'Closed': return { status, code: 'OrderCompleted', rule: 'FR-ORD-5', at: facts.buyerItemReceivedConfirmedAt! };
    case 'Cancelled': return { status, code: 'OrderCancelled', rule: 'FR-ORD-7', at: facts.cancelledAt! };
    case 'Expired': return { status, code: 'OrderExpired', rule: 'FR-ORD-8', at: facts.expiredAt ?? facts.expiresAt };
  }
}

/** S-FR-ORD-6.list: the keyset `("createdAt", id)` of the last row, as an opaque cursor. */
export function encodeOrderCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`, 'utf8').toString('base64url');
}

/** The cursor's keyset, or null when it is not one this service issued. */
export function decodeOrderCursor(cursor: string): { createdAt: string; id: string } | null {
  const [createdAt, id, ...rest] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  if (rest.length > 0 || !createdAt || !id || !/^[a-z][0-9a-z]{23}$/.test(id)) return null;
  const at = Date.parse(createdAt);
  return Number.isNaN(at) || new Date(at).toISOString() !== createdAt ? null : { createdAt, id };
}
