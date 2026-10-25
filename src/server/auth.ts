// Better Auth over the generated Prisma model (decision log #6), with the R-12 settings: ids come
// from the IdGenerator port (cuid2, so `"User".id` passes `tezg_is_cuid`), and IP tracking is off
// (`"Session"` has no ipAddress column). Its routes (`/api/auth/*`) and the consent fields of
// sign-up are mounted by the identity stories; the scaffold only builds the instance.
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { betterAuth } from 'better-auth';
import { loadConfig } from '../shared-kernel/config.js';
import { CuidIds } from '../shared-kernel/infra/cuid-ids.js';
import { db } from './db.js';

function createAuth() {
  const config = loadConfig();
  const ids = new CuidIds();
  return betterAuth({
    secret: config.auth.secret,
    baseURL: config.auth.baseUrl,
    database: prismaAdapter(db().prisma, { provider: 'postgresql' }),
    advanced: {
      database: { generateId: () => ids.next() },
      ipAddress: { disableIpTracking: true },
    },
    telemetry: { enabled: false },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function auth(): ReturnType<typeof createAuth> {
  instance ??= createAuth();
  return instance;
}
