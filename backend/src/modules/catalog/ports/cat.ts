import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { ReferencePriceDTO, ValidFeedRowDTO } from '../dto/cat.dto.js';

// Outbound ports — CAT.

export interface IFeedRunRepository {
  /** AD-CAT-1 rule 7: fail runs abandoned > 24 h. Returns the number failed. */
  failAbandoned(tx: Tx, now: Date): Promise<number>;
  /** Inserts a Running row; a unique violation on feed_run_single_running maps to FeedRunInProgress. */
  insertRunning(tx: Tx, row: { id: CuidId; startedAt: Date }): Promise<'inserted' | 'conflict'>;
  findRunning(tx: Tx): Promise<{ runId: CuidId; startedAt: Date } | null>;
}

export interface ICatalogEntryRepository {
  /** INSERT … ON CONFLICT ("externalKey") DO UPDATE … WHERE (…) IS DISTINCT FROM (…) RETURNING. */
  upsertByExternalKey(
    tx: Tx,
    newId: CuidId,
    row: ValidFeedRowDTO,
    now: Date,
  ): Promise<{ id: CuidId; outcome: 'created' | 'updated' | 'unchanged'; before: Record<string, unknown> | null }>;
  insertRevision(tx: Tx, row: { id: CuidId; catalogEntryId: CuidId; runId: CuidId; changedFields: string[]; before: object; after: object; at: Date }): Promise<void>;
}

export interface IReferencePriceRepository {
  /** ORDER BY ("observedAt" DESC, source ASC, id ASC) LIMIT 1 (review F-11). */
  latestAsOf(catalogEntryId: CuidId, asOf: Date, freshnessThresholdHours: number): Promise<ReferencePriceDTO | null>;
}
