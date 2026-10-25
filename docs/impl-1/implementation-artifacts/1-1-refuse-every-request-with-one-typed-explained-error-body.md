---
baseline_commit: 3187e012e2cb5c8c36be3c0231570fb8e65ecc1a
---

# Story 1.1: Refuse every request with one typed, explained error body

Status: done

<!-- Epic entry: docs/solu-2/planning/epics.md, "Story 1.1" (line 357). Ceremony: docs/impl-1/task-statement.md §3. -->

## Story

As any client of the 108 tRPC procedures,
I want every refusal to arrive as one `ErrorBody` with its registry status, an es-CO message and a cited decision,
so that no screen has to guess what went wrong.

- **Kind:** Skeleton. No registry operation of its own.
- **Depends on:** none.
- **Traceability:** FR: none (cross-cutting). Risks: R-15 (P0), R-16 (P1).
- **Binding invariants:**
  - **AD-11:** one owner per error code. `raise` checks the caller module.
  - **AD-16:** roles are derived server-side. No input carries a role-like key.
  - **AD-SYS-1:** one Decision shape and one code registry, enforced by `codes.ts`, the error formatter and `explainAssert`.
  - **AD-SYS-8:** server-side authorization through the procedure builders. The redactor hook lands here; its body is Story 1.2.

## Acceptance Criteria

**AC1 (happy).**
- *Given* `identity` raises `AdminOnly` through `raiserFor('identity')` at `2026-10-01T15:00Z`,
- *when* the tRPC error formatter maps it,
- *then* the body is `{ code: 'AdminOnly', httpStatus: 403, decision }`, and the decision cites `AD-SYS-1` with its inputs and carries an es-CO message.

Every registry code formats the same way. The epic text says "88", but `codes.ts` now has 99 codes, and the test iterates all of `DOMAIN_ERRORS`.

The router exposes exactly the registry's procedures, and no procedure takes a role-like or actor input key.

**AC2 (failure).**
- *Given* `reviews` raises identity's `AdminOnly`, or a driver throws `relation "Order" does not exist at 10.0.0.7`,
- *when* the error reaches the formatter,
- *then* the raise fails as `'Unexpected'` (HTTP 500), and the body never contains the driver message.

Also, two `OrderNotVisibleToCaller` bodies differ only in `occurredAt`.

**AC3 (bound tests).** These 6 tests pass:

| Test file | Tests |
|---|---|
| `docs/solu-2/test/atdd/sys_contracts.test.ts` | `[SYS-1.R2]`, `[SYS-1.R6]`, `[SYS-1.R6.unexpected]`, `[SYS-1.R6.s2]`, `[SYS-8.R2]` |
| `docs/solu-2/test/fitness/sys_fitness.test.ts` | `[SYS-8.R2.static]` (already green; it must stay green) |

**AC4 (red gate).** With this story `done` in `docs/impl-1/implementation-artifacts/sprint-status.yaml`, `npm run gate:atdd-red:impl1` passes: every other ATDD test is still red for the right reason (`/NotImplemented/`).

