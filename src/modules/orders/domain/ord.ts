// Core domain — ORD. Pure (AD-SYS-6).
import { NotImplementedError } from '../../../shared-kernel/errors.js';
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

/**
 * AD-ORD-2 rule 3: maps a 0-row "paid" update to the loser's error, in precedence order.
 * `isBuyer` is false when the actor can see the order but is not its buyer.
 */
export function paidLoserCode(
  _facts: OrderFacts,
  _isBuyer: boolean,
  _now: Date,
): 'OrderNotOwnedByCaller' | 'OrderAlreadyConfirmedByRole' | 'OrderNoLongerActive' | 'ComprobanteNotYetUploaded' {
  throw new NotImplementedError('orders.domain.paidLoserCode');
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
