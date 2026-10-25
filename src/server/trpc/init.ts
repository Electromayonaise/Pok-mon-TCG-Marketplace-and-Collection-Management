// The tRPC instance and the app router served at /api/trpc (non-batched wire, R-9). The router is
// empty in the scaffold: Story 1.1 adds the procedure builders, the error formatter and the
// registry routers (router.v2.ts), and each story registers its own procedures.
import { initTRPC } from '@trpc/server';

/** Per-request context. Story 1.1 resolves the Better Auth session from these headers. */
export interface TrpcContext {
  headers: Headers;
}

export function createContext(req: Request): TrpcContext {
  return { headers: req.headers };
}

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const appRouter = router({});
export type AppRouter = typeof appRouter;
