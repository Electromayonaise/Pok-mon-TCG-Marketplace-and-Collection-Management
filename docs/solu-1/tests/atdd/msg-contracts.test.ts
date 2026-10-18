// Solu-1 ATDD — MSG in-app contracts (contracts.md §9). RED until implemented.
import { beforeEach, describe, expect, it } from 'vitest';
import { createMsgModule, type IdentityForMessaging } from '../../../../src/modules/messaging/index.js';
import { DomainError } from '../../../../src/shared-kernel/errors.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, httpOf } from '../../../../test-support/errors.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';
import { wiring, type Wiring } from '../../../../test-support/wiring.js';

const db = useTestDatabase();
let w: Wiring;
const camila = id('camila');
const andres = id('andres');
const status = new Map<string, 'Approved' | 'Pending' | 'Rejected'>();
const notBusiness = new DomainError('NotBusinessAccount', [{ rule: 'FR-MSG-4', inputs: { recipientId: andres } }]);
const identity: IdentityForMessaging = {
  getSellerKinds: async (ids) => ids.map((userId) => ({ userId, sellerKind: status.has(userId) ? 'business' : 'none', verified: status.get(userId) === 'Approved' })),
  requireMessagingEligibility: async (userId) => {
    const s = status.get(userId);
    if (s === 'Approved' || s === 'Pending') return { status: s };
    throw notBusiness;
  },
};
beforeEach(() => {
  w = wiring(db);
  status.clear();
  status.set(andres, 'Approved');
});
const msg = () => createMsgModule({ sql: w.sql, transactions: w.transactions, clock: w.clock, ids: w.ids, identity });
const send = (senderId: string, target: { recipientId: string } | { conversationId: string }, clientMessageId: string, body = 'Hola, ¿tienes el Pikachu ex?') =>
  msg().sendMessage({ target, body, clientMessageId, senderId });

describe('Solu-1 ATDD: MSG — assertConversationParticipant (guard, FR-MSG-7)', () => {
  it('RED: a participant gets their role', async () => {
    await seed.conversation(db, { id: id('conv'), buyerId: camila, businessId: andres });
    expect(await msg().assertConversationParticipant({ conversationId: id('conv'), actorId: andres })).toEqual({ role: 'business' });
  });

  it('RED: a non-participant and an unknown id both get ConversationNotVisibleToCaller (403)', async () => {
    await seed.conversation(db, { id: id('conv'), buyerId: camila, businessId: andres });
    for (const conversationId of [id('conv'), id('ghost')]) {
      const error = await caught(() => msg().assertConversationParticipant({ conversationId, actorId: id('julian') }));
      expect(codeOf(error)).toBe('ConversationNotVisibleToCaller');
      expect(httpOf(error)).toBe(403);
    }
  });
});

describe('Solu-1 ATDD: MSG — sendMessage (contended mutation, AD-MSG-2)', () => {
  it('RED: a buyer messaging an Approved business starts one conversation with two participants and message seq 1', async () => {
    const result = await send(camila, { recipientId: andres }, 'c1');
    expect(result).toMatchObject({ seq: 1, decision: { outcome: 'allowed' } });
    expect(await db.counts(['Conversation', 'ConversationParticipant', 'Message'])).toEqual({ Conversation: 1, ConversationParticipant: 2, Message: 1 });
    expect(await db.query(`SELECT "lastSeq"::int AS "lastSeq" FROM "Conversation"`)).toEqual([{ lastSeq: 1 }]);
  });

  it('RED: a Pending business receives with a notice (allowedWithNotice, RecipientNotYetVerified)', async () => {
    status.set(andres, 'Pending');
    expect((await send(camila, { recipientId: andres }, 'c1')).decision).toMatchObject({ outcome: 'allowedWithNotice', reasonCode: 'RecipientNotYetVerified' });
  });

  it("RED: a Rejected business — identity's NotBusinessAccount propagates unchanged and nothing is stored", async () => {
    status.set(andres, 'Rejected');
    const error = await caught(() => send(camila, { recipientId: andres }, 'c1'));
    expect(error).toBe(notBusiness);
    expect(httpOf(error)).toBe(409);
    expect(await db.counts(['Conversation', 'Message'])).toEqual({ Conversation: 0, Message: 0 });
  });

  it('RED: a business opening a conversation gets BusinessCannotInitiate (409)', async () => {
    status.set(id('tiendapaisa'), 'Approved');
    expect(codeOf(await caught(() => send(id('tiendapaisa'), { recipientId: andres }, 'c1')))).toBe('BusinessCannotInitiate');
  });

  it('RED: a retry with the same clientMessageId returns the original message and stores nothing new', async () => {
    const first = await send(camila, { recipientId: andres }, 'c1');
    const retry = await send(camila, { conversationId: first.conversationId }, 'c1');
    expect(retry).toMatchObject({ conversationId: first.conversationId, messageId: first.messageId, seq: 1 });
    expect(await db.counts(['Message'])).toEqual({ Message: 1 });
    expect(await db.query(`SELECT "lastSeq"::int AS "lastSeq" FROM "Conversation"`)).toEqual([{ lastSeq: 1 }]);
  });

  it('RED: two first messages at once to the same business — one conversation, seqs 1 and 2', async () => {
    const outcome = await race(2, (n) => send(camila, { recipientId: andres }, `c${n}`));
    expect(outcome.rejected.map(codeOf)).toEqual([]);
    expect(await db.counts(['Conversation'])).toEqual({ Conversation: 1 });
    expect(await db.query(`SELECT seq::int AS seq FROM "Message" ORDER BY seq`)).toEqual([{ seq: 1 }, { seq: 2 }]);
  });

  it('RED (review F-15): a Pending business replying to its buyer is allowed with no recipient notice', async () => {
    status.set(andres, 'Pending');
    await seed.conversation(db, { id: id('conv'), buyerId: camila, businessId: andres });
    expect((await send(andres, { conversationId: id('conv') }, 'r1', 'Sí, lo tengo')).decision).toMatchObject({ outcome: 'allowed' });
  });
});

describe('Solu-1 ATDD: MSG — findConversation (resolver, FR-MSG-4)', () => {
  it('RED: returns the existing conversation of the pair', async () => {
    await seed.conversation(db, { id: id('conv'), buyerId: camila, businessId: andres });
    expect(await msg().findConversation({ buyerId: camila, businessId: andres })).toEqual({ conversationId: id('conv'), lastSeq: 0, lastMessageAt: null });
  });

  it('RED: no conversation resolves silently to null and none is created', async () => {
    expect(await msg().findConversation({ buyerId: camila, businessId: andres })).toBeNull();
    expect(await db.counts(['Conversation'])).toEqual({ Conversation: 0 });
  });
});
