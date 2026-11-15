import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { CommissionAccountDTO } from '../dto/com.dto.js';
import type { CommissionTrigger } from '../domain/com.js';

// Outbound ports — COM.

export interface ICommissionLedgerRepository {
  deductionExists(tx: Tx, orderId: CuidId): Promise<boolean>;
  rateAt(tx: Tx, at: Date): Promise<bigint>;
  /**
   * AD-COM-1 rules 1–2 inside SAVEPOINT apply_deduction (review F-03): one atomic account
   * UPDATE … RETURNING, then the entry INSERT … ON CONFLICT ("orderId") WHERE kind='Deduction'
   * DO NOTHING. 'duplicate' means the savepoint was rolled back; the tx is still usable.
   */
  applyDeduction(
    tx: Tx,
    entry: { id: CuidId; businessId: CuidId; orderId: CuidId; amountCop: bigint; rateBps: bigint; baseCop: bigint; trigger: CommissionTrigger; commissionTriggeredAt: Date; at: Date },
  ): Promise<{ applied: true; balanceAfter: bigint; ledgerSeq: bigint } | { applied: false }>;
}

export interface ICommissionAccountRepository {
  find(businessId: CuidId): Promise<CommissionAccountDTO | null>;
}

export interface ITopUpRepository {
  ownedBy(topUpRequestId: CuidId, businessId: CuidId): Promise<boolean>;
}
