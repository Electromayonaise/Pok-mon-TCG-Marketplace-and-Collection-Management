import type { Cop, CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';
import type { OrderStatus } from '../domain/ord.js';

// Solu-2 DTOs — ORD (contracts.md §6, §15).

export interface OrderPaymentInstructionsDTO {
  bankName: string;
  accountType: 'savings' | 'checking';
  accountNumber: string;
  holderName: string;
  qrObjectKey: string | null;
}

// ORD-1 createOrder
export interface CreateOrderRequest { listingId: CuidId; qty: number; buyerId: CuidId }
export interface CreateOrderResponse {
  orderId: CuidId;
  status: 'AwaitingPayment';
  totalCop: Cop;
  paymentInstructions: OrderPaymentInstructionsDTO;
  expiresAt: IsoInstant;
  decision: ExplanationDTO;
}

// ORD-2 confirmPaid
export interface ConfirmPaidRequest { orderId: CuidId; buyerId: CuidId }
export interface ConfirmPaidResponse { orderId: CuidId; buyerPaidConfirmedAt: IsoInstant; status: 'Paid'; decision: ExplanationDTO }

// ORD-3 confirmPaymentReceived
export interface ConfirmPaymentReceivedRequest { orderId: CuidId; businessId: CuidId }
export interface ConfirmPaymentReceivedResponse {
  orderId: CuidId;
  sellerReceivedConfirmedAt: IsoInstant;
  status: 'PaymentConfirmed' | 'Closed';
  decision: ExplanationDTO;
}

// ORD-4 confirmItemReceived
export interface ConfirmItemReceivedRequest { orderId: CuidId; buyerId: CuidId }
export interface ConfirmItemReceivedResponse {
  orderId: CuidId;
  buyerItemReceivedConfirmedAt: IsoInstant;
  status: 'Closed';
  decision: ExplanationDTO;
}

// S-FR-ORD-2 comprobante
export interface UploadTicketDTO { uploadKey: string; signedUrl: string; token: string }
export interface CreateComprobanteUploadRequest { orderId: CuidId; buyerId: CuidId }
export type CreateComprobanteUploadResponse = UploadTicketDTO;
export interface UploadComprobanteRequest { orderId: CuidId; buyerId: CuidId; uploadKey: string }
export interface UploadComprobanteResponse { orderId: CuidId; comprobanteUploadedAt: IsoInstant; replacedPrevious: boolean; decision: ExplanationDTO }

// S-FR-ORD-6 reads
export interface OrderViewDTO {
  orderId: CuidId;
  role: 'buyer' | 'business';
  status: OrderStatus;
  listingTitle: string;
  qty: number;
  totalCop: Cop;
  expiresAt: IsoInstant;
  buyerPaidConfirmedAt: IsoInstant | null;
  sellerReceivedConfirmedAt: IsoInstant | null;
  buyerItemReceivedConfirmedAt: IsoInstant | null;
  decision: ExplanationDTO;
}
export interface GetOrderRequest { orderId: CuidId; actorId: CuidId }
export type GetOrderResponse = OrderViewDTO;
export interface ListOrdersRequest { actorId: CuidId; side: 'purchases' | 'sales'; cursor: string | null }
export interface ListOrdersResponse { items: OrderViewDTO[]; nextCursor: string | null }

// S-FR-ORD-7 cancel
export interface CancelOrderRequest { orderId: CuidId; buyerId: CuidId }
export interface CancelOrderResponse { orderId: CuidId; status: 'Cancelled'; cancelledAt: IsoInstant; decision: ExplanationDTO }

// S-FR-ORD-8 expiry materialization (job)
export interface ExpireDueOrdersRequest {
  scope: { listingUnitIds: CuidId[] } | 'all';
  trigger: 'preStep' | 'tick' | 'daily-morning' | 'daily-night';
}
export interface ExpireDueOrdersResponse { expired: number; released: number }

// S-FR-ORD-9 hasClosedPurchase
export interface HasClosedPurchaseRequest { buyerId: CuidId; businessId: CuidId }
export interface HasClosedPurchaseResponse { closed: boolean; latestState: OrderStatus | null }

// S-FR-ORD-10 admin lookup and support contact
export interface AdminLookupOrdersRequest { adminId: CuidId; query: { orderId?: CuidId; buyerId?: CuidId; businessId?: CuidId } }
export interface AdminLookupOrdersResponse { orders: OrderViewDTO[] }
export interface SupportContactDTO { email: string; whatsappE164: string | null }
export interface SetSupportContactRequest { adminId: CuidId; contact: SupportContactDTO }
export interface SetSupportContactResponse { updatedAt: IsoInstant }
