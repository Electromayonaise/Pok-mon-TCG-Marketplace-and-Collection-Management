// Solu-2 fixtures (task statement §6, step 3.2), over docs/solu-2/planning/detailed-design/schemas/001_tezg_schema.sql:
//   fake_clock      — VirtualClock (../clock.ts), seeded at 2026-10-01T15:00:00Z
//   db              — useTestDatabase (../db.ts): per-file database from the Solu-2 template + network guard
//   sim_events      — SubscriberFaults (../simulated) + the stubbed OutboxDispatcherV2
//   seed_marketplace — the factories below (Given steps) and seedMarketplace (./seed-marketplace.ts)
//   explain_assert  — explainAssert below: the one sanctioned assertion helper
// Factories only insert rows that satisfy every constraint of the schema; they assert nothing.
import { expect } from 'vitest';
import { SEED_INSTANT, VirtualClock } from '../clock.js';
import type { TestDb } from '../db.js';
import { id, SequentialIds } from '../ids.js';
import { PgIdnRepository } from '../../src/modules/identity/index.js';
import { PgAdminEventsRepository } from '../../src/shared-kernel/infra/pg-admin-events.js';
import { PgOutboxV2 } from '../../src/shared-kernel/infra/pg-outbox.js';
import { oneRepository } from '../../src/shared-kernel/repositories.js';
import { InMemoryObjectStorage, SimulatedScanner, SqlAuditLog, SubscriberFaults } from '../simulated/index.js';

export { id };
export const T0 = new Date(SEED_INSTANT).toISOString();
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const at = (offsetMs: number): string => new Date(SEED_INSTANT + offsetMs).toISOString();

type Q = Pick<TestDb, 'query'>;
/** Marks a value for a jsonb column (arrays without it go to Postgres array columns). */
export class Json { constructor(readonly value: unknown) {} }
export const json = (v: unknown): Json => new Json(v);

/** INSERT one row; `createdAt`/`updatedAt` default to T0 when the caller omits them. */
export async function ins(db: Q, table: string, row: Record<string, unknown>, timestamps: 'both' | 'created' | 'none' = 'both'): Promise<void> {
  const r: Record<string, unknown> = { ...row };
  if (timestamps !== 'none' && !('createdAt' in r)) r.createdAt = T0;
  if (timestamps === 'both' && !('updatedAt' in r)) r.updatedAt = T0;
  const cols = Object.keys(r);
  const vals = cols.map((c) => (r[c] instanceof Json ? JSON.stringify((r[c] as Json).value) : r[c]));
  await db.query(`INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`, vals);
}

// ---------------------------------------------------------------- identity (IDN, VER)
export const user = (db: Q, o: { id: string; sellerTrack?: 'individual' | 'business' | null; isAdmin?: boolean; emailVerified?: boolean }) =>
  ins(db, 'User', { id: o.id, name: o.id, email: `${o.id}@tezg.test`, emailVerified: o.emailVerified ?? true, isAdmin: o.isAdmin ?? false, sellerTrack: o.sellerTrack ?? null, signupConsentAt: T0, signupConsentVersion: 'privacy-v1' });

export async function individualSeller(db: Q, userId: string, o: { lat?: number; lng?: number; city?: string } = {}): Promise<string> {
  await user(db, { id: userId, sellerTrack: 'individual' });
  await ins(db, 'IndividualSellerProfile', { userId, displayName: `Vendedor ${userId.slice(0, 6)}`, contactPhoneE164: '+573001234567', phoneSharingConsentAt: T0, phoneSharingConsentVersion: 'phone-v1', meetingLat: o.lat ?? 4.711, meetingLng: o.lng ?? -74.0721, meetingCity: o.city ?? 'Bogotá', completedAt: T0 });
  return userId;
}

export const rejectionReason = (db: Q, o: { code: string; barred?: boolean; cooldownDays?: number | null; active?: boolean }) =>
  ins(db, 'RejectionReason', { code: o.code, textEsCo: `Motivo de rechazo ${o.code}.`, barred: o.barred ?? false, cooldownDays: o.barred ? null : (o.cooldownDays ?? 7), active: o.active ?? true });

