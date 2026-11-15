---
title: 'Story 1.6: Run scheduled jobs single-flight behind JOBS_SECRET'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: 'c3996a5'
review_loop_iteration: 0
flow: 'Impl-2 Flow A, ATDD-first (test-design.md §7.1): red tests committed before any route code; one code review per epic batch (decision log Impl-2 #4)'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Impl-1 left the jobs route unbuilt (`deferred-work.md`, Stories 4.1, 4.4, 7.5, 8.5; Impl-1 #39 R4). The registry names `jobs/trm-fetch`, `jobs/expiry-materialize` and `jobs/commission-reconcile`, but they answer 404, so no expiry, TRM retry or reconciliation runs on a schedule, and nothing triggers the outbox sweeper (NFR-SYS-6) in production.

**Approach:** one route, `POST /api/jobs/<job>?trigger=…`, served by `src/server/jobs.ts` and reached through `compose().jobs`. Decisions approved by Mateo (decision log Impl-2 #11):
- **D1** a fourth registry procedure, `jobs/outbox-sweep` (op `S-SYS.sweep`, `AdminEventsServiceV2.sweep`), with `openapi.yaml` regenerated;
- **D2** `.github/workflows/jobs-tick.yml` runnable by hand (`workflow_dispatch`), with its `schedule:` commented until a deployment exists.

## Boundaries & Constraints

**Always:** the bearer is compared in constant time and refused before any write (S-9); every run writes exactly one `JobRun` row with the Clock's instants (ARCH §4); single-flight under `pg_try_advisory_xact_lock(hashtextextended('job:<name>', 0))`, held on its own connection for the run (AD-SYS-4 rule 7), except `commission-reconcile`, which single-flights inside COM-3 (P2); a failure body is `Unexpected` with no message. **Ask First:** a change of the trigger set, or of a job's work. **Never:** a job reachable without the secret; a second lock taken by the route for `commission-reconcile`.

</frozen-after-approval>

## Code Map

- `src/server/jobs.ts` -- the route: bearer, job and trigger parsing, the runner, the JSON answer
- `src/shared-kernel/jobs.ts` + `src/shared-kernel/infra/pg-jobs.ts` -- the JobRun rows and the single-flight lock (shared-kernel owns `JobRun`, AD-SYS-2 rule 10)
- `src/shared-kernel/admin-events.ts` -- `AdminEventsServiceV2.sweep` (S-SYS.sweep)
- `src/server/composition.ts` -- `jobsSecret`, the four job handlers, `jobs(req)`
- `app/api/jobs/[job]/route.ts` -- the Next.js route; `src/shared-kernel/config.ts` -- `JOBS_SECRET`
- `_bmad-output/test-artifacts/atdd/sys_jobs.test.ts` -- the 7 bound tests (red first)

## Tasks & Acceptance

**Execution:**
- [x] red: the 7 bound tests, the `S-SYS.jobs` and `S-SYS.sweep` clauses, the registry row, the DTOs, the stubs; R-21 in `test-design.md` §2; red run in `evidence/impl2/10-story-1.6-red.log`
- [x] green: the route, the runner and its adapter, `sweep`, the composition, `JOBS_SECRET`, the Next.js route, the hand-run workflow
- [x] `npm run test:ci` green with 1.6 `done`

**Acceptance Criteria:**
- Given a request without the right bearer, when it reaches any job, then 401 `NotAuthenticated` and no `JobRun` row.
- Given a held `job:expiry-materialize`, when the route runs it, then a `skipped` no-op with its row; given 20 concurrent runs, then the due order releases its unit exactly once.
- Given the tick, when `trm-fetch` and `outbox-sweep` run, then each leaves one `succeeded` row and does its work once.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/sys_jobs.test.ts` -- expected: 7 passed
- `npm run test:ci` -- expected: exit 0

**Red phase (Flow A):** `evidence/impl2/10-story-1.6-red.log`: 7 failed on `NotImplemented: jobs.serveJob`; `gate:atdd-red:impl1`: 35 red for the right reason, 0 not as expected. The first capture showed `[S-SYS.jobs.C1]` failing "for another reason": its assertion on the list of rejected runs hid the `NotImplementedError`. The test now rethrows the first rejection.

**Green phase:** `evidence/impl2/11-story-1.6-green.log`. The first full gate failed `[S-SYS.jobs.h]` and `[S-SYS.jobs.single]`: both asserted the order of two runs started at the same frozen virtual instant, so `ORDER BY "startedAt", id` fell back to random cuid order. They had passed the first time by chance. Each test now advances the Clock 1 ms between its two runs; a 5× burn-in of the file passed.

## Implementation Notes

- **Runner** (`src/shared-kernel/jobs.ts`): the `running` row is committed before the work starts, so a run that dies mid-way stays visible; the lock is `PgJobLocks.tryHold`, a transaction of its own on a checked-out connection, because the work's own transactions run beside it (expiry runs one per order). A run whose lock is held writes one row, already `skipped`.
- **Bearer:** `IdentityGateV2.requireJobBearer` hashes both sides with SHA-256 and compares them with `timingSafeEqual`, so the comparison is constant-time whatever the lengths; identity raises `NotAuthenticated`, as it owns the code (AD-11). An empty secret matches nothing.
- **Triggers per job** (ARCH §13): `trm-fetch` on `tick` and `daily-morning` (`FetchTrmRequest` has no `daily-night`), `commission-reconcile` on `daily-night` only, the other two on all three. A refused trigger writes no row.
- **Bodies:** a failed run is 500 `Unexpected` and its log line carries only the error code; the 404 for an unknown job never echoes the path (no free text in a template, Impl-1 #11).
- **Deferred** (`deferred-work.md`): the `schedule:` of `jobs-tick.yml` and `JOBS_SECRET` in production (launch checklist); the catalog feed's `daily-night` run and `retention-purge`, which have no registry procedure.
