// Core domain — MSG in-app. Pure (AD-SYS-6).
import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';

export type ParticipantRole = 'buyer' | 'business';

/** FR-MSG-5: NFC-normalized body, 1–2,000 characters (code points, as the schema's `char_length`), or null when out of bounds. */
export function normalizeBody(body: string): string | null {
  const normalized = body.normalize('NFC');
  const length = [...normalized].length;
  return length >= 1 && length <= 2000 ? normalized : null;
}

/** MSG-1 P2 (Solu-1 GAP-3): 1–64 characters of `[A-Za-z0-9_-]`. */
export const CLIENT_MESSAGE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** S-FR-MSG-7 (decision log Impl-2 #15): conversations per inbox page, and messages per thread call. */
export const INBOX_PAGE_SIZE = 20;
export const THREAD_PAGE_SIZE = 100;

/** A seq a read mark or a thread cursor may carry: a whole number from 0 (MarkReadRequest `@minimum 0`). */
export function isSeq(n: number): boolean {
  return Number.isSafeInteger(n) && n >= 0;
}

/** AD-MSG-3 rule 1: the seq a read mark moves to, `LEAST(:seq, lastSeq)`, so a tab ahead of the server never reads past the last message. */
export function clampReadSeq(seq: number, lastSeq: number): number {
  return Math.min(seq, lastSeq);
}

/** AD-MSG-3 rule 2: unread per conversation, `lastSeq − lastReadSeq`, never negative. */
export function unreadOf(lastSeq: number, lastReadSeq: number): number {
  return Math.max(0, lastSeq - lastReadSeq);
}

/**
 * S-FR-MSG-8 (AD-MSG-3 rule 2, C-GAP-4): what a mute request does. A buyer's sets `mutedAt` to now or clears it;
 * a business's is an explained no-op that writes nothing, so user input never reaches `participant_mute_buyer_only`.
 */
export function muteChange(role: ParticipantRole, muted: boolean, now: IsoInstant): { kind: 'set'; mutedAt: IsoInstant | null } | { kind: 'businessNoOp' } {
  if (role === 'business') return { kind: 'businessNoOp' };
  return { kind: 'set', mutedAt: muted ? now : null };
}

/** An inbox position: the `(lastMessageAt desc, id)` key of a page's last row (`null` sorts last, as no message yet). */
export interface InboxKey { lastMessageAt: IsoInstant | null; conversationId: CuidId }

const ISO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CUID = /^[a-z][0-9a-z]{23}$/;

/** S-FR-MSG-7.inbox (decision log Impl-2 #15): the opaque keyset cursor, bound to the reader. */
export function encodeInboxCursor(actorId: CuidId, key: InboxKey): string {
  return Buffer.from(`inbox|${actorId}|${key.lastMessageAt ?? '-'}|${key.conversationId}`, 'utf8').toString('base64url');
}

/** The cursor's key, or null when it is not one this service issued for `actorId`'s inbox. */
export function decodeInboxCursor(cursor: string, actorId: CuidId): InboxKey | null {
  const [tag, owner, instant, conversationId, ...rest] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  if (rest.length > 0 || tag !== 'inbox' || owner !== actorId || instant === undefined || conversationId === undefined || !CUID.test(conversationId)) return null;
  if (instant === '-') return { lastMessageAt: null, conversationId };
  return ISO_MS.test(instant) ? { lastMessageAt: instant, conversationId } : null;
}
