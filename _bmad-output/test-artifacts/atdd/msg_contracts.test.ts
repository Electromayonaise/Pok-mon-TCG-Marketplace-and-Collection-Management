// ATDD — MSG (contracts.md §9, §15): MSG-1 in `messaging`, MSG-2 in `listings`, MSG-3 in `identity`.
// Red phase: every test must fail with NotImplementedError.
import { describe, expect, it } from 'vitest';
import { MsgServiceV2 } from '../../../src/modules/messaging/index.js';
import type { IdentityForMsg, SendMessageRequest } from '../../../src/modules/messaging/index.js';
import { ContactServiceV2 } from '../../../src/modules/listings/index.js';
import type { CatalogForContact, IdentityForContact } from '../../../src/modules/listings/index.js';
import { VerServiceV2 } from '../../../src/modules/identity/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../test-support/errors.js';
import { codeOf, race } from '../../../test-support/concurrency.js';
import { at, business, catalogEntry, conversation, explainAssert, fake, HOUR, id, ins, listing, rejectionReason, rows, T0, unit, user, wiring } from '../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();
/** A sendMessage request: camila's first 'Hola' to the business andres, unless the test says otherwise. */
const sendInput = (o: Partial<SendMessageRequest> = {}): SendMessageRequest => ({ target: { recipientId: id('andres') }, body: 'Hola', clientMessageId: 'cm-1', senderId: id('camila'), ...o });
const ver = () => new VerServiceV2(wiring(db));

function msgService() {
  const identity = fake<IdentityForMsg>('identity', {
    requireMessagingEligibility: (input) => ver().requireMessagingEligibility(input),
    getDisplayNames: async ({ userIds }) => ({ names: userIds.map((u) => ({ userId: u, displayName: `Nombre ${u.slice(0, 4)}` })) }),
    getBusinessName: async () => ({ businessName: 'Cartas Andrés' }),
  });
  return new MsgServiceV2({ ...wiring(db), identity });
}
function contactService(productName = 'Charizard ex') {
  const catalog = fake<CatalogForContact>('catalog', {
    getEntries: async ({ catalogEntryIds }) => ({ entries: catalogEntryIds.map((c) => ({ catalogEntryId: c, setId: id('set1'), kind: 'card' as const, name: productName, number: '006', pokemon: null, colour: null, style: null, artist: null, imageUrl: null })), missing: [] }),
  });
  const identity = fake<IdentityForContact>('identity', {
    getContactCard: async () => ({ displayName: 'Valentina', contactPhoneE164: '+573001234567' }),
    getDisplayNames: async () => ({ names: [{ userId: id('camila'), displayName: 'Camila' }] }),
  });
  return new ContactServiceV2({ ...wiring(db), catalog, identity });
}
/** Valentina's individual listing of Charizard at `priceCop`. */
async function valentinaListing(priceCop = 45_000, listingId = id('lv'), o: { business?: boolean } = {}): Promise<void> {
  await user(db, { id: id('camila') }).catch(() => undefined);
  if (o.business) await business(db, id('andres'), 'Approved'); else await user(db, { id: id('valentina'), sellerTrack: 'individual' }).catch(() => undefined);
  await catalogEntry(db, id('char')).catch(() => undefined);
  const seller = o.business ? id('andres') : id('valentina');
  const unitId = o.business ? id('ubiz') : id('uval'); // one pool per (seller, item, condition): listings share it
  if (!(await db.query(`SELECT 1 FROM "InventoryUnit" WHERE id = $1`, [unitId])).length) await unit(db, { id: unitId, sellerId: seller, catalogEntryId: id('char'), quantity: 1 });
  await listing(db, { id: listingId, sellerId: seller, unitId, sellerKind: o.business ? 'business' : 'individual', priceCop });
}
const contact = (listingId = id('lv'), svc = contactService()) => svc.generateContactMessage({ kind: 'purchase', listingId, requesterId: id('camila'), tradeSummary: null, ipHmac: 'a'.repeat(64) });
const decodeText = (url: string) => decodeURIComponent(new URL(url).searchParams.get('text') ?? '');

