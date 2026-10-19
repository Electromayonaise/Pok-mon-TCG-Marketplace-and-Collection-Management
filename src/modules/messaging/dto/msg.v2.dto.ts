import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';

// Solu-2 DTOs — MSG in-app (contracts.md §9, §15). MSG-2 lives in listings, MSG-3 in identity.

// MSG-1 sendMessage
export type SendTarget = { recipientId: CuidId } | { conversationId: CuidId };
export interface SendMessageRequest { target: SendTarget; body: string; clientMessageId: string; senderId: CuidId }
export interface SendMessageResponse { conversationId: CuidId; messageId: CuidId; seq: number; decision: ExplanationDTO }

// S-FR-MSG-7 inbox and read state
export interface InboxRowDTO { conversationId: CuidId; counterpartName: string; lastMessageAt: IsoInstant | null; unread: number; muted: boolean }
export interface ListInboxRequest { actorId: CuidId; cursor: string | null }
export interface ListInboxResponse { rows: InboxRowDTO[]; nextCursor: string | null; unreadTotal: number }
export interface GetThreadRequest { actorId: CuidId; conversationId: CuidId; afterSeq: number }
export interface ThreadMessageDTO { messageId: CuidId; seq: number; mine: boolean; body: string; at: IsoInstant }
export interface GetThreadResponse { messages: ThreadMessageDTO[]; lastSeq: number; decision: ExplanationDTO }
export interface MarkReadRequest { actorId: CuidId; conversationId: CuidId; seq: number }
export interface MarkReadResponse { lastReadSeq: number; unread: number }

// S-FR-MSG-8 mute
export interface SetMutedRequest { actorId: CuidId; conversationId: CuidId; muted: boolean }
export interface SetMutedResponse { muted: boolean; decision: ExplanationDTO }
