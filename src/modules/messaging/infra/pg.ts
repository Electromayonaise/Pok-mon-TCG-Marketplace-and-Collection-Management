// Driven adapter (persistence) — messaging. Bound to docs/solu-1/planning/schemas/008_create_messaging.sql.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql } from '../../../shared-kernel/ports.js';
import type { IConversationRepository } from '../ports/msg.js';

export class PgConversationRepository implements IConversationRepository {
  constructor(protected readonly sql: Sql) {}
  async participantRole(): Promise<null> {
    throw new NotImplementedError('PgConversationRepository.participantRole');
  }
  async startOrGet(): Promise<never> {
    throw new NotImplementedError('PgConversationRepository.startOrGet');
  }
  async allocateSeq(): Promise<number> {
    throw new NotImplementedError('PgConversationRepository.allocateSeq');
  }
  async insertMessage(): Promise<'inserted' | 'duplicate'> {
    throw new NotImplementedError('PgConversationRepository.insertMessage');
  }
  async findByClientMessageId(): Promise<null> {
    throw new NotImplementedError('PgConversationRepository.findByClientMessageId');
  }
  async findPair(): Promise<null> {
    throw new NotImplementedError('PgConversationRepository.findPair');
  }
}
