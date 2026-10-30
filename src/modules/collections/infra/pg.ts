// Driven adapters (persistence) — collections. The Solu-1 stubs below are bound to the retired migration 009_create_collections.sql
// (git 853449c:docs/solu-1/planning/schemas/); the Solu-2 PgColRepository at the end is bound to
// _bmad-output/planning-artifacts/detailed-design/schemas.
import { NotImplementedError, UnexpectedError } from '../../../shared-kernel/errors.js';
import type { OrderClosedLineV1 } from '../../../shared-kernel/events.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import { GENERAL_COLLECTION, type PromptStatus } from '../domain/col.js';
import type { CollectionRow, ColRepository, NewEntry, PromptRow } from '../ports/col.v2.js';
import type { ICollectionRepository, IPromptRepository } from '../ports/collections.js';
import type { ValRepository, ValuationEntryRow } from '../ports/val.v2.js';

export class PgCollectionRepository implements ICollectionRepository {
  constructor(protected readonly sql: Sql) {}
  async ownedBy(): Promise<boolean> {
    throw new NotImplementedError('PgCollectionRepository.ownedBy');
  }
  async lockOwner(): Promise<void> {
    throw new NotImplementedError('PgCollectionRepository.lockOwner');
  }
  async collectionForShare(): Promise<boolean> {
    throw new NotImplementedError('PgCollectionRepository.collectionForShare');
  }
  async maxManualPosition(): Promise<number> {
    throw new NotImplementedError('PgCollectionRepository.maxManualPosition');
  }
  async insertPurchaseEntries(): Promise<void> {
    throw new NotImplementedError('PgCollectionRepository.insertPurchaseEntries');
  }
  async catalogEntryIdsOf(): Promise<never> {
    throw new NotImplementedError('PgCollectionRepository.catalogEntryIdsOf');
  }
  async entriesForValuation(): Promise<never> {
    throw new NotImplementedError('PgCollectionRepository.entriesForValuation');
  }
}

export class PgPromptRepository implements IPromptRepository {
  constructor(protected readonly sql: Sql) {}
  async acceptConditionally(): Promise<null> {
    throw new NotImplementedError('PgPromptRepository.acceptConditionally');
  }
  async readForLoser(): Promise<null> {
    throw new NotImplementedError('PgPromptRepository.readForLoser');
  }
}

const PROMPT_COLUMNS = `id, "orderId", "buyerId", lines, status, "resolvedAt", "acceptedIntoCollectionId", "buyerItemReceivedConfirmedAt", "createdAt"`;

/** A unique violation of `constraint`, rolled back to `savepoint`; any other error is rethrown. */
async function uniqueViolation(tx: Tx, savepoint: string, constraint: string, error: unknown): Promise<void> {
  const pgError = error as { code?: string; constraint?: string };
  if (pgError.code !== '23505' || pgError.constraint !== constraint) throw error;
  await tx.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
}

/** COL's own tables (AD-8): `"Collection"`, `"CollectionEntry"`, `"PostPurchasePrompt"`. */
export class PgColRepository implements ColRepository {
  async lockCollectionOwner(tx: Tx, ownerId: CuidId): Promise<void> {
    await tx.query(`SELECT pg_advisory_xact_lock(hashtextextended('col:owner:' || $1, 0))`, [ownerId]);
  }

