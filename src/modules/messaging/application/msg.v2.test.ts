// MsgServiceV2.sendMessage (MSG-1) against Postgres with the real identity: the edges the ATDD tests leave out —
// the P2 refusals, the business's reply, the read-only thread of a Rejected business, the audit row without the
// body, a retry after the business was approved, and the send on a pool of 1 (AD-SYS-4 rule 9).
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { PgTransactionRunner, useTestDatabase } from '../../../../test-support/db.js';
import { PG } from '../../../../test-support/env.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { admin, business, conversation, id, rejectionReason, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { IdnServiceV2, VerServiceV2 } from '../../identity/index.js';
import type { TransactionRunner } from '../../../shared-kernel/ports.js';
import type { SendMessageRequest } from '../dto/msg.v2.dto.js';
import { MsgServiceV2 } from './msg.v2.js';

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
    const pool = new pg.Pool({ ...PG, database: (db.pool.options as { database: string }).database, max: 1 });
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadlock = new Promise<never>((_, reject) => { watchdog = setTimeout(() => reject(new Error('deadlock: a second connection was requested')), 3_000); });
      expect(await Promise.race([messaging(new PgTransactionRunner(pool)).sendMessage(send()), deadlock])).toMatchObject({ seq: 1 });
    } finally {
      clearTimeout(watchdog);
      await pool.end();
    }
  });
});
