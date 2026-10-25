// Better Auth over the generated Prisma model (decision log #6), with the R-12 settings: ids come
// from the IdGenerator port (cuid2, so `"User".id` passes `tezg_is_cuid`), and IP tracking is off
// (`"Session"` has no ipAddress column). app/api/auth/[...all] mounts its routes; identity reads
// sessions through it (sessions.ts, decision log Impl-1 #24). Sign-up with its consent fields and
// the sign-in methods are not configured yet: no story of the Impl-1 cut owns them.
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { betterAuth } from 'better-auth';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { loadConfig } from '../shared-kernel/config.js';
import { CuidIds } from '../shared-kernel/infra/cuid-ids.js';
import { db } from './db.js';

/** One Better Auth instance on `prisma`; tests build theirs on the test database. */
export function createAuth({ prisma, secret, baseUrl }: { prisma: PrismaClient; secret: string; baseUrl: string }) {
  const ids = new CuidIds();
  return betterAuth({
    secret,
    baseURL: baseUrl,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
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

let instance: Auth | undefined;

/** The app's instance, built on first use, so `next build` reads no configuration. */
export function auth(): Auth {
  instance ??= createAuth({ prisma: db().prisma, ...loadConfig().auth });
  return instance;
}
