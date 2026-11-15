// Liveness: the process serves requests. It touches nothing else.
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json({ status: 'ok' });
}
