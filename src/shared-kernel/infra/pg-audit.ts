// Driven adapter — the Postgres AuditLog (refinement R-2): one `audit_events` insert through
// the writer's `tx`, so the row commits or rolls back with the change it describes. The
// AD-SYS-8 redactor runs over `data`. Proven by sys › [SYS-R2].
import type { AuditEntry, AuditLog } from '../audit.js';
import type { Clock, IdGenerator, Tx } from '../ports.js';
import { redact } from '../regulated.js';
import type { CuidId } from '../types.js';

export class PgAuditLog implements AuditLog {
  constructor(protected readonly ids: IdGenerator, protected readonly clock: Clock) {}

  /** Writes through `tx` and never commits it; `id` and `createdAt` come from the ports, or `createdAt` from `entry.at` (AD-SYS-6). */
  async record(tx: Tx, entry: AuditEntry): Promise<{ auditEventId: CuidId }> {
    const auditEventId = this.ids.next();
    await tx.query(
      `INSERT INTO audit_events (id, "actorId", "actorKind", module, action, "aggregateType", "aggregateId", "decisionCode", data, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [auditEventId, entry.actorId, entry.actorKind, entry.module, entry.action, entry.aggregateType, entry.aggregateId, entry.decisionCode, JSON.stringify(redact(entry.data)), entry.at ?? this.clock.now().toISOString()],
    );
    return { auditEventId };
  }
}