describe('MSG-1 — sendMessage (contracts.md §9)', () => {
  it('[MSG-1.Q1] a buyer starts a conversation with an Approved business: one conversation, two participants, message seq 1, allowed', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Approved');
    const result = await msgService().sendMessage(sendInput({ body: '¿Tienes el Charizard?' }));
    expect(result.seq).toBe(1);
    explainAssert(result.decision, { outcome: 'allowed', rule: 'FR-MSG-4', inputs: { recipientStatus: 'Approved' } });
    expect(await rows(db, 'ConversationParticipant')).toHaveLength(2);
    expect(JSON.stringify(await rows(db, 'audit_events'))).not.toContain('Charizard');
  });

  it('[MSG-1.Q2] a Pending business receives with the RecipientNotYetVerified notice', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Pending');
    const result = await msgService().sendMessage(sendInput());
    explainAssert(result.decision, { code: 'RecipientNotYetVerified', outcome: 'allowedWithNotice' });
  });

  it('[MSG-1.P4] a business opening a conversation is BusinessCannotInitiate (409)', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Approved');
    const error = await caught(() => msgService().sendMessage(sendInput({ target: { recipientId: id('camila') }, body: 'Promo', senderId: id('andres') })));
    expect(codeOf(error)).toBe('BusinessCannotInitiate');
    expect(await rows(db, 'Conversation')).toHaveLength(0);
  });

  it('[MSG-1.P5] a Rejected business is NotBusinessAccount (409) propagated from identity; nothing is written', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Rejected');
    const error = await caught(() => msgService().sendMessage(sendInput()));
    expect(codeOf(error)).toBe('NotBusinessAccount');
    expect(httpOf(error)).toBe(409);
    expect(await db.counts(['Conversation', 'Message'])).toEqual({ Conversation: 0, Message: 0 });
  });

  it('[MSG-1.P3] a non-participant writing to a conversation is ConversationNotVisibleToCaller (403)', async () => {
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian') });
    await business(db, id('andres'), 'Approved');
    await conversation(db, { id: id('c1'), buyerId: id('camila'), businessId: id('andres') });
    expect(codeOf(await caught(() => msgService().sendMessage(sendInput({ target: { conversationId: id('c1') }, senderId: id('julian') }))))).toBe('ConversationNotVisibleToCaller');
  });

  it('[MSG-1.I3] a retry with the same clientMessageId returns the original message and writes nothing (EC-14, AD-MSG-2 rule 4)', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Approved');
    const svc = msgService();
    const first = await svc.sendMessage(sendInput());
    const retry = await svc.sendMessage(sendInput());
    expect(retry).toMatchObject({ messageId: first.messageId, seq: 1 });
    expect(await rows(db, 'Message')).toHaveLength(1);
    expect(await rows(db, 'Conversation')).toMatchObject([{ lastSeq: '1' }]);
  });

  it('[MSG-1.R1] two first messages open one conversation, and 20 concurrent sends get gapless seqs 1..20', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Approved');
    const outcome = await race(20, (i) => msgService().sendMessage(sendInput({ body: `m${i}`, clientMessageId: `cm-${i}` })));
    expect(outcome.rejected.map(codeOf)).toEqual([]);
    expect(await rows(db, 'Conversation')).toHaveLength(1);
    expect(outcome.fulfilled.map((r) => r.seq).sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
});

