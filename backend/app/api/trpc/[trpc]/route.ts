// tRPC over HTTP. The composition root (system clock, log sink, wired router) is shared with the
// server-rendered pages in app/_server/runtime.ts (decision log Impl-2 #2).
import { handleTrpc } from '../../../_server/runtime.js';

function handler(req: Request): Promise<Response> {
  return handleTrpc(req);
}

export { handler as GET, handler as POST };
