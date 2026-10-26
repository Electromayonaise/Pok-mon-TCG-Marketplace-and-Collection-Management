---
title: "TEZG Architecture v2 — Solu-2 delta over Plan-2"
status: approved — Solu-2 complete (tag solu2-ready)
base: _bmad-output/planning-artifacts/ARCHITECTURE.md
created: 2026-10-18
phase: "Solu-2 Phase 0 (stack); links completed in Phase 5"
---

# TEZG Architecture v2 — Solu-2 delta

This document is a **delta** over [`_bmad-output/planning-artifacts/ARCHITECTURE.md`](ARCHITECTURE.md). Every AD there (AD-1..19, AD-SYS-1..8, AD-<CODE>-n) stays binding and keeps its number. This file records only:
- the stack the Solu-2 detailed design and test harness run on;
- refinements accepted at the Solu-2 gates, each traced to its review finding;
- in Phase 5, the links to the detailed design.

## Stack Decisions

1. **Language and runtime:** TypeScript 7.0.2 in strict mode on Node.js 22 (`.nvmrc`). The application services are tRPC 11 procedures over hexagonal modules (Plan-2 §3–§4). Ids are cuid2 and are issued only by the `IdGenerator` port.
2. **Persistence:** PostgreSQL 16.6, Docker Compose locally and in CI. The SQL DDL is the detailed design's schema source of truth; the Prisma 7.6 model is generated from it at implementation time (review G-13). Invariants are enforced by CHECKs, partial unique indexes, composite FKs, grants and conditional `UPDATE`s, all under READ COMMITTED (AD-SYS-4, AD-SYS-5).
3. **Time:** the `Clock` port is mandatory. Domain code, SQL and tests never read the wall clock (AD-SYS-6 rule 1). Each transaction takes `now` once from `Clock` and passes it as a parameter. Tests use the virtual clock seeded at `2026-10-01T15:00:00Z`.
4. **External dependencies:** every external system sits behind an outbound port with a simulated driven adapter: catalog feed, TRM, object storage, malware scanner, top-up confirmation, event bus. The adapters use fixtures and fault switches, and a network guard fails any socket opened to a host other than the test Postgres (NFR-SYS-3).
5. **Tests:** Vitest 5.0.5 and fast-check 4.10.2, against a real Postgres. Each test file gets its own database, cloned from a migrated template. ATDD suites are red for the right reason (`NotImplementedError`), and GitHub Actions runs the quality gate.

## Refinements accepted at the Solu-2 gates

Each row cites the review finding and the decision-log entry. The detailed design (Phases 1–2) implements them; this table is where an implementer finds that a Plan-2 rule was refined.

