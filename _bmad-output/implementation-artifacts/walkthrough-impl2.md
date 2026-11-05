# Impl-2 Walkthrough: hardening, the five testing flows and the last nine stories

This walkthrough closes Impl-2. It is the "Implementation Walkthrough Report (`walkthrough-impl2.md`)" of the Impl-2 task statement §5 item 5, and it sits next to [`walkthrough-impl1.md`](walkthrough-impl1.md), which covers different stories (decision log Impl-2 #5). [`docs/impl-2/README.md`](../../docs/impl-2/README.md) maps every other deliverable of the statement to its path.

It covers the 9 Impl-2 stories: the 7 stories Impl-1 reserved (8.5, 8.6, 9.6, 11.5, 11.6, 13.5, 13.6) and the two stories Impl-2 added for the items Impl-1 handed over, 1.6 (the jobs route) and 2.6 (sign-up, sign-in and the throttle) (decision log Impl-2 #1, #7). The statement's generic "Stories X.4–X.6" map to these 9.

**Where the numbers come from.** Every figure below is copied from a committed evidence log in [`_bmad-output/test-artifacts/evidence/impl2/`](../test-artifacts/evidence/impl2/) (named `NN-….log`), from [`k6-summary.json`](../test-artifacts/evidence/impl2/k6-summary.json), from [`test-review.md`](../test-artifacts/test-review.md) or from [`traceability-matrix.md`](../test-artifacts/traceability-matrix.md). Each log starts with a header comment that names the commit and the command it ran. The last full gate run is `31-cursor-list-tag.log` (on `58aa73e`), and the last Playwright run is `30-test-remediation.log` §7. The CI runs on GitHub Actions are in `32-ci-run.log`.

## Contents

- §1 [Scope and ceremony](#1-scope-and-ceremony)
- §2 [Architectural hardening and concurrency defense](#2-architectural-hardening-and-concurrency-defense)
- §3 [Flow per story](#3-flow-per-story)
- §4–§10 One card per story: [1.6](#4-story-16-run-scheduled-jobs-single-flight-behind-jobs_secret), [2.6](#5-story-26-sign-up-sign-in-and-throttle-failed-attempts), [8.5](#6-story-85-reconcile-ledgers-and-report-never-repair-discrepancies), [8.6](#7-story-86-set-commission-rates-and-read-the-ledger), [9.6](#8-story-96-read-the-inbox-mark-threads-read-and-mute), [11.5 and 11.6](#9-stories-115-and-116-the-binder-and-its-refusals), [13.5 and 13.6](#10-stories-135-and-136-profiles-moderation-and-their-refusals)
- §11 [Red-phase ATDD evidence (Flow A)](#11-red-phase-atdd-evidence-flow-a)
- §12 [k6 load test summary (Flow D)](#12-k6-load-test-summary-flow-d)
- §13 [Playwright E2E run log and traces (Flow E)](#13-playwright-e2e-run-log-and-traces-flow-e)
- §14 [The test pyramid](#14-the-test-pyramid)
- §15 [Quality gate, trace and CI](#15-quality-gate-trace-and-ci)
- §16 [AI governance: corrections of AI testing mistakes](#16-ai-governance-corrections-of-ai-testing-mistakes)
- §17 [Known limits](#17-known-limits)
- §18 [How to reproduce](#18-how-to-reproduce)

## 1. Scope and ceremony

- **Backlog.** 71 stories in 13 epics, all `done` in [`sprint-status.yaml`](sprint-status.yaml). The backlog grew from 69 to 71 when 1.6 and 2.6 were added through `bmad-correct-course` (decision log Impl-2 #7), because a new test bound to the `done` Story 2.4 could have no red phase.
- **Decider.** Mateo Rubio takes every decision the [Impl-2 decision log](../decision-logs/impl-2-ai-decision-log.md) records (#1). It has 30 entries.
- **Git.** One branch, `impl-2`, off `main` at `a7c5d81`; 37 local commits (`git log --oneline main..impl-2`), none pushed (#4).
- **Ceremony.** Spec approval by menu per epic, then one story subagent per story (#14), a fresh-context `bmad-code-review` over the whole of Impl-2 (#23), the final trace (#24) and the test review with its remediation (#24, #25).
- **Shift-left.** Before any story code, Phase A put in place the Flow C hardening (`2da2c11`, #8), the Playwright framework, the app shell and the Impl-2 CI gate (`c3996a5`, #10). The risk-based test design of [`test-design.md`](../test-artifacts/test-design.md) §7 fixed each story's flow, its planned risks R-21..R-31 and the thresholds first (`fbf6dfe`).
- **UI slice.** The service had no pages. Flow E needed some, so Impl-2 pulled forward a thin slice of three pages from the UX specs: the inbox, the binder and the public seller profile, plus the sign-in page they need (#2, #15).

## 2. Architectural hardening and concurrency defense

### 2.1 Ports and adapters, extended without new exceptions

Every Impl-2 story kept the module layout of Impl-1: a pure `domain/` (checked by `npm run gate:purity`: "13 domain files checked, 0 problems", `31-cursor-list-tag.log`), an `application/*.v2.ts` service, its `ports/` and a Postgres adapter in `infra/pg.ts`. The new cross-cutting pieces sit outside the modules:

| Piece | Path | What it does |
|---|---|---|
| Job route | `src/server/jobs.ts`, `app/api/jobs/[job]/route.ts` | Parses the bearer, the job name and the trigger, then runs the job and answers JSON |
| Job runner and lock | `src/shared-kernel/jobs.ts`, `src/shared-kernel/infra/pg-jobs.ts` | Writes one `JobRun` row per run and keeps the run single-flight under `pg_try_advisory_xact_lock(hashtextextended('job:<name>', 0))` |
| Job bearer | `src/modules/identity/application/gate.ts:45` | Hashes both sides with SHA-256 and compares them with `timingSafeEqual`. An empty secret matches nothing |
| Auth guard | `src/server/auth-routes.ts`, `src/server/auth.ts` | Runs the AD-IDN-3 throttle before Better Auth checks the password, and records failures after it (#12) |
| Moderation-log merge | `src/server/moderation-log.ts` | Merges one page of each moderation log by `(at desc, id)` |
| Shared composition root | `app/_server/runtime.ts` | One composition for the tRPC route and the pages. The system clock stays outside `src/` (AD-SYS-6, #10) |

All 108 tRPC procedures are now wired: `src/server/composition-access.test.ts` asserts `WIRED_PROCEDURES` equals the generated registry ("every registry procedure has a resolver, so none answers NotImplemented"). With the 4 job routes, that makes "143 operations, 112 ingress procedures" in `gate:api:solu2` (`31-cursor-list-tag.log`).

### 2.2 Flow C: the Impl-1 tests, hardened before any story (decision log #8, #9)

Flow C (test-after) used `bmad-testarch-automate` on the Impl-1 code: first a coverage scan, then a gap analysis, then regression tests.

- **Coverage.** The baseline log shows three domain cores under 90 % branches: `dsc.ts` 75 %, `trd.ts` 80.64 %, `contact.ts` 83.33 % (`01-coverage-baseline.log`). Decision log #8 quotes 91.55 % overall and `ord.ts` at 88.9 % from the run the agent read; the committed log shows 92.38 % and `ord.ts` 93.05 %. After the backfill, every core is at 90 % or more, and the total is 95.81 % (`03-coverage-after-flowC.log`). The rule is enforced per file: `vitest.config.ts` sets `thresholds: { perFile: true, branches: 90 }` over `src/modules/*/domain/**/*.ts`. The last run shows 97.49 % branches (`31-cursor-list-tag.log`).
- **Dead code.** `turnVerdict` (`trading/domain/trd.ts`) had no caller, and it was the reason `trd.ts` sat at 80.6 %. It was deleted rather than padded with a test (#8). `sendEligibility` (`messaging/domain/msg.ts`) was deleted the same way later (#19).
- **Sleeps removed.** The suite had two 200 ms "is it still blocked?" sleeps, three 1–5 ms `setTimeout` interleavings, a `pg_sleep(0.05)` and a 3 s deadlock watchdog copied into seven files (#8). They were replaced by three helpers:
  - `test-support/locks.ts` `untilBlockedOnLock`: waits until `pg_stat_activity` shows the blocked statement with `wait_event_type = 'Lock'`. It is bounded by a number of probes, not by a clock.
  - `test-support/concurrency.ts` `race`: N calls start together behind one barrier, and every outcome is kept.
  - `test-support/single-connection.ts`: a pool of one connection that refuses a second concurrent checkout at once.
- **The gate.** `npm run gate:no-sleep` (`scripts/check-no-sleep.mjs`) runs inside `test:ci`. It refuses `waitForTimeout`, `time.sleep`, `pg_sleep`, `sleep(n)`, promise sleeps and locators built in Playwright specs. Each of its 7 rules first proves it catches a planted violation.
- **Mutation proof.** With the `FOR SHARE` at `identity/infra/pg.ts:362` removed, the hardened lock test fails. The old 200 ms version would have passed (`02-flowC-lock-mutation.log`):

```text
 FAIL  |impl1-unit| src/modules/identity/application/ver.v2.test.ts > VerServiceV2.requireMessagingEligibility (MSG-3) > inside a transaction on a pool of 1 it reads on that connection, and its FOR SHARE holds a rejection until commit
Error: no backend waited on a lock for a query containing "UPDATE \"BusinessApplication\"" after 5000 probes
 ❯ untilBlockedOnLock test-support/locks.ts:26:9
```

That test now lives in `src/modules/identity/application/ver.v2-reads.test.ts`, after the remediation split the file (#25).

### 2.3 The concurrency hammers: the races Impl-2 proves

Each hammer runs real PostgreSQL 16 connections behind the `race` barrier. A rejection is rethrown (`if (rejected.length > 0) throw rejected[0]`), so a failure shows its real cause (#11).

| Test id | File | What it hammers | What makes it hold | What it proves |
|---|---|---|---|---|
| `[S-SYS.jobs.C1]` | `atdd/sys_jobs.test.ts` | 20 concurrent expiry runs | the `job:<name>` advisory lock, held on its own connection for the run (`pg-jobs.ts`) | each run is succeeded or skipped, each writes its `JobRun` row, and the due order releases its unit exactly once |
| `[S-SYS.jobs.single]` | `atdd/sys_jobs.test.ts` | a run while another holds `job:expiry-materialize` | the same lock | a skipped no-op with its row; after the release, one run expires the order |
| `[COM-3.C1]` | `atdd/com_reconcile.test.ts` | reconcile racing 50 concurrent deductions, 20 times | each account read `FOR SHARE` before its ledger (`commission/infra/pg.ts:202`) | 0 false discrepancies, and reconcile writes no account or ledger row |
| `[COM-3.C2]` | `atdd/com_reconcile.test.ts` | 10 concurrent nightly runs | the job lock inside COM-3 (P2) | 10 `JobRun` rows, and one `ReconciliationRun` per run that ran |
| `[NFR-COM-2.drift]` | `nfr/com2_drift.test.ts` | 10,000 seeded-random operations with redelivered orders | the exactly-once deduction of Story 8.2 and reconcile | "1,988 top-ups, 6,480 orders, 1,532 duplicates (19.1 %), 0 discrepancies" (`15-story-8.5-green.log`) |
| `[S-FR-MSG-7.C1]` | `atdd/msg_inbox.test.ts` | 50 concurrent `markRead` calls with random seqs, 20 rounds | one conditional statement, `advanceReadSeq` (`messaging/infra/pg.ts:153`) | `lastReadSeq` ends at the highest seq sent, clamped to `lastSeq`, and never goes down |
| `[S-FR-REP-7.C1]` | `atdd/rep_contracts.test.ts` | 100 rounds of profile reads racing hides and unhides (4 admins, 4 readers) | the profile read in one `REPEATABLE READ` read-only transaction (`reviews/application/rep.v2.ts:321`) | every read's aggregate counts exactly the reviews its page lists. With the read broken to `READ COMMITTED` it fails in 3 of 3 runs (#21) |
| `[S-FR-REP-5.C1]` | `atdd/inv_supporting.test.ts` | 20 concurrent hides of one listing | a conditional flip, then a `FOR UPDATE` re-read (`listings/infra/pg.ts:278`) | one hide, one `ListingModerationLog` row and one audit row; every other call is the explained no-op |

Story 8.6 adds one more guard without a hammer: a second rate setting at the same `effectiveFrom` is refused with `RequestValidationFailed` and zero writes (`src/modules/commission/application/com.v2-admin.test.ts:91`, a sequential test). The insert uses `ON CONFLICT ("effectiveFrom") DO NOTHING` (`commission/infra/pg.ts:79`), so a concurrent pair also gets the refusal and never a 500 (#16). No test races that pair.

### 2.4 Graceful degradation and security boundaries

- **A failed job stays visible.** The runner commits a `running` row before the work starts, so a run that dies midway still shows. A failed run answers 500 `Unexpected` with no message, and its row keeps the error code (`[S-SYS.jobs.failed]`). A failed lock `COMMIT` now releases its connection as broken and keeps the run's outcome (code review F4, #23).
- **Reconcile is bounded.** The all-accounts run stops after 50 s of Clock time (`RECONCILE_BATCH_MS = 50_000`, `commission/domain/com.ts:114`) and reports `ReconciliationPartial` (#13). It reports discrepancies and never repairs them.
- **No half-done sign-up.** While no mail provider is wired, the guard refuses `POST /sign-up/email` before Better Auth writes anything. `[S-FR-IDN-7.signup.unwired]` proves there is no `User`, `Account` or throttle row (F2, #23).
- **Throttle.** 10 failed sign-ins per account and 30 per IP in 15 minutes, and 5 sign-ups per IP per hour (AD-IDN-3, #11). IPs are stored only as HMACs.
- **Open redirect closed.** `app/ingresar/destination.ts` resolves `?siguiente=` against the origin and keeps same-origin paths only (F1, #23).
- **Unsafe links.** `isSafeHttpsUrl` (`collections/domain/col.ts:68`) refuses `javascript:`, `data:`, `HTTP://`, userinfo, `//host` and URLs over 2,048 characters. Over HTTP the answer is the registry code `InvalidExternalLink` too (#20).
- **Scheduler.** `.github/workflows/jobs-tick.yml` runs by hand (`workflow_dispatch`) until a deployment exists. No correctness rule depends on it running (AD-SYS-6 rule 5, #11).

## 3. Flow per story

From [`test-design.md`](../test-artifacts/test-design.md) §7.1, as built. Flow C is the Impl-1 hardening of §2.2.

| Story | Flow | Red commit | Green commit | Risks |
|---|---|---|---|---|
| 1.6 Run scheduled jobs single-flight behind `JOBS_SECRET` | A | `86aaa8e` | `7ac39a2` | R-21 |
| 2.6 Sign up, sign in and throttle failed attempts | A | `eacd9f0` | `0c463f9` | R-22 |
| 8.5 Reconcile ledgers and report, never repair, discrepancies | A + D | `bccc1f3` | `30e2654` | R-23, R-24 |
| 8.6 Set commission rates and read the ledger | B | — (Solu-2 tests already red) | `ecd8ca6` | R-25 |
| 9.6 Read the inbox, mark threads read and mute | A + D + E | `0291b05` | `90db9da` | R-26 |
| 11.5 Binder, external cards, moves and wishlist | B + D + E | (11.6's `7c78cb1`) | `7162354`, `a440983` | R-27 |
| 11.6 Refuse unsafe links, foreign entries and unknown wishlist cards | A | `7c78cb1` | `7162354` | R-28 |
| 13.5 Profiles, moderation logs and listing hides | A + D + E | `f8f2b62` | `23d0157`, `c84225a` | R-29, R-30 |
| 13.6 Refuse invalid moderation and bad aggregate requests | A | `f8f2b62` | `23d0157` | R-31 |

11.6 and 13.6 only prove 11.5's and 13.5's operations, so each pair turned `done` in one commit: the red gate fails if one story of a pair is done while the other's tests already pass (#17, #18).

## 4. Story 1.6: Run scheduled jobs single-flight behind `JOBS_SECRET`

*Flow A · story file [`1-6-run-scheduled-jobs-single-flight-behind-jobs-secret.md`](1-6-run-scheduled-jobs-single-flight-behind-jobs-secret.md) · decisions #7, #11*

- **Challenge.** Impl-1 left the jobs route unbuilt, so the registry's job procedures answered 404, and nothing triggered the outbox sweeper in production. The risk (R-21) is a job run without the bearer, or two runs of one job at once.
- **Decisions.** A fourth job procedure, `jobs/outbox-sweep` (`S-SYS.sweep`), and a hand-run scheduler workflow (#11).
- **Code.** `src/server/jobs.ts`; `src/shared-kernel/jobs.ts` and `infra/pg-jobs.ts`; `src/shared-kernel/admin-events.ts` (`sweep`); `src/server/composition.ts`; `app/api/jobs/[job]/route.ts`; `JOBS_SECRET` in `src/shared-kernel/config.ts:12` (at least 32 bytes); `.github/workflows/jobs-tick.yml`.
- **Tests.** 7 bound tests in `atdd/sys_jobs.test.ts`; pure tests in `src/shared-kernel/job-runner.test.ts` and `src/server/jobs.test.ts` (#25).
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

## 5. Story 2.6: Sign up, sign in and throttle failed attempts

*Flow A · story file [`2-6-sign-up-sign-in-and-throttle-failed-attempts.md`](2-6-sign-up-sign-in-and-throttle-failed-attempts.md) · decisions #7, #11, #12, #23*

- **Challenge.** No user could sign up or sign in, and the brute-force limit was inactive (Impl-1 #26). The risk (R-22) is that the 11th failed sign-in is not refused, or that an IP is stored in clear.
- **Decisions.** An unverified user may sign in, and `requireCanBuy` keeps the money paths gated. The throttle follows AD-IDN-3 as designed (#11). The guard wraps Better Auth's handler instead of using its internal `hooks.before`, so a refusal is the platform's `{ error: ErrorBody }` (#12, an agent default).
- **Code.** `src/server/auth-routes.ts` (the guard), `src/server/auth.ts` (`createAuth`), `throttleRefusal` (`identity/domain/idn.ts:133`), `recordAuthThrottleEvent` and `accountIdForEmail` (`identity/application/idn.v2.ts:298`, `:310`), the `EmailSender` port (`src/shared-kernel/external.ts:46`).
- **Tests.** `atdd/idn_auth.test.ts`: the 6 red tests, plus `[S-FR-IDN-7.signup.unwired]` from the code review (`cd50fa1`). 8 pure tests of the guard in `src/server/auth-routes.test.ts`, with a fake Better Auth handler.
- **Evidence.** Red, `12-story-2.6-red.log`: "6 failed", each on `NotImplementedError: NotImplemented: auth.serveAuth`, and "34 red for the right reason … 0 not as expected". The `serveAuth` stub itself was committed with `7ac39a2` (Story 1.6's green commit); the red commit `eacd9f0` adds only tests and artifacts. Green, `13-story-2.6-green.log`: "337 green for done stories … 0 not as expected", `epics.md` "13 epics, 71 stories", `EXIT 0`.
- **A real defect found.** Better Auth writes `ipAddress: ''` on every session insert, and `"Session"` has no such column, so every sign-in was a 500. No Impl-1 test had reached it, because those tests inserted session rows directly. `createAuth` now strips the field in a Prisma client extension (`src/server/auth.ts:35`).

## 6. Story 8.5: Reconcile ledgers and report, never repair, discrepancies

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

## 7. Story 8.6: Set commission rates and read the ledger

*Flow B · story file [`8-6-set-commission-rates-and-read-the-ledger.md`](8-6-set-commission-rates-and-read-the-ledger.md) · decisions #13, #16*

- **Challenge.** An admin could not schedule a rate, see the rate in force, or read any account's ledger. The risk (R-25) is a rate applied before its `effectiveFrom`, or a past-dated rate accepted.
- **Flow B.** The 4 Solu-2 bound tests had been red on `NotImplemented` since Solu-2. The domain and integration tests were written with the code, in one commit (`ecd8ca6`).
- **Code.** `scheduledEffectiveFrom` (60 s tolerance, then `max(effectiveFrom, now)`) and `rateInForce` (`commission/domain/com.ts:130`, `:139`); `setCommissionRate` and `getAccountLedger` (`com.v2.ts:423`, `:520`); a 50-line ledger page with a keyset cursor (#13).
- **Defect fixed in Impl-1 code.** `newestLedgerLines` sorted by `seq::text`, so a ledger with more than 9 entries listed seq 9 before 52. It now sorts by the number, and a new test fails on the old SQL (#16).
- **Spec fix.** Page 7.4 said a mistaken future rate could be replaced "with the same or an earlier start", which the unique key forbids. Mateo chose to fix the text: a later start corrects it (#16).
- **Evidence.** `16-story-8.6-green.log`: "First full run green", `com.ts | 100 | 98.57 |` (branches), "349 green for done stories … 0 not as expected", `EXIT 0`.

## 8. Story 9.6: Read the inbox, mark threads read and mute

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

## 9. Stories 11.5 and 11.6: the binder and its refusals

*11.5 Flow B + D + E, 11.6 Flow A · story files [`11-5-…`](11-5-use-the-binder-add-external-cards-move-entries-and-wishlist-cards.md) and [`11-6-…`](11-6-refuse-unsafe-links-foreign-entries-and-unknown-wishlist-cards.md) · decisions #17, #20*

- **Challenge.** The binder, link-added cards, move and copy, and the wishlist all threw `NotImplemented`. The risks are an unstable binder order between two reads with ties (R-27), and a non-https or scripted link that gets stored and later rendered (R-28, an XSS risk).
- **Decisions.** A batch identity port, `getSellerKinds`, for the wishlist's availability, with a parity test (closes an Epic 5 deferral); `[S-FR-COL-3.f2]` red before code; the NFR-COL-2 benchmark; a binder journey (#17). Over HTTP an unsafe link answers `InvalidExternalLink` too, because the DTO's `@pattern` was dropped (#20).
- **Code.** `isSafeHttpsUrl`, `invalidLinkField`, `binderOrder` (with `entryId` as the last tie-break), `completionPercent` (`null` for 0 cards) and `wishlistOrder` in `collections/domain/col.ts`; `addExternalEntry`, `getBinder`, `listWishlist` (`collections/application/col.v2.ts:275`, `:332`, `:451`); `lockOwnedEntry` (`collections/infra/pg.ts:70`); listings' batch availability read (`listings/application/inv.v2.ts:510`, at most 500 ids per call); the pages `app/coleccion/`.
- **Tests.** `atdd/col_supporting.test.ts` (8 Solu-2 tests), `atdd/col_links.test.ts` (`[S-FR-COL-3.f2]`), `nfr/col2_latency.test.ts`, `col-domain.test.ts`, `e2e/binder.spec.ts` with `BinderPage` and `AddLinkPage`. The parity test was mutation-checked: counting every seller as verified fails it (11.5's story file).
- **Evidence.** Red, `20-story-11.6-red.log`:

```text
     × [S-FR-COL-3.f2] javascript:, data:, an HTTP:// spoof, userinfo, a scheme-relative //host, a 2,049-character URL and a non-https imageUrl are each InvalidExternalLink citing the field, with zero writes 38ms
AssertionError: javascript:: expected 'NotImplementedError' to be 'InvalidExternalLink' // Object.is equality
solu2-atdd: 370 tests in 24 files; 15 red for the right reason; 355 green for done stories (395 contracts or test ids done); 0 not as expected
```

  The test reads the error's class name, so the stub's `NotImplementedError` shows as the received value, and `gate:atdd-red:impl1` counts it as red for the right reason. E2E, `21-story-11.5-e2e.log`: "4 passed (17.8s)", first run green. Green, `22-story-11.5-11.6-green.log`: "[NFR-COL-2.binder] p95 20.7 ms, [NFR-COL-2.wishlist] p95 24.4 ms", `col.ts` 100 % branches, "solu2-nfr: 26 tests in 14 files; … 26 green", `EXIT 0`.

## 10. Stories 13.5 and 13.6: profiles, moderation and their refusals

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

  Green, `26-story-13.5-13.6-green.log`: "[NFR-REP-2.profile] p95 34.7 ms in this run (7.4 ms alone)", and the backlog closes:

```text
solu2-atdd: 372 tests in 24 files; 0 red for the right reason; 372 green for done stories (415 contracts or test ids done); 0 not as expected
solu2-nfr: 27 tests in 14 files; 0 red for the right reason; 27 green for done stories (415 contracts or test ids done); 0 not as expected
EXIT 0
```

  k6: §12. E2E: `25-story-13.5-e2e.log`, "6 passed (16.3s)".
- **Test problems the subagent fixed itself (#21).** The first `[S-FR-REP-7.C1]` still passed with the profile broken to `READ COMMITTED`, so it could not catch the defect it names. It was strengthened until the broken code failed 3 of 3 runs. Separately, 16 local workers with 60-connection pools exceeded Postgres's 200 connections ("too many clients", 53300), so `solu2-atdd` now runs 3 files at a time (`maxWorkers: 3` in `vitest.config.ts`).

## 11. Red-phase ATDD evidence (Flow A)

Each red commit landed before the story's production code. It holds the tests, their binding in `epics.source.mjs`, the risk row in `test-design.md` §2 and the captured red run. `gate:atdd-red:impl1` (`scripts/check-atdd-red.mjs`) reads the Vitest JSON report: every test of a `done` story must pass, and every other one must fail on `NotImplementedError`. Any other failure counts as "not as expected" and fails the gate.

| Story | Red commit → green | Red log | Right-reason failure line | Gate line in the red log |
|---|---|---|---|---|
| 1.6 | `86aaa8e` → `7ac39a2` | `10-story-1.6-red.log` | `NotImplementedError: NotImplemented: jobs.serveJob` (7 of 7) | 35 red for the right reason, 0 not as expected |
| 2.6 | `eacd9f0` → `0c463f9` | `12-story-2.6-red.log` | `NotImplementedError: NotImplemented: auth.serveAuth` (6 of 6) | 34 red for the right reason, 0 not as expected |
| 8.5 | `bccc1f3` → `30e2654` | `14-story-8.5-red.log` | `NotImplementedError: NotImplemented: commission.reconcile` (7 ATDD tests and the drift benchmark). `[COM-3.C2]` goes through the HTTP job route, whose 500 body carries no message, so it reports `Error: the job answered 500; its JobRun errorCode is NotImplemented` (#13) | none: the log holds the two Vitest runs only, ending "Tests 1 failed (1)" for the benchmark |
| 9.6 | `0291b05` → `90db9da` | `17-story-9.6-red.log` | `NotImplementedError: NotImplemented: messaging.markRead` / `.setMuted` / `.listInbox` (6 of 6) | 20 red for the right reason, 0 not as expected |
| 11.6 (+11.5) | `7c78cb1` → `7162354` | `20-story-11.6-red.log` | `expected 'NotImplementedError' to be 'InvalidExternalLink'`, and `NotImplemented: collections.addExternalEntry` (9 of 9) | 15 red for the right reason, 0 not as expected |
| 13.5 + 13.6 | `f8f2b62` → `23d0157` | `23-story-13.5-13.6-red.log` | `NotImplementedError: NotImplemented: listings.setListingHidden` / `reviews.searchReviews` (8 of 8) | 8 red for the right reason, 0 not as expected |
| Cursor list tag (#25, #26) | `dc47a0d` → `58aa73e` | `31-cursor-list-tag.log` §1 | `AssertionError: expected [ '[object Object]', null ] to deeply equal [ 'RequestValidationFailed', …(1) ]`: the call resolves with a page instead of refusing | — (colocated unit tests, no bound id) |

**Red for the wrong reason, caught.** Story 1.6's first red capture had `[S-SYS.jobs.C1]` failing on an assertion about the list of rejected runs, which hid the `NotImplementedError`. The gate reported it, and the test now rethrows the first rejection (`10-story-1.6-red.log` header, #11). In the cursor fix, the agent noted that two domain refusal tests passed while red only because the old decoder refuses anything with a tag, and it said so in the log instead of counting them as red (#26).

Flow B story 8.6 has no red commit: its 4 Solu-2 tests were red on `NotImplemented` from Solu-2 until `ecd8ca6` (story file, Verification).

## 12. k6 load test summary (Flow D)

`npm run nfr:k6` (`scripts/nfr-k6.mjs`) migrates and seeds `tezg_k6` with the PRD §3 marketplace, serves the production build on port 3200, and runs `grafana/k6:1.4.2` in Docker. The script is `nfr/k6/reputation-profile.js`: two `constant-arrival-rate` scenarios at 100 iterations a second each for 60 s, 25 VUs pre-allocated and at most 50 per endpoint, with no `sleep()`. A `setup()` warm-up (5 batches of 25 concurrent reads per endpoint) runs first and is tagged out of the measured figures (#21, #22). The table is the committed run (`k6-summary.json`, `24-k6.log`, captured 2026-11-04 on a Windows 11 laptop with Docker Desktop Postgres 16.6).

| Endpoint | Requests | p95 | p99 | Error rate | 5xx | Dropped iterations | Thresholds | Result |
|---|---|---|---|---|---|---|---|---|
| `reputation.profile` (NFR-REP-2) | 6,001 | 38.3 ms | 113.7 ms | 0.00 % | 0 | 0 | p95 < 300 ms, p99 < 800 ms, errors < 1 %, 5xx = 0, dropped < 60 | PASS |
| `catalog.browse` (NFR-SYS-9, NFR-CAT-1) | 6,001 | 39.4 ms | 98.7 ms | 0.00 % | 0 | 0 | p95 < 1,000 ms, errors < 1 %, 5xx = 0, dropped < 60 | PASS |
| All (incl. 250 warm-up requests) | 12,252 | 50.6 ms | 162.9 ms | 0.00 % | 0 | 0 | errors < 1 %, 5xx = 0, dropped < 120 | PASS |

The thresholds as k6 printed them (`24-k6.log`):

```text
    http_req_duration{endpoint:browse}
    ✓ 'p(95)<1000' p(95)=39.38ms

    http_req_duration{endpoint:profile}
    ✓ 'p(95)<300' p(95)=38.32ms
    ✓ 'p(99)<800' p(99)=113.71ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%
    ...
    server_errors_5xx
    ✓ 'count==0' count=0
...
    checks_succeeded...: 100.00% 12002 out of 12002
browse  ✓ [ 100% ] 00/25 VUs  1m0s  100.00 iters/s
profile ✓ [ 100% ] 00/25 VUs  1m0s  100.00 iters/s
nfr-k6: k6 exited with 0
```

The run before it on the same tree gave profile p95 34.4 ms and p99 156.2 ms, browse p95 36.4 ms and p99 140.3 ms, and 3 dropped iterations (`24-k6.log` header). Without the warm-up, the cold server dropped 60 and 63 iterations in its first second, which crossed the 1 % threshold on its own (#22).

**The other Flow D proofs** (PRD §7 benchmarks in `solu2-nfr`, values from [`nfr-evidence.md`](../test-artifacts/nfr-evidence.md)):

| Benchmark | p95 | Threshold |
|---|---|---|
| `[NFR-REP-2.profile]` | 34.7 ms in the full gate (7.4 ms alone) | 300 ms |
| `[NFR-COL-2.binder]` (500 entries, sorted) | 20.7 ms | 800 ms |
| `[NFR-COL-2.wishlist]` (200 cards) | 24.4 ms | 1,000 ms |
| `[NFR-IDN-1.capabilities]`, `.eligibility`, `.sellerKinds` | 4.8, 4.2, 13.1 ms | 50 ms |
| `[NFR-COM-2.drift]` | 0 discrepancies over 10,000 operations (19.1 % duplicates) | 0 |

Since #25 these benchmarks run one file at a time (`fileParallelism: false` on `solu2-nfr` in `vitest.config.ts`). Side by side, `[NFR-IDN-1.*]` measured 52.8–108.2 ms against 50 ms, because it ran next to the benchmarks seeding the marketplace (`30-test-remediation.log` §3).

## 13. Playwright E2E run log and traces (Flow E)

**One command.** `npx playwright test` starts everything through `scripts/e2e-server.mjs`: the Compose Postgres (skipped in CI), a recreated and migrated `tezg_e2e` database, `next build` and `next start` on port 3100 (#10). The latest run (`30-test-remediation.log` §7):

```text
    ✓  1 [chromium] › _bmad-output\test-artifacts\e2e\binder.spec.ts:17:1 › Julián re-sorts his binder, the order survives a reload, and a promo added by an https link lands in a pocket after an http:// link is refused (2.4s)
    ✓  2 [chromium] › _bmad-output\test-artifacts\e2e\inbox.spec.ts:15:1 › Camila reads a conversation, its badge clears, and muting another takes it out of her unread total (1.4s)
    ✓  3 [chromium] › _bmad-output\test-artifacts\e2e\inbox.spec.ts:50:1 › a wrong password keeps Camila on the sign-in page with the es-CO error (1.1s)
    ✓  4 [chromium] › _bmad-output\test-artifacts\e2e\profile.spec.ts:14:1 › a visitor with no session reads Lucía’s rating and reviews, without the review moderation hid (430ms)
    ✓  5 [chromium] › _bmad-output\test-artifacts\e2e\profile.spec.ts:31:1 › an id that is no seller shows the es-CO Not-available page (411ms)
    ✓  6 [chromium] › _bmad-output\test-artifacts\e2e\smoke.spec.ts:7:1 › a visitor opens TEZG and sees the service ready (379ms)
    6 passed (24.0s)
```

Playwright was not rerun after `58aa73e`, because the UI never builds a listing cursor (#26).

**Trace confirmation.** [`playwright.config.ts`](../../playwright.config.ts) sets `trace: 'on-first-retry'`, with `retries` 1 locally and 2 in CI, so a `trace.zip` exists for any test that needed a retry. The CI `e2e` job uploads `playwright-report/` and `test-results/` whether it passes or fails. A green suite writes no trace, so the close made one evidence run with `npx playwright test --trace on`, which overrides the option for that run only (#10, `29-playwright-traces.log`). It committed one trace per test:

| Test | Trace |
|---|---|
| `binder.spec.ts:17` | [`traces/binder-sort-and-add-link.zip`](../test-artifacts/evidence/impl2/traces/binder-sort-and-add-link.zip) |
| `inbox.spec.ts:15` | [`traces/inbox-read-and-mute.zip`](../test-artifacts/evidence/impl2/traces/inbox-read-and-mute.zip) |
| `inbox.spec.ts:50` | [`traces/inbox-wrong-password.zip`](../test-artifacts/evidence/impl2/traces/inbox-wrong-password.zip) |
| `profile.spec.ts:14` | [`traces/profile-reviews-without-hidden.zip`](../test-artifacts/evidence/impl2/traces/profile-reviews-without-hidden.zip) |
| `profile.spec.ts:31` | [`traces/profile-not-a-seller.zip`](../test-artifacts/evidence/impl2/traces/profile-not-a-seller.zip) |
| `smoke.spec.ts:7` | [`traces/smoke-service-ready.zip`](../test-artifacts/evidence/impl2/traces/smoke-service-ready.zip) |

**Traces captured on CI.** The `e2e` job keeps `trace: 'on-first-retry'` for its gating run. After that run passes, a second step runs `npx playwright test --trace on` and uploads one `trace.zip` per journey as the `playwright-traces` artifact, failing if none is written (#29). CI run [41964862300](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41964862300) (`cdb295b`) passed both runs (6 passed (16.8s), then 6 passed (7.7s)). Its six traces are committed under the same names in [`traces-ci/`](../test-artifacts/evidence/impl2/traces-ci/), for example [`traces-ci/binder-sort-and-add-link.zip`](../test-artifacts/evidence/impl2/traces-ci/binder-sort-and-add-link.zip).

Open one with `npx playwright show-trace _bmad-output/test-artifacts/evidence/impl2/traces/<file>.zip` (or `traces-ci/<file>.zip`).

**Page Object Model.** The 4 specs in [`e2e/`](../test-artifacts/e2e/) reach the DOM only through the 7 page objects in `e2e/pages/`:

| Page object | Page | Used by |
|---|---|---|
| `BasePage` | the shared `open()`, the `h1` heading, the `status` live region | every page object |
| `HomePage` | `/` | `smoke.spec.ts` |
| `SignInPage` | `/ingresar`, its locators scoped to the named form | `inbox.spec.ts`, `binder.spec.ts` |
| `InboxPage` | `/mensajes` | `inbox.spec.ts` |
| `BinderPage`, `AddLinkPage` | `/coleccion/<id>`, `/coleccion/<id>/agregar` | `binder.spec.ts` |
| `SellerProfilePage` | `/perfil/<userId>` | `profile.spec.ts` |

Locators are role- and label-based. Each spec seeds its own rows through `e2e/support/` (`binder-seed.ts`, `inbox-seed.ts`, `profile-seed.ts`, `db.ts`), and the journeys run serially on one database (`workers: 1`). Assertions are web-first and retry up to `expect.timeout` (10 s), for example `await expect(profile.reviews).toHaveCount(2)` in `profile.spec.ts`.

**No-sleep gate.** `gate:no-sleep` refuses `page.locator(`, `page.getBy…(`, `page.$(` and `waitForSelector(` in any `*.spec.ts`, and `waitForTimeout` everywhere. Its line in the last gate run (`31-cursor-list-tag.log`):

```text
  no-sleep: 346 files checked, 7 rules proven on planted violations, 0 problems
```

A `git grep` for `waitForTimeout`, `time.sleep`, `pg_sleep` and `sleep(` over `src/`, `app/`, `test-support/`, `scripts/` and the test suites finds only the gate's own planted patterns in `scripts/check-no-sleep.mjs`.

## 14. The test pyramid

From [`test-review.md`](../test-artifacts/test-review.md), "The pyramid (70 / 20 / 10 + NFR)". It counts `it`/`test` blocks, an `it.each` table once. A file is integration when it registers a test database. The counts are at `727c74f`, before the cursor fix added its cases.

| Level | Added by Impl-2 | Share | Whole suite | Share | Target |
|---|---|---|---|---|---|
| Unit | 101 | 59.1 % | 284 | 27.4 % | 70 % |
| Integration | 64 | 37.4 % | 745 | 72.0 % | 20 % |
| E2E | 6 | 3.5 % | 6 | 0.6 % | 10 % |
| NFR (separate layer) | 9 | — | 32 (30 benchmarks, 2 k6 scenarios) | — | separate |
| **Total** | **180** | | **1,067** | | |

Before the remediation, Impl-2's additions were 43.1 / 52.0 / 4.9 %, and the whole suite was 23.9 / 75.5 / 0.6 % (decision log #24). The 48 pure unit tests of #25 moved them; each group of them was broken once on purpose and failed (`30-test-remediation.log` §4).

**Deliberate deviation.** Neither count reaches 70 / 20 / 10, and Mateo chose to document this, not to pad the base (#24). Quoting `test-review.md` § "Deliberate deviation": "The suite is integration-first by design, not by neglect." Test-design §3 explains why: most P0 risks are races, retries and boundaries that only the database can arbitrate, such as conditional updates, partial unique indexes and `FOR UPDATE` order. A unit test over a mock would pass on code that oversells. It is not an ice-cream cone: E2E stays at 6 journeys, and every rule a journey touches is proven below it.

## 15. Quality gate, trace and CI

- **Final trace.** [`traceability-matrix.md`](../test-artifacts/traceability-matrix.md) is generated by `scripts/gen-solu2-trace.mjs` and maps PRD requirement → story (status) → test files → CI evidence → verdict (#5, #24). Its gate decision is **PASS**: FRs 96 / 96, NFRs 56 / 56 (55 PASS, 1 WAIVED: NFR-SYS-11, WCAG, to the launch checklist), P0 risks 23 / 23, P1 7 / 7, P2 1 / 1, §14 AD rows 61 / 61, stories 71 / 71 `done`, test ids enforced green 419 / 419, and 0 unmapped requirements (`28-final-trace.log`). The check line in the last run: "trace: 96 FRs, 56 NFRs, 61 AD rows, 31 risks, 114 clauses, 419 test ids (419 enforced green), 4 journeys, 1 k6 scripts; gate PASS; 0 problems" (`31-cursor-list-tag.log`).
- **Test review.** 100 / 100 (A, Approve), 0 findings, after the remediation of the first review's 59 / 100 (#24, #25). Every Vitest project passes shuffled with seeds 1, 2, 3, 42 and 1234 (`30-test-remediation.log` §2).
- **The last full gate** (`31-cursor-list-tag.log`, `npm run test:ci` exit 0): 729 unit and integration tests, 97.49 % branches, `solu2-atdd` "373 green for done stories … 0 not as expected", `solu2-nfr` "30 green … 0 not as expected", and lint with 0 warnings.
- **CI.** [`.github/workflows/impl2-quality-gate.yml`](../../.github/workflows/impl2-quality-gate.yml) runs on every push to `main` or `impl-*` and on every pull request. Its jobs are `gate` (`npm run test:ci`), `e2e` (`npx playwright test`, uploading the report and traces) and `nfr-k6` (`npm run nfr:k6`, uploading the summary). A fourth job, `release`, prints `Quality gate: PASS` only when all three succeeded, and fails otherwise. The branch was pushed at the close (#27), and `32-ci-run.log` holds the three runs:
  - **Run 1** ([41901553179](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41901553179)): `Quality gate: FAIL`. The red gate caught `[S-FR-MSG-7.C1]` with `sorry, too many clients already`: the CI Postgres ran at the default 100 connections, against the 200 of `docker-compose.yml`. The `gate` and `nfr-k6` jobs now set 200 (#28).
  - **Run 2** ([41922563597](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41922563597)): `Quality gate: PASS`, but a green run records no trace, so the forensic trace step was added (#29).
  - **Run 3** ([41964862300](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41964862300)): `gate=success e2e=success nfr-k6=success`, `Quality gate: PASS`. The run had 729 unit tests (97.49 % branches), the trace gate PASS, `solu2-atdd` 373 green, `solu2-nfr` 30 green, Playwright 6 passed twice, and k6 profile p95 8.29 ms, p99 15.33 ms, browse p95 24.02 ms, 0.00 % errors and 0 dropped iterations. Six `trace.zip` files were uploaded.

## 16. AI governance: corrections of AI testing mistakes

The [decision log](../decision-logs/impl-2-ai-decision-log.md) has 30 entries. Its index of tagged proposals lists `[CORRECTED]` at #7, #8, #9 and twice at #23. The corrections of AI testing mistakes:

| # | The AI's mistake | How it was caught | The correction | Decided by |
|---|---|---|---|---|
| [#9](../decision-logs/impl-2-ai-decision-log.md) | An Impl-1 AI test of `contact.ts` ended with `if (m.truncationSteps.includes('collapsedItems')) expect(…)`. Its input never collapses, so the line never asserted anything: the Blindly Green trap | The Flow C gap analysis, while covering the `collapsedItems` branch | The conditional became two unconditional assertions, and the collapse got its own forced test | Mateo (menu) |
| [#23](../decision-logs/impl-2-ai-decision-log.md) (Story 2.6) | The AI recorded in `deferred-work.md` that a production sign-up "fails as NotImplemented (500), never silently". It had never tested that claim | The fresh-context review, then a new test: with the guard disabled it got **200**, because Better Auth swallowed the email error and committed an account that could never be verified | `[S-FR-IDN-7.signup.unwired]`, and sign-up refused before any write while mail is unwired | Mateo (menu) |
| [#8](../decision-logs/impl-2-ai-decision-log.md) | The Impl-1 suite, written by the BMad AI agents in the Impl-1 stories (Mateo confirmed the authorship, #27), proved lock waits by sleeping 200 ms, widened a race with `pg_sleep(0.05)`, and copied a timer watchdog into seven files (Impl-1 test review MEDIUM-1 to MEDIUM-3): the Flaky Sleeper trap | The Impl-1 test review and the Flow C scan | `untilBlockedOnLock`, the `race` barrier, `single-connection.ts` and `gate:no-sleep`; the mutation check in §2.2 shows the old test would have passed with no lock | Mateo (menu) |
| [#25](../decision-logs/impl-2-ai-decision-log.md) | The benchmarks ran side by side, so the order Vitest picked decided whether `[NFR-IDN-1.*]` passed | A shuffled run of every project | `fileParallelism: false` on `solu2-nfr`, confirmed by Mateo over the cheaper `maxWorkers: 2` | Mateo (menu) |

The agent also caught some of its own mistakes. They are recorded but not counted as human corrections: the first `[S-FR-REP-7.C1]` could not fail (#21); `[S-SYS.jobs.C1]` was red for the wrong reason (#11); a claim that every new unit test runs under 10 ms was false for 3 of 48 (#25); and two vacuous red-phase cases in the cursor fix (#26).

## 17. Known limits

Every open item has an owner in [`deferred-work.md`](deferred-work.md), in the sections "Deferred from: Story 1.6" to "Deferred from: the test-review remediation". In short:

- **Launch checklist.** The `jobs-tick.yml` schedule, `JOBS_SECRET` in production, a mail provider (until then sign-up is refused) with Better Auth's own limiter back on (F7), NFR-SYS-11 (WCAG), and reconcile's restart from the first account at large volume.
- **UI phase.** The full pages behind the three slices (composer, filters, sort direction, wishlist page, moderation pages 11.3–11.4 with the merged-log cursors, F6), and a typed es-CO formatter for instants and money (F5).
- **CI owner.** The serial benchmarks take about 15 minutes of the gate instead of 5.

## 18. How to reproduce

```bash
npm ci && npm test                         # Compose Postgres, then the full gate (about 15 minutes)
npx playwright test                        # the 6 journeys against a production build
npx playwright test --trace on             # the same, writing a trace.zip per test into test-results/
npm run nfr:k6                             # k6 in Docker against the seeded production build
npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/sys_jobs.test.ts   # one story's bound tests
```

All of them need Docker and nothing in `.env`: the tests compose their own configuration, and Playwright and k6 pass local `JOBS_SECRET`, `BETTER_AUTH_SECRET` and `IP_HMAC_KEY` values to the server they start. [`docs/impl-2/README.md`](../../docs/impl-2/README.md) has the full command list.
