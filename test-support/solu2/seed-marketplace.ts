// `seed_marketplace` — the PRD §3 Reference Seed Profile (docs/plan-2/planning/prd.md §3) on the
// Solu-2 schema, for the NFR benchmarks and any test that needs a realistic marketplace. It sets
// up Given state only and asserts nothing; docs/solu-2/test/fixtures/seed_marketplace.test.ts
// proves the profile. Deterministic: ids are `id()` names (SQL reproduces them with rpad), every
// instant is relative to T0, and no value is random. `scale` multiplies the catalog and its
// priced subset, the two dimensions the DSC and VAL benchmarks grow; every other count is fixed.
import type { TestDb } from '../db.js';
import { id } from '../ids.js';
import { admin, at, business, commissionAccount, commissionState, DAY, HOUR, individualSeller, ins, json, order, rejectionReason, T0, user } from './fixtures.js';

type Row = Record<string, unknown>;
type Q = Pick<TestDb, 'query'>;

/** Multi-row INSERT in parameter-safe chunks; `createdAt`/`updatedAt` default to T0 unless `stamps` says otherwise. */
async function bulk(db: Q, table: string, rows: Row[], stamps: 'both' | 'created' | 'none' = 'both'): Promise<void> {
  if (!rows.length) return;
  const full: Row[] = rows.map((r) => ({ ...(stamps !== 'none' ? { createdAt: T0 } : {}), ...(stamps === 'both' ? { updatedAt: T0 } : {}), ...r }));
  const cols = Object.keys(full[0]!);
  const per = Math.max(1, Math.floor(30_000 / cols.length));
  for (let s = 0; s < full.length; s += per) {
    const chunk = full.slice(s, s + per);
    const values = chunk.map((_, r) => `(${cols.map((__, c) => `$${r * cols.length + c + 1}`).join(', ')})`).join(', ');
    const params = chunk.flatMap((r) => cols.map((c) => { const v = r[c]; return v !== null && typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : v; }));
    await db.query(`INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES ${values}`, params);
  }
}

const ERAS = ['SV', 'SWSH', 'SM', 'XY', 'BW'] as const;
const CITIES = [
  { city: 'Bogotá', lat: 4.711, lng: -74.0721 },
  { city: 'Medellín', lat: 6.2442, lng: -75.5812 },
  { city: 'Cali', lat: 3.4516, lng: -76.532 },
  { city: 'Barranquilla', lat: 10.9685, lng: -74.7813 },
] as const;

/** Catalog layout for a given scale: sealed products first, then the 90-day priced block, then the unpriced tail. */
export function catalogLayout(scale = 1) {
  const entries = 10_000 * scale;
  return { entries, sets: 50, sealed: 300, pricedFrom: 300, priced: 2_000 * scale, unpriced: 300 * scale, historyDays: 90 };
}
export const entryId = (i: number) => id(`ce${i}`);
export const buyerId = (k: number) => id(`buyer${k}`);
export const individualId = (k: number) => id(`indiv${k}`);
export const businessId = (k: number) => id(`biz${k}`);

export interface SeedSummary { [dimension: string]: number }

