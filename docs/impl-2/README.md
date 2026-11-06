# Impl-2: Advanced implementation, testing alternatives and hardening (2026-11-03 – 11-04)

**Goal.** Finish the backlog with its hardest stories, and pair each one with the testing flow that fits its risk: ATDD-first, test-along, test-after, the NFR quality gate (k6 and concurrency hammers) and Playwright E2E with Page Objects and traces. Then close with a traced, automated PASS/FAIL gate. The BMad Full Ceremony applies, with TEA (Murat). Pair work; Mateo Rubio takes the decisions the log records (decision log Impl-2 #1).

## What was done

- **Scope.** The 7 stories Impl-1 reserved (8.5, 8.6, 9.6, 11.5, 11.6, 13.5, 13.6) and two new ones for the items Impl-1 handed over: 1.6, the jobs route, and 2.6, sign-up, sign-in and the throttle (#1, #7). The backlog grew from 69 to 71 stories, and all 71 are `done`, in 13 epics.
- **Flows.** Flow A (ATDD-first) for 1.6, 2.6, 8.5, 9.6, 11.6, 13.5 and 13.6, with the red run committed before any code; Flow B (test-along) for 8.6 and 11.5; Flow C (test-after) to harden the Impl-1 tests; Flow D (k6 and concurrency hammers) for 8.5, 9.6, 11.5 and 13.5; Flow E (Playwright) for 9.6, 11.5 and 13.5. The plan is [`test-design.md`](../../_bmad-output/test-artifacts/test-design.md) §7.
- **Shift-left (Phase A).** Before any story: Flow C removed every sleep from the suite and enforced 90 % branch coverage per domain file (#8, #9). Playwright, a three-page UI slice and the Impl-2 CI gate came next (#2, #10).
- **Stories (Phase B).** One story subagent per story, with a spec menu per epic (#11–#22).
- **Close (Phase C).** A fresh-context code review of all of Impl-2 (#23). The final trace, `traceability-matrix.md`, has gate decision **PASS** (#24). The test review went from 59 / 100 to 100 / 100 after a remediation (#24, #25). A cursor defect was fixed under Flow A (#26). Then the walkthrough and this README (#27), and the branch's CI runs on GitHub Actions: the first failed on a connection limit and was fixed (#28), and the third passed with the traces captured on CI (#29, #30).

## Deliverable map (task statement §5)

The task statement is a course document and is kept outside the repository, like Impl-1's (decision log Impl-2, header). Every deliverable is in `_bmad-output/`, where the repository keeps each BMAD artifact once ([`docs/README.md`](../README.md)).

| §5 | Deliverable | Path | Status |
|---|---|---|---|
| 1 | Hardened source code: the Impl-1 stories plus the complex stories | `src/`, `app/`, `scripts/`, `test-support/`; the 9 Impl-2 stories are in [`walkthrough-impl2.md`](../../_bmad-output/implementation-artifacts/walkthrough-impl2.md) §4–§10 | 71 / 71 stories `done`; all 108 tRPC procedures and 4 job routes wired |
| 2 | Multi-flow test suite: ≥ 90 % branch coverage on the domain; ≥ 1 Flow A story with red logs; ≥ 1 Flow D story with a k6 script; ≥ 1 Flow E workflow with Page Objects and no sleeps | `src/**/*.test.ts`, `app/**/*.test.ts`, [`_bmad-output/test-artifacts/`](../../_bmad-output/test-artifacts/) (`atdd/`, `nfr/`, `nfr/k6/`, `e2e/`, `fitness/`) | 97.49 % branches, at least 90 % in every domain file (`evidence/impl2/31-cursor-list-tag.log`); 7 Flow A stories (walkthrough §11); k6 PASS (walkthrough §12); 6 journeys over 7 page objects (walkthrough §13) |
| 3 | `sprint-status.yaml` | [`_bmad-output/implementation-artifacts/sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml) | 71 stories and 13 epics `done` |
| 4 | `traceability-matrix.md` (`bmad-testarch-trace`): requirement → story → test files → CI evidence → verdict | [`_bmad-output/test-artifacts/traceability-matrix.md`](../../_bmad-output/test-artifacts/traceability-matrix.md) | Gate **PASS**: 96 / 96 FRs, 56 / 56 NFRs (1 waived to launch), 31 / 31 risks, 419 / 419 test ids green, 0 unmapped |
| 5 | `walkthrough-impl2.md` | [`_bmad-output/implementation-artifacts/walkthrough-impl2.md`](../../_bmad-output/implementation-artifacts/walkthrough-impl2.md) | Hardening summary, all 9 stories, red-phase evidence, k6 table, Playwright log and traces, pyramid, AI corrections |
| 6 | AI decision log: ≥ 8 interactions, ≥ 2 corrections of AI testing mistakes | [`_bmad-output/decision-logs/impl-2-ai-decision-log.md`](../../_bmad-output/decision-logs/impl-2-ai-decision-log.md) (asked for as `ai-decision-log.md`; the repository keeps one log per task, named after it) | 30 entries; corrections of AI tests #8 and #9, plus #23 and #25 (all in walkthrough §16; #8, #9 and #23 tagged `[CORRECTED]`) |
| 7 | All BMad-related files: specs, planning and solutioning | [`_bmad-output/`](../../_bmad-output/README.md), `_bmad/` (the BMM and TEA configuration) | Present; the table "Artifacts" below lists what Impl-2 changed |

## Student checklist (task statement §5, DoR)

- [x] **Unified execution.** `npm test` (`npm run db:up` and then `npm run test:ci`) exited 0 in the last full run: 729 unit and integration tests, 373 ATDD tests, 30 NFR benchmarks and 12 fitness tests, with "0 not as expected" in both red gates (`evidence/impl2/31-cursor-list-tag.log`). `npx playwright test` reported "6 passed (24.0s)" (`evidence/impl2/30-test-remediation.log` §7).
- [x] **ATDD evidence.** Six red logs, each committed before its story's code, with the failure lines and the gate's "red for the right reason" count (walkthrough §11): `10-story-1.6-red.log`, `12-story-2.6-red.log`, `14-story-8.5-red.log`, `17-story-9.6-red.log`, `20-story-11.6-red.log`, `23-story-13.5-13.6-red.log`; also `31-cursor-list-tag.log` §1.
- [x] **Zero flaky sleeps.** `npm run gate:no-sleep`: "346 files checked, 7 rules proven on planted violations, 0 problems" (`31-cursor-list-tag.log`). A `git grep` for `waitForTimeout`, `time.sleep`, `pg_sleep` and `sleep(` over the code and tests finds only the gate's own planted patterns. Lock waits use `test-support/locks.ts`; races use `test-support/concurrency.ts`.
- [x] **Concurrency defense.** Eight concurrency and drift proofs on real PostgreSQL connections, among them 50 deductions racing reconcile, 50 stale-tab `markRead` calls, 100 rounds of profile reads racing hides, 20 concurrent hides and 20 concurrent job runs, with 0 double effects (walkthrough §2.3).
- [x] **NFR load proof.** `npm run nfr:k6`: 12,002 measured requests at 100 per second per endpoint, profile p95 38.3 ms (budget 300 ms) and p99 113.7 ms (800 ms), browse p95 39.4 ms (1,000 ms), 0.00 % errors and 0 5xx (`evidence/impl2/24-k6.log`, `k6-summary.json`).
- [x] **Page Object Model.** The 4 specs use only the 7 page objects in `_bmad-output/test-artifacts/e2e/pages/`; `gate:no-sleep` refuses any locator built in a spec. The fresh-context review confirmed it (#23).
- [x] **Traceability signed off.** `traceability-matrix.md` §1: "**PASS.** … 0 requirements are unmapped" (`evidence/impl2/28-final-trace.log`).
- [x] **AI governance.** The decision log records each prompt, the AI output, the menu and Mateo's decision, and every agent default the agent applied without asking (30 entries).

## Rubric mapping (task statement §6)

| Criterion | Weight | What answers it | Evidence |
|---|---|---|---|
| 1. Architecture, hardening and concurrency | 20 % | Ports and adapters kept in every module (`gate:purity` 0 problems); advisory-lock single-flight jobs; `FOR SHARE` / `FOR UPDATE` / `REPEATABLE READ` / conditional-update defenses, each hammered; idempotent hides and read marks; graceful degradation: failed runs stay visible, reconcile is bounded at 50 s, sign-up is refused rather than half-done, the scheduler is optional | Walkthrough §2; `src/shared-kernel/jobs.ts`, `src/shared-kernel/infra/pg-jobs.ts`, `src/server/auth-routes.ts`; decision log #11–#13, #21, #23 |
| 2. Functional delivery of the complex stories | 25 % | 9 stories `done`, each with its bound tests green and its ADs upheld (§14 AD rows 62 / 62 PASS) | Walkthrough §4–§10; the 9 story files in `_bmad-output/implementation-artifacts/`; `traceability-matrix.md` §7 |
| 3. Testing alternatives and flows | 25 % | All five flows: A with gate-enforced red runs, B, C (Flow C hardening), D (k6 and hammers, thresholds met), E (POM, web-first assertions, no timeouts) | Walkthrough §2.2, §3, §11–§13; `test-design.md` §7; `scripts/check-atdd-red.mjs`, `scripts/check-no-sleep.mjs` |
| 4. Traceability, quality gate and CI/CD | 15 % | Generated matrix with a computed PASS; a CI workflow whose `release` job passes only when `gate`, `e2e` and `nfr-k6` pass; single commands `npm test`, `npx playwright test`, `npm run nfr:k6` | `traceability-matrix.md`; `.github/workflows/impl2-quality-gate.yml`; CI run [41964862300](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41964862300) `Quality gate: PASS` (`evidence/impl2/32-ci-run.log`); this README, "How to run everything" |
| 5. Code craft, forensic traces and AI governance | 15 % | TypeScript 7 with no emit and lint at 0 warnings; test review 100 / 100; one `trace.zip` per journey captured on CI (the `playwright-traces` artifact of run 41964862300, committed in `traces-ci/`) and locally; decision log with human corrections of AI tests | `test-review.md`; `evidence/impl2/traces-ci/`, `32-ci-run.log`, `evidence/impl2/traces/`, `29-playwright-traces.log`; walkthrough §16; decision log #8, #9, #23, #25 |

## Artifacts: where each one is and what changed

Each artifact is overwritten in place; nothing is duplicated (#5). The table covers every `_bmad-output/` path that `git diff --name-status a7c5d81 impl-2 -- _bmad-output` reports, plus this close's files. The decision log entry is the one that records the change.

| Artifact | Path | What changed in Impl-2 | Commits · decision log |
|---|---|---|---|
| Impl-2 AI decision log | [`decision-logs/impl-2-ai-decision-log.md`](../../_bmad-output/decision-logs/impl-2-ai-decision-log.md) | New: 30 entries and an index of tagged proposals | `fbf6dfe` … this close |
| Sprint status | [`implementation-artifacts/sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml) | Impl-2 header (`impl2_scope`, `impl2_flows`); rows for 1.6 and 2.6; every story and epic `done` | `fbf6dfe`, then each red and green commit up to `23d0157` · #1, #7 |
| Story files (9 new) | `implementation-artifacts/1-6-…`, `2-6-…`, `8-5-…`, `8-6-…`, `9-6-…`, `11-5-…`, `11-6-…`, `13-5-…`, `13-6-….md` | One per Impl-2 story: intent, code map, tasks, red and green evidence | each story's red and green commits · #11–#21 |
| Deferred work | [`implementation-artifacts/deferred-work.md`](../../_bmad-output/implementation-artifacts/deferred-work.md) | Resolved items struck through and cited; new sections from Story 1.6 to the test-review remediation | 13 commits, `7ac39a2` … `58aa73e` |
| Walkthrough, Impl-1 | [`implementation-artifacts/walkthrough-impl1.md`](../../_bmad-output/implementation-artifacts/walkthrough-impl1.md) | Header only: the two superseded Impl-1 reports and how to read them | `ff6b103` · #24 |
| Walkthrough, Impl-2 | [`implementation-artifacts/walkthrough-impl2.md`](../../_bmad-output/implementation-artifacts/walkthrough-impl2.md) | New (statement §5 item 5) | this close · #5 |
| Contracts | [`planning-artifacts/detailed-design/contracts.md`](../../_bmad-output/planning-artifacts/detailed-design/contracts.md) | New clauses `S-SYS.jobs`, `S-SYS.sweep` and the Story 2.6 clauses of S-FR-IDN-7; COM-3's concurrency and 50 s bound; the new red tests cited where their clause lives; stored-only §13 rows (`Reconciliation*`, `Conversation*`, `CollectionEntry*`, `Listing*`) | 12 commits, `86aaa8e` … `cd50fa1` · #11, #13, #15, #17, #18, #23 |
| Ports and adapters | [`planning-artifacts/detailed-design/ports-and-adapters.md`](../../_bmad-output/planning-artifacts/detailed-design/ports-and-adapters.md) | The rows of the deleted dead stubs `turnVerdict` and `sendEligibility` | `2da2c11`, `711ff4b` · #8, #19 |
| Schemas | [`planning-artifacts/detailed-design/schemas/`](../../_bmad-output/planning-artifacts/detailed-design/schemas/) `operations.json`, `openapi.yaml`, `dto.ts` | `jobs/outbox-sweep` (the fourth job procedure); `S-FR-IDN-6.kinds` for INV; the `@pattern` dropped from the external-link URLs; `GetProfileResponse.seller` | `86aaa8e`, `7162354`, `a440983`, `23d0157` · #11, #17, #20, #21 |
| Backlog | [`planning-artifacts/epics.md`](../../_bmad-output/planning-artifacts/epics.md) and `epics.source.mjs` | 69 → 71 stories (1.6, 2.6); each new red test bound to its story; regenerated by `npm run gen:epics:solu2` | 11 commits, `86aaa8e` … `276c280` · #6, #7 |
| UX page 7.4 | [`planning-artifacts/ux/C-UX-Scenarios/07-com-commission-balance/7.4-rate-settings-reconciliation/7.4-rate-settings-reconciliation.md`](../../_bmad-output/planning-artifacts/ux/C-UX-Scenarios/07-com-commission-balance/7.4-rate-settings-reconciliation/7.4-rate-settings-reconciliation.md) | The Editing row: a later start corrects a mistaken future rate | `2a6ad10` · #16 |
| Test design | [`test-artifacts/test-design.md`](../../_bmad-output/test-artifacts/test-design.md) | New §7 (flows, planned risks, levels, thresholds, the four traps); risks R-21..R-31 in §2 | `fbf6dfe`, then each red commit, `c84225a`, `ff6b103` · #6, #22, #24 |
| Traceability matrix (final trace) | [`test-artifacts/traceability-matrix.md`](../../_bmad-output/test-artifacts/traceability-matrix.md) | Regenerated as the Impl-2 final trace with a computed gate decision (PASS); the generator `scripts/gen-solu2-trace.mjs` changed with it | 16 commits; the final format in `ff6b103` · #5, #24 |
| Impl-1 final trace | removed: `test-artifacts/impl1-final-trace.md` | Superseded by `traceability-matrix.md`. Read it with `git show 31999bc:_bmad-output/test-artifacts/impl1-final-trace.md`; restore it with `git checkout 31999bc -- _bmad-output/test-artifacts/impl1-final-trace.md` | removed in `ff6b103` · #5 |
| Test review | [`test-artifacts/test-review.md`](../../_bmad-output/test-artifacts/test-review.md) | Renamed from `impl1-test-review.md` and overwritten: first the Impl-2 review (59 / 100), then the re-review (100 / 100) with the pyramid and the "Deliberate deviation". Git records the rename as a delete and an add. Impl-1 version: `git show 31999bc:_bmad-output/test-artifacts/impl1-test-review.md`; first Impl-2 version: `git show 478e3c6:_bmad-output/test-artifacts/test-review.md` | `478e3c6`, `727c74f` · #5, #24, #25 |
| NFR evidence | [`test-artifacts/nfr-evidence.md`](../../_bmad-output/test-artifacts/nfr-evidence.md) | NFR-COM-2, NFR-COL-2, NFR-COL-3, NFR-REP-2 and NFR-IDN-1 rows green; the k6 table | `30e2654`, `90db9da`, `7162354`, `23d0157`, `c84225a`, `ff6b103` · #14, #20–#22, #24 |
| ATDD suite | [`test-artifacts/atdd/`](../../_bmad-output/test-artifacts/atdd/) | New: `sys_jobs`, `idn_auth`, `com_reconcile`, `msg_inbox`, `col_links`, `rep_reads` (split out); red tests added to `inv_supporting` and `rep_contracts`; `sys_contracts` hardened; three unused variables removed from `cat_contracts`, `com_supporting`, `inv_contracts`, `ver_supporting` | the red commits; `2da2c11`; `276c280` · #6, #8, #25 |
| NFR suite and k6 | [`test-artifacts/nfr/`](../../_bmad-output/test-artifacts/nfr/), [`nfr/k6/`](../../_bmad-output/test-artifacts/nfr/k6/) | New: `com2_drift`, `col2_latency`, `idn1_latency`, `k6/reputation-profile.js`, `k6/seed.k6.ts`; `[NFR-REP-2.profile]` added to `rep2_latency` | `bccc1f3`, `7162354`, `23d0157`, `c84225a`, `ff6b103` · #13, #17, #18, #21, #22, #24 |
| Playwright journeys | [`test-artifacts/e2e/`](../../_bmad-output/test-artifacts/e2e/) | New: 4 specs, 7 page objects in `pages/`, seed helpers in `support/` | `c3996a5`, `90db9da`, `7162354`, `23d0157` · #2, #10, #15, #17, #18 |
| Fitness suite | [`test-artifacts/fitness/sys_fitness.test.ts`](../../_bmad-output/test-artifacts/fitness/sys_fitness.test.ts) | The ingress count 113 → 114 (4 job endpoints) | `86aaa8e` · #11 |
| CI mirror | [`test-artifacts/ci/quality-gate.yml`](../../_bmad-output/test-artifacts/ci/quality-gate.yml) | Its comment names `impl2-quality-gate` (it must stay byte-identical to `.github/workflows/solu2-quality-gate.yml`) | `c3996a5` · #10 |
| Run evidence | [`test-artifacts/evidence/impl2/`](../../_bmad-output/test-artifacts/evidence/impl2/) | New: logs `00`–`32` (`32-ci-run.log`: the three GitHub Actions runs), `k6-summary.json`, `traces/` (6 local `trace.zip`), `traces-ci/` (6 `trace.zip` captured on CI run 41964862300) | from `fbf6dfe` to this close · #27–#30 |
| BMAD output index | [`_bmad-output/README.md`](../../_bmad-output/README.md) | `test-artifacts/` row (the final trace, `test-review.md`, `e2e/`, `evidence/`); this close adds `walkthrough-impl2.md`, `nfr/k6/` and `evidence/impl2/` | `ff6b103`, this close |
| Project context | [`_bmad-output/project-context.md`](../../_bmad-output/project-context.md) | This close: the Impl-2 testing rules (no sleeps, Page Objects only, web-first assertions, lock waits on a condition, serial benchmarks) | this close · #8, #10, #25 |

Outside `_bmad-output/`, Impl-2 changed: the code (`src/`, `app/` with the new pages), `test-support/` (`locks.ts`, `single-connection.ts`, `http-app.ts`, `suites/`), `scripts/` (`check-no-sleep.mjs`, `e2e-server.mjs`, `nfr-k6.mjs`, `gen-solu2-trace.mjs`, `check-deps.mjs`), `playwright.config.ts`, `vitest.config.ts`, `package.json`, `.env.example`, `docker-compose.yml`, the workflows, [`docs/impl-1/README.md`](../impl-1/README.md) (the renamed and removed reports), and the root [`README.md`](../../README.md). `.github/workflows/impl1-quality-gate.yml` became `impl2-quality-gate.yml` (`c3996a5`); read the old one with `git show a7c5d81:.github/workflows/impl1-quality-gate.yml`.

## How to run everything

You need Node.js 22 (`.nvmrc`) and Docker. Docker runs the PostgreSQL 16 the tests use (`npm run db:up`, Compose, `127.0.0.1:55432`) and the k6 image (`grafana/k6:1.4.2`, pulled on the first `npm run nfr:k6`).

```bash
npm ci
npm test               # db:up, then test:ci: lint, gate:deps, gate:no-sleep, gate:prisma, test:unit (coverage), gate:impl1
npx playwright test    # starts Postgres, recreates tezg_e2e, builds and serves the app on :3100, runs the 6 journeys
npm run nfr:k6         # seeds tezg_k6, serves the build on :3200, runs k6 in Docker; exits with k6's code
```

| Command | What it does | Run time in the evidence |
|---|---|---|
| `npm test` | `npm run db:up`, then `npm run test:ci` | about 15 min (`30-test-remediation.log` §6: 15.5 min) |
| `npm run test:ci` | The same without `db:up`, for a running Postgres. `gate:impl1` runs typecheck, the lint-rule tests, the Solu-2 contract, UI, code, id, trace and epics gates, `gate:purity`, the fitness suite and both red gates. CI's `gate` job runs it | the same |
| `npm run test:unit` | The colocated tests with V8 coverage, failing below 90 % branches in any `src/modules/*/domain/**` file | 29.6 s inside `test:ci` (`test-review.md`, Test File Analysis) |
| `npm run gate:no-sleep` | The no-sleep and no-locator-in-spec gate | — |
| `npx playwright test` | The E2E journeys; `--trace on` writes a `trace.zip` per test into `test-results/` | "6 passed (24.0s)", plus the production build (`30-test-remediation.log` §7) |
| `npm run nfr:k6` | The k6 load run; it overwrites `evidence/impl2/k6-summary.json` | 60 s per scenario (both run together), plus the seed and the build (`24-k6.log`) |
| `npm run gen:trace:solu2` / `gate:trace:solu2` | Regenerates / checks `traceability-matrix.md` | — |

**Environment.**

- **The tests need no `.env`.** Vitest builds its own configuration. Playwright (`playwright.config.ts`) and `nfr:k6` (`scripts/nfr-k6.mjs`) pass local values of `JOBS_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `IP_HMAC_KEY` to the server they start, unless the shell already sets them. The database is reached through `TEZG_PG_HOST`, `TEZG_PG_PORT`, `TEZG_PG_USER`, `TEZG_PG_PASSWORD`, `TEZG_PG_DB`, or `E2E_DATABASE_URL` and `K6_DATABASE_URL` for the two runners. `E2E_PORT` moves the E2E server, and `E2E_SKIP_BUILD=1` reuses an existing build.
- **`npm run dev` and production need `JOBS_SECRET`.** `src/shared-kernel/config.ts:12` refuses to start without it, and it must be at least 32 bytes. `cp .env.example .env` gives a local value, and `docker-compose.yml` sets its own. A scheduler calls a job with the same value:

  ```bash
  curl -X POST -H "Authorization: Bearer $JOBS_SECRET" "http://localhost:3000/api/jobs/outbox-sweep?trigger=tick"
  ```

  A missing or wrong bearer gets 401 `NotAuthenticated`, and no `JobRun` row is written (`[S-SYS.jobs.auth]`).
- **Port 55432 on Windows** can be reserved by WinNAT; the root [`README.md`](../../README.md) has the two fixes.

## CI workflow and the release gate

[`.github/workflows/impl2-quality-gate.yml`](../../.github/workflows/impl2-quality-gate.yml) runs on every push to `main` and `impl-*` and on every pull request. `gate`, `e2e` and `nfr-k6` each get PostgreSQL 16.6 as a service container on port 55432.

| Job | Command | Uploads | Timeout |
|---|---|---|---|
| `gate` | sets Postgres `max_connections` to 200, as `docker-compose.yml` (#28); `npm run test:ci`, then `cmp` of the Solu-2 workflow and its mirror | `.coverage/` | 30 min |
| `e2e` | `npx playwright install --with-deps chromium`, then `npx playwright test` (`retries: 2`, `trace: 'on-first-retry'`) | `playwright-report/`, `test-results/` (retry traces), pass or fail; then `npx playwright test --trace on` uploads `playwright-traces`, one `trace.zip` per journey (#29) | 30 min |
| `nfr-k6` | `npm run nfr:k6` | `k6-summary.json`, pass or fail | 30 min |
| `release` | needs all three; prints `Quality gate: PASS` only when all three succeeded, otherwise `Quality gate: FAIL` and exit 1 | — | — |

[`.github/workflows/jobs-tick.yml`](../../.github/workflows/jobs-tick.yml) is the job scheduler. It runs by hand (`workflow_dispatch`, trigger `tick`, `daily-morning` or `daily-night`), and its hourly `schedule:` stays commented until a deployment exists (#11). `solu2-quality-gate.yml` stays as manual Solu-2 evidence.

The branch was pushed at the close (#27). The runs are in [`32-ci-run.log`](../../_bmad-output/test-artifacts/evidence/impl2/32-ci-run.log):

| Run | Commit | Result | What it showed |
|---|---|---|---|
| [41901553179](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41901553179) | `ef77c50` | `Quality gate: FAIL` | The red gate caught `[S-FR-MSG-7.C1]` failing with `too many clients` at CI's default 100 connections (#28) |
| [41922563597](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41922563597) | `5bc619f` | `Quality gate: PASS` | A green run records no trace under `on-first-retry` (#29) |
| [41964862300](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41964862300) | `cdb295b` | `Quality gate: PASS` | Every job green; 6 `trace.zip` in the `playwright-traces` artifact, committed in `evidence/impl2/traces-ci/` |

## Commits

Impl-2 has 37 commits on `impl-2` from `fbf6dfe` to `09b7380`, all on 2026-11-03 and 11-04, plus this close's documentation commits. The branch starts at `a7c5d81`, the merge of PR #12 on `main`. List them with:

```bash
git log --reverse --format='%h %ad %s' --date=short main..impl-2
```

| Phase | Commits |
|---|---|
| 0. Scope and test design | `fbf6dfe` |
| A. Shift-left: Flow C, the framework and CI | `2da2c11` (Flow C: no sleeps, lock waits, 90 % per domain file), `c3996a5` (Playwright, the app shell, the Impl-2 CI gate) |
| B. Epic 1 and 2: Stories 1.6 and 2.6 | `86aaa8e` red → `7ac39a2` green; `eacd9f0` red → `0c463f9` green |
| B. Epic 8: Stories 8.5 and 8.6 | `bccc1f3` red → `30e2654` green, `ddcf7f8` (log #14), `b011de3` (coverage output untracked), `ecd8ca6` (8.6, Flow B), `2a6ad10` (log #15–#16, page 7.4) |
| B. Epic 9: Story 9.6 | `0291b05` red → `90db9da` green, `711ff4b` (dead stub removed, log #17–#19) |
| B. Epic 11: Stories 11.5 and 11.6 | `7c78cb1` red → `7162354` green, `a440983` (`InvalidExternalLink` over HTTP) |
| B. Epic 13: Stories 13.5 and 13.6 | `f8f2b62` red → `23d0157` green, `cebbbd7` (log #20–#21), `c84225a` (k6 at a fixed rate), `85dbad8` (log #22) |
| C. Code review | `cd50fa1` (patches F1–F5), `e0f0bcb` (log #23) |
| C. Final trace and test review | `ff6b103` (the final trace), `478e3c6` (the test review), `d777941` (trace evidence), `5f445dc` (log #24) |
| C. Test-review remediation | `276c280` (independent tests, split files), `2501bf6` (pure unit tests), `727c74f` (re-review), `f1f1351` (log #25) |
| C. Cursor list tag | `dc47a0d` red → `58aa73e` green, `09b7380` (log #26) |
| C. Documentation and CI | `3f2632d` (walkthrough), `787a0e1` (this README), `ef77c50` (log #27), `5bc619f` (CI Postgres at 200, log #28), `cdb295b` (CI traces, log #29), and this close: `walkthrough-impl2.md`, this README, `docs/README.md`, the root `README.md`, `_bmad-output/README.md`, `project-context.md` |

## Known deferrals

[`deferred-work.md`](../../_bmad-output/implementation-artifacts/deferred-work.md) holds every open item with its owner, in its sections from "Deferred from: Story 1.6 (2026-11-03)" to "Deferred from: the test-review remediation (2026-11-04)". The main ones:

- **Launch checklist.** Uncomment the `jobs-tick.yml` schedule and set `JOBS_SECRET` and `TEZG_URL` in production. Choose a mail provider: until then sign-up is refused, and Better Auth's own limiter is off on the unguarded routes (F7). NFR-SYS-11 (WCAG 2.2 AA): axe-core's automated WCAG 2.x A and AA rules pass at every state the Playwright journeys reach (decision log Impl-2 #33), and the manual audit (screen reader, keyboard walk-through, contrast of dynamic states) waits for launch. Reconcile restarts from the first account after a 50 s partial run.
- **UI phase.** The three pages are thin slices. The full inbox, binder, wishlist, profile writing, the rate page 7.4 and the moderation pages 11.3–11.4 (with one cursor per merged log, F6) are open, and so is a typed es-CO formatter for instants and money (F5).
- **CI owner.** The NFR benchmarks run one file at a time, about 15 minutes of the gate instead of 5 (#25).
- **Pyramid.** The remaining gap to 70 / 20 / 10 is the deliberate deviation of `test-review.md`.
