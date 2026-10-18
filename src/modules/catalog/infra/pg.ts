// Driven adapters (persistence) — catalog. Bound to docs/solu-1/planning/schemas/003_create_catalog.sql.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql } from '../../../shared-kernel/ports.js';
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
