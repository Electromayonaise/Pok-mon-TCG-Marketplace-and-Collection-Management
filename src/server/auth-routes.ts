// Driving adapter — Better Auth's routes `/api/auth/*` behind the AD-IDN-3 guard (Story 2.6; S-FR-IDN-7;
// ARCHITECTURE S-8). Red-phase stub (Flow A, decision log Impl-2 #12): the bound tests in
// `_bmad-output/test-artifacts/atdd/idn_auth.test.ts` fail on NotImplementedError until the story is done.
import type { CheckAuthThrottleRequest, CheckAuthThrottleResponse } from '../modules/identity/index.js';
import { NotImplementedError } from '../shared-kernel/errors.js';
import type { Clock } from '../shared-kernel/ports.js';
import type { CuidId } from '../shared-kernel/types.js';
import type { Auth } from './auth.js';

/** What the guard asks identity (AD-11: identity owns `"AuthThrottleEvent"` and raises `AuthRateLimited`). */
export interface AuthGuard {
  checkAuthThrottle(input: CheckAuthThrottleRequest): Promise<CheckAuthThrottleResponse>;
  recordAuthThrottleEvent(input: { scope: 'signInFail' | 'signUp'; accountId: CuidId | null; ipHmac: string | null }): Promise<void>;
  accountIdForEmail(email: string): Promise<CuidId | null>;
}

export interface AuthRouteDeps {
  auth: Pick<Auth, 'handler'>;
  guard: AuthGuard;
  clock: Clock;
  ipHmacOf: (headers: Headers) => string | null;
}

/** Serves one `/api/auth/*` request: sign-up and sign-in pass the consent check and the throttle. */
export async function serveAuth(_req: Request, _deps: AuthRouteDeps): Promise<Response> {
  throw new NotImplementedError('auth.serveAuth');
}
