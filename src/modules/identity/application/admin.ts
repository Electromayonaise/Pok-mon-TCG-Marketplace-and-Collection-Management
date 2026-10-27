import { raiserFor } from '../../../shared-kernel/raise.js';
import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { IdnRepository } from '../ports/idn.v2.js';

const raise = raiserFor('identity');

/** The one repository method the admin guard reads (R-14: every service's `repo` carries identity's adapter). */
export type AdminFactsReader = Pick<IdnRepository, 'readCapabilityFacts'>;

/**
 * AD-16: admin-only operations check the flag in the service too, not only in the procedure builder.
 * Identity reads its own facts in the caller's `tx` and raises its own `AdminOnly`, so a neighbour's
 * admin operation (ORD's lookup, decision log Impl-1 #32) needs no read of an identity table.
 */
export async function requireAdmin(repo: AdminFactsReader, tx: Tx, adminId: CuidId): Promise<void> {
  const facts = await repo.readCapabilityFacts(tx, adminId);
  if (!facts?.isAdmin) raise('AdminOnly', [{ rule: 'AD-16', inputs: { isAdmin: false } }]);
}
