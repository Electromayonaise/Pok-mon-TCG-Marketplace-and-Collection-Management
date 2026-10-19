// Core domain — TRD. Pure (AD-SYS-6).
import { NotImplementedError } from '../../../shared-kernel/errors.js';

export type OfferRole = 'proposer' | 'seller';
export type OfferStatus = 'Open' | 'Accepted' | 'Rejected' | 'Withdrawn' | 'Expired' | 'Unfulfillable' | 'Cancelled';

export interface OfferFacts {
  proposerId: string;
  sellerId: string;
  status: OfferStatus;
  turn: OfferRole;
  expiresAt: Date;
}

/** AD-TRD-1 rule 5: Expired when Open and expiresAt ≤ now; otherwise the stored status. */
export function deriveOfferStatus(_offer: OfferFacts, _now: Date): OfferStatus {
  throw new NotImplementedError('trading.domain.deriveOfferStatus');
}

/** FR-TRD-2/3: the actor's role, or the code that refuses the action (precedence: visibility, open, turn). */
export function turnVerdict(
  _offer: OfferFacts,
  _actorId: string,
  _now: Date,
): { ok: true; role: OfferRole } | { ok: false; code: 'TradeOfferNotVisibleToCaller' | 'TradeOfferNotOpen' | 'NotYourTurn' } {
  throw new NotImplementedError('trading.domain.turnVerdict');
}
