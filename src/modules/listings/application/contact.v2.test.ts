// ContactServiceV2.generateContactMessage (MSG-2) against Postgres: the edges the ATDD tests leave out — the buyer's
// refusal for an incomplete seller profile (decision log Impl-1 #34), the trade path, the repeat that bypasses the
// limit, the per-seller and per-IP windows with their retry times, and the window edges (now − w, now].
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { at, catalogEntry, DAY, fake, HOUR, id, individualSeller, ins, listing, rows, unit, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { CatServiceV2 } from '../../catalog/index.js';
import { IdnServiceV2 } from '../../identity/index.js';
import type { CatalogFeedSource, FxRateSource } from '../../../shared-kernel/external.js';
import type { IdentityForContact } from '../ports/contact.v2.js';
import { ContactServiceV2 } from './contact.v2.js';

const db = useTestDatabase();
const IP = 'c'.repeat(64);

function contactService(identity?: IdentityForContact) {
  const w = wiring(db);
  return new ContactServiceV2({ ...w, catalog: new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) }), identity: identity ?? new IdnServiceV2(w) });
}
async function seed(listings = 1, sellerId = id('valentina')) {
  await user(db, { id: id('camila') }).catch(() => undefined);
  await individualSeller(db, sellerId).catch(() => undefined);
  await catalogEntry(db, id('char')).catch(() => undefined);
  await unit(db, { id: id(`u${sellerId.slice(0, 6)}`), sellerId, catalogEntryId: id('char'), quantity: 1 });
  for (let k = 0; k < listings; k++) await listing(db, { id: id(`l${sellerId.slice(0, 4)}${k}`), sellerId, unitId: id(`u${sellerId.slice(0, 6)}`), sellerKind: 'individual' });
}
const lid = (k = 0, sellerId = id('valentina')) => id(`l${sellerId.slice(0, 4)}${k}`);
const log = (o: { n: string; listingId: string; sellerId?: string; ipHmac?: string; counted?: boolean; createdAt: string }) =>
  ins(db, 'ContactRequestLog', { id: id(o.n), requesterId: id('camila'), listingId: o.listingId, sellerId: o.sellerId ?? id('valentina'), ipHmac: o.ipHmac ?? 'b'.repeat(64), kind: 'purchase', counted: o.counted ?? true, createdAt: o.createdAt }, 'none');
const purchase = (listingId: string, svc = contactService(), ipHmac: string | null = IP) => svc.generateContactMessage({ kind: 'purchase', listingId, requesterId: id('camila'), tradeSummary: null, ipHmac });

describe('ContactServiceV2.generateContactMessage (MSG-2)', () => {
  it('with the real identity and catalog it names the seller, the card and its condition', async () => {
    await seed();
    const result = await purchase(lid());
    expect(result.text).toMatch(/^¡Hola Vendedor .+! Vi tu .+ \(NM\) en TEZG por \$45\.000 COP\./);
    expect(result.requesterDisplayName).toBe(id('camila'));
    expect(result.decision).toMatchObject({ outcome: 'allowed', reasonCode: 'ContactMessageGenerated', citations: [{ rule: 'FR-MSG-2', inputs: { truncated: false, truncationSteps: '' } }] });
  });

  it('an incomplete seller profile is the buyer-facing ListingNotFound, and the counted row rolls back (decision log Impl-1 #34)', async () => {
    await seed();
    const identity = new IdnServiceV2(wiring(db));
    const incomplete = fake<IdentityForContact>('identity', {
      getContactCard: async () => identity.getContactCard({ sellerId: id('nobody') }),
      getDisplayNames: async () => ({ names: [] }),
    });
    const error = await caught(() => purchase(lid(), contactService(incomplete)));
    expect(codeOf(error)).toBe('ListingNotFound');
    expect(citedInputs(error)).toEqual({ sellerContact: false });
    expect(await rows(db, 'ContactRequestLog')).toHaveLength(0);
  });

  it('a trade handoff skips the limiter and writes no row (EC-37)', async () => {
    await seed();
    for (let k = 0; k < 30; k++) await log({ n: `t${k}`, listingId: id(`o${k}`), sellerId: id(`x${k}`), createdAt: at(-60_000) });
    const result = await contactService().generateContactMessage({ kind: 'trade', listingId: lid(), requesterId: id('camila'), tradeSummary: { offeredItems: [{ name: 'Pikachu', condition: 'NM', qty: 1 }], cashCop: 0 }, ipHmac: null });
    expect(result.text).toContain('Ofrezco 1× Pikachu (NM).');
    expect(await rows(db, 'ContactRequestLog')).toHaveLength(30);
  });

  it('a repeat for the same listing within 60 min is logged uncounted and never refused, even past the hourly limit (EC-36)', async () => {
    await seed();
    for (let k = 0; k < 29; k++) await log({ n: `r${k}`, listingId: id(`o${k}`), sellerId: id(`x${k}`), createdAt: at(-30 * 60_000) });
    await log({ n: 'same', listingId: lid(), createdAt: at(-59 * 60_000) });
    await purchase(lid());
    expect(await rows(db, 'ContactRequestLog', `"listingId" = $1 ORDER BY "createdAt"`, [lid()])).toMatchObject([{ counted: true }, { counted: false }]);
  });

  it('the 11th contact to one seller in 24 h is ContactRateLimited citing the oldest row + 24 h', async () => {
    await seed(11);
    for (let k = 0; k < 10; k++) await log({ n: `s${k}`, listingId: lid(k), createdAt: at(-(20 - k) * HOUR) });
    const error = await caught(() => purchase(lid(10)));
    expect(codeOf(error)).toBe('ContactRateLimited');
    expect(citedInputs(error)).toEqual({ retryAt: at(-20 * HOUR + DAY), window: 'requesterSellerDay', limit: 10 });
  });

  it('the 61st contact from one IP in an hour is refused; a null ipHmac skips the IP window', async () => {
    await seed();
    for (let k = 0; k < 60; k++) {
      await ins(db, 'ContactRequestLog', { id: id(`ip${k}`), requesterId: id(`other${k}`), listingId: id(`o${k}`), sellerId: id(`s${k}`), ipHmac: IP, kind: 'purchase', counted: true, createdAt: at(-30 * 60_000) }, 'none');
    }
    const error = await caught(() => purchase(lid()));
    expect(citedInputs(error)).toMatchObject({ window: 'ipHour', limit: 60, retryAt: at(30 * 60_000) });
    await purchase(lid(), contactService(), null);
    expect(await rows(db, 'ContactRequestLog', `"requesterId" = $1`, [id('camila')])).toMatchObject([{ ipHmac: null, counted: true }]);
  });

  it('the windows are (now − w, now]: a row exactly an hour old no longer counts, and one stamped now does', async () => {
    await seed();
    for (let k = 0; k < 29; k++) await log({ n: `w${k}`, listingId: id(`o${k}`), sellerId: id(`x${k}`), createdAt: at(-HOUR) });
    await log({ n: 'now', listingId: id('onow'), sellerId: id('xnow'), createdAt: at(0) });
    await purchase(lid());
    for (let k = 29; k < 58; k++) await log({ n: `w${k}`, listingId: id(`o${k}`), sellerId: id(`x${k}`), createdAt: at(0) });
    expect(codeOf(await caught(() => purchase(lid(0, id('valentina')), contactService())))).not.toBe('ContactRateLimited'); // a repeat
    await seed(1, id('zeta'));
    expect(codeOf(await caught(() => purchase(lid(0, id('zeta')))))).toBe('ContactRateLimited');
  });
});
