// Readiness: 200 when the database answers and its migrations are current, 503 otherwise.
import { db } from '../../../../src/server/db.js';
import { readiness } from '../../../../src/server/health.js';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const result = await readiness(db().pool);
  return Response.json(result, { status: result.ready ? 200 : 503 });
}
