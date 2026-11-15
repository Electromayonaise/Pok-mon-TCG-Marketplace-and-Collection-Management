// Better Auth's routes behind the AD-IDN-3 guard (Story 2.6; src/server/auth-routes.ts): sign-up
// checks consent and the sign-up limit, sign-in the account and IP limits.
import { handleAuth } from '../../../_server/runtime.js';

export const dynamic = 'force-dynamic';

export { handleAuth as GET, handleAuth as POST };
