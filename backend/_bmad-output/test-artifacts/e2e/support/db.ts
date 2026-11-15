// What every E2E seed shares (Stories 9.6 and 11.5): fixed ids, one connection to the `tezg_e2e` database the
// Playwright web server migrated (playwright.config.ts), and an account that signs in through the real
// `/ingresar` route. The E2E suite imports no Vitest fixture; these helpers are its own. The database is shared
// across specs (workers = 1), so each seed deletes and re-inserts exactly the rows its journey reads.
import { hashPassword } from 'better-auth/crypto';
import pg from 'pg';
import { E2E_DATABASE_URL } from '../../../../playwright.config.js';

/** A readable, cuid-shaped fixed id (`^[a-z][0-9a-z]{23}$`), as test-support/ids.ts makes them. */
export const fixedId = (name: string) => `${name}x`.padEnd(24, '0');

/** The instant every seeded row is stamped with. */
export const T0 = '2026-10-12T14:00:00.000Z';

export async function withDb<T>(work: (db: pg.Client) => Promise<T>): Promise<T> {
  const db = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await db.connect();
  try {
    return await work(db);
  } finally {
    await db.end();
  }
}

export interface Account { id: string; email: string; password: string; name: string }

/** Removes the accounts' sessions, credentials and users, and the sign-in throttle's rows (AD-IDN-3 counts across runs). */
export async function removeAccounts(db: pg.Client, userIds: string[]): Promise<void> {
  await db.query(`DELETE FROM "Session" WHERE "userId" = ANY($1)`, [userIds]);
  await db.query(`DELETE FROM "Account" WHERE "userId" = ANY($1)`, [userIds]);
  await db.query(`DELETE FROM "User" WHERE id = ANY($1)`, [userIds]);
  await db.query(`DELETE FROM "AuthThrottleEvent"`);
}

/** A verified user who signs in with `password`; the hash is Better Auth's own, so the real sign-in route verifies it. */
export async function insertAccount(db: pg.Client, a: Account, o: { sellerTrack?: 'business' | 'individual' | null } = {}): Promise<void> {
  await db.query(`INSERT INTO "User" (id, name, email, "emailVerified", "isAdmin", "sellerTrack", "signupConsentAt", "signupConsentVersion", "createdAt", "updatedAt") VALUES ($1, $2, $3, true, false, $4, $5, 'privacy-v1', $5, $5)`,
    [a.id, a.name, a.email, o.sellerTrack ?? null, T0]);
  await db.query(`INSERT INTO "Account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt") VALUES ($1, $2, $2, 'credential', $3, $4, $4)`,
    [fixedId(`${a.id.slice(0, 12)}acct`), a.id, await hashPassword(a.password), T0]);
}

/** A user with no password (a shop on the other side of a conversation, say), who never signs in. */
export async function insertUser(db: pg.Client, u: { id: string; name: string; email: string; sellerTrack?: 'business' | 'individual' | null }): Promise<void> {
  await db.query(`INSERT INTO "User" (id, name, email, "emailVerified", "isAdmin", "sellerTrack", "signupConsentAt", "signupConsentVersion", "createdAt", "updatedAt") VALUES ($1, $2, $3, true, false, $4, $5, 'privacy-v1', $5, $5)`,
    [u.id, u.name, u.email, u.sellerTrack ?? null, T0]);
}
