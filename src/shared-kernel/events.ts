import type { Tx } from './ports.js';
import type { Cop, CuidId, IsoInstant } from './types.js';

// Event payloads (ADD-§5, ARCHITECTURE §7.1) and the Solu-2 envelope (refinement R-1).
// Payload types live in shared-kernel so a subscriber never imports its publisher (AD-1, AD-9).

export interface BusinessApplicationApprovedV1 {
  applicationId: CuidId;
  businessId: CuidId;
  businessName: string;
  approvedAt: IsoInstant;
  approvedBy: CuidId;
}

export type BusinessApplicationRejectedV1 = {
  applicationId: CuidId;
  businessId: CuidId;
  reasonCode: string;
  rejectedAt: IsoInstant;
} & ({ reapplyNotBefore: IsoInstant; barred?: never } | { barred: true; reapplyNotBefore?: never });

export interface PaymentConfirmedLineV1 {
  listingId: CuidId;
  itemRef: CuidId | null;
  title: string;
  qty: number;
  unitPriceCop: Cop;
}

export interface OrderPaymentConfirmedByBusinessV1 {
  orderId: CuidId;
  businessId: CuidId;
  buyerId: CuidId;
  totalCop: Cop;
  lines: PaymentConfirmedLineV1[];
  sellerReceivedConfirmedAt: IsoInstant;
  /** null unless the buyer had already confirmed receipt. */
  buyerItemReceivedConfirmedAt: IsoInstant | null;
}

export interface OrderClosedLineV1 {
  itemRef: CuidId;
  title: string;
  qty: number;
  /** Present on card and sealed lines; absent on bundle component lines (AD-ORD-2 rule 5). */
  unitPriceCop?: Cop;
}

export interface OrderClosedV1 {
  orderId: CuidId;
  buyerId: CuidId;
  businessId: CuidId;
  totalCop: Cop;
  lines: OrderClosedLineV1[];
  /** null when the business had not confirmed. */
  sellerReceivedConfirmedAt: IsoInstant | null;
  buyerItemReceivedConfirmedAt: IsoInstant;
}

export interface CommissionBalanceCrossingV1 {
  businessId: CuidId;
  ledgerSeq: number;
  /** Signed: a balance may be negative (AD-19). */
  balanceAfter: number;
}

export interface TradeAcceptedV1 {
  tradeOfferId: CuidId;
  listingId: CuidId;
  sellerId: CuidId;
  proposerId: CuidId;
  terms: { offeredItems: { itemRef: CuidId; condition: string; qty: number }[]; cashCop: Cop; requestedQty: 1 };
  acceptedAt: IsoInstant;
}

export interface EventPayloads {
  BusinessApplicationApproved: BusinessApplicationApprovedV1;
  BusinessApplicationRejected: BusinessApplicationRejectedV1;
  OrderPaymentConfirmedByBusiness: OrderPaymentConfirmedByBusinessV1;
  OrderClosed: OrderClosedV1;
  CommissionBalanceExhausted: CommissionBalanceCrossingV1;
  CommissionBalanceReplenished: CommissionBalanceCrossingV1;
  TradeAccepted: TradeAcceptedV1;
}

export type EventType = keyof EventPayloads;

/** R-1: the envelope every event carries; the payload is exactly ADD-§5 (AD-9). */
export interface EventEnvelope<T extends EventType = EventType> {
  /** = OutboxEvent.id */
  eventId: CuidId;
  type: T;
  /** = the publishing transaction's Clock instant (OutboxEvent.createdAt). */
  occurredAt: IsoInstant;
  /** Bumped only on a breaking payload change; every V1 event is 1. */
  schemaVersion: number;
  payload: EventPayloads[T];
}

/** Current schema version per event type. */
export const EVENT_SCHEMA_VERSIONS: Readonly<Record<EventType, number>> = {
  BusinessApplicationApproved: 1,
  BusinessApplicationRejected: 1,
  OrderPaymentConfirmedByBusiness: 1,
  OrderClosed: 1,
  CommissionBalanceExhausted: 1,
  CommissionBalanceReplenished: 1,
  TradeAccepted: 1,
};

/** Registered subscribers per event (ARCHITECTURE §7.1); one EventDelivery row each. */
export const EVENT_SUBSCRIBERS: Readonly<Record<EventType, readonly ('commission' | 'listings' | 'collections')[]>> = {
  BusinessApplicationApproved: ['commission', 'listings'],
  BusinessApplicationRejected: ['listings'],
  OrderPaymentConfirmedByBusiness: ['commission'],
  OrderClosed: ['commission', 'collections'],
  CommissionBalanceExhausted: ['listings'],
  CommissionBalanceReplenished: ['listings'],
  TradeAccepted: [],
};

/**
 * The Solu-2 outbox port (review S-1): enqueue in the publisher's transaction (AD-SYS-2 rule 1),
 * stamping the R-1 envelope (eventId from IdGenerator, occurredAt from Clock, schemaVersion
 * from EVENT_SCHEMA_VERSIONS) and one pending EventDelivery per EVENT_SUBSCRIBERS entry.
 */
export interface OutboxV2 {
  enqueue<T extends EventType>(tx: Tx, type: T, aggregateId: CuidId, payload: EventPayloads[T]): Promise<EventEnvelope<T>>;
}
