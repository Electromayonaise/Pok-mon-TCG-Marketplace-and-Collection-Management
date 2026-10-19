import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { AccountType } from '../domain/ver.js';

export type { AccountType };

// DTOs — VER (contracts.md §2). Primitive fields only.

// assertCanSubmitApplication
export interface AssertCanSubmitApplicationRequestDTO {
  businessId: CuidId;
}

// decideApplication
export type ApplicationDecisionDTO =
  | { kind: 'approve' }
  | {
      kind: 'reject';
      /** A RejectionReason.code with active = true, e.g. 'DataMismatch' (ADD-§9.1). */
      reasonCode: string;
      /** Present when the admin adds text for the applicant; 0–500 characters. */
      note?: string;
    };

export interface DecideApplicationRequestDTO {
  applicationId: CuidId;
  decision: ApplicationDecisionDTO;
  adminId: CuidId;
}
export interface DecideApplicationResponseDTO {
  applicationId: CuidId;
  status: 'Approved' | 'Rejected';
  decidedAt: IsoInstant;
  decidedBy: CuidId;
}

// getBusinessPaymentInstructions
export interface GetBusinessPaymentInstructionsRequestDTO {
  businessId: CuidId;
}
export interface PaymentInstructionsDTO {
  bankName: string;
  accountType: AccountType;
  /** 6–20 digits. */
  accountNumber: string;
  holderName: string;
  /** Present when the business uploaded a QR image; null otherwise. */
  qrObjectKey: string | null;
}
/** null when the business is not Approved or has no profile (silent). */
export type GetBusinessPaymentInstructionsResponseDTO = PaymentInstructionsDTO | null;