The epic DoD names `gate:atdd-red:solu2`. In Impl-1 that gate is `gate:atdd-red:impl1` (decision log #9).

**AC5 (decision #9 artifacts).**
- `npm test` runs the new `gate:impl1`.
- `.github/workflows/impl1-quality-gate.yml` runs it on push and on pull request.
- The Solu-1 and Solu-2 workflows run only on `workflow_dispatch`.

**AC6 (shared DoD).** The shared Definition of Done holds (`docs/solu-2/planning/epics.md` §"Definition of Done (every story)"):
- `explainAssert` holds on every body;
- `gate:purity`, typecheck and lint are clean;
- the story file records the commands run and their output.

## Tasks / Subtasks

Order (statement §3 step 3): domain → ports → infra → tRPC → tests. Write each task's code only against a failing test, either one of the bound ATDD tests or a new colocated unit test in the `impl1-unit` project (`src/**/*.test.ts`).

- [x] **Task 1: the es-CO message catalog for every code (AC1, AC6)**
  - [x] 1.1 Generate `src/server/trpc/messages.generated.ts` from the contracts.md §13 table (lines ~1256–1347). Do it with a generator that has a `--check` mode, either by extending `scripts/gen-solu2-api.mjs` (it already reads contracts.md) or with a sibling script wired into `gate:api:solu2`.
    - Map each code (all 99 `DOMAIN_ERRORS` keys, plus `'Unexpected'`) to its template.
    - The §13 "Unexpected" message is "Algo falló de nuestro lado; no se aplicó ningún cambio."
    - Do **not** take copy from `docs/plan-2/ux/microcopy-es-CO.md`. It lacks AccountNotFound, CommissionAccountNotOpen, PromptNotFound and InvalidAcquiredDate. §13 is the source of truth.
  - [x] 1.2 Write a renderer `renderMessage(code, inputs)`.
    - It fills `{placeholder}` only from `citations[0].inputs` (AD-SYS-1 rule 6).
    - A missing input must still yield a readable, non-empty sentence with no PascalCase token and no leftover `{…}`. Choose one neutral es-CO rendering and unit-test it.
    - The `[SYS-1.R6]` probe cites `{ probe: 1 }` only, so most placeholders are missing in that test.
  - [x] 1.3 Add unit tests:
    - every `DOMAIN_ERRORS` code has a template;
    - no template matches `/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/`;
    - the generator's `--check` passes.

- [x] **Task 2: `raiserFor` (AC1, AC2)** in `src/shared-kernel/raise.ts`
  - [x] 2.1 When `DOMAIN_ERRORS[code].owner === module`, throw `new DomainError(code, citations)`.
  - [x] 2.2 Otherwise throw an `UnexpectedError`, whose `name` and `code` are both `'Unexpected'`. Add it to `src/shared-kernel/errors.ts` next to `DomainError`.
    - Its internal message may name the module and the code for logs, but it must never reach a body: Task 3 drops it.
    - `codeOf` reads `.code`, else `.name`.
  - [x] 2.3 Keep the `Raise` type signature unchanged. Every later module calls it.

- [x] **Task 3: `toErrorBody(error, now)` (AC1, AC2)** in `src/server/trpc/errors.ts`
  - [x] 3.1 A `DomainError` maps to:
    - `code`;
    - `httpStatus: HTTP_STATUS[DOMAIN_ERRORS[code].trpc]`;
    - `decision: { outcome: 'rejected', reasonCode: code, humanMessage: renderMessage(...), citations, occurredAt: now.toISOString() }`.
  - [x] 3.2 A zod failure maps to `RequestValidationFailed`. That covers a `ZodError`, or a `TRPCError` with code `BAD_REQUEST` whose `cause` is a `ZodError`. The body has `issues: { field, issue }[]` and a humanMessage with one line "Revisa {field}: {issue}." per issue.
    - `field` is the joined issue path (or the unrecognized key).
    - `issue` is es-CO. A small mapper from zod issue codes (`invalid_type`, `too_small`, `too_big`, `invalid_format`, `invalid_value`, `unrecognized_keys`, `custom`) gives controlled copy. zod's built-in `z.locales.es()` works too, but its wording ("Llave desconocida") is weaker.
    - The citation is `{ rule: 'AD-SYS-1', inputs: { field, issue } }` for the first issue.
  - [x] 3.3 Anything else maps to `{ code: 'Unexpected', httpStatus: 500 }`, with citation `{ rule: 'AD-SYS-1', inputs: {} }` and the §13 message.
    - Never copy `error.message`, `stack` or `cause` into the body.
    - A tRPC `TRPCError` without a zod cause (for example `NOT_FOUND` for an unknown path) is also `Unexpected`, unless its `cause` is a `DomainError`. Unwrap `cause` first, because tRPC wraps thrown errors.
  - [x] 3.4 Redaction gate:
    - When any citation input key matches `REGULATED_FIELDS`, pass the citations through `redact()` from `src/shared-kernel/regulated.ts`. Otherwise leave them untouched.
    - `redact` stays `NotImplemented` until Story 1.2, so 1.2's `[SYS-8.R4.error]` (citation key `phone`) stays red for the right reason.
    - Do **not** implement `redact` here.
  - [x] 3.5 S-2: `*NotVisibleToCaller` and `*NotFound` bodies depend only on (code, citations, now). Nothing per-request (ids, timing, stack) enters the body.

- [x] **Task 4: generated procedure inputs (AC1 router clause, AD-16)**
  - [x] 4.1 Extend the generator to emit `src/server/trpc/inputs.generated.ts`: one zod schema per non-job ingress procedure, built from the OpenAPI request schemas the generator already derives from the DTOs.
    - Query inputs come from `parameters[0].content['application/json'].schema`; mutation inputs from `requestBody.content['application/json'].schema`.
    - Use `z.strictObject` for `additionalProperties: false`.
    - Support `minLength`/`maxLength`/`minimum`/`maximum`/`pattern`, `const`, `enum`, `anyOf` with null, arrays and `$ref` (resolved to shared consts).
    - `orders.supportContact.get` has no input.
    - Emit zod source, not runtime `z.fromJSONSchema`. The output stays readable and diffable, and `--check` covers it.
  - [x] 4.2 Add a unit test (or a generator self-check): no generated input has a role-like key (`role|roles|sellerKind|isAdmin|capabilities`) or an `omit` actor field from `operations.json`.

- [x] **Task 5: procedure builders, registry routers, formatter (AC1, AC2)** in `src/server/trpc/`
  - [x] 5.1 Set up the builders: `publicProcedure`, `authedProcedure`, `canBuyProcedure`, `adminProcedure`.
    - **public:** no gate.
    - **authed:** needs a session. Missing → `NotAuthenticated`, raised by identity's port, not by server/trpc.
    - **canBuy:** delegates to `IdnServiceV2.requireCanBuy` (Story 2.4).
    - **admin:** delegates to identity's `requireAdmin`.
    - These identity methods are NotImplemented until their stories. Builders only delegate (AD-11: server/trpc raises no identity code).
    - Session resolution from Better Auth headers may stay a port that is NotImplemented until Epic 2. Do not mount Better Auth's handler here.
  - [x] 5.2 Register all 108 non-job ingress procedures from `docs/solu-2/planning/detailed-design/schemas/operations.json`.
    - Use each procedure's `builder` and `kind` (query or mutation) and its generated input.
    - Each resolver throws `new NotImplementedError(procedure)` until its owning story wires the service.
    - Group sub-routers per module, matching the dotted names. Counts: access 2, verification 11, catalog 7, discovery 2, inventory 12, orders 14, commission 13, trading 10, messaging 5, collections 17, valuation 3, reputation 8, admin 4. `public` has 7 procedures. `job` procedures are excluded.
  - [x] 5.3 `describeProceduresV2()` returns `{ procedure, kind, builder, inputKeys }[]` by introspecting the built router: `_def.procedures`, each procedure's `_def.type` and the input parser's `.shape` keys.
    - Keep the builder tag on each procedure, for example via `.meta({ builder })`. Do not keep a parallel hand list, which could drift.
  - [x] 5.4 Wire the formatter in `src/server/trpc/init.ts`: `initTRPC.context<TrpcContext>().create({ errorFormatter })`.
    - It returns `{ ...shape, data: { ...shape.data, httpStatus }, ... }` with the `ErrorBody` under a stable key (for example `shape.data.body` or `{ error: ErrorBody }`), and the HTTP status equal to `body.httpStatus`.
    - The response must never carry the driver message: set `shape.message` to the es-CO humanMessage, strip `shape.data.stack`, and never pass `error.message` through.
    - Mount `appRouter` with the registry routers.
  - [x] 5.5 **Clock (AD-SYS-6).** The formatter needs `now`. `src/` may not read the wall clock, because the `[SYS-6.R1]` scan forbids `new Date()` and `Date.now(` in `src/`. Take `now` from a `Clock` port carried on `TrpcContext`:
    - `createContext(req, clock)` returns `{ headers, clock }` and never throws;
    - the only system-clock adapter, `{ now: () => new Date() }`, lives in the composition root `app/api/trpc/[trpc]/route.ts`, outside the `src/` scan;
    - tests inject a `VirtualClock`.
  - [x] 5.6 Keep `allowBatching: false` (R-9).

- [x] **Task 6: `AdminGuard.assertCatalogAdmin` (AC1)** in `src/server/trpc/admin-guard.ts`
  - [x] 6.1 Make it `await this.identity.requireAdmin(input.actorId)` and nothing else, so `AdminOnly` propagates unchanged (AD-11).
  - [x] 6.2 Expected side effect: Solu-1's `cat-contracts` AdminGuard tests turn green. That is accepted; the Solu-1 gate is retired from push and PR by decision #9.

- [x] **Task 7: the Impl-1 CI gate (AC4, AC5; decision log #9)**
  - [x] 7.1 Add these `package.json` scripts:
    - `gate:nfr-red:impl1` = `node scripts/check-atdd-red.mjs solu2-nfr 3 --status docs/impl-1/implementation-artifacts/sprint-status.yaml --epics docs/solu-2/planning/epics.md`.
    - `gate:impl1` = the `gate:solu2` chain, with `gate:atdd-red:solu2` replaced by `gate:atdd-red:impl1` and `gate:nfr-red:solu2` replaced by `gate:nfr-red:impl1`.
    - In `test`, replace `gate:solu2 && gate:atdd-red:impl1` with `gate:impl1`. Keep `db:up`, `lint`, `gate:deps`, `gate:prisma` and `test:unit`.
    - Keep `gate:solu2` and `gate:solu1` as they are, for manual evidence.
  - [x] 7.2 Add `.github/workflows/impl1-quality-gate.yml`.
    - Trigger on push to `[main, 'impl-*']` and on pull_request.
    - Run Node 22, `npm ci` (plus `tools/lint`), and `npm test`.
    - Use a `postgres:16.6` service on 55432 with env `TEZG_PG_HOST`/`TEZG_PG_PORT`, as in `solu2-quality-gate.yml`.
    - `npm test` runs `db:up` (docker compose). In CI, use the service container and skip `db:up` through an env guard or a separate `test:ci` script. Choose one and document it.
  - [x] 7.3 Change the triggers of `.github/workflows/solu1-quality-gate.yml`, `.github/workflows/solu2-quality-gate.yml` and the byte-mirror `docs/solu-2/test/ci/quality-gate.yml` to `workflow_dispatch` only.
    - The solu2 workflow's first step `cmp`s itself against the mirror, so edit both identically.

- [x] **Task 8: DoD verification and review report (AC3–AC6)**
  - [x] 8.1 Run `npx vitest run --project solu2-atdd docs/solu-2/test/atdd/sys_contracts.test.ts -t "SYS-1.R2|SYS-1.R6|SYS-8.R2\]"`. All 5 pass.
  - [x] 8.2 Run `npx vitest run --project solu2-fitness`. All green, including `[SYS-8.R2.static]` and `[SYS-6.R1]`.
  - [x] 8.3 Run `npm run test:unit`, `npm run lint`, `npm run typecheck` and `npm run gate:purity`.
  - [x] 8.4 Set the story to `done` in sprint-status, then run `npm run gate:atdd-red:impl1` and `npm run gate:impl1`. If they fail, revert the status to `review`.
  - [x] 8.5 Write the review report in the Dev Agent Record:
    - a walkthrough (business goal, blast radius, verification, citing the epic entry);
    - `git diff --stat`;
    - the commit hashes;
    - each command with its output.

## Dev Notes

### Current state of the files this story changes (read each before editing)

**`src/shared-kernel/raise.ts`**
- Today: the stub `raiserFor(_module: CodeOwner): Raise`, where `Raise = (code, citations) => never`.
- Keep the signature. `CodeOwner` comes from `codes.ts`.

**`src/shared-kernel/errors.ts`**
- Today: `NotImplementedError` (message `NotImplemented: <op>`, which the red gate matches) and `DomainError(code, citations)`.
- Add `UnexpectedError` here. Leave the existing two classes unchanged.

**`src/shared-kernel/codes.ts`**
- Today: `HTTP_STATUS`, `DOMAIN_ERRORS` (99 codes, each with `owner` and `trpc` family), `DECISION_CODES` and `CodeOwner`.
- Read-only for this story. A registry change needs regeneration plus a contract change.

**`src/shared-kernel/explanation.ts`, `decision.ts`**
- Today: `ErrorBody { code, httpStatus, decision: ExplanationDTO, issues? }`, `ErrorIssue { field, issue }`, `Decision { outcome, reasonCode, humanMessage, citations, occurredAt }`, and `Citation { rule, inputs }`. `DecisionOutcome` includes `'rejected'`.
- Read-only.

**`src/shared-kernel/regulated.ts`**
- Today: `REGULATED_FIELDS`, `REDACTED = '[redacted]'`, and the stubs `redact` and `createLogger`.
- Both stubs are Story 1.2's. Only call `redact` behind the key gate in Task 3.4.

**`src/server/trpc/errors.ts`**
- Today: the stub `toErrorBody(_error, _now)`. Its comment states the mapping; keep the comment accurate.

**`src/server/trpc/router.v2.ts`**
- Today: `ProcedureBuilder = 'public'|'authed'|'canBuy'|'admin'|'job'`, `ProcedureShape`, and the stub `describeProceduresV2()`.

**`src/server/trpc/admin-guard.ts`**
- Today: `IdentityAdminGuard { requireAdmin(actorId) }`, the stub `AdminGuard.assertCatalogAdmin`, and `createAdminGuard`.

**`src/server/trpc/init.ts`**
- Today: `TrpcContext { headers }`, `createContext(req)`, a bare `initTRPC...create()` and an empty `appRouter`.
- The route `app/api/trpc/[trpc]/route.ts` uses `fetchRequestHandler` with `allowBatching: false`. Keep that flag.

**`src/server/auth.ts`**
- Today: the Better Auth instance, not mounted.
- Out of scope. Epic 2 mounts sessions.

**`src/modules/identity/`**
- Today: `idn.ts` has the `requireAdmin` stub; `idn.v2.ts` has the `requireCanBuy` stub (Story 2.4).
- Builders import identity only through `src/modules/identity/index.js`, per the AD-1 scan (`[SYS-AD1]`). server/trpc is the composition layer and may import module `index.ts` files.

**`scripts/gen-solu2-api.mjs`**
- Today: it generates `openapi.yaml` and the DTO surface from the TS DTOs, and checks `contracts.md`. It has a `--check` mode that `gate:api:solu2` runs.
- The fitness test `[SYS-8.R2.static]` expects **113** OpenAPI operations (108 tRPC + 3 jobs + 2 health probes). Do not add or drop paths.

**`package.json`, workflows**
- See Task 7.
- `gate:solu2` currently includes the Solu-2 red gate, which reads `docs/solu-2/.../sprint-status.yaml`, where every story is backlog. Once 1.1 is green, that gate fails by design. This is why decision #9 moves `npm test` to `gate:impl1`.

### Guardrails

- **No wall clock in `src/`.** The `[SYS-6.R1]` scan rejects `Date.now(`, `new Date()`, `performance.now(` and SQL `now()`. `new Date(iso)` and `now.toISOString()` are fine.
- **AD-11.** `server/trpc` never raises a code it does not own. `Unexpected` is not a registry code: it is the formatter's fallback.
- **No driver text in bodies, ever.** `[SYS-1.R6.unexpected]` greps the whole JSON body for `relation` and `10.0.0.7`. The tRPC shape's own `message` and `data.stack` count too, at the HTTP layer.
- **Citation rule format:** `/^(AD|FR|NFR)-[A-Z0-9-]+( rule \d+)?$/`. The humanMessage must not match the PascalCase regex `/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/`. Watch out for interpolated values that are themselves codes.
- **Dependency gate (`scripts/check-deps.mjs`).** Add no new package. zod 4.6.7 and `@trpc/server` 11.19.0 are already approved.
- **Lint toolchain.** Lint runs in the isolated `tools/lint` toolchain (decision #7). The local Node 22.12 prints an EBADENGINE warning for `eslint-visitor-keys`; it is harmless.
- **`_bmad-output/project-context.md` is stale.** It predates the code (it says Next 16.3/Prisma 7.6/Supabase). The real stack is pinned in `package.json`: Next 16.4.1, tRPC 11.19.0, zod 4.6.7, Prisma 7.10.1, Better Auth 1.7.7, pg 8.23.1, local Postgres 16.6.

### Testing standards

- ATDD tests are fixed contracts (Solu-2). Do not edit them, except where a test is provably wrong; then log a decision first.
- New unit tests are colocated as `src/**/*.test.ts`, in the `impl1-unit` project. Use `VirtualClock` and `T0` from `test-support/` for time.
- Assert decisions with `explainAssert` (`test-support/solu2/fixtures.ts`).

### Cross-story notes

- **1.2** implements `redact` and `createLogger`. The 1.1 formatter must already route regulated citation keys to `redact`.
- **1.4** adds the lint rule `tezg/error-owner` and fitness probes over `raiserFor` usage. Keep `raiserFor(module)` the only way to raise.
- **2.x** implements `requireAdmin`, `requireCanBuy` and session resolution. Until then, `authed`/`canBuy`/`admin` procedures fail as `NotImplemented` at the gate, which keeps every module ATDD test red for the right reason.

### References

- [Source: docs/solu-2/planning/epics.md#Story 1.1] and §"Definition of Done (every story)"
- [Source: docs/solu-2/planning/detailed-design/contracts.md §0.3 (error body, R-9), §13 (typed error catalog, es-CO templates), §14 (invariant binding table)]
- [Source: docs/solu-2/planning/detailed-design/schemas/operations.json (ingress registry: procedure, kind, builder, omit)]
- [Source: docs/solu-2/planning/detailed-design/schemas/openapi.yaml (request schemas, `x-actor-fields-from-session`)]
- [Source: docs/solu-2/planning/ARCHITECTURE.md: AD-11, AD-16, AD-SYS-1, AD-SYS-6, AD-SYS-8, R-9]
- [Source: docs/impl-1/task-statement.md §3 (Full Ceremony)]
- [Source: docs/impl-1/ai-log/ai-decision-log.md #9 (Impl-1 CI gate)]

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), through `bmad-dev-story` in Claude Code.

### Debug Log References

- **Heredoc backslashes (Task 4).** The first insertion of the zod emitter into `scripts/gen-solu2-api.mjs` went through a Git Bash heredoc plus `String.replace`. The heredoc halved the backslashes and `replace` expanded `$&`, so the `q()` quote helper and the regex `/` escape came out corrupted. The generated `inputs.generated.ts` then failed typecheck with TS1005 (`/^https:///`). Fixed by editing both lines in place; the generator now round-trips under `gate:api:solu2`.
- **TS2353 on `DeliveryAttemptsExhausted` (Task 1).** That code is in contracts.md §13 but is a stored outcome, not a raised error, so it is not a `DomainErrorCode`. The generator types the catalog keys as `DomainErrorCode | 'Unexpected' | 'DeliveryAttemptsExhausted'` (the `storedOnly` union).
- **Red phase of Task 5.** `router.test.ts` was run before any implementation: 8 of 8 failed on `NotImplemented: server.trpc.describeProceduresV2` and the missing `serveTrpc`. After Task 5, the admin test alone stayed red, because `assertCatalogAdmin` was still the Solu-2 stub, until Task 6.
- **`Object.groupBy`.** The `tsconfig` lib predates ES2024, so the router test counts per module with a loop instead.

### Completion Notes List

- **The registry has 87 codes, not 99.** AC1 and the Dev Notes say `DOMAIN_ERRORS` has 99 codes. `src/shared-kernel/codes.ts` has 87. The §13 catalog has 89 rows: the 87 codes, plus `Unexpected` (the formatter's fallback) and `DeliveryAttemptsExhausted` (a stored outcome). The AC1 test iterates `DOMAIN_ERRORS` itself, so it covers whatever the registry holds; the number in the story text is the only thing that is wrong.
- **Missing message inputs read `(sin dato)`.** `renderMessage` fills each `{name}` only from `citations[0].inputs` (AD-SYS-1 rule 6). A missing or null input renders as `MISSING_INPUT = '(sin dato)'`, and booleans render as `sí` / `no`, so no `{…}` placeholder ever reaches a user.
- **Wire shape: `{ error: ErrorBody }` and nothing else.** The tRPC `errorFormatter` returns `toErrorBody(error, now)` itself, so the response envelope is `{ error: ErrorBody }`. That is contracts.md §0.3 ("Every refusal returns `{ error: ErrorBody }`"), and it matches the OpenAPI `ErrorBody` with `additionalProperties: false`. tRPC's `message`, `data`, `data.stack` and the driver's `error.message` never reach the wire.
  - **Trade-off:** a stock tRPC client expects `error.code` to be a JSON-RPC number. The front end (after Impl-2) will need a custom link that reads `error.code` as the registry code.
- **HTTP status from the body (R-9).** `serveTrpc` passes `responseMeta`, which sets the response status to the refusal's `httpStatus`. Without it, tRPC would derive the status from its own error code, so `AdminOnly` would answer 500 instead of 403.
- **The per-request clock.** tRPC refuses a batched call (`allowBatching: false`) or a malformed URL before it creates a context, so the formatter gets `ctx` undefined there. `serveTrpc` runs the handler inside an `AsyncLocalStorage<Clock>` (`requestClock.run(clock, …)`), and the formatter uses `ctx?.clock ?? requestClock.getStore()`. The batched-call test proves the instant is the injected `T0`; a second test proves two concurrent requests on different clocks each keep their own. (Review fix L4 replaced a module-level variable.)
- **`UNWIRED_IDENTITY`.** The builders take identity through an `IdentityGate` port: `resolveSession(headers)`, plus `requireAdmin` and `requireCanBuy` picked from identity's own use-case types (`IdnUseCases`, `IdnV2UseCases`). Until Epic 2, the default `UNWIRED_IDENTITY` throws `NotImplementedError` for each one. So every `authed`, `canBuy` and `admin` procedure fails as `Unexpected` (500) at its gate, and server/trpc never guesses an identity code (AD-11). Better Auth's handler is not mounted.
- **The router comes from a generated table, not a hand list.** The generator now also emits `PROCEDURES` (procedure, kind, builder) and `INPUTS` (the zod input of each procedure) into `src/server/trpc/inputs.generated.ts`. `router.v2.ts` builds the tree from that table. `describeProceduresV2()` reads the built router's `_def`, tagged with `.meta({ builder })`. `gate:api:solu2` (`--check`) fails if the table drifts from `operations.json`.
- **Composition root.** The only system clock, `{ now: () => new Date() }`, lives in `app/api/trpc/[trpc]/route.ts`, outside the `[SYS-6.R1]` scan of `src/`.
- **CI uses `test:ci`, not an env guard (Task 7.2).** `npm test` is now `db:up && test:ci`, and `test:ci` holds the rest of the chain. The Impl-1 workflow gets Postgres from a `postgres:16.6` service container and runs `npm run test:ci`, the same checks without docker compose.
- **Solu-1 side effect (Task 6.2).** The two `assertCatalogAdmin` tests in `docs/solu-1/tests/atdd/cat-contracts.test.ts` now pass; the other 11 in that file stay red. The Solu-1 gate is manual-only (decision #9), so this is expected.
- **Lint.** 0 errors, 3 warnings. The warnings are unused variables in three Solu-2 ATDD files this story does not touch (`com_supporting`, `inv_contracts`, `ver_supporting`). They are fixed contracts, so they are left as they are.
- **Status.** The 8.4 gates passed with the story `done` in sprint-status. It then went back to `review` for `bmad-code-review` (Full Ceremony step 6). While it is `review`, `gate:atdd-red:impl1` reports this story's 5 tests as wrongly green. After the review fixes below, the story is `done` in the same commit, and every gate was rerun with it `done`.

### Review Report

**Walkthrough** (epic entry: `docs/solu-2/planning/epics.md`, "Story 1.1", line 357).

- **Business goal.** Every client of the 108 procedures gets one refusal shape: the registry code, its HTTP status, an es-CO message and a cited decision. Screens no longer have to guess what went wrong. Driver text and stack traces never leak.
- **What changed:**
  - `raiserFor(module)` enforces AD-11 ownership: a module that raises another module's code fails as `Unexpected`.
  - `toErrorBody` maps a domain error, a zod failure (`RequestValidationFailed` with es-CO `issues`) or anything else (`Unexpected` 500), and routes regulated citation keys through `redact` (Story 1.2's body).
  - The generator now emits the es-CO catalog and the zod inputs.
  - The four builders delegate every gate to identity.
  - The router registers all 108 non-job procedures from the generated table.
  - The formatter and `responseMeta` put `{ error: ErrorBody }` on the wire with its status.
  - The Impl-1 CI gate replaces the Solu gates on push and PR.
- **Blast radius.**
  - Every tRPC response passes through the new formatter.
  - All 108 procedures now exist, but each one still throws NotImplemented in its resolver or at its identity gate.
  - CI on push and PR now runs `impl1-quality-gate`; the Solu-1 and Solu-2 workflows are manual.
  - `AdminGuard` now calls identity, which also turns 2 Solu-1 tests green.
  - No schema, migration or dependency change.
- **Verification.** AC3's 6 bound tests pass, 45 impl1-unit tests pass, and `gate:impl1` and `test:ci` pass, as listed below.

**Diff evidence.** Baseline `3187e01`. This story's commit is the `feat(story-1.1)` commit on `impl-1`; its hash is recorded as `baseline_commit` in the Story 1.2 file. The commit cannot contain its own hash.

```
$ git diff --stat 3187e01
 .github/workflows/impl1-quality-gate.yml           |  55 +++
 .github/workflows/solu1-quality-gate.yml           |   7 +-
 .github/workflows/solu2-quality-gate.yml           |   7 +-
 app/api/trpc/[trpc]/route.ts                       |  12 +-
 docs/impl-1/ai-log/ai-decision-log.md              |  14 +
 ...-request-with-one-typed-explained-error-body.md | 431 +++++++++++++++++++++
 .../implementation-artifacts/sprint-status.yaml    |   8 +-
 docs/solu-2/test/ci/quality-gate.yml               |   7 +-
 package.json                                       |   7 +-
 scripts/gen-solu2-api.mjs                          | 115 ++++++
 src/server/trpc/admin-guard.ts                     |   7 +-
 src/server/trpc/errors.test.ts                     | 117 ++++++
 src/server/trpc/errors.ts                          | 107 ++++-
 src/server/trpc/init.ts                            |  85 +++-
 src/server/trpc/inputs.generated.ts                | 243 ++++++++++++
 src/server/trpc/inputs.test.ts                     |  54 +++
 src/server/trpc/messages.generated.ts              |  97 +++++
 src/server/trpc/messages.test.ts                   |  45 +++
 src/server/trpc/messages.ts                        |  18 +
 src/server/trpc/router.test.ts                     |  94 +++++
 src/server/trpc/router.v2.ts                       |  41 +-
 src/shared-kernel/errors.ts                        |  10 +
 src/shared-kernel/raise.ts                         |  14 +-
 23 files changed, 1541 insertions(+), 54 deletions(-)
```

(Regenerated after the review fixes. The story file's own line count is from before this note and the Change Log entry were written.)

**Commands and output** (Node 22.12.0, local Postgres 16.6 on 55432).

```
$ npx vitest run --project solu2-atdd docs/solu-2/test/atdd/sys_contracts.test.ts -t "SYS-1.R2|SYS-1.R6|SYS-8.R2\]"
      Tests  5 passed | 14 skipped (19)

$ npx vitest run --project solu2-fitness          # includes [SYS-8.R2.static] and [SYS-6.R1]
 Test Files  2 passed (2)
      Tests  12 passed (12)

$ npm run test:unit                               # 45 after the review fixes (42 before)
      Tests  45 passed (45)

$ cmp .github/workflows/solu2-quality-gate.yml docs/solu-2/test/ci/quality-gate.yml   # exit 0 (review fix M2)

$ npm test                                        # db:up && test:ci, with 1-1 done; exit 0

$ npm run lint
✖ 3 problems (0 errors, 3 warnings)              # pre-existing, in untouched Solu-2 ATDD files

$ npm run typecheck                               # exit 0, no output
$ npm run gate:purity
12 domain files checked, 0 problems

$ npm run gate:deps
21 dependencies in 2 manifests: exact, approved, no high or critical advisory
$ npm run gate:prisma
55 models, each tagged with its owning module; prisma/schema.prisma is current

# with 1-1 set to done in docs/impl-1/implementation-artifacts/sprint-status.yaml:
$ npm run gate:atdd-red:impl1
solu2-atdd: 352 tests in 19 files; 347 red for the right reason; 5 green for done stories (6 contracts or test ids done); 0 not as expected

$ npm run gate:impl1                              # exit 0
142 operations, 111 ingress procedures, 159 schemas, 37 core operations checked against contracts.md; surface is current
43 pages, 327 states (138 data, 77 refusal, 112 client), 0 problems
194 code citations checked, 0 problems
190 test ids cited by contracts.md; 371 defined under docs/solu-2/test; 37 core operations
trace: 96 FRs, 56 NFRs, 61 AD rows, 20 risks, 112 clauses, 371 tests; 0 problems
docs/solu-2/planning/epics.md is current: 13 epics, 69 stories
12 domain files checked, 0 problems
 Test Files  2 passed (2)
      Tests  12 passed (12)
solu2-atdd: 352 tests in 19 files; 347 red for the right reason; 5 green for done stories (6 contracts or test ids done); 0 not as expected
solu2-nfr: 3 tests in 3 files; 3 red for the right reason; 0 green for done stories (6 contracts or test ids done); 0 not as expected

$ npx vitest run docs/solu-1/tests/atdd/cat-contracts.test.ts      # Task 6.2 side effect
      Tests  11 failed | 2 passed (13)           # the 2 passing are the assertCatalogAdmin tests
```

### Review Findings

`bmad-code-review`, fresh context, 2026-10-24. Verdict: **Changes Requested** (0 high, 2 medium, 10 low). Each fix was written test-first: the new tests were run red before the change.

| # | Sev. | Finding | Triage |
|---|---|---|---|
| M1 | Med | `invalid_value` echoed the allowed enum values (registry codes, PascalCase) into `issues` and `humanMessage`. | **Fixed.** The copy is now `no es una de las opciones permitidas`. New test: a sweep over every `INPUTS` schema and key with 6 probe values runs `explainAssert` on each decision (84 failures before the fix, 0 after). |
| M2 | Med | Nothing on push or PR compared the Solu-2 workflow with its docs mirror once that workflow went manual. | **Fixed.** `impl1-quality-gate.yml` has a `cmp` step after `test:ci`. |
| L1 | Low | Client-chosen keys (`unrecognized_keys`) were echoed verbatim, and the issue count had no cap. | **Fixed.** A path segment is echoed only if it is a number or matches `^[a-z][A-Za-z0-9]{0,63}$`; otherwise the field reads `un campo desconocido`. Issues are capped at 20. New test covers both. |
| L2 | Low | Client mistakes tRPC rejects itself (unknown procedure, wrong method, batching) answer 500 `Unexpected`. | **Decision for Martín at the Epic 1 gate.** Task 3.3 asks for exactly this mapping; changing it means a new registry code or a spec change. |
| L3 | Low | No `onError` hook logs the cause of an `Unexpected`. | **Deferred to Story 1.2**, which brings the logger and the redactor. |
| L4 | Low | The module-level `unroutedClock` could race between concurrent requests on different clocks. | **Fixed.** `AsyncLocalStorage<Clock>`; new concurrent-clocks test. |
| L5 | Low | The zod emitter wrote patterns as regex literals, accepted numeric enum values, and dropped unknown keywords silently. | **Fixed.** Patterns go through `new RegExp(JSON.stringify(…))`; numeric enum values and any unhandled keyword throw. Regenerated; `gate:api:solu2` is current. |
| L6 | Low | `z.iso.datetime()` refuses UTC offsets other than `Z`. | **Documented, no change.** contracts.md §0 fixes every instant as UTC `Z`. |
| L7 | Low | The AD-16 role-key test looked at top-level keys only. | **Fixed.** The test walks the zod tree (object, optional, nullable, array, union, record), with a self-check on a nested `role`. |
| L8 | Low | Domain messages interpolate user values, which could carry PascalCase into `humanMessage`. | **Decision for Martín at the Epic 1 gate** (it affects the catalog copy of every module). |
| L9 | Low | A unit test runs the generator `--check`. | **Won't fix.** Task 1.3 requires that test. |
| L10 | Low | The story text says 99 codes, and the diff stat was stale. | AC text is outside what dev-story may edit; the 87-code fact is in the Completion Notes. The diff stat above was regenerated after the fixes. |

### File List

- `.github/workflows/impl1-quality-gate.yml` (new)
- `.github/workflows/solu1-quality-gate.yml` (triggers → `workflow_dispatch`)
- `.github/workflows/solu2-quality-gate.yml` (triggers → `workflow_dispatch`)
- `docs/solu-2/test/ci/quality-gate.yml` (byte mirror of the solu2 workflow)
- `app/api/trpc/[trpc]/route.ts`
- `package.json` (`test`, `test:ci`, `gate:nfr-red:impl1`, `gate:impl1`)
- `scripts/gen-solu2-api.mjs` (emits the message catalog, `INPUTS` and `PROCEDURES`)
- `src/shared-kernel/errors.ts` (`UnexpectedError`)
- `src/shared-kernel/raise.ts`
- `src/server/trpc/admin-guard.ts`
- `src/server/trpc/errors.ts`
- `src/server/trpc/errors.test.ts` (new)
- `src/server/trpc/init.ts`
- `src/server/trpc/inputs.generated.ts` (new, generated)
- `src/server/trpc/inputs.test.ts` (new)
- `src/server/trpc/messages.ts` (new)
- `src/server/trpc/messages.generated.ts` (new, generated)
- `src/server/trpc/messages.test.ts` (new)
- `src/server/trpc/router.test.ts` (new)
- `src/server/trpc/router.v2.ts`
- `docs/impl-1/implementation-artifacts/sprint-status.yaml`
- `docs/impl-1/implementation-artifacts/1-1-refuse-every-request-with-one-typed-explained-error-body.md`
- `docs/impl-1/ai-log/ai-decision-log.md` (entry #9, Martín's decision)

### Change Log

- 2026-10-24: Story 1.1 implemented (Tasks 1–8). Status → `review`.
- 2026-10-25: Code-review fixes M1, M2, L1, L4, L5, L7 (see Review Findings); L2 and L8 go to Martín at the Epic 1 gate; L3 deferred to Story 1.2. Status → `done`.
