// The app's runtime composition root, shared by the tRPC route and the server-rendered pages
// (decision log Impl-2 #2). It holds the only system-clock adapter, outside the `src/` wall-clock
// scan (AD-SYS-6), and the log sink, since `src/` writes to no console. The services, the identity
// gate and the wired router come from src/server/composition.ts, built on first use so
// `next build` reads no configuration. `_server` is a private Next.js folder: it is never a route.
import { createAuth, type Auth } from '../../src/server/auth.js';
import { compose } from '../../src/server/composition.js';
import { db } from '../../src/server/db.js';
import { betterAuthSessions } from '../../src/server/sessions.js';
import { loadConfig } from '../../src/shared-kernel/config.js';
import { serveTrpc } from '../../src/server/trpc/init.js';
import type { ErrorBody } from '../../src/shared-kernel/explanation.js';
import type { Clock } from '../../src/shared-kernel/ports.js';
import { createLogger } from '../../src/shared-kernel/regulated.js';

export const systemClock: Clock = { now: () => new Date() };
const log = createLogger((line) => console.error(line));

let app: ReturnType<typeof compose> | undefined;
let authInstance: Auth | undefined;

/** Better Auth on the app database and the system clock (Story 2.6); production binds UNWIRED_EMAIL. */
function appAuth(): Auth {
  authInstance ??= createAuth({ prisma: db().prisma, ...loadConfig().auth, clock: systemClock });
  return authInstance;
}

/** The composed application, built once per process. */
export function application(): ReturnType<typeof compose> {
  if (!app) {
    const { ipHmacKey, jobsSecret } = loadConfig();
    const auth = appAuth();
    app = compose({ pool: db().pool, clock: systemClock, sessions: betterAuthSessions(auth), ipHmacKey, jobsSecret, log, auth });
  }
  return app;
}

/** Serves one `/api/auth/*` request behind the AD-IDN-3 guard (Story 2.6). */
export function handleAuth(req: Request): Promise<Response> {
  return application().auth(req);
}

/** Serves one `/api/jobs/<job>` request (Story 1.6). */
export function handleJob(req: Request): Promise<Response> {
  return application().jobs(req);
}

/** Serves one tRPC request through the wired router, with batching off (R-9, in serveTrpc). */
export function handleTrpc(req: Request): Promise<Response> {
  const a = application();
  return serveTrpc(req, a.router, systemClock, { identity: a.identity, ipHmac: a.ipHmac, log });
}

/** What a server component gets back from one procedure: its data, or the platform's ErrorBody. */
export type ProcedureResult<T> = { ok: true; data: T } | { ok: false; error: ErrorBody };

/**
 * Calls one tRPC procedure in-process for a server-rendered page (Story 9.6), with the request's cookies, so the page
 * goes through the same identity gate, parser and error formatter as the browser's `/api/trpc/<procedure>` calls.
 */
export async function callProcedure<T>(procedure: string, input: unknown, requestHeaders: Pick<Headers, 'get'>, kind: 'query' | 'mutation' = 'query'): Promise<ProcedureResult<T>> {
  const headers = new Headers();
  const cookie = requestHeaders.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const url = `http://tezg.internal/api/trpc/${procedure}`;
  const req = kind === 'query'
    ? new Request(`${url}?input=${encodeURIComponent(JSON.stringify(input))}`, { headers })
    : new Request(url, { method: 'POST', headers: { ...Object.fromEntries(headers), 'content-type': 'application/json' }, body: JSON.stringify(input) });
  const body = (await (await handleTrpc(req)).json()) as { result?: { data: T }; error?: ErrorBody };
  return body.error ? { ok: false, error: body.error } : { ok: true, data: body.result!.data };
}
