import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const valid = {
  DATABASE_URL: 'postgresql://tezg:tezg@127.0.0.1:55432/tezg_dev',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  IP_HMAC_KEY: 'k'.repeat(32),
};

describe('loadConfig', () => {
  it('maps a valid environment to the app configuration', () => {
    expect(loadConfig(valid)).toEqual({
      databaseUrl: valid.DATABASE_URL,
      auth: { secret: valid.BETTER_AUTH_SECRET, baseUrl: valid.BETTER_AUTH_URL },
      ipHmacKey: valid.IP_HMAC_KEY,
    });
  });

  it('names every missing or malformed variable in one error', () => {
    const bad = { DATABASE_URL: 'mysql://db/tezg', BETTER_AUTH_SECRET: 'short', IP_HMAC_KEY: 'short' };
    expect(() => loadConfig(bad)).toThrow(/Invalid configuration[\s\S]*DATABASE_URL[\s\S]*BETTER_AUTH_SECRET[\s\S]*BETTER_AUTH_URL[\s\S]*IP_HMAC_KEY/);
  });

  it('accepts the postgres:// scheme as well as postgresql://', () => {
    expect(loadConfig({ ...valid, DATABASE_URL: 'postgres://u:p@db:5432/x' }).databaseUrl).toBe('postgres://u:p@db:5432/x');
  });

  it('counts IP_HMAC_KEY in bytes, not characters', () => {
    expect(() => loadConfig({ ...valid, IP_HMAC_KEY: 'ñ'.repeat(15) })).toThrow(/IP_HMAC_KEY/);
    expect(loadConfig({ ...valid, IP_HMAC_KEY: 'ñ'.repeat(16) }).ipHmacKey).toBe('ñ'.repeat(16));
  });
});
