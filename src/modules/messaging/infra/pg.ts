// Driven adapters (persistence) — messaging. The Solu-1 stub below is bound to the retired migration 008_create_messaging.sql
// (git 853449c:docs/solu-1/planning/schemas/); the Solu-2 PgMsgRepository at the end is bound to
// _bmad-output/planning-artifacts/detailed-design/schemas.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { IConversationRepository } from '../ports/msg.js';
import type { ConversationRow, MsgTablesRepository } from '../ports/msg.v2.js';

export class PgConversationRepository implements IConversationRepository {
  constructor(protected readonly sql: Sql) {}
  async participantRole(): Promise<null> {
    throw new NotImplementedError('PgConversationRepository.participantRole');
  }
  async startOrGet(): Promise<never> {
    throw new NotImplementedError('PgConversationRepository.startOrGet');
  }
  async allocateSeq(): Promise<number> {
    throw new NotImplementedError('PgConversationRepository.allocateSeq');
  }
  async insertMessage(): Promise<'inserted' | 'duplicate'> {
    throw new NotImplementedError('PgConversationRepository.insertMessage');
  }
  async findByClientMessageId(): Promise<null> {
    throw new NotImplementedError('PgConversationRepository.findByClientMessageId');
  }
  async findPair(): Promise<null> {
    throw new NotImplementedError('PgConversationRepository.findPair');
  }
}

type SentMessage = { conversationId: CuidId; messageId: CuidId; seq: number; recipientVerificationAtSend: 'Approved' | 'Pending' };

/** MSG's own tables (AD-8): `"Conversation"`, `"ConversationParticipant"`, `"Message"`. */
export class PgMsgRepository implements MsgTablesRepository {
  async readConversationFor(tx: Tx, conversationId: CuidId, userId: CuidId): Promise<ConversationRow | null> {
    const { rows } = await tx.query<ConversationRow>(
      `SELECT c.id, c."buyerId", c."businessId" FROM "Conversation" c
         JOIN "ConversationParticipant" p ON p."conversationId" = c.id AND p."userId" = $2
        WHERE c.id = $1`,
      [conversationId, userId],
    );
    return rows[0] ?? null;
  }

  async startOrGetConversation(tx: Tx, c: { id: CuidId; buyerId: CuidId; businessId: CuidId; now: IsoInstant }): Promise<CuidId> {
    await tx.query(
      `INSERT INTO "Conversation" (id, "buyerId", "businessId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT ("buyerId", "businessId") DO NOTHING`,
      [c.id, c.buyerId, c.businessId, c.now],
    );
    const { rows } = await tx.query<{ id: CuidId }>(`SELECT id FROM "Conversation" WHERE "buyerId" = $1 AND "businessId" = $2`, [c.buyerId, c.businessId]);
    const conversationId = rows[0]!.id;
    await tx.query(
      `INSERT INTO "ConversationParticipant" ("conversationId", "userId", role, "createdAt", "updatedAt")
       VALUES ($1, $2, 'buyer', $4, $4), ($1, $3, 'business', $4, $4)
       ON CONFLICT DO NOTHING`,
      [conversationId, c.buyerId, c.businessId, c.now],
    );
    return conversationId;
  }

  async allocateSeq(tx: Tx, conversationId: CuidId, now: IsoInstant): Promise<number> {
    const { rows } = await tx.query<{ lastSeq: string }>(
      `UPDATE "Conversation" SET "lastSeq" = "lastSeq" + 1, "lastMessageAt" = $2, "updatedAt" = $2 WHERE id = $1 RETURNING "lastSeq"`,
      [conversationId, now],
    );
    return Number(rows[0]!.lastSeq);
  }

  async insertMessage(tx: Tx, m: {
    id: CuidId; conversationId: CuidId; seq: number; senderId: CuidId; body: string; clientMessageId: string;
    recipientVerificationAtSend: 'Approved' | 'Pending'; now: IsoInstant;
  }): Promise<'inserted' | 'duplicate'> {
    await tx.query('SAVEPOINT send_insert');
    try {
      await tx.query(
        `INSERT INTO "Message" (id, "conversationId", seq, "senderId", body, "clientMessageId", "recipientVerificationAtSend", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [m.id, m.conversationId, m.seq, m.senderId, m.body, m.clientMessageId, m.recipientVerificationAtSend, m.now],
      );
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code !== '23505' || pgError.constraint !== 'message_idempotent_send') throw error;
      await tx.query('ROLLBACK TO SAVEPOINT send_insert');
      return 'duplicate';
    }
    await tx.query('RELEASE SAVEPOINT send_insert');
    return 'inserted';
  }

  async findSentMessage(tx: Tx, k: { conversationId: CuidId } | { buyerId: CuidId; businessId: CuidId }, senderId: CuidId, clientMessageId: string): Promise<SentMessage | null> {
    const [where, params] = 'conversationId' in k
      ? [`c.id = $1`, [k.conversationId]]
      : [`c."buyerId" = $1 AND c."businessId" = $2`, [k.buyerId, k.businessId]];
    const { rows } = await tx.query<{ conversationId: CuidId; messageId: CuidId; seq: string; recipientVerificationAtSend: 'Approved' | 'Pending' }>(
      `SELECT m."conversationId", m.id AS "messageId", m.seq, m."recipientVerificationAtSend"
         FROM "Message" m JOIN "Conversation" c ON c.id = m."conversationId"
        WHERE ${where} AND m."senderId" = $${params.length + 1} AND m."clientMessageId" = $${params.length + 2}`,
      [...params, senderId, clientMessageId],
    );
    const r = rows[0];
    return r === undefined ? null : { ...r, seq: Number(r.seq) };
  }
}
