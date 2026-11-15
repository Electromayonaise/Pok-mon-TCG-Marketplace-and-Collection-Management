import type { CuidId, IsoInstant } from './types.js';
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
  /**
   * The writer's instant (AD-SYS-6), so the row and the change it describes share one Clock
   * read. Absent, the adapter reads its own Clock.
   */
  at?: IsoInstant;
}

/** Outbound port. The id comes from the IdGenerator; `createdAt` is `entry.at`, else the adapter's Clock. */
export interface AuditLog {
  record(tx: Tx, entry: AuditEntry): Promise<{ auditEventId: CuidId }>;
}
