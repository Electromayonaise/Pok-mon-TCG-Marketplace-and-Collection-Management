// tRPC over HTTP, and the composition root of its clock: the only system-clock adapter lives
// here, outside the `src/` wall-clock scan (AD-SYS-6). Batching is off (R-9, in serveTrpc).
import { serveTrpc } from '../../../../src/server/trpc/init.js';
import { appRouter } from '../../../../src/server/trpc/router.v2.js';
import type { Clock } from '../../../../src/shared-kernel/ports.js';

const systemClock: Clock = { now: () => new Date() };

function handler(req: Request): Promise<Response> {
  return serveTrpc(req, appRouter, systemClock);
}

export { handler as GET, handler as POST };
