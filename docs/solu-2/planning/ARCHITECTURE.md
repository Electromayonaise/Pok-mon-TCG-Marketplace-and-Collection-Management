---
title: "TEZG Architecture v2 — Solu-2 delta over Plan-2"
status: draft
base: docs/plan-2/planning/ARCHITECTURE.md
created: 2026-10-18
phase: "Solu-2 Phase 0 (stack); links completed in Phase 5"
---

# TEZG Architecture v2 — Solu-2 delta

This document is a **delta** over [`docs/plan-2/planning/ARCHITECTURE.md`](../../plan-2/planning/ARCHITECTURE.md). Every AD there (AD-1..19, AD-SYS-1..8, AD-<CODE>-n) stays binding and keeps its number. This file records only:
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

## Detailed-design links

*Phase 5.*
