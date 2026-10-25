import type { CuidId } from '../../../shared-kernel/types.js';

/**
 * S-FR-IDN-7: whose session a request carries. Better Auth binds it (src/server/sessions.ts),
 * verifying the signed cookie against `"Session"`; identity only decides what a missing one means.
 */
export interface SessionReader {
  /** The session's user, or `null` when the headers carry no live, correctly signed session. */
  userIdOf(headers: Headers): Promise<CuidId | null>;
}
