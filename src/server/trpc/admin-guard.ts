// Driving adapter — the admin gate of `adminProcedure` (AD-SYS-8 rule 1). It may call
// `identity`; the modules it guards (e.g. `catalog`, which has no module dependencies, AD-1)
// never do (review E-23, decision log #15).
import type { CuidId } from '../../shared-kernel/types.js';

/** The identity guard this adapter calls. It throws AdminOnly (owner identity) itself. */
export interface IdentityAdminGuard {
  requireAdmin(actorId: CuidId): Promise<void>;
}

export interface AssertCatalogAdminRequestDTO {
  actorId: CuidId;
}

/** contracts.md §3 `assertCatalogAdmin`: propagates AdminOnly unchanged; zero writes. */
export interface IAssertCatalogAdminUseCase {
  assertCatalogAdmin(input: AssertCatalogAdminRequestDTO): Promise<void>;
}

/** Delegates to identity; raises nothing of its own (AD-11). */
export class AdminGuard implements IAssertCatalogAdminUseCase {
  constructor(protected readonly identity: IdentityAdminGuard) {}

  async assertCatalogAdmin(input: AssertCatalogAdminRequestDTO): Promise<void> {
    await this.identity.requireAdmin(input.actorId);
  }
}

export function createAdminGuard(identity: IdentityAdminGuard): IAssertCatalogAdminUseCase {
  return new AdminGuard(identity);
}
