// Driven adapters (persistence) — messaging. The Solu-1 stub below is bound to the retired migration 008_create_messaging.sql
// (git 853449c:docs/solu-1/planning/schemas/); the Solu-2 PgMsgRepository at the end is bound to
// _bmad-output/planning-artifacts/detailed-design/schemas.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { IConversationRepository } from '../ports/msg.js';
import type { InboxKey } from '../domain/msg.js';
import type { ConversationRow, MsgTablesRepository, ParticipantView, ThreadMessageRow } from '../ports/msg.v2.js';

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

/** The caller's own participant row joined to its conversation (AD-MSG-3 rule 4: never the other side's row). */
const VIEW = `SELECT c.id AS "conversationId", c."buyerId", c."businessId", p.role, c."lastSeq", c."lastMessageAt", p."lastReadSeq", p."mutedAt"
                FROM "ConversationParticipant" p JOIN "Conversation" c ON c.id = p."conversationId"`;
/** `(lastMessageAt desc, id)` with no message yet last: `-infinity` stands for a null instant in the order and the keyset. */
const AT = `COALESCE(c."lastMessageAt", '-infinity'::timestamptz)`;

type ViewRecord = Omit<ParticipantView, 'lastSeq' | 'lastReadSeq' | 'lastMessageAt' | 'mutedAt'> & { lastSeq: string; lastReadSeq: string; lastMessageAt: Date | null; mutedAt: Date | null };
const toView = (r: ViewRecord): ParticipantView => ({
  ...r, lastSeq: Number(r.lastSeq), lastReadSeq: Number(r.lastReadSeq),
  lastMessageAt: r.lastMessageAt === null ? null : r.lastMessageAt.toISOString(), mutedAt: r.mutedAt === null ? null : r.mutedAt.toISOString(),
});

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
  async readParticipantView(tx: Tx, conversationId: CuidId, userId: CuidId): Promise<ParticipantView | null> {
    const { rows } = await tx.query<ViewRecord>(`${VIEW} WHERE p."conversationId" = $1 AND p."userId" = $2`, [conversationId, userId]);
    return rows[0] === undefined ? null : toView(rows[0]);
  }

  async listInboxPage(tx: Tx, userId: CuidId, limit: number, after: InboxKey | null): Promise<ParticipantView[]> {
    const params: unknown[] = [userId, limit];
    let keyset = '';
    if (after !== null) {
      params.push(after.lastMessageAt ?? '-infinity', after.conversationId);
      keyset = `AND (${AT} < $3::timestamptz OR (${AT} = $3::timestamptz AND c.id > $4))`;
    }
    const { rows } = await tx.query<ViewRecord>(`${VIEW} WHERE p."userId" = $1 ${keyset} ORDER BY ${AT} DESC, c.id ASC LIMIT $2`, params);
    return rows.map(toView);
  }

  async unreadTotal(tx: Tx, userId: CuidId): Promise<number> {
    const { rows } = await tx.query<{ total: string }>(
      `SELECT COALESCE(SUM(GREATEST(c."lastSeq" - p."lastReadSeq", 0)), 0)::text AS total
         FROM "ConversationParticipant" p JOIN "Conversation" c ON c.id = p."conversationId"
        WHERE p."userId" = $1 AND p."mutedAt" IS NULL`,
      [userId],
    );
    return Number(rows[0]!.total);
  }

  async threadMessages(tx: Tx, conversationId: CuidId, afterSeq: number, limit: number): Promise<ThreadMessageRow[]> {
    const { rows } = await tx.query<{ messageId: CuidId; seq: string; senderId: CuidId; body: string; createdAt: Date }>(
      `SELECT id AS "messageId", seq, "senderId", body, "createdAt" FROM "Message"
        WHERE "conversationId" = $1 AND seq > $2 ORDER BY seq ASC LIMIT $3`,
      [conversationId, afterSeq, limit],
    );
    return rows.map((r) => ({ ...r, seq: Number(r.seq), createdAt: r.createdAt.toISOString() }));
  }

  async advanceReadSeq(tx: Tx, conversationId: CuidId, userId: CuidId, seq: number, now: IsoInstant): Promise<{ lastReadSeq: number; lastSeq: number }> {
    // Under READ COMMITTED a concurrent higher mark that committed first is re-checked against this WHERE, so it is never lowered.
    const { rows } = await tx.query<{ lastReadSeq: string; lastSeq: string }>(
      `UPDATE "ConversationParticipant" p SET "lastReadSeq" = LEAST($3::bigint, c."lastSeq"), "updatedAt" = $4
         FROM "Conversation" c
        WHERE c.id = p."conversationId" AND p."conversationId" = $1 AND p."userId" = $2 AND p."lastReadSeq" < LEAST($3::bigint, c."lastSeq")
        RETURNING p."lastReadSeq", c."lastSeq"`,
      [conversationId, userId, seq, now],
    );
    const moved = rows[0] ?? (await tx.query<{ lastReadSeq: string; lastSeq: string }>(
      `SELECT p."lastReadSeq", c."lastSeq" FROM "ConversationParticipant" p JOIN "Conversation" c ON c.id = p."conversationId"
        WHERE p."conversationId" = $1 AND p."userId" = $2`,
      [conversationId, userId],
    )).rows[0]!;
    return { lastReadSeq: Number(moved.lastReadSeq), lastSeq: Number(moved.lastSeq) };
  }

  async setBuyerMutedAt(tx: Tx, conversationId: CuidId, userId: CuidId, mutedAt: IsoInstant | null, now: IsoInstant): Promise<void> {
    await tx.query(
      `UPDATE "ConversationParticipant" SET "mutedAt" = $3, "updatedAt" = $4
        WHERE "conversationId" = $1 AND "userId" = $2 AND role = 'buyer' AND ("mutedAt" IS NULL) = ($3::timestamptz IS NOT NULL)`,
      [conversationId, userId, mutedAt, now],
    );
  }
}
