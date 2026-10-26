// Driven adapters (persistence) — collections. Bound to the Solu-1 migration 009_create_collections.sql (retired; git 853449c:docs/solu-1/planning/schemas/).
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql } from '../../../shared-kernel/ports.js';
import type { ICollectionRepository, IPromptRepository } from '../ports/collections.js';

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
