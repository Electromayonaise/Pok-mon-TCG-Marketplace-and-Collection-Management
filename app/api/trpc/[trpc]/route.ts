// tRPC over HTTP, and the composition root of its clock and its log sink: the only system-clock
// adapter lives here, outside the `src/` wall-clock scan (AD-SYS-6), and `src/` writes to no
// console. Batching is off (R-9, in serveTrpc). The services, the identity gate and the wired
// router come from src/server/composition.ts, built on the first request so `next build` reads
// no configuration.
import { auth } from '../../../../src/server/auth.js';
import { compose } from '../../../../src/server/composition.js';
import { db } from '../../../../src/server/db.js';
import { betterAuthSessions } from '../../../../src/server/sessions.js';
import { loadConfig } from '../../../../src/shared-kernel/config.js';
import { serveTrpc } from '../../../../src/server/trpc/init.js';
import type { Clock } from '../../../../src/shared-kernel/ports.js';
import { createLogger } from '../../../../src/shared-kernel/regulated.js';

const systemClock: Clock = { now: () => new Date() };
const log = createLogger((line) => console.error(line));

let app: ReturnType<typeof compose> | undefined;

function handler(req: Request): Promise<Response> {
  app ??= compose({ pool: db().pool, clock: systemClock, sessions: betterAuthSessions(auth()), ipHmacKey: loadConfig().ipHmacKey });
  return serveTrpc(req, app.router, systemClock, { identity: app.identity, ipHmac: app.ipHmac, log });
}

export { handler as GET, handler as POST };
