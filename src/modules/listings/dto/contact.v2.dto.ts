import type { Cop, CuidId } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';

// Solu-2 DTOs — MSG-2 contact handoff, hosted in listings (contracts.md §9).

export interface TradeSummaryDTO {
  /** TRD sends `itemRef`s, which the contact service names through catalog; a `name` is used as is (decision log Impl-1 #35). */
  offeredItems: { itemRef?: CuidId; name?: string; condition: string; qty: number }[];
  cashCop: Cop;
}
export interface GenerateContactMessageRequest {
  kind: 'purchase' | 'trade';
  listingId: CuidId;
  requesterId: CuidId;
  tradeSummary: TradeSummaryDTO | null;
  /** HMAC-SHA256 of the caller IP; null on the trade path (no limiter, EC-37). */
  ipHmac: string | null;
}
export interface ContactMessageDTO {
  text: string;
  /** Carries the regulated phone; this DTO is its only carrier (AD-SYS-8 rule 3). */
  externalUrl: string;
  copyText: string;
  requesterDisplayName: string;
  decision: ExplanationDTO;
}
export type GenerateContactMessageResponse = ContactMessageDTO;
