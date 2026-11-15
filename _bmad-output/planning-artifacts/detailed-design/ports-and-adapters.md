---
title: "TEZG Solu-2 — Ports & Adapters map (12 modules, 9 hosts)"
status: draft — Phase 1–2 gate pending
created: 2026-10-18
phase: "Solu-2 Phase 2"
persona: "Winston (bmad-agent-architect)"
directed_by: "Mateo Rubio (Architect-lead)"
refreshed: "2026-11-06, for Impl-2 (architecture audit F9, decision log Impl-2 #34): the job runner, EmailSender, the auth and jobs routes, the TRM breaker, the clock's location and the pool size"
sources:
  - schemas/operations.json (the operation registry; every port below is generated from it)
  - contracts.md
  - _bmad-output/planning-artifacts/ARCHITECTURE.md §3 (module shape), §6 (module sections)
---

# Ports & Adapters map

Every component of the detailed design appears **exactly once** below, in exactly one layer. The registry `schemas/operations.json` is the source for:
- the inbound ports (`<Svc>V2UseCases`);
- the outbound neighbour ports (`<Provider>For<Svc>`);
- each module's dependency set (`<Svc>V2Deps`).

`node scripts/gen-solu2-api.mjs --check` fails when those files drift from the registry.

The map was refreshed for Impl-2 at its close (architecture audit F9): the rows marked *(Impl-2)* were added then, and the composition root is §1.1.

## 0. Hard rules and how each is enforced

