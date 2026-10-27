// Driven adapters (persistence) — catalog. The Solu-1 stubs below are bound to the retired migration
// 003_create_catalog.sql (git 853449c:docs/solu-1/planning/schemas/); the Solu-2 PgCatRepository at
// the end is bound to _bmad-output/planning-artifacts/detailed-design/schemas.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { CuidId, IsoDate, IsoInstant } from '../../../shared-kernel/types.js';
import type { RunKey } from '../domain/cat.js';
import type { FeedRunDTO, ValidFeedRow } from '../dto/cat.v2.dto.js';
import type { BatchCounts, CatRepository, FeedRunStatus, ObservationRow, QuarantineListRow, QuarantineRow, RunState, StoredEntry } from '../ports/cat.v2.js';
import type { ReferencePriceDTO } from '../dto/cat.dto.js';
import type { ICatalogEntryRepository, IFeedRunRepository, IReferencePriceRepository } from '../ports/cat.js';

export class PgFeedRunRepository implements IFeedRunRepository {
  constructor(protected readonly sql: Sql) {}
  async failAbandoned(): Promise<number> {
    throw new NotImplementedError('PgFeedRunRepository.failAbandoned');
  }
  async insertRunning(): Promise<'inserted' | 'conflict'> {
    throw new NotImplementedError('PgFeedRunRepository.insertRunning');
  }
  async findRunning(): Promise<null> {
    throw new NotImplementedError('PgFeedRunRepository.findRunning');
  }
}

export class PgCatalogEntryRepository implements ICatalogEntryRepository {
  constructor(protected readonly sql: Sql) {}
  async upsertByExternalKey(): Promise<never> {
    throw new NotImplementedError('PgCatalogEntryRepository.upsertByExternalKey');
  }
  async insertRevision(): Promise<void> {
    throw new NotImplementedError('PgCatalogEntryRepository.insertRevision');
  }
}

export class PgReferencePriceRepository implements IReferencePriceRepository {
  constructor(protected readonly sql: Sql) {}
  async latestAsOf(): Promise<ReferencePriceDTO | null> {
    throw new NotImplementedError('PgReferencePriceRepository.latestAsOf');
  }
}

// ---------------------------------------------------------------- Solu-2 (AD-CAT-1, AD-CAT-2)

type RunRow = { runId: CuidId; status: FeedRunStatus; cursor: number; startedAt: Date; leaseUntil: Date | null };
const RUN_COLUMNS = `id AS "runId", status, cursor, "startedAt", "leaseUntil"`;
const runState = (r: RunRow): RunState => ({ ...r, startedAt: r.startedAt.toISOString(), leaseUntil: r.leaseUntil?.toISOString() ?? null });

/** CAT's repository port over `_bmad-output/planning-artifacts/detailed-design/schemas` (AD-8). */
export class PgCatRepository implements CatRepository {
  async failAbandonedRuns(tx: Tx, cutoff: IsoInstant, now: IsoInstant): Promise<CuidId[]> {
    const { rows } = await tx.query<{ id: CuidId }>(
      `UPDATE "FeedIngestionRun" SET status = 'Failed', "endedAt" = $2, "updatedAt" = $2, "leaseUntil" = NULL, "leaseToken" = NULL
       WHERE status = 'Running' AND COALESCE("leaseUntil", "startedAt") < $1 RETURNING id`,
      [cutoff, now],
    );
    return rows.map((r) => r.id);
  }

