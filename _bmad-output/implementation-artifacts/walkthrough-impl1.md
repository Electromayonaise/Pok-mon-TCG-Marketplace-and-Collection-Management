# Impl-1 Walkthrough: the 43 stories

This walkthrough closes Impl-1 (`853449c:docs/impl-1/task-statement.md` §5 Phase 4, §6.1 item 4). It covers the 43 stories of the Impl-1 cut (Appendix B.1) and the 19 stories pulled forward from `impl2_scope` and built with their epics. For each story it gives the business goal (quoting and citing its entry in `_bmad-output/planning-artifacts/epics.md`), the procedures implemented, the database changes, the blast radius and the test evidence. The last sections hold the AI governance summary, the terminal output of the passing suite and gates, the known limits with their owners, and how to reproduce all of it.

It replaces the walkthrough of the delivery of 2026-10-26, which covered six stories (decision log Impl-1 #22). That version is tag `impl1-entrega` (`853449c`). The task statement asks for this file at `docs/impl-1/walkthrough-impl1.md`; it stays here because `_bmad-output/` holds every BMAD artifact since the reorganization, and `docs/impl-1/README.md` maps each §6.1 deliverable to its path (decision log Impl-1 #39).

**Where the numbers come from.** Every count below is read from `sprint-status.yaml`, `epics.md` and two real runs of the suite in this session, both on the code of `949c219` (the merge of PR #11): the working copy's `npm run test:ci` on a local PostgreSQL 16, whose JSON results the final trace and the test review read, and `npm test` in a fresh clone against the Compose PostgreSQL, whose output §17 shows. Both gave the same counts; their durations differ. The per-story test results are in [`impl1-final-trace.md`](../test-artifacts/impl1-final-trace.md), and the test-quality review in [`impl1-test-review.md`](../test-artifacts/impl1-test-review.md).

## Contents

- §1 [Scope and ceremony](#1-scope-and-ceremony)
- §2 [Architecture and directory layout](#2-architecture-and-directory-layout)
- §3–§15 Epics 1–13, one section each, with a card per story
- §16 [AI governance](#16-ai-governance)
- §17 [Test evidence and gate output](#17-test-evidence-and-gate-output)
- §18 [Known limits](#18-known-limits)
- §19 [How to reproduce](#19-how-to-reproduce)

## 1. Scope and ceremony

| Count (from `sprint-status.yaml`) | Value |
|---|---|
| Stories in the project | 69 |
| `done` | 62 of 69 |
| Impl-1 cut `done` | 43 of 43 |
| Pulled forward from `impl2_scope` and `done` | 19: 2.4, 3.3, 3.4, 4.3, 5.3, 5.4, 5.5, 6.4, 7.3, 7.4, 8.4, 9.4, 9.5, 10.4, 10.5, 11.4, 12.4, 12.5, 13.4 |
| Reserved for Impl-2, untouched (`backlog`) | 7: 8.5, 8.6, 9.6, 11.5, 11.6, 13.5, 13.6 |
| Epics `done` | 13 of 13 (an epic is `done` when its Impl-1 stories are done and Martín signed its gate, decision #5) |

| Epic | Title | Impl-1 stories | Pulled forward | Reserved for Impl-2 |
|---|---|---|---|---|
| 1 | Walking skeleton: errors, audit, outbox and determinism | 1.1, 1.2, 1.3, 1.4, 1.5 | — | — |
| 2 | User, role and seller-type access (IDN) | 2.1, 2.2, 2.3, 2.5 | 2.4 | — |
| 3 | Business verification workflow (VER) | 3.1, 3.2, 3.5 | 3.3, 3.4 | — |
| 4 | Catalog and price reference (CAT) | 4.1, 4.2, 4.4, 4.5 | 4.3 | — |
| 5 | Listings and shared inventory (INV) | 5.1, 5.2, 5.6 | 5.3, 5.4, 5.5 | — |
| 6 | Marketplace browse and location discovery (DSC) | 6.1, 6.2, 6.3 | 6.4 | — |
| 7 | Orders and comprobante confirmation (ORD) | 7.1, 7.2, 7.5 | 7.3, 7.4 | — |
| 8 | Commission ledger and purchasability (COM) | 8.1, 8.2, 8.3 | 8.4 | 8.5, 8.6 |
| 9 | Contact handoff and in-app business messaging (MSG) | 9.1, 9.2, 9.3 | 9.4, 9.5 | 9.6 |
| 10 | Trade offer negotiation (TRD) | 10.1, 10.2, 10.3 | 10.4, 10.5 | — |
| 11 | Collections, binder and wishlist (COL) | 11.1, 11.2, 11.3 | 11.4 | 11.5, 11.6 |
| 12 | Collection valuation and trends (VAL) | 12.1, 12.2, 12.3 | 12.4, 12.5 | — |
| 13 | Seller reputation and moderation (REP) | 13.1, 13.2, 13.3 | 13.4 | 13.5, 13.6 |

**Why stories were pulled forward.** Martín moved each pulled-forward story out of `impl2_scope` at its epic's spec approval (decision log Impl-1 #26–#38; the comment above `impl2_scope` in `sprint-status.yaml` gives each reason). For most of them the epic's Core and MEC stories turn their bound tests green: their checks are clauses of the same operations, run in the same transaction, and 15 of them changed no code (their cards read "Code: none"). Four carry code of their own: 3.4 (the legal-identity guard and audit), 5.5 (the listing state driven by events), 10.5 (cancel, completion and expiry), and 2.4, which was built from its own spec as the `canBuy` check and the throttle count only. Story 2.4 counts as `done`, but it also stays listed under `impl2_scope`, because its sign-in, sign-up and throttle hook complete it in Impl-2 (#26, §18). None of the seven reserved stories was touched.

**The ceremony as run.**

- **Stories 1.1–1.3** ran the Full Ceremony (`task-statement.md` §3): `bmad-create-story` against the DoR checklist, test-first `bmad-dev-story` against the bound ATDD tests, a fresh-context `bmad-code-review`, and every finding fixed or triaged in the story file.
- **Stories 2.1–2.3** ran the compact ceremony of the delivery cut (decision #22): a short story file, test-first development, a fresh-context review subagent, High and Medium findings triaged.
- **Everything after the delivery** ran the epic-batched flow of decision #22: the agent drafts one spec per story (`bmad-quick-dev`, the ATDD tests as the spec) and Martín approves the epic's specs together, with each scope and contract choice put to him as a menu; the stories are built test-first, one commit each; one `bmad-code-review` (Blind Hunter, Edge Case Hunter, Acceptance Auditor) runs over the whole epic; Martín triages its findings and signs the epic gate (#5). Epics 1–3 were committed on `main`; Epics 4–13 are one PR each (#2–#11).
- **Proof-only stories** are committed right after the story they prove (decision #23): 2.2, which adds test support only, and the 15 pulled-forward stories whose cards read "Code: none" (3.3, 4.3, 5.3, 5.4, 6.4, 7.3, 7.4, 8.4, 9.4, 9.5, 10.4, 11.4, 12.4, 12.5, 13.4).
- **Before every push** the agent ran `npm run test:ci` and pushed only on exit code 0.

**Status progression.** Each story is committed once, when it is `done`, so the history of `sprint-status.yaml` shows `backlog → done` per story commit. The steps in between (`ready-for-dev → in-progress → review → done`) are recorded in each story file: the Change Log and Dev Agent Record for Epics 1–2, and the spec's `status` field and Review Findings for the epic-batched stories. Stories 1.1–1.3 passed through `review` in `sprint-status.yaml` itself, as the Full Ceremony requires.

## 2. Architecture and directory layout

TEZG is a modular monolith in hexagonal style (Plan-2 `ARCHITECTURE.md`, the Solu-2 detailed design, `ARCHITECTURE-v2-delta.md`).

- **Inbound adapters.**
  - `app/api/trpc/[trpc]/route.ts` serves tRPC 11 on the non-batched wire (`allowBatching: false`), from the composition root `src/server/composition.ts`.
  - `app/api/auth/[...all]/route.ts` mounts Better Auth, which reads the session cookie behind every `authed` and `admin` procedure.
  - `app/api/health/live` and `app/api/health/ready` are the liveness and readiness probes.
  - The Next.js 16 App Router app has no pages; the front end is its own phase after Impl-2 (decision #3).
- **Procedures.** `openapi.yaml` declares 111 ingress procedures (108 tRPC procedures and 3 job routes). 84 are wired to their services; the other 27 belong to the reserved stories (24) or to the jobs route, which no story builds yet (3: `jobs/trm-fetch`, `jobs/expiry-materialize`, `jobs/commission-reconcile`). An unwired tRPC procedure answers `Unexpected` (500) from a `NotImplementedError`, never a silent success; the three job routes have no route handler under `app/` yet, so they answer 404.
- **Modules.** Each module folder under `src/modules/<module>/` has the same five layers:

  | Layer | Contents |
  |---|---|
  | `domain/` | Pure code: no framework, driver, network or wall clock (`gate:purity`) |
  | `application/` | Use cases (`*.v2.ts`): a block generated from `operations.json`, then the hand-owned service class and repository port (decision #14) |
  | `ports/` | Repository and neighbour ports |
  | `dto/` | Request and response types |
  | `infra/` | SQL repositories (`pg.ts`), joined into the one repository (R-14) |

  Other modules import a module only through its `index.ts`, and only along the AD-1 edges; `[SYS-AD1]` and `gate:purity` enforce it.

  | Folder | Logical modules |
  |---|---|
  | `identity` | IDN, VER |
  | `catalog` | CAT |
  | `listings` | INV, DSC, and the contact handoff |
  | `orders` | ORD |
  | `commission` | COM |
  | `trading` | TRD |
  | `messaging` | MSG |
  | `collections` | COL, VAL |
  | `reviews` | REP |

- **Shared kernel** (`src/shared-kernel/`): the cross-cutting SYS module. The ports (`Clock`, `IdGenerator`, `TransactionRunner`, `Sql`/`Tx`, the outbox, the audit log), the error registry (`codes.ts`, `raise.ts`), the Decision shape, the es-CO message catalog, the redactor, the free-text check (`text.ts`), the outbox dispatcher and sweeper, the ambient transaction (`db.ts`) and the validated configuration (`config.ts`).
- **Events.** Modules talk through in-process ports and the transactional outbox (AD-SYS-2). Three subscribers are wired: `listings` (commission and verification events, Story 5.5), `commission` (Stories 8.1–8.2) and `collections` (Story 11.3).
- **Persistence.** PostgreSQL 16. The SQL DDL in `_bmad-output/planning-artifacts/detailed-design/schemas/001_tezg_schema.sql` is the schema source of truth; `npm run db:migrate` applies it. **No story changed the DDL**: the Solu-2 schema was complete, and every story works within it (`gate:prisma` checks the generated Prisma model against it on every push). Prisma backs Better Auth only; repositories run SQL through the `Sql`/`Tx` ports.
- **External systems.** Each is a port with a simulated adapter in tests: object storage, malware scanner, catalog feed, TRM source, clock, ids. Production binds `UNWIRED_*` adapters for the four whose providers are not chosen yet (§18).

| Path | Contents |
|---|---|
| `app/` | Route handlers (tRPC, Better Auth, health) |
| `src/modules/` | The nine module folders |
| `src/shared-kernel/` | SYS: ports, registries, outbox, audit, redaction, configuration |
| `src/server/` | The composition root, the tRPC router and formatter, Better Auth and its session reader, health, the IP HMAC |
| `prisma/schema.prisma` | Generated model (`npm run db:pull`) |
| `test-support/` | Per-file test databases, virtual clock, sequential ids, simulated adapters, the Reference Seed Profile |
| `_bmad-output/planning-artifacts/` | PRD, architecture, `epics.md` and the detailed design (`contracts.md`, `openapi.yaml`, `operations.json`, events, DDL) |
| `_bmad-output/test-artifacts/` | The ATDD, NFR and fitness suites, `nfr-evidence.md`, the traceability matrix, the final trace and the test review |
| `_bmad-output/implementation-artifacts/` | `sprint-status.yaml`, the 62 story files, `deferred-work.md`, this walkthrough |
| `_bmad-output/decision-logs/` | The AI decision logs, Impl-1's included |
| `docs/impl-1/README.md` | The Impl-1 summary and deliverable map |
| `scripts/`, `tools/lint/` | Gates, generators, the migration runner, the lint toolchain |

## 3. Epic 1: Walking skeleton: errors, audit, outbox and determinism

- **Epic entry:** `epics.md` line 353. Stories 1.1–1.3 ran the Full Ceremony (`bmad-create-story`, test-first `bmad-dev-story`, a fresh-context `bmad-code-review`); 1.4 and 1.5 ran the epic-batched flow of decision #22.
- **Decision log:** #5–#21 (the scaffold, the foundation and its nine `[CORRECTED]`/`[IMPROVED]` proposals). **Close review:** `af97624` (fix(epic-1)), committed on `main` before the PR flow; the delivery of 2026-10-26 is tag `impl1-entrega` (`853449c`).
- **Impl-2 stories still reserved:** none.

The walking skeleton every other story stands on: one refusal shape for all 108 tRPC procedures, an append-only audit trail with redaction at every egress, a transactional outbox that delivers each committed event once in effect, a determinism layer (clock and id ports, the network guard, module-boundary and table-ownership scanners) and the admin health reads. The scaffold commit `3187e01` brought the Next.js 16 + tRPC 11 service, the migration runner over the Solu-2 DDL, the health probes, the isolated lint toolchain and the CI gate.

### Story 1.1: Refuse every request with one typed, explained error body

*Skeleton · Impl-1 · delivery cut (#22) · `done` · story file [`1-1-refuse-every-request-with-one-typed-explained-error-body.md`](1-1-refuse-every-request-with-one-typed-explained-error-body.md)*

- **Goal** (`epics.md` line 357): As any client of the 108 tRPC procedures, I want every refusal to arrive as one `ErrorBody` with its registry status, an es-CO message and a cited decision, so that no screen has to guess what went wrong.
- **Procedures:** none over HTTP.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: none (the formatter and the registry hold no state).
- **Blast radius:** `9114475` (8 files, +113/−26), `edf22a4` (23 files, +1545/−54). Code: `src/server`, `.github`, `app`, `package.json`, `scripts`, `src/shared-kernel`. Artifacts: `docs`. Every tRPC response passes through the new formatter, and all procedures existed from here on, each throwing `NotImplementedError` until its story wired it.
- **Test evidence:** 6 bound tests, all passing in this session's run: `SYS-1.R2`, `SYS-1.R6`, `SYS-1.R6.unexpected`, `SYS-1.R6.s2`, `SYS-8.R2`, `SYS-8.R2.static`.

### Story 1.2: Record an audit trail and keep regulated data out of every egress

*Skeleton · Impl-1 · delivery cut (#22) · `done` · story file [`1-2-record-an-audit-trail-and-keep-regulated-data-out-of-every-egress.md`](1-2-record-an-audit-trail-and-keep-regulated-data-out-of-every-egress.md)*

- **Goal** (`epics.md` line 373): As the data protection officer, I want every change audited in its own transaction and every regulated value redacted before it leaves a module, so that NFR-SYS-2 and NFR-SYS-8 hold by construction.
- **Procedures:** none over HTTP.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `audit_events` (append-only: UPDATE and DELETE revoked from the app role).
- **Blast radius:** `a0fc7fb` (13 files, +660/−43). Code: `app`, `src/server`, `src/shared-kernel`. Artifacts: `docs`. Every audited write since goes through `PgAuditLog`, and every log line, audit row and error citation through `redact`.
- **Test evidence:** 6 bound tests, all passing in this session's run: `SYS-R2`, `SYS-8.R4`, `SYS-8.R4.redact`, `SYS-8.R4.error`, `SYS-R2.grants`, `NFR-SYS-8.canary`.

### Story 1.3: Deliver every committed event exactly once in effect

*Skeleton · Impl-1 · delivery cut (#22) · `done` · story file [`1-3-deliver-every-committed-event-exactly-once-in-effect.md`](1-3-deliver-every-committed-event-exactly-once-in-effect.md)*

- **Goal** (`epics.md` line 389): As a subscribing module, I want every committed event delivered to me exactly once in effect, even across crashes, so that commission, listings and collections never miss or double an effect (NFR-SYS-6).
- **Procedures:** `admin.events.replay` (admin), implementing `S-SYS.replay`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"OutboxEvent"`, `"EventDelivery"`, `"EventReplayLog"`.
- **Blast radius:** `65741c1` (47 files, +1362/−218). Code: `scripts`, `src/modules/catalog`, `src/modules/collections`, `src/modules/commission`, `src/modules/identity`, `src/modules/listings`, `src/modules/messaging`, `src/modules/orders`, `src/modules/reviews`, `src/modules/trading`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `docs`. Every event-publishing story since commits through `PgOutboxV2` and is dispatched after commit, with the sweeper as the safety net.
- **Test evidence:** 8 bound tests, all passing in this session's run: `SYS-2.R4`, `SYS-2.R4.code`, `SYS-2.R6`, `SYS-2.R6.young`, `S-SYS.replay.h`, `S-SYS.replay.f`, `SYS-AD9`, `NFR-SYS-6.sweep`.

### Story 1.4: Keep time, sockets and module boundaries deterministic

*Skeleton · Impl-1 · `done` · story file [`1-4-keep-time-sockets-and-module-boundaries-deterministic.md`](1-4-keep-time-sockets-and-module-boundaries-deterministic.md)*

- **Goal** (`epics.md` line 405): As a developer agent, I want time, randomness, the network and module boundaries fixed by the harness and checked on every push, so that every later red test fails only for its own reason.
- **Procedures:** none over HTTP.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: none of its own; its scanners read the whole schema for table ownership and grants.
- **Blast radius:** `0e6481d` (6 files, +381/−4). Code: `eslint.config.mjs`, `package.json`, `tools`. Artifacts: `docs`. The lint rules (`tezg/error-owner`, `tezg/table-owner`, `tezg/regulated-select`, built by `0e6481d`) and the fitness scanners run on every push, so every later story is held to AD-1, AD-8 and AD-SYS-6.
- **Test evidence:** 9 bound tests, all passing in this session's run: `SYS-6.R1`, `SYS-6.R1.probe`, `SYS-6.R4`, `SYS-AD1`, `SYS-AD1.probe`, `SYS-AD8`, `SYS-AD8.probe`, `SEED.profile`, `SEED.business-history`.

### Story 1.5: Show admins the delivery and tick health

*Skeleton · Impl-1 · `done` · story file [`1-5-show-admins-the-delivery-and-tick-health.md`](1-5-show-admins-the-delivery-and-tick-health.md)*

- **Goal** (`epics.md` line 421): As an admin, I want the Entregas tab to show failed and stuck deliveries and a silent tick, so that nothing fails unseen (AD-SYS-2 rule 9).
- **Procedures:** `admin.events.deliveryHealth` (admin), `admin.jobs.tickHealth` (admin), `admin.events.deliveries` (admin), implementing `S-SYS.tick`, `S-SYS.deliveries`, `S-SYS.health`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: reads `"EventDelivery"`, `"OutboxEvent"`, `"FailedDeliveryDigest"`, `"JobRun"`.
- **Blast radius:** `d67400c` (12 files, +387/−19). Code: `scripts`, `src/server`, `src/shared-kernel`. Artifacts: `docs`.
- **Test evidence:** 3 bound tests, all passing in this session's run: `S-SYS.tick.h`, `S-SYS.deliveries.h`, `S-SYS.health.h`.

## 4. Epic 2: User, role and seller-type access (IDN)

- **Epic entry:** `epics.md` line 437. Stories 2.1–2.3 ran the compact ceremony of the delivery (#22); 2.4 and 2.5 ran the epic-batched flow.
- **Decision log:** #22–#26. **Close review:** `38156cc` (fix(epic-2)), committed on `main`; 2.1–2.3 are in tag `impl1-entrega`.
- **Impl-2 stories still reserved:** none.

Identity: the individual-seller track claimed in one transaction, the race between the two seller tracks (exactly one wins), one pure capability projection that explains why an account may not list, the admin capability trace, and the neighbour ports (seller kinds, review target, contact, names) that later modules call. Story 2.4 was pulled forward as the `canBuy` check and the throttle count only; sign-in, sign-up and the throttle hook complete it in Impl-2 (#26).

### Story 2.1: Complete the individual-seller profile and claim the track

*Core · Impl-1 · delivery cut (#22) · `done` · story file [`2-1-complete-the-individual-seller-profile-and-claim-the-track.md`](2-1-complete-the-individual-seller-profile-and-claim-the-track.md)*

- **Goal** (`epics.md` line 441): As Valentina, a new user, I want to complete my individual-seller profile once, so that my account becomes an individual seller and my phone is kept only in the profile.
- **Procedures:** `access.completeIndividualProfile` (authed), implementing `IDN-1`, `IDN-1.ingress`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"BusinessApplication"`, `"IndividualSellerProfile"`, `"User"`.
- **Blast radius:** `7f903f2` (15 files, +362/−19). Code: `scripts`, `src/modules/identity`, `src/shared-kernel`, `test-support`. Artifacts: `docs`. The `"User"` row lock became the serialization point of every seller-track claim, business claims included (VER-2). `access.completeIndividualProfile` was wired behind a real Better Auth session (`c36153b`, decision #24).
- **Test evidence:** 3 bound tests, all passing in this session's run: `IDN-1.Q1`, `IDN-1.ingress.h`, `IDN-1.ingress.f`.

### Story 2.2: Let exactly one seller track win a race

*MEC · Impl-1 · delivery cut (#22) · `done` · story file [`2-2-let-exactly-one-seller-track-win-a-race.md`](2-2-let-exactly-one-seller-track-win-a-race.md)*

- **Goal** (`epics.md` line 457): As the platform, I want a profile completion and a business claim racing on one account to leave exactly one track, so that no account is ever both seller kinds (Annex A MEC, R-01).
- **Procedures:** `access.completeIndividualProfile` (authed), implementing `IDN-1`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"BusinessApplication"`, `"IndividualSellerProfile"`, `"User"`.
- **Blast radius:** `2189038` (3 files, +81/−2). Code: `test-support`. Artifacts: `docs`. Test support only (`test-support/solu2/fixtures.ts`): a proof-only story (#23).
- **Test evidence:** 4 bound tests, all passing in this session's run: `IDN-1.MEC`, `IDN-1.I1`, `IDN-1.QF1`, `IDN-1.QF2`.

### Story 2.3: Explain why an account may not list

*Failure-state · Impl-1 · delivery cut (#22) · `done` · story file [`2-3-explain-why-an-account-may-not-list.md`](2-3-explain-why-an-account-may-not-list.md)*

- **Goal** (`epics.md` line 473): As Andrés, whose application was rejected, I want the listing form to tell me why I cannot list and when I may reapply, so that I never fill in a form I cannot submit.
- **Procedures:** none over HTTP, implementing `IDN-2`, `P-IDN.capabilities`, `P-IDN.verification`. The contracts are in-process ports that neighbours call (AD-SYS-2).
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"BusinessApplication"`, `"User"`.
- **Blast radius:** `5325d67` (13 files, +431/−25). Code: `src/modules/identity`, `src/shared-kernel`, `test-support`. Artifacts: `docs`. Every later story that gates a listing or reads capabilities goes through this projection.
- **Test evidence:** 7 bound tests, all passing in this session's run: `IDN-2.Q1`, `IDN-2.QF1`, `IDN-2.QF2`, `IDN-2.I1`, `P-IDN.capabilities.h`, `P-IDN.verification.h`, `SYS-4.R9`.

### Story 2.4: Refuse unverified buyers and throttle failed sign-ins

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`2-4-refuse-unverified-buyers-and-throttle-failed-sign-ins.md`](2-4-refuse-unverified-buyers-and-throttle-failed-sign-ins.md)*

- **Goal** (`epics.md` line 489): As the platform, I want buying to require a verified email and repeated failed sign-ins to be throttled, so that accounts cannot be brute-forced.
- **Procedures:** none over HTTP, implementing `S-FR-IDN-7.canBuy`, `S-FR-IDN-7.throttle`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"AuthThrottleEvent"`, `"Session"`.
- **Blast radius:** `7c85e6c` (11 files, +296/−14). Code: `scripts`, `src/modules/identity`, `src/shared-kernel`. Artifacts: `docs`.
- **Test evidence:** 2 bound tests, all passing in this session's run: `S-FR-IDN-7.h`, `S-FR-IDN-7.f`.

### Story 2.5: Trace capabilities for admins and answer neighbours' identity queries

*Supporting · Impl-1 · `done` · story file [`2-5-trace-capabilities-for-admins-and-answer-neighbours-identity-queries.md`](2-5-trace-capabilities-for-admins-and-answer-neighbours-identity-queries.md)*

- **Goal** (`epics.md` line 505): As an admin, I want to trace why an account holds each capability, audited, so that support can explain access without reading legal data.
- **Procedures:** `access.traceCapabilities` (admin), implementing `IDN-3`, `S-FR-IDN-6.kinds`, `S-FR-IDN-6.target`, `P-IDN.contact`, `P-IDN.names`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"BusinessApplicationLegalIdentity"`, `"CapabilityAuditRead"`, `"User"`.
- **Blast radius:** `9701f19` (11 files, +326/−29). Code: `scripts`, `src/modules/identity`, `src/server`, `src/shared-kernel`. Artifacts: `docs`.
- **Test evidence:** 9 bound tests, all passing in this session's run: `IDN-3.Q1`, `IDN-3.Q2`, `IDN-3.P2`, `IDN-3.I1`, `IDN-3.I3`, `S-FR-IDN-6.h`, `S-FR-IDN-6.f`, `P-IDN.contact.h`, `P-IDN.names.h`.

## 5. Epic 3: Business verification workflow (VER)

- **Epic entry:** `epics.md` line 521. Built whole in the epic-batched flow, in the order 3.1, 3.2, 3.3, 3.5, 3.4 (#27).
- **Decision log:** #27–#28. **Close review:** `d552afa` (fix(epic-3)), committed on `main` before PR #2.
- **Impl-2 stories still reserved:** none.

Business verification: the application with its regulated legal identity and documents (promoted from quarantine through the storage and scanner ports), the admin decision taken exactly once and published as an event, the review queue, the rejection-reason policy, payment instructions, and every legal-identity read audited and confined to one repository (lint rule `legal-identity-confined`). Stories 3.3 and 3.4 left `impl2_scope` (#27).

### Story 3.1: Submit a business application with its legal identity

*Core · Impl-1 · `done` · story file [`3-1-submit-a-business-application-with-its-legal-identity.md`](3-1-submit-a-business-application-with-its-legal-identity.md)*

- **Goal** (`epics.md` line 525): As Andrés, I want to apply as a business with my NIT and documents once, so that an admin can verify me.
- **Procedures:** `verification.submit` (authed), implementing `VER-2`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"BusinessApplication"`, `"BusinessApplicationLegalIdentity"`, `"BusinessProfile"`, `"RejectionReason"`.
- **Blast radius:** `c74836e` (5 files, +16/−3), `ee83cd1` (29 files, +1167/−45). Code: `src/modules/identity`, `scripts`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `decision-logs`, `implementation-artifacts`, `docs`.
- **Test evidence:** 4 bound tests, all passing in this session's run: `VER-2.Q1`, `VER-2.I1`, `VER-2.P5`, `VER-2.I2`.

### Story 3.2: Decide an application exactly once

*MEC · Impl-1 · `done` · story file [`3-2-decide-an-application-exactly-once.md`](3-2-decide-an-application-exactly-once.md)*

- **Goal** (`epics.md` line 541): As an admin, I want approve and reject to decide an application exactly once, so that a business is never both approved and rejected (Annex A MEC, R-02).
- **Procedures:** `verification.approve` (admin), `verification.reject` (admin), implementing `VER-1`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"ApplicationDecisionLog"`, `"BusinessApplication"`, `"RejectionReason"`.
- **Blast radius:** `0bce787` (13 files, +276/−24). Code: `scripts`, `src/modules/identity`, `src/server`, `src/shared-kernel`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 4 bound tests, all passing in this session's run: `VER-1.Q1`, `VER-1.Q2`, `VER-1.I1`, `VER-1.MEC`.

### Story 3.3: Refuse incomplete, unsafe and premature applications

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`3-3-refuse-incomplete-unsafe-and-premature-applications.md`](3-3-refuse-incomplete-unsafe-and-premature-applications.md)*

- **Goal** (`epics.md` line 557): As Andrés, I want a refused application to say exactly what is missing or when I may reapply, so that I can fix it without contacting support.
- **Procedures:** `verification.submit` (authed), `verification.approve` (admin), `verification.reject` (admin), implementing `VER-2`, `VER-1`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"ApplicationDecisionLog"`, `"BusinessApplication"`, `"BusinessApplicationLegalIdentity"`, `"BusinessProfile"`, `"RejectionReason"`.
- **Blast radius:** `4c1b51f` (3 files, +22/−12). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 6 bound tests, all passing in this session's run: `VER-2.P1`, `VER-2.P3`, `VER-2.P7`, `VER-1.P2`, `VER-1.P3`, `VER-1.P4`.

### Story 3.4: Guard and audit every legal-identity read

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`3-4-guard-and-audit-every-legal-identity-read.md`](3-4-guard-and-audit-every-legal-identity-read.md)*

- **Goal** (`epics.md` line 573): As the data protection officer, I want every read of a legal identity audited, denials included, so that NFR-VER-2 holds.
- **Procedures:** `verification.getApplicationForReview` (authed), `verification.legalIdentityAudit` (admin), implementing `VER-3`, `S-FR-VER-5.audit`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"LegalIdentityAccessLog"`.
- **Blast radius:** `b4a7e1f` (20 files, +478/−62). Code: `test-artifacts/nfr`, `eslint.config.mjs`, `src/modules/identity`, `src/server`, `tools`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 9 bound tests, all passing in this session's run: `VER-3.Q1`, `VER-3.P1`, `VER-3.P2`, `VER-3.I1`, `VER-3.I2`, `VER-3.I3`, `S-FR-VER-5.audit.h`, `NFR-VER-3.queue`, `NFR-VER-3.sign`.

### Story 3.5: Run the review queue, the rejection policy and payment instructions

*Supporting · Impl-1 · `done` · story file [`3-5-run-the-review-queue-the-rejection-policy-and-payment-instructions.md`](3-5-run-the-review-queue-the-rejection-policy-and-payment-instructions.md)*

- **Goal** (`epics.md` line 589): As an admin and as Andrés, I want the queue, the rejection policy and my payment instructions managed in one place, so that decisions and orders use current, snapshotted data.
- **Procedures:** `verification.queue` (admin), `verification.myStatus` (authed), `verification.reasons.upsert` (admin), `verification.reasons.setActive` (admin), `verification.updatePaymentInstructions` (authed), `verification.reasons.list` (admin), implementing `S-FR-VER-2`, `S-FR-VER-7`, `S-FR-VER-8.upsert`, `S-FR-VER-8.active`, `S-FR-VER-8.list`, `S-FR-VER-9.update`, `S-FR-VER-9.get`, `P-VER.name`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"BusinessProfile"`, `"RejectionReasonChange"`.
- **Blast radius:** `af4bcd1` (15 files, +653/−48). Code: `scripts`, `src/modules/identity`, `src/server`, `src/shared-kernel`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 10 bound tests, all passing in this session's run: `S-FR-VER-2.h`, `S-FR-VER-2.f`, `S-FR-VER-7.h`, `S-FR-VER-7.f`, `S-FR-VER-8.h`, `S-FR-VER-8.f`, `S-FR-VER-8.list.h`, `S-FR-VER-9.h`, `S-FR-VER-9.f`, `P-VER.name.h`.

## 6. Epic 4: Catalog and price reference (CAT)

- **Epic entry:** `epics.md` line 605. Built whole in the epic-batched flow (#29).
- **Decision log:** #29. **Close review:** `8a97cc2` (fix(epic-4)), PR [#2](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/2).
- **Impl-2 stories still reserved:** none.

The catalog: a resumable feed run over the fixture feed, card identity kept through renames and reprints (revisions, quarantine of changed kinds), reference prices that are never fabricated under an outage or stale data, the official TRM, the public browse and the seven neighbour ports (§15.11). The production feed and TRM readers are not built: `compose()` binds `UNWIRED_FEED` and `UNWIRED_FX` (§18).

### Story 4.1: Start and continue a catalog feed run

*Core · Impl-1 · `done` · story file [`4-1-start-and-continue-a-catalog-feed-run.md`](4-1-start-and-continue-a-catalog-feed-run.md)*

- **Goal** (`epics.md` line 609): As an admin, I want to run the catalog feed with one live run at a time, so that ingestion never runs twice in parallel.
- **Procedures:** `catalog.feed.start` (admin), `catalog.feed.continue` (admin), `catalog.feed.runs` (admin), implementing `CAT-1`, `CAT-2.ingress`, `CAT-1.runs`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"BundleComponent"`, `"CatalogEntry"`, `"CatalogEntryRevision"`, `"CatalogSet"`, `"CollectionEntry"`, `"FeedIngestionRun"`, `"Listing"`, `"QuarantinedFeedRow"`, `"TradeOffer"`.
- **Blast radius:** `d35e10d` (20 files, +1419/−58). Code: `src/modules/catalog`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 5 bound tests, all passing in this session's run: `CAT-1.Q1`, `CAT-1.Q2`, `CAT-1.I1`, `CAT-2.ingress.h`, `CAT-1.runs.h`.

### Story 4.2: Keep a card's id through renames and reprints

*MEC · Impl-1 · `done` · story file [`4-2-keep-a-card-s-id-through-renames-and-reprints.md`](4-2-keep-a-card-s-id-through-renames-and-reprints.md)*

- **Goal** (`epics.md` line 625): As Valentina, I want a card to keep its id when the feed renames or reprints it, so that my listings and binder entries never break (Annex A MEC, R-03).
- **Procedures:** `catalog.feed.continue` (admin), `catalog.feed.quarantine` (admin), implementing `CAT-2`, `CAT-2.quarantine`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"BundleComponent"`, `"CatalogEntry"`, `"CatalogEntryRevision"`, `"CatalogSet"`, `"CollectionEntry"`, `"Listing"`, `"QuarantinedFeedRow"`, `"TradeOffer"`.
- **Blast radius:** `d05e880` (11 files, +164/−17). Code: `src/modules/catalog`, `src/server`. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 6 bound tests, all passing in this session's run: `CAT-2.Q1`, `CAT-2.Q2`, `CAT-2.I1`, `CAT-2.I3`, `CAT-2.MEC`, `CAT-2.quarantine.h`.

### Story 4.3: Refuse a second live run and quarantine changed kinds

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`4-3-refuse-a-second-live-run-and-quarantine-changed-kinds.md`](4-3-refuse-a-second-live-run-and-quarantine-changed-kinds.md)*

- **Goal** (`epics.md` line 641): As an admin, I want conflicting runs and suspicious rows refused with the reason, so that the catalog never changes a card's kind silently.
- **Procedures:** `catalog.feed.start` (admin), `catalog.feed.continue` (admin), implementing `CAT-1`, `CAT-2`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"BundleComponent"`, `"CatalogEntry"`, `"CatalogEntryRevision"`, `"CatalogSet"`, `"CollectionEntry"`, `"FeedIngestionRun"`, `"Listing"`, `"QuarantinedFeedRow"`, `"TradeOffer"`.
- **Blast radius:** `13f9ec5` (3 files, +20/−9). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 3 bound tests, all passing in this session's run: `CAT-1.QF1`, `CAT-2.ingress.f`, `CAT-2.QF1`.

### Story 4.4: Never fabricate a price

*Failure-state · Impl-1 · `done` · story file [`4-4-never-fabricate-a-price.md`](4-4-never-fabricate-a-price.md)*

- **Goal** (`epics.md` line 657): As Camila, I want every reference price to be a stored observation with its age, so that I never see an invented price (NFR-CAT-3).
- **Procedures:** `catalog.provenance` (public), `catalog.fx.retry` (admin), implementing `CAT-3`, `S-FR-CAT-8.fetch`, `S-FR-CAT-8.rate`. Not reachable yet: `jobs/trm-fetch` (no jobs route, §18).
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"FxRate"`.
- **Blast radius:** `a7042da` (18 files, +553/−93). Code: `test-artifacts/nfr`, `src/modules/catalog`, `src/server`, `src/shared-kernel`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 8 bound tests, all passing in this session's run: `CAT-3.Q1`, `CAT-3.Q4`, `CAT-3.Q5`, `CAT-3.P2`, `CAT-3.I1`, `S-FR-CAT-8.h`, `S-FR-CAT-8.f`, `NFR-CAT-1.provenance`.

### Story 4.5: Browse the catalog and answer neighbours' catalog queries

*Supporting · Impl-1 · `done` · story file [`4-5-browse-the-catalog-and-answer-neighbours-catalog-queries.md`](4-5-browse-the-catalog-and-answer-neighbours-catalog-queries.md)*

- **Goal** (`epics.md` line 673): As Camila browsing, and as the modules that read the catalog, I want stable, bounded catalog queries, so that discovery, listings and collections agree on one catalog.
- **Procedures:** `catalog.browse` (public), implementing `S-FR-CAT-1`, `P-CAT.entry`, `P-CAT.entries`, `P-CAT.match`, `P-CAT.refs`, `P-CAT.asOf`, `P-CAT.history`, `P-CAT.sets`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: reads `"CatalogEntry"`, `"CatalogSet"`, `"ReferencePriceObservation"`.
- **Blast radius:** `3cd2cff` (10 files, +263/−42). Code: `src/modules/catalog`, `src/server`. Artifacts: `implementation-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 10 bound tests, all passing in this session's run: `S-FR-CAT-1.h`, `S-FR-CAT-1.f`, `P-CAT.entry.h`, `P-CAT.entries.h`, `P-CAT.match.h`, `P-CAT.refs.h`, `P-CAT.asOf.h`, `P-CAT.history.h`, `P-CAT.sets.h`, `NFR-CAT-1.browse`.

## 7. Epic 5: Listings and shared inventory (INV)

- **Epic entry:** `epics.md` line 689. Built whole in the epic-batched flow (#30).
- **Decision log:** #30. **Close review:** `ed3d521` (fix(epic-5)), PR [#3](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/3).
- **Impl-2 stories still reserved:** none.

Inventory: listings that share one stock pool of units, reservation inside the caller's transaction with restore on abort (the MEC every purchase and trade relies on), bundles, restock and activation, and the listing state driven by the commission and verification events. Stories 5.3–5.5 left `impl2_scope` (#30). CAT's ports moved onto the ambient transaction so a reserve reads the catalog inside the order's transaction.

### Story 5.1: List a card and share one stock pool

*Core · Impl-1 · `done` · story file [`5-1-list-a-card-and-share-one-stock-pool.md`](5-1-list-a-card-and-share-one-stock-pool.md)*

- **Goal** (`epics.md` line 693): As Valentina, I want to list 3 copies of a card and have a second listing of the same copy share the stock, so that I never oversell.
- **Procedures:** `inventory.create` (authed), implementing `INV-2`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"InventoryUnit"`, `"Listing"`, `"SellerCommissionState"`.
- **Blast radius:** `75b2be6` (25 files, +938/−37). Code: `test-artifacts/nfr`, `src/modules/listings`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 6 bound tests, all passing in this session's run: `INV-2.Q1`, `INV-2.I1`, `INV-2.Q2`, `INV-2.I2`, `INV-2.R1`, `NFR-INV-4.create`.

### Story 5.2: Reserve stock in the caller's transaction and restore it on abort

*MEC · Impl-1 · `done` · story file [`5-2-reserve-stock-in-the-caller-s-transaction-and-restore-it-on-abort.md`](5-2-reserve-stock-in-the-caller-s-transaction-and-restore-it-on-abort.md)*

- **Goal** (`epics.md` line 709): As a buyer's order, I want stock reserved inside my transaction and restored if I abort, so that the last unit is never sold twice (Annex A MEC, R-05).
- **Procedures:** none over HTTP, implementing `INV-1`, `S-FR-INV-5`, `P-INV.purchase`, `P-INV.units`. The contracts are in-process ports that neighbours call (AD-SYS-2).
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"InventoryUnit"`.
- **Blast radius:** `490b7fd` (13 files, +420/−71). Code: `test-artifacts/nfr`, `src/modules/catalog`, `src/modules/listings`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 11 bound tests, all passing in this session's run: `INV-1.Q1`, `INV-1.Q3`, `INV-1.I1`, `INV-1.I3`, `INV-1.MEC`, `S-FR-INV-5.h`, `S-FR-INV-5.f`, `P-INV.purchase.h`, `P-INV.units.h`, `NFR-INV-4.reserve`, `NFR-INV-4.bundle`.

### Story 5.3: Refuse invalid listings

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`5-3-refuse-invalid-listings.md`](5-3-refuse-invalid-listings.md)*

- **Goal** (`epics.md` line 725): As Andrés, I want an invalid listing refused with the field and the reason, so that nothing half-valid is ever published.
- **Procedures:** `inventory.create` (authed), implementing `INV-2`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"InventoryUnit"`, `"Listing"`, `"SellerCommissionState"`.
- **Blast radius:** `d16e6e2` (3 files, +17/−10). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 6 bound tests, all passing in this session's run: `INV-2.P1`, `INV-2.P2`, `INV-2.I4`, `INV-2.P3`, `INV-2.P4`, `INV-2.P5`.

### Story 5.4: Refuse unpurchasable and over-quantity reservations

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`5-4-refuse-unpurchasable-and-over-quantity-reservations.md`](5-4-refuse-unpurchasable-and-over-quantity-reservations.md)*

- **Goal** (`epics.md` line 741): As Camila, I want a purchase refused before any stock moves when the listing cannot be bought, so that I see why at once.
- **Procedures:** none over HTTP, implementing `INV-1`. The contracts are in-process ports that neighbours call (AD-SYS-2).
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"InventoryUnit"`.
- **Blast radius:** `62b1e1a` (3 files, +16/−9). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 4 bound tests, all passing in this session's run: `INV-1.P2`, `INV-1.P3`, `INV-1.P4`, `INV-1.P5`.

### Story 5.5: Pause, withdraw and restore listings from commission and verification events

*Supporting · pulled forward from `impl2_scope` · `done` · story file [`5-5-pause-withdraw-and-restore-listings-from-commission-and-verification-events.md`](5-5-pause-withdraw-and-restore-listings-from-commission-and-verification-events.md)*

- **Goal** (`epics.md` line 757): As Andrés, I want my listings paused when my commission balance runs out and restored when I top up or am re-approved, so that what buyers see matches what I can sell.
- **Procedures:** none over HTTP, implementing `INV-3`, `S-FR-INV-8`. The contracts are in-process ports that neighbours call (AD-SYS-2).
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"AppliedApplicationDecision"`, `"EventDelivery"`, `"Listing"`, `"SellerCommissionState"`.
- **Blast radius:** `f89cd58` (9 files, +234/−31). Code: `src/modules/listings`, `src/server`. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 6 bound tests, all passing in this session's run: `INV-3.Q1`, `INV-3.I1`, `INV-3.R1`, `INV-3.I2`, `S-FR-INV-8.h`, `S-FR-INV-8.f`.

### Story 5.6: Manage my listings, bundles and stock

*Supporting · Impl-1 · `done` · story file [`5-6-manage-my-listings-bundles-and-stock.md`](5-6-manage-my-listings-bundles-and-stock.md)*

- **Goal** (`epics.md` line 773): As Valentina, I want to bundle cards, restock, edit and see my listings' availability, so that every listing on a shared unit shows the true count.
- **Procedures:** `inventory.createBundle` (authed), `inventory.update` (authed), `inventory.restock` (authed), `inventory.deactivate` (authed), `inventory.reactivate` (authed), `inventory.get` (public), `inventory.mine` (authed), implementing `S-FR-INV-2`, `S-FR-INV-10.get`, `S-FR-INV-10.mine`, `S-FR-INV-9.update`, `S-FR-INV-9.restock`, `S-FR-INV-9.active`, `P-INV.trade`, `P-INV.tradeability`, `P-INV.availability`, `P-INV.refs`, `S-FR-INV-4`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"BundleComponent"`, `"InventoryUnit"`, `"Listing"`.
- **Blast radius:** `4485962` (13 files, +548/−58). Code: `src/modules/listings`, `src/server`, `src/shared-kernel`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 12 bound tests, all passing in this session's run: `S-FR-INV-2.h`, `S-FR-INV-2.f`, `S-FR-INV-4.h`, `S-FR-INV-4.f`, `S-FR-INV-9.h`, `S-FR-INV-9.f`, `S-FR-INV-10.h`, `S-FR-INV-10.f`, `P-INV.trade.h`, `P-INV.tradeability.h`, `P-INV.availability.h`, `P-INV.refs.h`.

## 8. Epic 6: Marketplace browse and location discovery (DSC)

- **Epic entry:** `epics.md` line 789. Built whole in the epic-batched flow (#31).
- **Decision log:** #31. **Close review:** `592200a` (fix(epic-6)), PR [#4](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/4).
- **Impl-2 stories still reserved:** none.

Discovery: area validation, geodesic search with an explained, deterministic ranking, and the card detail at the radius boundaries, with excluded listings counted rather than hidden. A listing created with no location copies the seller's meeting point (#31). `discovery.search` and `discovery.cardDetail` are public procedures.

### Story 6.1: Refuse invalid search areas

*Failure-state · Impl-1 · `done` · story file [`6-1-refuse-invalid-search-areas.md`](6-1-refuse-invalid-search-areas.md)*

- **Goal** (`epics.md` line 793): As Camila, I want an invalid search area refused with its inputs, so that I know to change the radius or the centre.
- **Procedures:** none over HTTP, implementing `DSC-3`. The contracts are in-process ports that neighbours call (AD-SYS-2).
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: none (a pure check of the area).
- **Blast radius:** `fe9b02d` (9 files, +398/−15). Code: `src/modules/listings`. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 4 bound tests, all passing in this session's run: `DSC-3.Q1`, `DSC-3.QF1`, `DSC-3.QF2`, `DSC-3.I1`.

### Story 6.2: Search listings by area with an explained ranking

*Core · Impl-1 · `done` · story file [`6-2-search-listings-by-area-with-an-explained-ranking.md`](6-2-search-listings-by-area-with-an-explained-ranking.md)*

- **Goal** (`epics.md` line 809): As Camila, I want listings within my area ranked by distance, price and id, each explained, so that I can trust the order.
- **Procedures:** `discovery.search` (public), implementing `DSC-1`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: reads `"Listing"`, `"InventoryUnit"`, `"SellerCommissionState"`.
- **Blast radius:** `cd921dc` (25 files, +528/−70). Code: `test-artifacts/nfr`, `src/modules/identity`, `src/modules/listings`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 7 bound tests, all passing in this session's run: `DSC-1.Q1`, `DSC-1.I1`, `DSC-1.I2`, `DSC-1.I4`, `DSC-1.R1`, `NFR-DSC-1.seed`, `NFR-DSC-1.scale`.

### Story 6.3: Show a card's detail at the area boundaries

*MEC · Impl-1 · `done` · story file [`6-3-show-a-card-s-detail-at-the-area-boundaries.md`](6-3-show-a-card-s-detail-at-the-area-boundaries.md)*

- **Goal** (`epics.md` line 825): As Camila, I want a card's detail to include exactly the listings inside my radius, and still show the card when none are, so that boundary listings are never lost (Annex A MEC, R-04).
- **Procedures:** `discovery.cardDetail` (public), implementing `DSC-2`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: reads `"Listing"`, `"InventoryUnit"`.
- **Blast radius:** `e05b6a2` (6 files, +64/−16). Code: `src/modules/listings`, `src/server`. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 3 bound tests, all passing in this session's run: `DSC-2.Q1`, `DSC-2.MEC`, `DSC-2.MEC2`.

### Story 6.4: Explain excluded listings, too-broad filters and unknown cards

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`6-4-explain-excluded-listings-too-broad-filters-and-unknown-cards.md`](6-4-explain-excluded-listings-too-broad-filters-and-unknown-cards.md)*

- **Goal** (`epics.md` line 841): As Camila, I want exclusions and refusals explained, so that an empty or short result never looks like a bug.
- **Procedures:** `discovery.search` (public), `discovery.cardDetail` (public), implementing `DSC-1`, `DSC-2`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: reads `"Listing"`, `"InventoryUnit"`.
- **Blast radius:** `ced24e1` (3 files, +23/−14). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 3 bound tests, all passing in this session's run: `DSC-1.Q4`, `DSC-1.P2`, `DSC-2.P1`.

## 9. Epic 7: Orders and comprobante confirmation (ORD)

- **Epic entry:** `epics.md` line 857. Built whole in the epic-batched flow (#32).
- **Decision log:** #32. **Close review:** `704908c` (fix(epic-7)), PR [#5](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/5).
- **Impl-2 stories still reserved:** none.

Orders without custody: buying a listing (reservation plus order in one transaction), the comprobante upload, the three confirmations that close an order safely in any order or repetition, cancel, expiry at every read, the order lists, the admin lookup and the support contact. Thirteen `orders.*` procedures are wired; `expireDueOrders` waits for the jobs route (§18). Stories 7.3 and 7.4 left `impl2_scope` (#32).

### Story 7.1: Buy a listing and attach the comprobante

*Core · Impl-1 · `done` · story file [`7-1-buy-a-listing-and-attach-the-comprobante.md`](7-1-buy-a-listing-and-attach-the-comprobante.md)*

- **Goal** (`epics.md` line 861): As Camila, I want to buy a listing and upload my bank-transfer comprobante, so that the business can confirm my payment.
- **Procedures:** `orders.create` (canBuy), `orders.createComprobanteUpload` (authed), `orders.uploadComprobante` (authed), `orders.comprobanteUrl` (authed), implementing `ORD-1`, `S-FR-ORD-2.ticket`, `S-FR-ORD-2.upload`, `S-FR-ORD-2.url`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"Order"`.
- **Blast radius:** `d2df8d3` (21 files, +1048/−62). Code: `test-artifacts/nfr`, `src/modules/identity`, `src/modules/orders`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 7 bound tests, all passing in this session's run: `ORD-1.Q1`, `ORD-1.I2`, `ORD-1.I4`, `S-FR-ORD-2.h`, `S-FR-ORD-2.f`, `S-FR-ORD-2.url.h`, `NFR-ORD-2.p95`.

### Story 7.2: Confirm paid and close orders safely in any order

*MEC · Impl-1 · `done` · story file [`7-2-confirm-paid-and-close-orders-safely-in-any-order.md`](7-2-confirm-paid-and-close-orders-safely-in-any-order.md)*

- **Goal** (`epics.md` line 877): As Camila and Andrés, I want the three order facts (paid, payment received, item received) set exactly once and safely in any order, so that commission and collections fire once (Annex A MEC, R-06).
- **Procedures:** `orders.confirmPaid` (authed), `orders.confirmPaymentReceived` (authed), `orders.confirmItemReceived` (authed), implementing `ORD-2`, `ORD-3`, `ORD-4`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"Order"`.
- **Blast radius:** `b568e23` (12 files, +351/−33). Code: `src/modules/orders`, `src/server`, `src/shared-kernel`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 11 bound tests, all passing in this session's run: `ORD-2.Q1`, `ORD-2.I2`, `ORD-2.MEC`, `ORD-3.Q1`, `ORD-3.MEC`, `ORD-3.I3`, `ORD-3.R1`, `ORD-3.Q2`, `ORD-4.Q1`, `ORD-4.Q2`, `ORD-4.MEC`.

### Story 7.3: Refuse self-purchase, open-order overflow and listing refusals

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`7-3-refuse-self-purchase-open-order-overflow-and-listing-refusals.md`](7-3-refuse-self-purchase-open-order-overflow-and-listing-refusals.md)*

- **Goal** (`epics.md` line 893): As Camila, I want a refused purchase to say why before anything is reserved, so that I can act on it.
- **Procedures:** `orders.create` (canBuy), implementing `ORD-1`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"Order"`.
- **Blast radius:** `8ba95e7` (3 files, +10/−7). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 3 bound tests, all passing in this session's run: `ORD-1.P3`, `ORD-1.P4`, `ORD-1.P5`.

### Story 7.4: Refuse out-of-role, repeated and expired confirmations

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`7-4-refuse-out-of-role-repeated-and-expired-confirmations.md`](7-4-refuse-out-of-role-repeated-and-expired-confirmations.md)*

- **Goal** (`epics.md` line 909): As Camila and Andrés, I want each confirmation accepted only from its role, once, while the order is active, so that no fact is forged or repeated.
- **Procedures:** `orders.confirmPaid` (authed), `orders.confirmPaymentReceived` (authed), `orders.confirmItemReceived` (authed), implementing `ORD-2`, `ORD-3`, `ORD-4`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"Order"`.
- **Blast radius:** `6a20ca3` (3 files, +9/−8). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 7 bound tests, all passing in this session's run: `ORD-2.P1`, `ORD-2.P3`, `ORD-2.P4`, `ORD-2.P5`, `ORD-3.P2`, `ORD-4.P2`, `ORD-4.P3`.

### Story 7.5: Cancel, expire, read and support orders

*Supporting · Impl-1 · `done` · story file [`7-5-cancel-expire-read-and-support-orders.md`](7-5-cancel-expire-read-and-support-orders.md)*

- **Goal** (`epics.md` line 925): As Camila, Andrés and an admin, I want orders cancelled, expired, read and supported with exact visibility, so that each party sees only what it may and nothing is released twice.
- **Procedures:** `orders.get` (authed), `orders.mine` (authed), `orders.sales` (authed), `orders.cancel` (authed), `orders.adminLookup` (admin), `orders.supportContact.get` (public), `orders.supportContact.set` (admin), implementing `S-FR-ORD-6.get`, `S-FR-ORD-6.list`, `S-FR-ORD-7`, `S-FR-ORD-8`, `S-FR-ORD-9`, `S-FR-ORD-10.lookup`, `S-FR-ORD-10.get`, `S-FR-ORD-10.set`. Not reachable yet: `jobs/expiry-materialize` (no jobs route, §18).
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"Order"`, `"OrderLookupLog"`, `"SupportContactChange"`, `"SupportContactSetting"`.
- **Blast radius:** `e1018fb` (20 files, +526/−72). Code: `src/modules/identity`, `src/modules/orders`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 10 bound tests, all passing in this session's run: `S-FR-ORD-6.h`, `S-FR-ORD-6.f`, `S-FR-ORD-7.h`, `S-FR-ORD-7.f`, `S-FR-ORD-8.h`, `S-FR-ORD-8.f`, `S-FR-ORD-9.h`, `S-FR-ORD-9.f`, `S-FR-ORD-10.h`, `S-FR-ORD-10.f`.

## 10. Epic 8: Commission ledger and purchasability (COM)

- **Epic entry:** `epics.md` line 941. Built through 8.4 in the epic-batched flow (#33).
- **Decision log:** #33. **Close review:** `cd4b913` (fix(epic-8)), PR [#6](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/6).
- **Impl-2 stories still reserved:** 8.5 (Reconcile ledgers and report, never repair, discrepancies); 8.6 (Set commission rates and read the ledger).

Commission: the business's prepaid account opened on approval, top-up requests with a proof, the admin confirm or reject, and each order charged exactly once by the event subscriber, with a per-seller advisory lock that closes an Epic 5 race. Story 8.4 left `impl2_scope`; 8.5 (reconciliation) and 8.6 (rates and the admin ledger) stay reserved (#33).

### Story 8.1: Open the commission account and request top-ups

*Core · Impl-1 · `done` · story file [`8-1-open-the-commission-account-and-request-top-ups.md`](8-1-open-the-commission-account-and-request-top-ups.md)*

- **Goal** (`epics.md` line 945): As Andrés, newly approved, I want my commission account opened automatically and to request top-ups with a proof, so that my listings can be bought.
- **Procedures:** `commission.createTopUpProofUpload` (authed), `commission.requestTopUp` (authed), `commission.myAccount` (authed), `commission.myTopUps` (authed), `commission.topUpProofUrl` (authed), implementing `S-FR-COM-1`, `S-FR-COM-2.ticket`, `S-FR-COM-2.request`, `S-FR-COM-2.mine`, `S-FR-COM-2.url`, `S-FR-COM-9`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"CommissionAccount"`, `"TopUpRequest"`.
- **Blast radius:** `b37e445` (21 files, +802/−66). Code: `src/modules/commission`, `src/modules/identity`, `src/modules/listings`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 6 bound tests, all passing in this session's run: `S-FR-COM-1.h`, `S-FR-COM-1.f`, `S-FR-COM-2.h`, `S-FR-COM-2.mine.h`, `S-FR-COM-2.url.h`, `S-FR-COM-9.h`.

### Story 8.2: Charge each order exactly once

*MEC · Impl-1 · `done` · story file [`8-2-charge-each-order-exactly-once.md`](8-2-charge-each-order-exactly-once.md)*

- **Goal** (`epics.md` line 961): As the platform, I want each order charged exactly once at the rate in force, whichever confirmation arrives first, so that balances are exact (Annex A MEC, R-07).
- **Procedures:** none over HTTP, implementing `COM-1`. The contracts are in-process ports that neighbours call (AD-SYS-2).
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"CommissionAccount"`, `"CommissionLedgerEntry"`, `"CommissionRateSetting"`, `"EventDelivery"`.
- **Blast radius:** `2e7527b` (14 files, +393/−37). Code: `test-artifacts/nfr`, `src/modules/commission`, `src/server`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 8 bound tests, all passing in this session's run: `COM-1.Q1`, `COM-1.Q3`, `COM-1.I1`, `COM-1.I3`, `COM-1.I4`, `COM-1.MEC`, `COM-1.MEC2`, `NFR-COM-3.deduction`.

### Story 8.3: Confirm or reject a top-up

*Core · Impl-1 · `done` · story file [`8-3-confirm-or-reject-a-top-up.md`](8-3-confirm-or-reject-a-top-up.md)*

- **Goal** (`epics.md` line 977): As an admin, I want to confirm or reject top-ups from a queue exactly once, so that a business resumes as soon as its balance is positive.
- **Procedures:** `commission.admin.confirmTopUp` (admin), `commission.admin.rejectTopUp` (admin), `commission.admin.topUpQueue` (admin), implementing `COM-2`, `COM-2.reject`, `COM-2.queue`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"CommissionAccount"`, `"CommissionLedgerEntry"`, `"TopUpDecisionLog"`, `"TopUpRequest"`.
- **Blast radius:** `2707098` (13 files, +325/−22). Code: `test-artifacts/nfr`, `src/modules/commission`, `src/server`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 6 bound tests, all passing in this session's run: `COM-2.Q1`, `COM-2.Q2`, `COM-2.I1`, `COM-2.reject.h`, `COM-2.queue.h`, `NFR-COM-3.topUp`.

### Story 8.4: Refuse invalid top-ups and decided requests

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`8-4-refuse-invalid-top-ups-and-decided-requests.md`](8-4-refuse-invalid-top-ups-and-decided-requests.md)*

- **Goal** (`epics.md` line 993): As Andrés and as an admin, I want invalid or late top-up actions refused with the reason, so that no balance moves by mistake.
- **Procedures:** `commission.admin.confirmTopUp` (admin), `commission.myAccount` (authed), implementing `S-FR-COM-2`, `COM-2`, `S-FR-COM-9`, `COM-1`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"CommissionAccount"`, `"CommissionLedgerEntry"`, `"CommissionRateSetting"`, `"EventDelivery"`, `"TopUpDecisionLog"`, `"TopUpRequest"`.
- **Blast radius:** `5913c75` (3 files, +80/−9). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 7 bound tests, all passing in this session's run: `S-FR-COM-2.f`, `S-FR-COM-2.f2`, `S-FR-COM-9.f`, `COM-2.P2`, `COM-2.P3`, `COM-2.reject.f`, `COM-1.P3`.

## 11. Epic 9: Contact handoff and in-app business messaging (MSG)

- **Epic entry:** `epics.md` line 1041. Built through 9.5 in the epic-batched flow (#34).
- **Decision log:** #34. **Close review:** `e5c87a1` (fix(epic-9)), PR [#7](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/7).
- **Impl-2 stories still reserved:** 9.6 (Read the inbox, mark threads read and mute).

Messaging: eligibility read from the business's current verification, sending while that verification changes, and the deterministic contact handoff for every product name (accents, emoji, 500 characters, URL-like), rate-limited per account and per HMAC'd IP. `IP_HMAC_KEY` became a required setting (§18). Stories 9.4 and 9.5 left `impl2_scope`; 9.6 (the inbox) stays reserved (#34).

### Story 9.1: Answer messaging eligibility from current verification

*Core · Impl-1 · `done` · story file [`9-1-answer-messaging-eligibility-from-current-verification.md`](9-1-answer-messaging-eligibility-from-current-verification.md)*

- **Goal** (`epics.md` line 1045): As Camila, I want to know before writing whether a business can receive messages, so that I don't write to the wrong account.
- **Procedures:** none over HTTP, implementing `MSG-3`. The contracts are in-process ports that neighbours call (AD-SYS-2).
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: reads `"BusinessApplication"`.
- **Blast radius:** `0f52df2` (11 files, +178/−14). Code: `src/modules/identity`, `src/shared-kernel`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 2 bound tests, all passing in this session's run: `MSG-3.Q1`, `MSG-3.QF1`.

### Story 9.2: Send messages while verification changes

*MEC · Impl-1 · `done` · story file [`9-2-send-messages-while-verification-changes.md`](9-2-send-messages-while-verification-changes.md)*

- **Goal** (`epics.md` line 1061): As Camila, I want my first message to open one conversation with gapless order, and to fail cleanly if the business is rejected while I type (Annex A MEC, R-09).
- **Procedures:** `messaging.send` (canBuy), implementing `MSG-1`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"Conversation"`, `"Message"`.
- **Blast radius:** `b0aa967` (22 files, +536/−38). Code: `test-artifacts/atdd`, `test-artifacts/nfr`, `src/modules/identity`, `src/modules/messaging`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 6 bound tests, all passing in this session's run: `MSG-1.Q1`, `MSG-1.Q2`, `MSG-1.I3`, `MSG-1.R1`, `MSG-3.MEC`, `NFR-MSG-2.send`.

### Story 9.3: Generate the contact handoff for every product name

*MEC · Impl-1 · `done` · story file [`9-3-generate-the-contact-handoff-for-every-product-name.md`](9-3-generate-the-contact-handoff-for-every-product-name.md)*

- **Goal** (`epics.md` line 1077): As Camila, I want the WhatsApp contact message to name the product and price exactly for any name, so that the seller knows what I mean (Annex A MEC, R-09).
- **Procedures:** `inventory.contact` (canBuy), implementing `MSG-2`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"ContactRequestLog"`.
- **Blast radius:** `3fc7f87` (29 files, +689/−66). Code: `.env.example`, `test-artifacts/atdd`, `test-artifacts/nfr`, `app`, `docker-compose.yml`, `src/modules/listings`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 5 bound tests, all passing in this session's run: `MSG-2.Q1`, `MSG-2.I1`, `MSG-2.MEC`, `MSG-2.R1`, `NFR-MSG-1.contact`.

### Story 9.4: Refuse outsiders and businesses that initiate

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`9-4-refuse-outsiders-and-businesses-that-initiate.md`](9-4-refuse-outsiders-and-businesses-that-initiate.md)*

- **Goal** (`epics.md` line 1093): As Andrés, I want conversations to be buyer-initiated and private to their participants, so that the inbox cannot be spammed.
- **Procedures:** `messaging.send` (canBuy), implementing `MSG-1`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"Conversation"`, `"Message"`.
- **Blast radius:** `534ea0c` (3 files, +56/−5). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 3 bound tests, all passing in this session's run: `MSG-1.P3`, `MSG-1.P4`, `MSG-1.P5`.

### Story 9.5: Refuse hidden or business listings and rate-limit contact

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`9-5-refuse-hidden-or-business-listings-and-rate-limit-contact.md`](9-5-refuse-hidden-or-business-listings-and-rate-limit-contact.md)*

- **Goal** (`epics.md` line 1109): As Valentina, I want contact requests throttled, and refused for listings that cannot be contacted, so that my phone is never exposed needlessly.
- **Procedures:** `inventory.contact` (canBuy), implementing `MSG-2`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"ContactRequestLog"`.
- **Blast radius:** `7be44bf` (3 files, +55/−6). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 3 bound tests, all passing in this session's run: `MSG-2.P2`, `MSG-2.P3`, `MSG-2.P4`.

## 12. Epic 10: Trade offer negotiation (TRD)

- **Epic entry:** `epics.md` line 1141. Built whole in the epic-batched flow (#35).
- **Decision log:** #35. **Close review:** `2cc6939` (fix(epic-10)), PR [#8](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/8).
- **Impl-2 stories still reserved:** none.

Trading: offers, turn-by-turn counters with a version check before the turn, accepting the last unit from two sessions (one Accepted, one Unfulfillable), the trade handoff, cancel, completion and expiry at every read. All ten `trading.*` procedures are wired. Stories 10.4 and 10.5 left `impl2_scope` (#35).

### Story 10.1: Make, read and withdraw a trade offer

*Core · Impl-1 · `done` · story file [`10-1-make-read-and-withdraw-a-trade-offer.md`](10-1-make-read-and-withdraw-a-trade-offer.md)*

- **Goal** (`epics.md` line 1145): As Julián, I want to offer cards or cash for Valentina's listing and withdraw it while it is open, so that we can negotiate.
- **Procedures:** `trading.offer` (canBuy), `trading.reject` (authed), `trading.withdraw` (authed), `trading.get` (authed), `trading.mine` (authed), implementing `S-FR-TRD-1`, `S-FR-TRD-2w`, `S-FR-TRD-3.get`, `S-FR-TRD-3.mine`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"TradeOffer"`.
- **Blast radius:** `e3db29b` (22 files, +668/−56). Code: `src/modules/listings`, `src/modules/trading`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 4 bound tests, all passing in this session's run: `S-FR-TRD-1.h`, `S-FR-TRD-2w.h`, `S-FR-TRD-3.h`, `S-FR-TRD-3.mine.h`.

### Story 10.2: Counter an offer turn by turn

*Core · Impl-1 · `done` · story file [`10-2-counter-an-offer-turn-by-turn.md`](10-2-counter-an-offer-turn-by-turn.md)*

- **Goal** (`epics.md` line 1161): As Valentina, I want to counter Julián's offer on my turn, so that we can converge on terms.
- **Procedures:** `trading.counter` (authed), implementing `TRD-2`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"TradeOffer"`, `"TradeOfferRound"`.
- **Blast radius:** `26360ff` (15 files, +153/−28). Code: `test-artifacts/nfr`, `src/modules/trading`, `src/server`, `src/shared-kernel`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 3 bound tests, all passing in this session's run: `TRD-2.Q1`, `TRD-2.I3`, `NFR-TRD-2.counter`.

### Story 10.3: Accept the last unit from two sessions

*MEC · Impl-1 · `done` · story file [`10-3-accept-the-last-unit-from-two-sessions.md`](10-3-accept-the-last-unit-from-two-sessions.md)*

- **Goal** (`epics.md` line 1177): As Valentina, I want only one of two offers for my last copy to be accepted, so that I never promise a card twice (Annex A MEC, R-08).
- **Procedures:** `trading.accept` (authed), `trading.handoff` (authed), implementing `TRD-1`, `S-FR-TRD-3.handoff`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"TradeOffer"`.
- **Blast radius:** `2863e25` (20 files, +308/−43). Code: `test-artifacts/nfr`, `src/modules/listings`, `src/modules/trading`, `src/server`, `src/shared-kernel`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 6 bound tests, all passing in this session's run: `TRD-1.Q1`, `TRD-1.Q3`, `TRD-1.F1`, `TRD-1.I1`, `TRD-1.MEC`, `NFR-TRD-2.accept`.

### Story 10.4: Refuse stale, out-of-turn and duplicate offer actions

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`10-4-refuse-stale-out-of-turn-and-duplicate-offer-actions.md`](10-4-refuse-stale-out-of-turn-and-duplicate-offer-actions.md)*

- **Goal** (`epics.md` line 1193): As Julián and Valentina, I want every stale or out-of-turn action refused with the current state, so that negotiation never forks.
- **Procedures:** `trading.offer` (canBuy), `trading.counter` (authed), `trading.accept` (authed), `trading.reject` (authed), `trading.withdraw` (authed), implementing `TRD-1`, `TRD-2`, `S-FR-TRD-1`, `S-FR-TRD-2w`, `S-FR-TRD-3`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"TradeOffer"`, `"TradeOfferRound"`.
- **Blast radius:** `724e5bd` (3 files, +17/−11). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 12 bound tests, all passing in this session's run: `TRD-1.P2`, `TRD-1.P3`, `TRD-1.P4`, `TRD-1.P6`, `TRD-2.P2`, `TRD-2.P5`, `TRD-2.P6`, `TRD-2.P7`, `TRD-2.P8`, `S-FR-TRD-1.f`, `S-FR-TRD-2w.f`, `S-FR-TRD-3.f`.

### Story 10.5: Cancel, complete and expire trades exactly once

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`10-5-cancel-complete-and-expire-trades-exactly-once.md`](10-5-cancel-complete-and-expire-trades-exactly-once.md)*

- **Goal** (`epics.md` line 1209): As Julián and Valentina, I want cancel, completion and expiry to act exactly once, so that a reservation is released at most once.
- **Procedures:** `trading.cancel` (authed), `trading.confirmCompletion` (authed), implementing `TRD-3`, `S-FR-TRD-7`, `S-FR-TRD-9`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"TradeOffer"`.
- **Blast radius:** `0b562b6` (11 files, +167/−18). Code: `src/modules/trading`, `src/server`, `src/shared-kernel`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 8 bound tests, all passing in this session's run: `TRD-3.Q1`, `TRD-3.P1`, `TRD-3.P2`, `TRD-3.I1`, `S-FR-TRD-7.h`, `S-FR-TRD-7.f`, `S-FR-TRD-9.h`, `S-FR-TRD-9.f`.

## 13. Epic 11: Collections, binder and wishlist (COL)

- **Epic entry:** `epics.md` line 1225. Built through 11.4 in the epic-batched flow (#36).
- **Decision log:** #36. **Close review:** `a4bdaf4` (fix(epic-11)), PR [#9](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/9).
- **Impl-2 stories still reserved:** 11.5 (Use the binder, add external cards, move entries and wishlist cards); 11.6 (Refuse unsafe links, foreign entries and unknown wishlist cards).

Collections: up to 50 named collections plus "General", catalog cards added to them, and a closed order turned into exactly one prompt and one entry set, even under a duplicate `OrderClosed` and a double accept. Eight `collections.*` procedures and the `collections` subscriber are wired. Story 11.4 left `impl2_scope`; 11.5 (binder, external cards, wishlist) and 11.6 stay reserved (#36).

### Story 11.1: Organize my collections

*Core · Impl-1 · `done` · story file [`11-1-organize-my-collections.md`](11-1-organize-my-collections.md)*

- **Goal** (`epics.md` line 1229): As Julián, I want to create, rename, list and delete collections, so that I can organize my cards.
- **Procedures:** `collections.create` (authed), `collections.rename` (authed), `collections.delete` (authed), `collections.list` (authed), implementing `S-FR-COL-1.create`, `S-FR-COL-1.rename`, `S-FR-COL-1.delete`, `S-FR-COL-1.list`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"Collection"`, `"CollectionEntry"`.
- **Blast radius:** `c74a8c2` (16 files, +425/−36). Code: `src/modules/collections`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 4 bound tests, all passing in this session's run: `S-FR-COL-1.h`, `S-FR-COL-1.f`, `S-FR-COL-1.list.h`, `S-FR-COL-1.delete.h`.

### Story 11.2: Add catalog cards to a collection

*Core · Impl-1 · `done` · story file [`11-2-add-catalog-cards-to-a-collection.md`](11-2-add-catalog-cards-to-a-collection.md)*

- **Goal** (`epics.md` line 1245): As Julián, I want to add a catalog card with its quantity and acquisition date, so that my binder reflects what I own.
- **Procedures:** `collections.addEntry` (authed), implementing `COL-3`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"CatalogEntry"`, `"Collection"`, `"CollectionEntry"`.
- **Blast radius:** `572276a` (12 files, +120/−20). Code: `src/modules/collections`, `src/server`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 4 bound tests, all passing in this session's run: `COL-3.Q1`, `COL-3.Q2`, `COL-3.R1`, `COL-3.I2`.

### Story 11.3: Turn a closed order into one prompt and one entry set

*MEC · Impl-1 · `done` · story file [`11-3-turn-a-closed-order-into-one-prompt-and-one-entry-set.md`](11-3-turn-a-closed-order-into-one-prompt-and-one-entry-set.md)*

- **Goal** (`epics.md` line 1261): As Camila, I want each closed purchase to offer exactly one "add to collection" prompt that adds its lines once, so that my collection never duplicates a purchase (Annex A MEC, R-10).
- **Procedures:** `collections.prompts.accept` (authed), `collections.prompts.dismiss` (authed), `collections.prompts.list` (authed), implementing `COL-2`, `COL-1`, `COL-1.dismiss`, `COL-1.list`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"CollectionEntry"`, `"EventDelivery"`, `"Order"`, `"PostPurchasePrompt"`.
- **Blast radius:** `8eb9573` (7 files, +168/−27). Code: `src/modules/collections`, `src/server`. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 7 bound tests, all passing in this session's run: `COL-2.Q1`, `COL-2.I1`, `COL-2.I2`, `COL-1.Q1`, `COL-1.MEC`, `COL-1.dismiss.h`, `COL-1.list.h`.

### Story 11.4: Refuse foreign, resolved and invalid collection actions

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`11-4-refuse-foreign-resolved-and-invalid-collection-actions.md`](11-4-refuse-foreign-resolved-and-invalid-collection-actions.md)*

- **Goal** (`epics.md` line 1277): As Camila, I want a refused collection action to say why and change nothing, so that my binder stays consistent.
- **Procedures:** `collections.prompts.accept` (authed), `collections.addEntry` (authed), implementing `COL-1`, `COL-3`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"CatalogEntry"`, `"Collection"`, `"CollectionEntry"`, `"PostPurchasePrompt"`.
- **Blast radius:** `1de5bf8` (3 files, +14/−8). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 7 bound tests, all passing in this session's run: `COL-1.P1`, `COL-1.P2`, `COL-1.P3`, `COL-1.dismiss.f`, `COL-3.P2`, `COL-3.P3`, `COL-3.P4`.

## 14. Epic 12: Collection valuation and trends (VAL)

- **Epic entry:** `epics.md` line 1325. Built whole in the epic-batched flow (#37).
- **Decision log:** #37. **Close review:** `4ac1b02` (fix(epic-12)), PR [#10](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/10).
- **Impl-2 stories still reserved:** none.

Valuation: a collection valued exactly in BigInt COP from the catalog's reference prices (never stored, recomputed per request), the trend and the daily history, a zero baseline that reads `null`, never NaN, and a drift bound over 500 mixed entries proven by a fast-check property. Stories 12.4 and 12.5 left `impl2_scope` (#37).

### Story 12.1: Value a collection exactly

*Core · Impl-1 · `done` · story file [`12-1-value-a-collection-exactly.md`](12-1-value-a-collection-exactly.md)*

- **Goal** (`epics.md` line 1329): As Valentina, I want my collection's value summed exactly from the latest reference prices, with unvalued entries explained, so that I can trust the total.
- **Procedures:** `valuation.current` (authed), implementing `VAL-1`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: none: VAL stores nothing and reads through the catalog and collections ports (AD-VAL-2).
- **Blast radius:** `9fcbf33` (18 files, +304/−42). Code: `test-artifacts/nfr`, `src/modules/collections`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 4 bound tests, all passing in this session's run: `VAL-1.Q1`, `VAL-1.I1`, `VAL-1.I2`, `NFR-VAL-2.current`.

### Story 12.2: Show the valuation trend and daily history

*Core · Impl-1 · `done` · story file [`12-2-show-the-valuation-trend-and-daily-history.md`](12-2-show-the-valuation-trend-and-daily-history.md)*

- **Goal** (`epics.md` line 1345): As Valentina, I want the 30-day trend and a daily value series, so that I see how my collection moved.
- **Procedures:** `valuation.trend` (authed), `valuation.history` (authed), implementing `VAL-2`, `VAL-3`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: none: VAL stores nothing (AD-VAL-2).
- **Blast radius:** `e98bb02` (15 files, +295/−35). Code: `test-artifacts/nfr`, `src/modules/collections`, `src/server`, `src/shared-kernel`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 5 bound tests, all passing in this session's run: `VAL-2.Q1`, `VAL-3.Q1`, `VAL-3.I2`, `NFR-VAL-2.trend`, `NFR-VAL-2.history`.

### Story 12.3: Value 500 mixed entries with zero drift and a zero baseline

*MEC · Impl-1 · `done` · story file [`12-3-value-500-mixed-entries-with-zero-drift-and-a-zero-baseline.md`](12-3-value-500-mixed-entries-with-zero-drift-and-a-zero-baseline.md)*

- **Goal** (`epics.md` line 1361): As Valentina, I want large mixed collections valued without drift and new collections shown without a fake percentage, so that the numbers are never wrong (Annex A MEC, R-11).
- **Procedures:** `valuation.current` (authed), `valuation.trend` (authed), implementing `VAL-1`, `VAL-2`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: none: VAL stores nothing (AD-VAL-2).
- **Blast radius:** `c257cb9` (5 files, +54/−15). Code: `src/modules/collections`. Artifacts: `implementation-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 2 bound tests, all passing in this session's run: `VAL-1.MEC`, `VAL-2.I1`.

### Story 12.4: Refuse foreign collections and invalid periods

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`12-4-refuse-foreign-collections-and-invalid-periods.md`](12-4-refuse-foreign-collections-and-invalid-periods.md)*

- **Goal** (`epics.md` line 1377): As Valentina, I want valuation reads refused for collections that are not mine and for unsupported periods, so that values never leak or mislead.
- **Procedures:** `valuation.current` (authed), `valuation.trend` (authed), `valuation.history` (authed), implementing `VAL-1`, `VAL-2`, `VAL-3`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: none: VAL stores nothing (AD-VAL-2).
- **Blast radius:** `b850d1d` (2 files, +12/−5). Code: none. Artifacts: `implementation-artifacts`.
- **Test evidence:** 3 bound tests, all passing in this session's run: `VAL-1.P1`, `VAL-2.P2`, `VAL-3.P1`.

### Story 12.5: Explain empty series and rounding edges

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`12-5-explain-empty-series-and-rounding-edges.md`](12-5-explain-empty-series-and-rounding-edges.md)*

- **Goal** (`epics.md` line 1393): As Valentina, I want empty histories and edge percentages explained and rounded consistently, so that a small change never shows as −0 or a wrong figure.
- **Procedures:** `valuation.trend` (authed), `valuation.history` (authed), implementing `VAL-2`, `VAL-3`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: none: VAL stores nothing (AD-VAL-2).
- **Blast radius:** `a539a53` (3 files, +19/−12). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 2 bound tests, all passing in this session's run: `VAL-3.Q4`, `VAL-2.I3`.

## 15. Epic 13: Seller reputation and moderation (REP)

- **Epic entry:** `epics.md` line 1409. Built through 13.4 in the epic-batched flow (#38).
- **Decision log:** #38. **Close review:** `f549b79` (fix(epic-13)), PR [#11](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/11).
- **Impl-2 stories still reserved:** 13.5 (Read profiles, search moderation logs and hide listings); 13.6 (Refuse invalid moderation and bad aggregate requests).

Reputation: reviews written, edited and checked for eligibility (a business only after a closed purchase; paid is not enough), hide and unhide with logged snapshots, and aggregates that count exactly the visible reviews while a hide races a new post. The kernel's `textIssue` now refuses a NUL and counts minimums after trim in every stored free text (`eb0c677`, D4). Story 13.4 left `impl2_scope`; 13.5 (profiles, moderation logs, listing hide) and 13.6 stay reserved (#38). This epic closed the Impl-1 cut.

### Story 13.1: Write, edit and check eligibility for a review

*Core · Impl-1 · `done` · story file [`13-1-write-edit-and-check-eligibility-for-a-review.md`](13-1-write-edit-and-check-eligibility-for-a-review.md)*

- **Goal** (`epics.md` line 1413): As Camila, I want to review a business after my purchase closed, and an individual seller after meeting, so that other buyers can trust them.
- **Procedures:** `reputation.write` (canBuy), `reputation.edit` (canBuy), `reputation.eligibility` (authed), implementing `REP-1`, `REP-1.edit`, `REP-1.check`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"Review"`.
- **Blast radius:** `08f6185` (14 files, +353/−43). Code: `src/modules/reviews`, `src/server`, `src/shared-kernel`, `test-support`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 5 bound tests, all passing in this session's run: `REP-1.Q1`, `REP-1.Q1i`, `REP-1.I1`, `REP-1.edit.h`, `REP-1.check.h`.

### Story 13.2: Hide and unhide reviews with logged snapshots

*Core · Impl-1 · `done` · story file [`13-2-hide-and-unhide-reviews-with-logged-snapshots.md`](13-2-hide-and-unhide-reviews-with-logged-snapshots.md)*

- **Goal** (`epics.md` line 1429): As an admin, I want to hide abusive reviews and unhide mistakes, logging what I hid, so that moderation is reversible and accountable.
- **Procedures:** `reputation.admin.hide` (admin), `reputation.admin.unhide` (admin), implementing `REP-2`, `REP-2.unhide`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"Review"`, `"ReviewModerationLog"`.
- **Blast radius:** `56e5305` (13 files, +222/−32). Code: `src/modules/reviews`, `src/server`, `src/shared-kernel`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 8 bound tests, all passing in this session's run: `REP-2.Q1`, `REP-2.I1`, `REP-2.I2`, `REP-2.unhide.h`, `REP-2.unhide.f`, `REP-2.P2`, `REP-2.P3`, `NFR-REP-2.nextRead`.

### Story 13.3: Keep reputation honest: paid is not enough, and a racing hide never skews the aggregate

*MEC · Impl-1 · `done` · story file [`13-3-keep-reputation-honest-paid-is-not-enough-and-a-racing-hide-never-skews-the-aggregate.md`](13-3-keep-reputation-honest-paid-is-not-enough-and-a-racing-hide-never-skews-the-aggregate.md)*

- **Goal** (`epics.md` line 1445): As a buyer reading ratings, I want only closed purchases to review businesses, and aggregates that count exactly the visible reviews even while one is being hidden (Annex A MEC, R-12).
- **Procedures:** none over HTTP, implementing `REP-3`. The contracts are in-process ports that neighbours call (AD-SYS-2).
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"Review"`.
- **Blast radius:** `7cce159` (15 files, +223/−46). Code: `test-artifacts/nfr`, `src/modules/reviews`, `src/shared-kernel`. Artifacts: `implementation-artifacts`, `planning-artifacts`, `test-artifacts/nfr-evidence.md`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 6 bound tests, all passing in this session's run: `REP-1.MEC`, `REP-3.Q1`, `REP-3.I1`, `REP-3.MEC`, `REP-3.P1`, `NFR-REP-2.aggregates`.

### Story 13.4: Refuse self, unknown and duplicate reviews

*Failure-state · pulled forward from `impl2_scope` · `done` · story file [`13-4-refuse-self-unknown-and-duplicate-reviews.md`](13-4-refuse-self-unknown-and-duplicate-reviews.md)*

- **Goal** (`epics.md` line 1461): As a seller, I want self-reviews, reviews of non-sellers and duplicates refused, so that my rating cannot be gamed.
- **Procedures:** `reputation.write` (canBuy), implementing `REP-1`.
- **Database:** no DDL change (the Solu-2 schema `001_tezg_schema.sql` is applied unchanged). Tables: `"Review"`.
- **Blast radius:** `ac2051a` (3 files, +15/−7). Code: none. Artifacts: `implementation-artifacts`, `test-artifacts/traceability-matrix.md`.
- **Test evidence:** 5 bound tests, all passing in this session's run: `REP-1.P2`, `REP-1.P3`, `REP-1.I2`, `REP-1.edit.f`, `REP-1.check.f`.

## 16. AI governance

The full record is [`_bmad-output/decision-logs/impl-1-ai-decision-log.md`](../decision-logs/impl-1-ai-decision-log.md): 39 entries, each with its phase, persona or skill, prompt, AI output, human decision, reason, the artifacts it changed and who decided. **The operating rule:** the agent drafts and recommends; Martín Gómez decides, through a choice menu or in his own words, at the scope stage, at each spec approval and at each epic gate. The log never records an agent-inferred decision.

| Measure | Value |
|---|---|
| Entries | 39 (#1–#38 during the build, #39 for this close) |
| Tagged AI proposals (the index at the top of the log) | 12: 10 `[CORRECTED]`, 2 `[IMPROVED]` |
| Epic gates signed by Martín | 13 of 13 |
| Close reviews | 13, one per epic, each triaged into decisions, patches, deferrals and dismissed findings |
| Decisions where Martín did not take the agent's recommendation as offered | #33 (two of its items), #35 (D3, in a revised form), #38 (D4: the cross-cutting free-text check instead of REP only) |

**Corrections of AI output** (§6.1 item 5 asks for at least two). Examples, each tagged in the log:

- **#2 `[CORRECTED]`:** the agent's first Impl-1 cut (skeleton plus Core, Supporting and one Failure-state per module, with every MEC moved to Impl-2) was not dependency-closed. The 43-story cut replaced it.
- **#10 `[CORRECTED]`:** a request tRPC itself refuses was a 500 in the agent's Story 1.1; it is the client's mistake, a 400.
- **#11 `[CORRECTED]`:** six Solu-2 es-CO templates interpolated free text. No template carries free text now, and a test pins every placeholder.
- **#17 `[CORRECTED]`:** Plan-2 counted a replay as an attempt; a replay leaves `attempts` unchanged.
- **#20 `[CORRECTED]`:** the test wiring bound the simulated outbox, which skipped the redactor; it binds the production `PgOutboxV2`.
- **#32 `[CORRECTED]`:** the Solu-2 `createOrder` benchmark ignored ORD-1 P4 and the seed's open orders; only its Given changed.

**Hallucinations and invalid assumptions caught in review** (beyond the tagged index): a template that put a raw order state into a decision's text (#38), an in-process admin path that skipped the admin check (#38 R1), a free-text NUL that reached Postgres as a 500 (#38 D4), a binding test whose Given contradicted the contract (#34), and a benchmark count that did not match its NFR (#38).

**Environment.** Docker did not run in most build sessions. A local `postgresql-16` cluster on port 55432 (`max_connections=200`) ran `npm run test:ci`, and the agent read the script's own exit code before each push. Every run that exited non-zero is recorded in its epic's entry and was not pushed.

## 17. Test evidence and gate output

The output below is from one run of `npm test` in a fresh clone of `main` at `949c219`, on 2026-10-30, against the Compose PostgreSQL 16 (the README check, recorded in `docs/impl-1/README.md`). It exited 0 (`NPMTEST_EXIT=0`). The working copy's own `npm run test:ci` gave the same counts before each push of this close. The block below is an excerpt: absolute paths are shortened to the repository root, and long listings are cut where marked with "...".

**Summary.**

| Step | Result |
|---|---|
| `lint` | 0 errors, 3 warnings (unused variables in three ATDD files; `impl1-test-review.md` LOW-2) |
| `gate:deps` | 21 dependencies in 2 manifests: exact, approved, no high or critical advisory |
| `gate:prisma` | 55 models, each tagged with its owning module; `prisma/schema.prisma` is current |
| `test:unit` (`impl1-unit`) | 46 files, 582 tests passed |
| `typecheck` | clean |
| `test:lint-rules` | 43 tests in 13 suites, 43 pass, 0 fail, 0 skipped, 0 todo |
| `gate:api:solu2` | 142 operations, 111 ingress procedures, 159 schemas, 37 core operations checked against `contracts.md`; surface is current |
| `gate:ui:solu2` | 43 pages, 327 states (138 data, 77 refusal, 112 client), 0 problems |
| `gate:codes:solu2` | 200 code citations checked, 0 problems |
| `gate:ids:solu2` | 190 test ids cited by `contracts.md`; 391 defined under `_bmad-output/test-artifacts` |
| `gate:trace:solu2` | 96 FRs, 56 NFRs, 61 AD rows, 20 risks, 112 clauses, 391 tests; 0 problems |
| `gate:epics:solu2` | `epics.md` is current: 13 epics, 69 stories |
| `gate:purity` | 13 domain files checked, 0 problems |
| `test:fitness:solu2` | 2 files, 12 tests passed |
| `gate:atdd-red:impl1` | 352 tests in 19 files; 324 green for done stories; 28 red for the right reason (the 7 reserved stories); 0 not as expected |
| `gate:nfr-red:impl1` | 23 tests in 12 files; 23 green for done stories; 0 not as expected |

**Terminal output** (the first and last lines of each step; the RuleTester case listing is cut):

```text
> tezg@0.0.0 test
> npm run db:up && npm run test:ci

> tezg@0.0.0 db:up
> docker compose up -d --wait postgres
 Container tezg-postgres-1 Running
 Container tezg-postgres-1 Healthy

> tezg@0.0.0 lint
_bmad-output/test-artifacts/atdd/com_supporting.test.ts
  23:7  warning  'ledger' is assigned a value but never used ...  @typescript-eslint/no-unused-vars
_bmad-output/test-artifacts/atdd/inv_contracts.test.ts
  9:10  warning  'admin' is defined but never used ...  @typescript-eslint/no-unused-vars
_bmad-output/test-artifacts/atdd/ver_supporting.test.ts
  17:10  warning  'application' is defined but never used ...  @typescript-eslint/no-unused-vars
✖ 3 problems (0 errors, 3 warnings)

> tezg@0.0.0 gate:deps
21 dependencies in 2 manifests: exact, approved, no high or critical advisory

> tezg@0.0.0 gate:prisma
55 models, each tagged with its owning module; prisma/schema.prisma is current

> tezg@0.0.0 test:unit
> vitest run --project impl1-unit
 Test Files  46 passed (46)
      Tests  582 passed (582)
   Duration  17.50s

> tezg@0.0.0 gate:impl1
> tezg@0.0.0 typecheck
> tsc --noEmit

> tezg@0.0.0 test:lint-rules
ok 1 - tezg/error-owner
ok 2 - tezg/table-owner
ok 3 - tezg/regulated-select
ok 4 - tezg/legal-identity-confined
...
# tests 43
# pass 43
# fail 0
# skipped 0
# todo 0

> tezg@0.0.0 gate:api:solu2
142 operations, 111 ingress procedures, 159 schemas, 37 core operations checked against contracts.md; surface is current
> tezg@0.0.0 gate:ui:solu2
43 pages, 327 states (138 data, 77 refusal, 112 client), 0 problems
> tezg@0.0.0 gate:codes:solu2
200 code citations checked, 0 problems
> tezg@0.0.0 gate:ids:solu2
190 test ids cited by contracts.md; 391 defined under _bmad-output/test-artifacts; 37 core operations
> tezg@0.0.0 gate:trace:solu2
trace: 96 FRs, 56 NFRs, 61 AD rows, 20 risks, 112 clauses, 391 tests; 0 problems
> tezg@0.0.0 gate:epics:solu2
_bmad-output/planning-artifacts/epics.md is current: 13 epics, 69 stories
> tezg@0.0.0 gate:purity
13 domain files checked, 0 problems

> tezg@0.0.0 test:fitness:solu2
> vitest run --project solu2-fitness
 Test Files  2 passed (2)
      Tests  12 passed (12)
   Duration  16.89s

> tezg@0.0.0 gate:atdd-red:impl1
solu2-atdd: 352 tests in 19 files; 28 red for the right reason; 324 green for done stories (363 contracts or test ids done); 0 not as expected

> tezg@0.0.0 gate:nfr-red:impl1
solu2-nfr: 23 tests in 12 files; 0 red for the right reason; 23 green for done stories (363 contracts or test ids done); 0 not as expected
NPMTEST_EXIT=0
```

**Benchmarks of that run** (milliseconds, n = 500 after 50 warm-up calls, nearest-rank p95; Compose PostgreSQL 16 in this session's container, so the figures differ from the per-epic ones in `nfr-evidence.md`, which came from earlier sessions; every p95 is under its PRD threshold):

| Benchmark | p50 | p95 | Threshold (p95) |
|---|---|---|---|
| `[NFR-CAT-1.browse]` | 2.7 | 18.4 | ≤ 1,000 |
| `[NFR-CAT-1.provenance]` | 5.3 | 17.1 | ≤ 300 |
| `[NFR-COM-3.deduction]` | 3.1 | 8.3 | ≤ 200 |
| `[NFR-COM-3.topUp]` | 3.5 | 8.0 | ≤ 800 |
| `[NFR-DSC-1.scale]` | 97.0 | 145.1 | ≤ 1,500 |
| `[NFR-DSC-1.seed]` | 14.1 | 25.1 | ≤ 1,000 |
| `[NFR-INV-4.bundle]` | 11.4 | 22.4 | ≤ 300 |
| `[NFR-INV-4.create]` | 4.6 | 10.4 | ≤ 800 |
| `[NFR-INV-4.reserve]` | 4.1 | 10.7 | ≤ 150 |
| `[NFR-MSG-1.contact]` | 4.2 | 9.8 | ≤ 200 |
| `[NFR-MSG-2.send]` | 5.3 | 10.6 | ≤ 500 |
| `[NFR-ORD-2.p95]` | 9.3 | 19.0 | ≤ 800 |
| `[NFR-REP-2.aggregates]` | 1.9 | 3.3 | ≤ 300 |
| `[NFR-REP-2.nextRead]` | 1.0 | 2.5 | ≤ 300 |
| `[NFR-TRD-2.accept]` | 11.0 | 17.4 | ≤ 800 |
| `[NFR-TRD-2.counter]` | 3.8 | 8.4 | ≤ 500 |
| `[NFR-VAL-2.current]` | 97.8 | 139.3 | ≤ 1,500 |
| `[NFR-VAL-2.history]` | 265.3 | 348.1 | ≤ 2,500 |
| `[NFR-VAL-2.trend]` | 234.3 | 299.7 | ≤ 1,500 |
| `[NFR-VER-3.queue]` | 1.8 | 4.6 | ≤ 1,000 |
| `[NFR-VER-3.sign]` | 2.5 | 5.8 | ≤ 300 |

## 18. Known limits

Every open item of [`deferred-work.md`](deferred-work.md), grouped by its owner. None is a defect in a done story's contract: each is either outside the Impl-1 cut, waiting for a provider or a page, or a hardening the reviews chose not to do now.

### Owner: Impl-2

| Item | Where it is recorded |
|---|---|
| **The 7 reserved stories:** 8.5 (reconcile ledgers), 8.6 (rates and the admin ledger), 9.6 (inbox, read marks, mute), 11.5 (binder, external cards, move and copy, wishlist), 11.6 (their refusals), 13.5 (profiles, moderation logs, listing hide), 13.6 (their refusals). Their 28 ATDD tests stay red for `NotImplementedError` and their 24 procedures stay unwired. `completionPercent` (AD-COL-1 rule 5) is still a stub | `deferred-work.md`, Epics 8, 9, 11 and 13 |
| **Story 2.4's completion:** sign-up and sign-in are not configured, so nothing writes `"AuthThrottleEvent"` yet; the throttle hardening (per-account lockout, the `ipHmac` and null rules, millisecond instants) and the flood of denied rows in `"LegalIdentityAccessLog"` go with it (decision #26) | Stories 2.4, Epic 3 review |
| **The jobs route:** no story builds `jobs/trm-fetch` (Story 4.4), the catalog's `daily-night` run (4.1), `jobs/expiry-materialize` (`expireDueOrders`, 7.5), `expireDueOffers` (10.5) or `jobs/commission-reconcile` (8.5), nor `JOBS_SECRET`, the single-flight locks (`job:trm-fetch`, `job:expiry-materialize`, `job:commission-reconcile`), the logger port that isolates a failing order or seller, or the admin's `actorId` on `catalog.fx.retry`. Expiry is still correct at every read and command (AD-ORD-2 rule 8, AD-TRD-1 rule 5). The Impl-2 plan must give it a story | Stories 4.1, 4.4, 7.5, 10.5, Epics 4, 7, 10 reviews |
| **NFR benchmarks without one yet:** NFR-REP-2's profile read (Story 13.5's DoD), NFR-COL-2's binder and wishlist (Story 11.5), and NFR-IDN-1's capability reads (no story names it; Impl-2 test hardening, decision #39). NFR-COL-2 and NFR-IDN-1 stay "Planned — story DoD" | `nfr-evidence.md`, `impl1-final-trace.md` §4 |
| **`getAvailabilitySummary`:** the area filter's batch `getSellerKinds` port and AD-INV-3 rule 2's parity test (Story 11.5, its only consumer) | Epic 5 spec and review |
| **Race windows accepted at review:** an application decision for a business with no listings is not serialized with a listing creation (Epic 5's follow-up); REP-1 reads the target before its write transaction (Epic 13's follow-up) | Epics 5 and 13 reviews |
| **Test hardening** (Impl-2), from the test review and the close: NFR-IDN-1's benchmark, and two lock-wait tests that sleep 200 ms, the watchdog copied into seven files, four long files, three lint warnings, shared state in `composition.test.ts` | `impl1-test-review.md` |

### Owner: the launch checklist (production adapters and settings)

| Item | Where it is recorded |
|---|---|
| **Production `ObjectStorage` and `MalwareScanner`** (Epics 3, 7, 8): `compose()` binds `UNWIRED_STORAGE` and `UNWIRED_SCANNER`, so a production document, comprobante or top-up proof fails as NotImplemented (500), never silently. With them come the single-use **upload ticket** with a size cap at upload time (it also closes the one-proof-two-requests race of Epic 8), the payment QR, the reconciliation sweep for an ambiguous COMMIT, and re-checking the scanner's sanitized output | Story 3.1, Epics 3, 7 and 8 |
| **Production `CatalogFeedSource` and `FxRateSource`** (Epic 4): `UNWIRED_FEED` and `UNWIRED_FX` today. The TRM reader needs an HTTP client, NFR-CAT-4's three retries and the live dataset's fields checked | Stories 4.1, 4.4 |
| **`IP_HMAC_KEY`** (≥ 32 bytes) must be set in production; `loadConfig()` refuses to start without it. So must `BETTER_AUTH_SECRET` | Epic 9 spec (decision #34) |
| **The support contact** must be set by an admin before `orders.supportContact.get` stops answering 500 | Epic 7 spec (decision #32) |
| **NFRs measured only on a deployed system:** NFR-SYS-11 (WCAG 2.2 AA), and the upload transfer times of NFR-VER-4 and NFR-ORD-2 on a 10 Mbps link | `nfr-evidence.md` |
| **The Docker image build** needs Docker Hub (the `node:22.12.0-bookworm-slim` base image) and the npm registry from inside the build stage. Behind a TLS-re-signing proxy `npm ci` fails ("Exit handler never called"), and the Dockerfile has no setting for a proxy CA; the README says so | `deferred-work.md`, the README check in `docs/impl-1/README.md` |

### Owner: the UI phase (after Impl-2, decision #3)

| Item | Where it is recorded |
|---|---|
| **Raw tokens and ISO instants inside es-CO texts:** `OrderNoLongerActive`, `OrderNotCancellable`, `ComprobanteInvalidFile`, `NotBusinessAccount` (status tokens), `PromptAlreadyResolved` (status and instant), `ReviewAlreadyHidden` (instant), `TickSilent`'s "(sin dato)", and the rejection status copy. The pages map them (UI 6.2, 6.3, 9.4, 11.3, 12.3) | Epics 1, 3, 7, 9, 11, 13 |
| **DTO decision fields** the contracts name but the DTOs lack: the card detail's empty state (UI 2.2), each prompt row's decision (UI 6.2, 9.4), the admin lookup's deliveries and truncation flag (admin console) | Epics 6, 7, 11 reviews |
| **Page behaviour:** the account page's 50 ledger lines with no cursor (UI 7.2), a search page that can come back short after the verification filter (page 3.1), the trade handoff regenerated from the listing as it is now (UI 8.2), the trend and history windows (UI 10.1, 10.2), the collection-name key of "Keep " and "Keep" (UI 9.1, 9.4), the rejection reason's text never shown to the business, the 35 s message visibility (UI 12.2) | Epics 6, 8, 10, 11, 12 |

### Owner: the next contract revision

`messaging.send`'s 2,000-unit bound counts UTF-16 before NFC (MSG-1 counts code points after NFC); `catalog.browse` has no page cap and no filter-length bound; `bankName` has no length bound; §0.3's free-text check passes invisible characters and lone surrogates; VAL's 36 h staleness constant duplicates the catalog's. Each is in `deferred-work.md` with its epic.

### Owner: whoever owns CI

The three VAL benchmarks take about 313 of the suite's 675 test-seconds (143.3 s, 114.4 s and 55.4 s); decide whether `solu2-nfr` runs on every push (`impl1-test-review.md` LOW-4).

### Owner: the Impl-2 close's trace

`traceability-matrix.md` still shows each test's Solu-2 design state ("red") beside its done story; the implementation result is in `impl1-final-trace.md`, and the generator was left unchanged (#39). The generator also still splits a status cell on every semicolon, so `nfr-evidence.md` keeps its details free of them by convention.

### Static-analysis limits (Story 1.4)

`regulated-select` and `legal-identity-confined` read the repository's literal SQL style, so concatenated or interpolated table names escape them; `error-owner` misses an aliased `raiserFor`. The DB-backed fitness tests remain the proof. No such code exists today.

## 19. How to reproduce

**From a clean clone** (the README check of this close, run on 2026-10-30 in a fresh `git clone` of `main` at `949c219`; on Windows, clone with `git clone -c core.longpaths=true …`, as the README says):

```bash
git clone https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management.git tezg
cd tezg
npm ci
cp .env.example .env
npm run db:up
npm run db:migrate
npm test
```

`npm test` is `npm run db:up` followed by `npm run test:ci`: lint, `gate:deps`, `gate:prisma`, the unit tests, then `gate:impl1` (typecheck, the lint-rule tests, the Solu-2 contract gates, `gate:purity`, the fitness suite and the two red gates). The outcome of every README step is in `docs/impl-1/README.md` ("README check from a clean clone").

**The per-story results** (the JSON the final trace reads):

```bash
npx vitest run --project solu2-fitness --reporter=json --outputFile=.vitest-results/solu2-fitness.json
npx vitest run --project impl1-unit --reporter=json --outputFile=.vitest-results/impl1-unit.json
```

`npm run test:ci` writes `.vitest-results/solu2-atdd.json` and `solu2-nfr.json` itself, and each benchmark writes its figures next to them.

**Without Docker**, point the tests at any PostgreSQL 16 with `max_connections=200` and a `tezg`/`tezg` superuser, through `TEZG_PG_HOST` and `TEZG_PG_PORT`, and run `npm run test:ci`.
