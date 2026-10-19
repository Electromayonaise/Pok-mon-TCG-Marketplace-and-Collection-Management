// Driven adapter — the Postgres AuditLog (refinement R-2): one `audit_events` insert through
// the writer's `tx`, so the row commits or rolls back with the change it describes. The
// AD-SYS-8 redactor runs over `data`. Interface stub, proven by sys › [SYS-R2].
import { NotImplementedError } from '../errors.js';
import type { AuditEntry, AuditLog } from '../audit.js';
import type { Clock, IdGenerator, Tx } from '../ports.js';
import type { CuidId } from '../types.js';

export class PgAuditLog implements AuditLog {
  constructor(protected readonly ids: IdGenerator, protected readonly clock: Clock) {}

  async record(_tx: Tx, _entry: AuditEntry): Promise<{ auditEventId: CuidId }> {
    throw new NotImplementedError('shared-kernel.audit.record');
  }
}
