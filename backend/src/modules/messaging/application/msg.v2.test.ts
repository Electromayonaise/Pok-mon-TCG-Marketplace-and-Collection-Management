// MsgServiceV2.sendMessage (MSG-1) against Postgres with the real identity: the edges the ATDD tests leave out —
// the P2 refusals, the business's reply, the read-only thread of a Rejected business, the audit row without the
// body, a retry after the business was approved, and the send on a pool of 1 (AD-SYS-4 rule 9). Story 9.6 adds the
// read side: inbox paging and its cursor, ties and empty conversations, the 100-message thread, seq checks, the clamp and mute.
import { describe, expect, it } from 'vitest';
import { PgTransactionRunner, useTestDatabase } from '../../../../test-support/db.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { admin, at, business, conversation, id, rejectionReason, rows, T0, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { IdnServiceV2, VerServiceV2 } from '../../identity/index.js';
import type { TransactionRunner } from '../../../shared-kernel/ports.js';
import type { SendMessageRequest } from '../dto/msg.v2.dto.js';
import { MsgServiceV2 } from './msg.v2.js';
import { singleConnectionPool } from '../../../../test-support/single-connection.js';

const db = useTestDatabase();

function messaging(transactions: TransactionRunner = db.transactions) {
  const w = { ...wiring(db), transactions };
  const idn = new IdnServiceV2(w);
  const ver = new VerServiceV2(w);
  return new MsgServiceV2({
    ...w,
    identity: { getDisplayNames: (i) => idn.getDisplayNames(i), getBusinessName: (i) => ver.getBusinessName(i), requireMessagingEligibility: (i) => ver.requireMessagingEligibility(i) },
  });
}
const send = (o: Partial<SendMessageRequest> = {}): SendMessageRequest => ({ target: { recipientId: id('andres') }, body: 'Hola', clientMessageId: 'cm-1', senderId: id('camila'), ...o });