export async function seedMarketplace(db: Q, o: { scale?: number } = {}): Promise<SeedSummary> {
  const L = catalogLayout(o.scale ?? 1);

  // ------------------------------------------------------------ catalog: sets, entries, 90 daily runs, observations
  await db.query(
    `INSERT INTO "CatalogSet" (id, code, name, era, "createdAt", "updatedAt")
     SELECT rpad('cs' || s || 'x', 24, '0'), 'S' || lpad(s::text, 3, '0'), 'Expansión ' || s, ($1::text[])[s % 5 + 1], $2, $2 FROM generate_series(0, $3::int - 1) AS s`,
    [ERAS, T0, L.sets],
  );
  await db.query(
    `INSERT INTO "CatalogEntry" (id, "externalKey", "setId", kind, name, number, "numberSort", "createdAt", "updatedAt")
     SELECT rpad('ce' || i || 'x', 24, '0'), 'ext-' || i, rpad('cs' || (i % $1::int) || 'x', 24, '0'),
            CASE WHEN i < $2::int THEN 'sealedProduct' ELSE 'card' END,
            CASE WHEN i < $2::int THEN 'Caja de entrenador ' || i ELSE 'Carta ' || i END,
            (i / $1::int + 1)::text, i / $1::int + 1, $3, $3
     FROM generate_series(0, $4::int - 1) AS i`,
    [L.sets, L.sealed, T0, L.entries],
  );
  await db.query(
    `INSERT INTO "FeedIngestionRun" (id, status, "startedAt", "endedAt", "createdAt", "updatedAt")
     SELECT rpad('run' || d || 'x', 24, '0'), 'Completed', $1::timestamptz - make_interval(days => d), $1::timestamptz - make_interval(days => d) + interval '1 hour', $1, $1
     FROM generate_series(1, $2::int) AS d`,
    [T0, L.historyDays],
  );
  // 90 daily observations for the priced block; one observation yesterday for every other card but the unpriced tail.
  await db.query(
    `INSERT INTO "ReferencePriceObservation" (id, "catalogEntryId", source, "observedAt", cop, "copDerivation", "runId", "createdAt")
     SELECT rpad('o' || i || 'd' || d || 'x', 24, '0'), rpad('ce' || i || 'x', 24, '0'), 'fixture',
            $1::timestamptz - make_interval(days => d), 1000 + (i * 7919) % 250000 + d * 10, 'sourceNative', rpad('run' || d || 'x', 24, '0'), $1
     FROM generate_series($2::int, $2::int + $3::int - 1) AS i, generate_series(1, $4::int) AS d`,
    [T0, L.pricedFrom, L.priced, L.historyDays],
  );
  await db.query(
    `INSERT INTO "ReferencePriceObservation" (id, "catalogEntryId", source, "observedAt", cop, "copDerivation", "runId", "createdAt")
     SELECT rpad('o' || i || 'd1x', 24, '0'), rpad('ce' || i || 'x', 24, '0'), 'fixture', $1::timestamptz - interval '1 day',
            1000 + (i * 7919) % 250000, 'sourceNative', rpad('run1x', 24, '0'), $1
     FROM generate_series(0, $4::int - 1) AS i WHERE (i < $2::int OR i >= $2::int + $3::int) AND i < $4::int - $5::int`,
    [T0, L.pricedFrom, L.priced, L.entries, L.unpriced],
  );

  // ------------------------------------------------------------ FX: 90 daily TRM rows with one weekend gap and one missing business day
  const fx: Row[] = [];
  let skippedWeekend = false;
  let skippedBusinessDay = false;
  for (let d = 1; d <= L.historyDays; d++) {
    const day = new Date(Date.parse(T0) - d * DAY);
    const dow = day.getUTCDay();
    if (!skippedWeekend && d >= 30 && dow === 0) { skippedWeekend = true; d++; continue; } // Sunday and the Saturday before it
    if (!skippedBusinessDay && d >= 60 && dow >= 1 && dow <= 5) { skippedBusinessDay = true; continue; }
    const date = day.toISOString().slice(0, 10);
    fx.push({ id: id(`fx${d}`), copPerUsdCentavos: 412_000 + d * 37, validFrom: date, validTo: date, source: 'fixture', fetchedAt: at(-d * DAY + HOUR) });
  }
  await bulk(db, 'FxRate', fx, 'created');

  // ------------------------------------------------------------ accounts: 3 admins, 60 individual sellers, 14 businesses, 223 buyers
  await admin(db);
  await admin(db, id('admin2'));
  await admin(db, id('admin3'));
  for (let k = 0; k < 60; k++) { const c = CITIES[k % 4]!; await individualSeller(db, individualId(k), { lat: c.lat + (k % 7) * 0.01, lng: c.lng - (k % 5) * 0.01, city: c.city }); }
  await rejectionReason(db, { code: 'DataMismatch', cooldownDays: 7 });
  await rejectionReason(db, { code: 'FraudSuspected', barred: true });
  for (let k = 0; k < 8; k++) await business(db, businessId(k), 'Approved', { applicationId: id(`app${k}`) });
  // biz0 was Rejected once and re-applied (the factory's Approved application is the second).
  await ins(db, 'BusinessApplication', {
    id: id('app0first'), businessId: businessId(0), status: 'Rejected', businessName: 'Tienda biz0', city: 'Medellín', externalPresenceUrl: 'https://instagram.com/tienda',
    submittedAt: at(-30 * DAY), consentAt: at(-30 * DAY), consentVersion: 'privacy-v1', decidedBy: id('admin'), decidedAt: at(-29 * DAY),
    rejectionReasonCode: 'DataMismatch', reapplyNotBefore: at(-22 * DAY), reapplyBarred: false,
  });
  for (let k = 8; k < 11; k++) await business(db, businessId(k), 'Pending', { applicationId: id(`app${k}`) });
  await business(db, businessId(11), 'Rejected', { applicationId: id('app11'), reasonCode: 'DataMismatch', reapplyNotBefore: at(3 * DAY) });
  await business(db, businessId(12), 'Rejected', { applicationId: id('app12'), reasonCode: 'DataMismatch', reapplyNotBefore: at(-DAY) });
  await business(db, businessId(13), 'Rejected', { applicationId: id('app13'), reasonCode: 'FraudSuspected', barred: true });
  for (let k = 0; k < 223; k++) await user(db, { id: buyerId(k), emailVerified: k >= 5 });

  // ------------------------------------------------------------ commission: 6 funded, 1 at zero, 1 transiently negative
  for (let k = 0; k < 8; k++) {
    const balance = k < 6 ? 250_000 : k === 6 ? 0 : -1_800;
    await commissionAccount(db, businessId(k), balance, 3);
    await commissionState(db, businessId(k), { lastAppliedSeq: 3, paused: balance <= 0 });
  }

  // ------------------------------------------------------------ inventory and listings: 1,500
  const units: Row[] = [];
  const listings: Row[] = [];
  const components: Row[] = [];
  const singles: { listingId: string; unitId: string; sellerId: string; priceCop: number; kind: 'individual' | 'business'; openToTrade: boolean }[] = [];
  let n = 0;
  const single = (sellerId: string, kind: 'individual' | 'business', k: number, sellerIdx: number, o: { sealed?: boolean; quantity?: number; openToTrade?: boolean; pausedAt?: string | null; withdrawnBy?: string | null; lat?: number | null; lng?: number | null } = {}) => {
    const i = n++;
    const entry = o.sealed ? (sellerIdx * 13 + k) % 300 : L.pricedFrom + ((sellerIdx * 97 + k) % (L.entries - L.pricedFrom - L.unpriced));
    const unitId = id(`unit${i}`);
    const listingId = id(`lst${i}`);
    const priceCop = 5_000 + ((i * 7919) % 400) * 500;
    units.push({ id: unitId, sellerId, catalogEntryId: entryId(entry), condition: o.sealed ? 'Sealed' : 'NM', quantity: o.quantity ?? (i % 4) + 1 });
    const coords = o.lat !== undefined ? { lat: o.lat, lng: o.lng ?? null } : kind === 'individual' ? { lat: CITIES[sellerIdx % 4]!.lat, lng: CITIES[sellerIdx % 4]!.lng } : { lat: 6.2442, lng: -75.5812 };
    listings.push({
      id: listingId, sellerId, sellerKindAtCreation: kind, kind: 'single', inventoryUnitId: unitId, title: null, priceCop, ...coords, description: '',
      openToTrade: o.openToTrade ?? false, pausedAt: o.pausedAt ?? null, hiddenAt: null, hiddenReason: null, hiddenBy: null,
      withdrawnAt: o.withdrawnBy ? at(-DAY) : null, withdrawnReason: o.withdrawnBy ? 'ApplicationRejected' : null, withdrawnByApplicationId: o.withdrawnBy ?? null,
    });
    singles.push({ listingId, unitId, sellerId, priceCop, kind, openToTrade: o.openToTrade ?? false });
    return { listingId, unitId, entry };
  };
  // Individuals: 960 singles (80 sealed, every third card open to trade), spread 16 per seller.
  for (let k = 0; k < 960; k++) {
    const s = k % 60;
    const sealed = k % 12 === 0;
    single(individualId(s), 'individual', Math.floor(k / 60), s, { sealed, openToTrade: !sealed && k % 3 === 1 });
  }
  // Businesses: 52 singles per approved business (5 sealed each), 18 per pending one, 10 withdrawn across the rejected ones.
  for (let b = 0; b < 8; b++) for (let k = 0; k < 52; k++) single(businessId(b), 'business', k, 100 + b, { sealed: k < 5, pausedAt: b >= 6 ? at(-DAY) : null });
  for (let b = 8; b < 11; b++) for (let k = 0; k < 18; k++) single(businessId(b), 'business', k, 100 + b, { pausedAt: at(-DAY) });
  for (let k = 0; k < 10; k++) { const b = 11 + (k % 3); single(businessId(b), 'business', k, 100 + b, { withdrawnBy: id(`app${b}`) }); }
  // 60 bundles: 40 individual, 20 business, 2 components each; the first component of each of the first 40 bundles reuses a listed single's unit (shared units).
  let shared = 0;
  const bundle = (sellerId: string, kind: 'individual' | 'business', sellerIdx: number, b: number) => {
    const listingId = id(`bun${b}`);
    listings.push({ id: listingId, sellerId, sellerKindAtCreation: kind, kind: 'bundle', inventoryUnitId: null, title: `Lote ${b}`, priceCop: 60_000 + b * 1_000, lat: 4.711, lng: -74.0721, description: '', openToTrade: false, pausedAt: kind === 'business' && sellerIdx >= 106 ? at(-DAY) : null, hiddenAt: null, hiddenReason: null, hiddenBy: null, withdrawnAt: null, withdrawnReason: null, withdrawnByApplicationId: null });
    for (let c = 0; c < 2; c++) {
      let unit: Row;
      const reuse = c === 0 && shared < 40 ? units.find((u, idx) => u.sellerId === sellerId && u.condition === 'NM' && !components.some((x) => x.inventoryUnitId === u.id) && idx < 1_450) : undefined;
      if (reuse) { unit = reuse; shared++; } else {
        const entry = L.pricedFrom + ((sellerIdx * 97 + 500 + b * 2 + c) % (L.entries - L.pricedFrom - L.unpriced));
        unit = { id: id(`bunit${b}c${c}`), sellerId, catalogEntryId: entryId(entry), condition: 'NM', quantity: 2 };
        units.push(unit);
      }
      components.push({ listingId, inventoryUnitId: unit.id, sellerId, catalogEntryId: unit.catalogEntryId, condition: 'NM', perBundleQty: 1 });
    }
  };
  for (let b = 0; b < 40; b++) bundle(individualId(b), 'individual', b, b);
  for (let b = 40; b < 60; b++) bundle(businessId((b - 40) % 5), 'business', 100 + ((b - 40) % 5), b);
  // 25 hidden individual singles; 5 with missing or out-of-Colombia coordinates.
  for (let h = 0; h < 25; h++) Object.assign(listings[h * 37 + 2]!, { hiddenAt: at(-HOUR), hiddenReason: 'Spam', hiddenBy: id('admin') });
  for (const [h, coords] of [[961, { lat: null, lng: null }], [962, { lat: null, lng: null }], [963, { lat: null, lng: null }], [5, { lat: 40.4168, lng: -3.7038 }], [7, { lat: 0, lng: 0 }]] as const) Object.assign(listings[h]!, coords);
  // Three individual open-to-trade listings with exactly one unit left, for the competing-offer races.
  const raced = singles.filter((s) => s.kind === 'individual' && s.openToTrade).slice(0, 3);
  for (const r of raced) units.find((u) => u.id === r.unitId)!.quantity = 1;
  await bulk(db, 'InventoryUnit', units);
  await bulk(db, 'Listing', listings);
  await bulk(db, 'BundleComponent', components, 'created');

  // ------------------------------------------------------------ orders: 200 business orders in mixed states
  const sellable = singles.filter((s) => s.kind === 'business' && s.sellerId !== businessId(6) && s.sellerId !== businessId(7) && listings.find((l) => l.id === s.listingId)!.withdrawnAt === null && singles.indexOf(s) < 960 + 8 * 52);
  const states = [
    ...Array(10).fill('overdue'), ...Array(30).fill('unpaid'), ...Array(40).fill('paid'), ...Array(40).fill('sellerConfirmed'),
    ...Array(50).fill('closed'), ...Array(15).fill('cancelled'), ...Array(15).fill('expired'),
  ] as string[];
  for (let k = 0; k < states.length; k++) {
    const s = sellable[(k * 11) % sellable.length]!;
    const state = states[k]!;
    const base = { id: id(`ord${k}`), buyerId: buyerId(5 + (k % 200)), businessId: s.sellerId, listingId: s.listingId, unitId: s.unitId, unitPriceCop: s.priceCop };
    if (state === 'overdue') await order(db, { ...base, createdAt: at(-3 * DAY), expiresAt: at(-DAY) });
    else if (state === 'unpaid') await order(db, { ...base, createdAt: at(-2 * HOUR), expiresAt: at(46 * HOUR) });
    else if (state === 'cancelled') await order(db, { ...base, createdAt: at(-2 * DAY), expiresAt: at(-DAY + HOUR), cancelledAt: at(-DAY - HOUR) });
    else if (state === 'expired') await order(db, { ...base, createdAt: at(-5 * DAY), expiresAt: at(-3 * DAY), expiredAt: at(-3 * DAY + HOUR) });
    else {
      const paidAt = at(-4 * DAY + k * 60_000);
      await order(db, { ...base, createdAt: at(-5 * DAY), expiresAt: at(-3 * DAY), paidAt,
        sellerAt: state !== 'paid' ? at(-3 * DAY) : null, itemAt: state === 'closed' ? at(-2 * DAY) : null });
    }
  }

  // ------------------------------------------------------------ trades: 50 offers; 3 last-unit listings with two competing open offers each
  const tradable = singles.filter((s) => s.kind === 'individual' && s.openToTrade && !raced.includes(s));
  const offers: Row[] = [];
  const offer = (k: number, l: (typeof singles)[number], proposer: string, status: string, extra: Row = {}) => {
    const expiresAt = status === 'Expired' ? at(-DAY) : at(5 * DAY);
    offers.push({
      id: id(`off${k}`), listingId: l.listingId, sellerId: l.sellerId, proposerId: proposer, status, turn: 'seller', terms: json({ offeredItems: [], cashCop: 20_000 + k * 500, requestedQty: 1 }).value,
      roundCount: 1, version: 0, reservationRef: null, unfulfillableReason: status === 'Unfulfillable' ? 'ListingNoLongerAvailable' : null,
      acceptedAt: status === 'Accepted' || status === 'Cancelled' ? at(-HOUR) : null, cancelledBy: null, cancelledAt: null,
      expiresAt, createdAt: new Date(Date.parse(expiresAt) - 7 * DAY).toISOString(), ...extra,
    });
  };
  let k = 0;
  for (const r of raced) { offer(k++, r, buyerId(10 + k), 'Open'); offer(k++, r, buyerId(10 + k), 'Open'); }
  const mix = [...Array(14).fill('Open'), ...Array(6).fill('Rejected'), ...Array(6).fill('Withdrawn'), ...Array(6).fill('Expired'), ...Array(4).fill('Unfulfillable'), ...Array(5).fill('Accepted'), ...Array(3).fill('Cancelled')] as string[];
  for (const status of mix) {
    const l = tradable[k % tradable.length]!;
    const reservation = { listingId: l.listingId, units: [{ inventoryUnitId: l.unitId, qty: 1 }] };
    offer(k, l, buyerId(10 + k), status, status === 'Accepted' ? { reservationRef: reservation } : status === 'Cancelled' ? { reservationRef: reservation, cancelledBy: l.sellerId, cancelledAt: at(-HOUR / 2) } : {});
    k++;
  }
  await bulk(db, 'TradeOffer', offers.map((o) => ({ ...o, updatedAt: T0 })), 'none');
  await bulk(db, 'TradeOfferRound', offers.map((o) => ({ offerId: o.id, round: 1, actor: 'proposer', action: 'offer', terms: o.terms })), 'created');

  // ------------------------------------------------------------ collections: 300 across 120 users; one with 500 entries (20 link-added); 150 wishlist entries
  const owners = [...Array.from({ length: 60 }, (_, i) => individualId(i)), ...Array.from({ length: 60 }, (_, i) => buyerId(5 + i))];
  const cols: Row[] = [];
  const entries: Row[] = [];
  owners.forEach((owner, u) => {
    const names = u < 60 ? ['General', 'Intercambio', 'Favoritas'] : ['General', 'Favoritas'];
    names.forEach((name, c) => cols.push({ id: id(`col${u}n${c}`), ownerId: owner, name }));
  });
  for (let e = 0; e < 500; e++) {
    const external = e >= 480;
    entries.push({
      id: id(`big${e}`), collectionId: id('col0n0'), cardKind: external ? 'external' : 'catalog', catalogEntryId: external ? null : entryId(L.pricedFrom + e * 3),
      externalUrl: external ? `https://example.org/promo/${e}` : null, externalTitle: external ? `Promo ${e}` : null, source: 'Manual', orderId: null,
      qty: (e % 3) + 1, acquiredAt: '2026-08-01', manualPosition: e,
    });
  }
  cols.slice(1).forEach((c, i) => {
    for (let e = 0; e < i % 4; e++) entries.push({ id: id(`ent${i}e${e}`), collectionId: c.id, cardKind: 'catalog', catalogEntryId: entryId(L.pricedFrom + ((i * 31 + e) % L.priced)), externalUrl: null, externalTitle: null, source: 'Manual', orderId: null, qty: 1, acquiredAt: '2026-09-01', manualPosition: e });
  });
  await bulk(db, 'Collection', cols);
  await bulk(db, 'CollectionEntry', entries);
  await bulk(db, 'WishlistEntry', Array.from({ length: 150 }, (_, w) => ({ id: id(`wish${w}`), ownerId: buyerId(5 + Math.floor(w / 3)), catalogEntryId: entryId(L.pricedFrom + w * 7 + (w % 3)), maxPriceCop: w % 2 ? 50_000 : null, note: null })));

  // ------------------------------------------------------------ reviews: 400, 15 hidden; one per (reviewer, target)
  const targets = [...Array.from({ length: 8 }, (_, b) => ({ id: businessId(b), kind: 'business' as const })), ...Array.from({ length: 60 }, (_, i) => ({ id: individualId(i), kind: 'individual' as const }))];
  await bulk(db, 'Review', Array.from({ length: 400 }, (_, r) => {
    const t = targets[r % targets.length]!;
    const round = Math.floor(r / targets.length);
    const hidden = r % 26 === 25 && r < 400;
    return {
      id: id(`rev${r}`), reviewerId: buyerId(5 + ((105 * round + (r % targets.length)) % 218)), targetUserId: t.id, targetKind: t.kind, purchaseVerified: t.kind === 'business',
      rating: 1 + ((r * 7) % 5), text: `Reseña ${r}`, hiddenAt: hidden ? at(-HOUR) : null, hiddenReason: hidden ? 'Spam' : null, hiddenBy: hidden ? id('admin') : null,
    };
  }));

  return summarize(db);
}

