// Start-up configuration: every environment variable the app reads, validated once. A missing or
// malformed variable stops the app with its name (.env.example documents each one).
import { z } from 'zod';

const Env = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
  // S-7: the HMAC key of every stored caller IP (ARCHITECTURE §14, decision log Impl-1 #34).
  IP_HMAC_KEY: z.string().refine((key) => Buffer.byteLength(key, 'utf8') >= 32, 'must be at least 32 bytes'),
});

export type AppConfig = Readonly<{
  databaseUrl: string;
  auth: { secret: string; baseUrl: string };
  ipHmacKey: string;
}>;

/** Parses `env` (default: `process.env`); throws one error listing every invalid variable. */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid configuration (see .env.example):\n  ${problems.join('\n  ')}`);
  }
  const e = parsed.data;
  return { databaseUrl: e.DATABASE_URL, auth: { secret: e.BETTER_AUTH_SECRET, baseUrl: e.BETTER_AUTH_URL }, ipHmacKey: e.IP_HMAC_KEY };
}
