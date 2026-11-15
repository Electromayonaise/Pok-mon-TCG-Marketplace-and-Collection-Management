---
title: 'Story 4.1: Start and continue a catalog feed run'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'd552afa'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `startFeedRun`, `continueFeedRun` and `listFeedRuns` throw `NotImplementedError`, so the 5 bound tests are red. No admin can load the catalog, and every module that reads it has nothing to read.

**Approach:** AD-CAT-1 as written:
- `start` fails the abandoned run, then inserts a `Running` row. The partial unique index is the lock.
- `continue` claims a lease with a fresh token and runs batches of 500 rows. Each batch is one transaction that renews the lease first.
- Each valid row goes through `upsertCatalogEntry`, the CAT-2 step of Story 4.2. `[CAT-2.ingress.h]` needs it, so this commit builds the upsert, and Story 4.2's tests go green early until 4.2 is committed (decision #23).
- Wire `catalog.feed.start`, `catalog.feed.continue` and `catalog.feed.runs` (decision #24).

## Boundaries & Constraints

**Always:**
- **Start (CAT-1):**
  - One transaction, one clock read.
  - Q2.1: `UPDATE … SET status='Failed', "endedAt"=now, "updatedAt"=now, "leaseUntil"=NULL, "leaseToken"=NULL WHERE status='Running' AND COALESCE("leaseUntil","startedAt") < now − 24 h RETURNING id`. The boundary is strict: at exactly 24 h the run still blocks.
  - Q2.2: the insert runs under a savepoint. A 23505 on `feed_run_single_running` rolls back to it, re-reads the live run and raises `FeedRunInProgress` (409), citing `{runId, startedAt}` under `AD-CAT-1 rule 1`. The whole transaction then rolls back, so neither a run nor an audit row is left.
  - Q3: one `catalog.feedRun.failedAbandoned` audit row per failed run, and one `catalog.feedRun.started` row (`actorKind: 'admin'`). No event.
  - Q4: the decision is `allowed`, under a new stored-only §13 code `FeedRunStarted`, citing `AD-CAT-1 rule 1` with `{runId}`.
- **Continue (CAT-2.ingress):**
  - **Claim (rule 2):** `UPDATE … SET "leaseUntil"=now+90 s, "leaseToken"=:t WHERE id AND status='Running' AND ("leaseUntil" IS NULL OR "leaseUntil" < now)`, with `:t` a fresh cuid. On 0 rows it re-reads the run:
    - a run that is no longer `Running` returns `{done: true, status, cursor}`;
    - a live lease raises `FeedRunInProgress`, citing the run;
    - an unknown `runId` raises `RequestValidationFailed` on `runId`, through the kernel helper `rejectRequest` (the decision #27 pattern; no catalog code names an unknown run).
  - **Batches (rule 3):** each batch of 500 is one transaction with one clock read:
    1. it renews the lease under the token check. 0 rows means another caller took the run: the batch rolls back and `continue` returns `{done: false, cursor}`;
    2. it reads the rows from `cursor`;
    3. each row is checked by the pure `validateRow` (ADD-§8.1 rules 1–5), using the set codes in `"CatalogSet"` and the TRM covering the row's date. An invalid row is quarantined (`ON CONFLICT ("runId","rowNumber") DO NOTHING`);
    4. a valid row goes through `upsertCatalogEntry` on the same `tx`. A priced row also inserts one observation (`ON CONFLICT DO NOTHING`): a COP price is `sourceNative`; a USD-only price is converted once with `copFromUsd` (ADD-§2.1) and is `fxDerived`; with no TRM on or before its date it is skipped and counted in `deferredNoFx` (AD-CAT-2 rules 1–2);
    5. it advances `cursor` and the counters, and writes one `catalog.feedBatch.applied` audit row with the counts.
  - **End:** the last batch sets `Completed`, `endedAt` and clears the lease.
  - **Time budget (rule 4):** no new batch starts after 50 s, measured with the `Clock`. When `continue` stops before the end, it clears its own lease (under the token check), so the console's next call can claim the run at once.
  - **Source failure (rule 7):** an error from the feed source sets `Failed` and `endedAt` under the token check, writes one `catalog.feedRun.failed` audit row, and returns `{done: true, status: 'Failed'}`.
- **Runs (CAT-1.runs):** ordered by `("startedAt" DESC, id DESC)`, 25 per page, behind an opaque keyset cursor. The first page and the next pages use two statements, never `OR $1 IS NULL` (Story 1.5 deferral). A cursor the list did not issue raises `RequestValidationFailed`. Zero writes.
- The admin check is the router's `adminProcedure` (contracts.md §3 CAT-1 P1). `catalog` imports no module (AD-1).
- Wire the three procedures, with HTTP cases: non-admin 403, admin 200.
- **Production feed source:** no production `CatalogFeedSource` exists (OQ-9 names a fixture). `compose()` binds `UNWIRED_FEED`, which fails as NotImplemented, and `deferred-work.md` records the gap, as Story 3.1 did for storage.

**Ask First:** a retry on a serialization failure; any DTO or bound-test change; a new DomainError code.

**Never:** a second `Running` row; a `SELECT … FOR UPDATE` before the start's insert (the index is the lock); a lease without its token check; a per-row audit row.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No live run | admin starts | one `Running` row at now, cursor 0, one audit row | N/A |
| Run abandoned 25 h ago | admin starts | old run `Failed`, new run `Running` | N/A |
| Run live 23 h ago | admin starts | nothing written | `FeedRunInProgress` 409 `{runId, startedAt}` |
| 50 concurrent starts | — | exactly one `Running` row | 49 × `FeedRunInProgress` |
| Continue over a 1-row file | run `Running`, no lease | `{done: true, status: 'Completed', cursor: 1}`, one entry | N/A |
| Continue on a held lease | lease until now + 60 s | — | `FeedRunInProgress` 409 |
| Continue on a finished run | `Completed` | `{done: true, status: 'Completed'}` | N/A |
| Continue on an unknown run | `ghost` | — | `RequestValidationFailed` 400 on `runId` |
| Feed source down | `fault = 'down'` | run `Failed`, `endedAt = now` | N/A |
| List runs | two runs | newest first, with counters | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/catalog/domain/cat.ts` -- `validateRow`, `diffAttributes`, `numberSort`, `copFromUsd`, the runs cursor
- `src/modules/catalog/ports/cat.v2.ts` -- `CatRepository`: run, lease, batch, set, quarantine and observation methods
- `src/modules/catalog/infra/pg.ts` -- `PgCatRepository`
- `src/modules/catalog/application/cat.v2.ts` -- `startFeedRun`, `continueFeedRun`, `listFeedRuns`, `upsertCatalogEntry`
- `test-support/solu2/fixtures.ts` -- `wiring()` binds `PgCatRepository`
- `src/server/composition.ts` + `.test.ts` -- wiring, `UNWIRED_FEED`
- `_bmad-output/planning-artifacts/detailed-design/contracts.md` §13 -- `FeedRunStarted`
- `_bmad-output/test-artifacts/atdd/cat_contracts.test.ts` -- `[CAT-1.Q1]`, `[CAT-1.Q2]`, `[CAT-1.I1]`, `[CAT-2.ingress.h]`, `[CAT-1.runs.h]`

## Tasks & Acceptance

**Execution:**
- [x] `contracts.md` §13 -- `FeedRunStarted` (stored only), regenerate -- decision #16
- [x] domain -- `validateRow` (rules 1–5), `numberSort`, `copFromUsd`; unit tests with the ADD-§2.1 test vector
- [x] ports + infra -- `PgCatRepository`; `wiring()` binds it
- [x] `application/cat.v2.ts` -- start, continue, runs; unit tests for the lease loss, the 50 s budget and a source failure
- [x] `composition.ts` + test -- the three procedures, with HTTP cases
- [x] `deferred-work.md` -- the production feed source

**Acceptance Criteria:**
- Given the 5 bound tests, when the CAT ATDD file runs, then they pass, and `[CAT-1.I1]` leaves exactly one `Running` row.
- Given a batch whose lease renewal finds another token, when it runs, then none of its rows is written.
- Given this story `done`, when the red gate runs, then the only unexpected greens are those of Stories 4.2 and 4.3, the next two commits (decision #23).

## Verification

**Commands:**
- `npm run lint` -- expected: 0 errors
- `npm run test:unit` -- expected: all pass
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/cat_contracts.test.ts` -- expected: the 5 bound tests pass

## Implementation Notes

- Code review is batched with the rest of Epic 4 at its close (decision #22).
- The start is `PgCatRepository.failAbandonedRuns`, then `insertRunningRun`, whose insert runs under a savepoint. A 23505 on `feed_run_single_running` re-reads the live run with `readRunningRun` and raises `FeedRunInProgress`. Under READ COMMITTED, the unique check waits for the conflicting transaction to commit, so the re-read always finds the winner.
- The continue reads the feed source outside any transaction, then opens the batch transaction, whose first statement is `renewLease`:
  - one clock read per batch;
  - set codes and TRMs are read once per batch (the TRMs cached per Bogotá date);
  - `advanceRun` completes the run and clears the lease on the last batch, under the token check.
- `validateRow` receives the TRM through a synchronous lookup, and the batch loads it first, so the domain stays pure. A row whose `observedAt` is no instant is quarantined as `InvalidPrice`. Without a TRM, a two-currency row cannot be checked against rule 5 and is kept as source-native.
- The observation `source` is the feed's `sourceName` from `openRun()`. A USD-only price with no TRM on or before its Bogotá date is counted in `deferredNoFx`, and its entry is still upserted.
- An unknown `runId` raises `RequestValidationFailed` on `runId` (`rejectRequest`), as approved with the specs.
- `wiring()` and `compose()` bind `PgCatRepository` on the one repository object (R-14). `compose()` binds `UNWIRED_FEED` and `UNWIRED_FX`, and `deferred-work.md` records both.
- Unit tests:
  - `src/modules/catalog/cat-domain.test.ts`: the ADD-§8.1 refusals, the ADD-§2.1 vector, `numberSort`, `bogotaDate`, `diffAttributes` and the runs cursor;
  - `src/modules/catalog/application/cat.v2.test.ts`: a lease lost between batches, the 50 s budget, a source failure, an unknown or finished run, the batch's quarantine and price rules, and runs paging;
  - three HTTP cases in `src/server/composition.test.ts`.
- Early greens until Stories 4.2 and 4.3 are committed: `[CAT-2.Q1]`, `[CAT-2.Q2]`, `[CAT-2.I1]`, `[CAT-2.I3]`/`[CAT-2.MEC]` (the upsert, built here because the continue runs it), `[CAT-1.QF1]`, `[CAT-2.ingress.f]` and `[CAT-2.QF1]`.

### Review Findings

Epic 4 close review (2026-10-27, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `d552afa..3cd2cff` (code paths). Totals for the epic: 2 decisions, 18 patches, 3 deferrals, 14 dismissed.

- [x] [Review][Decision] A feed `name` over 200 characters has no fitting reason code. The schema's `char_length(name) BETWEEN 1 AND 200` CHECK refuses the insert, but `"QuarantinedFeedRow"."reasonCode"` allows only the ADD-§8.2 kinds plus `KindChanged`. Quarantine it under an existing code, or add a new one through a new migration. **Resolved (decision #29):** `MissingRequiredField`, with no schema change; applied with the stall patch below.
- [x] [Review][Patch] A row the database refuses stalls the run for 24 h. A name over 200 characters (23514), or a number whose digit run overflows `"numberSort" INT` (22003), rolls back the whole batch, and every later `continue` replays it. `validateRow` must quarantine both [src/modules/catalog/domain/cat.ts:69]
- [x] [Review][Patch] Releasing the lease sets `leaseUntil` to NULL, so `COALESCE("leaseUntil","startedAt")` falls back to `startedAt`. A run started more than 24 h ago that is still being continued is then failed as abandoned by the next start. The release must leave an expired lease (`now − 1 ms`) that records the last activity [src/modules/catalog/infra/pg.ts:152]
- [x] [Review][Patch] The bare `catch` around the feed source swallows `NotImplementedError`. In production, with `UNWIRED_FEED`, every continue reports a 200 `Failed` instead of failing as NotImplemented, and the cause is never recorded. Rethrow NotImplemented, and record the error's `code` in the `catalog.feedRun.failed` audit row [src/modules/catalog/application/cat.v2.ts:164]
- [x] [Review][Patch] A source that answers `{rows: [], done: false}` spins for 50 s, committing an empty batch and an audit row on each turn. Stop, hand the lease back, and return `done: false` [src/modules/catalog/application/cat.v2.ts:169]
- [x] [Review][Patch] A continue refused on a held lease cites `AD-CAT-1 rule 1`; the continue refusal is rule 2 [src/modules/catalog/application/cat.v2.ts:107]
- [x] [Review][Patch] `observedAt` accepts loose strings that `Date.parse` reads in the server's time zone, and instants in the future. Require ISO 8601 with an offset and `≤ now`, else `InvalidPrice` [src/modules/catalog/domain/cat.ts:95]
- [x] [Review][Patch] Feed text values are not trimmed, so `"sv1-025 "` and `"sv1-025"` become two entries, and `" SV1"` is quarantined as `UnknownSet` [src/modules/catalog/domain/cat.ts:56]
- [x] [Review][Patch] A lease lost between batches answers `status: 'Running'` even when the run was failed meanwhile. Re-read the run's status [src/modules/catalog/application/cat.v2.ts:183]

Review notes: the 50 s budget and the empty-batch stop now leave the lease expired at `now − 1 ms` instead of clearing it (Boundaries said "clears its own lease"). The next claim still succeeds at once, and the 24 h rule measures the last activity. A source error is recorded as `data.cause` (its `code`, else `SourceError`). A missing adapter (`NotImplementedError`) propagates and leaves the run `Running` until its lease expires.
