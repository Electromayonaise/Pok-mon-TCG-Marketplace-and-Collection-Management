// Core domain — ORD. Pure (AD-SYS-6).
import { NotImplementedError } from '../../../shared-kernel/errors.js';

/** ADD-§4.2, derived from the three facts; never stored. */
export type OrderStatus = 'AwaitingPayment' | 'Paid' | 'PaymentConfirmed' | 'Closed' | 'Cancelled' | 'Expired';

export interface OrderFacts {
  buyerPaidConfirmedAt: Date | null;
  sellerReceivedConfirmedAt: Date | null;
  buyerItemReceivedConfirmedAt: Date | null;
  cancelledAt: Date | null;
  expiredAt: Date | null;
  expiresAt: Date;
  comprobanteObjectKey: string | null;
}

/** AD-ORD-2 rule 8: Expired whenever expiresAt ≤ now with no payment, cancel or expiry. */
export function deriveStatus(_facts: OrderFacts, _now: Date): OrderStatus {
  throw new NotImplementedError('orders.domain.deriveStatus');
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
