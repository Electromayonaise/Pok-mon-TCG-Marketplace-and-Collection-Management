# Impl-2 Walkthrough: hardening, the five testing flows and the last ten stories

This walkthrough closes Impl-2. It is the "Implementation Walkthrough Report (`walkthrough-impl2.md`)" of the Impl-2 task statement §5 item 5, and it sits next to [`walkthrough-impl1.md`](walkthrough-impl1.md), which covers different stories (decision log Impl-2 #5). [`docs/impl-2/README.md`](../../docs/impl-2/README.md) maps every other deliverable of the statement to its path.

It covers the 10 Impl-2 stories:

- the 7 stories Impl-1 reserved: 8.5, 8.6, 9.6, 11.5, 11.6, 13.5 and 13.6;
- the two stories Impl-2 added for the items Impl-1 handed over: 1.6 (the jobs route) and 2.6 (sign-up, sign-in and the throttle) (decision log Impl-2 #1, #7);
- Story 4.6, the circuit breaker on the TRM source, added by the re-audit against the statement (#31, #32).

The statement's generic "Stories X.4–X.6" map to these 10.

**Where the numbers come from.** Every figure below is copied from a committed evidence log in [`_bmad-output/test-artifacts/evidence/impl2/`](../test-artifacts/evidence/impl2/) (named `NN-….log`), from [`k6-summary.json`](../test-artifacts/evidence/impl2/k6-summary.json), from [`test-review.md`](../test-artifacts/test-review.md), from [`architecture-audit-impl2.md`](../planning-artifacts/architecture-audit-impl2.md) or from [`traceability-matrix.md`](../test-artifacts/traceability-matrix.md). Each log starts with a header comment that names the commit and the command it ran. The last full gate run is `37-price-lookup.log` (11 min 43 s, exit 0), and the last Playwright run is in the same log. The CI runs on GitHub Actions are in `32-ci-run.log`. Every evidence file has its SHA-256 digest in [`SHA256SUMS`](../test-artifacts/evidence/impl2/SHA256SUMS) (§20).

## Contents

- §1 [Scope and ceremony](#1-scope-and-ceremony)
- §2 [Architectural hardening and concurrency defense](#2-architectural-hardening-and-concurrency-defense)
- §3 [Graceful degradation and circuit breakers](#3-graceful-degradation-and-circuit-breakers)
- §4 [Architecture audit (Winston, close phase)](#4-architecture-audit-winston-close-phase)
- §5 [Flow per story](#5-flow-per-story)
- §6–§13 One card per story: [1.6](#6-story-16-run-scheduled-jobs-single-flight-behind-jobs_secret), [2.6](#7-story-26-sign-up-sign-in-and-throttle-failed-attempts), [4.6](#8-story-46-open-a-circuit-breaker-when-the-trm-source-keeps-failing), [8.5](#9-story-85-reconcile-ledgers-and-report-never-repair-discrepancies), [8.6](#10-story-86-set-commission-rates-and-read-the-ledger), [9.6](#11-story-96-read-the-inbox-mark-threads-read-and-mute), [11.5 and 11.6](#12-stories-115-and-116-the-binder-and-its-refusals), [13.5 and 13.6](#13-stories-135-and-136-profiles-moderation-and-their-refusals)
- §14 [Red-phase ATDD evidence (Flow A)](#14-red-phase-atdd-evidence-flow-a)
- §15 [k6 load test summary (Flow D)](#15-k6-load-test-summary-flow-d)
- §16 [Playwright E2E run log and traces (Flow E)](#16-playwright-e2e-run-log-and-traces-flow-e)
- §17 [The test pyramid](#17-the-test-pyramid)
- §18 [The 4 classic testing traps](#18-the-4-classic-testing-traps)
- §19 [The 5 NFR dimensions](#19-the-5-nfr-dimensions)
- §20 [Quality gate, trace, CI and signed evidence](#20-quality-gate-trace-ci-and-signed-evidence)
- §21 [AI governance: corrections of AI testing mistakes](#21-ai-governance-corrections-of-ai-testing-mistakes)
- §22 [Known limits](#22-known-limits)
- §23 [How to reproduce](#23-how-to-reproduce)

## 1. Scope and ceremony

- **Backlog.** 72 stories in 13 epics, all `done` in [`sprint-status.yaml`](sprint-status.yaml). The backlog grew from 69 to 71 when 1.6 and 2.6 were added through `bmad-correct-course` (decision log Impl-2 #7), because a new test bound to the `done` Story 2.4 could have no red phase. It grew to 72 when the re-audit added 4.6 (#31, #32).
- **Decider.** Mateo Rubio takes every decision the [Impl-2 decision log](../decision-logs/impl-2-ai-decision-log.md) records (#1). It has 37 entries.
- **Git.** One branch, `impl-2`, off `main` at `a7c5d81`. The first 43 commits, up to the close `3bc7543`, were pushed for CI (#27–#30). The re-audit (#31–#37) added 23 local commits, `0a29548` … `8db7a69`, and this documentation update adds its own; none of them is pushed yet (§20).
- **Ceremony.** Spec approval by menu per epic, then one story subagent per story (#14), a fresh-context `bmad-code-review` over the whole of Impl-2 (#23), the final trace (#24), and the test review with its remediation (#24, #25). Then Mateo asked for a line-by-line re-audit against the statement (#31). It found seven gaps, and each one was closed through a menu: Story 4.6 (#32), axe-core scans (#33), Winston's architecture audit (#34) and its fixes (#35–#37), and this update with the signed evidence.
- **Shift-left.** Before any story code, Phase A put in place the Flow C hardening (`2da2c11`, #8), the Playwright framework, the app shell and the Impl-2 CI gate (`c3996a5`, #10). The risk-based test design of [`test-design.md`](../test-artifacts/test-design.md) §7 fixed each story's flow, its planned risks R-21..R-31 and the thresholds first (`fbf6dfe`). Winston's audit came at the close, not in Phase A (§4).
- **UI slice.** The service had no pages. Flow E needed some, so Impl-2 pulled forward a thin slice from the UX specs: the inbox, the binder and the public seller profile, plus the sign-in page they need (#2, #15).

## 2. Architectural hardening and concurrency defense

### 2.1 Ports and adapters, extended without new exceptions

Every Impl-2 story kept the module layout of Impl-1: a pure `domain/`, an `application/*.v2.ts` service, its `ports/` and a Postgres adapter in `infra/pg.ts`. `npm run gate:purity` checks the domain: "14 domain files checked, 0 problems" (`37-price-lookup.log`); the 14th is the breaker of Story 4.6. Winston's audit gives this rubric line PASS (§4). The new cross-cutting pieces sit outside the modules:

| Piece | Path | What it does |
|---|---|---|
| Job route | `src/server/jobs.ts`, `app/api/jobs/[job]/route.ts` | Parses the bearer, the job name and the trigger, then runs the job and answers JSON |
| Job runner and lock | `src/shared-kernel/jobs.ts`, `src/shared-kernel/infra/pg-jobs.ts` | Writes one `JobRun` row per run and keeps the run single-flight under `pg_try_advisory_xact_lock(hashtextextended('job:<name>', 0))` |
| Runtime pool | `src/server/db.ts:28`, `src/shared-kernel/config.ts:13` | `runtimePool(url, { max })` with `RUNTIME_POOL = { connectionTimeoutMillis: 10_000 }`; `max` is `TEZG_PG_POOL_MAX` (2 to 50, default 2): at least one connection for a job's lock and one for its work, 2 on serverless instances and 10 on long-lived servers, and a checkout that fails after 10 s instead of waiting forever (#34, #35, #38) |
| Job bearer | `src/modules/identity/application/gate.ts:45` | Hashes both sides with SHA-256 and compares them with `timingSafeEqual`. An empty secret matches nothing |
| Auth guard | `src/server/auth-routes.ts`, `src/server/auth.ts` | Runs the AD-IDN-3 throttle before Better Auth checks the password, and records failures after it (#12) |
| TRM circuit breaker | `src/modules/catalog/domain/breaker.ts`; the `"FxSourceBreaker"` row (migrations `002_fx_source_breaker.sql`, `003_fx_source_breaker_version.sql`) | A pure state machine whose one shared row moves under `FOR UPDATE` with a state and version predicate (§3.1) |
| Moderation-log merge | `src/server/moderation-log.ts` | Merges one page of each moderation log by `(at desc, id)` |
| Shared composition root | `app/_server/runtime.ts` | One composition for the tRPC route and the pages. The system clock stays outside `src/` (AD-SYS-6, #10) |

All 109 tRPC procedures are wired: `src/server/composition-access.test.ts` asserts that `WIRED_PROCEDURES` equals the generated registry ("every registry procedure has a resolver, so none answers NotImplemented"). With the 4 job routes, that makes "144 operations, 113 ingress procedures" in `gate:api:solu2` (`37-price-lookup.log`). The 109th is `catalog.fx.breaker`, the admin read of Story 4.6.

### 2.2 Flow C: the Impl-1 tests, hardened before any story (decision log #8, #9)

Flow C (test-after) used `bmad-testarch-automate` on the Impl-1 code: first a coverage scan, then a gap analysis, then regression tests.

- **Coverage.** The baseline log shows three domain cores under 90 % branches: `dsc.ts` 75 %, `trd.ts` 80.64 % and `contact.ts` 83.33 % (`01-coverage-baseline.log`). Decision log #8 quotes 91.55 % overall and `ord.ts` at 88.9 % from the run the agent read; the committed log shows 92.38 % and `ord.ts` 93.05 %. After the backfill, every core is at 90 % or more, and the total is 95.81 % (`03-coverage-after-flowC.log`). The rule is enforced per file: `vitest.config.ts` sets `thresholds: { perFile: true, branches: 90 }` over `src/modules/*/domain/**/*.ts`. The last run shows 97.56 % branches (`37-price-lookup.log`), and `breaker.ts` is at 100 % (`33-story-4.6.log`).
- **Dead code.** `turnVerdict` (`trading/domain/trd.ts`) had no caller, and it was the reason `trd.ts` sat at 80.6 %. It was deleted rather than padded with a test (#8). `sendEligibility` (`messaging/domain/msg.ts`) was deleted the same way later (#19).
- **Timed waits removed.** The suite had two 200 ms "is it still blocked?" waits, three 1–5 ms `setTimeout` interleavings, a database sleep of 50 ms and a 3 s deadlock watchdog copied into seven files (#8). They were replaced by three helpers:
  - `test-support/locks.ts` `untilBlockedOnLock`: waits until `pg_stat_activity` shows the blocked statement with `wait_event_type = 'Lock'`. It is bounded by a number of probes, not by a clock.
  - `test-support/concurrency.ts` `race`: N calls start together behind one barrier, and every outcome is kept.
  - `test-support/single-connection.ts`: a pool of one connection that refuses a second concurrent checkout at once; since #35 it also has `boundedPool(db, n)`, which refuses checkout n + 1.
- **The gate.** `npm run gate:no-sleep` (`scripts/check-no-sleep.mjs`) runs inside `test:ci`. Its 7 rules refuse every timed wait (Playwright's timeout wait, Python's and Postgres's sleep, a bare numeric sleep, promise sleeps) and any locator built in a Playwright spec. Each rule first proves it catches a planted violation (§18).
- **Mutation proof.** With the `FOR SHARE` at `identity/infra/pg.ts:362` removed, the hardened lock test fails. The old 200 ms version would have passed (`02-flowC-lock-mutation.log`):

```text
 FAIL  |impl1-unit| src/modules/identity/application/ver.v2.test.ts > VerServiceV2.requireMessagingEligibility (MSG-3) > inside a transaction on a pool of 1 it reads on that connection, and its FOR SHARE holds a rejection until commit
Error: no backend waited on a lock for a query containing "UPDATE \"BusinessApplication\"" after 5000 probes
 ❯ untilBlockedOnLock test-support/locks.ts:26:9
```

That test now lives in `src/modules/identity/application/ver.v2-reads.test.ts`, after the remediation split the file (#25).

### 2.3 The concurrency hammers: the races Impl-2 proves

Each hammer runs real PostgreSQL 16 connections behind the `race` barrier. A rejection is rethrown (`if (rejected.length > 0) throw rejected[0]`), so a failure shows its real cause (#11). Since the audit fix F7, each one is also bound in its AD row of contracts.md §14 (#35).

| Test id | File | What it hammers | What makes it hold | What it proves |
|---|---|---|---|---|
| `[S-SYS.jobs.C1]` | `atdd/sys_jobs.test.ts` | 20 concurrent expiry runs | the `job:<name>` advisory lock, held on its own connection for the run (`pg-jobs.ts`) | each run is succeeded or skipped, each writes its `JobRun` row, and the due order releases its unit exactly once |
| `[S-SYS.jobs.single]` | `atdd/sys_jobs.test.ts` | a run while another holds `job:expiry-materialize` | the same lock | a skipped no-op with its row; after the release, one run expires the order |
| `[S-SYS.jobs.pool]` | `atdd/sys_jobs.test.ts:151` | every job, the nightly reconcile included, through the real route on a pool of exactly 2 | `boundedPool(db, 2)` refuses a third checkout | each job succeeds and uses both connections; on a pool of 1 it is refused at once and its run is `failed` (#35, #36) |
| `[COM-3.C1]` | `atdd/com_reconcile.test.ts` | reconcile racing 50 concurrent deductions, 20 times | each account read `FOR SHARE` before its ledger (`commission/infra/pg.ts:202`) | 0 false discrepancies, and reconcile writes no account or ledger row |
| `[COM-3.C2]` | `atdd/com_reconcile.test.ts` | 10 concurrent nightly runs | the job lock inside COM-3 (P2) | 10 `JobRun` rows, and one `ReconciliationRun` per run that ran |
| `[NFR-COM-2.drift]` | `nfr/com2_drift.test.ts` | 10,000 seeded-random operations with redelivered orders | the exactly-once deduction of Story 8.2 and reconcile | "1,988 top-ups, 6,480 orders, 1,532 duplicates (19.1 %), 0 discrepancies" (`15-story-8.5-green.log`) |
| `[S-FR-MSG-7.C1]` | `atdd/msg_inbox.test.ts` | 50 concurrent `markRead` calls with random seqs, 20 rounds | one conditional statement, `advanceReadSeq` (`messaging/infra/pg.ts:153`) | `lastReadSeq` ends at the highest seq sent, clamped to `lastSeq`, and never goes down |
| `[S-FR-REP-7.C1]` | `atdd/rep_contracts.test.ts` | 100 rounds of profile reads racing hides and unhides (4 admins, 4 readers) | the profile read in one `REPEATABLE READ` read-only transaction (`reviews/application/rep.v2.ts:321`) | every read's aggregate counts exactly the reviews its page lists. With the read broken to `READ COMMITTED` it fails in 3 of 3 runs (#21) |
| `[S-FR-REP-5.C1]` | `atdd/inv_supporting.test.ts` | 20 concurrent hides of one listing | a conditional flip, then a `FOR UPDATE` re-read (`listings/infra/pg.ts:278`) | one hide, one `ListingModerationLog` row and one audit row; every other call is the explained no-op |
| `[S-FR-CAT-8.breaker.C1]` | `atdd/cat_breaker.test.ts:125` | 50 concurrent fetches on an open breaker whose cool-down has passed | the breaker row read `FOR UPDATE` (`catalog/infra/pg.ts:378`) | exactly one probe reaches the source; the other 49 answer `circuitOpen`. Without `FOR UPDATE`: "expected 42 to be 1" (`33-story-4.6.log`) |
| `[S-FR-CAT-8.breaker.C2]` | `atdd/cat_breaker.test.ts:165` | 3 concurrent failing fetches from closed (a tick racing two admin retries), 20 rounds | the same lock, and the state and version predicate (`catalog/infra/pg.ts:385-387`) | all 3 reach the source and the breaker opens with exactly 3 failures. Without `FOR UPDATE` it stays closed, with counts lost (`33-story-4.6.log`) |
| `[S-FR-COL-5.C1]` | `atdd/col_supporting.test.ts` | 10 rounds of 20 concurrent binder writes (adds by link, moves, copies and a reorder) | the `col:owner` lock | every entry of each collection at a distinct position. With the lock removed, 16 entries share position 4 (`35-architecture-fixes.log`) |
| `[S-FR-COM-7.C1]` | `atdd/com_supporting.test.ts` | 10 rounds of 20 concurrent rate settings from one `effectiveFrom` | `UNIQUE ("effectiveFrom")` with `ON CONFLICT DO NOTHING` (`commission/infra/pg.ts:79`) | one rate and one audit row; the other 19 are refused with zero writes. With the `UNIQUE` dropped and a check-then-insert, 20 of 20 are stored (`35-architecture-fixes.log`) |

### 2.4 Security boundaries

- **Throttle.** 10 failed sign-ins per account and 30 per IP in 15 minutes, and 5 sign-ups per IP per hour (AD-IDN-3, #11). IPs are stored only as HMACs.
- **Open redirect closed.** `app/ingresar/destination.ts` resolves `?siguiente=` against the origin and keeps same-origin paths only (F1, #23).
- **Unsafe links.** `isSafeHttpsUrl` (`collections/domain/col.ts:68`) refuses `javascript:`, `data:`, `HTTP://`, userinfo, `//host` and URLs over 2,048 characters. Over HTTP the answer is the registry code `InvalidExternalLink` too (#20).
- **Job routes.** A missing, wrong or truncated bearer is 401 `NotAuthenticated`, and no `JobRun` row is written (`[S-SYS.jobs.auth]`).
- **Scheduler.** `.github/workflows/jobs-tick.yml` runs by hand (`workflow_dispatch`) until a deployment exists. No correctness rule depends on it running (AD-SYS-6 rule 5, #11).

## 3. Graceful degradation and circuit breakers

Rubric 1 asks for "graceful degradation and circuit breakers under failure states". Each failure path below ends in an explained, visible outcome, never a hang or a made-up value. Winston's audit traced each path to its code and its test (`architecture-audit-impl2.md` §4); after the fixes it gives this rubric line PASS (§4).

### 3.1 The TRM circuit breaker (Story 4.6)

The TRM (COP/USD) source is the system's only outbound dependency. Before Story 4.6, a down source already degraded gracefully: `fetchTrm` answered `sourceUnavailable`, and `getFxRate` carried the last stored rate forward, marked stale (Story 4.4). But nothing remembered that the source kept failing, so every tick and every admin retry called it again (#31).

- **States.** `closed` lets every call through. After **N = 3** failures in a row it turns `open` for a **30-minute** cool-down on the Clock. While open, `fetchTrm` answers `circuitOpen` (code `FxRateCircuitOpen`, `allowedWithNotice`), makes no source call and no write, and keeps the last rate. After the cool-down, the next call becomes the one `halfOpen` **probe**, holding a **60 s lease**: its success closes the breaker, and its failure reopens it for a new cool-down. A probe that never reports back loses its lease to the next fetch, and a stale result moves nothing.
  - Policy: `TRM_BREAKER_POLICY = { failureThreshold: 3, coolDownMs: 30 * 60_000, probeLeaseMs: 60_000 }` (`catalog/domain/breaker.ts:23`).
  - Transitions: `admit` (`breaker.ts:60-65`) and `record` (`breaker.ts:72-81`), pure functions of the stored breaker and a Clock instant.
  - Rule: AD-CAT-3 rule 7 (`ARCHITECTURE.md:876`), written by Winston's audit (#32, #34). 30 min keeps NFR-CAT-4's one attempt an hour: the hourly tick always finds the breaker half-open, and what the breaker stops are the admin retries and the concurrent calls between ticks (#32). An admin retry goes through the breaker too, with no bypass.
- **One shared row.** The state lives in one `"FxSourceBreaker"` row, so every instance shares it. `fetchTrm` admits the call in one transaction under the row lock, calls the source outside any transaction, then records the result in a second locked transaction (`catalog/application/cat.v2.ts:421-430`, `:474-480`). A day already covered answers `alreadyCovered` before the breaker is read.
- **The version-guarded update (#35 F2).** The row is read `FOR UPDATE` (`catalog/infra/pg.ts:378`) and moved by `UPDATE … WHERE port = $1 AND state = $8 AND version = $9`, which bumps `version` (`catalog/infra/pg.ts:385-387`; migration `003_fx_source_breaker_version.sql`). A 0-row update raises `UnexpectedError` and rolls back (`cat.v2.ts:488-491`). This follows AD-SYS-5's rule for state machines, which the first version (lock only, no predicate) did not.
- **The race tests and their mutation proof.** `[S-FR-CAT-8.breaker.C1]` (50 fetches give one probe) and `[S-FR-CAT-8.breaker.C2]` (3 concurrent failures lose no count, 20 rounds) run on real connections (§2.3). With `FOR UPDATE` removed, both fail (`33-story-4.6.log`):

```text
     × [S-FR-CAT-8.breaker.C1] 50 concurrent fetches on an open breaker whose cool-down has passed: exactly one probe reaches the source, and the other 49 answer circuitOpen 165ms
     × [S-FR-CAT-8.breaker.C2] 3 concurrent failing fetches from closed (a tick racing two admin retries), 20 rounds: all 3 reach the source and the breaker opens with exactly 3 failures counted 46ms
AssertionError: expected 42 to be 1 // Object.is equality
AssertionError: expected { state: 'closed', …(5) } to match object { state: 'open', …(1) }
```

  The F2 tests in `catalog/application/cat.v2-breaker.test.ts` prove the predicate (a stale state or version moves 0 rows) and the rollback of a conflict, and the 13 pure tests of `breaker-domain.test.ts` prove every transition, stale results included (`35-architecture-fixes.log`).
- **Visible to admins.** `catalog.fx.breaker` (page 2.3) returns the state, the failure count, `openedAt` and `retryAt`, explained (`[S-FR-CAT-8.breaker.h]`, `cat_breaker.test.ts:36`).

### 3.2 The other failure paths

| Failure | Degraded outcome | Code | Test or evidence |
|---|---|---|---|
| **An outbox subscriber keeps failing** | Each attempt is counted before it runs. After 3 attempts the delivery is `failed` with `DeliveryAttemptsExhausted` and is never retried automatically. An admin replays it once, by hand, and the replay is logged. The admin badge counts failed and stuck deliveries live, and the health read returns the latest `FailedDeliveryDigest` row. The daily job that writes that row is one of the four jobs deferred to launch (audit F4) | `MAX_ATTEMPTS = 3` (`src/shared-kernel/dispatcher.ts:45`, `:165-172`); replay rule `ARCHITECTURE.md:338`; `src/shared-kernel/admin-events.ts:91` | `[SYS-2.R4]` (`atdd/sys_contracts.test.ts:91`), `[SYS-2.R6]` (`:115`), `[S-SYS.replay.h]` (`:285`), `[S-SYS.sweep.h]` (`atdd/sys_jobs.test.ts:102`), `[NFR-SYS-6.sweep]` (500 undispatched events and 20 half-attempted deliveries drained once) |
| **A job run fails or gets stuck (#35 F3)** | The runner commits a `running` row before the work starts, so a run that dies midway stays visible. A failed run answers 500 `Unexpected` with no message, and its row keeps the error code. `admin.jobs.tickHealth` returns, per job, the last outcome, the failed runs in the last 24 h and the runs still `running` 15 min after their start; any of them turns the health `degraded` with `ScheduledJobsDegraded` (a silent tick takes precedence). Page 2.3 shows it as "Tareas (24 h)" | `src/shared-kernel/jobs.ts:87-88`; `admin-events.ts:54-59` (window and stuck bound), `:134-144` (the rule) | `[S-SYS.jobs.failed]` (`sys_jobs.test.ts:92`); `[S-SYS.tick.jobs]` (`sys_contracts.test.ts:233`): "a failed trm-fetch and an expiry run stuck running for 16 min turn the health degraded" (`35-architecture-fixes.log`) |
| **The pool is exhausted (#36, #38)** | The runtime pool has `TEZG_PG_POOL_MAX` connections: serverless instances use the minimum, 2 (one for a job's lock, one for its work), and long-lived servers raise it to 10 (Docker, k6, E2E), because one process serving every request on 2 connections queued the k6 profile to a p95 of 660 ms against 300 ms (§15). A value under 2 or over 50 stops the app at start-up with the variable's name. It waits at most 10 s for a connection. A starved run that holds its lock writes its end in the lock's own transaction, so it ends `failed` / `Unexpected` with HTTP 500, and the health above shows it. A run refused even its lock's connection writes nothing, logs `job.lock.acquireFailed` and answers 500 | `src/server/db.ts:28`, `src/shared-kernel/config.ts:13` (`PG_POOL_MAX`); `src/shared-kernel/jobs.ts:72-75` (lock refused), `:97-108` (the end written through `hold.release`); AD-SYS-4 rule 7 (`ARCHITECTURE.md:397`) | `[S-SYS.jobs.starved]` (`sys_jobs.test.ts:203`), bounded by a 200 ms pool timeout and no timer of its own. Two mutations make it fail: the old no-row behaviour, and a pool with no timeout, which hangs until "Test timed out in 60000ms" (`36-pool-timeout-and-bench.log`) |
| **Reconcile runs long** | The all-accounts run stops after 50 s of Clock time and answers `ReconciliationPartial` with `accountsChecked`. It reports discrepancies and never repairs them | `RECONCILE_BATCH_MS = 50_000` (`commission/domain/com.ts:114`); `commission/application/com.v2.ts:297`, `:327` | `src/modules/commission/application/com.v2-admin.test.ts:13` ("stops once 50 s of Clock time have passed … and the next run restarts from the first account"); `[COM-3.C1]` |
| **No mail provider is wired** | Sign-up is refused before Better Auth writes anything: 500 `Unexpected`, with no `User`, `Account` or throttle row. Sign-in keeps working | `src/server/auth-routes.ts:53` | `[S-FR-IDN-7.signup.unwired]` (`atdd/idn_auth.test.ts:88`); it was the correction of an untested AI claim (#23, §21) |
| **A feed row is invalid or changed kind** | The row is quarantined with its reason, and the stored entry is untouched; a rerun converges | `INSERT INTO "QuarantinedFeedRow" … ON CONFLICT ("runId", "rowNumber") DO NOTHING` (`catalog/infra/pg.ts:225-228`) | `[CAT-2.QF1]` (`atdd/cat_contracts.test.ts:85`), `[CAT-2.I1]` (`:95`) |
| **There is no price or no fresh rate** | A price is never made up. With the source down, today's TRM is yesterday's, labelled stale (`FxRateCarriedForward`). A displayed price equals one stored observation byte for byte, never an average, and an entry with no observation by `asOf` has no row, so valuation reports it as not valued. The faster price read of #37 returns the same rows as the old one, checked at three instants and on a tie | AD-CAT-2 rule 5 (`ARCHITECTURE.md:860`), AD-CAT-3 (`:864`); `cat.v2.ts:506`; `catalog/infra/pg.ts:255` | `[S-FR-CAT-8.f]` (`cat_contracts.test.ts:214`), `[CAT-3.I1]` (`:178`), `[VAL-1.Q1]` (`atdd/val_contracts.test.ts:41`); NFR-CAT-3; the same-row checks in `37-price-lookup.log` |

## 4. Architecture audit (Winston, close phase)

The statement's Phase A names a "Winston & Murat audit". Murat's test design ran before the code (#6), but Winston (`bmad-agent-architect`) was never invoked during the stories. The re-audit found that gap (#31), and Mateo chose to run Winston at the close and to label the result honestly. [`architecture-audit-impl2.md`](../planning-artifacts/architecture-audit-impl2.md) is a **close-phase audit, not a shift-left review**: it did not shape the design of the ten stories, it only checked what they built (#34). It audited `a7c5d81..0f54897` against rubric 1 and rubric 2, with file:line evidence for each check.

**Verdict rule** (audit §0): a rubric line is PASS when no finding against it is above LOW, CONCERNS when a finding is MEDIUM and none is HIGH, and FAIL when any finding is HIGH.

| Rubric line | Before the fixes | After the fixes | Why (audit §1, §10) |
|---|---|---|---|
| R1 · Ports and adapters | PASS | **PASS** | F9 fixed; F10 accepted (LOW) |
| R1 · Concurrency defense | CONCERNS | **PASS** | F1 and F2 fixed; F8 closed by two race tests, each proven able to fail |
| R1 · Graceful degradation and circuit breakers | CONCERNS | **PASS** | F3 fixed (failed and stuck jobs read degraded); F4 and F6 recorded with owners |
| R2 · AD invariants | CONCERNS | **PASS** | AD-SYS-4 and AD-SYS-5 now match the code (F1, F2); F5 reworded; F7 bound (62 / 62 AD rows PASS) |

| # | Severity | Finding | Outcome | Commit |
|---|---|---|---|---|
| F1 | MEDIUM | AD-SYS-4 said `max: 1`, but a job holds its lock on one connection while its work runs on another, and the code used pg's default pool of 10 | **Fixed:** AD-SYS-4 rules 7 and 9 and ARCH §4 say `max: 2`, set in `db.ts`; `[S-SYS.jobs.pool]` runs every job on a pool of exactly 2. Its residual risk, two job runs starving one instance, was then closed by the 10 s checkout timeout and `[S-SYS.jobs.starved]` (#36) | `2acf4e6`, `811dceb` |
| F2 | MEDIUM | The breaker moved its row under `FOR UPDATE` with no from-state or version predicate, against AD-SYS-5 | **Fixed:** migration 003 adds `version`; the update is guarded by state and version, and a conflict rolls back | `2acf4e6` |
| F3 | MEDIUM | A failed job run was stored but shown nowhere, so the tick health read "on schedule" while every job failed | **Fixed:** per-job outcome, failed runs in 24 h and stuck runs, `ScheduledJobsDegraded`, page 2.3's "Tareas (24 h)" | `926e68a` |
| F4 | LOW | Four ARCH §13 jobs were neither built nor deferred | **Fixed:** deferred to the launch checklist, each with an owner | `e9a5352` |
| F5 | LOW | AD-CAT-3 rule 6 ("no request path calls the source") contradicted the admin retry | **Fixed:** "No read path calls `FxRateSource`" | `e9a5352` |
| F6 | LOW | The TRM source call had no deadline, against the probe's 60 s lease | **Fixed:** the adapter deferral requires the call to end within 45 s | `e9a5352` |
| F7 | LOW | The Impl-2 race tests were bound to stories only, not to their §14 AD rows | **Fixed:** nine AD rows bind them; the trace has 62 AD rows | `e9a5352` |
| F8 | LOW | The binder writes and the rate setting had no race test | **Fixed, no bug:** `[S-FR-COL-5.C1]` and `[S-FR-COM-7.C1]` pass, and a mutation of each fails them | `a8f5d1a` |
| F9 | LOW | `ports-and-adapters.md` was stale for Impl-2 | **Fixed:** the job runner, `EmailSender`, the breaker, the driving adapters, the clock and the pool | `e9a5352` |
| F10 | LOW | Admin checks go through identity's repository type | **Accepted**, as Impl-1 #32 accepted it | — |

The audit's only own change was the one Mateo decided in #32: AD-CAT-3 rule 7 and its §14 row binding the six `[S-FR-CAT-8.breaker.*]` tests. Every fix went through a menu (#34) and a subagent (#35, #36).

## 5. Flow per story

From [`test-design.md`](../test-artifacts/test-design.md) §7.1, as built. Flow C is the Impl-1 hardening of §2.2.

| Story | Flow | Red commit | Green commit | Risks |
|---|---|---|---|---|
| 1.6 Run scheduled jobs single-flight behind `JOBS_SECRET` | A | `86aaa8e` | `7ac39a2` | R-21 |
| 2.6 Sign up, sign in and throttle failed attempts | A | `eacd9f0` | `0c463f9` | R-22 |
| 4.6 Open a circuit breaker when the TRM source keeps failing | A + D | `4a84964` | `bde313d` | R-32 |
| 8.5 Reconcile ledgers and report, never repair, discrepancies | A + D | `bccc1f3` | `30e2654` | R-23, R-24 |
| 8.6 Set commission rates and read the ledger | B | — (Solu-2 tests already red) | `ecd8ca6` | R-25 |
| 9.6 Read the inbox, mark threads read and mute | A + D + E | `0291b05` | `90db9da` | R-26 |
| 11.5 Binder, external cards, moves and wishlist | B + D + E | (11.6's `7c78cb1`) | `7162354`, `a440983` | R-27 |
| 11.6 Refuse unsafe links, foreign entries and unknown wishlist cards | A | `7c78cb1` | `7162354` | R-28 |
| 13.5 Profiles, moderation logs and listing hides | A + D + E | `f8f2b62` | `23d0157`, `c84225a` | R-29, R-30 |
| 13.6 Refuse invalid moderation and bad aggregate requests | A | `f8f2b62` | `23d0157` | R-31 |

11.6 and 13.6 only prove 11.5's and 13.5's operations, so each pair turned `done` in one commit: the red gate fails if one story of a pair is done while the other's tests already pass (#17, #18).

## 6. Story 1.6: Run scheduled jobs single-flight behind `JOBS_SECRET`

*Flow A · story file [`1-6-run-scheduled-jobs-single-flight-behind-jobs-secret.md`](1-6-run-scheduled-jobs-single-flight-behind-jobs-secret.md) · decisions #7, #11, #34–#36*

- **Challenge.** Impl-1 left the jobs route unbuilt, so the registry's job procedures answered 404, and nothing triggered the outbox sweeper in production. The risk (R-21) is a job run without the bearer, or two runs of one job at once.
- **Decisions.** A fourth job procedure, `jobs/outbox-sweep` (`S-SYS.sweep`), and a hand-run scheduler workflow (#11). At the close, the 2-connection pool and its checkout timeout (#34–#36, §3.2).
- **Code.** `src/server/jobs.ts`; `src/shared-kernel/jobs.ts` and `infra/pg-jobs.ts`; `src/shared-kernel/admin-events.ts` (`sweep`); `src/server/composition.ts`; `app/api/jobs/[job]/route.ts`; `JOBS_SECRET` in `src/shared-kernel/config.ts:12` (at least 32 bytes); `.github/workflows/jobs-tick.yml`.
- **Tests.** 9 bound tests in `atdd/sys_jobs.test.ts` (the 7 red ones, plus `[S-SYS.jobs.pool]` and `[S-SYS.jobs.starved]` from the close); pure tests in `src/shared-kernel/job-runner.test.ts` and `src/server/jobs.test.ts` (#25).
- **Evidence.** Red, `10-story-1.6-red.log`:

```text
 ❯ |solu2-atdd| _bmad-output/test-artifacts/atdd/sys_jobs.test.ts (7 tests | 7 failed) 376ms
     × [S-SYS.jobs.auth] a missing, wrong, truncated or non-bearer secret is 401 NotAuthenticated on every job, and no JobRun row is written 36ms
NotImplementedError: NotImplemented: jobs.serveJob
solu2-atdd: 359 tests in 20 files; 35 red for the right reason; 324 green for done stories (363 contracts or test ids done); 0 not as expected
```

  Green, `11-story-1.6-green.log`:

```text
solu2-atdd: 359 tests in 20 files; 28 red for the right reason; 331 green for done stories (370 contracts or test ids done); 0 not as expected
EXIT 0
```

- **What the gate caught.** Two tests asserted the order of two runs started at the same frozen virtual instant, so `ORDER BY "startedAt", id` fell back to random id order. Each test now advances the Clock 1 ms between its runs (story file, Verification).

## 7. Story 2.6: Sign up, sign in and throttle failed attempts

*Flow A · story file [`2-6-sign-up-sign-in-and-throttle-failed-attempts.md`](2-6-sign-up-sign-in-and-throttle-failed-attempts.md) · decisions #7, #11, #12, #23*

- **Challenge.** No user could sign up or sign in, and the brute-force limit was inactive (Impl-1 #26). The risk (R-22) is that the 11th failed sign-in is not refused, or that an IP is stored in clear.
- **Decisions.** An unverified user may sign in, and `requireCanBuy` keeps the money paths gated. The throttle follows AD-IDN-3 as designed (#11). The guard wraps Better Auth's handler instead of using its internal `hooks.before`, so a refusal is the platform's `{ error: ErrorBody }` (#12, an agent default).
- **Code.** `src/server/auth-routes.ts` (the guard), `src/server/auth.ts` (`createAuth`), `throttleRefusal` (`identity/domain/idn.ts:133`), `recordAuthThrottleEvent` and `accountIdForEmail` (`identity/application/idn.v2.ts:298`, `:310`), the `EmailSender` port (`src/shared-kernel/external.ts:46`).
- **Tests.** `atdd/idn_auth.test.ts`: the 6 red tests, plus `[S-FR-IDN-7.signup.unwired]` from the code review (`cd50fa1`). 8 pure tests of the guard in `src/server/auth-routes.test.ts`, with a fake Better Auth handler.
- **Evidence.** Red, `12-story-2.6-red.log`: "6 failed", each on `NotImplementedError: NotImplemented: auth.serveAuth`, and "34 red for the right reason … 0 not as expected". The `serveAuth` stub itself was committed with `7ac39a2` (Story 1.6's green commit); the red commit `eacd9f0` adds only tests and artifacts. Green, `13-story-2.6-green.log`: "337 green for done stories … 0 not as expected", `epics.md` "13 epics, 71 stories", `EXIT 0`.
- **A real defect found.** Better Auth writes `ipAddress: ''` on every session insert, and `"Session"` has no such column, so every sign-in was a 500. No Impl-1 test had reached it, because those tests inserted session rows directly. `createAuth` now strips the field in a Prisma client extension (`src/server/auth.ts:35`).

## 8. Story 4.6: Open a circuit breaker when the TRM source keeps failing

*Flow A + D · story file [`4-6-open-a-circuit-breaker-when-the-trm-source-keeps-failing.md`](4-6-open-a-circuit-breaker-when-the-trm-source-keeps-failing.md) · decisions #31, #32, #34, #35*

- **Challenge.** Rubric 1 asks for circuit breakers, and the code had graceful degradation but no breaker (#31, gap 5). The TRM source is the only outbound dependency. Without a breaker, a down source is called by every tick and every admin retry. With a breaker kept in memory, two instances could both probe a recovering source, or lose a failure count. The risk R-32 (P0, 3 × 2) is exactly that: every tick and retry calling a down source, two concurrent fetches both probing, or a lost count keeping the breaker closed. The PRD has no explicit breaker requirement, and the agent said so instead of inventing one: the story traces to NFR-CAT-4, FR-CAT-8 and AD-CAT-3 (#32).
- **Flow A.** Murat's `bmad-testarch-atdd` wrote the 6 bound tests first, in the red commit `4a84964`. Each test reads the breaker through the new admin read before checking an effect, so the red reason is the missing read and not a wrong outcome (#32).
- **Decisions (menus, #32).** A 30-minute cool-down, which keeps NFR-CAT-4's hourly attempt; admin retries through the breaker, with no force flag; AD-CAT-3 rule 7 written by Winston's audit. Agent defaults: N = 3, the 60 s probe lease, and the new outcome `circuitOpen` kept apart from `sourceUnavailable`.
- **Code.** The pure machine `catalog/domain/breaker.ts` (100 % branches); `fetchTrm` and `getFxSourceBreaker` in `catalog/application/cat.v2.ts`; `lockFxSourceBreaker`, `saveFxSourceBreaker` and `readFxSourceBreaker` in `catalog/ports/cat.v2.ts` and `infra/pg.ts`; migrations `002_fx_source_breaker.sql` and, after audit F2, `003_fx_source_breaker_version.sql`; the procedure `catalog.fx.breaker`. §3.1 has the design.
- **Tests.** 6 bound tests in `atdd/cat_breaker.test.ts` (`[S-FR-CAT-8.breaker.h]`, `.open`, `.halfOpen`, `.reset`, `.C1`, `.C2`); 13 pure tests in `src/modules/catalog/breaker-domain.test.ts`; the F2 tests in `src/modules/catalog/application/cat.v2-breaker.test.ts`.
- **Evidence.** Red, `33-story-4.6.log` (section RED):

```text
 ❯ |solu2-atdd| _bmad-output/test-artifacts/atdd/cat_breaker.test.ts (6 tests | 6 failed) 427ms
     × [S-FR-CAT-8.breaker.C1] 50 concurrent fetches on an open breaker whose cool-down has passed: exactly one probe reaches the source, and the other 49 answer circuitOpen 29ms
NotImplementedError: NotImplemented: catalog.getFxSourceBreaker
 ❯ CatServiceV2.getFxSourceBreaker src/modules/catalog/application/cat.v2.ts:469:11
solu2-atdd: 379 tests in 26 files; 6 red for the right reason; 373 green for done stories (419 contracts or test ids done); 0 not as expected
```

  Green, `33-story-4.6.log` (section GREEN): "Tests 6 passed (6)" for the bound tests, "Tests 13 passed (13)" for the pure tests, and the whole gate:

```text
trace: 96 FRs, 56 NFRs, 61 AD rows, 32 risks, 115 clauses, 425 test ids (425 enforced green), 4 journeys, 1 k6 scripts; gate PASS; 0 problems
_bmad-output/planning-artifacts/epics.md is current: 13 epics, 72 stories
solu2-atdd: 379 tests in 26 files; 0 red for the right reason; 379 green for done stories (425 contracts or test ids done); 0 not as expected
EXIT 0
```

  The mutation check of the same log is in §3.1. The trace reached 62 AD rows once the audit bound rule 7 (#34).

## 9. Story 8.5: Reconcile ledgers and report, never repair, discrepancies

*Flow A + D · story file [`8-5-reconcile-ledgers-and-report-never-repair-discrepancies.md`](8-5-reconcile-ledgers-and-report-never-repair-discrepancies.md) · decisions #13, #14*

- **Challenge.** Nothing checked that each commission balance equals its ledger's sum with no seq gap (AD-COM-1 rule 4). Reconcile must run while deductions commit and report no false discrepancy (R-23), and two job runs must never both run (R-24).
- **Decisions.** The 50 s bound with a restart from the first account; three new tests, `[COM-3.C1]`, `[COM-3.C2]` and `[NFR-COM-2.drift]` (#13).
- **Code.** `accountDiscrepancies` (`commission/domain/com.ts:100`), `reconcile` (`commission/application/com.v2.ts:270`), the `FOR SHARE` account read (`commission/infra/pg.ts:202`), the procedures `commission.reconcile` and `commission.admin.lastReconciliation`.
- **Tests.** 9 bound tests: 6 Solu-2 tests in `atdd/com_contracts.test.ts`, `[COM-3.C1]` and `[COM-3.C2]` in `atdd/com_reconcile.test.ts`, and `nfr/com2_drift.test.ts`.
- **Evidence.** Red, `14-story-8.5-red.log`:

```text
     × [COM-3.C1] reconcile racing 50 concurrent deductions, 20 times: every run reports 0 discrepancies, and reconcile writes no account or ledger row 510ms
     × [COM-3.C2] a held job lock makes the nightly run a skipped no-op; once released one run reconciles; 10 concurrent runs leave 10 JobRun rows and one ReconciliationRun per run that ran 62ms
NotImplementedError: NotImplemented: commission.reconcile
Error: the job answered 500; its JobRun errorCode is NotImplemented
```

  The first error line is `[COM-3.Q1]`'s and the other in-process tests'. `[COM-3.C2]` calls the HTTP job route, whose 500 body has no message, so it reads the reason from the failed `JobRun` row (#13).

  Green, `15-story-8.5-green.log`: "NFR-COM-2.drift: 1,988 top-ups, 6,480 orders, 1,532 duplicates (19.1 %), 0 discrepancies", and "solu2-nfr: 24 tests in 13 files; 0 red for the right reason; 24 green for done stories … 0 not as expected".

## 10. Story 8.6: Set commission rates and read the ledger

*Flow B · story file [`8-6-set-commission-rates-and-read-the-ledger.md`](8-6-set-commission-rates-and-read-the-ledger.md) · decisions #13, #16, #35*

- **Challenge.** An admin could not schedule a rate, see the rate in force, or read any account's ledger. The risk (R-25) is a rate applied before its `effectiveFrom`, or a past-dated rate accepted.
- **Flow B.** The 4 Solu-2 bound tests had been red on `NotImplemented` since Solu-2. The domain and integration tests were written with the code, in one commit (`ecd8ca6`).
- **Code.** `scheduledEffectiveFrom` (60 s tolerance, then `max(effectiveFrom, now)`) and `rateInForce` (`commission/domain/com.ts:130`, `:139`); `setCommissionRate` and `getAccountLedger` (`com.v2.ts:423`, `:520`); a 50-line ledger page with a keyset cursor (#13). A second setting at the same `effectiveFrom` is refused with `RequestValidationFailed` and zero writes: the insert uses `ON CONFLICT ("effectiveFrom") DO NOTHING` (`commission/infra/pg.ts:79`), and since audit F8 `[S-FR-COM-7.C1]` races 20 such settings (§2.3).
- **Defect fixed in Impl-1 code.** `newestLedgerLines` sorted by `seq::text`, so a ledger with more than 9 entries listed seq 9 before 52. It now sorts by the number, and a new test fails on the old SQL (#16).
- **Spec fix.** Page 7.4 said a mistaken future rate could be replaced "with the same or an earlier start", which the unique key forbids. Mateo chose to fix the text: a later start corrects it (#16).
- **Evidence.** `16-story-8.6-green.log`: "First full run green", `com.ts | 100 | 98.57 |` (branches), "349 green for done stories … 0 not as expected", `EXIT 0`.

## 11. Story 9.6: Read the inbox, mark threads read and mute

*Flow A + D + E · story file [`9-6-read-the-inbox-mark-threads-read-and-mute.md`](9-6-read-the-inbox-mark-threads-read-and-mute.md) · decisions #15, #19*

- **Challenge.** Messages were stored, but nobody could read them. The risk (R-26) is a stale tab lowering `lastReadSeq` (AD-MSG-3), or a reader seeing the other side's read state.
- **Decisions.** 20 conversations per inbox page and at most 100 messages per thread call; two new red tests, `[S-FR-MSG-7.C1]` and `[S-FR-MSG-7.f2]`; a real `/ingresar` sign-in page (#15).
- **Code.** `readMarkAdvances`, `clampReadSeq` and the inbox cursor (`messaging/domain/msg.ts:31`); `listInbox`, `getThread`, `markRead`, `setMuted` (`messaging/application/msg.v2.ts:133`–`:216`); `advanceReadSeq` (`messaging/infra/pg.ts:153`); the inbox read in `REPEATABLE READ` read-only since F3 (#23); the pages `app/ingresar/` and `app/mensajes/`.
- **Tests.** `atdd/msg_contracts.test.ts` (4) and `atdd/msg_inbox.test.ts` (2); `src/modules/messaging/msg-domain.test.ts`; the journey `e2e/inbox.spec.ts` with `SignInPage` and `InboxPage`.
- **Evidence.** Red, `17-story-9.6-red.log`:

```text
     × [S-FR-MSG-7.C1] 50 concurrent markRead calls with random seqs, 20 rounds: lastReadSeq ends at the highest seq sent, clamped to lastSeq, and never decreases 74ms
NotImplementedError: NotImplemented: messaging.markRead
solu2-atdd: 369 tests in 23 files; 20 red for the right reason; 349 green for done stories (389 contracts or test ids done); 0 not as expected
```

  E2E, `18-story-9.6-e2e.log`: "3 passed (21.8s)". Green, `19-story-9.6-green.log`: `msg.ts` at 100 % branches, "355 green for done stories … 0 not as expected", `EXIT 0`.
- **Test problem fixed.** The first E2E run failed on a strict-mode violation, because Next.js's route announcer is a second `role="alert"`. `SignInPage` now scopes its locators to the named form (#19).

## 12. Stories 11.5 and 11.6: the binder and its refusals

*11.5 Flow B + D + E, 11.6 Flow A · story files [`11-5-…`](11-5-use-the-binder-add-external-cards-move-entries-and-wishlist-cards.md) and [`11-6-…`](11-6-refuse-unsafe-links-foreign-entries-and-unknown-wishlist-cards.md) · decisions #17, #20, #35*

- **Challenge.** The binder, link-added cards, move and copy, and the wishlist all threw `NotImplemented`. The risks are an unstable binder order between two reads with ties (R-27), and a non-https or scripted link that gets stored and later rendered (R-28, an XSS risk).
- **Decisions.** A batch identity port, `getSellerKinds`, for the wishlist's availability, with a parity test (closes an Epic 5 deferral); `[S-FR-COL-3.f2]` red before code; the NFR-COL-2 benchmark; a binder journey (#17). Over HTTP an unsafe link answers `InvalidExternalLink` too, because the DTO's `@pattern` was dropped (#20).
- **Code.** `isSafeHttpsUrl`, `invalidLinkField`, `binderOrder` (with `entryId` as the last tie-break), `completionPercent` (`null` for 0 cards) and `wishlistOrder` in `collections/domain/col.ts`; `addExternalEntry`, `getBinder`, `listWishlist` (`collections/application/col.v2.ts:275`, `:332`, `:451`); `lockOwnedEntry` (`collections/infra/pg.ts:70`); listings' batch availability read (`listings/application/inv.v2.ts:510`, at most 500 ids per call); the pages `app/coleccion/`.
- **Tests.** `atdd/col_supporting.test.ts` (8 Solu-2 tests, and `[S-FR-COL-5.C1]` from audit F8), `atdd/col_links.test.ts` (`[S-FR-COL-3.f2]`), `nfr/col2_latency.test.ts`, `col-domain.test.ts`, `e2e/binder.spec.ts` with `BinderPage`, `AddLinkPage` and, since #33, `CollectionsPage`. The parity test was mutation-checked: counting every seller as verified fails it (11.5's story file).
- **Evidence.** Red, `20-story-11.6-red.log`:

```text
     × [S-FR-COL-3.f2] javascript:, data:, an HTTP:// spoof, userinfo, a scheme-relative //host, a 2,049-character URL and a non-https imageUrl are each InvalidExternalLink citing the field, with zero writes 38ms
AssertionError: javascript:: expected 'NotImplementedError' to be 'InvalidExternalLink' // Object.is equality
solu2-atdd: 370 tests in 24 files; 15 red for the right reason; 355 green for done stories (395 contracts or test ids done); 0 not as expected
```

  The test reads the error's class name, so the stub's `NotImplementedError` shows as the received value, and `gate:atdd-red:impl1` counts it as red for the right reason. E2E, `21-story-11.5-e2e.log`: "4 passed (17.8s)", first run green. Green, `22-story-11.5-11.6-green.log`: "[NFR-COL-2.binder] p95 20.7 ms, [NFR-COL-2.wishlist] p95 24.4 ms", `col.ts` 100 % branches, "solu2-nfr: 26 tests in 14 files; … 26 green", `EXIT 0`.

## 13. Stories 13.5 and 13.6: profiles, moderation and their refusals

*13.5 Flow A + D + E, 13.6 Flow A · story files [`13-5-…`](13-5-read-profiles-search-moderation-logs-and-hide-listings.md) and [`13-6-…`](13-6-refuse-invalid-moderation-and-bad-aggregate-requests.md) · decisions #18, #21, #22*

- **Challenge.** Nobody could read a seller's profile, and an admin could not hide a listing, search reviews or read either moderation log. The risks are a profile whose aggregate and first page come from different snapshots around a hide (R-29), a profile read over p95 300 ms (R-30), and a search for `100%` that matches everything, or two concurrent hides that log twice (R-31).
- **Decisions.** k6 runs locally and as a blocking CI job (#18), at a fixed arrival rate (#21) and with a warm-up (#22); two new red tests, `[S-FR-REP-7.C1]` and `[S-FR-REP-5.C1]`; the NFR-REP-2 profile benchmark; a public profile journey (#18).
- **Code.** `getProfile` in one `REPEATABLE READ` read-only transaction (`reviews/application/rep.v2.ts:304`, `:321`); `escapeLike` (`reviews/domain/rep.ts:33`); `setListingHidden` (`listings/application/inv.v2.ts:603`) over `hideVisibleListing` (`listings/infra/pg.ts:278`); `mergeModerationLogs` (`src/server/moderation-log.ts:23`); the page `app/perfil/[userId]/page.tsx`; `nfr/k6/reputation-profile.js`, `scripts/nfr-k6.mjs`.
- **Tests.** `atdd/rep_contracts.test.ts`, `atdd/rep_reads.test.ts` (split out in the remediation, #25), `atdd/inv_supporting.test.ts`; `nfr/rep2_latency.test.ts`; `e2e/profile.spec.ts` with `SellerProfilePage`; `rep-domain.test.ts` (a 1,000-run property that the escaped pattern is a plain substring test).
- **Evidence.** Red, `23-story-13.5-13.6-red.log`:

```text
     × [S-FR-REP-5.C1] 20 concurrent hides of one listing: exactly one hide, one ListingModerationLog row and one audit row; every other call is the explained no-op 34ms
     × [S-FR-REP-7.C1] 100 rounds of profile reads racing hides and unhides of the seller’s reviews: every read’s aggregate counts and averages exactly the reviews it lists 87ms
NotImplementedError: NotImplemented: listings.setListingHidden
solu2-atdd: 372 tests in 24 files; 8 red for the right reason; 364 green for done stories (406 contracts or test ids done); 0 not as expected
```

  Green, `26-story-13.5-13.6-green.log`: "[NFR-REP-2.profile] p95 34.7 ms in this run (7.4 ms alone)", and the backlog of that time closes:

```text
solu2-atdd: 372 tests in 24 files; 0 red for the right reason; 372 green for done stories (415 contracts or test ids done); 0 not as expected
solu2-nfr: 27 tests in 14 files; 0 red for the right reason; 27 green for done stories (415 contracts or test ids done); 0 not as expected
EXIT 0
```

  k6: §15. E2E: `25-story-13.5-e2e.log`, "6 passed (16.3s)".
- **Test problems the subagent fixed itself (#21).** The first `[S-FR-REP-7.C1]` still passed with the profile broken to `READ COMMITTED`, so it could not catch the defect it names. It was strengthened until the broken code failed 3 of 3 runs. Separately, 16 local workers with 60-connection pools exceeded Postgres's 200 connections ("too many clients", 53300), so `solu2-atdd` now runs 3 files at a time (`maxWorkers: 3` in `vitest.config.ts`).

## 14. Red-phase ATDD evidence (Flow A)

Each red commit landed before the story's production code. It holds the tests, their binding in `epics.source.mjs`, the risk row in `test-design.md` §2 and the captured red run. `gate:atdd-red:impl1` (`scripts/check-atdd-red.mjs`) reads the Vitest JSON report: every test of a `done` story must pass, and every other one must fail on `NotImplementedError`. Any other failure counts as "not as expected" and fails the gate.

| Story | Red commit → green | Red log | Right-reason failure line | Gate line in the red log |
|---|---|---|---|---|
| 1.6 | `86aaa8e` → `7ac39a2` | `10-story-1.6-red.log` | `NotImplementedError: NotImplemented: jobs.serveJob` (7 of 7) | 35 red for the right reason, 0 not as expected |
| 2.6 | `eacd9f0` → `0c463f9` | `12-story-2.6-red.log` | `NotImplementedError: NotImplemented: auth.serveAuth` (6 of 6) | 34 red for the right reason, 0 not as expected |
| 4.6 | `4a84964` → `bde313d` | `33-story-4.6.log` (RED) | `NotImplementedError: NotImplemented: catalog.getFxSourceBreaker` (6 of 6) | 6 red for the right reason, 0 not as expected |
| 8.5 | `bccc1f3` → `30e2654` | `14-story-8.5-red.log` | `NotImplementedError: NotImplemented: commission.reconcile` (7 ATDD tests and the drift benchmark). `[COM-3.C2]` goes through the HTTP job route, whose 500 body carries no message, so it reports `Error: the job answered 500; its JobRun errorCode is NotImplemented` (#13) | none: the log holds the two Vitest runs only, ending "Tests 1 failed (1)" for the benchmark |
| 9.6 | `0291b05` → `90db9da` | `17-story-9.6-red.log` | `NotImplementedError: NotImplemented: messaging.markRead` / `.setMuted` / `.listInbox` (6 of 6) | 20 red for the right reason, 0 not as expected |
| 11.6 (+11.5) | `7c78cb1` → `7162354` | `20-story-11.6-red.log` | `expected 'NotImplementedError' to be 'InvalidExternalLink'`, and `NotImplemented: collections.addExternalEntry` (9 of 9) | 15 red for the right reason, 0 not as expected |
| 13.5 + 13.6 | `f8f2b62` → `23d0157` | `23-story-13.5-13.6-red.log` | `NotImplementedError: NotImplemented: listings.setListingHidden` / `reviews.searchReviews` (8 of 8) | 8 red for the right reason, 0 not as expected |
| Cursor list tag (#25, #26) | `dc47a0d` → `58aa73e` | `31-cursor-list-tag.log` §1 | `AssertionError: expected [ '[object Object]', null ] to deeply equal [ 'RequestValidationFailed', …(1) ]`: the call resolves with a page instead of refusing | — (colocated unit tests, no bound id) |

**Red for the wrong reason, caught.** Story 1.6's first red capture had `[S-SYS.jobs.C1]` failing on an assertion about the list of rejected runs, which hid the `NotImplementedError`. The gate reported it, and the test now rethrows the first rejection (`10-story-1.6-red.log` header, #11). In the cursor fix, the agent noted that two domain refusal tests passed while red only because the old decoder refuses anything with a tag, and it said so in the log instead of counting them as red (#26). In Story 4.6 the trace gate reported FAIL at red by design, because FR-CAT-8, NFR-CAT-4 and R-32 then mapped to a story that was not done (`33-story-4.6.log` header).

Flow B story 8.6 has no red commit: its 4 Solu-2 tests were red on `NotImplemented` from Solu-2 until `ecd8ca6` (story file, Verification).

## 15. k6 load test summary (Flow D)

`npm run nfr:k6` (`scripts/nfr-k6.mjs`) migrates and seeds `tezg_k6` with the PRD §3 marketplace, serves the production build on port 3200, and runs `grafana/k6:1.4.2` in Docker. The script is `nfr/k6/reputation-profile.js`: two `constant-arrival-rate` scenarios at 100 iterations a second each for 60 s, 25 VUs pre-allocated and at most 50 per endpoint, with no `sleep()`. A `setup()` warm-up (5 batches of 25 concurrent reads per endpoint) runs first and is tagged out of the measured figures (#21, #22).

Since #38 the server it starts sets `TEZG_PG_POOL_MAX=10` (§3.2): one long-lived `next start` serves the whole load, so it raises the runtime pool above the serverless minimum of 2.

The table puts two passing runs side by side:

- **Local:** the committed run (`k6-summary.json`, `39-pool-config-k6.log`), captured 2026-11-07 at the #38 fix, on a Windows 11 laptop with Docker Desktop Postgres 16.6, with the pool at 10.
- **CI run 3:** [41964862300](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41964862300), job `nfr-k6`, on GitHub's Ubuntu runner (`32-ci-run.log`), before audit fix F1, when the server used pg's default pool of 10. Its log prints the thresholds only, so the figures it does not print are marked "—".

| Endpoint | Run | Requests | p95 | p99 | Error rate | 5xx | Dropped iterations | Thresholds | Result |
|---|---|---|---|---|---|---|---|---|---|
| `reputation.profile` (NFR-REP-2) | Local | 5,999 | 41.25 ms | 122.91 ms | 0.00 % | 0 | 2 | p95 < 300 ms, p99 < 800 ms, errors < 1 %, 5xx = 0, dropped < 60 | PASS |
| | CI run 3 | 6,001 | 8.29 ms | 15.33 ms | 0.00 % | 0 | 0 | the same | PASS |
| `catalog.browse` (NFR-SYS-9, NFR-CAT-1) | Local | 6,000 | 42.80 ms | 115.40 ms | 0.00 % | 0 | 1 | p95 < 1,000 ms, errors < 1 %, 5xx = 0, dropped < 60 | PASS |
| | CI run 3 | 6,001 | 24.02 ms | — | 0.00 % | 0 | 0 | the same | PASS |
| All (incl. 250 warm-up requests) | Local | 12,249 | 59.70 ms | 199.50 ms | 0.00 % | 0 | 3 | errors < 1 %, 5xx = 0, dropped < 120 | PASS |
| | CI run 3 | — | — | — | 0.00 % | 0 | 0 | the same | PASS |

The thresholds as k6 printed them locally (`39-pool-config-k6.log`):

```text
    dropped_iterations
    ✓ 'count<120' count=3
    http_req_duration{endpoint:browse}
    ✓ 'p(95)<1000' p(95)=42.79ms
    http_req_duration{endpoint:profile}
    ✓ 'p(95)<300' p(95)=41.25ms
    ✓ 'p(99)<800' p(99)=122.91ms
    http_req_failed
    ✓ 'rate<0.01' rate=0.00%
    ...
    server_errors_5xx
    ✓ 'count==0' count=0
...
    checks_succeeded...: 100.00% 11999 out of 11999
browse  ✓ [ 100% ] 00/26 VUs  1m0s  100.00 iters/s
profile ✓ [ 100% ] 00/27 VUs  1m0s  100.00 iters/s
nfr-k6: k6 exited with 0
```

and on CI (`32-ci-run.log`, run 3):

```text
    dropped_iterations
    ✓ 'count<120' count=0
    http_req_duration{endpoint:browse}
    ✓ 'p(95)<1000' p(95)=24.02ms
    http_req_duration{endpoint:profile}
    ✓ 'p(95)<300' p(95)=8.29ms
    ✓ 'p(99)<800' p(99)=15.33ms
    http_req_failed
    ✓ 'rate<0.01' rate=0.00%
    server_errors_5xx
    ✓ 'count==0' count=0
```

The earlier local runs, of 2026-11-04 on pg's default pool of 10 (`24-k6.log`), gave profile p95 38.3 and 34.4 ms and browse p95 39.4 and 36.4 ms, with 0 and 3 dropped iterations. Without the warm-up, the cold server dropped 60 and 63 iterations in its first second, which crossed the 1 % threshold on its own (#22).

**Before and after the configurable pool (#38).** Audit fix F1 set the runtime pool to `max: 2` with a 10 s checkout timeout (#34–#36), and nobody re-ran k6 after that change. The re-audit update did, on `94b42e7` (`38-reaudit-docs.log`, the "before"), and k6 failed. Mateo chose a configurable pool (#38): `TEZG_PG_POOL_MAX`, 2 to 50 and 2 by default, with 10 on the long-lived servers. The run at the fix is the "after" (`39-pool-config-k6.log`):

| Pool | Profile p95 | Profile p99 | Browse p95 | Requests (browse, profile) | Errors, 5xx | Dropped iterations | k6 exit |
|---|---|---|---|---|---|---|---|
| `max: 2`, at `94b42e7` (log 38, before) | 659.84 ms (budget 300 ms) | 793.29 ms | 665.38 ms | 5,312, 5,343 | 0.00 %, 0 | 1,347 (budget < 120) | 99, FAIL |
| `max: 10`, edited for the run only and reverted (log 38) | 26.89 ms | 49.64 ms | 30.95 ms | 6,000, 6,001 | 0.00 %, 0 | 0 | 0, PASS |
| `TEZG_PG_POOL_MAX=10`, set by `scripts/nfr-k6.mjs` (log 39, after) | 41.25 ms | 122.91 ms | 42.80 ms | 6,000, 5,999 | 0.00 %, 0 | 3 | 0, PASS |

With two connections, the 100 VUs of one `next start` process queue for the pool: no request fails, but the median answer takes 536 ms. AD-SYS-4 sizes the pool at 2 for one serverless instance, where the platform adds instances under load, while the k6 server is one long-lived process taking 200 requests a second, so it sets 10.

**The other Flow D proofs** (PRD §7 benchmarks in `solu2-nfr`, values from [`nfr-evidence.md`](../test-artifacts/nfr-evidence.md) and the logs named):

| Benchmark | p95 | Threshold |
|---|---|---|
| `[NFR-REP-2.profile]` | 34.7 ms in the full gate (7.4 ms alone) | 300 ms |
| `[NFR-COL-2.binder]` (500 entries, sorted) | 20.7 ms | 800 ms |
| `[NFR-COL-2.wishlist]` (200 cards) | 24.4 ms | 1,000 ms |
| `[NFR-IDN-1.capabilities]`, `.eligibility`, `.sellerKinds` | 4.8, 4.2, 13.1 ms | 50 ms |
| `[NFR-VAL-2.current]`, `.trend`, `.history` (500 entries) | 20.6, 44.4, 263.4 ms in the full gate, after the indexed price read (`37-price-lookup.log`) | 1,500, 1,500, 2,500 ms |
| `[NFR-CAT-1.provenance]` | 12.9 ms in the full gate (`37-price-lookup.log`) | 300 ms |
| `[NFR-COM-2.drift]` | 0 discrepancies over 10,000 operations (19.1 % duplicates) | 0 |

Since #25 these benchmarks run one file at a time (`fileParallelism: false` on `solu2-nfr` in `vitest.config.ts`). Side by side, `[NFR-IDN-1.*]` measured 52.8–108.2 ms against 50 ms, because it ran next to the benchmarks seeding the marketplace (`30-test-remediation.log` §3).

**The slow benchmark (#35–#37).** One gate run timed out on `[NFR-VAL-2.trend]` at 600 s. The investigation found that the seed takes about 4.5 s and that about 92 % of the time was the 550 measured calls, each sorting 43,200 price rows to keep 480 and spilling about 1.8 MB to disk (`36-pool-timeout-and-bench.log`). The as-of price read became one indexed `LIMIT 1` per card, which returns the same rows. Median of 3 solo runs, before → after: current 40.7 → 12.8 s (p95 87.5 → 20.0 ms) and trend 100.6 → 22.2 s (p95 197.0 → 44.7 ms). Thresholds, dataset and iterations are unchanged, and the trend's bound went back to the project's 300 s (`37-price-lookup.log`).

## 16. Playwright E2E run log and traces (Flow E)

**One command.** `npx playwright test` starts everything through `scripts/e2e-server.mjs`: the Compose Postgres (skipped in CI), a recreated and migrated `tezg_e2e` database, `next build` and `next start` on port 3100 (#10). The latest run (`37-price-lookup.log`):

```text
  ✓  1 [chromium] › _bmad-output\test-artifacts\e2e\binder.spec.ts:19:1 › Julián re-sorts his binder, the order survives a reload, and a promo added by an https link lands in a pocket after an http:// link is refused (5.2s)
  ✓  2 [chromium] › _bmad-output\test-artifacts\e2e\inbox.spec.ts:16:1 › Camila reads a conversation, its badge clears, and muting another takes it out of her unread total (2.6s)
  ✓  3 [chromium] › _bmad-output\test-artifacts\e2e\inbox.spec.ts:55:1 › a wrong password keeps Camila on the sign-in page with the es-CO error (1.0s)
  ✓  4 [chromium] › _bmad-output\test-artifacts\e2e\profile.spec.ts:15:1 › a visitor with no session reads Lucía’s rating and reviews, without the review moderation hid (873ms)
  ✓  5 [chromium] › _bmad-output\test-artifacts\e2e\profile.spec.ts:33:1 › an id that is no seller shows the es-CO Not-available page (728ms)
  ✓  6 [chromium] › _bmad-output\test-artifacts\e2e\smoke.spec.ts:8:1 › a visitor opens TEZG and sees the service ready (712ms)
  6 passed (36.1s)
```

**Accessibility scans (#33).** `BasePage.expectNoA11yViolations()` runs axe-core (`@axe-core/playwright` 4.14.0, exact-pinned) with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`, and asserts an empty violation list, at any impact. The 6 journeys make **14 scans**, each after a web-first assertion: 6 in `binder.spec.ts`, 5 in `inbox.spec.ts`, 2 in `profile.spec.ts` and 1 in `smoke.spec.ts`. They cover home, sign-in and its refusal, the inbox (3 states), the binder (3 states), the add-link page and its field error, the collections list, and the seller profile with its Not-available page. All 14 found 0 violations. A planted `<img>` without `alt` and an unlabelled `<input>` failed the smoke journey with `image-alt (critical)` and `label (critical)`, so the check can fail; the plant was never committed (`34-a11y-axe.log`). axe's "needs review" items, such as the 3 decorative star glyphs, are left to the manual launch audit (#33).

**Trace confirmation.** [`playwright.config.ts`](../../playwright.config.ts) sets `trace: 'on-first-retry'`, with `retries` 1 locally and 2 in CI, so a `trace.zip` exists for any test that needed a retry. The CI `e2e` job uploads `playwright-report/` and `test-results/` whether it passes or fails. A green suite writes no trace, so the close made one evidence run with `npx playwright test --trace on`, which overrides the option for that run only (#10, `29-playwright-traces.log`). It committed one trace per test:

| Test (at the time of the trace) | Trace |
|---|---|
| `binder.spec.ts:17` | [`traces/binder-sort-and-add-link.zip`](../test-artifacts/evidence/impl2/traces/binder-sort-and-add-link.zip) |
| `inbox.spec.ts:15` | [`traces/inbox-read-and-mute.zip`](../test-artifacts/evidence/impl2/traces/inbox-read-and-mute.zip) |
| `inbox.spec.ts:50` | [`traces/inbox-wrong-password.zip`](../test-artifacts/evidence/impl2/traces/inbox-wrong-password.zip) |
| `profile.spec.ts:14` | [`traces/profile-reviews-without-hidden.zip`](../test-artifacts/evidence/impl2/traces/profile-reviews-without-hidden.zip) |
| `profile.spec.ts:31` | [`traces/profile-not-a-seller.zip`](../test-artifacts/evidence/impl2/traces/profile-not-a-seller.zip) |
| `smoke.spec.ts:7` | [`traces/smoke-service-ready.zip`](../test-artifacts/evidence/impl2/traces/smoke-service-ready.zip) |

**Traces captured on CI.** The `e2e` job keeps `trace: 'on-first-retry'` for its gating run. After that run passes, a second step runs `npx playwright test --trace on` and uploads one `trace.zip` per journey as the `playwright-traces` artifact, failing if none is written (#29). CI run [41964862300](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41964862300) (`cdb295b`) passed both runs (6 passed (16.8s), then 6 passed (7.7s)). Its six traces are committed under the same names in [`traces-ci/`](../test-artifacts/evidence/impl2/traces-ci/), for example [`traces-ci/binder-sort-and-add-link.zip`](../test-artifacts/evidence/impl2/traces-ci/binder-sort-and-add-link.zip). Both sets of traces predate the axe scans (#33), so they show the journeys without the scan steps.

Open one with `npx playwright show-trace _bmad-output/test-artifacts/evidence/impl2/traces/<file>.zip` (or `traces-ci/<file>.zip`).

**Page Object Model.** The 4 specs in [`e2e/`](../test-artifacts/e2e/) reach the DOM only through the 8 page objects in `e2e/pages/`:

| Page object | Page | Used by |
|---|---|---|
| `BasePage` | the shared `open()`, the `h1` heading, the `status` live region and `expectNoA11yViolations()` | every page object |
| `HomePage` | `/` | `smoke.spec.ts` |
| `SignInPage` | `/ingresar`, its locators scoped to the named form | `inbox.spec.ts`, `binder.spec.ts` |
| `InboxPage` | `/mensajes` | `inbox.spec.ts` |
| `CollectionsPage` | `/coleccion`, the list "Colecciones" (#33) | `binder.spec.ts` |
| `BinderPage`, `AddLinkPage` | `/coleccion/<id>`, `/coleccion/<id>/agregar` | `binder.spec.ts` |
| `SellerProfilePage` | `/perfil/<userId>` | `profile.spec.ts` |

Locators are role- and label-based. Each spec seeds its own rows through `e2e/support/` (`binder-seed.ts`, `inbox-seed.ts`, `profile-seed.ts`, `db.ts`), and the journeys run serially on one database (`workers: 1`). Assertions are web-first and retry up to `expect.timeout` (10 s), for example `await expect(profile.reviews).toHaveCount(2)` in `profile.spec.ts`.

**No-sleep gate.** `gate:no-sleep` refuses any locator built in a `*.spec.ts` (`page.locator(`, `page.getBy…(`, `page.$(`, `waitForSelector(`) and every timed wait everywhere. Its line in the last gate run (`37-price-lookup.log`):

```text
no-sleep: 351 files checked, 7 rules proven on planted violations, 0 problems
```

## 17. The test pyramid

The statement asks for 70 % unit, 20 % integration and 10 % E2E, with NFR as a separate layer. The counts use the rule of [`test-review.md`](../test-artifacts/test-review.md) ("The pyramid (70 / 20 / 10 + NFR)"): `it`/`test` blocks, an `it.each` table once, a k6 scenario once; a file is integration when it registers a test database. The test review's re-run (#38, `test-review.md`) recounted with the script of `38-reaudit-docs.log` §4, run on the committed trees (copied into `40-test-review-rerun.log`). It gives 282 / 745 / 6 / 32 at `727c74f`, where that review's own count said 284 unit blocks, so the shares agree to 0.2 points.

| Level | Added by Impl-2 (`a7c5d81` → HEAD) | Share | Whole suite at HEAD | Share | Target |
|---|---|---|---|---|---|
| Unit | 118 | 55.7 % | 299 | 27.9 % | 70 % |
| Integration | 88 | 41.5 % | 768 | 71.6 % | 20 % |
| E2E | 6 | 2.8 % | 6 | 0.6 % | 10 % |
| NFR (separate layer) | 9 | — | 32 (30 benchmarks, 2 k6 scenarios) | — | separate |
| **Total** | **221** | | **1,105** | | |

The test review's own figures at `727c74f` were 59.1 / 37.4 / 3.5 % for Impl-2's additions and 27.4 / 72.0 / 0.6 % for the whole suite; before its remediation, 43.1 / 52.0 / 4.9 % and 23.9 / 75.5 / 0.6 % (#24, #25). Counted the same way, the cursor fix (#26) added 1 unit and 2 integration blocks before the close (`3bc7543`: 283 / 747 / 6), and the re-audit 16 unit blocks (the breaker's domain tests, the job runner's refused checkouts and the `TEZG_PG_POOL_MAX` cases) and 21 integration blocks (the breaker's races, the pool tests, the F8 races and the job health).

**Deliberate deviation.** Neither count reaches 70 / 20 / 10, and Mateo chose to document this, not to pad the base (#24). Quoting `test-review.md` § "Deliberate deviation": "The suite is integration-first by design, not by neglect." Test-design §3 explains why: most P0 risks are races, retries and boundaries that only the database can arbitrate, such as conditional updates, partial unique indexes and `FOR UPDATE` order. A unit test over a mock would pass on code that oversells. It is not an ice-cream cone: E2E stays at 6 journeys, and every rule a journey touches is proven below it (§18).

## 18. The 4 classic testing traps

The statement audits the suite against four traps. For each one, the rule is in `test-design.md` §7.5, and the evidence is below.

**1. The Ice Cream Cone (inverted pyramid).** The pyramid is not inverted: 6 E2E tests against 299 unit and 768 integration tests (0.6 % E2E, §17). The journeys only prove that the pages wire the rules together. Each rule they touch is proven by a bound ATDD test or a domain test, and the domain cores are held at ≥ 90 % branches per file (97.56 % overall, `37-price-lookup.log`). The deviation from 70 / 20 / 10 is toward integration, not toward the browser, and it is documented (§17).

**2. The Flaky Sleeper (timing hacks).** No test or script waits on time.

- `npm run gate:no-sleep` runs in `test:ci` and checks 351 files with 7 rules, each first proven on a planted violation: "no-sleep: 351 files checked, 7 rules proven on planted violations, 0 problems" (`37-price-lookup.log`).
- Since #31 the planted samples are assembled at run time (`scripts/check-no-sleep.mjs`, the `planted(...)` helper), so the forbidden calls appear nowhere as literal text in the code. A `git grep` for a timed-wait call with a number (Playwright's timeout wait, Python's and Postgres's sleep, a bare `sleep(` with a digit) over `src/`, `app/`, `test-support/`, `scripts/`, `tools/`, `.github/`, `_bmad-output/test-artifacts/` and the two configs finds **0** matches (`38-reaudit-docs.log`). The only matches in the repository are prose that describes the removed waits (the decision log) and the vendored BMad skill guides under `.agents/`, `.claude/` and `.cline/`, which show the trap as a bad example.
- Waits are conditions: `untilBlockedOnLock` reads `pg_stat_activity`, `race` starts N calls on one barrier, Playwright uses web-first assertions only, and k6 starts iterations at a fixed arrival rate with no `sleep()`. The starved-pool test is bounded by the pool's own 200 ms timeout, not by a timer (§3.2).
- Every Vitest project passes shuffled with seeds 1, 2, 3, 42 and 1234 (`30-test-remediation.log` §2).

**3. The Mocking Mirage (over-mocking).** The unit under test is never faked. Fakes stand only at module boundaries and external ports, and integration tests run on a real PostgreSQL 16, one database per file (`test-support/db.ts`). A grep over the tracked code (`38-reaudit-docs.log`) finds:

- `vi.mock`: **0** uses.
- `vi.fn`, `vi.spyOn` and `vi.stubGlobal`: 5 uses in 3 files. `src/server/trpc/router.test.ts` stubs the `IdentityGate` port that the router consults; `src/modules/identity/application/idn.v2.test.ts` spies on the `VirtualClock` port to count its reads, without replacing it; `app/_client/api.test.ts` stubs `fetch`, the browser client's external port.
- `fake<T>(name, impl)` (`test-support/solu2/fixtures.ts:235`): a proxy that implements only what the test names, so any other call fails loudly. It is used over 18 port types, and every one is a port: 2 external ports (`FxRateSource`, `CatalogFeedSource`) and 16 neighbour ports named `<Module>For<Module>` (for example `CatalogForCol`, `IdentityForCom`).
- Hand-written seams: the auth-guard tests fake Better Auth's handler and identity's throttle port, never `serveAuth` itself; the job-route tests use the real identity gate and the real `JobRunner` over in-memory ports (`test-review.md`, the four traps).
- The repositories are never faked in an integration test: `wiring(db)` composes the real `Pg*Repository` adapters of all modules.

**4. The Blindly Green (vacuous assertions).** A test that cannot fail is caught in three ways.

- **The red gates.** `gate:atdd-red:impl1` and `gate:nfr-red:impl1` require every test of a story that is not done to fail on `NotImplementedError`, and every test of a done story to pass. A new test therefore has to be seen failing for the right reason before it counts (§14).
- **No conditional assertion.** A test asserts what its input determines, unconditionally: no `if (…) expect`. A grep of every `*.test.ts`, `*.spec.ts` and `*.test.mjs` for an `expect` inside an `if`, on one line or in a block, finds 0 (`38-reaudit-docs.log`). A race test throws its first unexpected rejection (`if (rejected.length > 0) throw rejected[0]`) instead of asserting under a condition. The one Impl-1 conditional assertion was the correction of #9 (§21). No test is skipped, focused or marked todo (0 matches).
- **Mutation proofs.** Each risky test was broken on purpose once and seen failing:

| Decision log | What was broken | What failed | Log |
|---|---|---|---|
| #8 | The `FOR SHARE` at `identity/infra/pg.ts:362` removed | the hardened lock test, "no backend waited on a lock … after 5000 probes"; the old 200 ms version passed | `02-flowC-lock-mutation.log` |
| #9 | nothing: the Impl-1 test itself could not fail, because its only assertion sat under a condition its input never met | the fix pins the input's outcome unconditionally, and a new test forces the collapse branch | `src/modules/listings/contact-domain.test.ts` |
| #21 | The profile read broken to `READ COMMITTED` | `[S-FR-REP-7.C1]`, 3 of 3 runs, once strengthened | (decision log #21) |
| #25 | The rules behind the 48 new pure tests, broken 18 times | every break failed its tests | `30-test-remediation.log` §4 |
| #32 | `FOR UPDATE` removed from the breaker's read | `[S-FR-CAT-8.breaker.C1]` ("expected 42 to be 1") and `.C2` | `33-story-4.6.log` |
| #33 | An `<img>` without `alt` and an unlabelled `<input>` planted on the home page | the smoke journey, `image-alt (critical)` and `label (critical)` | `34-a11y-axe.log` |
| #35 | The `col:owner` lock removed; the `UNIQUE ("effectiveFrom")` dropped with a check-then-insert | `[S-FR-COL-5.C1]` (16 entries at one position); `[S-FR-COM-7.C1]` (20 of 20 stored) | `35-architecture-fixes.log` |
| #36 | The runner's old no-row behaviour; a pool with no checkout timeout | `[S-SYS.jobs.pool]` and `[S-SYS.jobs.starved]`; the second hangs to "Test timed out in 60000ms" | `36-pool-timeout-and-bench.log` |
| this update | One byte appended to a log; an unlisted file added; a listed trace removed | `gate:evidence`, exit 1 each time | `38-reaudit-docs.log` |

## 19. The 5 NFR dimensions

Learning objective 4 names five NFR dimensions. The PRD's 56 NFRs are mapped to them below; every NFR id is a row of [`nfr-evidence.md`](../test-artifacts/nfr-evidence.md), and the trace gives all 56 PASS, 0 waived (`traceability-matrix.md` §1).

| Dimension | NFR ids | Tests | Evidence |
|---|---|---|---|
| **Security** | NFR-SYS-2 (0 regulated values in logs, errors and payloads), NFR-SYS-7 and NFR-IDN-3 (the actor comes from the session, never a client-claimed role), NFR-SYS-14 (throttles), NFR-SYS-8 and NFR-VER-2 (audit) | `[NFR-SYS-8.canary]`, `[SYS-8.R2]`, `[SYS-8.R2.static]`, `[S-FR-IDN-7.signin.throttle]`, `[S-FR-IDN-7.signup.throttle]`; Impl-2 adds `[S-SYS.jobs.auth]` (the job bearer), `[S-FR-COL-3.f2]` (unsafe links), `app/ingresar/destination.test.ts` (open redirect) and `src/server/ip-hmac.test.ts` | `solu2-atdd` 384 green and `solu2-nfr` 30 green (`37-price-lookup.log`); `gate:deps` "24 dependencies in 2 manifests: exact, approved, no high or critical advisory" (`34-a11y-axe.log`); the code review's F1 and F2 (#23) |
| **Concurrency** | NFR-SYS-10 (≥ 50 real connections, 100 repetitions), NFR-INV-1 and NFR-INV-2 (no oversell), NFR-COM-1, NFR-REP-1, and the other MEC rows | the 13 hammers of §2.3, among them `[S-FR-CAT-8.breaker.C1]` and `.C2`, `[S-FR-COL-5.C1]`, `[S-FR-COM-7.C1]`, `[S-SYS.jobs.C1]`, `[COM-3.C1]`, `[S-FR-MSG-7.C1]`, `[S-FR-REP-7.C1]` | each hammer's mutation proof (§18); `33-story-4.6.log`, `35-architecture-fixes.log`, `02-flowC-lock-mutation.log`; Winston's "Concurrency defense: PASS" (§4) |
| **Performance** | NFR-SYS-9 (commands p95 ≤ 800 ms, reads ≤ 1,000 ms), NFR-REP-2, NFR-CAT-1, NFR-COL-2, NFR-IDN-1, NFR-VAL-2 and the other 7 Performance rows | the 30 PRD §7 benchmarks in `solu2-nfr`; the k6 script `nfr/k6/reputation-profile.js` | §15: k6 PASS at the configurable pool of #38, `TEZG_PG_POOL_MAX=10` (profile p95 41.25 ms and p99 122.91 ms, browse p95 42.80 ms, 0.00 % errors, 0 5xx, 3 dropped iterations; `39-pool-config-k6.log`), after the FAIL on the 2-connection pool (profile p95 659.84 ms, 1,347 dropped; `38-reaudit-docs.log`); CI run 3 before the pool change (`32-ci-run.log`); the benchmarks in `37-price-lookup.log` |
| **Resilience** | NFR-CAT-4 (the TRM job never invents a rate, and a failing source is short-circuited), NFR-SYS-6 (0 lost events), NFR-CAT-3 (0 fabricated prices), NFR-COM-2 (reconciliation difference 0) | `[S-FR-CAT-8.breaker.*]`, `[S-FR-CAT-8.f]`, `[NFR-SYS-6.sweep]`, `[SYS-2.R4]`, `[S-SYS.jobs.failed]`, `[S-SYS.jobs.starved]`, `[S-SYS.tick.jobs]`, `[CAT-3.I1]`, `[NFR-COM-2.drift]` | §3; `33-story-4.6.log`, `35-architecture-fixes.log`, `36-pool-timeout-and-bench.log`, `15-story-8.5-green.log`; Winston's "Graceful degradation and circuit breakers: PASS" (§4) |
| **Usability** | NFR-SYS-11 (WCAG 2.2 AA), NFR-ORD-4 (a paid order waiting 7 days shows the waiting state and the support contact), NFR-SYS-1 and NFR-SYS-13 (every decision explained, every code with its message) | the 14 axe-core scans in the 6 journeys (§16); `[SYS-1.R6]` ("every registry code formats with its family status, an es-CO message and a cited decision"); the journeys that assert es-CO text (the sign-in refusal, the Not-available page); `[S-FR-ORD-10.h]` | `34-a11y-axe.log` (14 scans, 0 violations, a planted violation fails); `gate:ui:solu2` "43 pages, 328 states (139 data, 77 refusal, 112 client), 0 problems" (`37-price-lookup.log`). The manual WCAG audit (screen reader, keyboard walk-through, contrast of dynamic states) is deferred to launch (#33) |

## 20. Quality gate, trace, CI and signed evidence

- **Final trace.** [`traceability-matrix.md`](../test-artifacts/traceability-matrix.md) is generated by `scripts/gen-solu2-trace.mjs` and maps PRD requirement → story (status) → test files → CI evidence → verdict (#5, #24). Its gate decision is **PASS**: FRs 96 / 96, NFRs 56 / 56 (56 PASS, 0 waived; NFR-SYS-11, NFR-VER-4 and NFR-ORD-2 pass in scope with a part deferred to launch), P0 risks 24 / 24, P1 7 / 7, P2 1 / 1, §14 AD rows 62 / 62, stories 72 / 72 `done`, test ids enforced green 430 / 430, and 0 unmapped requirements. The check line in the last run: "trace: 96 FRs, 56 NFRs, 62 AD rows, 32 risks, 115 clauses, 430 test ids (430 enforced green), 4 journeys, 1 k6 scripts; gate PASS; 0 problems" (`37-price-lookup.log`).
- **Test review.** 100 / 100 (A, Approve), 0 findings, re-run over the whole suite at `efa178c` as #38 decided (`test-review.md`, `40-test-review-rerun.log`). At `efa178c` it found 1 HIGH (`atdd/sys_contracts.test.ts` at 303 lines, after F3's test) and 2 MEDIUM (inline `JobRun` rows, a local copy of the `failedDelivery()` factory): 101 clamped to 100, but Request Changes, because a HIGH decides the recommendation. All three were mechanical and were fixed in the same run without changing an assertion; four shuffled seeds pass in `impl1-unit`, `solu2-atdd` and `solu2-fitness`. Before: 59 / 100 at the close (#24), then 100 / 100 at `727c74f` after the remediation (#25).
- **The last full gate** (`37-price-lookup.log`, `npm run test:ci` exit 0 in 11 min 43 s):

```text
no-sleep: 351 files checked, 7 rules proven on planted violations, 0 problems
56 models, each tagged with its owning module; prisma/schema.prisma is current
 Test Files  72 passed (72)
      Tests  757 passed (757)
All files          |   99.07 |    97.56 |     100 |     100 |
144 operations, 113 ingress procedures, 163 schemas, 37 core operations checked against contracts.md; surface is current
43 pages, 328 states (139 data, 77 refusal, 112 client), 0 problems
204 code citations checked, 0 problems
222 test ids cited by contracts.md; 430 defined under _bmad-output/test-artifacts; 37 core operations
trace: 96 FRs, 56 NFRs, 62 AD rows, 32 risks, 115 clauses, 430 test ids (430 enforced green), 4 journeys, 1 k6 scripts; gate PASS; 0 problems
_bmad-output/planning-artifacts/epics.md is current: 13 epics, 72 stories
14 domain files checked, 0 problems
 Test Files  2 passed (2)
      Tests  12 passed (12)
solu2-atdd: 384 tests in 26 files; 0 red for the right reason; 384 green for done stories (430 contracts or test ids done); 0 not as expected
solu2-nfr: 30 tests in 15 files; 0 red for the right reason; 30 green for done stories (430 contracts or test ids done); 0 not as expected
EXIT 0
```

  Lint printed 0 warnings. That run predates `gate:evidence`, which this update adds to `test:ci` (below).
- **CI.** [`.github/workflows/impl2-quality-gate.yml`](../../.github/workflows/impl2-quality-gate.yml) runs on every push to `main` or `impl-*` and on every pull request. Its jobs are `gate` (`npm run test:ci`), `e2e` (`npx playwright test`, uploading the report and traces) and `nfr-k6` (`npm run nfr:k6`, uploading the summary). A fourth job, `release`, prints `Quality gate: PASS` only when all three succeeded, and fails otherwise. The branch was pushed at the close (#27), and `32-ci-run.log` holds the three runs:
  - **Run 1** ([41901553179](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41901553179)): `Quality gate: FAIL`. The red gate caught `[S-FR-MSG-7.C1]` with `sorry, too many clients already`: the CI Postgres ran at the default 100 connections, against the 200 of `docker-compose.yml`. The `gate` and `nfr-k6` jobs now set 200 (#28).
  - **Run 2** ([41922563597](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41922563597)): `Quality gate: PASS`, but a green run records no trace, so the forensic trace step was added (#29).
  - **Run 3** ([41964862300](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41964862300), `cdb295b`): `gate=success e2e=success nfr-k6=success`, `Quality gate: PASS`. The run had 729 unit tests (97.49 % branches), the trace gate PASS, `solu2-atdd` 373 green, `solu2-nfr` 30 green, Playwright 6 passed twice, and k6 profile p95 8.29 ms, p99 15.33 ms, browse p95 24.02 ms, 0.00 % errors and 0 dropped iterations. Six `trace.zip` files were uploaded. This is the CI sign-off.

  The 23 re-audit commits and this update are local, so CI has not run them yet. They passed the same gate locally: `npm run test:ci` exited 0 in evidence logs 33, 35, 36 and 37, and `npx playwright test` passed 6 of 6 in logs 34 to 37. The `nfr-k6` job was not run locally after the pool change of #35, and when run it failed (§15). With the configurable pool of #38 it passes again, and at that fix `npm run nfr:k6`, `npx playwright test` (6 of 6) and `npm run test:ci` (exit 0) were all re-run (`39-pool-config-k6.log`).
- **Signed evidence.** Learning objective 7 asks for a sign-off "backed by cryptographic logs and test runner execution reports". [`SHA256SUMS`](../test-artifacts/evidence/impl2/SHA256SUMS) holds the SHA-256 digest of every file in `evidence/impl2/`: the run logs `00`–`38`, `k6-summary.json`, `ci-runs.json` (the CI runs and the sign-off run, which the trace generator reads) and the 12 `trace.zip` files of `traces/` and `traces-ci/`. `scripts/evidence-sums.mjs` writes it in the standard `sha256sum` format (`npm run gen:evidence`). `npm run gate:evidence` runs inside `test:ci`; it recomputes every digest and fails when a listed file changed or is missing, or when a file is not listed. `sha256sum -c SHA256SUMS`, run inside the folder, checks the same digests without Node. The trace's §2 names the CI sign-off run and this file. The digests are generated last, after every other evidence file is final (`38-reaudit-docs.log`).

## 21. AI governance: corrections of AI testing mistakes

The [decision log](../decision-logs/impl-2-ai-decision-log.md) has 37 entries. Its index of tagged proposals lists `[CORRECTED]` at #7, #8, #9 and twice at #23. The statement asks for at least 2 instances where the team corrected an AI testing mistake. These are the three human corrections of AI tests:

| # | The AI's mistake | How it was caught | The correction | Decided by |
|---|---|---|---|---|
| [#8](../decision-logs/impl-2-ai-decision-log.md) | The Impl-1 suite, written by the BMad AI agents in the Impl-1 stories (Mateo confirmed the authorship, #27), proved lock waits by waiting 200 ms, widened a race with a database sleep, and copied a timer watchdog into seven files (Impl-1 test review MEDIUM-1 to MEDIUM-3): the Flaky Sleeper trap | The Impl-1 test review and the Flow C scan | `untilBlockedOnLock`, the `race` barrier, `single-connection.ts` and `gate:no-sleep`; the mutation check in §2.2 shows the old test would have passed with no lock | Mateo (menu) |
| [#9](../decision-logs/impl-2-ai-decision-log.md) | An Impl-1 AI test of `contact.ts` ended with `if (m.truncationSteps.includes('collapsedItems')) expect(…)`. Its input never collapses, so the line never asserted anything: the Blindly Green trap | The Flow C gap analysis, while covering the `collapsedItems` branch | The conditional became two unconditional assertions, and the collapse got its own forced test | Mateo (menu) |
| [#23](../decision-logs/impl-2-ai-decision-log.md) (Story 2.6) | The AI recorded in `deferred-work.md` that a production sign-up "fails as NotImplemented (500), never silently". It had never tested that claim | The fresh-context review, then a new test: with the guard disabled it got **200**, because Better Auth swallowed the email error and committed an account that could never be verified | `[S-FR-IDN-7.signup.unwired]`, and sign-up refused before any write while mail is unwired | Mateo (menu) |

**Also corrected by a human decision.** In #25 a shuffled run showed that the benchmarks ran side by side, so the order Vitest picked decided whether `[NFR-IDN-1.*]` passed; Mateo chose `fileParallelism: false` over the cheaper `maxWorkers: 2`. In #36 Mateo accepted one edited assertion, `[S-SYS.jobs.pool]`'s fifth row, only because the old assertion encoded the hang-prone behaviour #35 removed and two mutations make the new one fail.

**The agent's own corrections.** They are recorded but not counted as human corrections:

- the first `[S-FR-REP-7.C1]` could not fail (#21);
- `[S-SYS.jobs.C1]` was red for the wrong reason (#11);
- a claim that every new unit test runs under 10 ms was false for 3 of 48 (#25);
- two vacuous red-phase cases in the cursor fix (#26);
- the main agent's re-audit found its own gate's planted samples as literal sleep calls in `scripts/check-no-sleep.mjs`, so a plain grep of the code found them; they are now assembled at run time (#31, `0a29548`);
- #35 said the slow benchmark "passed alone in 256 s"; the subagent of #36 found that 256 s was the whole 3-test file, and that the trend test alone takes about 100 s (#36, `36-pool-timeout-and-bench.log`).

## 22. Known limits

Every open item has an owner in [`deferred-work.md`](deferred-work.md), in the sections "Deferred from: Story 1.6" to "Deferred from: the architecture audit fixes". In short:

- **Launch checklist.** The `jobs-tick.yml` schedule, `JOBS_SECRET` in production, a mail provider (until then sign-up is refused) with Better Auth's own limiter back on (F7 of the code review), NFR-SYS-11's manual WCAG audit (its automated axe-core rules pass in the journeys since #33), and reconcile's restart from the first account at large volume.
- **The TRM adapter.** The production adapter is still unbuilt, so the breaker guards only the fixture in tests; its call must end within 45 s, inside the probe's 60 s lease (audit F6). The breaker's policy is a constant, not configuration (Story 4.6 deferral).
- **Four jobs not routed.** `failed-delivery-digest`, `contact-log-purge`, `auth-throttle-purge` and `orphan-upload-sweep` are deferred to launch, each with an owner (audit F4).
- **UI phase.** The full pages behind the three slices (composer, filters, sort direction, wishlist page, moderation pages 11.3–11.4 with the merged-log cursors, F6 of the code review), page 2.3 with the breaker and the job health, and a typed es-CO formatter for instants and money (F5).
- **CI owner.** The serial benchmarks take most of the gate's 11–13 minutes (`36-pool-timeout-and-bench.log`, `37-price-lookup.log`).
- **Not yet on CI.** The re-audit commits (§20).

## 23. How to reproduce

```bash
npm ci && npm test                         # Compose Postgres, then the full gate (about 12 minutes)
npx playwright test                        # the 6 journeys and their 14 axe scans against a production build
npx playwright test --trace on             # the same, writing a trace.zip per test into test-results/
npm run nfr:k6                             # k6 in Docker against the seeded production build
npm run gate:evidence                      # recompute every digest of SHA256SUMS
npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/cat_breaker.test.ts   # one story's bound tests
```

All of them need Docker and nothing in `.env`: the tests compose their own configuration, and Playwright and k6 pass local `JOBS_SECRET`, `BETTER_AUTH_SECRET` and `IP_HMAC_KEY` values to the server they start, with `TEZG_PG_POOL_MAX=10` (#38). `npm run nfr:k6` rewrites `k6-summary.json`, so after a local k6 run `gate:evidence` fails until you restore the committed file (`git checkout -- <path>`) or record the new one with `npm run gen:evidence`. [`docs/impl-2/README.md`](../../docs/impl-2/README.md) has the full command list.
