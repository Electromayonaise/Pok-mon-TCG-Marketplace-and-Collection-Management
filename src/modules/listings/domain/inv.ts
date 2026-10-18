// Core domain — INV. Pure (AD-SYS-6).
import { NotImplementedError } from '../../../shared-kernel/errors.js';

export type ListingKind = 'single' | 'bundle';
export type VerificationStatus = 'Approved' | 'Pending' | 'Rejected' | 'none';

export interface PurchasabilityFacts {
  sellerKindAtCreation: 'business' | 'individual';
  verification: VerificationStatus;
  pausedAt: Date | null;
  hiddenAt: Date | null;
  withdrawnAt: Date | null;
  deactivatedAt: Date | null;
  availability: number;
}

/**
 * AD-INV-3 rule 1: the one TypeScript predicate for purchasability.
 * 'purchasable' or the DecisionCode / state that blocks it.
 */
export function purchasable(
  _facts: PurchasabilityFacts,
): 'purchasable' | 'ListingUnverified' | 'ListingPausedBalanceExhausted' | 'NotVisible' | 'SoldOut' | 'IndividualListing' {
  throw new NotImplementedError('listings.domain.purchasable');
}

/** AD-INV-1 rule 2: single → quantity; bundle → min(floor(quantity / perBundleQty)). */
export function availability(_kind: ListingKind, _units: readonly { quantity: number; perBundleQty: number }[]): number {
  throw new NotImplementedError('listings.domain.availability');
}
