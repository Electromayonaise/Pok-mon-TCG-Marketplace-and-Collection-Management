// The production composition root (AD-SYS-1, decision log Impl-1 #24): one pg pool → the
// Postgres adapters → the services → the router whose wired resolvers call them. The clock comes
// from app/ (AD-SYS-6) and the session reader from Better Auth, so a test binds both.
import type pg from 'pg';
import { CatServiceV2, PgCatRepository } from '../modules/catalog/index.js';
import { ComServiceV2, PgComRepository } from '../modules/commission/index.js';
import { ContactServiceV2, DscServiceV2, InvServiceV2, PgContactRepository, PgDscRepository, PgInvRepository } from '../modules/listings/index.js';
import { MsgServiceV2, PgMsgRepository } from '../modules/messaging/index.js';
import { PgTrdRepository, TrdServiceV2 } from '../modules/trading/index.js';
import { OrdServiceV2, PgOrdRepository } from '../modules/orders/index.js';
import { IdentityGateV2, IdnServiceV2, PgIdnRepository, PgLegalIdentityRepository, PgVerRepository, VerServiceV2, type SessionReader } from '../modules/identity/index.js';
import { AdminEventsServiceV2 } from '../shared-kernel/admin-events.js';
import { OutboxDispatcherV2, type DeliveryHandler, type SubscriberName } from '../shared-kernel/dispatcher.js';
import { NotImplementedError, UnexpectedError } from '../shared-kernel/errors.js';
import type { EventPayloads } from '../shared-kernel/events.js';
import type { CatalogFeedSource, FxRateSource, MalwareScanner, ObjectStorage } from '../shared-kernel/external.js';
import { CuidIds } from '../shared-kernel/infra/cuid-ids.js';
import { PgAdminEventsRepository } from '../shared-kernel/infra/pg-admin-events.js';
import { PgAuditLog } from '../shared-kernel/infra/pg-audit.js';
import { PgOutboxV2 } from '../shared-kernel/infra/pg-outbox.js';
import { PgTransactionRunner } from '../shared-kernel/infra/pg-transactions.js';
import type { Clock } from '../shared-kernel/ports.js';
import { oneRepository } from '../shared-kernel/repositories.js';
import { requestIpHmac } from './ip-hmac.js';
import { buildAppRouter, type Resolvers } from './trpc/router.v2.js';

/**
 * The subscribers' handlers belong to their stories (collections); until then a replay records
 * `failed`. `listings` (Story 5.5) and `commission` (Story 8.1) are wired by `compose()`.
 */
const UNWIRED_HANDLERS: Omit<Record<SubscriberName, DeliveryHandler>, 'listings' | 'commission'> = {
  collections: async () => { throw new NotImplementedError('collections.handleEvent'); },
};

/**
 * The `commission` subscriber (Stories 8.1 and 8.2): each delivery runs S-FR-COM-1 or COM-1 in the handler's transaction,
 * from the envelope's payload only (AD-9).
 */
function commissionHandler(com: ComServiceV2): DeliveryHandler {
  return async (tx, envelope) => {
    switch (envelope.type) {
      case 'BusinessApplicationApproved': {
        const { businessId, approvedAt } = envelope.payload as EventPayloads['BusinessApplicationApproved'];
        await com.openCommissionAccount(tx, { businessId, approvedAt });
        return;
      }
      case 'OrderPaymentConfirmedByBusiness':
      case 'OrderClosed': {
        const { orderId, businessId, totalCop, sellerReceivedConfirmedAt, buyerItemReceivedConfirmedAt } = envelope.payload as EventPayloads['OrderClosed'];
        await com.applyOrderDeduction(tx, { type: envelope.type, orderId, businessId, totalCop, sellerReceivedConfirmedAt, buyerItemReceivedConfirmedAt });
        return;
      }
      default:
        throw new UnexpectedError(`commission has no subscriber for ${envelope.type}`);
    }
  };
}

/**
 * The `listings` subscriber (Story 5.5): each delivery runs INV-3 or S-FR-INV-8 in the handler's
 * transaction, from the envelope's payload only (AD-9).
 */