describe('MsgServiceV2.sendMessage (MSG-1)', () => {
  it('P2: a body of spaces and a body with a NUL are RequestValidationFailed, and nothing is written (#38)', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Approved');
    for (const body of ['   \n ', 'Hola\u0000']) expect(codeOf(await caught(() => messaging().sendMessage(send({ body }))))).toBe('RequestValidationFailed');
    expect(await rows(db, 'Conversation')).toHaveLength(0);
  });

  it('P2: an empty body, a bad clientMessageId and two targets are one RequestValidationFailed, and nothing is written', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Approved');
    const target = { recipientId: id('andres'), conversationId: id('c1') } as unknown as SendMessageRequest['target'];
    const error = await caught(() => messaging().sendMessage(send({ body: '', clientMessageId: 'no válido', target })));
    expect(codeOf(error)).toBe('RequestValidationFailed');
    expect((error as { citations: { inputs: { field: string } }[] }).citations.map((c) => c.inputs.field)).toEqual(['body', 'clientMessageId', 'target']);
    expect(await rows(db, 'Conversation')).toHaveLength(0);
  });

  it('the business replies in its conversation; the audit rows carry ids and seqs, never the body (AD-SYS-8 rule 3)', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Pending');
    const msg = messaging();
    const first = await msg.sendMessage(send({ body: 'Secreto del cuerpo' }));
    const reply = await msg.sendMessage(send({ target: { conversationId: first.conversationId }, senderId: id('andres'), body: 'Respuesta privada' }));
    expect(reply).toMatchObject({ conversationId: first.conversationId, seq: 2, decision: { outcome: 'allowedWithNotice', reasonCode: 'RecipientNotYetVerified' } });
    expect(await rows(db, 'Message')).toMatchObject([{ recipientVerificationAtSend: 'Pending' }, { recipientVerificationAtSend: 'Pending' }]);
    const audit = JSON.stringify(await rows(db, 'audit_events'));
    expect(audit).toContain('messaging.message.sent');
    expect(audit).not.toContain('Secreto');
    expect(audit).not.toContain('Respuesta');
  });

  it('a Rejected business\'s thread is read-only for both sides: NotBusinessAccount citing the status, zero writes', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Rejected');
    await conversation(db, { id: id('c1'), buyerId: id('camila'), businessId: id('andres') });
    for (const senderId of [id('camila'), id('andres')]) {
      const error = await caught(() => messaging().sendMessage(send({ target: { conversationId: id('c1') }, senderId })));
      expect(codeOf(error)).toBe('NotBusinessAccount');
      expect(citedInputs(error)).toEqual({ status: 'Rejected' });
    }
    expect(await rows(db, 'Message')).toHaveLength(0);
    expect(await rows(db, 'Conversation')).toMatchObject([{ lastSeq: '0' }]);
  });

  it('an unknown conversation is ConversationNotVisibleToCaller with the same body as a foreign one', async () => {
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian') });
    await business(db, id('andres'), 'Approved');
    await conversation(db, { id: id('c1'), buyerId: id('camila'), businessId: id('andres') });
    const foreign = await caught(() => messaging().sendMessage(send({ target: { conversationId: id('c1') }, senderId: id('julian') })));
    const unknown = await caught(() => messaging().sendMessage(send({ target: { conversationId: id('ghost') }, senderId: id('julian') })));
    expect(codeOf(unknown)).toBe('ConversationNotVisibleToCaller');
    const body = (e: unknown) => JSON.stringify([codeOf(e), (e as { citations: unknown }).citations]);
    expect(body(foreign)).toBe(body(unknown));
  });

  it('a retry keeps the original decision: the notice stored at send, even after the business was approved', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Pending');
    const msg = messaging();
    const first = await msg.sendMessage(send());
    await admin(db);
    await new VerServiceV2(wiring(db)).decideApplication({ applicationId: id(`app${id('andres').slice(0, 8)}`), decision: { kind: 'approve' }, adminId: id('admin') });
    expect(await msg.sendMessage(send())).toMatchObject({ messageId: first.messageId, seq: 1, decision: { reasonCode: 'RecipientNotYetVerified' } });
    expect(await rows(db, 'audit_events', `action = 'messaging.message.sent'`)).toHaveLength(1);
  });

  it('a retry after the business was rejected still returns the original message (EC-14, looked up before P5)', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Pending');
    const msg = messaging();
    const first = await msg.sendMessage(send());
    await admin(db);
    await rejectionReason(db, { code: 'DataMismatch' });
    await new VerServiceV2(wiring(db)).decideApplication({ applicationId: id(`app${id('andres').slice(0, 8)}`), decision: { kind: 'reject', reasonCode: 'DataMismatch', note: null }, adminId: id('admin') });
    expect(await msg.sendMessage(send())).toMatchObject({ messageId: first.messageId, seq: 1 });
    expect(codeOf(await caught(() => msg.sendMessage(send({ clientMessageId: 'cm-2' }))))).toBe('NotBusinessAccount');
  });

  it('runs on a pool of 1: the eligibility read joins the send\'s connection', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Approved');
    const pool = singleConnectionPool(db);
    try {
      expect(await messaging(new PgTransactionRunner(pool)).sendMessage(send())).toMatchObject({ seq: 1 });
    } finally {
      await pool.end();
    }
  });
});

