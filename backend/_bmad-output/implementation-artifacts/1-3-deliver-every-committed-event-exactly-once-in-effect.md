---
baseline_commit: a0fc7fb
---

# Story 1.3: Deliver every committed event exactly once in effect

Status: done

<!-- Epic entry: _bmad-output/planning-artifacts/epics.md, "Story 1.3" (line 389). Ceremony: 853449c:docs/impl-1/task-statement.md §3. Pace: decision log #13. -->

## Story

As a subscribing module,
I want every committed event delivered to me exactly once in effect, even across crashes,
so that commission, listings and collections never miss or double an effect (NFR-SYS-6).

- **Kind:** Skeleton. Contract `S-SYS.replay` (`replayEventDelivery`).
- **Depends on:** Story 1.2 (`done`, commit `a0fc7fb`).
- **Traceability:** FR: none (cross-cutting). NFR-SYS-6. Risk R-14 (P0). UI 2.3.
- **Binding invariants:**
  - **AD-9:** the payload is exactly the ADD-§5 snapshot, and subscribers read only the payload.
  - **AD-10:** post-commit, in-process dispatch backed by the outbox (`outbox.enqueue(tx)` plus the sweeper).
  - **AD-SYS-2, as refined by R-1 and R-17:** the transactional outbox. There are at most 3 automatic attempts (the rule 4 attempt procedure). Replay follows rule 7 and ARCH §7.3. The dispatcher takes `{ transactions, clock }`, and each handler receives `(tx, envelope)`.

## Acceptance Criteria

**AC1 (happy, sweep).**
- *Given* a committed `CommissionBalanceExhausted` with one `pending` delivery to `listings`, and the process died before dispatch,
- *when* the sweeper runs 61 s later,
- *then* the `listings` handler runs once with the R-1 envelope `{ eventId, type, occurredAt, schemaVersion: 1, payload }` and the delivery is `delivered` with `attempts = 1`.
- A second sweep attempts nothing.

**AC2 (failure, exhausted and not replayable).**
- *Given* a `pending` delivery that already counted 3 unrecorded attempts,
- *when* the sweeper reaches it,
- *then* it becomes `failed`:
  - `lastErrorCode = 'DeliveryAttemptsExhausted'`;
  - `firstFailedAt` and `lastFailedAt` are the `Clock`'s instant;
  - `attempts` stays 3;
  - its handler never runs.
- *Given* a delivery that is still `pending`, *when* an admin replays it, *then* the call fails with `EventDeliveryNotReplayable` (409) and nothing is written: no delivery change and no `EventReplayLog` row.

**AC3 (a failing handler records its code, never its message).** A handler that throws a `DomainError` leaves the delivery `failed` with `lastErrorCode` set to that code. A handler that throws any other error leaves it `failed` with `'Unexpected'`. Its effects roll back. A `failed` delivery is never retried automatically.

