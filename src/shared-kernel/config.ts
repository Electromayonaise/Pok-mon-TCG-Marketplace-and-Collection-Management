// Start-up configuration: every environment variable the app reads, validated once. A missing or
// malformed variable stops the app with its name (.env.example documents each one).
import { z } from 'zod';

/**
 * The runtime pg pool's size, `TEZG_PG_POOL_MAX` (AD-SYS-4 rules 7 and 9, ARCH §4; decision log Impl-2 #38).
 * - `min: 2`: a job run holds `job:<name>` on one connection for the whole run while its work runs on a second, so a
 *   smaller pool could never run a job. Serverless instances use this minimum, which is also the default.
 * - `max: 50`: a sane ceiling; a long-lived server sets 10 (docker-compose.yml, the k6 and E2E servers), and the
 *   Postgres behind it must allow every instance's pool at once.
 */
export const PG_POOL_MAX = { default: 2, min: 2, max: 50 } as const;

const Env = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
  // S-7: the HMAC key of every stored caller IP (ARCHITECTURE §14, decision log Impl-1 #34).
  IP_HMAC_KEY: z.string().refine((key) => Buffer.byteLength(key, 'utf8') >= 32, 'must be at least 32 bytes'),
  // S-9: the bearer of every `/api/jobs/*` call (Story 1.6, decision log Impl-2 #11).
  JOBS_SECRET: z.string().refine((key) => Buffer.byteLength(key, 'utf8') >= 32, 'must be at least 32 bytes'),
  // The runtime pool's `max` (decision log Impl-2 #38): a whole number from 2 to 50, 2 when unset.
  TEZG_PG_POOL_MAX: z.string().regex(/^[0-9]+$/, 'must be a whole number').transform(Number)
    .pipe(z.number().int().min(PG_POOL_MAX.min).max(PG_POOL_MAX.max)).optional(),
});

export type AppConfig = Readonly<{
  databaseUrl: string;
  auth: { secret: string; baseUrl: string };
  ipHmacKey: string;
  jobsSecret: string;
  pgPoolMax: number;
}>;

/** Parses `env` (default: `process.env`); throws one error listing every invalid variable. */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid configuration (see .env.example):\n  ${problems.join('\n  ')}`);
  }
  const e = parsed.data;
  return {
    databaseUrl: e.DATABASE_URL,
    auth: { secret: e.BETTER_AUTH_SECRET, baseUrl: e.BETTER_AUTH_URL },
    ipHmacKey: e.IP_HMAC_KEY,
    jobsSecret: e.JOBS_SECRET,
    pgPoolMax: e.TEZG_PG_POOL_MAX ?? PG_POOL_MAX.default,
  };
}