function listingsHandler(inv: InvServiceV2): DeliveryHandler {
  return async (tx, envelope) => {
    switch (envelope.type) {
      case 'CommissionBalanceExhausted':
      case 'CommissionBalanceReplenished': {
        const { businessId, ledgerSeq, balanceAfter } = envelope.payload as EventPayloads['CommissionBalanceExhausted'];
        await inv.applyCommissionProjection(tx, { type: envelope.type, businessId, ledgerSeq, balanceAfter });
        return;
      }
      case 'BusinessApplicationApproved': {
        const { applicationId, businessId, approvedAt } = envelope.payload as EventPayloads['BusinessApplicationApproved'];
        await inv.applyApplicationDecision(tx, { type: envelope.type, applicationId, businessId, decidedAt: approvedAt });
        return;
      }
      case 'BusinessApplicationRejected': {
        const { applicationId, businessId, rejectedAt } = envelope.payload as EventPayloads['BusinessApplicationRejected'];
        await inv.applyApplicationDecision(tx, { type: envelope.type, applicationId, businessId, decidedAt: rejectedAt });
        return;
      }
      default:
        throw new UnexpectedError(`listings has no subscriber for ${envelope.type}`);
    }
  };
}

/**
 * The production object storage and malware scanner need a provider and a dependency approval
 * (deferred-work.md); until then a submit that reaches them fails as NotImplemented, not silently.
 */
const UNWIRED_STORAGE: ObjectStorage = {
  createUploadTicket: async () => { throw new NotImplementedError('storage.createUploadTicket'); },
  get: async () => { throw new NotImplementedError('storage.get'); },
  put: async () => { throw new NotImplementedError('storage.put'); },
  delete: async () => { throw new NotImplementedError('storage.delete'); },
  sign: async () => { throw new NotImplementedError('storage.sign'); },
};
const UNWIRED_SCANNER: MalwareScanner = {
  scan: async () => { throw new NotImplementedError('scanner.scan'); },
};

/**
 * No production catalog feed exists (OQ-9 names a fixture) and the datos.gov.co TRM adapter is not
 * built (deferred-work.md); until they land, a continue or a TRM fetch fails as NotImplemented.
 */
const UNWIRED_FEED: CatalogFeedSource = {
  openRun: async () => { throw new NotImplementedError('feed.openRun'); },
  readRows: async () => { throw new NotImplementedError('feed.readRows'); },
};
const UNWIRED_FX: FxRateSource = {
  getRateCovering: async () => { throw new NotImplementedError('fx.getRateCovering'); },
};

/** zod gives an absent optional key as `undefined`; the DTOs leave it out (exactOptionalPropertyTypes). */
function defined<T extends object>(input: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> };
}

export interface AppDeps {
  pool: pg.Pool;
  clock: Clock;
  sessions: SessionReader;
  /** Overrides per subscriber; `listings` and `commission` default to their real handlers, the others to UNWIRED_HANDLERS. */
  handlers?: Partial<Record<SubscriberName, DeliveryHandler>>;
  storage?: ObjectStorage;
  scanner?: MalwareScanner;
  feed?: CatalogFeedSource;
  fx?: FxRateSource;
  /** S-7: the key of the caller IP's HMAC; without one no request names an IP, so MSG-2's per-IP limit is skipped. */
  ipHmacKey?: string;
}

/**
 * The procedures whose contracts the done stories implement: IDN-1.ingress (Story 2.1),
 * IDN-3 (Story 2.5), S-SYS.replay (Story 1.3), S-SYS.tick, .deliveries, .health
 * (Story 1.5), VER-2 (Story 3.1), VER-1 (Story 3.2), VER-3 and S-FR-VER-5.audit (Story 3.4) and
 * S-FR-VER-2, -7, -8, -9 (Story 3.5), CAT-1, CAT-2.ingress and CAT-1.runs (Story 4.1) CAT-2.quarantine (Story 4.2), CAT-3 and S-FR-CAT-8.fetch (Story 4.4), S-FR-CAT-1 (Story 4.5), INV-2 (Story 5.1), S-FR-INV-2, -9 and -10 (Story 5.6), DSC-1 (Story 6.2), DSC-2 (Story 6.3), ORD-1 and S-FR-ORD-2 (Story 7.1), ORD-2, -3 and -4 (Story 7.2), S-FR-ORD-6, -7, -9 and -10 (Story 7.5; S-FR-ORD-8 has no jobs route yet), S-FR-COM-2 and -9 (Story 8.1, with the commission subscriber, which runs COM-1 for Story 8.2), COM-2, COM-2.reject and COM-2.queue (Story 8.3), MSG-1 (Story 9.2) and MSG-2 (Story 9.3). Every other procedure stays NotImplemented until its story wires it.
 */
