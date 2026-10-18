// Core domain — VER. Pure (AD-SYS-6).
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { ApplicationStatus } from './idn.js';

/** UX 5.1: Ahorros · Corriente. */
export type AccountType = 'savings' | 'checking';

export interface LatestApplicationSnapshot {
  status: ApplicationStatus;
  reapplyBarred: boolean;
  /** Set on a Rejected application with a cooldown; null otherwise. */
  reapplyNotBefore: Date | null;
}

export type SubmissionVerdict =
  | 'allowed'
  | 'ApplicationAlreadyPending'
  | 'AlreadyVerifiedBusiness'
  | 'ReapplicationBarred'
  | 'ReapplicationCooldownActive';

/**
 * FR-VER-1 rules 2–4 and FR-VER-6, judged only from the snapshot (AD-VER-3).
 * Half-open cooldown: refused for now < reapplyNotBefore, allowed at equality.
 */
export function evaluateSubmission(_latest: LatestApplicationSnapshot | null, _now: Date): SubmissionVerdict {
  throw new NotImplementedError('identity.domain.evaluateSubmission');
}
