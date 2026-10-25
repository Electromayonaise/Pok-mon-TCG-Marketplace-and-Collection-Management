// Better Auth's routes under /api/auth/* (S-FR-IDN-7): get-session and sign-out over the
// `"Session"` table. The instance is built on the first request, so `next build` reads no
// configuration. Sign-up and the sign-in methods are not configured in the Impl-1 cut (auth.ts).
import { auth } from '../../../../src/server/auth.js';

function handler(req: Request): Promise<Response> {
  return auth().handler(req);
}

export { handler as GET, handler as POST };