describe('MsgServiceV2 inbox, thread, read mark and mute (S-FR-MSG-7, S-FR-MSG-8; Story 9.6)', () => {
  /** Camila talks with `n` Approved businesses: conversation i has `i + 1` messages, its last at T0 + i minutes. */
  async function inbox(n: number): Promise<void> {
    await user(db, { id: id('camila') });
    for (let i = 0; i < n; i++) {
      await business(db, id(`shop${i}`), 'Approved');
      await conversation(db, { id: id(`c${i}`), buyerId: id('camila'), businessId: id(`shop${i}`), lastSeq: i + 1 });
      await db.query(`UPDATE "Conversation" SET "lastMessageAt" = $2 WHERE id = $1`, [id(`c${i}`), at(i * 60_000)]);
    }
  }
  const camila = id('camila');

  it('the inbox pages 20 conversations by lastMessageAt desc with a cursor bound to the reader; the total covers every page', async () => {
    await inbox(21);
    const svc = messaging();
    const first = await svc.listInbox({ actorId: camila, cursor: null });
    expect(first.rows.map((r) => r.conversationId)).toEqual(Array.from({ length: 20 }, (_, k) => id(`c${20 - k}`)));
    expect(first.rows[0]).toEqual({ conversationId: id('c20'), counterpartName: `Tienda ${id('shop20').slice(0, 6)}`, lastMessageAt: at(20 * 60_000), unread: 21, muted: false });
    expect(first.unreadTotal).toBe((21 * 22) / 2);
    const second = await svc.listInbox({ actorId: camila, cursor: first.nextCursor });
    expect([second.rows.map((r) => r.conversationId), second.nextCursor, second.unreadTotal]).toEqual([[id('c0')], null, (21 * 22) / 2]);
    // Another reader's cursor, and a string that is no cursor, are refused on the field.
    await user(db, { id: id('julian') });
    for (const cursor of [first.nextCursor!, 'not-a-cursor']) {
      const error = await caught(() => svc.listInbox({ actorId: id('julian'), cursor }));
      expect([codeOf(error), citedInputs(error)?.field]).toEqual(['RequestValidationFailed', 'cursor']);
    }
  });

  it('ties on lastMessageAt order by id, and a conversation with no message yet sorts last, across pages', async () => {
    await inbox(21);
    await db.query(`UPDATE "Conversation" SET "lastMessageAt" = $1 WHERE id <> $2`, [T0, id('c5')]);
    await db.query(`UPDATE "Conversation" SET "lastSeq" = 0, "lastMessageAt" = NULL WHERE id = $1`, [id('c5')]);
    const svc = messaging();
    const first = await svc.listInbox({ actorId: camila, cursor: null });
    const second = await svc.listInbox({ actorId: camila, cursor: first.nextCursor });
    const ids = Array.from({ length: 21 }, (_, k) => id(`c${k}`)).filter((c) => c !== id('c5')).sort();
    expect([...first.rows, ...second.rows].map((r) => r.conversationId)).toEqual([...ids, id('c5')]);
    expect(second.rows.at(-1)).toMatchObject({ lastMessageAt: null, unread: 0 });
  });

  it('an empty inbox is no rows, no cursor and 0 unread', async () => {
    await user(db, { id: id('camila') });
    expect(await messaging().listInbox({ actorId: camila, cursor: null })).toEqual({ rows: [], nextCursor: null, unreadTotal: 0 });
  });

  it('the thread returns at most 100 messages after afterSeq, ascending; the next call continues from the last seq', async () => {
    await user(db, { id: camila });
    await business(db, id('andres'), 'Approved');
    const svc = messaging();
    let conversationId = '';
    for (let i = 1; i <= 102; i++) {
      const sent = await svc.sendMessage(send({ body: `Mensaje ${i}`, clientMessageId: `cm-${i}`, ...(conversationId ? { target: { conversationId } } : {}) }));
      conversationId = sent.conversationId;
    }
    const page = await svc.getThread({ actorId: camila, conversationId, afterSeq: 0 });
    expect([page.messages.length, page.messages[0]?.seq, page.messages[99]?.seq, page.lastSeq]).toEqual([100, 1, 100, 102]);
    expect(page.messages[0]).toMatchObject({ mine: true, body: 'Mensaje 1' });
    expect(page.decision).toMatchObject({ outcome: 'allowed', reasonCode: 'ConversationThreadShown', citations: [{ rule: 'AD-MSG-3 rule 3', inputs: { afterSeq: 0, returned: 100, lastSeq: 102 } }] });
    const rest = await svc.getThread({ actorId: id('andres'), conversationId, afterSeq: 100 });
    expect(rest.messages.map((m) => [m.seq, m.mine])).toEqual([[101, false], [102, false]]);
    expect(Object.keys(rest)).toEqual(['messages', 'lastSeq', 'decision']);
  });

  it('a negative or fractional seq is RequestValidationFailed on the field, with no write', async () => {
    await user(db, { id: camila });
    await business(db, id('andres'), 'Approved');
    await conversation(db, { id: id('c1'), buyerId: camila, businessId: id('andres'), lastSeq: 3 });
    const svc = messaging();
    const errors = [
      await caught(() => svc.markRead({ actorId: camila, conversationId: id('c1'), seq: -1 })),
      await caught(() => svc.markRead({ actorId: camila, conversationId: id('c1'), seq: 1.5 })),
      await caught(() => svc.getThread({ actorId: camila, conversationId: id('c1'), afterSeq: -2 })),
    ];
    expect(errors.map((e) => [codeOf(e), citedInputs(e)?.field])).toEqual([['RequestValidationFailed', 'seq'], ['RequestValidationFailed', 'seq'], ['RequestValidationFailed', 'afterSeq']]);
    expect(await rows(db, 'ConversationParticipant', '"lastReadSeq" <> 0')).toHaveLength(0);
  });

  it('a read mark past lastSeq stops at lastSeq; the business marks its own side only', async () => {
    await user(db, { id: camila });
    await business(db, id('andres'), 'Approved');
    await conversation(db, { id: id('c1'), buyerId: camila, businessId: id('andres'), lastSeq: 4 });
    const svc = messaging();
    expect(await svc.markRead({ actorId: camila, conversationId: id('c1'), seq: 99 })).toEqual({ lastReadSeq: 4, unread: 0 });
    expect(await svc.markRead({ actorId: id('andres'), conversationId: id('c1'), seq: 1 })).toEqual({ lastReadSeq: 1, unread: 3 });
    const state = (await rows<{ userId: string; lastReadSeq: string }>(db, 'ConversationParticipant')).map((r) => [r.userId, Number(r.lastReadSeq)]);
    expect(state.sort()).toEqual([[id('andres'), 1], [camila, 4]].sort());
  });

  it('mute, mute again and unmute: the first stores mutedAt, the repeat keeps it, the unmute clears it and the total counts it again', async () => {
    await user(db, { id: camila });
    await business(db, id('andres'), 'Approved');
    await conversation(db, { id: id('c1'), buyerId: camila, businessId: id('andres'), lastSeq: 2 });
    const w = wiring(db);
    const svc = new MsgServiceV2({
      ...w,
      identity: { getDisplayNames: async () => ({ names: [] }), getBusinessName: async () => ({ businessName: 'Cartas Andrés' }), requireMessagingEligibility: async () => { throw new Error('unused'); } },
    });
    const mutedAt = async () => (await rows<{ mutedAt: Date | null }>(db, 'ConversationParticipant', '"userId" = $1', [camila]))[0]!.mutedAt?.toISOString() ?? null;
    expect((await svc.setMuted({ actorId: camila, conversationId: id('c1'), muted: true })).decision).toMatchObject({ reasonCode: 'ConversationMuted', citations: [{ rule: 'FR-MSG-8', inputs: { muted: true } }] });
    expect(await mutedAt()).toBe(T0);
    w.clock.advance(60_000);
    await svc.setMuted({ actorId: camila, conversationId: id('c1'), muted: true });
    expect(await mutedAt()).toBe(T0);
    const inbox = await svc.listInbox({ actorId: camila, cursor: null });
    expect([inbox.rows[0]?.muted, inbox.rows[0]?.unread, inbox.rows[0]?.counterpartName, inbox.unreadTotal]).toEqual([true, 2, 'Cartas Andrés', 0]);
    expect(await svc.setMuted({ actorId: camila, conversationId: id('c1'), muted: false })).toMatchObject({ muted: false, decision: { outcome: 'allowed', reasonCode: 'ConversationUnmuted' } });
    expect(await mutedAt()).toBeNull();
    expect((await svc.listInbox({ actorId: camila, cursor: null })).unreadTotal).toBe(2);
  });
});
