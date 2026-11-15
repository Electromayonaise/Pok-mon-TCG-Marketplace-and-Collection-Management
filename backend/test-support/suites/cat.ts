// The shared Given steps of the CatServiceV2 integration tests (src/modules/catalog/application/cat.v2-*.test.ts),
// moved verbatim out of one 369-line file by the Impl-2 test review (HIGH-5). Call it once at the top of a test file.
import { CatServiceV2 } from '../../src/modules/catalog/index.js';
import type { CatalogFeedSource, FeedSourceRow } from '../../src/shared-kernel/external.js';
import { useTestDatabase } from '../db.js';
import { FixtureFeedSource, FixtureFxRateSource } from '../simulated/index.js';
import { admin, at, catalogSet, feedRun, HOUR, id, wiring } from '../solu2/fixtures.js';

export function useCatSuite() {
  const db = useTestDatabase();

  function setup(feed: CatalogFeedSource = new FixtureFeedSource({ current: [], previous: [], defects: [], renamed: [] }), fx = new FixtureFxRateSource([])) {
    const w = wiring(db);
    return { w, fx, cat: new CatServiceV2({ ...w, feed, fx }) };
  }
  const card = (n: number, o: FeedSourceRow = {}): FeedSourceRow => ({ externalKey: `sv1-${n}`, setCode: 'SV1', number: String(n), name: `Carta ${n}`, kind: 'card', eraCode: 'SV', ...o });
  const feedOf = (current: FeedSourceRow[]) => new FixtureFeedSource({ current, previous: [], defects: [], renamed: [] });
  async function given(): Promise<void> {
    await admin(db);
    await catalogSet(db, { id: id('setsv1'), code: 'SV1', name: 'Escarlata y Púrpura' });
    await feedRun(db, id('run1'), { status: 'Running', startedAt: at(-HOUR) });
  }
  const continueRun = (cat: CatServiceV2) => cat.continueFeedRun({ actorId: id('admin'), runId: id('run1') });

  return { db, setup, card, feedOf, given, continueRun };
}
