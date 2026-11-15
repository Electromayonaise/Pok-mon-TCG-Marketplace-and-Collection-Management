// Connection settings for the Docker Compose test database (docker-compose.yml).
export const PG = {
  host: process.env.TEZG_PG_HOST ?? '127.0.0.1',
  port: Number(process.env.TEZG_PG_PORT ?? 55432),
  user: process.env.TEZG_PG_USER ?? 'tezg',
  password: process.env.TEZG_PG_PASSWORD ?? 'tezg',
  /** Maintenance database used to create templates and per-file databases. */
  adminDatabase: process.env.TEZG_PG_DB ?? 'tezg',
} as const;

declare module 'vitest' {
  export interface ProvidedContext {
    migrationsDir: string;
    templateDb: string;
  }
}