**AC4 (replay).**
- Replaying a `failed` delivery runs the handler in the claim transaction.
- On success:
  - the delivery is `delivered`;
  - `attempts` does not change, because it counts automatic attempts only and `EventReplayLog` counts replays (decision #17);
  - `lastAttemptAt` is the claim instant;
  - `firstFailedAt` does not change;
  - exactly one `EventReplayLog` row `{ adminId, eventId, subscriber, outcome: 'delivered' }` is written, in the same transaction.
- On a throw:
  - the handler's effects roll back;
  - a separate transaction records `lastErrorCode`, `lastAttemptAt` and `lastFailedAt`, and the delivery stays `failed`;
  - one `outcome: 'failed'` log row is written.
- If a concurrent replay holds the row, the call is a no-op: it returns `{ status: 'failed', replayed: false }` and writes one `outcome: 'noop'` row.
- The response carries a `decision` that passes `explainAssert`, with citation `AD-SYS-2` and inputs `{ eventId, subscriber, status }`.

**AC5 (bound tests).** These 8 tests pass:

| Test file | Tests |
|---|---|
| `_bmad-output/test-artifacts/atdd/sys_contracts.test.ts` | `[SYS-2.R4]`, `[SYS-2.R4.code]`, `[SYS-2.R6]`, `[SYS-2.R6.young]`, `[S-SYS.replay.h]`, `[S-SYS.replay.f]` |
| `_bmad-output/test-artifacts/fitness/sys_fitness.test.ts` | `[SYS-AD9]` (already green; it must stay green) |
| `_bmad-output/test-artifacts/nfr/outbox_crash_sweep.test.ts` | `[NFR-SYS-6.sweep]` (750 deliveries; every one is delivered, and each handler runs exactly once) |

**AC6 (red gates).** With this story `done` in `_bmad-output/implementation-artifacts/sprint-status.yaml`:
- `npm run gate:atdd-red:impl1` passes. The other two `S-SYS` tests (`getTickHealth`, `listDeliveries`/`getDeliveryHealth`) belong to Story 1.5 and stay red for `NotImplemented`.
- `npm run gate:nfr-red:impl1` passes. 2 of the 3 NFR tests are now green.

**AC7 (shared DoD).**
- `explainAssert` holds on every body.
- `gate:purity`, typecheck, lint and `gate:api:solu2` are clean.
- Every instant comes from `Clock`, passed as a parameter. No SQL `now()` appears.
- The story file records the commands run and their output.

## Tasks / Subtasks

Order: shared-kernel, then infra, then the service, then the tests. Write each task's code only against a failing test, either a bound ATDD test or a new colocated `src/**/*.test.ts` in `impl1-unit`.

- [x] **Task 1: generated service files become hand-owned outside a marked block (decision #14)**
  - [x] 1.1 Change `scripts/gen-solu2-api.mjs` so the application file (and, for SYS, the combined file `admin-events.ts`) keeps the generated parts between the `// <gen-solu2-api>` and `// </gen-solu2-api>` markers: the imports, the `<Service>V2UseCases` interface and the `<Service>V2Deps` interface. Use the same mechanism as the `index.ts` block.
    - The generator writes the `Repository` interface and the service class only when the file does not exist. After that they are hand-owned.
    - For non-SYS modules, the same applies to `ports/<file>.v2.ts`: the repository interface is hand-owned.
  - [x] 1.2 Run the generator once to convert the 13 files to the marked layout with no semantic change. `gate:api:solu2` and typecheck must stay green. `--check` must still fail when a marked block drifts from `operations.json`; prove this once by hand and record it in the Debug Log.
- [x] **Task 2: `PgOutboxV2` (AD-SYS-2 rule 1)** in `src/shared-kernel/infra/pg-outbox.ts` (new)
  - [x] 2.1 Red test `pg-outbox.test.ts`: an enqueue inside a transaction that commits gives one `OutboxEvent` row and one `pending` delivery per `EVENT_SUBSCRIBERS[type]`, with `createdAt` from the `Clock` and `id` from the `IdGenerator`. A rolled-back transaction leaves neither. `TradeAccepted` (no subscribers) writes the event only.
  - [x] 2.2 Mirror `SqlOutboxV2` (`test-support/simulated/index.ts`) without importing `test-support/`. Write `redact(payload)` (the canary egress noted in Story 1.2) and return the R-1 envelope.
- [x] **Task 3: the attempt procedure, `dispatch` and `sweep` (rules 3–6; AC1–AC3)** in `src/shared-kernel/dispatcher.ts`
  - [x] 3.1 See `[SYS-2.R6]`, `[SYS-2.R6.young]`, `[SYS-2.R4]` and `[SYS-2.R4.code]` red for `NotImplemented`.
  - [x] 3.2 Implement a private `attempt(eventId, subscriber)` that follows rule 4 to the letter (see Dev Notes, "Attempt procedure").
  - [x] 3.3 `dispatch(eventIds)`: one attempt per `pending` delivery of those events, returning `{ delivered, failed }`.
  - [x] 3.4 `sweep()`: select `status = 'pending' AND "createdAt" < :cutoff ORDER BY "createdAt" LIMIT 50`, with `cutoff = clock − 60 s`. Attempt each, returning `{ attempted, delivered, failed }`. An exhausted row counts as attempted and failed.
  - [x] 3.5 Run `[NFR-SYS-6.sweep]` alone. It needs at most `ceil(750/50) + 1` sweeps.
- [x] **Task 4: `replay` (rule 7, ARCH §7.3 as corrected by decision #17; AC2, AC4; decision #15)**
  - [x] 4.1 Red unit tests in `src/shared-kernel/dispatcher.test.ts`:
    - a failed replay keeps the row `failed`, and `firstFailedAt` does not change;
    - a held row (a second connection holds `FOR UPDATE` on it) is a no-op;
    - delivered and missing rows throw `EventDeliveryNotReplayable` with `status` = `delivered` / `none`.
  - [x] 4.2 Implement `replay(eventId, subscriber, record)`. `record(tx, outcome)` runs in the transaction that settles the outcome.
- [x] **Task 5: `AdminEventsServiceV2.replayEventDelivery` and `PgAdminEventsRepository` (AC4, AC5)**
  - [x] 5.1 `[S-SYS.replay.h]` and `[S-SYS.replay.f]` red.
  - [x] 5.2 Add `insertReplayLog(tx, row)` to `AdminEventsRepository` and implement it in `src/shared-kernel/infra/pg-admin-events.ts` (new). Bind it in `wiring().repo` (`test-support/solu2/fixtures.ts`).
  - [x] 5.3 The service calls `dispatcher.replay` with a `record` callback that writes the log row (`id` from `ids`, `createdAt` from `clock`). It returns `{ status, replayed, decision }`.
    - A delivered replay cites the stored-only row `EventDeliveryReplayed`, with outcome `allowed`.
    - A no-op cites `EventDeliveryReplayInProgress`, also with outcome `allowed`.
    - A failed replay returns outcome `rejected` with the handler's code.
    - Both new rows go into contracts.md §13 and the generator (decision #16).
- [x] **Task 6: DoD**
  - [x] 6.1 Add decisions #13–#18 to `_bmad-output/decision-logs/impl-1-ai-decision-log.md` (index and entries). The review triage added #19–#21.
  - [x] 6.2 Set the story to `done` in sprint-status, run `npm test` once, and record the output.

## Dev Notes

### Current state of the files this story changes

- **`src/shared-kernel/dispatcher.ts`:** the `SubscriberName`, `DeliveryHandler`, `DispatcherV2` and `DispatcherV2Deps { transactions, clock }` types, and the stub `OutboxDispatcherV2(deps, handlers)`. No test calls `replay` directly, so its third parameter can change, from `adminId` to `record`.
- **`src/shared-kernel/admin-events.ts`:** generated. It declares `AdminEventsRepository {}` and `AdminEventsV2Deps { repo, transactions, clock, ids, outbox, audit, dispatcher }`, plus 4 stub methods. Only `replayEventDelivery` is this story's; the other three are Story 1.5's. **Do not edit it until Task 1 lands**, or `gate:api:solu2` fails.
- **`test-support/solu2/fixtures.ts` `wiring()`:** `repo: {}`. The ATDD test builds `new AdminEventsServiceV2({ ...w, dispatcher })`. When the repository port gains a method, `{}` stops typechecking, so `wiring().repo` must carry the Pg repository.
- **`001_tezg_schema.sql` (lines 36–85):**
  - The `EventDelivery` CHECKs: `delivered` ⇔ `deliveredAt`; a `failed` row has `firstFailedAt`, `lastFailedAt` and `lastErrorCode`; `status = 'failed' OR attempts <= 3`.
  - `updatedAt` is NOT NULL, so every update sets it.
  - `EventReplayLog.outcome` is one of `delivered`, `failed` or `noop`.
  - `OutboxEvent` and `EventReplayLog` are append-only (grants).

### Attempt procedure (AD-SYS-2 rule 4, written out)

Every instant is `now = clock.now()`, passed as a parameter.

1. **Count the attempt.** A short committed transaction runs:
   `UPDATE "EventDelivery" SET attempts = attempts + 1, "lastAttemptAt" = $now, "updatedAt" = $now WHERE pk AND status = 'pending' AND attempts < 3`.
   If it updates 0 rows and the row is still `pending` with `attempts = 3`, a conditional update sets:
   - `status = 'failed'`;
   - `"firstFailedAt" = COALESCE("firstFailedAt", $now)`;
   - `"lastFailedAt" = $now`;
   - `"lastErrorCode" = 'DeliveryAttemptsExhausted'`.

   The attempt then stops. Any other 0-row case also stops.
2. **Run the handler.** In a second transaction:
   - `SELECT … WHERE pk AND status = 'pending' FOR UPDATE SKIP LOCKED`. No row means stop: another worker holds it.
   - Otherwise load the envelope from `OutboxEvent` and run `handlers[subscriber](tx, envelope)`.
   - Set `status = 'delivered'` and `"deliveredAt" = $now`.
3. **On a throw.** The handler transaction rolls back. A separate transaction sets:
   - `status = 'failed'`;
   - `"firstFailedAt"` through `COALESCE`;
   - `"lastFailedAt" = $now`;
   - `"lastErrorCode"` = the `DomainError` code, or `'Unexpected'`. Never the message.

The envelope is `{ eventId: id, type, occurredAt: createdAt (ISO), schemaVersion, payload }`. `occurredAt` must equal `T0` in `[SYS-2.R6]`; pg returns a `timestamptz` as a `Date`, so call `.toISOString()` on it.

### Replay (rule 7, ARCH §7.3)

- **Claim:** `SELECT … WHERE pk AND status = 'failed' FOR UPDATE SKIP LOCKED`. The handler runs in that claim transaction.
- **Success:** set `delivered` (`attempts` unchanged, decision #17), `"lastAttemptAt" = $now`, `"deliveredAt"` and `"updatedAt"`, then call `record(tx, 'delivered')`.
- **Throw:** the claim transaction rolls back. A separate transaction runs a conditional update `WHERE status = 'failed'`: `lastErrorCode`, `"lastAttemptAt" = $now`, `"lastFailedAt" = $now`, and `firstFailedAt` untouched. It then calls `record(tx, 'failed')`.
- **Nothing claimed:** a plain read decides.
  - The row is still `failed`, so a concurrent replay holds it: a no-op. Call `record(tx, 'noop')` in its own transaction and return `{ status: 'failed', replayed: false }`.
  - Otherwise raise `EventDeliveryNotReplayable` through `raiserFor('shared-kernel')`, with citation `{ rule: 'AD-SYS-2', inputs: { eventId, subscriber, status } }`, where `status` is the row's status or `'none'`. Nothing is written.
- **Contract conflict, resolved by decision #17: `attempts` counts automatic attempts only, and a replay leaves it unchanged.** ARCH §7.3 says a successful replay sets `attempts + 1`. The schema CHECK `event_delivery_attempts_cap` (`status = 'failed' OR attempts <= 3`) rejects a `delivered` row with `attempts = 4`, and exhausted deliveries (`attempts = 3`) are the main thing an admin replays. Its own comment reads "at most 3 automatic attempts are ever counted". The bound tests start at `attempts = 1`, so they do not catch it. Task 4.1 adds a unit test for replaying a delivery that failed at `attempts = 3`.

### Guardrails

- **No wall clock in `src/`** (`[SYS-6.R1]`). The scanner flags `Date.now(`, `new Date()`, `now()` and `CURRENT_TIMESTAMP` anywhere in the text, comments included. `clock.now()` is allowed.
- **Transaction discipline (AD-SYS-4).** The handler and its delivery update share one transaction. Failure bookkeeping always runs in a separate transaction that commits after the rollback.
- **AD-8.** The delivery tables are shared-kernel's. The dispatcher (a shared-kernel adapter) writes them directly. The service touches `EventReplayLog` only through `repo` (R-14).
- **Dependency gate.** Add no package.

### Testing standards

- ATDD, fitness and NFR tests are fixed Solu-2 contracts. Edit one only if it is provably wrong, and log a decision first.
- The NFR test (750 deliveries, timeout 300 s) runs alone while iterating. Run the targeted tests during development and the full `npm test` once, after triage (decision #13).

### Previous story intelligence (1.2)

- Follow the `PgAuditLog` pattern: ids and clock from the ports, `redact`, and writes through the caller's `tx`.
- Decision #11 applies: placeholders hold an id, an instant, a number, a field or an enum, and `status` is in the enum whitelist (`messages.test.ts`). `explainAssert` forbids PascalCase in `humanMessage`.

### Cross-story notes

- **1.5** (`getTickHealth`, `listDeliveries`, `getDeliveryHealth`) adds its reads to `AdminEventsRepository` and the same Pg repository.
- **Every module story** adds its repository methods outside the generated block (Task 1). It merges its Pg repository into `wiring().repo` with distinct method names.
- **The tRPC resolver of `admin.events.replay`** and the post-commit `dispatch` call in the request adapter (rule 5) are not wired here:
  - admin gating (`requireAdmin`) is Epic 2's;
  - no publisher exists yet.

  Owners, by first use (decision #21, also an Epic 1 gate item):
  - the first story that publishes an event wires the post-commit `dispatch()` with `PgOutboxV2` into the composition root, and catches a failed delivery per row so the batch and the committed request survive it (review N2);
  - the first story that creates a `/api/jobs/*` endpoint (Story 4.4, `trm-fetch`) wires `sweep()` into it and into the hourly tick.
- **Shared `wiring().repo`** (review L3): when two modules' repository ports gain methods, prefer one repository per service in `wiring()`, or a merge that rejects duplicate method names. Object spread drops prototype methods. Raised for the Epic 1 gate.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3], §"Definition of Done (every story)"
- [Source: _bmad-output/planning-artifacts/ARCHITECTURE.md: AD-9, AD-10, AD-SYS-2 rules 1–7; _bmad-output/planning-artifacts/ARCHITECTURE-v2-delta.md: R-1, R-14, R-17, §7.3]
- [Source: _bmad-output/planning-artifacts/detailed-design/schemas/001_tezg_schema.sql, lines 36–85]
- [Source: _bmad-output/planning-artifacts/detailed-design/contracts.md §13: the `EventDeliveryNotReplayable` and `DeliveryAttemptsExhausted` rows]
- [Source: _bmad-output/test-artifacts/atdd/sys_contracts.test.ts, lines 25–56 (helpers); _bmad-output/test-artifacts/nfr/outbox_crash_sweep.test.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), through `bmad-dev-story` in Claude Code.

### Debug Log References

- **Task 1, drift proof (1.2):** after the conversion, `npx tsc --noEmit` is clean and `gen-solu2-api.mjs --check` reports the surface current. Changing the `writeReview` signature inside the marked block of `rep.v2.ts` made `--check` exit 1, naming `rep.v2.ts`. Appending a line after the block kept it at exit 0. Both edits were reverted.
- **Task 2, red then green:** `pg-outbox.test.ts` failed on the missing module, then passed 4/4. A first draft used an invalid `OrderClosed` payload cast with `as never`; it now builds a real `OrderClosedV1`.
- **Task 3, red then green:** `[SYS-2.R4]`, `[SYS-2.R4.code]`, `[SYS-2.R6]` and `[SYS-2.R6.young]` failed for `NotImplemented`, then passed. `[NFR-SYS-6.sweep]` run alone: 1 passed in 3.6 s.
- **Task 4, red then green:** `dispatcher.test.ts` failed 7/7 for `NotImplemented`, then passed 7/7. A first draft inserted `OutboxEvent` without `createdAt` (NOT NULL); the fixture now passes `'created'`.
- **Task 5, red then green:** `[S-SYS.replay.h]` and `[S-SYS.replay.f]` failed for `NotImplemented`, and so did the 3 new `admin-events.test.ts` tests (one per outcome, each asserting `explainAssert` and the log row). All 5 then passed.
- **Task 5, a defect in a fixed Solu-2 helper:** `[SYS-AD8]` then failed with `src/shared-kernel/dispatcher.ts: writes unknown table SKIP` (twice). `sqlWrites` read the row lock `FOR UPDATE SKIP LOCKED` as an `UPDATE` of `SKIP`. Martín chose to fix the helper and add a probe assertion (decision log Impl-1 **#18**, `[CORRECTED]`). The new assertion failed first (`["SKIP"]`), then the fitness suite passed 12/12.
- **Still red, for the right reason:** `[S-SYS.tick.h]`, `[S-SYS.deliveries.h]` and `[S-SYS.health.h]` (Story 1.5); `[SYS-4.R9]` fails on `identity.getSellerVerification`.
- **Lint:** 0 errors; the same 3 warnings as the baseline, all in untouched Solu-2 files.
- **Tooling slips:** two Bash heredocs failed in this Windows shell (unmatched quote), and one silently did nothing; the files were written with Write/Edit instead.

### Completion Notes List

- **AC1–AC3.** `OutboxDispatcherV2` follows AD-SYS-2 rule 4 step by step:
  - the counting transaction commits first, or an exhausted row becomes `failed` with `DeliveryAttemptsExhausted` and its handler never runs;
  - the handler transaction claims the row with `FOR UPDATE SKIP LOCKED` and commits the handler's effects with `delivered`;
  - a throw records `lastErrorCode` (a `DomainError` code, else `'Unexpected'`) in a separate transaction.
  - `dispatch` attempts the pending deliveries of the given events. `sweep` attempts pending rows older than `clock − 60 s`, oldest first, at most 50.
- **AC2, AC4.** `replay(eventId, subscriber, record)`:
  - it runs the handler in the claim transaction and leaves `attempts` unchanged (#17);
  - `record(tx, outcome)` runs in the transaction that settles the outcome (#15), so a failing log write rolls the delivered outcome back;
  - a row another replay holds is a no-op; any state but `failed` raises `EventDeliveryNotReplayable` with `status` cited, and nothing is recorded.
  - `ReplayResult` also carries `errorCode` when a replay ran and threw, so the service can explain it.
- **AC4.** `replayEventDelivery` writes the log row through `PgAdminEventsRepository.insertReplayLog`, and returns a `decision` citing `AD-SYS-2 { eventId, subscriber, status }`:
  - delivered: `allowed`, `EventDeliveryReplayed`;
  - no-op: `allowed`, `EventDeliveryReplayInProgress`;
  - a replay that threw: `rejected` with the handler's code (`'Unexpected'` if the catalog lacks it).
- **AC5, AC7.** All 8 bound tests pass. Typecheck, lint, `gate:api:solu2`, `gate:codes:solu2` and `gate:purity` are clean, and the fitness suite (12) passes, including `[SYS-6.R1]` (no wall-clock read) and `[SYS-AD8]`.
- **`PgOutboxV2`** writes the event and its pending deliveries through the publisher's `tx`, and passes the payload through `redact` (the outbox egress noted in Story 1.2).
- **For the review and the Epic 1 gate:**
  - `admin-events.ts` (shared-kernel) imported `renderMessage` and `MESSAGES` from `src/server/trpc/messages*.ts`. The review raised it (M3), and decision #19 moved the catalog into the kernel and made the AD-1 scanner forbid the edge.
  - Decision #18 edited a fixed Solu-2 helper and probe; decision #17 edited Plan-2 ARCHITECTURE §7.3.
  - `wiring().repo` is now one `PgAdminEventsRepository` that every service receives. The other repository ports are still empty interfaces, so they accept it. Each later story adds its own methods to this object.
  - No production composition root builds the services, the outbox or the dispatcher yet (nor 1.2's `PgAuditLog`); the story that mounts the admin routers binds them.
- **AC6 and 6.2** are left for the one `npm test` after triage (pace, decision #13).

### File List

- `scripts/gen-solu2-api.mjs` (modified, decision #14; comment for #16; catalog path for #19; marker guard for review L4)
- `src/modules/*/application/*.v2.ts` (13 files) and `src/modules/*/ports/*.v2.ts` (12 files) (modified: marked layout)
- `src/shared-kernel/admin-events.ts` (modified)
- `src/shared-kernel/admin-events.test.ts` (new)
- `src/shared-kernel/dispatcher.ts` (modified)
- `src/shared-kernel/dispatcher.test.ts` (new)
- `src/shared-kernel/infra/pg-outbox.ts` (new)
- `src/shared-kernel/infra/pg-outbox.test.ts` (new)
- `src/shared-kernel/infra/pg-admin-events.ts` (new)
- `src/shared-kernel/messages.ts`, `messages.generated.ts` (regenerated) and `messages.test.ts` (moved from `src/server/trpc/`, decision #19)
- `src/server/trpc/messages.ts` (now a re-export, decision #19)
- `test-support/solu2/fixtures.ts` (modified; `PgOutboxV2` in `wiring()`, decision #20)
- `test-support/solu2/fitness.ts` (modified, decisions #18 and #19)
- `_bmad-output/test-artifacts/fitness/sys_fitness.test.ts` (modified, decisions #18 and #19)
- `_bmad-output/test-artifacts/fixtures/README.md` (modified, `sim_events` row, decision #20)
- `_bmad-output/planning-artifacts/detailed-design/contracts.md` (modified, §13, decision #16)
- `_bmad-output/planning-artifacts/ARCHITECTURE.md` (modified, §7.3, decision #17)
- `_bmad-output/decision-logs/impl-1-ai-decision-log.md` (modified, entries #13–#21)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `_bmad-output/implementation-artifacts/1-3-deliver-every-committed-event-exactly-once-in-effect.md` (this file)

## Review Report

### Walkthrough

- **Business goal** (epics.md, "Story 1.3"): every committed domain event reaches each subscriber exactly once in effect, even when handlers throw, processes crash or the sweeper races the post-commit dispatch (AD-SYS-2, NFR-SYS-6). An admin can replay a failed delivery, and the replay leaves one log row with its outcome.
- **What changed:**
  - **shared-kernel:**
    - `OutboxDispatcherV2` covers the attempt procedure (rule 4), the sweep (rule 6) and replay (rule 7).
    - `PgOutboxV2` writes the event and its pending deliveries in the publisher's transaction and redacts the payload.
    - `PgAdminEventsRepository` writes the replay log.
    - `replayEventDelivery` returns an explained decision.
  - **Catalog:** the es-CO catalog and its renderer moved into the kernel; the tRPC adapter re-exports them (#19).
  - **Generator:** keeps hand-owned code after a marked block (#14) and refuses lost or doubled markers (review L4).
  - **Test support:** `wiring()` binds `PgOutboxV2` (#20). The table-ownership and import scanners were fixed (#18, #19).
- **Blast radius:**
  - Every module's `application/*.v2.ts` and `ports/*.v2.ts` now has the marked layout. Later stories write below the block.
  - Any story that publishes an event goes through `PgOutboxV2`.
  - The first publishing story wires `dispatch()`; Story 4.4 wires `sweep()` (#21).
  - There is no schema, grant or package change.
- **Verification:**
  - Test-first for Tasks 2–5.
  - The 8 bound ATDD tests and the fitness suite pass.
  - The review fixes added 8 tests, each red first.
  - The full `npm test` passes with the story `done`.

### Diff evidence

`git diff --cached --stat a0fc7fb`, without this story file: 46 files changed, 1019 insertions(+), 218 deletions(-).

The bulk of the change is the 25 marked `*.v2.ts` files, plus `dispatcher.ts`, `dispatcher.test.ts`, `pg-outbox.ts` and `pg-outbox.test.ts`, `admin-events.ts` and `admin-events.test.ts`, the moved catalog, `gen-solu2-api.mjs`, `fitness.ts` and `fixtures.ts`.

### Commands and output

| Command | Result |
|---|---|
| The 8 bound ATDD tests (Tasks 3 and 5, Debug Log) | passed; counted among the 15 green for done stories in `gate:atdd-red:impl1` below |
| `npx vitest run --project solu2-nfr -t "NFR-SYS-6.sweep"` | 1 passed (3.6 s) |
| `npx vitest run --project solu2-fitness` | 12 passed |
| `npm run test:unit` | 92 passed (13 files) |
| `node scripts/gen-solu2-api.mjs --check` | current; exits 1 on a drifted block or a lost marker |
| `npm run typecheck` | clean |
| `npm run lint` | 0 errors, 3 baseline warnings in untouched Solu-2 files |
| `npm test` (story `done`) | exit 0 |

`npm test`, gate lines:

```
gate:atdd-red:impl1  352 tests in 19 files; 337 red for the right reason; 15 green for done stories (20 contracts or test ids done); 0 not as expected
gate:nfr-red:impl1   3 tests in 3 files; 1 red for the right reason; 2 green for done stories; 0 not as expected
43 pages, 327 states (138 data, 77 refusal, 112 client), 0 problems
195 code citations checked, 0 problems
trace: 96 FRs, 56 NFRs, 61 AD rows, 20 risks, 112 clauses, 371 tests; 0 problems
```

## Review Findings

`bmad-code-review` ran in a fresh context against baseline `a0fc7fb`. Verdict: no High findings. Each code fix was test-first: its test failed for the stated reason, then passed.

| # | Sev. | Finding | Triage |
|---|---|---|---|
| M1 | Med | Step 2's `catch` treated any error (connect, claim, envelope, `COMMIT`) as a handler throw and ran step 3. | **Fixed.** Only a handler throw reaches step 3. Any other error leaves the row pending with the attempt counted. Test: `dispatcher.test.ts` › attempt procedure › error outside the handler. |
| M2 | Med | Test gaps: the non-`DomainError` → `'Unexpected'` path in attempt and replay; rollback of handler effects; the 60 s boundary; the dispatch/sweep race. | **Fixed.** 5 attempt-procedure tests and 2 replay tests were added; the race runs the handler once. |
| M3 | Med | `admin-events.ts` (shared-kernel) imported `src/server/trpc`, and the AD-1 scanner only checked module edges. | **Fixed** by decision #19: the catalog moved into the kernel, and the scanner forbids the edge. |
| M4 | Med | `dispatch()` and `sweep()` are wired nowhere in production. | **Assigned** by decision #21 (first use owns the wiring). Recorded in the cross-story notes and for the Epic 1 gate. |
| L1 | Low | Step 1's `UPDATE` blocks rather than skips, so concurrent attempters can over-count `attempts`. | **Kept.** It follows rule 4 as written. Raised for the Epic 1 gate. |
| L2 | Low | Replay's `lastAttemptAt` must be the claim time in both outcomes. | **Fixed.** Test: `dispatcher.test.ts` › replay › lastAttemptAt. |
| L3 | Low | The shared `wiring().repo` lets one story's repository methods leak into another's tests. | **Deferred.** Recorded in the cross-story notes and for the Epic 1 gate. |
| L4 | Low | The generator overwrote a file whose markers were lost or doubled. | **Fixed.** It throws; proven by hand on `ord.v2.ts`. |
| L5 | Low | `wiring()` bound `SqlOutboxV2`, which skips the redactor. | **Fixed** by decision #20. |
| N1 | Nit | A failed replay returns `failed` even when its conditional `UPDATE` matched 0 rows. | **Kept.** Raised for Story 1.5. |
| N2 | Nit | A failure in step 3's bookkeeping aborts the rest of the batch. | **Deferred** to the dispatch-wiring story (#21). |
| N3 | Nit | `pg-outbox.test.ts` asserted the event id loosely. | **Fixed.** It asserts `new SequentialIds('n').next()`. |

## Change Log

- 2026-10-25: story created (bmad-create-story), baseline `a0fc7fb`.
- 2026-10-25: Implemented Tasks 1–6.1 (bmad-dev-story), with decision #18 on the table-ownership scanner. Status set to `review`.
- 2026-10-25: Code review (fresh context): M1, M2, L2 and N3 fixed test-first; M3 (#19), L5 (#20), M4 (#21) and L4 fixed or assigned; L1, L3, N1 and N2 triaged. Status set to `done`.
