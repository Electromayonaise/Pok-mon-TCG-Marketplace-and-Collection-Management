import type { Cop, CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { AccountState } from '../domain/com.js';

export type { AccountState };

// DTOs — COM (contracts.md §7). Primitive fields only.

// assertTopUpVisible
export interface AssertTopUpVisibleRequestDTO {
  topUpRequestId: CuidId;
  actorId: CuidId;
}

// applyOrderDeduction — the order-event payload subset the handler reads (ADD-§5)
export interface OrderCommissionEventDTO {
  orderId: CuidId;
  businessId: CuidId;
  totalCop: Cop;
  /** Present once the business confirmed payment received; null otherwise. */
  sellerReceivedConfirmedAt: IsoInstant | null;
  /** Present once the buyer confirmed the item arrived; null otherwise. At least one fact is non-null. */
  buyerItemReceivedConfirmedAt: IsoInstant | null;
}
export type ApplyOrderDeductionResponseDTO =
  | {
      outcome: 'charged';
      amountCop: Cop;
      /** May be negative (AD-19). */
      balanceAfter: number;
      ledgerSeq: number;
      /** 'exhausted' when this deduction crossed the balance from > 0 to ≤ 0. */
      crossing: 'exhausted' | null;
    }
  | { outcome: 'duplicate' };

// findCommissionAccount
export interface FindCommissionAccountRequestDTO {
  businessId: CuidId;
}
export interface CommissionAccountDTO {
  businessId: CuidId;
  balanceCop: number;
  state: AccountState;
  ledgerSeq: number;
}
/** null when no account has been opened (silent). */
export type FindCommissionAccountResponseDTO = CommissionAccountDTO | null;
