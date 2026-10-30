import { raiserFor } from '../../../shared-kernel/raise.js';
import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { GetCapabilitiesResponse } from '../dto/idn.v2.dto.js';
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

/** AD-16: the same flag, for a read open to its owner or an admin (COM's proof URL, decision log Impl-1 #33). */
export async function isAdmin(repo: AdminFactsReader, tx: Tx, userId: CuidId): Promise<boolean> {
  return (await repo.readCapabilityFacts(tx, userId))?.isAdmin === true;
}

/**
 * A neighbour's business-only operation (COM's top-ups and account, decision log Impl-1 #33): identity
 * raises its own `NotBusinessAccount`, under the caller's rule, from the capabilities it served through P-IDN.capabilities, so
 * the neighbour neither reads an identity table nor raises an identity code.
 */
export function requireBusinessAccount(capabilities: Pick<GetCapabilitiesResponse, 'sellerKind'>, rule: string): void {
  if (capabilities.sellerKind !== 'business') raise('NotBusinessAccount', [{ rule, inputs: { status: capabilities.sellerKind } }]);
}
