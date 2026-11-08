import { describe, expect, it } from 'vitest';
import { loadConfig, PG_POOL_MAX } from './config.js';

const valid = {
  DATABASE_URL: 'postgresql://tezg:tezg@127.0.0.1:55432/tezg_dev',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  IP_HMAC_KEY: 'k'.repeat(32),
  JOBS_SECRET: 'j'.repeat(32),
};

describe('loadConfig', () => {
  it('maps a valid environment to the app configuration', () => {
    expect(loadConfig(valid)).toEqual({
      databaseUrl: valid.DATABASE_URL,
      auth: { secret: valid.BETTER_AUTH_SECRET, baseUrl: valid.BETTER_AUTH_URL },
      ipHmacKey: valid.IP_HMAC_KEY,
      jobsSecret: valid.JOBS_SECRET,
      pgPoolMax: 2,
    });
  });

  it('names every missing or malformed variable in one error', () => {
    const bad = { DATABASE_URL: 'mysql://db/tezg', BETTER_AUTH_SECRET: 'short', IP_HMAC_KEY: 'short', JOBS_SECRET: 'short' };
    expect(() => loadConfig(bad)).toThrow(/Invalid configuration[\s\S]*DATABASE_URL[\s\S]*BETTER_AUTH_SECRET[\s\S]*BETTER_AUTH_URL[\s\S]*IP_HMAC_KEY[\s\S]*JOBS_SECRET/);
  });

  it('accepts the postgres:// scheme as well as postgresql://', () => {
    expect(loadConfig({ ...valid, DATABASE_URL: 'postgres://u:p@db:5432/x' }).databaseUrl).toBe('postgres://u:p@db:5432/x');
  });

  it('counts IP_HMAC_KEY in bytes, not characters', () => {
    expect(() => loadConfig({ ...valid, IP_HMAC_KEY: 'ñ'.repeat(15) })).toThrow(/IP_HMAC_KEY/);
    expect(loadConfig({ ...valid, IP_HMAC_KEY: 'ñ'.repeat(16) }).ipHmacKey).toBe('ñ'.repeat(16));
  });

  // The runtime pool's size (decision log Impl-2 #38): 2 when unset, the minimum a job run needs; 2 to 50 when set.
  describe('TEZG_PG_POOL_MAX', () => {
    const poolMax = (value: string | undefined) => loadConfig({ ...valid, TEZG_PG_POOL_MAX: value }).pgPoolMax;

    it('defaults to 2, the minimum, when unset', () => {
      expect([poolMax(undefined), PG_POOL_MAX]).toEqual([2, { default: 2, min: 2, max: 50 }]);
    });

    it('accepts every whole number from the minimum 2 to the maximum 50', () => {
      expect([poolMax('2'), poolMax('10'), poolMax('50')]).toEqual([2, 10, 50]);
    });

    it.each([['1', 'below the minimum'], ['0', 'zero'], ['51', 'above the maximum'], ['', 'empty'], ['ten', 'not a number'], ['2.5', 'a fraction'], ['-3', 'negative'], [' 10', 'padded']])(
      'stops the app with the variable named when it is %j (%s)',
      (value) => {
        expect(() => poolMax(value)).toThrow(/Invalid configuration[\s\S]*TEZG_PG_POOL_MAX/);
      },
    );
  });
});
