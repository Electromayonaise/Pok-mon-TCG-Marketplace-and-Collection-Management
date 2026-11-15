// E2E seed for the inbox journey (Story 9.6): rows written by SQL into the `tezg_e2e` database through the shared
// helpers of ./db.ts. Each journey deletes and re-inserts exactly the rows it reads.
import type pg from 'pg';
import { fixedId, insertAccount, insertUser, removeAccounts, T0, withDb } from './db.js';

export const BUYER = { id: fixedId('e2ecamila'), email: 'camila.e2e@tezg.test', password: 'clave-segura-de-camila', name: 'Camila' };
export const SHOPS = {
  andres: { id: fixedId('e2eandres'), name: 'Cartas Andrés' },
  paradise: { id: fixedId('e2eparadise'), name: 'Tienda Pokeparadise' },
};
const CONVERSATIONS = { andres: fixedId('e2econvandres'), paradise: fixedId('e2econvparadise') };
const minutes = (n: number) => new Date(Date.parse(T0) + n * 60_000).toISOString();

/** Removes every row the inbox journey writes or reads, in foreign-key order. */
async function clean(db: pg.Client): Promise<void> {
  const users = [BUYER.id, SHOPS.andres.id, SHOPS.paradise.id];
  await db.query(`DELETE FROM "Message" WHERE "conversationId" IN (SELECT id FROM "Conversation" WHERE "buyerId" = ANY($1) OR "businessId" = ANY($1))`, [users]);
  await db.query(`DELETE FROM "ConversationParticipant" WHERE "conversationId" IN (SELECT id FROM "Conversation" WHERE "buyerId" = ANY($1) OR "businessId" = ANY($1))`, [users]);
  await db.query(`DELETE FROM "Conversation" WHERE "buyerId" = ANY($1) OR "businessId" = ANY($1)`, [users]);
  await db.query(`DELETE FROM "BusinessApplication" WHERE "businessId" = ANY($1)`, [users]);
  await removeAccounts(db, users);
}

/** A conversation of the buyer with `shopId`: `messages` bodies, the shop's from `fromShop` on; the buyer has read `buyerRead`. */
async function conversation(db: pg.Client, o: { id: string; shopId: string; messages: string[]; fromShop: number; buyerRead: number; startMinute: number }): Promise<void> {
  const last = o.messages.length;
  await db.query(`INSERT INTO "Conversation" (id, "buyerId", "businessId", "lastSeq", "lastMessageAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $6)`,
    [o.id, BUYER.id, o.shopId, last, minutes(o.startMinute + last), T0]);
  await db.query(`INSERT INTO "ConversationParticipant" ("conversationId", "userId", role, "lastReadSeq", "createdAt", "updatedAt") VALUES ($1, $2, 'buyer', $4, $5, $5), ($1, $3, 'business', $6, $5, $5)`,
    [o.id, BUYER.id, o.shopId, o.buyerRead, T0, last]);
  for (const [i, body] of o.messages.entries()) {
    const seq = i + 1;
    await db.query(`INSERT INTO "Message" (id, "conversationId", seq, "senderId", body, "clientMessageId", "recipientVerificationAtSend", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, 'Approved', $7)`,
      [fixedId(`${o.id.slice(0, 14)}m${seq}`), o.id, seq, seq > o.fromShop ? o.shopId : BUYER.id, body, `e2e-${seq}`, minutes(o.startMinute + seq)]);
  }
}

/**
 * Camila, verified, with a password; two Approved shops; two conversations with 2 unread messages each, the one with
 * Cartas Andrés the most recent. Returns nothing: the journey reads it all through the UI.
 */
export async function seedInbox(): Promise<void> {
  await withDb(async (db) => {
    await clean(db);
    await insertAccount(db, BUYER);
    for (const [key, shop] of Object.entries(SHOPS)) {
      await insertUser(db, { id: shop.id, name: shop.name, email: `${key}.e2e@tezg.test`, sellerTrack: 'business' });
      await db.query(`INSERT INTO "BusinessApplication" (id, "businessId", status, "businessName", city, "externalPresenceUrl", "submittedAt", "consentAt", "consentVersion", "decidedBy", "decidedAt", "createdAt", "updatedAt") VALUES ($1, $2, 'Approved', $3, 'Medellín', 'https://instagram.com/tienda', $4, $4, 'privacy-v1', $5, $4, $4, $4)`,
        [fixedId(`e2eapp${key}`), shop.id, shop.name, T0, fixedId('e2eadmin')]);
    }
    await conversation(db, { id: CONVERSATIONS.paradise, shopId: SHOPS.paradise.id, messages: ['Hola, ¿tienen sobres de Surging Sparks?', 'Sí, nos llegan el viernes.', 'Le aviso cuando lleguen.'], fromShop: 1, buyerRead: 1, startMinute: 0 });
    await conversation(db, { id: CONVERSATIONS.andres, shopId: SHOPS.andres.id, messages: ['Hola, ¿la Charizard ex tiene marcas en el reverso?', 'Buenos días. No, está impecable.', 'Le puedo enviar fotos por aquí mismo.'], fromShop: 1, buyerRead: 1, startMinute: 30 });
  });
}
