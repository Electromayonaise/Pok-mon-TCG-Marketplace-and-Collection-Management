// The TRM breaker's transition as AD-SYS-5 rule 1 states it (architecture audit F2, decision log Impl-2 #34): one
// conditional UPDATE on the from-state and version read under the row lock (migration 003), which bumps the version.
// A transition that moves 0 rows is raised and rolls back, never ignored. The races of AD-CAT-3 rule 7 stay in
// atdd/cat_breaker.test.ts ([S-FR-CAT-8.breaker.C1], [S-FR-CAT-8.breaker.C2]).
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught } from '../../../../test-support/errors.js';
import { FixtureFeedSource, FixtureFxRateSource } from '../../../../test-support/simulated/index.js';
import { rows, T0, wiring } from '../../../../test-support/solu2/fixtures.js';
import { UnexpectedError } from '../../../shared-kernel/errors.js';
import { CLOSED_BREAKER } from '../domain/breaker.js';
import { PgCatRepository } from '../infra/pg.js';
import { CatServiceV2 } from './cat.v2.js';

const db = useTestDatabase();
const RATES = [{ valor: '4130.00', validFrom: '2026-10-01', validTo: '2026-10-01' }];
const breakerRow = () => db.query(`SELECT state, "consecutiveFailures", version FROM "FxSourceBreaker"`);

describe('PgCatRepository.saveFxSourceBreaker (AD-SYS-5 rule 1)', () => {
  it('moves the row only from the state and version it was locked in, and bumps the version; a stale state or version moves 0 rows', async () => {
    const repo = new PgCatRepository();
    const oneFailure = { ...CLOSED_BREAKER, consecutiveFailures: 1 };
    const moved = await db.transactions.run(async (tx) => {
      const locked = await repo.lockFxSourceBreaker(tx, T0);
      expect(locked).toEqual({ breaker: CLOSED_BREAKER, version: 0 });
      return repo.saveFxSourceBreaker(tx, locked, oneFailure, T0);
    });
    expect([moved, await breakerRow()]).toEqual([true, [{ state: 'closed', consecutiveFailures: 1, version: 1 }]]);
    const stale = await db.transactions.run(async (tx) => {
      await repo.lockFxSourceBreaker(tx, T0);
      return [
        await repo.saveFxSourceBreaker(tx, { breaker: oneFailure, version: 0 }, CLOSED_BREAKER, T0),
        await repo.saveFxSourceBreaker(tx, { breaker: { ...oneFailure, state: 'open' }, version: 1 }, CLOSED_BREAKER, T0),
      ];
    });
    expect([stale, await breakerRow()]).toEqual([[false, false], [{ state: 'closed', consecutiveFailures: 1, version: 1 }]]);
  });
});

describe('CatServiceV2.fetchTrm when a breaker transition moves 0 rows (architecture audit F2)', () => {
  it('raises Unexpected naming the conflict, and the failure count it would have stored rolls back', async () => {
    const w = wiring(db);
    const fx = new FixtureFxRateSource(RATES);
    fx.fault = 'down';
    // The lock reports a version the row does not have, so the failure's transition matches no row.
    // (Object.assign, not a spread: TypeScript drops the methods of a class-typed spread; oneRepository's object is plain.)
    const repo = Object.assign({}, w.repo, {
      lockFxSourceBreaker: async (...args: Parameters<typeof w.repo.lockFxSourceBreaker>) => {
        const locked = await w.repo.lockFxSourceBreaker(...args);
        return { ...locked, version: locked.version + 7 };
      },
    });
    const cat = new CatServiceV2({ ...w, repo, feed: new FixtureFeedSource({ current: [], previous: [], defects: [], renamed: [] }), fx });
    const error = await caught(() => cat.fetchTrm({ trigger: 'tick' }));
    expect(error).toBeInstanceOf(UnexpectedError);
    expect((error as Error).message).toBe('FxSourceBreaker conflict: the row left state closed version 7 while locked');
    expect(await breakerRow()).toEqual([{ state: 'closed', consecutiveFailures: 0, version: 0 }]);
    expect(await rows(db, 'FxRate')).toEqual([]);
  });

  it('with the real lock, three failures in a row bump the version once per transition and open the breaker', async () => {
    const w = wiring(db);
    const fx = new FixtureFxRateSource(RATES);
    fx.fault = 'down';
    const cat = new CatServiceV2({ ...w, feed: new FixtureFeedSource({ current: [], previous: [], defects: [], renamed: [] }), fx });
    for (let i = 0; i < 3; i++) expect((await cat.fetchTrm({ trigger: 'tick' })).outcome).toBe('sourceUnavailable');
    expect(await breakerRow()).toEqual([{ state: 'open', consecutiveFailures: 3, version: 3 }]);
  });
});
