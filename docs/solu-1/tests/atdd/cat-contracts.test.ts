// Solu-1 ATDD — CAT contracts (contracts.md §3) and the catalog admin guard. RED until implemented.
import { beforeEach, describe, expect, it } from 'vitest';
import { createCatModule } from '../../../../src/modules/catalog/index.js';
import { createAdminGuard } from '../../../../src/server/trpc/admin-guard.js';
import { DomainError } from '../../../../src/shared-kernel/errors.js';
import { DAY, HOUR } from '../../../../test-support/clock.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';
import { wiring, type Wiring } from '../../../../test-support/wiring.js';
import type { ValidFeedRowDTO } from '../../../../src/modules/catalog/index.js';

const db = useTestDatabase();
let w: Wiring;
beforeEach(() => {
  w = wiring(db);
});
const cat = () => createCatModule(w);

describe('Solu-1 ATDD: CAT — assertCatalogAdmin (guard in adminProcedure, FR-IDN-7, review E-23)', () => {
  const adminOnly = new DomainError('AdminOnly', [{ rule: 'FR-IDN-7', inputs: { userId: id('camila') } }]);
  const identity = { requireAdmin: async (actorId: string) => { if (actorId !== id('sebastian')) throw adminOnly; } };

  it('RED: an admin passes with zero writes', async () => {
    const before = await db.counts(['FeedIngestionRun']);
    await expect(createAdminGuard(identity).assertCatalogAdmin({ actorId: id('sebastian') })).resolves.toBeUndefined();
    expect(await db.counts(['FeedIngestionRun'])).toEqual(before);
  });

  it("RED: a non-admin gets identity's AdminOnly (403) propagated unchanged — the same error, not a copy", async () => {
    const error = await caught(() => createAdminGuard(identity).assertCatalogAdmin({ actorId: id('camila') }));
    expect(codeOf(error)).toBe('AdminOnly');
    expect(error).toBe(adminOnly);
    expect(httpOf(error)).toBe(403);
  });
});

describe('Solu-1 ATDD: CAT — startFeedRun (contended mutation, AD-CAT-1 rule 1)', () => {
  it('RED: starts one Running run at the virtual instant', async () => {
    const result = await cat().startFeedRun({ actorId: id('sebastian') });
    expect(result.startedAt).toBe(w.clock.iso());
    expect(await db.query(`SELECT id, status, cursor FROM "FeedIngestionRun"`)).toEqual([{ id: result.runId, status: 'Running', cursor: 0 }]);
  });

  it('RED: a live Running run refuses a second start with FeedRunInProgress (409) citing it, and adds no row', async () => {
    await seed.feedRun(db, { id: id('runlive'), status: 'Running', startedAt: w.clock.iso() });
    const error = await caught(() => cat().startFeedRun({ actorId: id('sebastian') }));
    expect(codeOf(error)).toBe('FeedRunInProgress');
    expect(httpOf(error)).toBe(409);
    expect(citedInputs(error)).toMatchObject({ runId: id('runlive') });
    expect(await db.counts(['FeedIngestionRun'])).toEqual({ FeedIngestionRun: 1 });
  });

  it('RED: a run abandoned for more than 24 h is failed and no longer blocks a new start', async () => {
    await seed.feedRun(db, { id: id('runold'), status: 'Running', startedAt: w.clock.iso() });
    w.clock.advance(24 * HOUR + 1000);
    const result = await cat().startFeedRun({ actorId: id('sebastian') });
    expect(await db.query(`SELECT id, status FROM "FeedIngestionRun" ORDER BY "startedAt"`)).toEqual([
      { id: id('runold'), status: 'Failed' },
      { id: result.runId, status: 'Running' },
    ]);
  });

  it('RED: five simultaneous starts — exactly one Running run, four explained refusals', async () => {
    const outcome = await race(5, () => cat().startFeedRun({ actorId: id('sebastian') }));
    expect(outcome.rejected.map(codeOf)).toEqual(['FeedRunInProgress', 'FeedRunInProgress', 'FeedRunInProgress', 'FeedRunInProgress']);
    expect(outcome.fulfilled).toHaveLength(1);
    expect(await db.query(`SELECT count(*)::int AS n FROM "FeedIngestionRun" WHERE status = 'Running'`)).toEqual([{ n: 1 }]);
  });
});

