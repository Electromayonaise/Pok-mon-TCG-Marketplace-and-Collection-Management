// The production composition root (AD-SYS-1, decision log Impl-1 #24): one pg pool → the
// Postgres adapters → the services → the router whose wired resolvers call them. The clock comes
// from app/ (AD-SYS-6) and the session reader from Better Auth, so a test binds both.
import type pg from 'pg';
import { CatServiceV2, PgCatRepository } from '../modules/catalog/index.js';
import { DscServiceV2, InvServiceV2, PgDscRepository, PgInvRepository } from '../modules/listings/index.js';
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
import { buildAppRouter, type Resolvers } from './trpc/router.v2.js';

/**
 * The subscribers' handlers belong to their stories (commission, collections); until then a replay records
 * `failed`. `listings` is wired by `compose()` (Story 5.5).
 */
const UNWIRED_HANDLERS: Omit<Record<SubscriberName, DeliveryHandler>, 'listings'> = {
  commission: async () => { throw new NotImplementedError('commission.handleEvent'); },
  collections: async () => { throw new NotImplementedError('collections.handleEvent'); },
};

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
  /** Overrides per subscriber; `listings` defaults to its real handler, the others to UNWIRED_HANDLERS. */
  handlers?: Partial<Record<SubscriberName, DeliveryHandler>>;
  storage?: ObjectStorage;
  scanner?: MalwareScanner;
  feed?: CatalogFeedSource;
  fx?: FxRateSource;
}

/**
 * The procedures whose contracts the done stories implement: IDN-1.ingress (Story 2.1),
 * IDN-3 (Story 2.5), S-SYS.replay (Story 1.3), S-SYS.tick, .deliveries, .health
 * (Story 1.5), VER-2 (Story 3.1), VER-1 (Story 3.2), VER-3 and S-FR-VER-5.audit (Story 3.4) and
 * S-FR-VER-2, -7, -8, -9 (Story 3.5), CAT-1, CAT-2.ingress and CAT-1.runs (Story 4.1) CAT-2.quarantine (Story 4.2), CAT-3 and S-FR-CAT-8.fetch (Story 4.4), S-FR-CAT-1 (Story 4.5), INV-2 (Story 5.1), S-FR-INV-2, -9 and -10 (Story 5.6), and DSC-1 (Story 6.2). Every other procedure stays NotImplemented until its story wires it.
 */
function resolvers(s: { idn: IdnServiceV2; ver: VerServiceV2; cat: CatServiceV2; inv: InvServiceV2; dsc: DscServiceV2; adminEvents: AdminEventsServiceV2 }): Resolvers {
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
    'admin.events.replay': (input, adminId) => s.adminEvents.replayEventDelivery({ ...input, adminId }),
    'admin.jobs.tickHealth': (_input, adminId) => s.adminEvents.getTickHealth({ adminId }),
    'admin.events.deliveries': (input, adminId) => s.adminEvents.listDeliveries({ ...input, adminId }),
    'admin.events.deliveryHealth': (_input, adminId) => s.adminEvents.getDeliveryHealth({ adminId }),
  };
}

export function compose({
  pool, clock, sessions, handlers = {}, storage = UNWIRED_STORAGE, scanner = UNWIRED_SCANNER, feed = UNWIRED_FEED, fx = UNWIRED_FX,
}: AppDeps) {
  const ids = new CuidIds();
  const transactions = new PgTransactionRunner(pool);
  const outbox = new PgOutboxV2(ids, clock);
  const audit = new PgAuditLog(ids, clock);
  // The one repository object every service receives (R-14).
  const repo = oneRepository(new PgAdminEventsRepository(), new PgIdnRepository(), new PgVerRepository(), new PgLegalIdentityRepository(), new PgCatRepository(), new PgInvRepository(), new PgDscRepository());
  const idn = new IdnServiceV2({ repo, transactions, clock, ids, outbox, audit });
  const ver = new VerServiceV2({ repo, transactions, clock, ids, outbox, audit, storage, scanner });
  const cat = new CatServiceV2({ repo, transactions, clock, ids, outbox, audit, feed, fx });
  const inv = new InvServiceV2({ repo, transactions, clock, ids, outbox, audit, catalog: cat, identity: idn });
  const dsc = new DscServiceV2({ repo, transactions, clock, ids, outbox, audit, catalog: cat, identity: idn });
  const dispatcher = new OutboxDispatcherV2({ transactions, clock }, { ...UNWIRED_HANDLERS, listings: listingsHandler(inv), ...handlers });
  const adminEvents = new AdminEventsServiceV2({ repo, transactions, clock, ids, outbox, audit, dispatcher });
  return {
    identity: new IdentityGateV2({ sessions, repo, transactions, idn }),
    router: buildAppRouter(resolvers({ idn, ver, cat, inv, dsc, adminEvents })),
  };
}