  async insertRunningRun(tx: Tx, runId: CuidId, now: IsoInstant): Promise<boolean> {
    // The partial unique index is the lock (AD-CAT-1 rule 1); the savepoint keeps `tx` usable
    // after a 23505, so the caller can still cite the live run.
    await tx.query('SAVEPOINT cat_insert_run');
    try {
      await tx.query(
        `INSERT INTO "FeedIngestionRun" (id, status, cursor, "startedAt", "createdAt", "updatedAt") VALUES ($1, 'Running', 0, $2, $2, $2)`,
        [runId, now],
      );
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code !== '23505' || pgError.constraint !== 'feed_run_single_running') throw error;
      await tx.query('ROLLBACK TO SAVEPOINT cat_insert_run');
      return false;
    }
    await tx.query('RELEASE SAVEPOINT cat_insert_run');
    return true;
  }

  async readRunningRun(tx: Tx): Promise<RunState | null> {
    const { rows } = await tx.query<RunRow>(`SELECT ${RUN_COLUMNS} FROM "FeedIngestionRun" WHERE status = 'Running'`);
    return rows[0] ? runState(rows[0]) : null;
  }

  async readRun(tx: Tx, runId: CuidId): Promise<RunState | null> {
    const { rows } = await tx.query<RunRow>(`SELECT ${RUN_COLUMNS} FROM "FeedIngestionRun" WHERE id = $1`, [runId]);
    return rows[0] ? runState(rows[0]) : null;
  }

  async claimLease(tx: Tx, runId: CuidId, token: string, now: IsoInstant, until: IsoInstant): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE "FeedIngestionRun" SET "leaseUntil" = $3, "leaseToken" = $2, "updatedAt" = $4
       WHERE id = $1 AND status = 'Running' AND ("leaseUntil" IS NULL OR "leaseUntil" < $4)`,
      [runId, token, until, now],
    );
    return rowCount === 1;
  }

  async renewLease(tx: Tx, runId: CuidId, token: string, now: IsoInstant, until: IsoInstant): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE "FeedIngestionRun" SET "leaseUntil" = $3, "updatedAt" = $4 WHERE id = $1 AND "leaseToken" = $2 AND status = 'Running'`,
      [runId, token, until, now],
    );
    return rowCount === 1;
  }

  async advanceRun(tx: Tx, runId: CuidId, token: string, cursor: number, c: BatchCounts, done: boolean, now: IsoInstant): Promise<void> {
    await tx.query(
      `UPDATE "FeedIngestionRun" SET cursor = $3, created = created + $4, updated = updated + $5, unchanged = unchanged + $6,
         quarantined = quarantined + $7, "deferredNoFx" = "deferredNoFx" + $8, "updatedAt" = $9,
         status = CASE WHEN $10 THEN 'Completed' ELSE status END,
         "endedAt" = CASE WHEN $10 THEN $9::timestamptz ELSE "endedAt" END,
         "leaseUntil" = CASE WHEN $10 THEN NULL ELSE "leaseUntil" END,
         "leaseToken" = CASE WHEN $10 THEN NULL ELSE "leaseToken" END
       WHERE id = $1 AND "leaseToken" = $2`,
      [runId, token, cursor, c.created, c.updated, c.unchanged, c.quarantined, c.deferredNoFx, now, done],
    );
  }

  async releaseLease(tx: Tx, runId: CuidId, token: string, now: IsoInstant): Promise<void> {
    await tx.query(
      `UPDATE "FeedIngestionRun" SET "leaseUntil" = NULL, "leaseToken" = NULL, "updatedAt" = $3 WHERE id = $1 AND "leaseToken" = $2`,
      [runId, token, now],
    );
  }

  async failRun(tx: Tx, runId: CuidId, token: string, now: IsoInstant): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE "FeedIngestionRun" SET status = 'Failed', "endedAt" = $3, "updatedAt" = $3, "leaseUntil" = NULL, "leaseToken" = NULL
       WHERE id = $1 AND "leaseToken" = $2 AND status = 'Running'`,
      [runId, token, now],
    );
    return rowCount === 1;
  }

  async listRuns(tx: Tx, after: RunKey | null, limit: number): Promise<FeedRunDTO[]> {
    // Two statements, not `OR $1 IS NULL` (Story 1.5 deferral).
    const select = `SELECT id AS "runId", status, cursor, created, updated, unchanged, quarantined, "deferredNoFx", "startedAt", "endedAt" FROM "FeedIngestionRun"`;
    type Row = Omit<FeedRunDTO, 'startedAt' | 'endedAt'> & { startedAt: Date; endedAt: Date | null };
    const { rows } = after === null
      ? await tx.query<Row>(`${select} ORDER BY "startedAt" DESC, id DESC LIMIT $1`, [limit])
      : await tx.query<Row>(`${select} WHERE ("startedAt", id) < ($1, $2) ORDER BY "startedAt" DESC, id DESC LIMIT $3`, [after.startedAt, after.id, limit]);
    return rows.map((r) => ({ ...r, startedAt: r.startedAt.toISOString(), endedAt: r.endedAt?.toISOString() ?? null }));
  }

  async readSetIds(tx: Tx): Promise<Map<string, CuidId>> {
    const { rows } = await tx.query<{ code: string; id: CuidId }>(`SELECT code, id FROM "CatalogSet"`);
    return new Map(rows.map((r) => [r.code, r.id]));
  }

  async readRateOnOrBefore(tx: Tx, date: IsoDate): Promise<{ copPerUsdCentavos: number; validFrom: IsoDate } | null> {
    const { rows } = await tx.query<{ copPerUsdCentavos: string; validFrom: string }>(
      `SELECT "copPerUsdCentavos"::text AS "copPerUsdCentavos", "validFrom"::text AS "validFrom" FROM "FxRate"
       WHERE "validFrom" <= $1::date ORDER BY "validFrom" DESC LIMIT 1`,
      [date],
    );
    return rows[0] ? { copPerUsdCentavos: Number(rows[0].copPerUsdCentavos), validFrom: rows[0].validFrom } : null;
  }

  async readEntryByExternalKey(tx: Tx, externalKey: string): Promise<StoredEntry | null> {
    const { rows } = await tx.query<StoredEntry>(
      `SELECT id, kind, "setId", name, number, "numberSort", pokemon, colour, style, artist, "imageUrl" FROM "CatalogEntry" WHERE "externalKey" = $1`,
      [externalKey],
    );
    return rows[0] ?? null;
  }

  async upsertEntry(tx: Tx, newId: CuidId, row: ValidFeedRow, setId: CuidId, sort: number, now: IsoInstant): Promise<{ id: CuidId; inserted: boolean } | null> {
    // CAT-2 Q1: the SET list never names id, "externalKey", kind or "createdAt" (AD-7).
    const { rows } = await tx.query<{ id: CuidId; inserted: boolean }>(
      `INSERT INTO "CatalogEntry" (id, "externalKey", "setId", kind, name, number, "numberSort", pokemon, colour, style, artist, "imageUrl", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
       ON CONFLICT ("externalKey") DO UPDATE SET
         "setId" = EXCLUDED."setId", name = EXCLUDED.name, number = EXCLUDED.number, "numberSort" = EXCLUDED."numberSort",
         pokemon = EXCLUDED.pokemon, colour = EXCLUDED.colour, style = EXCLUDED.style, artist = EXCLUDED.artist,
         "imageUrl" = EXCLUDED."imageUrl", "updatedAt" = EXCLUDED."updatedAt"
       WHERE ("CatalogEntry"."setId", "CatalogEntry".name, "CatalogEntry".number, "CatalogEntry"."numberSort", "CatalogEntry".pokemon,
              "CatalogEntry".colour, "CatalogEntry".style, "CatalogEntry".artist, "CatalogEntry"."imageUrl")
         IS DISTINCT FROM (EXCLUDED."setId", EXCLUDED.name, EXCLUDED.number, EXCLUDED."numberSort", EXCLUDED.pokemon,
              EXCLUDED.colour, EXCLUDED.style, EXCLUDED.artist, EXCLUDED."imageUrl")
       RETURNING id, (xmax = 0) AS inserted`,
      [newId, row.externalKey, setId, row.kind, row.name, row.number, sort, row.pokemon, row.colour, row.style, row.artist, row.imageUrl, now],
    );
    return rows[0] ?? null;
  }

  async insertRevision(tx: Tx, r: { id: CuidId; catalogEntryId: CuidId; runId: CuidId; changedFields: string[]; before: object; after: object }, now: IsoInstant): Promise<void> {
    await tx.query(
      `INSERT INTO "CatalogEntryRevision" (id, "catalogEntryId", "runId", "changedFields", before, after, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [r.id, r.catalogEntryId, r.runId, r.changedFields, JSON.stringify(r.before), JSON.stringify(r.after), now],
    );
  }

  async quarantineRow(tx: Tx, r: QuarantineRow, now: IsoInstant): Promise<void> {
    await tx.query(
      `INSERT INTO "QuarantinedFeedRow" (id, "runId", "rowNumber", "externalKey", "reasonCode", "rawRow", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT ("runId", "rowNumber") DO NOTHING`,
      [r.id, r.runId, r.rowNumber, r.externalKey, r.reasonCode, JSON.stringify(r.rawRow), now],
    );
  }

  async listQuarantined(tx: Tx, runId: CuidId, reasonCode: string | null, afterRow: number | null, limit: number): Promise<QuarantineListRow[]> {
    // The filters are appended, never `OR $n IS NULL`, so the (runId, rowNumber) unique index serves each page.
    const params: unknown[] = [runId];
    let where = '"runId" = $1';
    if (reasonCode !== null) where += ` AND "reasonCode" = $${params.push(reasonCode)}`;
    if (afterRow !== null) where += ` AND "rowNumber" > $${params.push(afterRow)}`;
    const { rows } = await tx.query<QuarantineListRow>(
      `SELECT "rowNumber", "externalKey", "reasonCode" FROM "QuarantinedFeedRow" WHERE ${where} ORDER BY "rowNumber" LIMIT $${params.push(limit)}`,
      params,
    );
    return rows;
  }

  async insertObservation(tx: Tx, o: ObservationRow, now: IsoInstant): Promise<void> {
    await tx.query(
      `INSERT INTO "ReferencePriceObservation" (id, "catalogEntryId", source, "observedAt", "usdCents", cop, "copDerivation", "fxRateDate", "runId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT ("catalogEntryId", source, "observedAt") DO NOTHING`,
      [o.id, o.catalogEntryId, o.source, o.observedAt, o.usdCents, o.cop, o.copDerivation, o.fxRateDate, o.runId, now],
    );
  }
}
