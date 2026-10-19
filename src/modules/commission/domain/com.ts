// Core domain — COM. Pure, BigInt money arithmetic (AD-SYS-7). No Math.round, no floats.
import { NotImplementedError } from '../../../shared-kernel/errors.js';

export type AccountState = 'Funded' | 'Exhausted';
export type CommissionTrigger = 'businessConfirmed' | 'buyerClosed';

/**
 * AD-SYS-3 rule 2: commissionTriggeredAt = min of the non-null facts;
 * trigger = 'businessConfirmed' when seller ≤ item or item is null, else 'buyerClosed'.
 */
export function commissionTrigger(_facts: {
  sellerReceivedConfirmedAt: Date | null;
  buyerItemReceivedConfirmedAt: Date | null;
}): { commissionTriggeredAt: Date; trigger: CommissionTrigger } {
  throw new NotImplementedError('commission.domain.commissionTrigger');
}

/** ADD-§2.6: floor((totalCop × rateBps + 5000) / 10000) in BigInt. */
export function commissionOf(_totalCop: bigint, _rateBps: bigint): bigint {
  throw new NotImplementedError('commission.domain.commissionOf');
}

/** AD-COM-1 rule 3: > 0 → ≤ 0 is 'exhausted', ≤ 0 → > 0 is 'replenished', else null. */
export function crossing(_before: bigint, _after: bigint): 'exhausted' | 'replenished' | null {
  throw new NotImplementedError('commission.domain.crossing');
}
