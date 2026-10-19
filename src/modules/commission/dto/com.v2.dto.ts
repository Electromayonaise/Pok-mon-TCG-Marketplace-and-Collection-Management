import type { Cop, CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';
import type { AccountState, CommissionTrigger } from '../domain/com.js';

// Solu-2 DTOs — COM (contracts.md §7, §15).

// COM-1 applyOrderDeduction (subscriber)
export interface ApplyOrderDeductionRequest {
  type: 'OrderPaymentConfirmedByBusiness' | 'OrderClosed';
  orderId: CuidId;
  businessId: CuidId;
  totalCop: Cop;
  sellerReceivedConfirmedAt: IsoInstant | null;
  buyerItemReceivedConfirmedAt: IsoInstant | null;
}
export type ApplyOrderDeductionResponse =
  | { outcome: 'charged'; amountCop: Cop; balanceAfter: number; ledgerSeq: number; trigger: CommissionTrigger; crossing: 'exhausted' | null }
  | { outcome: 'duplicate' };

// COM-2 confirmTopUp (and its rejecting mirror)
export interface ConfirmTopUpRequest { topUpRequestId: CuidId; adminId: CuidId }
export interface ConfirmTopUpResponse {
  topUpRequestId: CuidId;
  status: 'Confirmed';
  balanceAfter: number;
  ledgerSeq: number;
  resumed: boolean;
  neededToResumeCop: Cop | null;
  decision: ExplanationDTO;
}
export interface RejectTopUpRequest { topUpRequestId: CuidId; adminId: CuidId; reason: string }
export interface RejectTopUpResponse { topUpRequestId: CuidId; status: 'Rejected'; decision: ExplanationDTO }

// COM-3 reconcile
export interface ReconcileRequest { businessId: CuidId | null; actor: { kind: 'admin'; adminId: CuidId } | { kind: 'job' } }
export interface DiscrepancyDTO { businessId: CuidId; kind: 'balanceMismatch' | 'seqGap'; expected: string; actual: string }
export type ReconcileResponse =
  | { runId: CuidId; accountsChecked: number; discrepancies: DiscrepancyDTO[]; decision: ExplanationDTO }
  | { skipped: 'runInProgress' };

// S-FR-COM-1 open account (subscriber)
export interface OpenCommissionAccountRequest { businessId: CuidId; approvedAt: IsoInstant }
export interface OpenCommissionAccountResponse { opened: boolean }

// S-FR-COM-2 request top-up
export interface CreateTopUpProofUploadRequest { businessId: CuidId }
export interface CreateTopUpProofUploadResponse { uploadKey: string; signedUrl: string; token: string }
export interface RequestTopUpRequest { businessId: CuidId; amountCop: Cop; transferReference: string; uploadKey: string }
export interface RequestTopUpResponse { topUpRequestId: CuidId; status: 'Pending'; submittedAt: IsoInstant; decision: ExplanationDTO }

// S-FR-COM-7 rate
export interface SetCommissionRateRequest { adminId: CuidId; rateBps: number; effectiveFrom: IsoInstant }
export interface SetCommissionRateResponse { rateBps: number; effectiveFrom: IsoInstant; decision: ExplanationDTO }

// S-FR-COM-9 my account (low-balance notice)
export interface LedgerLineDTO {
  seq: number;
  kind: 'TopUp' | 'Deduction';
  amountCop: Cop;
  balanceAfter: number;
  orderId: CuidId | null;
  trigger: CommissionTrigger | null;
  at: IsoInstant;
}
export interface GetMyCommissionAccountRequest { businessId: CuidId }
export interface GetMyCommissionAccountResponse {
  account: { balanceCop: number; state: AccountState; ledgerSeq: number; lowBalance: boolean; neededToResumeCop: Cop | null } | null;
  ledger: LedgerLineDTO[];
  decision: ExplanationDTO;
}

// Read models found by the UI-state check (contracts.md §15.12)
export interface TopUpRowDTO {
  topUpRequestId: CuidId;
  businessId: CuidId;
  amountCop: Cop;
  transferReference: string;
  status: 'Pending' | 'Confirmed' | 'Rejected';
  rejectionReason: string | null;
  submittedAt: IsoInstant;
  decidedAt: IsoInstant | null;
}
export interface ListTopUpQueueRequest { adminId: CuidId; cursor: string | null }
export interface ListTopUpQueueResponse { rows: TopUpRowDTO[]; nextCursor: string | null }
export interface ListMyTopUpsRequest { businessId: CuidId; cursor: string | null }
export interface ListMyTopUpsResponse { rows: TopUpRowDTO[]; nextCursor: string | null }
export interface GetTopUpProofUrlRequest { topUpRequestId: CuidId; actorId: CuidId }
export interface GetTopUpProofUrlResponse { url: string; expiresAt: IsoInstant }
export interface GetAccountLedgerRequest { adminId: CuidId; businessId: CuidId; trigger?: CommissionTrigger; cursor: string | null }
export interface GetAccountLedgerResponse { balanceCop: number | null; state: AccountState | null; lines: LedgerLineDTO[]; nextCursor: string | null }
export interface ListCommissionRatesRequest { adminId: CuidId }
export interface ListCommissionRatesResponse { rates: { rateBps: number; effectiveFrom: IsoInstant; setBy: CuidId | null }[]; currentRateBps: number }
export interface GetLastReconciliationRequest { adminId: CuidId }
export interface GetLastReconciliationResponse { run: { runId: CuidId; scope: string; accountsChecked: number; discrepancies: DiscrepancyDTO[]; at: IsoInstant } | null }
