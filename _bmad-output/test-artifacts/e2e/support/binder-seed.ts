// E2E seed for the binder journey (Story 11.5, decision log Impl-2 #17): Julián, who signs in with a password, and his
// collection "Kanto 151" of three catalog cards, placed by hand in an order that is neither by name nor by date. The
// catalog rows are the binder's names (the binder reads them through `catalog.getEntries`).
import type pg from 'pg';
import { fixedId, insertAccount, removeAccounts, T0, withDb } from './db.js';

export const COLLECTOR = { id: fixedId('e2ejulian'), email: 'julian.e2e@tezg.test', password: 'clave-segura-de-julian', name: 'Julián' };
export const BINDER = { id: fixedId('e2ekanto'), name: 'Kanto 151' };
const SET = { id: fixedId('e2eset151'), code: 'E2E151', name: 'Escarlata y Púrpura 151' };

/** The cards in their manual order (the binder's default), each with its name and acquisition date. */
export const CARDS = [
  { entryId: fixedId('e2eentpika'), catalogEntryId: fixedId('e2ecepika'), name: 'Pikachu', number: '25', acquiredAt: '2026-08-01' },
  { entryId: fixedId('e2eentchar'), catalogEntryId: fixedId('e2ecechar'), name: 'Charizard ex', number: '6', acquiredAt: '2026-09-15' },
  { entryId: fixedId('e2eentbulb'), catalogEntryId: fixedId('e2ecebulb'), name: 'Bulbasaur', number: '1', acquiredAt: '2026-07-20' },
] as const;

async function clean(db: pg.Client): Promise<void> {
  // The collection's entries go with it (ON DELETE CASCADE); audit rows are append-only and the journey reads none.
  await db.query(`DELETE FROM "Collection" WHERE "ownerId" = $1`, [COLLECTOR.id]);
  await db.query(`DELETE FROM "CatalogEntry" WHERE "setId" = $1`, [SET.id]);
  await db.query(`DELETE FROM "CatalogSet" WHERE id = $1`, [SET.id]);
  await removeAccounts(db, [COLLECTOR.id]);
}

export async function seedBinder(): Promise<void> {
  await withDb(async (db) => {
    await clean(db);
    await insertAccount(db, COLLECTOR);
    await db.query(`INSERT INTO "CatalogSet" (id, code, name, era, "createdAt", "updatedAt") VALUES ($1, $2, $3, 'SV', $4, $4)`, [SET.id, SET.code, SET.name, T0]);
    await db.query(`INSERT INTO "Collection" (id, "ownerId", name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $4)`, [BINDER.id, COLLECTOR.id, BINDER.name, T0]);
    for (const [position, c] of CARDS.entries()) {
      await db.query(`INSERT INTO "CatalogEntry" (id, "externalKey", "setId", kind, name, number, "numberSort", "createdAt", "updatedAt") VALUES ($1, $2, $3, 'card', $4, $5, $6, $7, $7)`,
        [c.catalogEntryId, `e2e-${c.number}`, SET.id, c.name, c.number, Number(c.number), T0]);
      await db.query(`INSERT INTO "CollectionEntry" (id, "collectionId", "cardKind", "catalogEntryId", source, qty, "acquiredAt", "manualPosition", "createdAt", "updatedAt") VALUES ($1, $2, 'catalog', $3, 'Manual', 1, $4, $5, $6, $6)`,
        [c.entryId, BINDER.id, c.catalogEntryId, c.acquiredAt, position, T0]);
    }
  });
}
