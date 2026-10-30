// Core domain — COM. Pure, BigInt money arithmetic (AD-SYS-7). No Math.round, no floats.
import type { CuidId } from '../../../shared-kernel/types.js';

export type AccountState = 'Funded' | 'Exhausted';
export type CommissionTrigger = 'businessConfirmed' | 'buyerClosed';

/**
 * AD-SYS-3 rule 2: commissionTriggeredAt = min of the non-null facts;
 * trigger = 'businessConfirmed' when seller ≤ item or item is null, else 'buyerClosed'.
 * Both null is COM-1 P2's breach; the caller maps the `null` to 'Unexpected'.
 */
export function commissionTrigger(facts: {
  sellerReceivedConfirmedAt: Date | null;
  buyerItemReceivedConfirmedAt: Date | null;
}): { commissionTriggeredAt: Date; trigger: CommissionTrigger } | null {
  const { sellerReceivedConfirmedAt: seller, buyerItemReceivedConfirmedAt: item } = facts;
  if (seller !== null && (item === null || seller.getTime() <= item.getTime())) return { commissionTriggeredAt: seller, trigger: 'businessConfirmed' };
  if (item !== null) return { commissionTriggeredAt: item, trigger: 'buyerClosed' };
  return null;
}

/** ADD-§2.6: floor((totalCop × rateBps + 5000) / 10000) in BigInt. */
export function commissionOf(totalCop: bigint, rateBps: bigint): bigint {
  if (totalCop < 0n || rateBps < 0n) throw new RangeError(`commissionOf(${totalCop}, ${rateBps}): both must be ≥ 0`);
  return (totalCop * rateBps + 5000n) / 10000n;
}

/** AD-COM-1 rule 3: > 0 → ≤ 0 is 'exhausted', ≤ 0 → > 0 is 'replenished', else null. */
export function crossing(before: bigint, after: bigint): 'exhausted' | 'replenished' | null {
  if (before > 0n && after <= 0n) return 'exhausted';
  if (before <= 0n && after > 0n) return 'replenished';
  return null;
}

/** AD-COM-3 rule 3: the amount that makes a balance ≤ 0 positive again, or null when it already is. */
export function neededToResume(balance: bigint): bigint | null {
  return balance <= 0n ? 1n - balance : null;
}

/** S-FR-COM-9: the display-only low-balance notice, below 20,000 COP (never a gate). */
export const LOW_BALANCE_THRESHOLD_COP = 20_000n;
export function isLowBalance(balance: bigint): boolean {
  return balance > 0n && balance < LOW_BALANCE_THRESHOLD_COP;
}

/** S-FR-COM-2 (I3): the request bounds, as the `"TopUpRequest"` CHECK states them. */
export const MIN_TOP_UP_COP = 20_000;
export const MAX_TOP_UP_COP = 10_000_000;
export function isValidTopUpAmount(amountCop: number): boolean {
  return Number.isSafeInteger(amountCop) && amountCop >= MIN_TOP_UP_COP && amountCop <= MAX_TOP_UP_COP;
}

/** AD-SYS-8 rule 5.1: the quarantine prefix of a business's top-up proof upload. */
export function topUpProofUploadPrefix(businessId: CuidId): string {
  return `topup-proof/${businessId}/`;
}

/** AD-SYS-8 rule 5.3: exactly the business's prefix and one id segment, so no other object is named. */
export function isTopUpProofUploadKey(key: string, businessId: CuidId): boolean {
  const prefix = topUpProofUploadPrefix(businessId);
  return key.startsWith(prefix) && /^[a-z0-9]{1,64}$/.test(key.slice(prefix.length));
}

/** AD-SYS-8 rule 6: the 5 MiB cap and the magic bytes of the three accepted proof types. */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_MAGIC = [
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ['application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]],
] as const;

/** AD-SYS-8 rule 6: the declared type is what the magic bytes say, never the upload's header. */
export function sniffProofType(bytes: Uint8Array): (typeof PROOF_MAGIC)[number][0] | null {
  return PROOF_MAGIC.find(([, magic]) => magic.every((b, i) => bytes[i] === b))?.[0] ?? null;
}

/** The keyset `(at, id)` of a list's last row, as an opaque cursor (S-FR-COM-2.mine, COM-2.queue). */
export function encodeKeyset(at: string, id: string): string {
  return Buffer.from(`${at}|${id}`, 'utf8').toString('base64url');
}

/** The cursor's keyset, or null when it is not one this service issued. */
export function decodeKeyset(cursor: string): { at: string; id: string } | null {
  const [at, id, ...rest] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  if (rest.length > 0 || !at || !id || !/^[a-z][0-9a-z]{23}$/.test(id)) return null;
  const ms = Date.parse(at);
  return Number.isNaN(ms) || new Date(ms).toISOString() !== at ? null : { at, id };
}
