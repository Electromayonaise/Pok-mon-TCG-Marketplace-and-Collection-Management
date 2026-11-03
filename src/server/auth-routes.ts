// Driving adapter — Better Auth's routes `/api/auth/*` behind the AD-IDN-3 guard (Story 2.6; S-FR-IDN-7;
// ARCHITECTURE S-7, S-8; decision log Impl-2 #11, #12). Every other path passes straight to Better Auth.
//   - `POST /sign-up/email`: `consentAccepted = true` and the current `consentVersion`, else
//     RequestValidationFailed on the field (rule 1); then the per-IP sign-up limit; the consent fields
//     are removed before Better Auth reads the body, and every forwarded attempt is counted.
//   - `POST /sign-in/email`: the account and IP limits before the password is checked, so the
//     11th attempt is refused even with the right password; a 401 records one row per known key.
// A refusal of this guard is the platform's `{ error: ErrorBody }`; Better Auth's own answers pass through.
import type { CheckAuthThrottleRequest, CheckAuthThrottleResponse } from '../modules/identity/index.js';
import { CURRENT_CONSENT_VERSION } from '../modules/identity/index.js';
import type { Clock } from '../shared-kernel/ports.js';
import { rejectRequest, type RequestIssue } from '../shared-kernel/request.js';
import type { CuidId } from '../shared-kernel/types.js';
import type { Auth } from './auth.js';
import { toErrorBody } from './trpc/errors.js';

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
export async function serveAuth(req: Request, deps: AuthRouteDeps): Promise<Response> {
  const path = new URL(req.url).pathname.replace(/^.*\/api\/auth/, '');
  if (req.method !== 'POST' || (path !== '/sign-up/email' && path !== '/sign-in/email')) return deps.auth.handler(req);
  try {
    return path === '/sign-up/email' ? await signUp(req, deps) : await signIn(req, deps);
  } catch (error) {
    const body = toErrorBody(error, deps.clock.now());
    return Response.json({ error: body }, { status: body.httpStatus });
  }
}

async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  const body: unknown = await req.clone().json().catch(() => null);
  if (body === null || typeof body !== 'object' || Array.isArray(body)) rejectRequest([{ field: 'la solicitud', issue: 'debe ser un objeto JSON' }]);
  return body as Record<string, unknown>;
}

async function signUp(req: Request, { auth, guard, ipHmacOf }: AuthRouteDeps): Promise<Response> {
  const { consentAccepted, consentVersion, ...rest } = await jsonBody(req);
  const issues: RequestIssue[] = [];
  if (consentAccepted !== true) issues.push({ field: 'consentAccepted', issue: 'debes aceptar el aviso de privacidad' });
  if (consentVersion !== CURRENT_CONSENT_VERSION) issues.push({ field: 'consentVersion', issue: 'no es la versión vigente del aviso de privacidad' });
  if (issues.length > 0) rejectRequest(issues as [RequestIssue, ...RequestIssue[]]);
  const ipHmac = ipHmacOf(req.headers);
  if (ipHmac !== null) await guard.checkAuthThrottle({ scope: 'signUp', accountId: null, ipHmac });
  const headers = new Headers(req.headers);
  headers.delete('content-length');
  const res = await auth.handler(new Request(req.url, { method: 'POST', headers, body: JSON.stringify(rest) }));
  await guard.recordAuthThrottleEvent({ scope: 'signUp', accountId: null, ipHmac });
  return res;
}

async function signIn(req: Request, { auth, guard, ipHmacOf }: AuthRouteDeps): Promise<Response> {
  const { email } = await jsonBody(req);
  const accountId = typeof email === 'string' && email.trim() !== '' ? await guard.accountIdForEmail(email) : null;
  const ipHmac = ipHmacOf(req.headers);
  if (accountId !== null || ipHmac !== null) await guard.checkAuthThrottle({ scope: 'signInFail', accountId, ipHmac });
  const res = await auth.handler(req);
  if (res.status === 401) await guard.recordAuthThrottleEvent({ scope: 'signInFail', accountId, ipHmac });
  return res;
}
