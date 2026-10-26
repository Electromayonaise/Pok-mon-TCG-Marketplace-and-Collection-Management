// Core domain — VER. Pure (AD-SYS-6).
import type { ApplicationStatus } from './idn.js';

/** UX 5.1: Ahorros · Corriente. */
export type AccountType = 'savings' | 'checking';

/** VER-2 P2: the privacy-notice version a submission must accept (FR-VER-1). */
export const CURRENT_CONSENT_VERSION = 'privacy-v1';

/** DIAN mod-11 weights, applied from the rightmost digit of the body (ADD-§2.5). */
const NIT_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71] as const;

/** The DIAN check digit of a NIT body of digits: r = Σ dᵢ·wᵢ mod 11, then r when r < 2, else 11 − r. */
export function nitCheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += Number(body[body.length - 1 - i]) * NIT_WEIGHTS[i]!;
  const r = sum % 11;
  return r < 2 ? r : 11 - r;
}

/** VER-2 P2: a 6–10 digit body followed by its DIAN check digit, digits only (the stored form). */
export function isValidNit(number: string): boolean {
  if (!/^[0-9]{7,11}$/.test(number)) return false;
  return nitCheckDigit(number.slice(0, -1)) === Number(number.slice(-1));
}

/** VER-2 P2: a cédula de ciudadanía has 6–10 digits. */
export function isValidCc(number: string): boolean {
  return /^[0-9]{6,10}$/.test(number);
}

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
export function evaluateSubmission(latest: LatestApplicationSnapshot | null, now: Date): SubmissionVerdict {
  if (latest === null) return 'allowed';
  if (latest.status === 'Pending') return 'ApplicationAlreadyPending';
  if (latest.status === 'Approved') return 'AlreadyVerifiedBusiness';
  if (latest.reapplyBarred) return 'ReapplicationBarred';
  if (latest.reapplyNotBefore !== null && now.getTime() < latest.reapplyNotBefore.getTime()) return 'ReapplicationCooldownActive';
  return 'allowed';
}
