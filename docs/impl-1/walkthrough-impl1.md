# Impl-1 Walkthrough: the delivery of 2026-10-26

This walkthrough covers the six stories of the delivery cut (decision log #22, `task-statement.md` Appendix B.0): the foundation stories 1.1–1.3 and the Identity stories 2.1–2.3. For each story it gives the business goal (citing its entry in `docs/solu-2/planning/epics.md`), the procedures implemented, the database changes, the blast radius and the test evidence. The last sections hold the AI governance summary, the terminal output of the passing suite and gates, and the known limits.

The other 37 Impl-1 stories continue after the delivery, one epic at a time (§9). Their ATDD tests stay red for the right reason (`NotImplementedError`), and the red gate reports them apart: they are pending scope, not failures or skips.

## Contents

1. [Scope and ceremony](#1-scope-and-ceremony)
2. [Architecture and directory layout](#2-architecture-and-directory-layout)
3. [Story 1.1: one typed, explained error body](#3-story-11-one-typed-explained-error-body)
4. [Story 1.2: audit trail and redaction at every egress](#4-story-12-audit-trail-and-redaction-at-every-egress)
5. [Story 1.3: outbox delivery, exactly once in effect](#5-story-13-outbox-delivery-exactly-once-in-effect)
6. [Story 2.1: complete the individual-seller profile](#6-story-21-complete-the-individual-seller-profile)
7. [Story 2.2: exactly one seller track wins a race](#7-story-22-exactly-one-seller-track-wins-a-race)
8. [Story 2.3: explain why an account may not list](#8-story-23-explain-why-an-account-may-not-list)
9. [Test evidence and gate output](#9-test-evidence-and-gate-output)
10. [AI governance](#10-ai-governance)
11. [Known limits](#11-known-limits)
12. [How to reproduce](#12-how-to-reproduce)

## 1. Scope and ceremony

| Story | Module | Kind | Status | Commit(s) |
|---|---|---|---|---|
| 1.1 | SYS | Skeleton | done | `edf22a4`, `9114475` |
| 1.2 | SYS | Skeleton | done | `a0fc7fb` |
| 1.3 | SYS | Skeleton | done | `65741c1` |
| 2.1 | IDN | Core | done | `7f903f2` |
| 2.2 | IDN | MEC | done | `2189038` |
| 2.3 | IDN | Failure-state | done | `5325d67` |

`docs/impl-1/implementation-artifacts/sprint-status.yaml` records all six as `done`. Epics 1 and 2 stay `in-progress`, because each has stories after the cut.

**Status progression.** Each story is committed once, when it is `done`, so the git history of `sprint-status.yaml` shows `backlog → done` per story commit. The steps in between are recorded in each story file's Change Log and Dev Agent Record:

| Story | Progression | Where it is recorded |
|---|---|---|
| 1.1 | ready-for-dev → in-progress → review (2026-10-24) → done (2026-10-25) | Change Log; Dev Agent Record, "Status" |
| 1.2 | ready-for-dev → in-progress → review → done | Change Log; Task 6.5 |
| 1.3 | ready-for-dev → in-progress → review → done | Change Log |
| 2.1 | ready-for-dev → in-progress → done, after the fresh-context review | Change Log |
| 2.2 | ready-for-dev → done: a proof-only story with no production code (decision #23) | Change Log |
| 2.3 | ready-for-dev → in-progress → done, after the fresh-context review | Change Log |

Stories 1.1–1.3 passed through `review` in sprint-status, as the Full Ceremony requires. Under the compact ceremony (decision #22), stories 2.1–2.3 ran their review without changing the sprint-status value.

**The ceremony as run.**

- **Stories 1.1–1.3 ran the Full Ceremony** (`task-statement.md` §3):
  - `bmad-create-story` wrote the story file against the DoR checklist;
  - `bmad-dev-story` built it test-first against the bound ATDD tests;
  - `bmad-code-review` ran in a fresh context;
  - every finding was fixed or triaged in the story file's Review Findings table.
- **Stories 2.1–2.3 ran the compact ceremony** (decision #22):
  - each has a short story file;
  - `bmad-dev-story` still worked test-first;
  - `bmad-code-review` ran in a fresh-context subagent;
  - the High and Medium findings were triaged.
- **Proof-only stories** such as 2.2 are committed directly after the story they prove (decision #23).

Each story file under `docs/impl-1/implementation-artifacts/` holds the full record: acceptance criteria, tasks, Dev Notes, the review report and the File List.

## 2. Architecture and directory layout

TEZG is a modular monolith in hexagonal style (Plan-2 ARCHITECTURE, Solu-2 detailed design).

- **Inbound adapters.**
  - `app/api/trpc/[trpc]/route.ts` serves tRPC 11 on the non-batched wire (`allowBatching: false`). It builds the app from the composition root `src/server/composition.ts` on the first request (decision #24).
  - `app/api/auth/[...all]/route.ts` mounts Better Auth, which reads the session cookie behind every `authed` and `admin` procedure.
  - `app/api/health/` holds the liveness and readiness probes.
  - The Next.js 16 App Router app has no pages; the front end is a later phase (decision #3).
- **Modules.** Each module folder under `src/modules/<module>/` has the same five layers:

  | Layer | Contents |
  |---|---|
  | `domain/` | Pure code: no framework, driver, network or wall clock |
  | `application/` | Use cases |
  | `ports/` | Repository and dependency ports |
  | `dto/` | Request and response types |
  | `infra/` | SQL repositories |

  - Other modules import a module only through its `index.ts`, and only along the AD-1 edges.
  - `gate:purity` and the fitness suite enforce both rules.
- **Shared kernel** (`src/shared-kernel/`): the cross-cutting SYS module.
  - The ports: `Clock`, `IdGenerator`, `TransactionRunner`, `Sql`/`Tx`, the outbox and the audit log.
  - The error registry (`codes.ts`, `raise.ts`), the Decision shape, the es-CO message catalog and the redactor.
  - The outbox dispatcher, the ambient transaction (`db.ts`) and the validated configuration.
- **Persistence.**
  - PostgreSQL 16. The SQL DDL in `docs/solu-2/planning/detailed-design/schemas/` is the schema source of truth, and `npm run db:migrate` applies it.
  - Repositories run SQL through the `Sql`/`Tx` ports.
  - The Prisma model is generated from the migrated database (`npm run db:pull`) and backs Better Auth only.
- **Determinism.**
  - Time and ids come only through ports.
  - Every external system is a simulated adapter.
  - The tests run behind a network guard on a virtual clock.

**Twelve logical modules in nine folders.** Each `*.v2.ts` use-case file opens with a block generated from `operations.json` (the use-case interface), followed by hand-owned code: the service class and the repository port (decision #14). Every method not yet built throws `NotImplementedError`.

| Folder | Logical modules (use-case files) |
|---|---|
| `identity` | IDN (`idn.v2.ts`), VER (`ver.v2.ts`) |
| `catalog` | CAT (`cat.v2.ts`) |
| `listings` | INV (`inv.v2.ts`), DSC (`dsc.v2.ts`), plus the contact projection (`contact.v2.ts`) |
| `orders` | ORD (`ord.v2.ts`) |
| `commission` | COM (`com.v2.ts`) |
| `trading` | TRD (`trd.v2.ts`) |
| `messaging` | MSG (`msg.v2.ts`) |
| `collections` | COL (`col.v2.ts`), VAL (`val.v2.ts`) |
| `reviews` | REP (`rep.v2.ts`) |

| Path | Contents |
|---|---|
| `app/` | Route handlers (tRPC, health) |
| `src/modules/` | The nine module folders above |
| `src/shared-kernel/` | SYS: ports, registries, outbox, audit, redaction |
| `src/server/` | Server wiring: the composition root, the tRPC router and formatter, Better Auth and its session reader, health, the database pool |
| `prisma/schema.prisma` | Generated model (55 models, each tagged with its owning module) |
| `test-support/` | Per-file test databases, virtual clock, sequential ids, simulated adapters, the Reference Seed Profile |
| `docs/solu-2/` | Detailed design (`contracts.md`, `openapi.yaml`, events, DDL) and the ATDD and fitness suites |
| `docs/impl-1/` | Task statement, sprint status, story files, this walkthrough, the AI decision log |
| `scripts/`, `tools/lint/` | Gates, generators, the migration runner, the lint toolchain |

## 3. Story 1.1: one typed, explained error body

- **Epic entry:** `epics.md`, "Story 1.1" (line 357). Skeleton; risks R-15 (P0), R-16 (P1).
- **Story file:** `implementation-artifacts/1-1-refuse-every-request-with-one-typed-explained-error-body.md`.
- **Business goal.** Every client of the 108 tRPC procedures gets one refusal shape, so that no screen has to guess what went wrong. The shape is `{ error: ErrorBody }`, carrying:
  - the registry code and its HTTP status;
  - an es-CO message;
  - a cited decision.

  Driver text and stack traces never leak.

**Procedures and code.**

- **`raiserFor(module)` enforces AD-11.** Each code has one owner; a module that raises another module's code fails as `Unexpected`.
- **The registry and catalog are generated.** The registry holds 87 codes. The generator emits the es-CO message catalog and the zod inputs from `operations.json` and `contracts.md` §13.
- **`toErrorBody` maps every error:**
  - a domain error keeps its code;
  - a zod failure becomes `RequestValidationFailed` with es-CO `issues`;
  - a request tRPC itself refuses (unknown path, wrong method, batching) is a 400, not a 500 (decision #10);
  - anything else is `Unexpected` (500).
- **The router.** It registers all 108 non-job procedures from the generated `PROCEDURES`/`INPUTS` tables. Its four procedure builders delegate every gate to identity. Story 1.1 bound `UNWIRED_IDENTITY`; decision #24 replaced it with identity's `IdentityGateV2` in production (§11).
- **The wire.** The formatter and `responseMeta` put the `ErrorBody` on the wire with its status. A per-request clock lives in `AsyncLocalStorage`, so a refusal raised before tRPC creates a context still carries the injected instant.
- **No template interpolates free text** (decision #11). A test pins every placeholder to an id, an instant, a number, a field name or an enum value.
- **CI.** `.github/workflows/impl1-quality-gate.yml` runs `npm run test:ci` on push and pull request. The Solu-1 and Solu-2 workflows became manual.

**Database changes.** None.

**Blast radius.**

- Every tRPC response passes through the new formatter.
- All 108 procedures now exist, and each throws `NotImplementedError` until its own story lands.

**Test evidence.**

- **ATDD (5):** `SYS-1.R2`, `SYS-1.R6`, `SYS-1.R6.unexpected`, `SYS-1.R6.s2`, `SYS-8.R2`.
- **Unit:**

  | File | Tests |
  |---|---|
  | `src/server/trpc/errors.test.ts` | 20 |
  | `router.test.ts` | 15 |
  | `inputs.test.ts` | 3 |
  | `src/shared-kernel/messages.test.ts` | 7 |

- **Diff:** `edf22a4` (23 files, +1545/−54) and the follow-up `9114475` for decisions #10 and #11 (8 files, +113/−26).

**Review.** `bmad-code-review` ran in a fresh context and found 2 Medium and 10 Low.

| # | Finding | Triage |
|---|---|---|
| M1 | `invalid_value` echoed registry codes into `issues` | Fixed |
| M2 | Nothing compared the manual Solu-2 workflow with its docs mirror | Fixed: a `cmp` step in CI |
| L1, L4, L5, L7 | Echoed client keys, a shared clock variable, the zod emitter, the role-key test | Fixed |
| L2, L8 | tRPC's own refusals as 500; free text in templates | Fixed by decisions #10 and #11 |
| L3 | No log line for an `Unexpected` | Deferred to Story 1.2, which brings the logger |
| L6, L9, L10 | UTC offsets, the generator check test, stale story text | No change, each with its reason |

## 4. Story 1.2: audit trail and redaction at every egress

- **Epic entry:** `epics.md`, "Story 1.2" (line 373). Skeleton; NFR-SYS-8; risks R-13 (P0), R-18 (P1).
- **Story file:** `implementation-artifacts/1-2-record-an-audit-trail-and-keep-regulated-data-out-of-every-egress.md`.
- **Business goal.** Two guarantees for the data protection officer, so that NFR-SYS-2 and NFR-SYS-8 hold by construction:
  - every change is audited in its own transaction;
  - every regulated value is redacted before it leaves a module.

**Procedures and code.**

- **`PgAuditLog.record(tx, …)`** writes one append-only `audit_events` row in the caller's transaction, with its id and instant taken from the ports. The application role `tezg_app` cannot UPDATE or DELETE that table.
- **`redact`** removes regulated values before they leave a module:
  - it walks objects and arrays the way `JSON.stringify` would emit them;
  - it survives cycles and stops at depth 32;
  - it drops `Error` instances whole.
- **The error formatter** redacts every domain citation.
- **`serveTrpc`** logs one structured `trpc.unexpected` line for each `Unexpected`, with the cause class and, for a pg driver error only, its SQLSTATE. A throwing log sink never changes the response.

**Database changes.** No DDL. The story writes `audit_events`, a table from the Solu-2 DDL.

**Blast radius.**

- Every audited write in later stories goes through `PgAuditLog`.
- Every log line, audit row and error citation goes through `redact`.

**Test evidence.**

- **ATDD (4):** `SYS-8.R4`, `SYS-8.R4.redact`, `SYS-8.R4.error`, `SYS-R2`.
- **NFR:** `NFR-SYS-8.canary`, a canary scan of every egress, about 6.3 s. Decision #12 corrected the order the scan names.
- **Unit:**

  | File | Tests |
  |---|---|
  | `src/shared-kernel/regulated.test.ts` | 10 |
  | `src/shared-kernel/infra/pg-audit.test.ts` | 3 |
  | the router tests for the `onError` log line | — |

- **Diff:** `a0fc7fb` (13 files, +660/−43).

**Review.** No High findings.

| # | Finding | Triage |
|---|---|---|
| M1 | `redact` passed class instances through unwalked | Fixed |
| L2 | `sqlState` accepted non-driver codes | Fixed |
| L3 | A throwing sink replaced the `ErrorBody` | Fixed |
| N1 | `toErrorBody` runs twice per error | Kept |
| N2 | Minified class names in `errorClass` | Dismissed |
| N3 | Case-sensitive regulated names | Out of scope; raised for Story 1.4 |

## 5. Story 1.3: outbox delivery, exactly once in effect

- **Epic entry:** `epics.md`, "Story 1.3" (line 389). Skeleton; NFR-SYS-6; risk R-14 (P0).
- **Contract:** `S-SYS.replay` `replayEventDelivery`.
- **Story file:** `implementation-artifacts/1-3-deliver-every-committed-event-exactly-once-in-effect.md`.
- **Business goal.** Every committed domain event reaches each subscriber exactly once in effect, even across handler throws, crashes and sweeper races. An admin can replay a failed delivery.

**Procedures and code.**

- **`PgOutboxV2.enqueue(tx, …)`** writes the event and its pending deliveries in the publisher's transaction, and redacts the payload.
- **`OutboxDispatcherV2`** follows the AD-SYS-2 rule 4 attempt procedure to the letter:
  - at most 3 automatic attempts;
  - rows claimed with `FOR UPDATE SKIP LOCKED`;
  - handler effects in the same transaction as the delivery row;
  - only a handler throw counts as a failed delivery.
- **The sweep** retries pending deliveries older than 60 s, at most 50 per run.
- **Replay** follows rule 7, as corrected by decisions #15 and #17: it leaves `attempts` unchanged, and `EventReplayLog` counts the replays.
- **`replayEventDelivery`** returns an explained decision, citing one of the stored-only §13 rows `EventDeliveryReplayed` and `EventDeliveryReplayInProgress` (decision #16).
- **Kernel and generator.**
  - The es-CO catalog moved into the shared kernel (decision #19).
  - The generator emits only a marked block and keeps hand-owned code after it (decision #14).
  - Decisions #18, #20 and #21 corrected the fitness scanner, the test wiring and the ownership of the `dispatch`/`sweep` wiring.

**Database changes.** No DDL.

| Access | Tables |
|---|---|
| Writes | `"OutboxEvent"`, `"EventDelivery"`, `"EventReplayLog"` |
| Reads | `"OutboxEvent"`, `"EventDelivery"` |

**Blast radius.**

- Every module that publishes an event (commission, listings, collections) relies on this dispatcher.
- Every `*.v2.ts` service file is now generated in its marked-block form.

**Test evidence.**

- **ATDD (6):** `SYS-2.R4`, `SYS-2.R4.code`, `SYS-2.R6`, `SYS-2.R6.young`, `S-SYS.replay.h`, `S-SYS.replay.f`.
- **NFR:** `NFR-SYS-6.sweep`, about 4.9 s.
- **Unit:**

  | File | Tests |
  |---|---|
  | `src/shared-kernel/dispatcher.test.ts` | 14 |
  | `admin-events.test.ts` | 3 |
  | `infra/pg-outbox.test.ts` | 4 |
  | `scripts/lib/migrations.test.ts` | 4 |

- **Over HTTP** (decision #24, `src/server/composition.test.ts`): `admin.events.replay` behind an admin's session returns 200 `delivered`, and the `"EventReplayLog"` row names the session admin; a signed-in non-admin gets `AdminOnly` 403, and the delivery stays `failed`.
- **Diff:** `65741c1` (47 files, +1362/−218).

**Review.** No High findings.

| # | Finding | Triage |
|---|---|---|
| M1 | Any error was treated as a handler throw | Fixed |
| M2 | Test gaps | Fixed: 7 tests added |
| M3 | A kernel import of `src/server` | Fixed by decision #19 |
| M4 | `dispatch()` and `sweep()` are not wired in production | Assigned by decision #21 |
| L1 | Step 1 over-counts `attempts` under contention | Kept; raised for the Epic 1 gate |
| L2 | Replay's `lastAttemptAt` | Fixed |
| L3 | Shared `wiring().repo` | Deferred |
| L4 | The generator overwrote files with lost markers | Fixed |

## 6. Story 2.1: complete the individual-seller profile

- **Epic entry:** `epics.md`, "Story 2.1" (line 441). Core; FR-IDN-2, FR-IDN-4, FR-VER-1; NFR-IDN-2.
- **Contracts:** `IDN-1` `claimSellerTrack`, `IDN-1.ingress` `completeIndividualProfile`.
- **Story file:** `implementation-artifacts/2-1-complete-the-individual-seller-profile-and-claim-the-track.md`.
- **Business goal.** Valentina, a new user, completes her individual-seller profile once. Her account becomes an individual seller, and her phone is kept only in the profile.

**Procedures and code** (`src/modules/identity/`).

- **`claimSellerTrack(tx, …)` (IDN-1)** is a conditional `UPDATE "User" SET "sellerTrack"` that succeeds only while no track is set.
  - On success it writes one audit row with data `{ track }`.
  - When 0 rows change, the pure `claimRefusal` derives the refusal code from the facts re-read in the same transaction: `IndividualSellerProfileAlreadyComplete`, `BusinessApplicationOnFile` or `AlreadyVerifiedBusiness`.
- **`completeIndividualProfile` (IDN-1.ingress)** runs the claim and the profile insert in one transaction that reads the `Clock` once.
  - The regulated phone goes only into the profile row (AD-SYS-8).
  - The success decision cites the stored-only §13 row `IndividualSellerProfileCompleted`, following the rule of decision #16.

**Database changes.** No DDL. The story writes `"User"` (`"sellerTrack"`), `"IndividualSellerProfile"` and `audit_events`.

**Blast radius.**

- The `"User"` row lock is now the serialization point of every seller-track claim, business claims included (VER-2 later).
- `PgIdnRepository` is the first module repository wired into the shared test harness.

**Test evidence.**

- **ATDD (3):** `IDN-1.Q1`, `IDN-1.ingress.h`, `IDN-1.ingress.f`.
- **Unit:**

  | File | Tests |
  |---|---|
  | `src/modules/identity/idn-domain.test.ts` (`claimRefusal`) | 8 |
  | `src/shared-kernel/repositories.test.ts` | 2 |

- **Over HTTP** (decision #24, `src/server/composition.test.ts`): `access.completeIndividualProfile` behind a signed Better Auth session returns 200 with the decision; without a session or with a forged cookie it is `NotAuthenticated` 401; a `userId` in the input is `RequestValidationFailed` 400; a second submit is `IndividualSellerProfileAlreadyComplete` 409.
- **Diff:** `7f903f2` (15 files, +362/−19).

**Review** (compact ceremony).

| # | Finding | Triage |
|---|---|---|
| H1 | A test file inside `domain/` broke `gate:purity` | Fixed: it moved to `idn-domain.test.ts` |
| — | Template placeholder | Fixed: `{status}` became `{latestApplicationStatus}` |
| L1, L2 | — | Deferred |
| L3 | — | Raised for VER-2 |

## 7. Story 2.2: exactly one seller track wins a race

- **Epic entry:** `epics.md`, "Story 2.2" (line 457). MEC; risk R-01 (P0). It also proves `IDN-1`.
- **Story file:** `implementation-artifacts/2-2-let-exactly-one-seller-track-win-a-race.md`.
- **Business goal.** A profile completion and a business claim racing on one account leave exactly one track, so that no account is ever both kinds of seller.

**Procedures and code.**

- **No production code.** Story 2.1's conditional update already serializes the two claims on the `"User"` row lock under READ COMMITTED. The loser re-evaluates its `WHERE`, updates 0 rows and raises its refusal code.
- **The only change is in the harness.** `wiring(db)` now draws ids from one `SequentialIds` per database and prefix. Before, MEC's second repetition collided on `audit_events.id`.

**Database changes.** None.

**Blast radius.** Test support only (`test-support/solu2/fixtures.ts`).

**Test evidence.**

- **ATDD (4):** `IDN-1.QF1`, `IDN-1.QF2`, `IDN-1.I1`, `IDN-1.MEC`.
- **MEC runtime (TG-7):** 100 repetitions on two pooled connections each, in 582–698 ms over three runs. Both-succeeded = 0; neither-succeeded = 0.
- **Diff:** `2189038` (3 files, +81/−2).

**Commit timing.** Decision #23 made proof-only stories commit directly after the story they prove. 2.1's code alone already turns QF1, QF2 and I1 green, so the red gate is green again from `2189038`.

## 8. Story 2.3: explain why an account may not list

- **Epic entry:** `epics.md`, "Story 2.3" (line 473). Failure-state; FR-IDN-1, FR-IDN-3.
- **Contracts:** `IDN-2` `requireListingEligibility`, `P-IDN.capabilities` `getCapabilities`, `P-IDN.verification` `getSellerVerification`.
- **Story file:** `implementation-artifacts/2-3-explain-why-an-account-may-not-list.md`.
- **Business goal.** Andrés's business application was rejected. The listing form tells him why he cannot list and when he may reapply, so he never fills in a form he cannot submit.

**Procedures and code** (`src/modules/identity/`).

- **`deriveCapabilities(facts)` is the one pure projection** (AD-IDN-1 rule 2). From one set of facts it derives:
  - the six FR-IDN-1 capabilities, each with the facts it came from;
  - the seller kind;
  - the verification status;
  - the FR-IDN-3 listing eligibility.

  No query recomputes a rule.
- **`readCapabilityFacts(tx, userId)`** loads those facts in one SELECT, with a `LATERAL` join to the latest `"BusinessApplication"`.
- **`requireListingEligibility` (IDN-2)** answers in one of four ways:

  | Account state | Answer |
  |---|---|
  | Rejected application | Refuses `SellerNotVerified`, citing `{ applicationId, reapplyNotBefore, barred }` |
  | No track | Refuses `IndividualSellerProfileIncomplete` |
  | Pending application | Allows `ListingUnverified` (`allowedWithNotice`) |
  | Otherwise | Allows `ListingEligible` |

  `ListingEligible` and `ListingUnverified` are stored-only §13 rows.
- **`getCapabilities` and `getSellerVerification`** are projections of the same derivation, with zero writes and no cache.
- **The ambient transaction** (`src/shared-kernel/db.ts`, AD-SYS-4 rule 9). All three reads run on the caller's open transaction when there is one, so a neighbour query never takes a second connection.
  - `withAmbientTx` empties its slot when the scope ends, so late async work cannot reach a released connection.
  - The `TransactionRunner` port now requires every implementation to run its work inside `withAmbientTx`.

**Database changes.** No DDL, and zero writes. The story reads `"User"`, `"IndividualSellerProfile"` and `"BusinessApplication"`.

**Blast radius.**

- Every later story that gates a listing (INV) or reads capabilities goes through this one projection.
- Every `TransactionRunner` must register the ambient transaction.

**Test evidence.**

- **ATDD (7):** `IDN-2.Q1`, `IDN-2.QF1`, `IDN-2.QF2`, `IDN-2.I1`, `P-IDN.capabilities.h`, `P-IDN.verification.h`, `SYS-4.R9`.
- **Unit:**

  | File | Tests |
  |---|---|
  | `src/modules/identity/capabilities.test.ts` (`deriveCapabilities`) | 30 |
  | `src/shared-kernel/db.test.ts` | 3 |

- **Diff:** `5325d67` (13 files, +431/−25).

**Review** (subagent, report-only). No High findings.

| # | Finding | Triage |
|---|---|---|
| M1 | No production runner registers the ambient transaction | Fixed in the `TransactionRunner` contract |
| M2 | Late async work kept the transaction after commit | Fixed, with a new unit test |
| M3 | The ambient transaction is not tied to a pool | Dismissed: one Postgres per deployment (AD-SYS-4) |

## 9. Test evidence and gate output

**Totals for the delivery.**

| Suite | Result |
|---|---|
| ATDD green for the six done stories | 29 (5 + 4 + 6 + 3 + 4 + 7) |
| ATDD red for the right reason | 323, the stories after the cut |
| NFR green | 2 (`NFR-SYS-8.canary`, `NFR-SYS-6.sweep`) |
| NFR red for the right reason | 1 |
| Unit and integration | 143 tests in 18 files, 8 of them over HTTP behind a real session (decision #24) |
| Skipped tests | 0 (no `.skip`, `.only` or `.todo`) |
| Fitness | 12 tests in 2 files |

**The command.** One npm command runs the whole chain:

```bash
export TEZG_PG_PORT=15432   # optional: only when port 55432 is reserved; see §11
npm run test:ci
```

`test:ci` runs these steps in order:

1. `lint`
2. `gate:deps`
3. `gate:prisma`
4. `test:unit`
5. `gate:impl1`, which runs, in order:
   1. `typecheck`
   2. the Solu-2 contract gates: `api`, `ui`, `codes`, `ids`, `trace`, `epics`
   3. `gate:purity`
   4. the fitness suite
   5. the Impl-1 red gates: `gate:atdd-red:impl1`, `gate:nfr-red:impl1`

**Terminal output** (2026-10-25, branch `impl-1`, Postgres 16.6 in Docker on port 15432; the gate summary lines, in order):

```
> npm run lint
✖ 3 problems (0 errors, 3 warnings)

> npm run gate:deps
21 dependencies in 2 manifests: exact, approved, no high or critical advisory

> npm run gate:prisma
55 models, each tagged with its owning module; prisma/schema.prisma is current

> npm run test:unit
 Test Files  18 passed (18)
      Tests  143 passed (143)
   Duration  3.01s

> npm run gate:impl1
(typecheck: no output, exit 0)
142 operations, 111 ingress procedures, 159 schemas, 37 core operations checked against contracts.md; surface is current
43 pages, 327 states (138 data, 77 refusal, 112 client), 0 problems
195 code citations checked, 0 problems
190 test ids cited by contracts.md; 371 defined under docs/solu-2/test; 37 core operations
trace: 96 FRs, 56 NFRs, 61 AD rows, 20 risks, 112 clauses, 371 tests; 0 problems
docs/solu-2/planning/epics.md is current: 13 epics, 69 stories
12 domain files checked, 0 problems
 Test Files  2 passed (2)
      Tests  12 passed (12)
   Duration  12.64s
solu2-atdd: 352 tests in 19 files; 323 red for the right reason; 29 green for done stories (34 contracts or test ids done); 0 not as expected
solu2-nfr: 3 tests in 3 files; 1 red for the right reason; 2 green for done stories (34 contracts or test ids done); 0 not as expected

exit 0
```

The 3 lint warnings predate Impl-1. They sit in the Solu-2 ATDD files.

**Clean-clone check** (`task-statement.md` §6.2; 2026-10-25, a fresh clone of `impl-1` at `b317ad7`, outside the working copy, following only the README):

- **`npm ci && npm test`, with the default port 55432 and no `TEZG_PG_*` variables:** exit 0, with the same totals as above.
- **`docker compose up -d --build --wait`:**
  - The image built, and both services reported Healthy after 45 s.
  - The app log shows `created database tezg_dev`, `applied 001_tezg_schema.sql`, `tezg_dev: 1 migrations applied, 1 new`, then `✓ Ready`.
  - The two health probes, then a call to an unknown procedure, which gets the structured 400 of Story 1.1:

```
GET  /api/health/live         200 {"status":"ok"}
GET  /api/health/ready        200 {"ready":true,"checks":{"database":"ok","migrations":"current"},"pending":[]}
POST /api/trpc/no.such.proc   400 {"error":{"code":"RequestValidationFailed","httpStatus":400,"decision":{"outcome":"rejected",
                                   "reasonCode":"RequestValidationFailed","humanMessage":"Revisa la solicitud: no corresponde a ningún procedimiento.",
                                   "citations":[{"rule":"AD-SYS-1",...}],"occurredAt":"..."},"issues":[{"field":"la solicitud",...}]}}
```

`docker compose down -v` removed the stack afterwards.

**The wired procedures over HTTP** (decision #24; 2026-10-25, `docker compose up -d --build --wait` from the working tree). Sign-up is not configured (§11), so a script inserted two `"User"` rows with live `"Session"` rows and one failed delivery into `tezg_dev`, then signed each session token with the compose secret, as Better Auth does:

```
GET  /api/auth/get-session                     200 the session's user
POST /api/trpc/access.completeIndividualProfile 401 NotAuthenticated                       (no cookie)
POST /api/trpc/access.completeIndividualProfile 200 {"sellerKind":"individual","decision":{"outcome":"allowed",
                                                     "reasonCode":"IndividualSellerProfileCompleted",
                                                     "humanMessage":"Tu perfil de vendedor quedó completo; ya puedes publicar como persona.",...}}
POST /api/trpc/access.completeIndividualProfile 409 IndividualSellerProfileAlreadyComplete (same user again)
POST /api/trpc/admin.events.replay              403 AdminOnly                              (non-admin)
POST /api/trpc/admin.events.replay              200 {"status":"failed","replayed":true,...} (admin; EventReplayLog row by that admin)
```

The admin's replay records `failed` because the subscribers' handlers belong to later stories (§11). The HTTP tests bind handlers that succeed and prove the `delivered` path.

## 10. AI governance

`docs/impl-1/ai-log/ai-decision-log.md` records 24 decisions. Each entry holds the prompt, the AI's output and Martín's decision, with the option the AI recommended and why.

| Entries | Topic |
|---|---|
| #1–#5 | Scope, front end, local-only delivery, epic gate |
| #6–#9 | Scaffold and CI |
| #10–#12 | Corrections found while building Stories 1.1 and 1.2 |
| #13 | Pace |
| #14–#21 | Story 1.3 and its review |
| #22 | The delivery cut |
| #23 | Commit timing for proof-only stories |
| #24 | Wiring the two done procedures behind a real session |

**Tagged entries.**

- **`[CORRECTED]`** (an AI hallucination, an invalid assumption, or AI code refactored to satisfy an AD): #2, #10, #11, #12, #14, #17, #18, #19, #20.
- **`[IMPROVED]`:** #3, #16.

Examples:

- **#10.** The AI made a request tRPC itself refuses a 500 `Unexpected`; it is the client's mistake, so it became a 400.
- **#11.** Six es-CO templates interpolated free text; none may.
- **#17.** The architecture said a replay increments `attempts`; it must not.
- **#19.** The es-CO catalog lived in the tRPC adapter, which the shared kernel imported; it moved into the kernel, and the scanner now forbids that edge.

## 11. Known limits

- **Two procedures are wired; the rest answer `Unexpected` (500) behind their gate** (decision #24). `access.completeIndividualProfile` (2.1) and `admin.events.replay` (1.3) call their services through the composition root; every other procedure belongs to a story after the cut. Story 2.3 has no procedure: its projection is an outbound port that later stories call.
- **Sign-up and sign-in are not configured.** Better Auth serves `get-session` and `sign-out`, but no Impl-1 story owns the consent fields of sign-up or a sign-in method (Story 2.4 adds the sign-in throttle). A session therefore comes from a `"Session"` row, as the HTTP tests create it.
- **`canBuy` is Story 2.4's.** The gate forwards it to `requireCanBuy`, which still throws `NotImplementedError`.
- **The subscribers' handlers are unwired.** Commission, listings and collections handle events in their own stories, so a production replay records `failed` until then.
- **`dispatch()` and `sweep()` are not called in production** (1.3 review M4). Decision #21 assigns the wiring to the first story that publishes an event.
- **Windows reserved port.** Windows can reserve a port range that includes 55432, which `docker-compose.yml` and `.env.example` use. That happened once on the machine that produced this walkthrough, and the gate run in §9 used a second Postgres 16.6 container on port 15432. The reservation was later released, and the clean-clone check in §9 ran on the default port. The README's Troubleshooting section gives both fixes.
- **Windows long paths.** Cloning on Windows needs `git config --global core.longpaths true` (or `git clone -c core.longpaths=true`), because some paths under `.agents/skills/` exceed 260 characters.
- **Deferred review findings** are recorded in each story file and carried to the Epic 1 and Epic 2 gates:
  - 1.3 L1 and L3;
  - 2.1 L1–L3;
  - the 2.3 Low findings.

## 12. How to reproduce

```bash
git clone https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management.git tezg
cd tezg
git checkout impl-1
npm ci
npm test                  # db:up (PostgreSQL 16 on 127.0.0.1:55432) then test:ci
```

If port 55432 is reserved on Windows, see the README's Troubleshooting section, or point the tests at another Postgres with `TEZG_PG_PORT`.
