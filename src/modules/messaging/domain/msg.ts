// Core domain — MSG in-app. Pure (AD-SYS-6).
import { NotImplementedError } from '../../../shared-kernel/errors.js';

export type ParticipantRole = 'buyer' | 'business';

/**
 * AD-MSG-2 rule 2, split by sender role (review F-15):
 * buyer → recipient business status; business reply → its own status.
 */
export function sendEligibility(
  _senderRole: ParticipantRole,
  _businessStatus: 'Approved' | 'Pending' | 'Rejected' | 'none',
): { outcome: 'allowed' } | { outcome: 'allowedWithNotice'; reasonCode: 'RecipientNotYetVerified' } | { outcome: 'refused'; code: 'NotBusinessAccount' } {
  throw new NotImplementedError('messaging.domain.sendEligibility');
}

/** FR-MSG-5: NFC-normalized body, 1–2,000 characters, or null when out of bounds. */
export function normalizeBody(_body: string): string | null {
  throw new NotImplementedError('messaging.domain.normalizeBody');
}
