import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { OrderFacts } from '../domain/ord.js';

// Outbound ports — ORD.

/** Neighbour port: listings' offered command (AD-6, AD-INV-2 rule 6). */
export interface ListingsForOrders {
  releaseReservation(tx: Tx, reservationRef: { listingId: CuidId; units: { inventoryUnitId: CuidId; qty: number }[] }): Promise<void>;
}

export interface IOrderRepository {
  /** AD-ORD-3 rule 1: the single visibility predicate. */
  visibleTo(orderId: CuidId, actorId: CuidId): Promise<{ buyerId: CuidId; businessId: CuidId } | null>;
  /** AD-ORD-2 rule 1: the conditional "paid" UPDATE. Returns the affected-row count. */
  setPaidConditionally(tx: Tx, orderId: CuidId, buyerId: CuidId, now: Date): Promise<0 | 1>;
  readFacts(tx: Tx, orderId: CuidId): Promise<(OrderFacts & { buyerId: CuidId; businessId: CuidId; reservationRef: object }) | null>;
  /** AD-ORD-2 rule 6: the conditional expiry; returns the reservationRef when it applied. */
  expireConditionally(tx: Tx, orderId: CuidId, now: Date): Promise<object | null>;
  closedPurchase(buyerId: CuidId, businessId: CuidId): Promise<{ closed: boolean; latest: OrderFacts | null }>;
}
