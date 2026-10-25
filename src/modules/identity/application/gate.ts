// S-FR-IDN-7: the gates the procedure builders ask (AD-11). Identity raises its own codes, so
// server/trpc never decides who is signed in or who is an admin (decision log Impl-1 #24).
import type { TransactionRunner } from '../../../shared-kernel/ports.js';
import { raiserFor } from '../../../shared-kernel/raise.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { RequireCanBuyRequest, RequireCanBuyResponse } from '../dto/idn.v2.dto.js';
import type { IdnRepository } from '../ports/idn.v2.js';
import type { SessionReader } from '../ports/session.js';
import type { IdnV2UseCases } from './idn.v2.js';

const raise = raiserFor('identity');

export interface IdentityGateDeps {
  sessions: SessionReader;
  repo: IdnRepository;
  transactions: TransactionRunner;
  /** `canBuy` is IDN's own use case (Story 2.4); the gate only forwards it. */
  idn: Pick<IdnV2UseCases, 'requireCanBuy'>;
}

export class IdentityGateV2 {
  constructor(protected readonly deps: IdentityGateDeps) {}

  /** `actor = { userId }` from the session; without one, NotAuthenticated (401). */
  async resolveSession(headers: Headers): Promise<CuidId> {
    const userId = await this.deps.sessions.userIdOf(headers);
    return userId ?? raise('NotAuthenticated', [{ rule: 'S-FR-IDN-7', inputs: { session: null } }]);
  }

  /** P: `isAdmin`, read from the same facts `deriveCapabilities` reads (AD-IDN-1 rule 1). Zero writes. */
  async requireAdmin(actorId: CuidId): Promise<void> {
    const { repo, transactions } = this.deps;
    const facts = await transactions.run((tx) => repo.readCapabilityFacts(tx, actorId), { readOnly: true });
    if (!facts?.isAdmin) raise('AdminOnly', [{ rule: 'S-FR-IDN-7', inputs: { isAdmin: false } }]);
  }

  async requireCanBuy(input: RequireCanBuyRequest): Promise<RequireCanBuyResponse> {
    return this.deps.idn.requireCanBuy(input);
  }
}