| # | Refinement | Refines | Source |
|---|---|---|---|
| R-1 | Every event has an envelope `{ eventId, type, occurredAt, schemaVersion, payload }`. `eventId` = `OutboxEvent.id`; `occurredAt` = the publishing transaction's `Clock` instant (the row's `createdAt`); `schemaVersion` is an integer per type, starting at 1. Payloads are unchanged | AD-SYS-2 rule 2; AD-9 holds | G-01; Solu-2 #6 |
| R-2 | `shared-kernel` also owns `audit_events`: append-only, with `UPDATE`/`DELETE` revoked, written only through `AuditLog.record(tx, entry)` in the writer's transaction, by every core-operation state transition and every admin action. The ten per-module audit tables of AD-SYS-8 rule 10 stay | AD-SYS-2 rule 10 (the shared-kernel table list); AD-8 | G-04; Solu-2 #6 |
| R-3 | Mutable tables carry `createdAt` and `updatedAt`, `NOT NULL`, with no default, both set from the transaction's `Clock` instant. Append-only and immutable tables carry `createdAt` only | AD-SYS-6 rule 2 | G-05; Solu-2 #6 |
| R-4 | A business confirming an order not yet paid gets `OrderNotVisibleToCaller` (403), with a body identical to an unknown id. `OrderConfirmationOutOfOrder` is the buyer's item-before-paid only | AD-ORD-2 rule 3, with AD-ORD-3 rule 1 | G-07; Solu-2 #6 |
| R-5 | `Order.cancelReason ∈ {'Unpaid', 'BuyerCancelled'}`. Expiry writes `'Unpaid'`; buyer cancel writes `'BuyerCancelled'` | AD-ORD-2 rule 6 | G-08; Solu-2 #6 |
| R-6 | Trade actions take `expectedVersion` from the rendered offer; the predicate's `version = :v` binds it | AD-TRD-1 rule 1 | G-09; Solu-2 #6 |
| R-7 | `commission.requestTopUp` refuses with `CommissionAccountNotOpen` (commission, `CONFLICT`, retryable) until the `CommissionAccount` row exists, so `confirmTopUp` never meets a missing account. *Amended at the Phase 1 gate:* the first wording used `NotBusinessAccount`, which `identity` owns and `commission` may not raise (AD-SYS-1 rule 2) | AD-COM-1 rule 5; AD-COM-3 | G-10, C-GAP-3; Solu-2 #6, #8 |
| R-8 | The SQL DDL is the schema source of truth; the Prisma model is generated from it | Plan-2 §3 (`prisma/schema.prisma` as "one schema") | G-13; Solu-2 #6 |
| R-9 | The ingress wire is tRPC 11's non-batched HTTP: `GET /api/trpc/{path}?input=` for queries, `POST /api/trpc/{path}` for mutations. Errors return `{ error: ErrorBody }`, with `ErrorBody = { code, httpStatus, decision, issues? }` | AD-SYS-1 (error formatter) | G-02, G-03; Solu-2 #6 |
| R-10 | Three new DomainErrors: `AccountNotFound` (identity, `NOT_FOUND`) for an unknown capability-trace target; `InvalidAcquiredDate` (collections, `BAD_REQUEST`) for a future `acquiredAt`, which the parser cannot judge without the `Clock`; `CommissionAccountNotOpen` (R-7) | AD-SYS-1 (registry), ARCHITECTURE §8.1 | C-GAP-1..3; Solu-2 #8 |
| R-11 | A business calling `messaging.setMuted` gets an explained no-op (`allowedWithNotice`, zero writes), so user input never reaches the buyer-only mute CHECK | AD-MSG-3 rule 2 | C-GAP-4; Solu-2 #8 |
| R-12 | Better Auth runs with `advanced.ipAddress.disableIpTracking = true`; `Session` has no IP column, and IPs exist only as `ipHmac` (S-7) | AD-SYS-8; ARCH §10 S-7 | review A-5; Solu-2 #9 |
| R-13 | An audited read is a state change: `access.traceCapabilities` and `verification.getApplicationForReview` are mutations (POST), so no prefetch can write an access row | AD-IDN-1 rule 5, AD-VER-2 rule 2 | review A-3; Solu-2 #9 |
| R-14 | Application services reach their tables only through the module's repository port (`<Svc>Repository`, implemented by `infra/pg.ts`), never a raw `Sql`. Events go through `OutboxV2`, which stamps the R-1 envelope | Plan-2 §3 (module shape), AD-8, AD-SYS-2 | reviews A-4, S-1; Solu-2 #9 |
| R-15 | `listings` re-offers catalog's item-ref answer under its own DTO names (`ItemRefsRequest` / `ItemRefsResponse`, P-INV.refs). The generated `trading` port imports only from `listings`, never `catalog` | AD-1, OQ-6, AD-TRD-3 rule 5 | fitness `[SYS-AD1]` caught the generated `trading → catalog` import; commit `660268c` |
| R-16 | No procedure input has a key named `role`, `roles`, `sellerKind`, `isAdmin` or `capabilities`, even as a filter. `trading.mine` filters with `side: sent | received | any` | AD-SYS-8 rule 2, NFR-IDN-3 | fitness `[SYS-8.R2.static]`; commit `de8535d` |
| R-17 | The walking skeleton's platform contracts:<ul><li>`raiserFor(module)` is a runtime owner guard beside the lint rule `tezg/error-owner`; a non-owner raise fails as `'Unexpected'`.</li><li>`toErrorBody(error, now)` is the one formatter.</li><li>The dispatcher takes `{ transactions, clock }`, its handlers receive `(tx, envelope)`, and `replay` runs one `failed` delivery in its claim transaction.</li><li>`REGULATED_FIELDS` in `shared-kernel/regulated.ts` keys the redactor.</li></ul> | AD-SYS-1 rule 2, AD-SYS-2 rules 4–7, AD-SYS-8 rules 3–4 | Phase 3 SYS suite (`sys_contracts.test.ts`); Epic 1 |

