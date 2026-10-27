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

const DAY_MS = 86_400_000;

/** VER-1 P4: the active reason's policy, read under a share lock (AD-VER-1 rule 1). */
export interface RejectionPolicy {
  barred: boolean;
  /** Null exactly when `barred` (`rejection_reason_policy_shape`). */
  cooldownDays: number | null;
}

/** AD-VER-1 rule 5: the policy copied onto the application, so a later edit never moves it. */
export type RejectionSnapshot =
  | { reapplyBarred: true; reapplyNotBefore: null }
  | { reapplyBarred: false; reapplyNotBefore: Date };

/** VER-1 Q2: barred, or a cooldown of whole days from the decision instant. */
export function rejectionSnapshot(policy: RejectionPolicy, now: Date): RejectionSnapshot {
  if (policy.barred) return { reapplyBarred: true, reapplyNotBefore: null };
  return { reapplyBarred: false, reapplyNotBefore: new Date(now.getTime() + (policy.cooldownDays ?? 0) * DAY_MS) };
}

/** S-FR-VER-7: the ADD-§1.3 copy keys, one per row of the status table plus `none`. */
export type VerificationCopy = 'VerificationNone' | 'VerificationPending' | 'VerificationApproved' | 'VerificationRejected' | 'VerificationBarred';

/** S-FR-VER-7: judged only from the latest application's snapshot, never the current reason (AD-VER-3). */
export function verificationCopy(latest: Pick<LatestApplicationSnapshot, 'status' | 'reapplyBarred'> | null): VerificationCopy {
  if (latest === null) return 'VerificationNone';
  if (latest.status === 'Pending') return 'VerificationPending';
  if (latest.status === 'Approved') return 'VerificationApproved';
  return latest.reapplyBarred ? 'VerificationBarred' : 'VerificationRejected';
}

/** S-FR-VER-2: the review queue's sort key, `("submittedAt", id)` of a page's last row. */
export interface QueueKey {
  submittedAt: string;
  id: string;
}

/** S-FR-VER-5.audit: the access log's sort key, `("createdAt", id)` of a page's last row. */
export interface AccessLogKey {
  createdAt: string;
  id: string;
}

const KEY_ID = /^[a-z][0-9a-z]{23}$/;

/** The opaque cursor of a page: base64url JSON of the list's tag and its last row's sort key. */
function encodeKeyset(tag: string, at: string, id: string): string {
  return Buffer.from(JSON.stringify([tag, at, id])).toString('base64url');
}

/** A cursor `encodeKeyset` issued for `tag`, else null; the instant must be the canonical ISO form it writes. */
function decodeKeyset(tag: string, cursor: string): [at: string, id: string] | null {
  let parts: unknown = null;
  try {
    parts = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!Array.isArray(parts) || parts.length !== 3 || parts[0] !== tag) return null;
  const [, at, id] = parts as unknown[];
  if (typeof at !== 'string' || !/^(?!0000)\d{4}-/.test(at) || Number.isNaN(Date.parse(at))) return null;
  if (new Date(at).toISOString() !== at || typeof id !== 'string' || !KEY_ID.test(id)) return null;
  return [at, id];
}

export function encodeQueueCursor(key: QueueKey): string {
  return encodeKeyset('queue', key.submittedAt, key.id);
}

export function decodeQueueCursor(cursor: string): QueueKey | null {
  const key = decodeKeyset('queue', cursor);
  return key === null ? null : { submittedAt: key[0], id: key[1] };
}

export function encodeAccessLogCursor(key: AccessLogKey): string {
  return encodeKeyset('legal-access', key.createdAt, key.id);
}

export function decodeAccessLogCursor(cursor: string): AccessLogKey | null {
  const key = decodeKeyset('legal-access', cursor);
  return key === null ? null : { createdAt: key[0], id: key[1] };
}
