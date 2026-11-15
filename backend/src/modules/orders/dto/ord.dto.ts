import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { OrderStatus } from '../domain/ord.js';

export type { OrderStatus };

// DTOs — ORD (contracts.md §6). Primitive fields only.

// assertOrderVisible
export interface AssertOrderVisibleRequestDTO {
  orderId: CuidId;
  actorId: CuidId;
}
export interface AssertOrderVisibleResponseDTO {
  role: 'buyer' | 'business';
}

// confirmPaid
export interface ConfirmPaidRequestDTO {
  orderId: CuidId;
  buyerId: CuidId;
}
export interface ConfirmPaidResponseDTO {
  orderId: CuidId;
  buyerPaidConfirmedAt: IsoInstant;
  status: 'Paid';
}

// hasClosedPurchase
export interface HasClosedPurchaseRequestDTO {
  buyerId: CuidId;
  businessId: CuidId;
}
export interface HasClosedPurchaseResponseDTO {
  /** true iff an order of the pair has buyerItemReceivedConfirmedAt set (AD-2). */
  closed: boolean;
  /** deriveStatus of the pair's latest order; null when the pair has no order (silent). */
  latestState: OrderStatus | null;
}