describe('Solu-1 ATDD: CAT — upsertCatalogEntry (supplementary contended mutation, AD-CAT-1 rule 5)', () => {
  const row = (o: Partial<ValidFeedRowDTO> = {}): ValidFeedRowDTO => ({
    externalKey: 'sv1-025', setCode: 'SV1', number: '025/198', name: 'Pikachu', kind: 'card', eraCode: 'SV',
    pokemon: 'Pikachu', colour: 'yellow', style: 'holo', artist: 'Atsuko Nishida', imageUrl: null, ...o,
  });
  const upsert = (r: ValidFeedRowDTO) => db.transactions.run((tx) => cat().upsertCatalogEntry(tx, { row: r, runId: id('runlive') }));

  it('RED: a new externalKey creates one entry with a generated id', async () => {
    await seed.catalogSet(db);
    await seed.feedRun(db, { id: id('runlive'), status: 'Running' });
    const result = await upsert(row());
    expect(result).toMatchObject({ outcome: 'created', changedFields: [] });
    expect(await db.query(`SELECT id, name FROM "CatalogEntry" WHERE "externalKey" = 'sv1-025'`)).toEqual([{ id: result.catalogEntryId, name: 'Pikachu' }]);
  });

  it('RED (mandatory edge case): a renamed card keeps its catalogEntryId and writes one revision', async () => {
    const setId = await seed.catalogSet(db);
    await seed.feedRun(db, { id: id('runlive'), status: 'Running' });
    await seed.catalogEntry(db, { id: id('pikachu'), setId, externalKey: 'sv1-025', name: 'Pikachu' });
    const result = await upsert(row({ name: 'Pikachu ex' }));
    expect(result).toEqual({ catalogEntryId: id('pikachu'), outcome: 'updated', changedFields: ['name'] });
    expect(await db.query(`SELECT id, name, kind FROM "CatalogEntry"`)).toEqual([{ id: id('pikachu'), name: 'Pikachu ex', kind: 'card' }]);
    expect(await db.query(`SELECT "catalogEntryId", "changedFields" FROM "CatalogEntryRevision"`)).toEqual([{ catalogEntryId: id('pikachu'), changedFields: ['name'] }]);
  });

  it('RED: re-running an identical row is unchanged and writes no revision', async () => {
    const setId = await seed.catalogSet(db);
    await seed.feedRun(db, { id: id('runlive'), status: 'Running' });
    await seed.catalogEntry(db, { id: id('pikachu'), setId, externalKey: 'sv1-025' });
    const result = await upsert(row());
    expect(result).toEqual({ catalogEntryId: id('pikachu'), outcome: 'unchanged', changedFields: [] });
    expect(await db.counts(['CatalogEntry', 'CatalogEntryRevision'])).toEqual({ CatalogEntry: 1, CatalogEntryRevision: 0 });
  });
});

describe('Solu-1 ATDD: CAT — getReferencePriceAsOf (resolver, FR-CAT-5, FR-CAT-7)', () => {
  async function priced() {
    const setId = await seed.catalogSet(db);
    await seed.catalogEntry(db, { id: id('pikachu'), setId });
    await seed.feedRun(db, { id: id('runone') });
  }

  it('RED: returns the latest observation at or before asOf, verbatim, fresh within 36 h', async () => {
    await priced();
    await seed.observation(db, { id: id('obsold'), catalogEntryId: id('pikachu'), runId: id('runone'), observedAt: '2026-09-29T12:00:00.000Z', cop: 40_000 });
    await seed.observation(db, { id: id('obsnew'), catalogEntryId: id('pikachu'), runId: id('runone'), observedAt: '2026-10-01T12:00:00.000Z', cop: 45_000 });
    await seed.observation(db, { id: id('obsfuture'), catalogEntryId: id('pikachu'), runId: id('runone'), observedAt: '2026-10-02T12:00:00.000Z', cop: 99_000 });
    expect(await cat().getReferencePriceAsOf({ catalogEntryId: id('pikachu'), asOf: '2026-10-01T15:00:00.000Z' })).toEqual({
      usdCents: null, cop: 45_000, observedAt: '2026-10-01T12:00:00.000Z', source: 'fixture-feed', copDerivation: 'sourceNative', fxRateDate: null, stale: false,
    });
  });

  it('RED: an observation older than 36 h at asOf is labelled stale, never blanked', async () => {
    await priced();
    await seed.observation(db, { id: id('obsold'), catalogEntryId: id('pikachu'), runId: id('runone'), observedAt: '2026-09-29T12:00:00.000Z', cop: 40_000 });
    const price = await cat().getReferencePriceAsOf({ catalogEntryId: id('pikachu'), asOf: new Date(Date.parse('2026-09-29T12:00:00.000Z') + 40 * HOUR).toISOString() });
    expect(price).toMatchObject({ cop: 40_000, stale: true });
  });

  it('RED: two sources at the same instant resolve deterministically by source ASC (review F-11)', async () => {
    await priced();
    await seed.observation(db, { id: id('obsb'), catalogEntryId: id('pikachu'), runId: id('runone'), observedAt: '2026-10-01T12:00:00.000Z', cop: 46_000, source: 'b-source' });
    await seed.observation(db, { id: id('obsa'), catalogEntryId: id('pikachu'), runId: id('runone'), observedAt: '2026-10-01T12:00:00.000Z', cop: 45_500, source: 'a-source' });
    expect(await cat().getReferencePriceAsOf({ catalogEntryId: id('pikachu'), asOf: '2026-10-01T15:00:00.000Z' })).toMatchObject({ source: 'a-source', cop: 45_500 });
  });

  it('RED: no observation at or before asOf, or an unknown entry, resolves silently to null', async () => {
    await priced();
    await seed.observation(db, { id: id('obsfuture'), catalogEntryId: id('pikachu'), runId: id('runone'), observedAt: '2026-10-05T12:00:00.000Z', cop: 45_000 });
    expect(await cat().getReferencePriceAsOf({ catalogEntryId: id('pikachu'), asOf: '2026-10-01T15:00:00.000Z' })).toBeNull();
    expect(await cat().getReferencePriceAsOf({ catalogEntryId: id('ghost'), asOf: new Date(Date.parse('2026-10-01T15:00:00.000Z') + DAY).toISOString() })).toBeNull();
  });
});