describe('MSG-2 — generateContactMessage (contracts.md §9)', () => {
  it('[MSG-2.Q1] the purchase message names the product and the price, links to wa.me and logs one counted request', async () => {
    await valentinaListing();
    const result = await contact();
    expect(result.text).toContain('Charizard ex');
    expect(result.text).toContain('$45.000 COP');
    expect(result.externalUrl.startsWith('https://wa.me/573001234567?text=')).toBe(true);
    expect(decodeText(result.externalUrl)).toBe(result.text);
    expect(await rows(db, 'ContactRequestLog')).toMatchObject([{ kind: 'purchase', counted: true, listingId: id('lv') }]);
  });

  it('[MSG-2.I1] equal inputs give byte-identical output across 1,000 runs (NFR-MSG-1)', async () => {
    await valentinaListing();
    const svc = contactService();
    const outputs = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const r = await svc.generateContactMessage({ kind: 'trade', listingId: id('lv'), requesterId: id('camila'), tradeSummary: { offeredItems: [{ name: 'Pikachu', condition: 'NM', qty: 1 }], cashCop: 20_000 }, ipHmac: null });
      outputs.add(JSON.stringify([r.text, r.externalUrl, r.copyText]));
    }
    expect(outputs.size).toBe(1);
  });

  it('[MSG-2.MEC] every fixture name renders within 2,000 characters, round-trips exactly and keeps the full price (NFR-MSG-4)', async () => {
    const names = ['Ñandú Pokémon édition', 'Pikachu ⚡️🔥 Promo', 'x'.repeat(500), 'Mira https://evil.example/ ofertas'];
    const prices = [[1_000, '$1.000 COP'], [100_000_000, '$100.000.000 COP']] as const;
    let n = 0;
    for (const name of names) {
      for (const [price, shown] of prices) {
        const listingId = id(`l${n++}`);
        await valentinaListing(price, listingId);
        const result = await contact(listingId, contactService(name));
        expect(result.externalUrl.length).toBeLessThanOrEqual(2000);
        expect(decodeText(result.externalUrl)).toBe(result.text.normalize('NFC'));
        expect(result.text).toContain(shown);
      }
    }
  });

  it('[MSG-2.P2] a hidden listing is ListingNotFound (404), and the phone is never read', async () => {
    await valentinaListing();
    await db.query(`UPDATE "Listing" SET "hiddenAt" = $1, "hiddenReason" = 'Spam', "hiddenBy" = $2`, [T0, id('admin')]);
    expect(codeOf(await caught(() => contact()))).toBe('ListingNotFound');
    expect(await rows(db, 'ContactRequestLog')).toHaveLength(0);
  });

  it('[MSG-2.P3] a business listing is NotIndividualSellerListing (409)', async () => {
    await valentinaListing(45_000, id('lb'), { business: true });
    expect(codeOf(await caught(() => contact(id('lb'))))).toBe('NotIndividualSellerListing');
  });

  it('[MSG-2.P4] the 31st contact in an hour is ContactRateLimited (429) citing retryAt; a repeat for the same listing within 60 min is logged but not counted', async () => {
    await valentinaListing();
    for (let i = 0; i < 30; i++) await ins(db, 'ContactRequestLog', { id: id(`log${i}`), requesterId: id('camila'), listingId: id(`other${i}`), sellerId: id('valentina'), ipHmac: 'b'.repeat(64), kind: 'purchase', counted: true, createdAt: at(-HOUR + 60_000) }, 'none');
    const error = await caught(() => contact());
    expect(codeOf(error)).toBe('ContactRateLimited');
    expect(httpOf(error)).toBe(429);
    expect(citedInputs(error)).toHaveProperty('retryAt');
  });

  it('[MSG-2.R1] 50 concurrent requests from one requester: exactly 30 allowed in the hour (S-6)', async () => {
    // Five sellers with 10 listings each, so the 10-per-seller-per-day limit never binds before the 30-per-hour one (decision log Impl-1 #34).
    await valentinaListing();
    for (let s = 0; s < 5; s++) {
      await user(db, { id: id(`vend${s}`), sellerTrack: 'individual' });
      await unit(db, { id: id(`uvend${s}`), sellerId: id(`vend${s}`), catalogEntryId: id('char'), quantity: 1 });
      for (let j = 0; j < 10; j++) await listing(db, { id: id(`lr${s * 10 + j}`), sellerId: id(`vend${s}`), unitId: id(`uvend${s}`), sellerKind: 'individual', priceCop: 45_000 });
    }
    const outcome = await race(50, (i) => contact(id(`lr${i}`)));
    expect(outcome.rejected.map(codeOf).filter((c) => c !== 'ContactRateLimited')).toEqual([]);
    expect(outcome.fulfilled).toHaveLength(30);
  });
});

