import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { Decision } from '../../../shared-kernel/decision.js';

// DTOs — MSG in-app (contracts.md §9). Primitive fields only (Decision is the AD-SYS-1 shape of primitives).

// assertConversationParticipant
export interface AssertConversationParticipantRequestDTO {
  conversationId: CuidId;
  actorId: CuidId;
}
export interface AssertConversationParticipantResponseDTO {
  role: 'buyer' | 'business';
}

// sendMessage
/** Exactly one of the two shapes; the parser uses .strict() objects, so both or neither is refused (review E-21). */
export type SendMessageTargetDTO =
  /** Start path: a buyer messages a business for the first time. */
  | { recipientId: CuidId }
  /** Reply path: either participant writes in an existing conversation. */
  | { conversationId: CuidId };
export interface SendMessageRequestDTO {
  target: SendMessageTargetDTO;
  /** 1–2,000 characters after NFC normalization. */
  body: string;
  /** 1–64 chars of [A-Za-z0-9_-]; the browser reuses it on retry (GAP-3). */
  clientMessageId: string;
  senderId: CuidId;
}
export interface SendMessageResponseDTO {
  conversationId: CuidId;
  messageId: CuidId;
  seq: number;
  /** allowed, or allowedWithNotice with RecipientNotYetVerified for a Pending business. */
  decision: Decision;
}

// findConversation
export interface FindConversationRequestDTO {
  buyerId: CuidId;
  businessId: CuidId;
}
export interface ConversationRefDTO {
  conversationId: CuidId;
  lastSeq: number;
  /** null when the conversation has no message yet. */
  lastMessageAt: IsoInstant | null;
}
/** null when the pair has no conversation (silent). */
export type FindConversationResponseDTO = ConversationRefDTO | null;
