// The scheduled job routes, `POST /api/jobs/<job>?trigger=…` (Story 1.6; src/server/jobs.ts). Only
// POST is exported, so any other method is Next.js's 405.
import { handleJob } from '../../../_server/runtime.js';

export const dynamic = 'force-dynamic';

export function POST(req: Request): Promise<Response> {
  return handleJob(req);
}
