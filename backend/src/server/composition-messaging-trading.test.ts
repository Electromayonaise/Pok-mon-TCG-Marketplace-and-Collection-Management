// The production composition over HTTP (decision log Impl-1 #24): messaging, the contact handoff and trading.
// Covers MSG-1, S-FR-MSG-7, -8, MSG-2, S-FR-TRD-1, -2w, -3 and TRD-1, all through serveTrpc as app/api/trpc/[trpc]/route.ts calls it.
// One of the composition-*.test.ts files split from composition.test.ts (test review HIGH-1); the harness,
// test-support/http-app.ts, composes a fresh app per test at T0 (HIGH-8).
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { IP_KEY, useComposedApp } from '../../test-support/http-app.js';
import { business, catalogEntry, id, individualSeller, listing, rows, T0, unit, user } from '../../test-support/solu2/fixtures.js';

const { db, signIn, post, get } = useComposedApp();

describe('messaging.send over HTTP (MSG-1; Story 9.2)', () => {
  it('a buyer writes to an Approved business through the real identity; the business replies; a business starting is BusinessCannotInitiate 409', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Approved');
    const buyer = await signIn(id('camila'));
    const sent = await post('messaging.send', { target: { recipientId: id('andres') }, body: 'Hola, ¿tienes el Charizard?', clientMessageId: 'cm-1' }, buyer);
    expect(sent.status).toBe(200);
    expect(sent.json.result?.data).toMatchObject({ seq: 1, decision: { outcome: 'allowed', reasonCode: 'MessageSent' } });
    const shop = await signIn(id('andres'));
    const reply = await post('messaging.send', { target: { conversationId: sent.json.result!.data.conversationId }, body: 'Sí, lo tengo.', clientMessageId: 'cm-1' }, shop);
    expect(reply.json.result?.data).toMatchObject({ seq: 2 });
    const start = await post('messaging.send', { target: { recipientId: id('camila') }, body: 'Promo', clientMessageId: 'cm-2' }, shop);
    expect([start.status, start.json.error?.code]).toEqual([409, 'BusinessCannotInitiate']);
    expect(await rows(db, 'Message')).toHaveLength(2);
  });
});

describe('the inbox, the thread, the read mark and mute over HTTP (S-FR-MSG-7, S-FR-MSG-8; Story 9.6)', () => {
  it('the buyer reads the inbox and the thread, marks it read and mutes; the business sees only its own state; an outsider is 403', async () => {
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian') });
    await business(db, id('andres'), 'Approved');
    const buyer = await signIn(id('camila'));
    const shop = await signIn(id('andres'));
    const sent = await post('messaging.send', { target: { recipientId: id('andres') }, body: 'Hola, ¿tienes el Charizard?', clientMessageId: 'cm-1' }, buyer);
    const conversationId = String(sent.json.result!.data.conversationId);
    await post('messaging.send', { target: { conversationId }, body: 'Sí, lo tengo.', clientMessageId: 'cm-1' }, shop);

    const inbox = await get('messaging.inbox', { cursor: null }, buyer);
    expect(inbox.status).toBe(200);
    expect(inbox.json.result?.data).toEqual({ rows: [{ conversationId, counterpartName: 'Tienda andres', lastMessageAt: T0, unread: 2, muted: false }], nextCursor: null, unreadTotal: 2 });
    const thread = await get('messaging.thread', { conversationId, afterSeq: 0 }, buyer);
    expect(thread.json.result?.data).toMatchObject({ lastSeq: 2, messages: [{ seq: 1, mine: true, body: 'Hola, ¿tienes el Charizard?' }, { seq: 2, mine: false, body: 'Sí, lo tengo.' }], decision: { reasonCode: 'ConversationThreadShown' } });
    expect(JSON.stringify(thread.json)).not.toContain('lastReadSeq');
    const read = await post('messaging.markRead', { conversationId, seq: 2 }, buyer);
    expect([read.status, read.json.result?.data]).toEqual([200, { lastReadSeq: 2, unread: 0 }]);
    const mute = await post('messaging.setMuted', { conversationId, muted: true }, buyer);
    expect(mute.json.result?.data).toMatchObject({ muted: true, decision: { outcome: 'allowed', reasonCode: 'ConversationMuted' } });
    expect((await get('messaging.inbox', { cursor: null }, buyer)).json.result?.data).toMatchObject({ rows: [{ unread: 0, muted: true }], unreadTotal: 0 });

    // The business's own unread count (the buyer's first message), its name for the buyer, and its mute is the notice.
    expect((await get('messaging.inbox', { cursor: null }, shop)).json.result?.data).toMatchObject({ rows: [{ counterpartName: id('camila'), unread: 2, muted: false }], unreadTotal: 2 });
    const shopMute = await post('messaging.setMuted', { conversationId, muted: true }, shop);
    expect(shopMute.json.result?.data).toMatchObject({ muted: false, decision: { outcome: 'allowedWithNotice', reasonCode: 'MuteNotAvailableToBusiness' } });

    const outsider = await signIn(id('julian'));
    const refused = await get('messaging.thread', { conversationId, afterSeq: 0 }, outsider);
    expect([refused.status, refused.json.error?.code]).toEqual([403, 'ConversationNotVisibleToCaller']);
    const foreignCursor = await get('messaging.inbox', { cursor: 'bm90LWEtY3Vyc29y' }, buyer);
    expect([foreignCursor.status, foreignCursor.json.error?.code]).toEqual([400, 'RequestValidationFailed']);
    expect((await get('messaging.inbox', { cursor: null }, await signIn(id('julian')))).status).toBe(200);
    const unauthenticated = await get('messaging.inbox', { cursor: null }, '');
    expect([unauthenticated.status, unauthenticated.json.error?.code]).toEqual([401, 'NotAuthenticated']);
  });
});

