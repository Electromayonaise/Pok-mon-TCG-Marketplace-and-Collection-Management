import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { PaymentInstructionsDTO } from '../dto/ver.dto.js';
import type { LatestApplicationSnapshot } from '../domain/ver.js';

// Outbound ports — VER.

export interface IBusinessApplicationRepository {
  latestFor(tx: Tx, businessId: CuidId): Promise<LatestApplicationSnapshot | null>;
  /** AD-VER-1 rule 2: UPDATE … WHERE id AND status='Pending'. Returns the affected-row count. */
  transitionFromPending(
    tx: Tx,
    applicationId: CuidId,
    change:
      | { to: 'Approved'; decidedBy: CuidId; decidedAt: Date }
      | { to: 'Rejected'; decidedBy: CuidId; decidedAt: Date; reasonCode: string; note: string | null; reapplyNotBefore: Date | null; reapplyBarred: boolean },
  ): Promise<0 | 1>;
  readStatus(tx: Tx, applicationId: CuidId): Promise<{ status: 'Pending' | 'Approved' | 'Rejected'; decidedBy: CuidId | null; decidedAt: Date | null } | null>;
  insertDecisionLog(tx: Tx, row: { applicationId: CuidId; adminId: CuidId; decision: 'Approved' | 'Rejected'; reasonCode: string | null; at: Date }): Promise<void>;
}

export interface IRejectionReasonRepository {
  /** AD-VER-1 rule 1: SELECT … WHERE code AND active FOR SHARE. */
  findActiveForShare(tx: Tx, code: string): Promise<{ barred: boolean; cooldownDays: number | null } | null>;
}

export interface IBusinessProfileRepository {
  /** FR-VER-9: instructions only when the latest application is Approved; null otherwise. */
  paymentInstructionsIfApproved(businessId: CuidId): Promise<PaymentInstructionsDTO | null>;
}
