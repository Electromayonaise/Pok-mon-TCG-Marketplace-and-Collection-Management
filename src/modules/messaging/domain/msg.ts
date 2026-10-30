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

/** FR-MSG-5: NFC-normalized body, 1–2,000 characters (code points, as the schema's `char_length`), or null when out of bounds. */
export function normalizeBody(body: string): string | null {
  const normalized = body.normalize('NFC');
  const length = [...normalized].length;
  return length >= 1 && length <= 2000 ? normalized : null;
}

/** MSG-1 P2 (Solu-1 GAP-3): 1–64 characters of `[A-Za-z0-9_-]`. */
export const CLIENT_MESSAGE_ID = /^[A-Za-z0-9_-]{1,64}$/;