| # | Rule (statement §5) | Enforced by |
|---|---|---|
| 1 | `domain/` imports no web framework, DB driver, wall clock, random or network | `scripts/check-domain-purity.mjs` (`npm run gate:purity`): allowed imports are `shared-kernel/{types,errors,decision,codes}` and sibling domain files; `Date.now()`, a bare `new Date()`, `performance.now()`, `Math.random()`, crypto randomness, `fetch()` and SQL `now()` fail. It was verified to fail on a probe file |
| 2 | Time and ids enter only through `Clock` and `IdGenerator` | Every `<Svc>V2Deps` carries `clock` and `ids`, and no raw `Sql` (R-14); each contract states "`Clock`, once" (contracts §0.3); the SQL has no `DEFAULT now()` and no id default (`001_tezg_schema.sql` header); the only system clock is `systemClock` in `app/_server/runtime.ts`, outside the `src/` wall-clock scan (decision log Impl-2 #2) |
| 3 | Every external interaction is behind an outbound port with a simulated adapter | `src/shared-kernel/external.ts` declares the ports, `test-support/simulated/index.ts` implements them (§1), and the NFR-SYS-3 network guard (Phase 3 `db` fixture) fails any non-Postgres socket |
| 4 | DTOs are primitive-typed | `*.v2.dto.ts` use only `string`, `number`, `boolean`, `null`, literal unions, arrays and inline objects over the `shared-kernel/types.ts` aliases. The generator's type parser rejects anything else (a class, `Date`, a generic other than `Record`), so `openapi.yaml` cannot be built from a non-primitive DTO |

## 1. Shared kernel (`src/shared-kernel/`)

| Component | Layer | Production binding (Plan-2) | Simulated binding (tests) |
|---|---|---|---|
| `Clock` (`ports.ts`) | **Outbound Port** (time) | `systemClock` in `app/_server/runtime.ts`, the only code that reads the system clock (moved out of `src/` by decision log Impl-2 #2; there is no `shared-kernel/clock/system.ts`) | `VirtualClock` (`test-support/clock.ts`), seeded at `2026-10-01T15:00:00Z` |
| `IdGenerator` (`ports.ts`) | **Outbound Port** (ids) | cuid2 | `SequentialIds` plus `id(name)` (`test-support/ids.ts`) |
| `Sql`, `Tx`, `TransactionRunner` (`ports.ts`) | **Outbound Port** (persistence transport) | pg `Pool` (`max` from `TEZG_PG_POOL_MAX`: 2 on serverless instances, the minimum and default, and 10 on long-lived servers, decision log Impl-2 #38; `connectionTimeoutMillis: 10_000`; `runtimePool()` in `src/server/db.ts`: at least one connection for a job's `job:<name>` lock and one for its work, and a starved checkout fails after 10 s instead of waiting forever; AD-SYS-4 rule 7, architecture audit F1, decision log Impl-2 #35) behind the Supabase pooler, with `db()` ambient-transaction resolution (AD-SYS-4 rule 9) | per-file Docker Postgres database (`test-support/db.ts`) |
| `OutboxV2` + `EventEnvelope` (`events.ts`) | **Outbound Port** (events) | `outbox.enqueue(tx, type, aggregateId, payload)` into `OutboxEvent`/`EventDelivery`, returning the R-1 envelope (R-14, review S-1) | `SqlOutboxV2 implements OutboxV2`, plus the `SubscriberFaults` fault injector |
| `AuditLog` (`audit.ts`) | **Outbound Port** (audit, R-2) | an insert into `audit_events` in the writer's transaction | `SqlAuditLog` (the same SQL on the test database) |
| `ObjectStorage` (`external.ts`) | **Outbound Port** (external: Supabase Storage) | Supabase signed upload URLs; private buckets | `InMemoryObjectStorage`: refuses to sign `upload-quarantine` and records every signed read |
| `MalwareScanner` (`external.ts`) | **Outbound Port** (external) | `StructuralScanner` [G-4] | `SimulatedScanner`: magic bytes, PDF names, image re-encode by end marker, and a missing end marker rejected (review S-3); `failAll` switch |
| `CatalogFeedSource` (`external.ts`) | **Outbound Port** (external: the feed, OQ-9) | the fixture feed until OQ-9 names a source | `FixtureFeedSource` over the ADD-§8 files `{ current, previous, defects, renamed }`, with the ADD-§8.3 switches `down`, `stale`, `malformedRows`, `renamedRows` (review S-2) |
| `FxRateSource` (`external.ts`) | **Outbound Port** (external: datos.gov.co TRM) | HTTP adapter in `catalog/infra/` (the only `fetch`, lint `tezg/no-direct-io`); not built yet: `compose()` binds `UNWIRED_FX`, and every call goes through the TRM breaker (§2.2) | `FixtureFxRateSource` with switches `down`, `mismatch` |
| `EmailSender` (`external.ts`) *(Impl-2, Story 2.6)* | **Outbound Port** (external: the mail provider) | `UNWIRED_EMAIL` (`server/auth.ts`): sign-up is refused before Better Auth runs while it is bound (`emailWired = false`) | `CapturingEmailSender` (`test-support/simulated/index.ts`) |
| `TopUpConfirmationPort` (`external.ts`) | **Inbound Port** (a v2 webhook or the V1 admin action drives it) | the V1 admin action | `AdminTopUpConfirmation` (forwards to COM-2 and its reject mirror) |
| `Decision`, `ExplanationDTO`, `ErrorBody` (`decision.ts`, `explanation.ts`) | **Core Domain** (shared value types) | — | — |
| `DOMAIN_ERRORS`, `DECISION_CODES` (`codes.ts`), `DomainError`, `NotImplementedError` (`errors.ts`) | **Core Domain** (registry, AD-SYS-1) | — | — |
| `AdminEventsServiceV2` (`admin-events.ts`: `replayEventDelivery`, `getDeliveryHealth`, `listDeliveries`, `getTickHealth`, `sweep`) | **Inbound Port** | shared-kernel outbox and `JobRun` owner; `getTickHealth` reads each job's last outcome, failed runs in 24 h and stuck runs (architecture audit F3) | generated stub |
| `isTickSilent`, `jobHealthWindow`, `isJobHealthDegraded`, `tickHealthReason` (`admin-events.ts`) *(Impl-2)* | **Core Domain** (pure tick and job-health rules) | — | — |
| `JobRunner` (`jobs.ts`) *(Impl-2, Story 1.6)* | **Inbound Port** (the run use case: one `JobRun` row per run, single-flight under `job:<name>`) | in-process, built by `compose()` | the same runner over in-memory ports (`job-runner.test.ts`) |
| `JobWork` (`jobs.ts`) *(Impl-2)* | **Inbound Port** (one job's work: `singleFlight`, `triggers`, `run`) | one entry per routed job in `composition.ts`, each calling one module inbound-port method (`cat.fetchTrm`, `ord.expireDueOrders` + `trd.expireDueOffers`, `com.reconcile`, `adminEvents.sweep`) | the same entries, composed on the test database |
| `JobRunRepository`, `JobLocks` (`jobs.ts`) *(Impl-2)* | **Outbound Port** | `PgJobRunRepository`, `PgJobLocks` (`infra/pg-jobs.ts`): `pg_try_advisory_xact_lock(job:<name>)` on a connection held for the run, so a job needs 2 connections, the pool's minimum (AD-SYS-4 rule 7); `release(last)` writes the run's end in the lock's transaction, so it commits with the unlock and needs no further checkout (decision log Impl-2 #35) | in-memory ports (`job-runner.test.ts`, including refused checkouts); `boundedPool(db, 2)` (`test-support/single-connection.ts`) proves the budget, and `runtimePool()` with a 200 ms checkout timeout proves a starved run fails (`[S-SYS.jobs.starved]`) |
| Dispatcher and sweeper (AD-SYS-2 rules 4–6) | **Driving Adapter** (runs subscribers after commit, and from the `outbox-sweep` job) | in-process | test dispatcher with `SubscriberFaults` (Phase 3 `sim_events`) |

### 1.1 Composition root and the HTTP driving adapters (`src/server/`, `app/`) *(Impl-2)*

| Component | Layer | File / binding | Rule |
|---|---|---|---|
| `compose()` | Composition root (no layer: it wires every adapter, service, subscriber, job and guard once) | `src/server/composition.ts`; `app/_server/runtime.ts` adds only what `src/` may not hold: `systemClock`, the log sink and the Better Auth instance | AD-SYS-6; decision log Impl-1 #24, Impl-2 #2 |
| `db()` (one pg `Pool` from `runtimePool()`: `max` from `TEZG_PG_POOL_MAX`, 2 serverless and 10 on long-lived servers; a 10 s checkout timeout; shared with Better Auth's Prisma client) | Driven Adapter (Database transport) | `src/server/db.ts` | AD-SYS-4 rules 7 and 9, ARCH §4 (architecture audit F1, decision log Impl-2 #35) |
| `/api/trpc/*` | **Driving Adapter** | `app/api/trpc/[trpc]/route.ts` → `serveTrpc` (`src/server/trpc/`); the pages call `callProcedure` through the same gate and parser | AD-SYS-8 rules 1–2 |
| `/api/jobs/<job>?trigger=…` *(Story 1.6)* | **Driving Adapter** | `app/api/jobs/[job]/route.ts` → `serveJob` (`src/server/jobs.ts`): the `JOBS_SECRET` bearer (identity's `requireJobBearer`), the job and trigger, then one `JobRunner.run`; jobs `trm-fetch`, `expiry-materialize`, `commission-reconcile`, `outbox-sweep` | S-9, AD-SYS-4 rule 7, ARCH §13 |
| `/api/auth/*` *(Story 2.6)* | **Driving Adapter** | `app/api/auth/[...all]/route.ts` → `serveAuth` (`src/server/auth-routes.ts`, the AD-IDN-3 throttle guard over identity's `checkAuthThrottle` / `recordAuthThrottleEvent`) → Better Auth (`src/server/auth.ts`, consent fields in `user.create.before`) | AD-IDN-3, AD-SYS-8 |
| `mergeModerationLogs` *(Story 13.5)* | **Driving Adapter** (UI-only composition: merges the reviews and listings moderation logs, never joins them) | `src/server/moderation-log.ts` | AD-8, AD-REP-3 |

## 2. Per host module

In every row, *file* is relative to `src/modules/<host>/`. Each **Driving Adapter** row names the tRPC procedures, subscribers or jobs, listed with their wire inputs in `openapi.yaml`. Each one calls exactly one inbound-port method, and the actor fields come from the session (`x-actor-fields-from-session`). Every module's application service reaches its own tables only through its **repository port** `<Svc>Repository` (`ports/<file>.v2.ts`, an Outbound Port; R-14, review A-4). The port is empty until each story adds the methods its contract's SQL needs. Its **Driven Adapter (Database)** is `infra/pg.ts`, which touches only that module's section of `001_tezg_schema.sql` (AD-8). No `application/*.v2.ts` imports `Sql`.

### 2.1 `identity` — IDN, VER (MSG-3 is offered here)

| Component | Layer | File / binding | Rule |
|---|---|---|---|
| Router `access` (`completeIndividualProfile`, `traceCapabilities`); router `verification` (9 procedures); the `/api/auth/*` guard (sign-in and sign-up throttle, Story 2.6, §1.1) | **Driving Adapter** | `server/trpc/`, `server/auth-routes.ts` | AD-SYS-8 rules 1–2, AD-IDN-3 |
| `IdnV2UseCases` (12 methods), `VerV2UseCases` (11 methods) | **Inbound Port** | `application/idn.v2.ts`, `application/ver.v2.ts` | contracts §1, §2, §15 |
| `deriveCapabilities`, `evaluateSubmission` (existing); NIT mod-11 check (new, VER-2 story) | **Core Domain** | `domain/idn.ts`, `domain/ver.ts` | AD-IDN-1 rule 2, AD-VER-1 |
| `IdnV2Deps`, `VerV2Deps` (no neighbour: `identity` depends on no module, AD-1); `VerV2Deps.storage`, `.scanner` | **Outbound Port** | `ports/idn.v2.ts`, `ports/ver.v2.ts` | AD-1, AD-SYS-8 rule 5 |
| `legalIdentityRepository` (the only reader of `BusinessApplicationLegalIdentity`); `PgUserRepository` | **Driven Adapter** (Database) | `infra/` | AD-VER-2 rule 1 (lint `tezg/legal-identity-confined`) |

### 2.2 `catalog` — CAT (no module dependencies)

| Component | Layer | File / binding | Rule |
|---|---|---|---|
| Router `catalog` (`feed.start`, `feed.continue`, `provenance`, `browse`, `fx.retry`, `fx.breaker`); job `trm-fetch` | **Driving Adapter** | `server/trpc/`, `app/api/jobs/` | admin guard in `server/trpc/admin-guard.ts` (Solu-1 E-23) |
| `CatV2UseCases` (14 methods, including the offered ports P-CAT.*) | **Inbound Port** | `application/cat.v2.ts` | contracts §3, §15.11 |
| `validateRow`, `diffAttributes` (existing); `copFromUsd` (shared-kernel money helper, new); the TRM breaker `admit`, `record`, `TRM_BREAKER_POLICY` *(Impl-2, Story 4.6)* | **Core Domain** | `domain/cat.ts`, `domain/breaker.ts` | AD-CAT-1, AD-CAT-2, AD-SYS-7, AD-CAT-3 rule 7 |
| `CatV2Deps` (`feed`, `fx`; no neighbour); `CatRepository`'s breaker methods `lockFxSourceBreaker` (returns `{ breaker, version }`), `saveFxSourceBreaker` (conditional on from-state and version), `readFxSourceBreaker` *(Impl-2)* | **Outbound Port** | `ports/cat.v2.ts` | AD-1 (`catalog` has no edge); AD-SYS-5 rule 1 |
| `PgCatRepository` (with the one `"FxSourceBreaker"` row, migrations 002 and 003, `SELECT … FOR UPDATE` then `UPDATE … WHERE state AND version`); the TRM HTTP adapter (not built: `UNWIRED_FX`) | **Driven Adapter** (Database / external) | `infra/` | AD-CAT-3 rules 6 and 7 |

### 2.3 `listings` — INV, DSC, MSG contact (MSG-2), REP listing moderation

| Component | Layer | File / binding | Rule |
|---|---|---|---|
| Routers `inventory` (12 procedures) and `discovery` (2); subscribers `onCommissionBalance*` (INV-3) and `onBusinessApplication*` (S-FR-INV-8) | **Driving Adapter** | `server/trpc/`, outbox subscribers | AD-INV-3 |
| `InvV2UseCases` (19), `DscV2UseCases` (3), `ContactV2UseCases` (1) | **Inbound Port** | `application/inv.v2.ts`, `dsc.v2.ts`, `contact.v2.ts` | contracts §4, §5, §9, §15 |
| `purchasable`, `availability`, `validateSearchArea`, `haversineKm`, `insideRadius`, `compareRank` (existing); `composeMessage`, `encodeWaMe`, `truncate` (new, MSG-2 story) | **Core Domain** | `domain/inv.ts`, `domain/dsc.ts` | AD-INV-3 rule 2, AD-DSC-1, AD-MSG-1 rule 4 |
| `IdentityForInv`, `CatalogForInv`; `IdentityForDsc`, `CatalogForDsc`; `IdentityForContact`, `CatalogForContact` | **Outbound Port** (neighbours) | `ports/*.v2.ts` | AD-1 (`listings → identity, catalog`) |
| `PgListingRepository`, `ContactRequestLog` limiter | **Driven Adapter** (Database) | `infra/` | AD-INV-2, AD-MSG-1 rule 3 |

### 2.4 `orders` — ORD

| Component | Layer | File / binding | Rule |
|---|---|---|---|
| Router `orders` (13 procedures); job `expiry-materialize` | **Driving Adapter** | `server/trpc/`, `app/api/jobs/` | AD-ORD-1, AD-ORD-2 rule 7 |
| `OrdV2UseCases` (14) | **Inbound Port** | `application/ord.v2.ts` | contracts §6 |
| `deriveStatus`, `paidLoserCode` (existing); the visibility predicate builder (new, S-FR-ORD-6 story) | **Core Domain** | `domain/ord.ts` | AD-ORD-2 rule 8, AD-ORD-3 rule 1 |
| `ListingsForOrd` (INV-1, S-FR-INV-5, P-INV.purchase, P-INV.units), `IdentityForOrd` (S-FR-VER-9.get); `storage`, `scanner` | **Outbound Port** | `ports/ord.v2.ts` | AD-1 (`orders → listings, identity`) |
| `PgOrderRepository` | **Driven Adapter** (Database) | `infra/pg.ts` | AD-ORD-2 CHECKs |

### 2.5 `commission` — COM

| Component | Layer | File / binding | Rule |
|---|---|---|---|
| Router `commission` (7 procedures); subscribers `onOrderPaymentConfirmedByBusiness`, `onOrderClosed` (COM-1), `onBusinessApplicationApproved` (S-FR-COM-1); job `commission-reconcile` | **Driving Adapter** | `server/trpc/`, subscribers, jobs | AD-SYS-3 |
| `ComV2UseCases` (9) | **Inbound Port** | `application/com.v2.ts` | contracts §7 |
| `commissionTrigger`, `commissionOf`, `crossing` (existing) | **Core Domain** | `domain/com.ts` | AD-SYS-3 rule 2, ADD-§2.6, AD-COM-1 rule 3 |
| `IdentityForCom` (P-IDN.capabilities, P-VER.name); `storage`, `scanner` | **Outbound Port** | `ports/com.v2.ts` | AD-1 (`commission → identity`) |
| `PgLedgerRepository` (`LedgerService.apply`) | **Driven Adapter** (Database) | `infra/pg.ts` | AD-COM-1 rules 1–2 |

### 2.6 `trading` — TRD

| Component | Layer | File / binding | Rule |
|---|---|---|---|
| Router `trading` (8 procedures); job `expiry-materialize` (offers) | **Driving Adapter** | `server/trpc/` | AD-TRD-1 |
| `TrdV2UseCases` (9) | **Inbound Port** | `application/trd.v2.ts` | contracts §8 |
| `deriveOfferStatus`, `offerActionRefusal` (which replaced `turnVerdict`, removed as dead code by decision log Impl-2 #8); `canonicalTerms` for G-1 (new, TRD-2 story) | **Core Domain** | `domain/trd.ts` | AD-TRD-1 rules 3, 5 |
| `ListingsForTrd` (P-INV.trade, P-INV.tradeability, S-FR-INV-5, P-INV.refs, MSG-2) | **Outbound Port** | `ports/trd.v2.ts` | AD-1 (`trading → listings` only; OQ-6) |
| `PgTradeRepository` | **Driven Adapter** (Database) | `infra/pg.ts` | AD-TRD-2 lock order |

### 2.7 `messaging` — MSG in-app

| Component | Layer | File / binding | Rule |
|---|---|---|---|
| Router `messaging` (5 procedures) | **Driving Adapter** | `server/trpc/` | AD-MSG-2 |
| `MsgV2UseCases` (5) | **Inbound Port** | `application/msg.v2.ts` | contracts §9, §15 |
| `normalizeBody` (existing; `sendEligibility`, never called since Story 9.2 used identity's `requireMessagingEligibility`, removed as dead code by decision log Impl-2 #19); unread and read-seq clamp (new, S-FR-MSG-7 story) | **Core Domain** | `domain/msg.ts` | AD-MSG-3 rules 1–2 |
| `IdentityForMsg` (MSG-3, P-IDN.names, P-VER.name) | **Outbound Port** | `ports/msg.v2.ts` | AD-1 (`messaging → identity`) |
| `PgConversationRepository` | **Driven Adapter** (Database) | `infra/pg.ts` | AD-MSG-2 unique keys |

### 2.8 `collections` — COL, VAL

| Component | Layer | File / binding | Rule |
|---|---|---|---|
| Routers `collections` (15 procedures) and `valuation` (3); subscriber `onOrderClosed` (COL-2) | **Driving Adapter** | `server/trpc/`, subscriber | AD-COL-2 |
| `ColV2UseCases` (15), `ValV2UseCases` (3) | **Inbound Port** | `application/col.v2.ts`, `val.v2.ts` | contracts §10, §11, §15 |
| `completionPercent`, `bogotaDate`, `isValuationPeriod`, `valueEntries`, `changePercentHundredths` (existing); `binderSort`, `validateExternal`, `series` (new, in their stories) | **Core Domain** | `domain/col.ts`, `domain/val.ts` | AD-COL-1, AD-VAL-1, AD-VAL-2 |
| `CatalogForCol`, `ListingsForCol`; `CatalogForVal` | **Outbound Port** | `ports/col.v2.ts`, `ports/val.v2.ts` | AD-1 (`collections → catalog, listings`) |
| `PgCollectionRepository` | **Driven Adapter** (Database) | `infra/pg.ts` | AD-COL-1 CHECKs |

### 2.9 `reviews` — REP

| Component | Layer | File / binding | Rule |
|---|---|---|---|
| Router `reputation` (6 procedures); the 2.2 / 3.1 RSC composition calling `getAggregates` | **Driving Adapter** | `server/trpc/`, `app/` | §2 of Plan-2: UI-only composition |
| `RepV2UseCases` (7) | **Inbound Port** | `application/rep.v2.ts` | contracts §12 |
| `averageTenths`, `reviewVerdict` (existing) | **Core Domain** | `domain/rep.ts` | AD-REP-2 rule 1 |
| `IdentityForRep` (S-FR-IDN-6.target, P-IDN.names), `OrdersForRep` (S-FR-ORD-9) | **Outbound Port** | `ports/rep.v2.ts` | AD-1 (`reviews → orders, identity`) |
| `PgReviewRepository` (no `DELETE`) | **Driven Adapter** (Database) | `infra/pg.ts` | AD-12, AD-REP-2 rule 3 |

## 3. Diagram (layer-tagged)

```mermaid
flowchart LR
  subgraph DRV["Driving Adapters «driving»"]
    trpc["tRPC routers · 90 procedures<br/>(openapi.yaml)"]
    subs["Outbox subscribers<br/>INV-3 · S-FR-INV-8 · COM-1 · S-FR-COM-1 · COL-2"]
    jobs["/api/jobs/* → JobRunner<br/>trm-fetch · expiry-materialize · commission-reconcile · outbox-sweep"]
    auth["/api/auth/* → AD-IDN-3 guard<br/>→ Better Auth"]
  end
  subgraph IN["Inbound Ports «inbound»"]
    uc["&lt;Svc&gt;V2UseCases × 14<br/>124 methods (operations.json)"]
    topup["TopUpConfirmationPort"]
  end
  subgraph CORE["Core Domain «domain» — pure, no I/O"]
    pol["deriveCapabilities · deriveStatus · commissionTrigger<br/>purchasable · distance/rank · composeMessage<br/>valueCollection · averageTenths · Decision/codes<br/>TRM breaker admit/record · tick and job health"]
  end
  subgraph OUT["Outbound Ports «outbound»"]
    nb["Neighbour ports &lt;Provider&gt;For&lt;Svc&gt;<br/>(declared by the consumer, AD-1)"]
    sys["Clock · IdGenerator · Sql/Tx · Outbox · AuditLog<br/>JobRunRepository · JobLocks"]
    ext["ObjectStorage · MalwareScanner<br/>CatalogFeedSource · FxRateSource · EmailSender"]
  end
  subgraph DRN["Driven Adapters «driven»"]
    pg[("Postgres 16<br/>001_tezg_schema.sql")]
    sim["Simulated adapters (tests)<br/>VirtualClock · SequentialIds · SqlOutboxV2 · SqlAuditLog<br/>InMemoryObjectStorage · SimulatedScanner<br/>FixtureFeedSource · FixtureFxRateSource · CapturingEmailSender"]
    prod["Production adapters (Plan-2 §4)<br/>pg pool (max 2 serverless, 10 long-lived) · systemClock (app/_server/runtime.ts)<br/>Supabase Storage · StructuralScanner · datos.gov.co · mail"]
  end
  trpc --> uc
  subs --> uc
  jobs --> uc
  auth --> uc
  topup --> uc
  uc --> pol
  uc --> nb
  uc --> sys
  uc --> ext
  nb -. "bound at the composition root to the provider's «inbound» port" .-> uc
  sys --> pg
  sys --> sim
  ext --> sim
  sys --> prod
  ext --> prod
```

## 4. Dependency edges the ports realize (AD-1, unchanged)

`listings → identity, catalog` · `orders → listings, identity` · `commission → identity` · `trading → listings` · `messaging → identity` · `collections → catalog, listings` · `reviews → orders, identity`. `catalog` and `identity` depend on no module. The dashed edges of AD-1 are events only (`events.md`). The generator derives each `<Provider>For<Svc>` from the registry's `consumers`, and every resulting edge is in this list. A consumer that named an edge outside it would show up as a new neighbour interface in review, and as an import of `../../<host>/index.js` in the generated port file.
