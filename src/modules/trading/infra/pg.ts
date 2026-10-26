// Driven adapter (persistence) — trading. Bound to the Solu-1 migration 007_create_trading.sql (retired; git 853449c:docs/solu-1/planning/schemas/).
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql } from '../../../shared-kernel/ports.js';
import type { ITradeOfferRepository } from '../ports/trd.js';

export class PgTradeOfferRepository implements ITradeOfferRepository {
  constructor(protected readonly sql: Sql) {}
  async lockSeller(): Promise<void> {
    throw new NotImplementedError('PgTradeOfferRepository.lockSeller');
  }
  async facts(): Promise<null> {
    throw new NotImplementedError('PgTradeOfferRepository.facts');
  }
  async acceptConditionally(): Promise<0 | 1> {
    throw new NotImplementedError('PgTradeOfferRepository.acceptConditionally');
  }
  async storeReservation(): Promise<void> {
    throw new NotImplementedError('PgTradeOfferRepository.storeReservation');
  }
  async markSiblingsUnfulfillable(): Promise<never> {
    throw new NotImplementedError('PgTradeOfferRepository.markSiblingsUnfulfillable');
  }
  async markOwnUnfulfillable(): Promise<void> {
    throw new NotImplementedError('PgTradeOfferRepository.markOwnUnfulfillable');
  }
  async findOpen(): Promise<null> {
    throw new NotImplementedError('PgTradeOfferRepository.findOpen');
  }
}
