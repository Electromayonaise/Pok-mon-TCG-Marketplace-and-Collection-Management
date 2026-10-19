import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { ConversationRefDTO } from '../dto/msg.dto.js';
import type { ParticipantRole } from '../domain/msg.js';

// Outbound ports — MSG in-app.

/** Neighbour port: identity's offered surface (AD-1 edge messaging → identity). */
export interface IdentityForMessaging {
  getSellerKinds(userIds: readonly CuidId[]): Promise<{ userId: CuidId; sellerKind: 'business' | 'individual' | 'none'; verified: boolean }[]>;
  /** Throws NotBusinessAccount (owner identity) itself (review F-02). */
  requireMessagingEligibility(userId: CuidId): Promise<{ status: 'Approved' | 'Pending' }>;
}

export interface IConversationRepository {
  participantRole(conversationId: CuidId, userId: CuidId): Promise<ParticipantRole | null>;
  /** INSERT … ON CONFLICT ("buyerId","businessId") DO NOTHING, then select; participants ON CONFLICT DO NOTHING. */
  startOrGet(tx: Tx, conversationId: CuidId, buyerId: CuidId, businessId: CuidId, now: Date): Promise<CuidId>;
  /** UPDATE "Conversation" SET "lastSeq" = "lastSeq" + 1 … RETURNING "lastSeq" (AD-MSG-2 rule 3). */
  allocateSeq(tx: Tx, conversationId: CuidId, now: Date): Promise<number>;
  /** SAVEPOINT send_insert; INSERT; on 23505 → 'duplicate' after ROLLBACK TO SAVEPOINT (review F-16). */
  insertMessage(
    tx: Tx,
    row: { id: CuidId; conversationId: CuidId; seq: number; senderId: CuidId; body: string; clientMessageId: string; recipientVerificationAtSend: 'Approved' | 'Pending'; at: Date },
  ): Promise<'inserted' | 'duplicate'>;
  findByClientMessageId(conversationId: CuidId, senderId: CuidId, clientMessageId: string): Promise<{ messageId: CuidId; seq: number } | null>;
  findPair(buyerId: CuidId, businessId: CuidId): Promise<ConversationRefDTO | null>;
}
