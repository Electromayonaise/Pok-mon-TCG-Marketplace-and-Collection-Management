---
baseline_commit: 9114475
---

# Story 1.2: Record an audit trail and keep regulated data out of every egress

Status: done

<!-- Epic entry: docs/solu-2/planning/epics.md, "Story 1.2" (line 373). Ceremony: docs/impl-1/task-statement.md §3. -->

## Story

As the data protection officer,
I want every change audited in its own transaction and every regulated value redacted before it leaves a module,
so that NFR-SYS-2 and NFR-SYS-8 hold by construction.

- **Kind:** Skeleton. No registry operation of its own.
- **Depends on:** Story 1.1 (`done`, commits `edf22a4` and `9114475`).
- **Traceability:** FR: none (cross-cutting). NFR-SYS-8. Risks: R-13 (P0), R-18 (P1).
- **Binding invariants:**
  - **AD-17:** the comprobante is regulated data, enforced by `regulated.ts` and the redactor.
  - **AD-SYS-2 rule 10, as refined by R-2:** `audit_events` is append-only and written in the writer's transaction. `UPDATE`/`DELETE` are revoked, and rows are written only through `AuditLog.record(tx)`.
  - **AD-SYS-8 rules 3–4:** no regulated value reaches a log line, an error body, a citation or an outbox payload.
- **Carried in:** Story 1.1 review finding **L3**. No `onError` hook logs the cause of an `Unexpected`. It was deferred here because this story brings the logger and the redactor.

## Acceptance Criteria

**AC1 (happy, audit).**
- *Given* a command records an audit entry (for example `orders.fact.buyerPaid` on an `Order` id) in its transaction,
- *when* the transaction commits,
- *then* exactly one `audit_events` row exists, with `createdAt` from the `Clock` and `id` from the `IdGenerator`, and the app role `tezg_app` can neither update nor delete it.
- If the transaction aborts after the write, the row does not exist.

**AC2 (failure, egress).**
- *Given* canaries sit in every regulated column of the §3 seed (phones, NITs, document and comprobante keys, message bodies),
- *when* every row flows through the logger, the formatter's citations and the redactor,
- *then* the captured text holds 0 canaries, and non-regulated ids such as `orderId` survive.

**AC3 (L3: the cause of an `Unexpected` is logged, safely).**
- *Given* a procedure served by `serveTrpc` throws a non-domain error (for example a driver error whose message carries a canary phone),
- *when* tRPC reports it,
- *then* exactly one structured `error` line is written through `createLogger` naming the procedure path and the error's class (and SQLSTATE when present).
- The line never carries the foreign error's `message`, `detail` or stack text.
- A `DomainError` and a `RequestValidationFailed` refusal write no line.
- The response body is unchanged from Story 1.1.

**AC4 (bound tests).** These 6 tests pass:

