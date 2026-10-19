import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';
import type { ApplicationStatus } from '../domain/idn.js';
import type { AccountType } from '../domain/ver.js';

// Solu-2 DTOs — VER, plus MSG-3 (identity offers it) (contracts.md §2, §9, §15).

// VER-1 decideApplication
export type ApplicationDecisionInput = { kind: 'approve' } | { kind: 'reject'; reasonCode: string; note: string | null };
export interface DecideApplicationRequest { applicationId: CuidId; decision: ApplicationDecisionInput; adminId: CuidId }
export interface DecideApplicationResponse {
  applicationId: CuidId;
  status: 'Approved' | 'Rejected';
  decidedAt: IsoInstant;
  decidedBy: CuidId;
  decision: ExplanationDTO;
}

// VER-2 submitApplication
export interface PaymentInstructionsInput {
  bankName: string;
  accountType: AccountType;
  accountNumber: string;
  holderName: string;
  qrUploadKey: string | null;
}
export interface SubmitApplicationRequest {
  businessId: CuidId;
  businessName: string;
  /** Regulated: travels only into legalIdentityRepository (AD-VER-2). */
  legalIdentity: { type: 'NIT' | 'CC'; number: string };
  documentUploadKeys: string[];
  externalPresenceUrl: string;
  city: string;
  paymentInstructions: PaymentInstructionsInput;
  consentAccepted: true;
  consentVersion: string;
}
export interface SubmitApplicationResponse {
  applicationId: CuidId;
  status: 'Pending';
  submittedAt: IsoInstant;
  decision: ExplanationDTO;
}

// VER-3 getApplicationForReview
export interface GetApplicationForReviewRequest { applicationId: CuidId; actorId: CuidId }
export interface GetApplicationForReviewResponse {
  applicationId: CuidId;
  businessId: CuidId;
  businessName: string;
  city: string;
  externalPresenceUrl: string;
  submittedAt: IsoInstant;
  status: ApplicationStatus;
  /** Regulated (AD-13). This DTO is its only carrier. */
  legalIdentity: { type: 'NIT' | 'CC'; number: string };
  /** Signed for 600 s (AD-14). */
  documents: { url: string; expiresAt: IsoInstant }[];
}

// S-FR-VER-2 queue
export interface ListReviewQueueRequest { adminId: CuidId; cursor: string | null }
export interface ListReviewQueueResponse {
  items: { applicationId: CuidId; businessName: string; city: string; submittedAt: IsoInstant }[];
  nextCursor: string | null;
}

// S-FR-VER-7 my status
export interface GetMyApplicationStatusRequest { businessId: CuidId }
export interface GetMyApplicationStatusResponse {
  status: ApplicationStatus | 'none';
  applicationId: CuidId | null;
  reapplyNotBefore: IsoInstant | null;
  barred: boolean;
  decision: ExplanationDTO;
}

// S-FR-VER-8 rejection reasons
export interface UpsertRejectionReasonRequest {
  adminId: CuidId;
  code: string;
  textEsCo: string;
  policy: { barred: true } | { barred: false; cooldownDays: number };
}
export interface UpsertRejectionReasonResponse { code: string; changed: boolean }
export interface SetRejectionReasonActiveRequest { adminId: CuidId; code: string; active: boolean }
export interface SetRejectionReasonActiveResponse { code: string; active: boolean; changed: boolean }

// S-FR-VER-9 payment instructions
export interface UpdatePaymentInstructionsRequest { businessId: CuidId; instructions: PaymentInstructionsInput }
export interface UpdatePaymentInstructionsResponse { updatedAt: IsoInstant }
export interface GetBusinessPaymentInstructionsRequest { businessId: CuidId }
export type GetBusinessPaymentInstructionsResponse = {
  bankName: string;
  accountType: AccountType;
  accountNumber: string;
  holderName: string;
  qrObjectKey: string | null;
} | null;

// MSG-3 requireMessagingEligibility (offered by identity, consumed by messaging)
export interface RequireMessagingEligibilityRequest { businessId: CuidId }
export interface RequireMessagingEligibilityResponse {
  status: 'Approved' | 'Pending';
  verified: boolean;
  decision: ExplanationDTO;
}
