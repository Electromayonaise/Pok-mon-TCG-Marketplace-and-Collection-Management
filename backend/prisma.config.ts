// Prisma 7 configuration. The model is generated from the migrated database (`npm run db:pull`,
// R-8): the SQL DDL stays the schema source of truth, and Prisma runs no migrations of its own.
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer reads .env by itself; a missing file is fine (Docker sets the variables).
try {
  process.loadEnvFile();
} catch {
  // no .env
}

// `prisma generate` needs no database, so a clean `npm ci` (postinstall) works without one;
// `db:pull` sets DATABASE_URL to its scratch database.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  ...(process.env.DATABASE_URL ? { datasource: { url: process.env.DATABASE_URL } } : {}),
});