describe('inventory.contact over HTTP (MSG-2; Story 9.3)', () => {
  it('a buyer gets the handoff through the real identity and catalog; the log row stores the IP only as its HMAC under IP_HMAC_KEY', async () => {
    await user(db, { id: id('camila') });
    await individualSeller(db, id('valentina'));
    await catalogEntry(db, id('char'));
    await unit(db, { id: id('uval'), sellerId: id('valentina'), catalogEntryId: id('char'), quantity: 1 });
    await listing(db, { id: id('lv'), sellerId: id('valentina'), unitId: id('uval'), sellerKind: 'individual', priceCop: 45_000 });
    const res = await post('inventory.contact', { listingId: id('lv') }, await signIn(id('camila')), { 'x-forwarded-for': '198.51.100.9, 203.0.113.7' });
    expect(res.status).toBe(200);
    expect(res.json.result?.data).toMatchObject({ decision: { reasonCode: 'ContactMessageGenerated' } });
    expect(String(res.json.result?.data.externalUrl)).toMatch(/^https:\/\/wa\.me\/573001234567\?text=/);
    expect(await rows(db, 'ContactRequestLog')).toMatchObject([{ counted: true, ipHmac: createHmac('sha256', IP_KEY).update('203.0.113.7').digest('hex') }]);
    expect(JSON.stringify(await rows(db, 'ContactRequestLog'))).not.toContain('203.0.113.7');
  });
});

describe('trading over HTTP (S-FR-TRD-1, S-FR-TRD-2w, S-FR-TRD-3; Story 10.1)', () => {
  it('a buyer offers on an individual listing open to trade, both parties read it, and he withdraws it; a self-offer is SelfTradeNotAllowed 409', async () => {
    await individualSeller(db, id('valentina'));
    await user(db, { id: id('julian') });
    await catalogEntry(db, id('char'));
    await unit(db, { id: id('uv'), sellerId: id('valentina'), catalogEntryId: id('char'), quantity: 1 });
    await listing(db, { id: id('lv'), sellerId: id('valentina'), unitId: id('uv'), sellerKind: 'individual', openToTrade: true });
    const julian = await signIn(id('julian'));
    const offerTerms = { offeredItems: [{ itemRef: id('char'), condition: 'NM', qty: 1 }], cashCop: 20_000, requestedQty: 1 };
    const made = await post('trading.offer', { listingId: id('lv'), terms: offerTerms }, julian);
    expect([made.status, made.json.result?.data]).toEqual([200, expect.objectContaining({ status: 'Open', turn: 'seller', version: 0 })]);
    const offerId = made.json.result!.data.offerId as string;
    const seen = await get('trading.get', { offerId }, await signIn(id('valentina')));
    expect(seen.json.result?.data).toMatchObject({ status: 'Open', rounds: [{ round: 1, action: 'offer' }] });
    const mine = await get('trading.mine', { side: 'sent', cursor: null }, julian);
    expect((mine.json.result?.data.offers as unknown[]).length).toBe(1);
    const withdrawn = await post('trading.withdraw', { offerId, expectedVersion: 0 }, julian);
    expect(withdrawn.json.result?.data).toMatchObject({ status: 'Withdrawn' });
    const self = await post('trading.offer', { listingId: id('lv'), terms: offerTerms }, await signIn(id('valentina')));
    expect([self.status, self.json.error?.code]).toEqual([409, 'SelfTradeNotAllowed']);
  });

  it('the seller accepts over HTTP: the last unit is reserved and the proposer gets the wa.me handoff (TRD-1; Story 10.3)', async () => {
    await individualSeller(db, id('valentina'));
    await user(db, { id: id('julian') });
    await catalogEntry(db, id('char'));
    await unit(db, { id: id('uv'), sellerId: id('valentina'), catalogEntryId: id('char'), quantity: 1 });
    await listing(db, { id: id('lv'), sellerId: id('valentina'), unitId: id('uv'), sellerKind: 'individual', openToTrade: true });
    const julian = await signIn(id('julian'));
    const made = await post('trading.offer', { listingId: id('lv'), terms: { offeredItems: [], cashCop: 20_000, requestedQty: 1 } }, julian);
    const offerId = made.json.result!.data.offerId as string;
    const accepted = await post('trading.accept', { offerId, expectedVersion: 0 }, await signIn(id('valentina')));
    expect([accepted.status, accepted.json.result?.data]).toEqual([200, expect.objectContaining({ status: 'Accepted', handoff: expect.objectContaining({ externalUrl: expect.stringMatching(/^https:\/\/wa\.me\/573001234567\?text=/) }) })]);
    const handoff = await get('trading.handoff', { offerId }, julian);
    expect(handoff.json.result?.data.text).toBe((accepted.json.result?.data.handoff as { text: string }).text);
    expect(await rows(db, 'OutboxEvent', `type = 'TradeAccepted'`)).toHaveLength(1);
    const confirmed = await post('trading.confirmCompletion', { offerId }, julian);
    expect(confirmed.json.result?.data).toMatchObject({ completed: false });
    const cancel = await post('trading.cancel', { offerId }, julian);
    expect([cancel.status, cancel.json.error?.code]).toEqual([409, 'TradeNotCancellable']);
  });
});