function resolvers(s: { idn: IdnServiceV2; ver: VerServiceV2; cat: CatServiceV2; inv: InvServiceV2; dsc: DscServiceV2; ord: OrdServiceV2; com: ComServiceV2; msg: MsgServiceV2; contact: ContactServiceV2; trd: TrdServiceV2; adminEvents: AdminEventsServiceV2 }): Resolvers {
  return {
    'access.completeIndividualProfile': (input, userId) => s.idn.completeIndividualProfile({ ...input, userId }),
    'access.traceCapabilities': (input, adminId) => s.idn.traceCapabilities({ ...input, adminId }),
    'verification.submit': (input, businessId) => s.ver.submitApplication({ ...input, businessId }),
    'verification.approve': ({ applicationId }, adminId) => s.ver.decideApplication({ applicationId, decision: { kind: 'approve' }, adminId }),
    'verification.reject': ({ applicationId, reasonCode, note }, adminId) =>
      s.ver.decideApplication({ applicationId, decision: { kind: 'reject', reasonCode, note }, adminId }),
    // An authed builder, not admin: a non-admin's attempt must reach the service to be logged (AD-VER-2).
    'verification.getApplicationForReview': ({ applicationId }, actorId) => s.ver.getApplicationForReview({ applicationId, actorId }),
    'verification.legalIdentityAudit': ({ cursor, applicationId }, adminId) =>
      s.ver.listLegalIdentityAccess({ cursor, adminId, ...(applicationId ? { applicationId } : {}) }),
    'verification.queue': ({ cursor }, adminId) => s.ver.listReviewQueue({ cursor, adminId }),
    'verification.myStatus': (_input, businessId) => s.ver.getMyApplicationStatus({ businessId }),
    'verification.reasons.list': (_input, adminId) => s.ver.listRejectionReasons({ adminId }),
    'verification.reasons.upsert': (input, adminId) => s.ver.upsertRejectionReason({ ...input, adminId }),
    'verification.reasons.setActive': (input, adminId) => s.ver.setRejectionReasonActive({ ...input, adminId }),
    'verification.updatePaymentInstructions': ({ instructions }, businessId) => s.ver.updatePaymentInstructions({ instructions, businessId }),
    'catalog.feed.start': (_input, actorId) => s.cat.startFeedRun({ actorId }),
    'catalog.feed.continue': ({ runId }, actorId) => s.cat.continueFeedRun({ actorId, runId }),
    'catalog.feed.runs': ({ cursor }, actorId) => s.cat.listFeedRuns({ actorId, cursor }),
    'catalog.provenance': (input) => s.cat.getPriceProvenance(input),
    'catalog.browse': ({ filters, page, pageSize }) => s.cat.browseCatalog({ filters: defined(filters), page, pageSize }),
    'catalog.fx.retry': () => s.cat.fetchTrm({ trigger: 'admin' }),
    'catalog.feed.quarantine': ({ runId, reasonCode, cursor }, actorId) => s.cat.listQuarantinedRows({ actorId, runId, cursor, ...(reasonCode ? { reasonCode } : {}) }),
    'inventory.create': (input, sellerId) => s.inv.createListing({ ...input, sellerId }),
    'inventory.createBundle': (input, sellerId) => s.inv.createBundle({ ...input, sellerId }),
    // A public procedure has no session actor: a reader is never the owner here (the owner reads through `inventory.mine`).
    'inventory.get': ({ listingId }) => s.inv.getListing({ listingId, actorId: null }),
    'inventory.mine': ({ cursor }, sellerId) => s.inv.listMyListings({ sellerId, cursor }),
    'inventory.update': ({ listingId, expectedVersion, changes }, actorId) => s.inv.updateListing({ actorId, listingId, expectedVersion, changes: defined(changes) }),
    'inventory.restock': ({ listingId, delta }, actorId) => s.inv.restockListing({ actorId, listingId, delta }),
    'inventory.deactivate': ({ listingId }, actorId) => s.inv.setListingActive({ actorId, listingId, active: false }),
    'inventory.reactivate': ({ listingId }, actorId) => s.inv.setListingActive({ actorId, listingId, active: true }),
    'discovery.search': ({ catalogFilters, area, ...rest }) => s.dsc.search({ ...defined(rest), ...(catalogFilters ? { catalogFilters: defined(catalogFilters) } : {}), ...(area ? { area } : {}) }),
    'discovery.cardDetail': ({ catalogEntryId, area }) => s.dsc.getCardDetail({ catalogEntryId, area }),
    'orders.create': ({ listingId, qty }, buyerId) => s.ord.createOrder({ listingId, qty, buyerId }),
    'orders.createComprobanteUpload': ({ orderId }, buyerId) => s.ord.createComprobanteUpload({ orderId, buyerId }),
    'orders.uploadComprobante': ({ orderId, uploadKey }, buyerId) => s.ord.uploadComprobante({ orderId, buyerId, uploadKey }),
    'orders.comprobanteUrl': ({ orderId }, actorId) => s.ord.getComprobanteUrl({ orderId, actorId }),
    'orders.confirmPaid': ({ orderId }, buyerId) => s.ord.confirmPaid({ orderId, buyerId }),
    'orders.confirmPaymentReceived': ({ orderId }, businessId) => s.ord.confirmPaymentReceived({ orderId, businessId }),
    'orders.confirmItemReceived': ({ orderId }, buyerId) => s.ord.confirmItemReceived({ orderId, buyerId }),
    'orders.get': ({ orderId }, actorId) => s.ord.getOrder({ orderId, actorId }),
    'orders.mine': ({ cursor }, actorId) => s.ord.listOrders({ actorId, side: 'purchases', cursor }),
    'orders.sales': ({ cursor }, actorId) => s.ord.listOrders({ actorId, side: 'sales', cursor }),
    'orders.cancel': ({ orderId }, buyerId) => s.ord.cancelOrder({ orderId, buyerId }),
    'orders.adminLookup': ({ query }, adminId) => s.ord.adminLookupOrders({ adminId, query: defined(query) }),
    'orders.supportContact.get': () => s.ord.getSupportContact(),
    'orders.supportContact.set': ({ contact }, adminId) => s.ord.setSupportContact({ adminId, contact }),
    'commission.createTopUpProofUpload': (_input, businessId) => s.com.createTopUpProofUpload({ businessId }),
    'commission.requestTopUp': (input, businessId) => s.com.requestTopUp({ ...input, businessId }),
    'commission.myAccount': (_input, businessId) => s.com.getMyCommissionAccount({ businessId }),
    'commission.myTopUps': ({ cursor }, businessId) => s.com.listMyTopUps({ businessId, cursor }),
    'commission.topUpProofUrl': ({ topUpRequestId }, actorId) => s.com.getTopUpProofUrl({ topUpRequestId, actorId }),
    'commission.admin.confirmTopUp': ({ topUpRequestId }, adminId) => s.com.confirmTopUp({ topUpRequestId, adminId }),
    'commission.admin.rejectTopUp': ({ topUpRequestId, reason }, adminId) => s.com.rejectTopUp({ topUpRequestId, reason, adminId }),
    'commission.admin.topUpQueue': ({ cursor }, adminId) => s.com.listTopUpQueue({ adminId, cursor }),
    'inventory.contact': ({ listingId }, requesterId, { ipHmac }) => s.contact.generateContactMessage({ kind: 'purchase', listingId, requesterId, tradeSummary: null, ipHmac }),
    'messaging.send': ({ target, body, clientMessageId }, senderId) => s.msg.sendMessage({ target, body, clientMessageId, senderId }),
    'trading.offer': ({ listingId, terms }, proposerId) => s.trd.makeOffer({ listingId, terms, proposerId }),
    'trading.counter': ({ offerId, terms, expectedVersion }, actorId) => s.trd.counterOffer({ offerId, terms, expectedVersion, actorId }),
    'trading.accept': ({ offerId, expectedVersion }, sellerId) => s.trd.acceptOffer({ offerId, expectedVersion, sellerId }),
    'trading.handoff': ({ offerId }, actorId) => s.trd.getHandoff({ offerId, actorId }),
    'trading.cancel': ({ offerId }, actorId) => s.trd.cancelTrade({ offerId, actorId }),
    'trading.confirmCompletion': ({ offerId }, actorId) => s.trd.confirmCompletion({ offerId, actorId }),
    'trading.reject': ({ offerId, expectedVersion }, actorId) => s.trd.resolveOffer({ offerId, expectedVersion, actorId, action: 'reject' }),
    'trading.withdraw': ({ offerId, expectedVersion }, actorId) => s.trd.resolveOffer({ offerId, expectedVersion, actorId, action: 'withdraw' }),
    'trading.get': ({ offerId }, actorId) => s.trd.getOffer({ offerId, actorId }),
    'trading.mine': ({ side, status, cursor }, actorId) => s.trd.listMyOffers({ actorId, side, cursor, ...(status ? { status } : {}) }),
    'admin.events.replay': (input, adminId) => s.adminEvents.replayEventDelivery({ ...input, adminId }),
    'admin.jobs.tickHealth': (_input, adminId) => s.adminEvents.getTickHealth({ adminId }),
    'admin.events.deliveries': (input, adminId) => s.adminEvents.listDeliveries({ ...input, adminId }),
    'admin.events.deliveryHealth': (_input, adminId) => s.adminEvents.getDeliveryHealth({ adminId }),
  };
}