/** Row counts per PRD §3 dimension, read back from the database. */
export async function summarize(db: Q): Promise<SeedSummary> {
  const [r] = await db.query<Record<string, string>>(`SELECT
    (SELECT count(*) FROM "CatalogEntry") AS "catalogEntries",
    (SELECT count(*) FROM "CatalogSet") AS sets,
    (SELECT count(DISTINCT era) FROM "CatalogSet") AS eras,
    (SELECT count(*) FROM (SELECT "catalogEntryId" FROM "ReferencePriceObservation" GROUP BY 1 HAVING count(DISTINCT "observedAt"::date) >= 90) x) AS "entriesWith90Days",
    (SELECT count(*) FROM "CatalogEntry" c WHERE NOT EXISTS (SELECT 1 FROM "ReferencePriceObservation" o WHERE o."catalogEntryId" = c.id)) AS "entriesWithoutPrice",
    (SELECT count(*) FROM "FxRate") AS "fxRows",
    (SELECT count(*) FROM "User") AS users,
    (SELECT count(*) FROM "User" WHERE "isAdmin") AS admins,
    (SELECT count(*) FROM "IndividualSellerProfile" WHERE "completedAt" IS NOT NULL) AS "individualSellers",
    (SELECT count(*) FROM "User" WHERE "sellerTrack" = 'business') AS businesses,
    (SELECT count(*) FROM "User" WHERE NOT "emailVerified") AS "unverifiedEmails",
    (SELECT count(*) FROM "Listing") AS listings,
    (SELECT count(*) FROM "Listing" WHERE "sellerKindAtCreation" = 'individual') AS "individualListings",
    (SELECT count(*) FROM "Listing" WHERE kind = 'bundle') AS bundles,
    (SELECT count(*) FROM "Listing" l JOIN "InventoryUnit" u ON u.id = l."inventoryUnitId" WHERE u.condition = 'Sealed') AS "sealedListings",
    (SELECT count(DISTINCT b."inventoryUnitId") FROM "BundleComponent" b JOIN "Listing" l ON l."inventoryUnitId" = b."inventoryUnitId") AS "sharedUnits",
    (SELECT count(*) FROM "Listing" WHERE "hiddenAt" IS NOT NULL) AS "hiddenListings",
    (SELECT count(*) FROM "Listing" WHERE "withdrawnAt" IS NOT NULL) AS "withdrawnListings",
    (SELECT count(*) FROM "Listing" WHERE kind = 'single' AND (lat IS NULL OR lat NOT BETWEEN -4.3 AND 13.5 OR lng NOT BETWEEN -82 AND -66.8 OR (lat = 0 AND lng = 0))) AS "badLocations",
    (SELECT count(*) FROM "Order") AS orders,
    (SELECT count(*) FROM "Order" WHERE "buyerPaidConfirmedAt" IS NULL AND "cancelledAt" IS NULL AND "expiredAt" IS NULL AND "expiresAt" < $1) AS "overdueUnpaidOrders",
    (SELECT count(*) FROM "CommissionAccount") AS "commissionAccounts",
    (SELECT count(*) FROM "CommissionAccount" WHERE "balanceCop" > 0) AS "fundedAccounts",
    (SELECT count(*) FROM "TradeOffer") AS "tradeOffers",
    (SELECT count(*) FROM (SELECT o."listingId" FROM "TradeOffer" o JOIN "Listing" l ON l.id = o."listingId" JOIN "InventoryUnit" u ON u.id = l."inventoryUnitId" WHERE o.status = 'Open' AND u.quantity = 1 GROUP BY 1 HAVING count(*) >= 2) x) AS "lastUnitContests",
    (SELECT count(*) FROM "Collection") AS collections,
    (SELECT count(DISTINCT "ownerId") FROM "Collection") AS "collectionOwners",
    (SELECT max(n) FROM (SELECT count(*) AS n FROM "CollectionEntry" GROUP BY "collectionId") x) AS "largestCollection",
    (SELECT count(*) FROM "CollectionEntry" WHERE "cardKind" = 'external') AS "linkAddedEntries",
    (SELECT count(*) FROM "WishlistEntry") AS "wishlistEntries",
    (SELECT count(*) FROM "Review") AS reviews,
    (SELECT count(*) FROM "Review" WHERE "hiddenAt" IS NOT NULL) AS "hiddenReviews"`, [T0]);
  return Object.fromEntries(Object.entries(r!).map(([key, v]) => [key, Number(v)]));
}