  async countCollections(tx: Tx, ownerId: CuidId): Promise<number> {
    const { rows } = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM "Collection" WHERE "ownerId" = $1`, [ownerId]);
    return rows[0]!.n;
  }

  async insertCollection(tx: Tx, c: { id: CuidId; ownerId: CuidId; name: string; now: IsoInstant }): Promise<'inserted' | 'taken'> {
    await tx.query('SAVEPOINT collection_insert');
    try {
      await tx.query(`INSERT INTO "Collection" (id, "ownerId", name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $4)`, [c.id, c.ownerId, c.name, c.now]);
    } catch (error) {
      await uniqueViolation(tx, 'collection_insert', 'collection_name_unique_per_owner', error);
      return 'taken';
    }
    await tx.query('RELEASE SAVEPOINT collection_insert');
    return 'inserted';
  }

  async renameCollection(tx: Tx, c: { collectionId: CuidId; ownerId: CuidId; name: string; now: IsoInstant }): Promise<'renamed' | 'missing' | 'taken'> {
    await tx.query('SAVEPOINT collection_rename');
    try {
      const { rowCount } = await tx.query(`UPDATE "Collection" SET name = $3, "updatedAt" = $4 WHERE id = $1 AND "ownerId" = $2`, [c.collectionId, c.ownerId, c.name, c.now]);
      await tx.query('RELEASE SAVEPOINT collection_rename');
      return rowCount === 1 ? 'renamed' : 'missing';
    } catch (error) {
      await uniqueViolation(tx, 'collection_rename', 'collection_name_unique_per_owner', error);
      return 'taken';
    }
  }

  async deleteCollection(tx: Tx, c: { collectionId: CuidId; ownerId: CuidId }): Promise<{ entriesRemoved: number; platformPurchaseEntriesRemoved: number } | null> {
    const owned = await tx.query(`SELECT id FROM "Collection" WHERE id = $1 AND "ownerId" = $2 FOR UPDATE`, [c.collectionId, c.ownerId]);
    if (owned.rowCount !== 1) return null;
    const { rows } = await tx.query<{ entriesRemoved: number; platformPurchaseEntriesRemoved: number }>(
      `SELECT count(*)::int AS "entriesRemoved", (count(*) FILTER (WHERE source = 'PlatformPurchase'))::int AS "platformPurchaseEntriesRemoved"
         FROM "CollectionEntry" WHERE "collectionId" = $1`,
      [c.collectionId],
    );
    await tx.query(`DELETE FROM "Collection" WHERE id = $1`, [c.collectionId]);
    return rows[0]!;
  }

  async readCollections(tx: Tx, ownerId: CuidId): Promise<CollectionRow[]> {
    const { rows } = await tx.query<CollectionRow>(
      `SELECT c.id AS "collectionId", c.name, (SELECT count(*)::int FROM "CollectionEntry" e WHERE e."collectionId" = c.id) AS "entryCount"
         FROM "Collection" c WHERE c."ownerId" = $1 ORDER BY c."nameKey", c.id`,
      [ownerId],
    );
    return rows;
  }

  async ownsCollection(tx: Tx, collectionId: CuidId, ownerId: CuidId): Promise<boolean> {
    const { rowCount } = await tx.query(`SELECT 1 FROM "Collection" WHERE id = $1 AND "ownerId" = $2 FOR SHARE`, [collectionId, ownerId]);
    return rowCount === 1;
  }

  async findGeneralCollection(tx: Tx, ownerId: CuidId): Promise<CuidId | null> {
    const { rows } = await tx.query<{ id: CuidId }>(`SELECT id FROM "Collection" WHERE "ownerId" = $1 AND "nameKey" = tezg_unaccent_lower($2) FOR SHARE`, [ownerId, GENERAL_COLLECTION]);
    return rows[0]?.id ?? null;
  }

  async ensureGeneralCollection(tx: Tx, c: { id: CuidId; ownerId: CuidId; now: IsoInstant }): Promise<{ collectionId: CuidId; created: boolean }> {
    const inserted = await tx.query<{ id: CuidId }>(
      `INSERT INTO "Collection" (id, "ownerId", name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT ("ownerId", "nameKey") DO NOTHING RETURNING id`,
      [c.id, c.ownerId, GENERAL_COLLECTION, c.now],
    );
    if (inserted.rows[0]) return { collectionId: inserted.rows[0].id, created: true };
    return { collectionId: (await this.findGeneralCollection(tx, c.ownerId))!, created: false };
  }

  async insertCollectionEntries(tx: Tx, collectionId: CuidId, entries: NewEntry[], now: IsoInstant): Promise<void> {
    if (entries.length === 0) return;
    // The caller holds `col:owner`, so max + n cannot race another assignment for this owner (COL-1 Q1).
    await tx.query(
      `INSERT INTO "CollectionEntry" (id, "collectionId", "cardKind", "catalogEntryId", source, "orderId", qty, "acquiredAt", "acquiredPriceCop", "manualPosition", "createdAt", "updatedAt")
       SELECT e.id, $1, 'catalog', e."catalogEntryId", e.source, e."orderId", e.qty, e."acquiredAt"::date, e."acquiredPriceCop",
              (SELECT COALESCE(MAX("manualPosition"), -1) FROM "CollectionEntry" WHERE "collectionId" = $1) + e.n, $3, $3
         FROM jsonb_to_recordset($2::jsonb)
           AS e(id text, "catalogEntryId" text, source text, "orderId" text, qty int, "acquiredAt" text, "acquiredPriceCop" bigint, n int)
        ORDER BY e.n`,
      [collectionId, JSON.stringify(entries.map((e, i) => ({ ...e, n: i + 1 }))), now],
    );
  }

  async insertPrompt(tx: Tx, p: { id: CuidId; orderId: CuidId; buyerId: CuidId; lines: OrderClosedLineV1[]; buyerItemReceivedConfirmedAt: IsoInstant; now: IsoInstant }): Promise<{ created: boolean; promptId: CuidId }> {
    const inserted = await tx.query<{ id: CuidId }>(
      `INSERT INTO "PostPurchasePrompt" (id, "orderId", "buyerId", lines, "buyerItemReceivedConfirmedAt", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $6) ON CONFLICT ("orderId") DO NOTHING RETURNING id`,
      [p.id, p.orderId, p.buyerId, JSON.stringify(p.lines), p.buyerItemReceivedConfirmedAt, p.now],
    );
    if (inserted.rows[0]) return { created: true, promptId: inserted.rows[0].id };
    // The conflicting row is committed or held by a transaction that has just committed: ON CONFLICT waited for it.
    const { rows } = await tx.query<{ id: CuidId }>(`SELECT id FROM "PostPurchasePrompt" WHERE "orderId" = $1`, [p.orderId]);
    if (!rows[0]) throw new UnexpectedError(`collections.insertPrompt: no prompt for order ${p.orderId} after its conflict`);
    return { created: false, promptId: rows[0].id };
  }

  async resolvePrompt(tx: Tx, c: { promptId: CuidId; buyerId: CuidId; to: 'Accepted' | 'Dismissed'; collectionId: CuidId | null; now: IsoInstant }): Promise<PromptRow | null> {
    const { rows } = await tx.query<PromptRow>(
      `UPDATE "PostPurchasePrompt" SET status = $3, "resolvedAt" = $5, "acceptedIntoCollectionId" = $4, "updatedAt" = $5, version = version + 1
        WHERE id = $1 AND "buyerId" = $2 AND status = 'Pending' RETURNING ${PROMPT_COLUMNS}`,
      [c.promptId, c.buyerId, c.to, c.collectionId, c.now],
    );
    return rows[0] ?? null;
  }

  async readPrompt(tx: Tx, promptId: CuidId): Promise<PromptRow | null> {
    const { rows } = await tx.query<PromptRow>(`SELECT ${PROMPT_COLUMNS} FROM "PostPurchasePrompt" WHERE id = $1`, [promptId]);
    return rows[0] ?? null;
  }

  async readPrompts(tx: Tx, buyerId: CuidId, status: PromptStatus | null): Promise<PromptRow[]> {
    const { rows } = await tx.query<PromptRow>(
      `SELECT ${PROMPT_COLUMNS} FROM "PostPurchasePrompt" WHERE "buyerId" = $1 AND ($2::text IS NULL OR status = $2) ORDER BY "createdAt" DESC, id DESC`,
      [buyerId, status],
    );
    return rows;
  }
}

/** VAL's reads of COL's tables (AD-VAL-1 rule 1); VAL owns none and writes nothing (contracts.md §11). */
export class PgValRepository implements ValRepository {
  async ownsCollectionForRead(tx: Tx, collectionId: CuidId, ownerId: CuidId): Promise<boolean> {
    const { rowCount } = await tx.query(`SELECT 1 FROM "Collection" WHERE id = $1 AND "ownerId" = $2`, [collectionId, ownerId]);
    return rowCount === 1;
  }

  async readValuationEntries(tx: Tx, collectionId: CuidId): Promise<ValuationEntryRow[]> {
    const { rows } = await tx.query<ValuationEntryRow>(
      `SELECT id AS "entryId", "cardKind", "catalogEntryId", qty, to_char("acquiredAt", 'YYYY-MM-DD') AS "acquiredAt"
       FROM "CollectionEntry" WHERE "collectionId" = $1 ORDER BY "manualPosition", id`,
      [collectionId],
    );
    return rows;
  }
}
