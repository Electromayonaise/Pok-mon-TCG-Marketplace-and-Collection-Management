// Core domain — TRD. Pure (AD-SYS-6).
import type { RequestIssue } from '../../../shared-kernel/request.js';

export type OfferRole = 'proposer' | 'seller';
export type OfferStatus = 'Open' | 'Accepted' | 'Rejected' | 'Withdrawn' | 'Expired' | 'Unfulfillable' | 'Cancelled';

export interface OfferFacts {
  proposerId: string;
  sellerId: string;
  status: OfferStatus;
  turn: OfferRole;
  expiresAt: Date;
}

/** An offer lives 7 days (ADD-§9.3). */
export const OFFER_TTL_MS = 7 * 24 * 3_600_000;
/** AD-TRD-1 rule 3: `1 ≤ roundCount ≤ 10`. */
export const MAX_ROUNDS = 10;
/** FR-TRD-1: at most 10 offered items, each 1–4 copies, and 0–100,000,000 COP. */
export const MAX_ITEMS = 10;
export const MAX_ITEM_QTY = 4;
export const MAX_CASH_COP = 100_000_000;
const CONDITIONS = new Set(['NM', 'LP', 'MP', 'HP', 'DMG', 'Sealed']);

/** AD-TRD-1 rule 5: Expired when Open and expiresAt ≤ now; otherwise the stored status. */
export function deriveOfferStatus(offer: Pick<OfferFacts, 'status' | 'expiresAt'>, now: Date): OfferStatus {
  return offer.status === 'Open' && offer.expiresAt.getTime() <= now.getTime() ? 'Expired' : offer.status;
}

/** AD-TRD-1 rule 4: the actor's role, or null when the actor is neither party. */
export function roleOf(offer: Pick<OfferFacts, 'proposerId' | 'sellerId'>, actorId: string): OfferRole | null {
  if (offer.proposerId === actorId) return 'proposer';
  return offer.sellerId === actorId ? 'seller' : null;
}

/** FR-TRD-2/3: the actor's role, or the code that refuses the action (precedence: visibility, open, turn). */
export function turnVerdict(
  offer: OfferFacts,
  actorId: string,
  now: Date,
): { ok: true; role: OfferRole } | { ok: false; code: 'TradeOfferNotVisibleToCaller' | 'TradeOfferNotOpen' | 'NotYourTurn' } {
  const role = roleOf(offer, actorId);
  if (role === null) return { ok: false, code: 'TradeOfferNotVisibleToCaller' };
  if (deriveOfferStatus(offer, now) !== 'Open') return { ok: false, code: 'TradeOfferNotOpen' };
  return offer.turn === role ? { ok: true, role } : { ok: false, code: 'NotYourTurn' };
}

/** The facts an offer action's 0-row re-read maps (AD-TRD-1 rule 2). */
export interface OfferState extends Pick<OfferFacts, 'status' | 'turn' | 'expiresAt'> {
  version: number;
  roundCount: number;
}

/**
 * AD-TRD-1 rule 2 in the order of decision log Impl-1 #35 (D4): a derived status other than Open, then a stale
 * version (citing the latest round), then the turn. null when the action may apply. `turn` is null for withdraw.
 */
export function offerActionRefusal(
  offer: OfferState,
  expectedVersion: number,
  turn: OfferRole | null,
  now: Date,
): { code: 'TradeOfferNotOpen'; inputs: { status: OfferStatus; latestRound?: number; version?: number } } | { code: 'NotYourTurn'; inputs: { turn: OfferRole } } | null {
  const status = deriveOfferStatus(offer, now);
  if (status !== 'Open') return { code: 'TradeOfferNotOpen', inputs: { status } };
  if (offer.version !== expectedVersion) return { code: 'TradeOfferNotOpen', inputs: { status, latestRound: offer.roundCount, version: offer.version } };
  if (turn !== null && offer.turn !== turn) return { code: 'NotYourTurn', inputs: { turn: offer.turn } };
  return null;
}

export interface TradeTerms {
  offeredItems: { itemRef: string; condition: string; qty: number }[];
  cashCop: number;
  requestedQty: number;
}

/**
 * FR-TRD-1 term validation (decision log Impl-1 #35, D6): the shape issues the parser also checks, repeated for
 * in-process callers, so terms reach the store and the contact handoff only when valid.
 */
export function termsIssues(terms: TradeTerms): RequestIssue[] {
  const issues: RequestIssue[] = [];
  if (!Number.isSafeInteger(terms.cashCop) || terms.cashCop < 0 || terms.cashCop > MAX_CASH_COP) issues.push({ field: 'terms.cashCop', issue: 'debe ser un entero entre 0 y 100.000.000' });
  if (!Array.isArray(terms.offeredItems) || terms.offeredItems.length > MAX_ITEMS) issues.push({ field: 'terms.offeredItems', issue: 'puede tener como máximo 10 cartas' });
  else if (terms.offeredItems.some((i) => !Number.isInteger(i.qty) || i.qty < 1 || i.qty > MAX_ITEM_QTY)) issues.push({ field: 'terms.offeredItems', issue: 'cada carta va de 1 a 4 copias' });
  else if (terms.offeredItems.some((i) => !CONDITIONS.has(i.condition))) issues.push({ field: 'terms.offeredItems', issue: 'cada carta necesita una condición válida' });
  if (terms.requestedQty !== 1) issues.push({ field: 'terms.requestedQty', issue: 'debe ser 1' });
  return issues;
}

/** TRD-2 P2: no item and no cash. */
export const isEmptyTerms = (terms: TradeTerms): boolean => terms.offeredItems.length === 0 && terms.cashCop === 0;

/** TRD-2 P8 (G-1): the item multiset sorted by `(itemRef, condition, qty)`, plus `cashCop`. */
export function canonicalTerms(terms: TradeTerms): string {
  const items = terms.offeredItems.map((i) => [i.itemRef, i.condition, i.qty] as const).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[2] - b[2]));
  return JSON.stringify({ items, cashCop: terms.cashCop });
}

/** S-FR-TRD-3.mine: the keyset `("updatedAt" DESC, id DESC)` as an opaque cursor. */
export function encodeOfferCursor(updatedAt: string, id: string): string {
  return Buffer.from(`${updatedAt}|${id}`, 'utf8').toString('base64url');
}

/** The cursor's keyset, or null when it is not one this service issued. */
export function decodeOfferCursor(cursor: string): { updatedAt: string; id: string } | null {
  const [updatedAt, id, ...rest] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  if (rest.length > 0 || !updatedAt || !id || !/^[a-z][0-9a-z]{23}$/.test(id)) return null;
  const at = Date.parse(updatedAt);
  return Number.isNaN(at) || new Date(at).toISOString() !== updatedAt ? null : { updatedAt, id };
}