/** A business account with one application in `status`. Approved/Rejected are decided at T0 − 1 day. */
export async function business(db: Q, businessId: string, status: 'Pending' | 'Approved' | 'Rejected', o: { applicationId?: string; reasonCode?: string; reapplyNotBefore?: string | null; barred?: boolean; submittedAt?: string } = {}): Promise<string> {
  await user(db, { id: businessId, sellerTrack: 'business' });
  const applicationId = o.applicationId ?? id(`app${businessId.slice(0, 8)}`);
  const decided = status !== 'Pending';
  if (status === 'Rejected') await rejectionReason(db, { code: o.reasonCode ?? 'DataMismatch', barred: o.barred ?? false }).catch(() => undefined);
  await ins(db, 'BusinessApplication', {
    id: applicationId, businessId, status, businessName: `Tienda ${businessId.slice(0, 6)}`, city: 'Medellín', externalPresenceUrl: 'https://instagram.com/tienda',
    submittedAt: o.submittedAt ?? at(-2 * DAY), consentAt: at(-2 * DAY), consentVersion: 'privacy-v1',
    decidedBy: decided ? id('admin') : null, decidedAt: decided ? at(-DAY) : null,
    rejectionReasonCode: status === 'Rejected' ? (o.reasonCode ?? 'DataMismatch') : null,
    reapplyNotBefore: status === 'Rejected' && !o.barred ? (o.reapplyNotBefore ?? at(6 * DAY)) : null,
    reapplyBarred: status === 'Rejected' ? (o.barred ?? false) : false,
  });
  await ins(db, 'BusinessProfile', { businessId, publicName: `Tienda ${businessId.slice(0, 6)}`, city: 'Medellín', externalPresenceUrl: 'https://instagram.com/tienda', bankName: 'Bancolombia', accountType: 'savings', accountNumber: '12345678901', holderName: 'Andrés Tienda' });
  return applicationId;
}

export const admin = (db: Q, adminId = id('admin')) => user(db, { id: adminId, isAdmin: true });

// ---------------------------------------------------------------- catalog (CAT)
export async function catalogEntry(db: Q, entryId: string, o: { setId?: string; kind?: 'card' | 'sealedProduct'; name?: string; number?: string; externalKey?: string } = {}): Promise<string> {
  const setId = o.setId ?? id('set1');
  await db.query(`INSERT INTO "CatalogSet" (id, code, name, era, "createdAt", "updatedAt") VALUES ($1, $2, 'Set de prueba', 'SV', $3, $3) ON CONFLICT DO NOTHING`, [setId, `S${setId.slice(0, 6)}`, T0]);
  await ins(db, 'CatalogEntry', { id: entryId, externalKey: o.externalKey ?? `ext-${entryId}`, setId, kind: o.kind ?? 'card', name: o.name ?? `Carta ${entryId.slice(0, 6)}`, number: o.number ?? '001', numberSort: 1 });
  return entryId;
}

export async function feedRun(db: Q, runId: string, o: { status?: 'Running' | 'Completed' | 'Failed'; startedAt?: string; leaseUntil?: string | null } = {}): Promise<string> {
  const status = o.status ?? 'Completed';
  await ins(db, 'FeedIngestionRun', { id: runId, status, startedAt: o.startedAt ?? at(-DAY), endedAt: status === 'Running' ? null : at(-DAY + HOUR), leaseUntil: o.leaseUntil ?? null, leaseToken: o.leaseUntil ? 'lease-token' : null });
  return runId;
}

export const observation = (db: Q, o: { id: string; catalogEntryId: string; cop: number; observedAt: string; runId: string; source?: string; usdCents?: number | null; fxRateDate?: string | null }) =>
  ins(db, 'ReferencePriceObservation', { id: o.id, catalogEntryId: o.catalogEntryId, source: o.source ?? 'fixture', observedAt: o.observedAt, usdCents: o.usdCents ?? null, cop: o.cop, copDerivation: o.fxRateDate ? 'fxDerived' : 'sourceNative', fxRateDate: o.fxRateDate ?? null, runId: o.runId }, 'created');

// ---------------------------------------------------------------- listings (INV, DSC)
export const unit = (db: Q, o: { id: string; sellerId: string; catalogEntryId: string; condition?: string; quantity: number }) =>
  ins(db, 'InventoryUnit', { id: o.id, sellerId: o.sellerId, catalogEntryId: o.catalogEntryId, condition: o.condition ?? 'NM', quantity: o.quantity });

