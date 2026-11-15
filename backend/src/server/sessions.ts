// Driven adapter of identity's SessionReader port (S-FR-IDN-7): Better Auth reads the session
// cookie, verifies its signature with the secret and finds the live `"Session"` row. Expiry is
// Better Auth's own check, on its clock; nothing here reads time (AD-SYS-6).
import type { SessionReader } from '../modules/identity/index.js';
import type { Auth } from './auth.js';

export function betterAuthSessions(auth: Pick<Auth, 'api'>): SessionReader {
  return { userIdOf: async (headers) => (await auth.api.getSession({ headers }))?.user.id ?? null };
}
