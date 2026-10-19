// Public surface of `messaging` (AD-1). The contact-message service is code-owned by `listings` (AD-4).
import type { Clock, IdGenerator, Sql, TransactionRunner } from '../../shared-kernel/ports.js';
import { MsgService, type MsgUseCases } from './application/msg.js';
import { PgConversationRepository } from './infra/pg.js';
import type { IdentityForMessaging } from './ports/msg.js';

export type * from './dto/msg.dto.js';
export type * from './dto/msg.v2.dto.js';
export type { MsgUseCases } from './application/msg.js';
export type { IdentityForMessaging } from './ports/msg.js';

export interface MessagingWiring {
  sql: Sql;
  transactions: TransactionRunner;
  clock: Clock;
  ids: IdGenerator;
  identity: IdentityForMessaging;
}

/** Composition root for MSG in-app (contracts.md §9). */
export function createMsgModule(w: MessagingWiring): MsgUseCases {
  return new MsgService({ conversations: new PgConversationRepository(w.sql), identity: w.identity, transactions: w.transactions, clock: w.clock, ids: w.ids });
}

// <gen-solu2-api>
export { MsgServiceV2 } from './application/msg.v2.js';
export type { MsgV2UseCases } from './application/msg.v2.js';
export type * from './ports/msg.v2.js';
// </gen-solu2-api>