| Test file | Tests |
|---|---|
| `docs/solu-2/test/atdd/sys_contracts.test.ts` | `[SYS-R2]`, `[SYS-8.R4]`, `[SYS-8.R4.redact]`, `[SYS-8.R4.error]` |
| `docs/solu-2/test/fitness/sys_fitness.test.ts` | `[SYS-R2.grants]` (already green from the migration's `REVOKE`; it must stay green) |
| `docs/solu-2/test/nfr/canary_scan.test.ts` | `[NFR-SYS-8.canary]` |

**AC5 (red gates).** With this story `done` in `docs/impl-1/implementation-artifacts/sprint-status.yaml`:
- `npm run gate:atdd-red:impl1` passes;
- `npm run gate:nfr-red:impl1` passes. `[NFR-SYS-8.canary]` is now green, and the other 2 NFR tests stay red for `NotImplemented`.

In Impl-1, the epic DoD's `gate:atdd-red:solu2` is `gate:atdd-red:impl1` (decision log #9).

**AC6 (shared DoD).** The shared Definition of Done holds (`docs/solu-2/planning/epics.md` §"Definition of Done (every story)"):
- `explainAssert` holds on every body;
- `gate:purity`, typecheck and lint are clean;
- every timestamp comes from `Clock`;
- the story file records the commands run and their output.

## Tasks / Subtasks

Order (statement §3 step 3): shared-kernel → infra → tRPC → tests. Write each task's code only against a failing test, either a bound ATDD test or a new colocated unit test in `impl1-unit` (`src/**/*.test.ts`). See each test red before writing the code.

- [x] **Task 1: `redact(value)` (AC2)** in `src/shared-kernel/regulated.ts`
  - [x] 1.1 Return a deep copy. Walk plain objects and arrays, carrying the dotted path of each value. Join object keys with `.` and include array indices as segments, so `messages.0.body` is a path.
    - When a path matches any `REGULATED_FIELDS` pattern, replace the **whole value** at that path (string, number, object or array) with `REDACTED`. Do not descend into it.
    - This is how `legalIdentity` (an object, or the JSON string the canary test passes) and `documentKeys` (an array) disappear in one step.
  - [x] 1.2 Keep the shape. The same keys appear at the same places; only regulated values change.
    - Leave non-regulated primitives, `null` and `undefined` as they are.
    - Do not walk non-plain objects such as `Date`; copy them as they are. Never mutate the input.
  - [x] 1.3 Keep the signature `redact<T>(value: T): T`. Story 1.1's formatter and the generated ports already import it.
  - [x] 1.4 Add unit tests in `src/shared-kernel/regulated.test.ts`, red first:
    - each `REGULATED_FIELDS` family, both top-level and nested;
    - a regulated key under an array index (`[{ body }]`);
    - the input is not mutated;
    - non-regulated look-alikes survive (`tokenCount`, `phoneVerified`, `bodyHash`, `orderId`), because the patterns are anchored with `$`;
    - `null`, `Date` and primitive roots.

- [x] **Task 2: `createLogger(sink)` (AC2)** in `src/shared-kernel/regulated.ts`
  - [x] 2.1 Each call writes **one** line, `sink(JSON.stringify({ level, msg, data: redact(data) }))`, with `level` either `'info'` or `'error'`. Omit `data` when it is absent.
    - No timestamp: the logger has no `Clock`, and `src/` may not read the wall clock (`[SYS-6.R1]`). A sink may add one outside `src/`.
  - [x] 2.2 `msg` is an event name such as `orders.comprobante.attached`. Callers never put values in it, and the logger does not redact it. State that in the doc comment.
  - [x] 2.3 Add unit tests: the line format, one line per call, regulated keys redacted in `data` at any depth, and no `data` key when `data` is absent.

- [x] **Task 3: `PgAuditLog.record(tx, entry)` (AC1)** in `src/shared-kernel/infra/pg-audit.ts`
  - [x] 3.1 Write one `INSERT INTO audit_events (id, "actorId", "actorKind", module, action, "aggregateType", "aggregateId", "decisionCode", data, "createdAt")` through the **given** `tx`.
    - `id = this.ids.next()` and `createdAt = this.clock.now().toISOString()`.
    - `data = JSON.stringify(redact(entry.data))`. The header comment promises the redactor runs over `data`.
    - Return `{ auditEventId }`.
    - Never open, commit or roll back a transaction (port contract: "Commands taking it never commit it").
    - Use no SQL `now()`: `[SYS-6.R1]` forbids it.
  - [x] 3.2 Do not change the `audit_events` DDL or its grants. `001_tezg_schema.sql` already revokes `UPDATE, DELETE` from `tezg_app`, which `[SYS-R2]` and `[SYS-R2.grants]` read.
  - [x] 3.3 Add a colocated integration test `src/shared-kernel/infra/pg-audit.test.ts` using `useTestDatabase()` and `wiring(db)`:
    - a regulated key in `data` (for example `phone`) is stored as `[redacted]`;
    - two records in one transaction get two distinct ids;
    - a CHECK violation (an action whose module prefix differs from `module`) rejects inside the caller's transaction.
    - `[SYS-R2]` covers commit, rollback and grants; do not duplicate it.

- [x] **Task 4: the formatter keeps routing citations through `redact` (AC2)** in `src/server/trpc/errors.ts`
  - [x] 4.1 `[SYS-8.R4.error]` and the canary scan must turn green with no change beyond `redact` existing. The Story 1.1 key gate already sends any citation with a regulated top-level key through `redact`.
    - Also allowed: now that `redact` is real, call it on every domain citation and drop the key gate, which also covers nested keys. If you do, keep the comment accurate and the Story 1.1 tests green.
  - [x] 4.2 `humanMessage` renders from the **redacted** `citations[0].inputs`, so a regulated placeholder reads `[redacted]`, never the value. Add a unit test in `errors.test.ts`: a `ContactRateLimited` citation with a `phone` canary has neither the canary in the body nor PascalCase in the message, and `explainAssert` passes.

- [x] **Task 5: L3, log the cause of an `Unexpected` (AC3)** in `src/server/trpc/init.ts` and `app/api/trpc/[trpc]/route.ts`
  - [x] 5.1 Give `serveTrpc` an optional `Logger`, then the `fetchRequestHandler` `onError`. When the error maps to `Unexpected`, write `log.error('trpc.unexpected', { path, type, errorClass, sqlState? })`.
    - Decide "maps to Unexpected" with the same `toErrorBody` mapping. Do not keep a second classification that could drift.
    - `errorClass` is the class name of the innermost `cause` (unwrap tRPC's `TRPCError`).
    - `sqlState` is `cause.code` only when it is a 5-character SQLSTATE string.
  - [x] 5.2 **Never log a foreign error's `message`, `detail`, `where` or `stack`.** A driver message can quote a value, for example `invalid input syntax for type …: "<value>"`, and `redact` works by key, not by content. NFR-SYS-8 forbids a regulated value in a log.
    - Our own `UnexpectedError` and `NotImplementedError` messages hold only module, code and operation names. Those two may add `detail: error.message`.
  - [x] 5.3 In the composition root `app/api/trpc/[trpc]/route.ts`, bind `createLogger((line) => console.error(line))`. That is the only sink. `src/` writes to no console.
  - [x] 5.4 Add unit tests in `src/server/trpc/router.test.ts` (or `init.test.ts`) with a capturing sink:
    - a resolver that throws `Object.assign(new Error('invalid input syntax for type integer: "+573009912345"'), { code: '22P02' })` writes exactly one line with `path`, `errorClass`, `sqlState: '22P02'` and no `+57300…`;
    - a `DomainError` and an unknown path write no line;
    - an `UnexpectedError` line carries its `detail`.

- [x] **Task 6: DoD verification and review report (AC4–AC6)**
  - [x] 6.1 Run `npx vitest run --project solu2-atdd docs/solu-2/test/atdd/sys_contracts.test.ts -t "SYS-R2|SYS-8.R4"`. All 4 pass.
  - [x] 6.2 Run `npx vitest run --project solu2-fitness`. All green, including `[SYS-R2.grants]` and `[SYS-6.R1]`.
  - [x] 6.3 Run `npx vitest run --project solu2-nfr docs/solu-2/test/nfr/canary_scan.test.ts`. It passes; it takes minutes because it seeds the §3 marketplace.
  - [x] 6.4 Run `npm run test:unit`, `npm run lint`, `npm run typecheck` and `npm run gate:purity`.
  - [x] 6.5 Set the story to `done` in sprint-status, then run `npm test`, which runs `gate:atdd-red:impl1` and `gate:nfr-red:impl1`. If anything fails, revert the status to `review`.
  - [x] 6.6 Write the review report in the Dev Agent Record:
    - a walkthrough (business goal, blast radius, verification, citing the epic entry);
    - `git diff --stat` against the baseline;
    - each command with its output.

## Dev Notes

### Current state of the files this story changes (read each before editing)

**`src/shared-kernel/regulated.ts`**
- Today: `REGULATED_FIELDS` (5 anchored patterns), `REDACTED = '[redacted]'`, the stubs `redact` and `createLogger` (both throw `NotImplementedError`), and the `Logger` interface (`info`, `error`).
- This story implements the two stubs. Keep the patterns and the interface: the patterns are the design (AD-SYS-8 rule 3), and every port imports this file.

**`src/shared-kernel/audit.ts`**
- Today: `AuditEntry`, `AuditModule`, `AuditActorKind`, and the port `AuditLog.record(tx, entry)`.
- Read-only.

**`src/shared-kernel/infra/pg-audit.ts`**
- Today: the stub `PgAuditLog(ids, clock).record`.
- Implement it. Mirror the test twin `SqlAuditLog` in `test-support/simulated/index.ts` (line ~52), which is the same INSERT without the redactor. Do not import from `test-support/`.

**`src/server/trpc/errors.ts`**
- Today: `toErrorBody` calls `redact(domain.citations)` only when a top-level input key matches `REGULATED_FIELDS` (Story 1.1 Task 3.4).
- The zod branch, the `REQUEST_REFUSALS` branch (decision #10) and the `Unexpected` branch must not change behaviour.

**`src/server/trpc/init.ts`**
- Today: `serveTrpc(req, appRouter, clock, identity?)` binds `requestClock` (AsyncLocalStorage) and calls `fetchRequestHandler` with `allowBatching: false` and `responseMeta`. There is no `onError`.
- Add the logger as a trailing optional parameter, or turn the trailing parameters into an options object. Existing callers in `router.test.ts` must keep compiling.

**`app/api/trpc/[trpc]/route.ts`**
- Today: the composition root. It binds `systemClock` and calls `serveTrpc(req, appRouter, systemClock)`.
- Add the console sink here (Task 5.3).

**`docs/solu-2/planning/detailed-design/schemas/001_tezg_schema.sql`**
- `audit_events` is at line ~115. Note its CHECKs:
  - `action ~ '^[a-zA-Z-]+\.[a-zA-Z]+\.[a-zA-Z]+$'`;
  - `audit_action_module`: the action's module prefix equals `module`, except `identity`/`verification` and `listings`/`discovery`;
  - `audit_actor_present`;
  - `jsonb_typeof(data) = 'object'`.
- The grants are at line ~1056. Read-only: a schema change needs regeneration and a contract change.

### Guardrails

- **Redaction is by key path, not by content.** `REGULATED_FIELDS` match the dotted path. A regulated value under a non-regulated key, or inside a free-text message, is not caught. That is why Task 5.2 never logs foreign messages, and why `msg` holds event names only.
- **No wall clock in `src/`** (`[SYS-6.R1]`): no `Date.now(`, `new Date()`, `performance.now(` or SQL `now()`.
- **Transaction discipline (AD-SYS-4 rule 1).** `record(tx, …)` uses the caller's `tx` and never commits it. An audit row exists if and only if the change it describes committed.
- **AD-8.** `audit_events` is shared-kernel's (R-2). Each module writes it only through `AuditLog`, never with its own SQL.
- **Dependency gate (`scripts/check-deps.mjs`).** Add no package. `pg` 8.23.1 is already there.
- **Lint toolchain.** Lint runs in `tools/lint` (decision #7). The Node 22.12 EBADENGINE warning is harmless.
- **`_bmad-output/project-context.md` is stale.** The real stack is pinned in `package.json`: Next 16.4.1, tRPC 11.19.0, zod 4.6.7, Prisma 7.10.1, Better Auth 1.7.7, pg 8.23.1, local Postgres 16.6 on 55432.

### Testing standards

- ATDD, fitness and NFR tests are fixed Solu-2 contracts. Do not edit them unless a test is provably wrong; then log a decision first.
- New tests are colocated as `src/**/*.test.ts` in `impl1-unit`. That project has the Postgres template, so `useTestDatabase()` and `wiring(db)` from `test-support/solu2/fixtures.ts` work there. Use `VirtualClock` and `T0` for time.
- The canary NFR test seeds the full §3 marketplace (about 1–3 minutes). Run it alone while iterating.

### Previous story intelligence (1.1)

- Test-first worked well: each new test was seen red, with its reason, before the code (Debug Log of 1.1).
- `explainAssert` forbids PascalCase in `humanMessage`. Because of decision #11, every placeholder is an id, an instant, a number, a field name or an enum value. A redacted placeholder renders as `[redacted]`, which is lower-case and safe.
- tRPC wraps thrown errors in `TRPCError` with `cause`. Unwrap it (as `domainErrorIn` does) before classifying.
- `init.ts`'s `requestClock` exists because tRPC can refuse before it creates a context. `onError` can run then too, so do not assume `ctx` exists.
- The Story 1.1 review asked for tests over the wire (`router.test.ts`, `call(...)` helper). Reuse that helper for Task 5.4.

### Git intelligence

- `edf22a4` (1.1) set up `errors.ts`, `messages.ts`, `init.ts`, `router.v2.ts`, the generator and `gate:impl1`.
- `9114475` (1.1 follow-up) added `REQUEST_REFUSALS` and the placeholder whitelist test.
- Conventions: test-first; one commit per story, `feat(story-1.x): …`, no AI trailer, no push; the story file holds the Review Report.

### Latest technical information

- No new library. tRPC 11.19's `fetchRequestHandler` takes `onError({ error, type, path, req, ctx, input })`; `error` is a `TRPCError` whose `cause` is the thrown value. `ctx` is `undefined` when the refusal happens before context creation.
- `pg` errors (`DatabaseError`) carry `code` (SQLSTATE), `detail`, `constraint`, `table`, `column`, `where`. Only `code` is safe to log by this story's rule. `constraint` and `table` are schema names, so they may also be logged if useful.

### Cross-story notes

- **1.3** (outbox) is the third egress point the canary scan names, the "outbox payload path". Its payloads are typed snapshots (AD-9). It may call `redact` on payloads; this story does not touch the outbox.
- **1.4** adds the lint rule `tezg/regulated-select`. It is not in scope here.
- **Every module story** takes `AuditLog` through its deps (`audit` in `STD_DEPS`), and its tests use the `SqlAuditLog` twin. `PgAuditLog` is the production binding, and the composition root that builds module services (Epic 2 onward) uses it.

### References

- [Source: docs/solu-2/planning/epics.md#Story 1.2] and §"Definition of Done (every story)"
- [Source: docs/solu-2/planning/ARCHITECTURE.md: AD-17, AD-SYS-2 rule 10 / R-2, AD-SYS-6, AD-SYS-8 rules 3–4]
- [Source: docs/solu-2/planning/detailed-design/schemas/001_tezg_schema.sql: `audit_events` (line ~115), grants (line ~1056)]
- [Source: docs/solu-2/test/atdd/sys_contracts.test.ts › SYS-8.R4, SYS-R2; docs/solu-2/test/nfr/canary_scan.test.ts; docs/solu-2/test/fitness/sys_fitness.test.ts › SYS-R2.grants]
- [Source: docs/impl-1/implementation-artifacts/1-1-refuse-every-request-with-one-typed-explained-error-body.md, Review Findings L3]
- [Source: docs/impl-1/task-statement.md §3 (Full Ceremony)]

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), through `bmad-dev-story` in Claude Code.

### Debug Log References

- **Task 1, red:** `regulated.test.ts` failed 6/8 with `NotImplementedError: shared-kernel.redact`. The remaining 2 (the logger tests) failed for `createLogger`.
- **Task 1, tooling slip:** a first edit through a shell one-liner mangled the backticks in the doc comments of `regulated.ts`. The comments were rewritten with Edit. `walk` now takes the path as a `string[]`, which also narrows types without casts.
- **Task 2, red then green:** the 2 logger tests went green once `createLogger` wrote one `JSON.stringify` line per call.
- **Task 3, red:** `pg-audit.test.ts` failed 3/3 with `NotImplementedError: shared-kernel.audit.record`, then passed 3/3 with the INSERT. The CHECK test rejects with SQLSTATE `23514`, and no row survives the caller's rollback.
- **Task 4, characterization:** the new `ContactRateLimited` test was green on its first run. The Story 1.1 key gate already redacted a top-level `phone`. The key gate was then replaced by an unconditional `redact(domain.citations)`, which also covers nested keys, and all 20 `errors.test.ts` tests stayed green.
- **Task 5, red:** the 3 new `router.test.ts` tests failed because `serveTrpc` took no logger and wrote no line. TS2379 (`exactOptionalPropertyTypes`) appeared when `{ identity: o.identity, log: o.log }` was rebuilt; passing `o` itself fixed it.
- **Task 6.3, a defect in a fixed contract:** `[NFR-SYS-8.canary]` reached 0 canaries but failed its last assertion, `toContain(id('ord0'))`. In the §3 seed, orders `ord0`–`ord39` have no comprobante, so the scan never sees `ord0`. `ord40` is the first paid order. Martín chose to change the assertion to `ord40` (decision log Impl-1 **#12**, `[CORRECTED]`). After the change the test passes in about 5 s.
- **Lint:** 0 errors. The 3 warnings are in untouched Solu-2 files (`com_supporting`, `inv_contracts`, `ver_supporting`) and exist at the baseline; stashing this story's changes gives the same 3.

### Completion Notes List

- **AC1.** `PgAuditLog.record` writes one `audit_events` row through the caller's `tx`. Its `id` comes from `IdGenerator` and its `createdAt` from `Clock`, and `data` passes through `redact`. It never commits. `[SYS-R2]` (commit, rollback, no UPDATE/DELETE for `tezg_app`) and `[SYS-R2.grants]` are green.
- **AC2.**
  - `redact` walks plain objects and arrays by dotted path. A regulated path loses its whole value, and the shape is kept.
  - A cycle, or a depth over 32, is replaced by `REDACTED` rather than walked.
  - The formatter now redacts every domain citation.
  - `[SYS-8.R4]`, `[SYS-8.R4.redact]`, `[SYS-8.R4.error]` and `[NFR-SYS-8.canary]` are green.
- **AC3 (L3).**
  - `serveTrpc(req, router, clock, { identity?, log? })` logs one `trpc.unexpected` error line when, and only when, `toErrorBody` maps the error to `Unexpected`.
  - The line carries `path`, `type`, the innermost cause's `errorClass` and a SQLSTATE `sqlState`. Only our own `NotImplementedError` and `UnexpectedError` add `detail`.
  - The composition root binds the only sink, `console.error`.
  - The response body is unchanged.
- **AC4–AC6.** All 6 bound tests pass, and `npm test` exits 0 with the story `done` (see Commands and output).
- **For the Epic 1 gate:** decision #12 edited a fixed Solu-2 contract (one assertion, with a comment citing the decision).

### File List

- `src/shared-kernel/regulated.ts` (modified)
- `src/shared-kernel/regulated.test.ts` (new)
- `src/shared-kernel/infra/pg-audit.ts` (modified)
- `src/shared-kernel/infra/pg-audit.test.ts` (new)
- `src/server/trpc/errors.ts` (modified)
- `src/server/trpc/errors.test.ts` (modified)
- `src/server/trpc/init.ts` (modified)
- `src/server/trpc/router.test.ts` (modified)
- `app/api/trpc/[trpc]/route.ts` (modified)
- `docs/solu-2/test/nfr/canary_scan.test.ts` (modified, decision #12)
- `docs/impl-1/ai-log/ai-decision-log.md` (modified, entry #12)
- `docs/impl-1/implementation-artifacts/sprint-status.yaml` (modified)
- `docs/impl-1/implementation-artifacts/1-2-record-an-audit-trail-and-keep-regulated-data-out-of-every-egress.md` (this file)

## Review Report

### Walkthrough

- **Business goal** (epics.md, "Story 1.2"): the data protection officer can rely on two properties by construction.
  - Every change leaves one append-only audit row in its own transaction (NFR-SYS-2, R-2).
  - No phone, legal identity, document or comprobante key, signed URL or message body leaves a module through a log, an error body, a citation or a payload (NFR-SYS-8, AD-17, AD-SYS-8 rules 3–4).
- **What changed:**
  - **shared-kernel:** the redactor, the structured logger and the Postgres `AuditLog` adapter.
  - **tRPC driving adapter:** the formatter redacts every domain citation, and `serveTrpc` logs the cause of an `Unexpected` without its message (Story 1.1 finding L3).
  - **Composition root:** binds the console sink.
- **Blast radius:**
  - Every later module story imports `redact` and `AuditLog`.
  - `serveTrpc`'s trailing parameter became an options object. Its only callers are `route.ts` and `router.test.ts`, and both were updated.
  - There is no schema, grant or package change.
- **Verification:** test-first for Tasks 1–3 and 5, and a characterization test for Task 4. The bound ATDD, fitness and NFR tests pass, and so does the full `npm test` with the story `done`.

### Diff evidence

`git diff --stat 9114475`, without this story file:

```
 app/api/trpc/[trpc]/route.ts                       |  9 ++-
 docs/impl-1/ai-log/ai-decision-log.md              | 15 ++++
 .../implementation-artifacts/sprint-status.yaml    |  2 +-
 docs/solu-2/test/nfr/canary_scan.test.ts           |  3 +-
 src/server/trpc/errors.test.ts                     | 21 ++----
 src/server/trpc/errors.ts                          |  9 +--
 src/server/trpc/init.ts                            | 32 +++++++-
 src/server/trpc/router.test.ts                     | 41 +++++++++-
 src/shared-kernel/infra/pg-audit.test.ts           | 39 ++++++++++
 src/shared-kernel/infra/pg-audit.ts                | 15 +++-
 src/shared-kernel/regulated.test.ts                | 88 ++++++++++++++++++++++
 src/shared-kernel/regulated.ts                     | 51 ++++++++++---
 12 files changed, 282 insertions(+), 43 deletions(-)
```

### Commands and output

| Command | Result |
|---|---|
| `npx vitest run --project impl1-unit src/shared-kernel/regulated.test.ts` | 8 passed |
| `npx vitest run --project impl1-unit src/shared-kernel/infra/pg-audit.test.ts` | 3 passed |
| `npx vitest run --project impl1-unit src/server/trpc` | `errors.test.ts` 20 passed, `router.test.ts` 13 passed |
| `npx vitest run --project solu2-atdd docs/solu-2/test/atdd/sys_contracts.test.ts -t "SYS-R2\|SYS-8.R4"` | 4 passed |
| `npx vitest run --project solu2-fitness` | 12 passed |
| `npx vitest run --project solu2-nfr docs/solu-2/test/nfr/canary_scan.test.ts` | 1 passed (about 5 s) |
| `npm run test:unit` | 67 passed (10 files); 71 after the review fixes |
| `npm run typecheck` | clean |
| `npm run gate:purity` | 12 files, 0 problems |
| `npm run lint` | 0 errors, 3 baseline warnings in untouched Solu-2 files |
| `npm test` (story `done`) | exit 0 |

`npm test`, gate lines:

```
gate:atdd-red:impl1  352 tests in 19 files; 343 red for the right reason; 9 green for done stories (12 contracts or test ids done); 0 not as expected
gate:nfr-red:impl1   3 tests in 3 files; 2 red for the right reason; 1 green for done stories; 0 not as expected
43 pages, 327 states … 0 problems
195 code citations checked, 0 problems
trace: 96 FRs, 56 NFRs, 61 AD rows, 20 risks, 112 clauses, 371 tests; 0 problems
```

## Review Findings

`bmad-code-review` ran in a fresh context against baseline `9114475`. Verdict: no High findings. Each fix was test-first: the 4 new tests failed for the stated reason, then passed.

| # | Sev. | Finding | Triage |
|---|---|---|---|
| M1 | Med | `redact` passed class instances through unwalked, but both egress paths `JSON.stringify` them, which emits their own fields. A regulated key inside an instance (or a pg error's `detail`) reached the log line or the audit row. | **Fixed.** `redact` now walks what `JSON.stringify` would emit (own enumerable keys, or `toJSON()`). Dates pass, and an `Error` is dropped whole. Tests: `regulated.test.ts` › class instances and toJSON objects; › drops an Error whole. |
| L2 | Low | `sqlState` was any 5-character upper-case code, so errno codes (`EPIPE`) and Prisma codes (`P2002`) were logged as SQLSTATEs. `errorClass` read `constructor.name`, which a thrown object's own property can override. | **Fixed.** `sqlState` only for a pg driver error (it has a `severity`). `errorClass` reads the prototype. Test: `router.test.ts` › not a driver SQLSTATE. |
| L3 | Low | A throwing sink, or a throw inside `onError`, escaped tRPC's error path and replaced the `ErrorBody` with a raw 500. | **Fixed.** The logging in `onError` is wrapped in `try/catch`. Test: `router.test.ts` › a sink that throws never changes the response. |
| N1 | Nit | `toErrorBody` runs twice per error (formatter and `onError`). | **Kept.** It is cheap, and it keeps one classification, as Task 5.1 asks. |
| N2 | Nit | Minified bundles could mangle class names in `errorClass`. | **Dismissed.** The server bundle is not minified for class names, and `detail` already names our own errors. |
| N3 | Nit | `REGULATED_FIELDS` matches exact, case-sensitive names, so `buyerPhone` or `csrfToken` would pass. | **Out of scope** (fixed design, AD-SYS-8 rule 3). Raised for Story 1.4 (`tezg/regulated-select`) and the Epic 1 gate. |

## Change Log

- 2026-10-25: Story created (bmad-create-story), with baseline `9114475`. It carries Story 1.1's review finding L3.
- 2026-10-25: Implemented Tasks 1–6 (bmad-dev-story), with decision #12 on the canary scan. Status set to `review`.
- 2026-10-25: Code review (fresh context): M1, L2 and L3 fixed test-first, nits triaged. Status set to `done`.
