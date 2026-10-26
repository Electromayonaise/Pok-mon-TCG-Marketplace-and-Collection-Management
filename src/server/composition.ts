// The production composition root (AD-SYS-1, decision log Impl-1 #24): one pg pool → the
// Postgres adapters → the services → the router whose wired resolvers call them. The clock comes
// from app/ (AD-SYS-6) and the session reader from Better Auth, so a test binds both.
import type pg from 'pg';
import { IdentityGateV2, IdnServiceV2, PgIdnRepository, PgLegalIdentityRepository, PgVerRepository, VerServiceV2, type SessionReader } from '../modules/identity/index.js';
import { AdminEventsServiceV2 } from '../shared-kernel/admin-events.js';
import { OutboxDispatcherV2, type DeliveryHandler, type SubscriberName } from '../shared-kernel/dispatcher.js';
import { NotImplementedError } from '../shared-kernel/errors.js';
import type { MalwareScanner, ObjectStorage } from '../shared-kernel/external.js';
import { CuidIds } from '../shared-kernel/infra/cuid-ids.js';
import { PgAdminEventsRepository } from '../shared-kernel/infra/pg-admin-events.js';
import { PgAuditLog } from '../shared-kernel/infra/pg-audit.js';
import { PgOutboxV2 } from '../shared-kernel/infra/pg-outbox.js';
import { PgTransactionRunner } from '../shared-kernel/infra/pg-transactions.js';
import type { Clock } from '../shared-kernel/ports.js';
import { oneRepository } from '../shared-kernel/repositories.js';
import { buildAppRouter, type Resolvers } from './trpc/router.v2.js';

/** The subscribers' handlers belong to their stories (commission, listings, collections); until then a replay records `failed`. */
const UNWIRED_HANDLERS: Record<SubscriberName, DeliveryHandler> = {
  commission: async () => { throw new NotImplementedError('commission.handleEvent'); },
  listings: async () => { throw new NotImplementedError('listings.handleEvent'); },
  collections: async () => { throw new NotImplementedError('collections.handleEvent'); },
};

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

export interface AppDeps {
  pool: pg.Pool;
  clock: Clock;
  sessions: SessionReader;
  handlers?: Record<SubscriberName, DeliveryHandler>;
  storage?: ObjectStorage;
  scanner?: MalwareScanner;
}

/**
 * The procedures whose contracts the done stories implement: IDN-1.ingress (Story 2.1),
 * IDN-3 (Story 2.5), S-SYS.replay (Story 1.3), S-SYS.tick, .deliveries, .health
 * (Story 1.5) and VER-2 (Story 3.1). Every other procedure stays NotImplemented until its story wires it.
 */
function resolvers(s: { idn: IdnServiceV2; ver: VerServiceV2; adminEvents: AdminEventsServiceV2 }): Resolvers {
  return {
    'access.completeIndividualProfile': (input, userId) => s.idn.completeIndividualProfile({ ...input, userId }),
    'access.traceCapabilities': (input, adminId) => s.idn.traceCapabilities({ ...input, adminId }),
    'verification.submit': (input, businessId) => s.ver.submitApplication({ ...input, businessId }),
    'admin.events.replay': (input, adminId) => s.adminEvents.replayEventDelivery({ ...input, adminId }),
    'admin.jobs.tickHealth': (_input, adminId) => s.adminEvents.getTickHealth({ adminId }),
    'admin.events.deliveries': (input, adminId) => s.adminEvents.listDeliveries({ ...input, adminId }),
    'admin.events.deliveryHealth': (_input, adminId) => s.adminEvents.getDeliveryHealth({ adminId }),
  };
}

export function compose({ pool, clock, sessions, handlers = UNWIRED_HANDLERS, storage = UNWIRED_STORAGE, scanner = UNWIRED_SCANNER }: AppDeps) {
  const ids = new CuidIds();
  const transactions = new PgTransactionRunner(pool);
  const outbox = new PgOutboxV2(ids, clock);
  const audit = new PgAuditLog(ids, clock);
  // The one repository object every service receives (R-14).
  const repo = oneRepository(new PgAdminEventsRepository(), new PgIdnRepository(), new PgVerRepository(), new PgLegalIdentityRepository());
  const idn = new IdnServiceV2({ repo, transactions, clock, ids, outbox, audit });
  const ver = new VerServiceV2({ repo, transactions, clock, ids, outbox, audit, storage, scanner });
  const dispatcher = new OutboxDispatcherV2({ transactions, clock }, handlers);
  const adminEvents = new AdminEventsServiceV2({ repo, transactions, clock, ids, outbox, audit, dispatcher });
  return {
    identity: new IdentityGateV2({ sessions, repo, transactions, idn }),
    router: buildAppRouter(resolvers({ idn, ver, adminEvents })),
  };
}