export const listing = (db: Q, o: { id: string; sellerId: string; unitId?: string | null; kind?: 'single' | 'bundle'; sellerKind?: 'business' | 'individual'; priceCop?: number; openToTrade?: boolean; pausedAt?: string | null; hiddenAt?: string | null; lat?: number | null; lng?: number | null; title?: string | null; version?: number }) =>
  ins(db, 'Listing', {
    id: o.id, sellerId: o.sellerId, sellerKindAtCreation: o.sellerKind ?? 'business', kind: o.kind ?? 'single', inventoryUnitId: o.kind === 'bundle' ? null : (o.unitId ?? null),
    title: o.kind === 'bundle' ? (o.title ?? 'Lote de prueba') : (o.title ?? null), priceCop: o.priceCop ?? 45_000, lat: o.lat === undefined ? 4.711 : o.lat, lng: o.lng === undefined ? -74.0721 : o.lng,
    description: '', openToTrade: o.openToTrade ?? false, pausedAt: o.pausedAt ?? null,
    hiddenAt: o.hiddenAt ?? null, hiddenReason: o.hiddenAt ? 'Spam' : null, hiddenBy: o.hiddenAt ? id('admin') : null, version: o.version ?? 0,
  });

export const commissionState = (db: Q, businessId: string, o: { lastAppliedSeq?: number; paused?: boolean } = {}) =>
  ins(db, 'SellerCommissionState', { businessId, lastAppliedSeq: o.lastAppliedSeq ?? 1, paused: o.paused ?? false, appliedAt: T0 });

/** An Approved, funded business with one single listing over one unit. */
export async function purchasableListing(db: Q, o: { businessId: string; listingId: string; unitId: string; entryId: string; quantity: number; priceCop?: number }): Promise<void> {
  await business(db, o.businessId, 'Approved');
  await commissionState(db, o.businessId);
  await catalogEntry(db, o.entryId);
  await unit(db, { id: o.unitId, sellerId: o.businessId, catalogEntryId: o.entryId, quantity: o.quantity });
  await listing(db, { id: o.listingId, sellerId: o.businessId, unitId: o.unitId, priceCop: o.priceCop ?? 45_000 });
}

// ---------------------------------------------------------------- orders (ORD)
export async function order(db: Q, o: { id: string; buyerId: string; businessId: string; listingId: string; unitId: string; qty?: number; unitPriceCop?: number; comprobante?: boolean; paidAt?: string | null; sellerAt?: string | null; itemAt?: string | null; cancelledAt?: string | null; expiredAt?: string | null; expiresAt?: string; createdAt?: string }): Promise<void> {
  const qty = o.qty ?? 1;
  const price = o.unitPriceCop ?? 45_000;
  const comprobante = o.comprobante ?? Boolean(o.paidAt);
  await ins(db, 'Order', {
    id: o.id, buyerId: o.buyerId, businessId: o.businessId, listingId: o.listingId,
    listingSnapshot: json({ title: 'Charizard ex', itemRef: null, condition: 'NM', unitPriceCop: price, components: null }),
    qty, unitPriceCop: price, totalCop: price * qty,
    paymentInstructionsSnapshot: json({ bankName: 'Bancolombia', accountType: 'savings', accountNumber: '12345678901', holderName: 'Andrés Tienda', qrObjectKey: null }),
    reservationRef: json({ listingId: o.listingId, units: [{ inventoryUnitId: o.unitId, qty }] }), reservedUnitIds: [o.unitId],
    comprobanteObjectKey: comprobante ? `order-comprobantes/${o.id}` : null, comprobanteUploadedAt: comprobante ? (o.paidAt ?? T0) : null,
    buyerPaidConfirmedAt: o.paidAt ?? null, sellerReceivedConfirmedAt: o.sellerAt ?? null, buyerItemReceivedConfirmedAt: o.itemAt ?? null,
    cancelledAt: o.cancelledAt ?? null, expiredAt: o.expiredAt ?? null, cancelReason: o.expiredAt ? 'Unpaid' : o.cancelledAt ? 'BuyerCancelled' : null,
    expiresAt: o.expiresAt ?? at(48 * HOUR), createdAt: o.createdAt ?? at(-HOUR), updatedAt: T0,
  });
}

// ---------------------------------------------------------------- commission (COM)
export const commissionAccount = (db: Q, businessId: string, balanceCop: number, ledgerSeq = 0) =>
  ins(db, 'CommissionAccount', { businessId, balanceCop, state: balanceCop > 0 ? 'Funded' : 'Exhausted', ledgerSeq, openedAt: at(-DAY) });

export const topUp = (db: Q, o: { id: string; businessId: string; amountCop: number; status?: 'Pending' | 'Confirmed' | 'Rejected' }) =>
  ins(db, 'TopUpRequest', { id: o.id, businessId: o.businessId, amountCop: o.amountCop, transferReference: 'REF-1234', proofObjectKey: `topup-proofs/${o.id}`, status: o.status ?? 'Pending', rejectionReason: o.status === 'Rejected' ? 'No encontramos la transferencia.' : null, decidedBy: o.status && o.status !== 'Pending' ? id('admin') : null, decidedAt: o.status && o.status !== 'Pending' ? T0 : null, submittedAt: at(-HOUR) });

