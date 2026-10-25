// The tRPC instance, its four procedure builders and the error formatter (AD-SYS-1, AD-SYS-8
// rule 1, R-9). router.v2.ts registers the procedures; app/api/trpc/[trpc]/route.ts is the
// composition root that binds the system clock.
import { AsyncLocalStorage } from 'node:async_hooks';
import { initTRPC, type AnyRouter } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { IdnUseCases, IdnV2UseCases } from '../../modules/identity/index.js';
import { NotImplementedError, UnexpectedError } from '../../shared-kernel/errors.js';
import type { ErrorBody } from '../../shared-kernel/explanation.js';
import type { Clock } from '../../shared-kernel/ports.js';
import type { Logger } from '../../shared-kernel/regulated.js';
import type { CuidId } from '../../shared-kernel/types.js';
import { createAdminGuard } from './admin-guard.js';
import { toErrorBody } from './errors.js';
import type { ProcedureBuilder } from './router.v2.js';

/**
 * What the builders ask identity. Each gate raises identity's own codes (NotAuthenticated,
 * EmailNotVerified, AdminOnly); server/trpc raises none of them (AD-11).
 */
export interface IdentityGate extends Pick<IdnUseCases, 'requireAdmin'>, Pick<IdnV2UseCases, 'requireCanBuy'> {
  /** The session's user, read from the Better Auth headers. */
  resolveSession(headers: Headers): Promise<CuidId>;
}

/** Identity until Epic 2 wires sessions and the guards: every gate is NotImplemented. */
export const UNWIRED_IDENTITY: IdentityGate = {
  resolveSession: async () => { throw new NotImplementedError('identity.resolveSession'); },
  requireAdmin: async () => { throw new NotImplementedError('identity.requireAdmin'); },
  requireCanBuy: async () => { throw new NotImplementedError('identity.requireCanBuy'); },
};

/** Per-request context. `clock` is the only source of `now` (AD-SYS-6). */
export interface TrpcContext {
  headers: Headers;
  clock: Clock;
  identity: IdentityGate;
}

/** Never throws: the gates run in the builders, where a refusal becomes an ErrorBody. */
export function createContext(req: Request, clock: Clock, identity: IdentityGate = UNWIRED_IDENTITY): TrpcContext {
  return { headers: req.headers, clock, identity };
}

/**
 * The clock of a refusal tRPC makes before it creates a context (a batched or malformed call).
 * serveTrpc binds it per request, so concurrent requests on different clocks never share one.
 */
const requestClock = new AsyncLocalStorage<Clock>();

const t = initTRPC.context<TrpcContext>().meta<{ builder: Exclude<ProcedureBuilder, 'job'> }>().create({
  // The shape is the ErrorBody itself: no tRPC `message`, `data` or `stack` ever reaches the wire.
  errorFormatter: ({ error, ctx }): ErrorBody => toErrorBody(error, (ctx?.clock ?? requestClock.getStore()!).now()),
});

export const router = t.router;

export const publicProcedure = t.procedure.meta({ builder: 'public' });

const withSession = t.procedure.use(async ({ ctx, next }) => next({ ctx: { actorId: await ctx.identity.resolveSession(ctx.headers) } }));

export const authedProcedure = withSession.meta({ builder: 'authed' });

export const canBuyProcedure = withSession
  .use(async ({ ctx, next }) => { await ctx.identity.requireCanBuy({ userId: ctx.actorId }); return next(); })
  .meta({ builder: 'canBuy' });

export const adminProcedure = withSession
  .use(async ({ ctx, next }) => { await createAdminGuard(ctx.identity).assertCatalogAdmin({ actorId: ctx.actorId }); return next(); })
  .meta({ builder: 'admin' });

/**
 * Serves one non-batched tRPC request (R-9); the HTTP status is the refusal's `httpStatus`.
 * A refusal that formats as `'Unexpected'` writes one `trpc.unexpected` line to `log`.
 */
export function serveTrpc(req: Request, appRouter: AnyRouter, clock: Clock, o: { identity?: IdentityGate; log?: Logger } = {}): Promise<Response> {
  return requestClock.run(clock, () => fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(req, clock, o.identity),
    allowBatching: false,
    responseMeta: ({ data }) => {
      const refusal = data.find((d) => 'error' in d) as { error: ErrorBody } | undefined;
      return refusal ? { status: refusal.error.httpStatus } : {};
    },
    onError: ({ error, path, type }) => {
      // A log never changes the response: a sink that throws is swallowed here.
      try {
        if (o.log && toErrorBody(error, clock.now()).code === 'Unexpected') o.log.error('trpc.unexpected', { path: path ?? null, type, ...causeNames(error) });
      } catch { /* the response is already the formatted ErrorBody */ }
    },
  }));
}

/**
 * What a log may say about the innermost cause: its class (read from the prototype, never from
 * an own property) and, for a pg driver error (one with a `severity`), its SQLSTATE. A foreign
 * message, `detail` or stack can quote a value, and the redactor works by key, not by content
 * (NFR-SYS-8), so only our own errors, whose messages name operations, add theirs.
 */
function causeNames(error: Error): Record<string, string> {
  let cause: unknown = error;
  for (let depth = 0; cause instanceof Error && cause.cause !== undefined && depth < 5; depth++) cause = cause.cause;
  const names: Record<string, string> = { errorClass: cause instanceof Error ? String(Object.getPrototypeOf(cause).constructor.name) : typeof cause };
  const { code, severity } = (cause ?? {}) as { code?: unknown; severity?: unknown };
  if (typeof severity === 'string' && typeof code === 'string' && SQLSTATE.test(code)) names.sqlState = code;
  if (cause instanceof NotImplementedError || cause instanceof UnexpectedError) names.detail = cause.message;
  return names;
}

const SQLSTATE = /^[0-9A-Z]{5}$/;