export function compose({
  pool, clock, sessions, handlers = {}, storage = UNWIRED_STORAGE, scanner = UNWIRED_SCANNER, feed = UNWIRED_FEED, fx = UNWIRED_FX, ipHmacKey,
}: AppDeps) {
  const ids = new CuidIds();
  const transactions = new PgTransactionRunner(pool);
  const outbox = new PgOutboxV2(ids, clock);
  const audit = new PgAuditLog(ids, clock);
  // The one repository object every service receives (R-14).
  const repo = oneRepository(new PgAdminEventsRepository(), new PgIdnRepository(), new PgVerRepository(), new PgLegalIdentityRepository(), new PgCatRepository(), new PgInvRepository(), new PgDscRepository(), new PgContactRepository(), new PgOrdRepository(), new PgComRepository(), new PgMsgRepository(), new PgTrdRepository());
  const idn = new IdnServiceV2({ repo, transactions, clock, ids, outbox, audit });
  const ver = new VerServiceV2({ repo, transactions, clock, ids, outbox, audit, storage, scanner });
  const cat = new CatServiceV2({ repo, transactions, clock, ids, outbox, audit, feed, fx });
  const inv = new InvServiceV2({ repo, transactions, clock, ids, outbox, audit, catalog: cat, identity: idn });
  const dsc = new DscServiceV2({ repo, transactions, clock, ids, outbox, audit, catalog: cat, identity: idn });
  const ord = new OrdServiceV2({ repo, transactions, clock, ids, outbox, audit, storage, scanner, listings: inv, identity: ver });
  // COM's identity port spans IDN (P-IDN.capabilities) and VER (P-VER.name).
  const com = new ComServiceV2({
    repo, transactions, clock, ids, outbox, audit, storage, scanner,
    identity: { getCapabilities: (input) => idn.getCapabilities(input), getBusinessName: (input) => ver.getBusinessName(input) },
  });
  const contact = new ContactServiceV2({ repo, transactions, clock, ids, outbox, audit, catalog: cat, identity: idn });
  // MSG's identity port spans IDN (P-IDN.names) and VER (P-VER.name, MSG-3).
  const msg = new MsgServiceV2({
    repo, transactions, clock, ids, outbox, audit,
    identity: {
      getDisplayNames: (input) => idn.getDisplayNames(input),
      getBusinessName: (input) => ver.getBusinessName(input),
      requireMessagingEligibility: (input) => ver.requireMessagingEligibility(input),
    },
  });
  // TRD's listings port spans INV (P-INV.trade surface) and the contact service (MSG-2's trade path).
  const trd = new TrdServiceV2({
    repo, transactions, clock, ids, outbox, audit,
    listings: {
      getTradeability: (tx, input) => inv.getTradeability(tx, input),
      reserveForTrade: (tx, input) => inv.reserveForTrade(tx, input),
      releaseReservation: (tx, input) => inv.releaseReservation(tx, input),
      resolveItemRefs: (input) => inv.resolveItemRefs(input),
      generateContactMessage: (input) => contact.generateContactMessage(input),
    },
  });
  const dispatcher = new OutboxDispatcherV2({ transactions, clock }, { ...UNWIRED_HANDLERS, listings: listingsHandler(inv), commission: commissionHandler(com), ...handlers });
  const adminEvents = new AdminEventsServiceV2({ repo, transactions, clock, ids, outbox, audit, dispatcher });
  return {
    identity: new IdentityGateV2({ sessions, repo, transactions, idn }),
    ipHmac: ipHmacKey ? requestIpHmac(ipHmacKey) : () => null,
    router: buildAppRouter(resolvers({ idn, ver, cat, inv, dsc, ord, com, msg, contact, trd, adminEvents })),
  };
}
