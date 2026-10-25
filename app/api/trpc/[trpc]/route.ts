// tRPC over HTTP. Batching is off: one procedure per request (R-9).
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '../../../../src/server/trpc/init.js';

function handler(req: Request): Promise<Response> {
  return fetchRequestHandler({ endpoint: '/api/trpc', req, router: appRouter, createContext: () => createContext(req), allowBatching: false });
}

export { handler as GET, handler as POST };
