import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { ReferencePriceInput } from '../domain/val.js';

// Outbound ports — collections (COL, VAL).

/** Neighbour port: catalog's offered queries (AD-1 edge collections → catalog). */
export interface CatalogForCollections {
  getEntries(ids: readonly CuidId[]): Promise<{ entries: { id: CuidId; setId: CuidId; kind: 'card' | 'sealedProduct' }[]; missing: CuidId[] }>;
  getSetSummaries(setIds: readonly CuidId[]): Promise<{ setId: CuidId; name: string; cardEntryCount: number }[]>;
  /** ≤ 500 ids per call; one entry per id, price null when none ≤ asOf. */
  getReferencePricesAsOf(ids: readonly CuidId[], asOf: Date): Promise<Map<CuidId, ReferencePriceInput | null>>;
}

export interface ICollectionRepository {
  ownedBy(collectionId: CuidId, ownerId: CuidId): Promise<boolean>;
  /** pg_advisory_xact_lock(hashtextextended('col:owner:' || ownerId, 0)) — review F-13. */
  lockOwner(tx: Tx, ownerId: CuidId): Promise<void>;
  collectionForShare(tx: Tx, collectionId: CuidId, ownerId: CuidId): Promise<boolean>;
  maxManualPosition(tx: Tx, collectionId: CuidId): Promise<number>;
  insertPurchaseEntries(
    tx: Tx,
    rows: { id: CuidId; collectionId: CuidId; catalogEntryId: CuidId; orderId: CuidId; qty: number; acquiredAt: string; acquiredPriceCop: number | null; manualPosition: number; createdAt: Date }[],
  ): Promise<void>;
  catalogEntryIdsOf(collectionId: CuidId): Promise<CuidId[]>;
  entriesForValuation(tx: Tx, collectionId: CuidId): Promise<{ entryId: CuidId; cardKind: 'catalog' | 'external'; catalogEntryId: CuidId | null; qty: number }[]>;
}

export interface IPromptRepository {
  /** AD-COL-2 rule 2: UPDATE … WHERE id AND buyerId AND status='Pending' RETURNING lines … */
  acceptConditionally(
    tx: Tx,
    promptId: CuidId,
    buyerId: CuidId,
    collectionId: CuidId,
    now: Date,
  ): Promise<{ orderId: CuidId; lines: { itemRef: CuidId; qty: number; unitPriceCop?: number }[]; buyerItemReceivedConfirmedAt: Date } | null>;
  readForLoser(tx: Tx, promptId: CuidId): Promise<{ buyerId: CuidId; status: 'Pending' | 'Accepted' | 'Dismissed'; resolvedAt: Date | null } | null>;
}