## Detailed-design links

Everything below implements the ADs of the base document and the refinements above. [`docs/solu-2/README.md`](../../docs/solu-2/README.md) summarizes every deliverable; the full deliverable map, with how to run each one, is `853449c:docs/solu-2.md`.

| Concern | Artifact |
|---|---|
| Contracts: 37 core operations, 39 supporting contracts, offered ports, read models, the typed error catalog (§13) and the AD → enforcement → red test binding (§14) | [`detailed-design/contracts.md`](detailed-design/contracts.md) |
| Hexagonal map: every component once, layer-tagged | [`detailed-design/ports-and-adapters.md`](detailed-design/ports-and-adapters.md) |
| Schema: 55 tables, 271 CHECKs, grants (R-2, R-3, R-8) | [`detailed-design/schemas/001_tezg_schema.sql`](detailed-design/schemas/001_tezg_schema.sql) |
| Operation registry, the single source for the OpenAPI, the DTO index, the stubs and the ports | [`detailed-design/schemas/operations.json`](detailed-design/schemas/operations.json) → [`openapi.yaml`](detailed-design/schemas/openapi.yaml), [`dto.ts`](detailed-design/schemas/dto.ts) |
| Events and the R-1 envelope | [`detailed-design/schemas/events.md`](detailed-design/schemas/events.md); `src/shared-kernel/events.ts` |
| UI states → contracts and DTOs | [`detailed-design/ui-states.md`](detailed-design/ui-states.md) |
| Interface stubs (no production logic) | `src/modules/*/application/*.v2.ts`, `ports/*.v2.ts`, `dto/*.v2.dto.ts`; `src/shared-kernel/`; `src/server/trpc/` |
| Risk-based test design, NFR evidence, fixtures | [`../test/test-design.md`](../test-artifacts/test-design.md), [`../test/nfr-evidence.md`](../test-artifacts/nfr-evidence.md), [`../test/fixtures/README.md`](../test-artifacts/fixtures/README.md) |
| Red ATDD suites, green fitness functions, red NFR benchmarks | `../test/atdd/`, `../test/fitness/`, `../test/nfr/` |
| Traceability (FR/NFR → AD → clause → test → story) | [`../test/traceability-matrix.md`](../test-artifacts/traceability-matrix.md) |
| Backlog: walking skeleton plus 12 module epics; readiness gate; sprint status | [`epics.md`](epics.md), [`readiness-gate-report.md`](sprint-readiness-report.md), [`sprint-status.yaml`](../implementation-artifacts/sprint-status.yaml) (the live Impl-1 status; the all-backlog baseline this package generated is at `853449c:docs/solu-2/implementation-artifacts/sprint-status.yaml`) |
| Reviews (all triaged) | [`../reviews/`](reviews/): implementability, detailed design, test quality, backlog |
| Decisions | [`../ai-log/decision-log-solu2.md`](../decision-logs/solu-2-decision-log.md) |
| Quality gate | `.github/workflows/solu2-quality-gate.yml` (mirror: [`../test/ci/quality-gate.yml`](../test-artifacts/ci/quality-gate.yml)); locally `npm run gate:solu2` |
