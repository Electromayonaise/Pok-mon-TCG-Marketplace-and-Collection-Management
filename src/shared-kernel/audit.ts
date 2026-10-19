import type { CuidId } from './types.js';
import type { Tx } from './ports.js';

// The uniform audit trail (Solu-2 refinement R-2). Written in the writer's transaction, so
// an audit row exists iff the change it describes committed. Table: audit_events.

export type AuditActorKind = 'user' | 'admin' | 'system';

export type AuditModule =
  | 'shared-kernel' | 'identity' | 'catalog' | 'listings' | 'orders'
  | 'commission' | 'trading' | 'messaging' | 'collections' | 'reviews';

export interface AuditEntry {
  /** null only for `actorKind = 'system'` (jobs, subscribers). */
  actorId: CuidId | null;
  actorKind: AuditActorKind;
  module: AuditModule;
  /** `<module>.<aggregate>.<verb>`, e.g. `orders.fact.buyerPaid` (contracts §0.1). */
  action: string;
  aggregateType: string;
  aggregateId: CuidId;
  decisionCode: string | null;
  /** Ids and non-regulated primitives only; the AD-SYS-8 redactor runs over it. */
  data: Record<string, string | number | boolean | null>;
}

/** Outbound port. The id and `createdAt` come from IdGenerator and Clock inside the adapter. */
export interface AuditLog {
  record(tx: Tx, entry: AuditEntry): Promise<{ auditEventId: CuidId }>;
}
