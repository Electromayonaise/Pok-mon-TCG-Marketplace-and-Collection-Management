// The app's runtime composition root, shared by the tRPC route and the server-rendered pages
// (decision log Impl-2 #2). It holds the only system-clock adapter, outside the `src/` wall-clock
// scan (AD-SYS-6), and the log sink, since `src/` writes to no console. The services, the identity
// gate and the wired router come from src/server/composition.ts, built on first use so
// `next build` reads no configuration. `_server` is a private Next.js folder: it is never a route.
import { auth } from '../../src/server/auth.js';
import { compose } from '../../src/server/composition.js';
import { db } from '../../src/server/db.js';
import { betterAuthSessions } from '../../src/server/sessions.js';
import { loadConfig } from '../../src/shared-kernel/config.js';
import { serveTrpc } from '../../src/server/trpc/init.js';
import type { Clock } from '../../src/shared-kernel/ports.js';
import { createLogger } from '../../src/shared-kernel/regulated.js';

export const systemClock: Clock = { now: () => new Date() };
const log = createLogger((line) => console.error(line));

let app: ReturnType<typeof compose> | undefined;

/** The composed application, built once per process. */
export function application(): ReturnType<typeof compose> {
  app ??= compose({ pool: db().pool, clock: systemClock, sessions: betterAuthSessions(auth()), ipHmacKey: loadConfig().ipHmacKey });
  return app;
}

/** Serves one tRPC request through the wired router, with batching off (R-9, in serveTrpc). */
export function handleTrpc(req: Request): Promise<Response> {
  const a = application();
  return serveTrpc(req, a.router, systemClock, { identity: a.identity, ipHmac: a.ipHmac, log });
}