describe('MSG-3 — requireMessagingEligibility (contracts.md §9)', () => {
  it('[MSG-3.Q1] an Approved business is allowed and verified; a Pending one is allowed with the RecipientNotYetVerified notice', async () => {
    await business(db, id('andres'), 'Approved');
    await business(db, id('pend'), 'Pending');
    expect(await ver().requireMessagingEligibility({ businessId: id('andres') })).toMatchObject({ status: 'Approved', verified: true });
    const pending = await ver().requireMessagingEligibility({ businessId: id('pend') });
    explainAssert(pending.decision, { code: 'RecipientNotYetVerified', outcome: 'allowedWithNotice', rule: 'FR-IDN-6', inputs: { businessId: id('pend'), status: 'Pending' } });
  });

  it('[MSG-3.QF1] an individual seller and an unknown id are both NotBusinessAccount with identical bodies', async () => {
    await user(db, { id: id('valentina'), sellerTrack: 'individual' });
    const individual = await caught(() => ver().requireMessagingEligibility({ businessId: id('valentina') }));
    const unknown = await caught(() => ver().requireMessagingEligibility({ businessId: id('ghost') }));
    expect(codeOf(individual)).toBe('NotBusinessAccount');
    expect(JSON.stringify(individual).replace(id('valentina'), 'X')).toBe(JSON.stringify(unknown).replace(id('ghost'), 'X'));
  });

  it('[MSG-3.MEC] the business is rejected between compose and send, 100 repetitions: either the message is sent before, or NotBusinessAccount with zero writes (NFR-MSG-4, FR-MSG-6)', async () => {
    await user(db, { id: id('camila') });
    await rejectionReason(db, { code: 'DataMismatch' }); // the rejection's FK target (decision log Impl-1 #34)
    for (let rep = 0; rep < 100; rep++) {
      const biz = id(`biz${rep}`);
      await business(db, biz, 'Approved');
      const outcome = await race<unknown>(2, (i) => (i === 0
        ? msgService().sendMessage(sendInput({ target: { recipientId: biz }, clientMessageId: `cm-${rep}` }))
        : db.query(`UPDATE "BusinessApplication" SET status = 'Rejected', "rejectionReasonCode" = 'DataMismatch', "reapplyNotBefore" = $1 WHERE "businessId" = $2`, [at(HOUR), biz])));
      expect(outcome.rejected.map(codeOf).filter((c) => c !== 'NotBusinessAccount')).toEqual([]);
      const sent = await db.query(`SELECT m.id FROM "Message" m JOIN "Conversation" c ON c.id = m."conversationId" WHERE c."businessId" = $1`, [biz]);
      expect(sent).toHaveLength(outcome.rejected.length === 1 ? 0 : 1);
    }
  });
});

describe('Supporting MSG contracts (contracts.md §15)', () => {
  async function thread(lastSeq: number): Promise<void> {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Approved');
    await conversation(db, { id: id('c1'), buyerId: id('camila'), businessId: id('andres'), lastSeq });
  }

  it('[S-FR-MSG-7.h] reading the thread lowers unread to 0, and the other side’s read state is never returned', async () => {
    await thread(3);
    const result = await msgService().markRead({ actorId: id('camila'), conversationId: id('c1'), seq: 3 });
    expect(result).toEqual({ lastReadSeq: 3, unread: 0 });
  });

  it('[S-FR-MSG-7.f] markRead with an older seq from a stale tab leaves lastReadSeq unchanged (AD-MSG-3 rule 1)', async () => {
    await thread(5);
    await db.query(`UPDATE "ConversationParticipant" SET "lastReadSeq" = 4 WHERE "userId" = $1`, [id('camila')]);
    expect(await msgService().markRead({ actorId: id('camila'), conversationId: id('c1'), seq: 2 })).toEqual({ lastReadSeq: 4, unread: 1 });
  });

  it('[S-FR-MSG-8.h] a muted conversation leaves the buyer’s total unread count', async () => {
    await thread(2);
    const svc = msgService();
    await svc.setMuted({ actorId: id('camila'), conversationId: id('c1'), muted: true });
    expect((await svc.listInbox({ actorId: id('camila'), cursor: null })).unreadTotal).toBe(0);
  });

  it('[S-FR-MSG-8.f] a business muting is an explained no-op with zero writes (C-GAP-4, R-11)', async () => {
    await thread(2);
    const result = await msgService().setMuted({ actorId: id('andres'), conversationId: id('c1'), muted: true });
    expect(result.muted).toBe(false);
    explainAssert(result.decision, { outcome: 'allowedWithNotice' });
    expect(await rows(db, 'ConversationParticipant', '"mutedAt" IS NOT NULL')).toHaveLength(0);
  });
});
