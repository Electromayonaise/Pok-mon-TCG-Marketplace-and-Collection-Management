// Better Auth over the generated Prisma model (decision log #6), with the R-12 settings: ids come
// from the IdGenerator port (cuid2, so `"User".id` passes `tezg_is_cuid`), and IP tracking is off
// (`"Session"` has no ipAddress column). Identity reads sessions through it (sessions.ts, decision
// log Impl-1 #24). Story 2.6 (decision log Impl-2 #11, #12) adds email and password:
//   - an unverified user may sign in; `requireCanBuy` keeps buying, offering and writing gated
//     (AD-IDN-3 rule 2), and the verification link goes through the `EmailSender` port;
//   - the user insert carries `signupConsentAt` (the Clock) and `signupConsentVersion` (rule 1);
//     the guard in auth-routes.ts refuses a sign-up without consent before it gets here;
//   - Better Auth's own rate limiter is off: the AD-IDN-3 throttle in the guard replaces it.
// The app's instance is built in app/_server/runtime.ts, which owns the system clock (AD-SYS-6).
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { betterAuth } from 'better-auth';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { CURRENT_CONSENT_VERSION } from '../modules/identity/index.js';
import { NotImplementedError } from '../shared-kernel/errors.js';
import type { EmailSender } from '../shared-kernel/external.js';
import { CuidIds } from '../shared-kernel/infra/cuid-ids.js';
import type { Clock } from '../shared-kernel/ports.js';

/** No mail provider is chosen yet (launch checklist): a sign-up fails as NotImplemented, never silently. */
export const UNWIRED_EMAIL: EmailSender = {
  sendVerificationEmail: async () => { throw new NotImplementedError('email.sendVerificationEmail'); },
};

/** FR-IDN-7: the shortest password Better Auth accepts. */
export const MIN_PASSWORD_LENGTH = 10;

/**
 * R-12: `"Session"` has no ipAddress column, but Better Auth still sets the field (to '') on every
 * session write with IP tracking off, and a database hook cannot remove it (hook data is merged over
 * the original). The Prisma client given to the adapter drops it from every Session write instead.
 */
function withoutSessionIp(prisma: PrismaClient) {
  const strip = <A extends { data?: unknown }>(args: A): A => {
    if (args.data && typeof args.data === 'object') delete (args.data as { ipAddress?: unknown }).ipAddress;
    return args;
  };
  return prisma.$extends({
    query: {
      session: {
        create: ({ args, query }) => query(strip(args)),
        update: ({ args, query }) => query(strip(args)),
        updateMany: ({ args, query }) => query(strip(args)),
      },
    },
  });
}

/** One Better Auth instance on `prisma`; tests build theirs on the test database. */
export function createAuth({ prisma, secret, baseUrl, clock, email = UNWIRED_EMAIL }: { prisma: PrismaClient; secret: string; baseUrl: string; clock: Clock; email?: EmailSender }) {
  const ids = new CuidIds();
  return betterAuth({
    secret,
    baseURL: baseUrl,
    database: prismaAdapter(withoutSessionIp(prisma), { provider: 'postgresql' }),
    emailAndPassword: { enabled: true, requireEmailVerification: false, autoSignIn: false, minPasswordLength: MIN_PASSWORD_LENGTH },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => email.sendVerificationEmail({ to: user.email, url }),
    },
    user: {
      additionalFields: {
        signupConsentAt: { type: 'date', required: false, input: false },
        signupConsentVersion: { type: 'string', required: false, input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, signupConsentAt: clock.now(), signupConsentVersion: CURRENT_CONSENT_VERSION } }),
        },
      },
    },
    rateLimit: { enabled: false },
    advanced: {
      // The SQL migrations own the schema (decision log #6), not `npx auth generate`: `"Session"`
      // has no ipAddress (R-12) and `"Account"` none of the OAuth-only columns (idToken, scope,
      // refreshTokenExpiresAt), so Better Auth's runtime schema check would refuse every request.
      database: { generateId: () => ids.next(), validateSchema: false },
      ipAddress: { disableIpTracking: true },
    },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