// ---------------------------------------------------------------- trading (TRD)
export const TERMS = { offeredItems: [], cashCop: 20_000, requestedQty: 1 } as const;
export const tradeOffer = (db: Q, o: { id: string; listingId: string; sellerId: string; proposerId: string; status?: string; turn?: 'proposer' | 'seller'; roundCount?: number; version?: number; reservationRef?: unknown; expiresAt?: string; acceptedAt?: string | null; terms?: unknown }) =>
  ins(db, 'TradeOffer', {
    id: o.id, listingId: o.listingId, sellerId: o.sellerId, proposerId: o.proposerId, status: o.status ?? 'Open', turn: o.turn ?? 'seller', terms: json(o.terms ?? TERMS),
    roundCount: o.roundCount ?? 1, version: o.version ?? 0, reservationRef: o.reservationRef ? json(o.reservationRef) : null,
    unfulfillableReason: o.status === 'Unfulfillable' ? 'ListingNoLongerAvailable' : null,
    acceptedAt: o.acceptedAt ?? (o.status === 'Accepted' || o.status === 'Cancelled' ? T0 : null),
    // An offer lives 7 days (ADD-§9.3): createdAt is derived from expiresAt so CHECK expiresAt > createdAt holds.
    expiresAt: o.expiresAt ?? at(7 * DAY), createdAt: new Date(Date.parse(o.expiresAt ?? at(7 * DAY)) - 7 * DAY).toISOString(),
  });
export const offerRound = (db: Q, offerId: string, round: number, o: { actor?: 'proposer' | 'seller'; action?: string; terms?: unknown } = {}) =>
  ins(db, 'TradeOfferRound', { offerId, round, actor: o.actor ?? 'proposer', action: o.action ?? 'offer', terms: (o.action ?? 'offer') === 'offer' || o.action === 'counter' ? json(o.terms ?? TERMS) : null }, 'created');

// ---------------------------------------------------------------- messaging (MSG)
export async function conversation(db: Q, o: { id: string; buyerId: string; businessId: string; lastSeq?: number }): Promise<void> {
  await ins(db, 'Conversation', { id: o.id, buyerId: o.buyerId, businessId: o.businessId, lastSeq: o.lastSeq ?? 0, lastMessageAt: o.lastSeq ? T0 : null });
  await ins(db, 'ConversationParticipant', { conversationId: o.id, userId: o.buyerId, role: 'buyer' });
  await ins(db, 'ConversationParticipant', { conversationId: o.id, userId: o.businessId, role: 'business' });
}

// ---------------------------------------------------------------- collections (COL, VAL)
export const collection = (db: Q, o: { id: string; ownerId: string; name?: string }) => ins(db, 'Collection', { id: o.id, ownerId: o.ownerId, name: o.name ?? 'General' });
export const entry = (db: Q, o: { id: string; collectionId: string; catalogEntryId?: string | null; qty?: number; acquiredAt?: string; orderId?: string | null; position?: number; external?: boolean }) =>
  ins(db, 'CollectionEntry', {
    id: o.id, collectionId: o.collectionId, cardKind: o.external ? 'external' : 'catalog', catalogEntryId: o.external ? null : (o.catalogEntryId ?? null),
    externalUrl: o.external ? 'https://example.org/promo' : null, externalTitle: o.external ? 'Promo por enlace' : null,
    source: o.orderId ? 'PlatformPurchase' : 'Manual', orderId: o.orderId ?? null, qty: o.qty ?? 1, acquiredAt: o.acquiredAt ?? '2026-09-01', manualPosition: o.position ?? 0,
  });
export const prompt = (db: Q, o: { id: string; orderId: string; buyerId: string; status?: 'Pending' | 'Accepted' | 'Dismissed'; lines?: unknown[] }) =>
  ins(db, 'PostPurchasePrompt', { id: o.id, orderId: o.orderId, buyerId: o.buyerId, lines: json(o.lines ?? [{ itemRef: id('entry1'), title: 'Charizard ex', qty: 1, unitPriceCop: 45_000 }]), buyerItemReceivedConfirmedAt: T0, status: o.status ?? 'Pending', resolvedAt: o.status && o.status !== 'Pending' ? T0 : null, acceptedIntoCollectionId: o.status === 'Accepted' ? id('coll1') : null });

// ---------------------------------------------------------------- reviews (REP)
export const review = (db: Q, o: { id: string; reviewerId: string; targetUserId: string; targetKind?: 'business' | 'individual'; rating?: number; text?: string; hiddenAt?: string | null }) =>
  ins(db, 'Review', {
    id: o.id, reviewerId: o.reviewerId, targetUserId: o.targetUserId, targetKind: o.targetKind ?? 'business', purchaseVerified: (o.targetKind ?? 'business') === 'business',
    rating: o.rating ?? 5, text: o.text ?? 'Excelente vendedor.', hiddenAt: o.hiddenAt ?? null, hiddenReason: o.hiddenAt ? 'Spam' : null, hiddenBy: o.hiddenAt ? id('admin') : null,
  });

// ---------------------------------------------------------------- wiring
/**
 * One id sequence per database and prefix, so two wirings in one test (a race's two sessions,
 * a loop's fresh services) never issue the same row id. No test asserts a generated id's value.
 */
const sequences = new WeakMap<TestDb, Map<string, SequentialIds>>();
function sharedIds(db: TestDb, prefix: string): SequentialIds {
  const byPrefix = sequences.get(db) ?? new Map<string, SequentialIds>();
  sequences.set(db, byPrefix);
  const ids = byPrefix.get(prefix) ?? new SequentialIds(prefix);
  byPrefix.set(prefix, ids);
  return ids;
}

/** Per-test shared ports: virtual clock, deterministic ids and the simulated adapters (R-14, R-1, R-2). */
export function wiring(db: TestDb, idPrefix = 'n') {
  const clock = new VirtualClock();
  const ids = sharedIds(db, idPrefix);
  return {
    clock, ids,
    transactions: db.transactions,
    // The production outbox, so payloads pass the AD-SYS-8 redactor in every suite (decision log Impl-1 #20).
    outbox: new PgOutboxV2(ids, clock),
    audit: new SqlAuditLog(ids, clock),
    storage: new InMemoryObjectStorage(clock),
    scanner: new SimulatedScanner(),
    faults: new SubscriberFaults(),
    /**
     * The one repository object every service receives (R-14): each story binds the Postgres
     * adapter of the methods it declares; ports still empty accept it unchanged.
     */
    repo: oneRepository(new PgAdminEventsRepository(), new PgIdnRepository()),
  };
}

/** A neighbour fake: implements only what the test names; any other call fails loudly. */
export function fake<T extends object>(name: string, impl: Partial<T>): T {
  return new Proxy(impl as T, {
    get(target, prop) {
      if (prop in target) return (target as Record<string | symbol, unknown>)[prop];
      if (prop === 'then') return undefined;
      return () => { throw new Error(`fake ${name}.${String(prop)} was called but not provided by the test`); };
    },
  });
}

/** Rows of a table, for Then steps. */
export const rows = <R = Record<string, unknown>>(db: Q, table: string, where = 'TRUE', params: unknown[] = []) =>
  db.query<R>(`SELECT * FROM "${table}" WHERE ${where}`, params);

// ---------------------------------------------------------------- explain_assert
const RULE = /^(AD|FR|NFR)-[A-Z0-9-]+( rule \d+)?$/;
const PASCAL = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/;

/**
 * explain_assert (review G-16): the explanation a refusal or a result carries is complete.
 * For a DomainError: the code, ≥ 1 citation whose `rule` names an AD/FR/NFR, and the observed
 * inputs. For a Decision it also checks `outcome`, a non-empty humanMessage with no PascalCase
 * token (AD-SYS-1 rule 6), and `occurredAt` = the virtual clock's instant.
 */
export function explainAssert(x: unknown, expected: { code?: string; outcome?: string; rule?: string; inputs?: Record<string, unknown>; occurredAt?: string }): void {
  const v = x as { code?: string; reasonCode?: string; outcome?: string; humanMessage?: string; occurredAt?: string; citations?: { rule: string; inputs: Record<string, unknown> }[] };
  if (expected.code) expect(v.code ?? v.reasonCode).toBe(expected.code);
  expect(Array.isArray(v.citations) && v.citations.length >= 1, 'at least one citation').toBe(true);
  const first = v.citations![0]!;
  expect(first.rule).toMatch(RULE);
  if (expected.rule) expect(first.rule).toBe(expected.rule);
  if (expected.inputs) expect(first.inputs).toMatchObject(expected.inputs);
  if (v.humanMessage !== undefined || expected.outcome) {
    if (expected.outcome) expect(v.outcome).toBe(expected.outcome);
    expect(v.humanMessage?.length ?? 0).toBeGreaterThan(0);
    expect(v.humanMessage).not.toMatch(PASCAL);
    if (expected.occurredAt) expect(v.occurredAt).toBe(expected.occurredAt);
  }
}
