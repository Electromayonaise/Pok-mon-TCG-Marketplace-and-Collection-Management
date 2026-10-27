# AI Decision Log — Impl-1 (Foundation Build, all 12 modules)

**Scope:** TEZG Impl-1: the scaffold and 43 of the 69 Solu-2 stories, built through the BMad Full Ceremony (`853449c:docs/impl-1/task-statement.md`). Earlier entries stay in `_bmad-output/decision-logs/plan-2-decision-log.md`, `_bmad-output/decision-logs/solu-1-decision-log.md` and `_bmad-output/decision-logs/solu-2-decision-log.md`.
**Pair:** Martín Gómez, Mateo Rubio. In Impl-1, Martín takes the decisions this log records.

**Operating rule (inherited).** The agent drafts and recommends. Martín decides, through a choice menu or in his own words, at the scope stage and at each epic gate. This log records exactly what was decided and by whom. It never records an agent-inferred decision, and prompts are not reconstructed after the fact.

**Entry fields:** Phase · Persona/Skill · Prompt (summary) · AI output (summary) · Human decision (ACCEPT / MODIFY / REJECT) · Reason · Artifact changed · **Decided by**. AI proposals that were rejected, corrected or improved are tagged `[REJECTED]`, `[CORRECTED]` or `[IMPROVED]`.

**Tagged AI proposals (index):**

| Entry | Tag | AI proposal | Outcome | Decided by |
| --- | --- | --- | --- | --- |
| #2 | `[CORRECTED]` | Impl-1 = skeleton + Core, Supporting and one Failure-state per module (41), with every MEC moved to Impl-2 | Not dependency-closed; replaced by the 43-story dependency cut | Martín |
| #3 | `[IMPROVED]` | "API only; pages left for a later task" | The front end gets an owner: its own phase after Impl-2 | Martín |
| #10 | `[CORRECTED]` | Story 1.1 Task 3.3: a request tRPC itself refuses (unknown path, wrong method, batching) is 500 `Unexpected` | It is the client's mistake: 400 `RequestValidationFailed` on `la solicitud` | Martín |
| #11 | `[CORRECTED]` | Solu-2 contracts.md §13: six es-CO templates interpolate free text (a collection name, a product title, an admin's reason text, an email hint, an upload key) | No template carries free text; a test pins every placeholder to an id, instant, number, field or enum | Martín |
| #12 | `[CORRECTED]` | Solu-2 `canary_scan.test.ts`: "a non-regulated orderId survives" names `ord0`, an unpaid seed order with no comprobante, so it is never scanned | The check names `ord40`, the seed's first paid order and the first one with a comprobante | Martín |
| #14 | `[CORRECTED]` | Solu-2 `gen-solu2-api.mjs` writes each service file whole and `gate:api:solu2` compares it byte for byte | Only a marked block is generated; the service class and repository port after it are hand-owned | Martín |
| #16 | `[IMPROVED]` | Solu-2 §13 holds only refusal templates, so a successful response's `decision` has no source text | Two stored-only §13 rows, `EventDeliveryReplayed` and `EventDeliveryReplayInProgress` | Martín |
| #17 | `[CORRECTED]` | Plan-2 ARCHITECTURE §7.3: a successful replay sets `attempts + 1` | A replay leaves `attempts` unchanged; `EventReplayLog` counts replays | Martín |
| #18 | `[CORRECTED]` | Solu-2 `test-support/solu2/fitness.ts` `sqlWrites` counts `FOR UPDATE` as an `UPDATE` of the next word | A row lock is a read; the `[SYS-AD8.probe]` proves it | Martín |
| #19 | `[CORRECTED]` | Solu-2 `importViolations` checks module edges only, and the es-CO catalog lives in the tRPC adapter (`src/server/trpc`) | The catalog moves to the shared kernel; the scanner flags any kernel or module import of `src/server` | Martín |
| #20 | `[CORRECTED]` | Solu-2 `wiring()` binds the simulated `SqlOutboxV2`, which stores payloads without the AD-SYS-8 redactor | `wiring()` binds the production `PgOutboxV2` | Martín |

---

### 1. Impl-1 covers all 12 modules, and the project must end up with every story (Scope)

- **Phase:** 0 (statement adaptation).
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** Martín attaches the Impl-1 course statement and asks to adapt it to this repository. In his words: *"a diferencia del enunciado nosotros debemos de hacer todos los modulos y todas las hus (es un proyecto solo de los 2, que la idea es que quede completo)"*. He asks for the adaptation in a new folder and for the important decisions to be put to him, because this log must record his decisions.
- **AI output (summary):** The agent explained what Impl-1 asks for: a runnable hexagonal scaffold, 3 core stories of one module, ≥ 90 % passing tests, `sprint-status.yaml`, a walkthrough and this log. It noted that failure recovery and advanced testing are explicitly Impl-2's, then put the open decisions to Martín: the story cut, UI, deployment and gate cadence.
- **Human decision:** All 12 modules and, across Impl-1 and Impl-2, all 69 stories.
- **Reason:** TEZG is the pair's own product, not one module of a shared system, so a one-module slice would leave it incomplete. This is the same reading Plan-2 #1 and Solu-2 #1 made.
- **Artifact changed:** `853449c:docs/impl-1/task-statement.md` (scope note, Appendix B).
- **Decided by:** Martín.

### 2. `[CORRECTED]` The Impl-1 story cut: from "3 per module" to the dependency-closed 43 (Scope)

- **Phase:** 0.
- **Persona/Skill:** none (session planning), reading `_bmad-output/planning-artifacts/epics.md`.
- **Prompt (summary):** Which stories enter Impl-1, given that the statement leaves failure recovery and advanced testing to Impl-2?
- **AI output (summary):** The agent offered three cuts and recommended **B**: Epic 1 plus 3 stories per module (a Core, a Supporting and a validation Failure-state), 41 in all, with the MEC stories and the remaining Failure-state stories moved to Impl-2. The alternatives were **A**, all 69 now, and **C**, skeleton plus Core and MEC.
  - Martín chose B.
  - Before writing anything, the agent extracted every story's `Depends on` line and found that B is not buildable. Several Core stories depend on MEC stories that B moved out:
    - 3.1 ← 2.2;
    - 8.1 and 9.1 ← 3.2;
    - 4.4 and 4.5 ← 4.2, and 5.1 ← 4.5;
    - 7.1 ← 5.2;
    - 13.1 ← 7.5 ← 7.2.
  - The recommendation had been made without checking dependencies. The corrected proposal is the dependency cut: skeleton + every Core + every MEC, plus the 8 stories those need (2.3, 2.5, 3.5, 4.4, 4.5, 5.6, 6.1, 7.5). That gives 43 stories, and Impl-2 keeps the other 26 Failure-state and Supporting stories. The alternative offered was all 69 now.
- **Human decision:** ACCEPT the dependency cut (43). This replaces his earlier choice of B.
- **Reason:** It is the only cut where no Impl-1 story depends on an Impl-2 story. A script check over `epics.md` found no Impl-1 story with an Impl-2 dependency. What Impl-2 inherits is what the course assigns it: refusals, recovery and advanced testing.
- **Artifact changed:** `853449c:docs/impl-1/task-statement.md` Appendix B.
- **Decided by:** Martín.

### 3. `[IMPROVED]` API only in Impl-1 and Impl-2; the front end is its own phase after Impl-2 (Scope)

- **Phase:** 0.
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** Do we build UI in Impl-1? Plan-2 specifies 43 pages, but the statement only requires endpoints.
- **AI output (summary):** The agent recommended API only, and left the pages "for a later task".
  - Martín asked: *"aqui si hacemos solo api se cubre el front despues en algun punto? o no sabemos?"*
  - The agent answered that no course statement we have covers the front end. The Impl-1 statement mentions only Impl-2's failure recovery and advanced testing, so the "later task" had no owner.
  - It re-asked with three options: API now with the front end as a phase of its own after Impl-2 *(recommended: pages also render error states, so building them before Impl-2's refusals exist means rebuilding them)*; pages with each Impl-1 story; or all pages inside Impl-2.
- **Human decision:** ACCEPT API now, front end after Impl-2.
- **Reason:** Martín's question turned an open deferral into a planned phase. The project stays complete without the course having to ask for it.
- **Artifact changed:** `853449c:docs/impl-1/task-statement.md` (§1, Appendix B.3).
- **Decided by:** Martín.

### 4. Run locally only, through Docker Compose (Scaffold)

- **Phase:** 0 (for Phase 1).
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** Where does the app run in Impl-1?
- **AI output (summary):** The agent recommended local only. `docker compose up` brings up Postgres 16 and the app, and one `npm` command runs everything. The reason given: the statement grades a deterministic one-command local run, and a real deployment brings in credentials and external services. The alternative offered: also deploy to Vercel Hobby + Supabase, as Plan-2's ARCHITECTURE describes.
- **Human decision:** ACCEPT local only.
- **Reason:** Determinism and a clean-clone run are what the checklist verifies. A deployment is left for later.
- **Artifact changed:** `853449c:docs/impl-1/task-statement.md` (§1, §6.2, Appendix A).
- **Decided by:** Martín.

### 5. One review and sign-off gate per epic (Governance)

- **Phase:** 0 (for Phases 2–3).
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** At which points does Martín review and sign off? This decides where his entries in this log come from.
- **AI output (summary):** The agent recommended a gate per epic. The agents take each story through the whole ceremony, including a fresh-context code review. At each epic's close, Martín triages the findings, accepts or rejects corrections and signs. The alternatives offered: a gate per story (most control, slowest) or per phase (fastest, fewer decisions of his in the log).
- **Human decision:** ACCEPT a gate per epic.
- **Reason:** With 43 stories, a per-story gate slows the build without adding control, because the code review runs on every story anyway. A per-epic gate still gives 13 decision points.
- **Artifact changed:** `853449c:docs/impl-1/task-statement.md` §3 (epic gate).
- **Decided by:** Martín.

### 6. Prisma is the model generated from the DDL and Better Auth's adapter; repositories stay on SQL (Scaffold)

- **Phase:** 1 (scaffold).
- **Persona/Skill:** `bmad-agent-dev` (repository inspection before the scaffold).
- **Prompt (summary):** What does Prisma do in Impl-1? Stack Decision 2 and R-8 say "the Prisma 7.6 model is generated from the DDL at implementation time", but R-14 left every repository on the `Sql`/`Tx` port (`infra/pg.ts`), and the 352 ATDD tests are wired to raw `pg`.
- **AI output (summary):** The agent found that no code uses Prisma and offered three roles:
  - **(recommended)** generate `prisma/schema.prisma` from the DDL with `prisma db pull`, annotate each model with `/// @owner <module>`, gate it against drift, and use it as Better Auth's adapter. Repositories stay on SQL. This is what the architecture already says.
  - Drop Prisma and run Better Auth on the `pg` pool. This is leaner, but amends Stack Decision 2 and R-8.
  - Rewrite the repositories on Prisma. This contradicts R-14 and rewires the suite; not recommended.
- **Human decision:** ACCEPT the generated model + Better Auth adapter.
- **Reason:** It keeps the accepted architecture without an amendment. Invariants keep living in SQL (conditional `UPDATE`s in the caller's transaction), where the ports and tests already put them.
- **Artifact changed:** `prisma/schema.prisma`, `prisma.config.ts`, `package.json` (`db:pull`, `gate:prisma`).
- **Decided by:** Martín.

### 7. Lint runs in an isolated toolchain on TypeScript 5.9; the code stays on TypeScript 7 (Scaffold)

- **Phase:** 1 (scaffold).
- **Persona/Skill:** `bmad-agent-dev`.
- **Prompt (summary):** The statement asks for ESLint. `typescript-eslint` 8 declares `typescript >=4.8.4 <6.1.0`, and TypeScript 7.0.2 (Stack Decision 1) ships no JavaScript compiler API (`ts.createSourceFile` is undefined), so ESLint cannot parse the code.
- **AI output (summary):** The agent first checked that Next.js 16.3 builds with TypeScript 7 (a scratch build passed), so the conflict is ESLint's alone. It offered three ways out:
  - **(recommended)** a lint toolchain in `tools/lint/` with its own manifest: ESLint 9, `typescript-eslint` 8 and TypeScript 5.9.3, used only to parse. The root `npm run lint` invokes it.
  - Downgrade the repository to TypeScript 5.9.3. This changes Stack Decision 1.
  - Oxlint instead of ESLint. This departs from the statement and from Story 1.4's `eslint.config.mjs`.
- **Human decision:** ACCEPT the isolated lint toolchain.
- **Reason:** It keeps Stack Decision 1, the statement's linter and Story 1.4's rule file. The second TypeScript never type-checks or builds the product.
- **Artifact changed:** `tools/lint/package.json`, `eslint.config.mjs`, `package.json` (`lint`); `gate:deps` covers both manifests.
- **Decided by:** Martín.

### 8. Prisma 7.10.1, Next.js 16.4.1 and zod 4.6.7: the vendor fixes, so the audit is clean (Scaffold)

- **Phase:** 1 (scaffold).
- **Persona/Skill:** `bmad-agent-dev` (`gate:deps`, statement §4.2–4.3).
- **Prompt (summary):** The first install's `npm audit --omit=dev` failed the dependency gate:
  - Next.js 16.3.8: a critical RCE in image optimization (16.0.0–16.4.0);
  - zod 4.6.5: a high advisory (fixed in 4.6.6);
  - the Prisma 7.6 tree: `deepmerge-ts` and `mysql2` (high), `@hono/node-server` and `valibot` (moderate). It counts as production because `@prisma/client` peers on `prisma`.

  Stack Decision 2 and the statement name Prisma 7.6.
- **AI output (summary):** With Next.js 16.4.1, zod 4.6.7 and Prisma 7.10.1 the audit reports nothing, and the whole gate stays green. The agent offered three ways:
  - **(recommended)** take those versions: the vendors' own fixes within the same majors. The statement's "Prisma 7.6" becomes "Prisma 7.10".
  - Keep Prisma 7.6 and force patched `deepmerge-ts` and `mysql2` through npm `overrides`. This keeps the literal version, but pairs Prisma with transitive versions it was never tested with.
  - Keep 7.6 and give `gate:deps` a list of accepted advisories. This breaks the statement's zero high-or-critical rule; not recommended.
- **Human decision:** ACCEPT Prisma 7.10.1, Next.js 16.4.1 and zod 4.6.7.
- **Reason:** It is the only option that clears the audit without hand-forced transitive versions, and it stays within the majors the Stack Decisions fix.
- **Artifact changed:** `package.json`, `package-lock.json`, `scripts/check-deps.mjs` (approval references), `853449c:docs/impl-1/task-statement.md` (§1 Stack, §4.2).
- **Decided by:** Martín.

### 9. Impl-1 gets its own CI gate; the Solu-1 and Solu-2 red gates become manual evidence (Governance)

- **Phase:** 2 (Epic 1, preparing Story 1.1).
- **Persona/Skill:** `bmad-create-story`.
- **Prompt (summary):** Story 1.1 turns 5 Solu-2 ATDD tests green, and its `AdminGuard` turns 2 Solu-1 tests green (`cat-contracts.test.ts`). Both `solu1-quality-gate.yml` and `solu2-quality-gate.yml` run on every PR and every push to `main`, and their red gates read the frozen Solu-1 and Solu-2 `sprint-status.yaml`, where nothing is `done`. From Story 1.1 on, both workflows would fail on a correct implementation. `npm test` has the same problem: `gate:solu2` includes the Solu-2 red gate.
- **AI output (summary):** The agent offered three options:
  - **(recommended)** a new `impl1-quality-gate.yml` that runs `npm test`: the Solu-2 static gates plus the red gate pointed at the Impl-1 status. The two Solu workflows lose their push and PR triggers. They stay runnable by hand (`workflow_dispatch`), and `32e2b57` remains their green evidence.
  - Change only `npm test`; PRs to `main` would then show red checks.
  - Point the Solu workflows at the Impl-1 status. This edits the Solu-2 deliverable mirror and loses the historical evidence.
- **Human decision:** ACCEPT the Impl-1 CI gate.
- **Reason:** It is what the statement's Phase 0 asks for ("point the red gate at it"), and the CI stops showing false reds.
- **Artifact changed:** `.github/workflows/impl1-quality-gate.yml` (new); the triggers of `.github/workflows/solu1-quality-gate.yml` and `solu2-quality-gate.yml`, plus its mirror `_bmad-output/test-artifacts/ci/quality-gate.yml`; `package.json` (`gate:impl1`, `test`). All of these land in Story 1.1.
- **Decided by:** Martín.

### 10. `[CORRECTED]` A request tRPC refuses on its own is the client's mistake, not a 500 (API)

- **Phase:** 2 (Epic 1, Story 1.1 code-review triage).
- **Persona/Skill:** `bmad-code-review` (finding L2), triaged with `bmad-agent-dev`.
- **Prompt (summary):** The fresh-context review of Story 1.1 found that the refusals tRPC makes before any procedure runs answer 500 `Unexpected`: an unknown procedure (`NOT_FOUND`), a wrong HTTP method (`METHOD_NOT_SUPPORTED`), a batched call (`BAD_REQUEST`, R-9), malformed JSON (`PARSE_ERROR`), and an unsupported content type or oversize body. Story 1.1's own Task 3.3, which the agent wrote, asked for exactly this. Martín asked what the agent recommended.
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** map those rejections to `RequestValidationFailed` (400), with the field `la solicitud`. A 500 means "we failed"; once Story 1.2 logs every `Unexpected`, each client mistake would show up as a server failure and muddy the monitoring. `RequestValidationFailed` already exists in the shared kernel, so the registry gains no code, and no Solu-2 ATDD test asks for the 500. Cost: correct Task 3.3, adjust 2 tests, log the decision.
  - Keep the spec as written: free, but it sends the wrong signal.
  - A new code such as `ProcedureNotFound` (404): it changes the registry and costs more for little gain.
- **Human decision:** ACCEPT the mapping. In Martín's words: *"Vámonos con lo que recomiendas en ambos casos, y continúa"*. Applying it, the agent covered the six codes tRPC raises on its own (the three above plus `PARSE_ERROR`, `UNSUPPORTED_MEDIA_TYPE` and `PAYLOAD_TOO_LARGE`), each with its own es-CO issue, and tRPC's message never reaches the body.
- **Reason:** The client caused these refusals, and the registry already has the code for a malformed request; nothing new enters the contract.
- **Artifact changed:** `src/server/trpc/errors.ts` (`REQUEST_REFUSALS`), `src/server/trpc/errors.test.ts`, `src/server/trpc/router.test.ts`, the Story 1.1 Review Findings and Change Log.
- **Decided by:** Martín.

### 11. `[CORRECTED]` No refusal message interpolates free text (API copy)

- **Phase:** 2 (Epic 1, Story 1.1 code-review triage).
- **Persona/Skill:** `bmad-code-review` (finding L8), triaged with `bmad-agent-dev`.
- **Prompt (summary):** The review found that some es-CO templates in Solu-2 `contracts.md` §13 fill a placeholder with a value the user typed. `explainAssert` forbids a PascalCase token in a `humanMessage`, so a legitimate value breaks it: a collection named "MiColección" makes `CollectionNameTaken` ("Ya tienes una colección llamada {name}.") fail. The agent named `{name}`, `{title}`, `{reasonText}` and `{cause}`.
- **AI output (summary):** The agent offered two ways:
  - **(recommended)** remove the free text from the templates (for example "Ya tienes una colección con ese nombre."), keeping dates, ids, numbers and enum values. The rule then always holds, the same kind of sweep added for review finding M1 can prove it, the Solu-2 test helper stays untouched, and the client already knows the value it sent. Cost: about 5 templates in §13, then regenerate.
  - Quote user values in «…» and have the check skip quoted text. It reads better, but it means changing `explainAssert`, a Solu-2 test helper that should stay fixed.
- **Human decision:** ACCEPT the removal. In Martín's words: *"Vámonos con lo que recomiendas en ambos casos, y continúa"*. Applying it, the agent traced each placeholder to its source. `{cause}` is an enum (`missing`, `size`, `magic`, `scanner`), so it stays. Two more carry free text and were removed: `EmailNotVerified {emailHint}` (the user's address) and `InvalidDocumentFile {key}` (a client-chosen upload key). The six rewritten templates are `CollectionNameTaken`, `SealedProductInBundle` (now cites `{itemRef}`), `ReapplicationBarred`, `ListingNotPurchasable`, `EmailNotVerified` and `InvalidDocumentFile`.
- **Reason:** A refusal body depends only on the code, the citations and `now` (S-2); free text in it can leak personal data or break the explanation rule, and the client already knows what it sent.
- **Artifact changed:** `_bmad-output/planning-artifacts/detailed-design/contracts.md` §13 (six templates), `src/server/trpc/messages.generated.ts` (regenerated), `src/server/trpc/messages.test.ts`, the Story 1.1 Review Findings and Change Log.
- **Decided by:** Martín.

### 12. `[CORRECTED]` The canary scan's "orderId survives" check names an order the scan never sees (Testing)

- **Phase:** 2 (Epic 1, Story 1.2 dev-story).
- **Persona/Skill:** `bmad-dev-story`.
- **Prompt (summary):** With the redactor and the logger implemented, `[NFR-SYS-8.canary]` captures 0 canaries, but its last assertion fails. It expects the captured text to contain `id('ord0')`. The test scans only orders with `"comprobanteObjectKey" IS NOT NULL`, and in `seed-marketplace.ts` orders `ord0`–`ord39` are overdue or unpaid, so they carry no comprobante (`order_paid_requires_comprobante`; the `order` fixture adds one only when `paidAt` is set). In Solu-2 the defect never showed, because the test failed earlier with `NotImplemented`. Editing a fixed Solu-2 test needs Martín's decision.
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** change one line of the test, `id('ord0')` → `id('ord40')`, the seed's first paid order. It keeps the intent (a non-regulated `orderId` survives redaction) and leaves the shared seed alone.
  - Give `ord0` a comprobante in the seed. The test stays as written, but a fixture other NFR tests share (`[NFR-ORD-2.p95]`) would change.
  - Scan every order, dropping the filter. It is a larger change and dilutes the comprobante probe.
- **Human decision:** ACCEPT the one-line change.
- **Reason:** It is the smallest fix that keeps the test's intent, and the seed stays what other tests rely on.
- **Artifact changed:** `_bmad-output/test-artifacts/nfr/canary_scan.test.ts` (line 47 and a comment citing this entry); the Story 1.2 Debug Log and Change Log.
- **Decided by:** Martín.

### 13. Pace: the full ceremony per story, with one full test run at its end (Process)

- **Phase:** 2 (Epic 1, between Stories 1.2 and 1.3).
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** After Story 1.2, how should the remaining 41 stories be paced?
- **AI output (summary):** The agent put pace options to Martín in the session that closed Story 1.2. This entry records the option as Martín restated it in the continuation prompt of 2026-10-25; the menu itself is not reconstructed.
- **Human decision:** Option A. In Martín's words: *"se mantiene la ceremonia completa por historia. Dev Notes breves (solo lo que cambia), pruebas puntuales durante el desarrollo y un único npm test completo al final, tras el triage. Nada de revisión agrupada por epic ni de historias en paralelo."*
- **Reason:** Each story keeps its own create, dev, review and triage evidence. Targeted runs keep development fast, and the one full `npm test` after triage is the evidence that counts.
- **Artifact changed:** none (process); applied from Story 1.3 on.
- **Decided by:** Martín.

### 14. `[CORRECTED]` Generated service files: a marked block, the rest hand-owned (Tooling)

- **Phase:** 2 (Epic 1, Story 1.3 create-story).
- **Persona/Skill:** `bmad-create-story`.
- **Prompt (summary):** The service files (`admin-events.ts` and the 12 modules' `application/*.v2.ts`) are generated stubs that `gate:api:solu2` compares byte for byte, so no story can implement a service without breaking the gate.
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** the generator keeps only the imports and the `UseCases` and `Deps` interfaces between `// <gen-solu2-api>` markers; the service class and the `Repository` interface become hand-owned. It is the mechanism `index.ts` already uses, and the gate still catches contract drift against `operations.json` for all 43 stories.
  - Drop the GENERATED header from a file when its story starts, and have the generator skip it. Simpler, but that file is no longer checked against `operations.json`.
  - Put the implementation in another file and re-export it from the stub. It changes the generator and leaves two files per service.
- **Human decision:** ACCEPT the marked block.
- **Reason:** The contract surface stays generated and checked, and the hand-written code has a place the generator never overwrites.
- **Artifact changed:** `scripts/gen-solu2-api.mjs`; the 13 application files, the 12 `ports/*.v2.ts` files and `src/shared-kernel/admin-events.ts` (converted to the marked layout).
- **Decided by:** Martín.

### 15. The replay log is written by the repository, through a callback in the settling transaction (Architecture)

- **Phase:** 2 (Epic 1, Story 1.3 create-story).
- **Persona/Skill:** `bmad-create-story`.
- **Prompt (summary):** Who writes `EventReplayLog`, which needs a cuid? The dispatcher receives only `{ transactions, clock }` (R-17), and the service may touch tables only through `repo` (R-14), which `wiring()` binds to `{}`.
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** `PgAdminEventsRepository.insertReplayLog`, bound in `wiring().repo`; `dispatcher.replay` takes a `record(tx, outcome)` callback instead of `adminId` and calls it in the transaction that settles the outcome. The log is atomic with the outcome, R-14 and R-17 hold, and every module can follow the pattern.
  - The service writes the log in its own transaction after `replay`. Simpler, but a crash between the two leaves a replay without its audit row.
  - A direct INSERT from the service, which breaks R-14.
- **Human decision:** ACCEPT the repository and callback.
- **Reason:** An audit row that can be lost is not an audit row; the callback keeps it in the same commit as the outcome without widening the dispatcher's dependencies.
- **Artifact changed:** `src/shared-kernel/dispatcher.ts`, `src/shared-kernel/admin-events.ts`, `src/shared-kernel/infra/pg-admin-events.ts` (new), `test-support/solu2/fixtures.ts`.
- **Decided by:** Martín.

### 16. `[IMPROVED]` A successful replay's explanation comes from two stored-only §13 rows (API copy)

- **Phase:** 2 (Epic 1, Story 1.3 create-story).
- **Persona/Skill:** `bmad-create-story`.
- **Prompt (summary):** There is no convention for the `decision` of a successful response: the es-CO catalog holds only error codes. What does a delivered or no-op replay carry?
- **AI output (summary):** The agent offered two ways:
  - **(recommended)** add two stored-only rows to `contracts.md` §13, as `DeliveryAttemptsExhausted` already is: `EventDeliveryReplayed` and `EventDeliveryReplayInProgress` (`{status}`); the generator emits them. A failed replay uses the handler's code with outcome `rejected`. One source of templates (AD-SYS-1 rule 6), and the code registry is untouched.
  - es-CO constants inside `admin-events.ts`. Faster, but it breaks the single source of templates.
- **Human decision:** ACCEPT the stored-only rows.
- **Reason:** Every humanMessage keeps coming from §13, so the template checks of decision #11 cover these two as well.
- **Artifact changed:** `_bmad-output/planning-artifacts/detailed-design/contracts.md` §13 (two rows), `src/server/trpc/messages.generated.ts` (regenerated), `scripts/gen-solu2-api.mjs` (comment).
- **Decided by:** Martín.

### 17. `[CORRECTED]` A replay does not count as an attempt (Architecture)

- **Phase:** 2 (Epic 1, Story 1.3 create-story).
- **Persona/Skill:** `bmad-create-story`.
- **Prompt (summary):** A contract conflict. Plan-2 ARCHITECTURE §7.3 says a successful replay sets `attempts + 1`, but the CHECK `event_delivery_attempts_cap` (`status = 'failed' OR attempts <= 3`) rejects a `delivered` row with `attempts = 4`, and exhausted deliveries (`attempts = 3`) are the ones an admin replays most.
- **AI output (summary):** The agent offered two ways:
  - **(recommended)** `attempts` counts automatic attempts only, as the CHECK's own comment says; replays are counted in `EventReplayLog`, and §7.3 is corrected. No schema change, no migration, nothing counted twice.
  - Relax the CHECK to `status <> 'pending' OR attempts <= 3` and keep `attempts + 1`. It means editing `001_tezg_schema.sql` and regenerating.
- **Human decision:** ACCEPT: a replay leaves `attempts` unchanged.
- **Reason:** The schema already states the intent, and the replay count has its own append-only table.
- **Artifact changed:** `_bmad-output/planning-artifacts/ARCHITECTURE.md` §7.3 (Effect row, citing this entry), `src/shared-kernel/dispatcher.ts`, `src/shared-kernel/dispatcher.test.ts` (a replay at `attempts = 3`).
- **Decided by:** Martín.

### 18. `[CORRECTED]` The table-ownership scanner reads a row lock as a write (Testing)

- **Phase:** 2 (Epic 1, Story 1.3 dev-story).
- **Persona/Skill:** `bmad-dev-story`.
- **Prompt (summary):** With the dispatcher implemented, `[SYS-AD8]` fails with `src/shared-kernel/dispatcher.ts: writes unknown table SKIP` (twice). The Solu-2 helper `sqlWrites` matches `UPDATE <word>`, so the row lock `SELECT … FOR UPDATE SKIP LOCKED` that AD-SYS-2 rule 4 and ARCH §7.3 prescribe reads as an UPDATE of a table named `SKIP`. No source file locked a row before. Editing a fixed Solu-2 test helper needs Martín's decision (as in #12).
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** one line in `sqlWrites` (`test-support/solu2/fitness.ts`): an `UPDATE` preceded by `FOR` is not a write; plus one assertion in `[SYS-AD8.probe]` (`sys_fitness.test.ts`) that proves it, seen red and then green. The smallest change; the gate keeps its intent and the fix is proven.
  - Fix the helper only, leaving `sys_fitness.test.ts` untouched; the fix would have no test of its own.
  - Assemble the dispatcher's SQL so its text never reads `FOR UPDATE`. Nothing in Solu-2 changes, but the scanner defect stays hidden and the SQL is harder to read.
- **Human decision:** ACCEPT the scanner fix with the probe assertion.
- **Reason:** A row lock writes nothing; the gate should flag foreign writes, not the locking the architecture requires.
- **Artifact changed:** `test-support/solu2/fitness.ts` (`sqlWrites`), `_bmad-output/test-artifacts/fitness/sys_fitness.test.ts` (`[SYS-AD8.probe]`, one assertion with a comment citing this entry).
- **Decided by:** Martín.

### 19. `[CORRECTED]` The shared kernel never imports the tRPC adapter, and the import scanner proves it (Architecture)

- **Phase:** 2 (Epic 1, Story 1.3 code review triage).
- **Persona/Skill:** `bmad-code-review` (fresh context), triage.
- **Prompt (summary):** Review finding M3: `src/shared-kernel/admin-events.ts` imports `renderMessage` and `MESSAGES` from `src/server/trpc/`, so the kernel depends on its driving adapter. `[SYS-AD1]` stays green because the Solu-2 helper `importViolations` (`test-support/solu2/fitness.ts`) only checks edges between modules. Editing a fixed Solu-2 test helper needs Martín's decision (as in #12 and #18).
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** move the catalog (`messages.ts`, `messages.generated.ts` and its test) into `src/shared-kernel/`, leave `src/server/trpc/messages.ts` as a re-export, point the generator at the new path, and extend `importViolations` so any kernel or module file importing `src/server/` is flagged, proven by a planted case in `[SYS-AD1.probe]`. The dependency points inward again and the gate keeps it so.
  - Move the catalog without the scanner rule. The same fix, but nothing stops the edge from coming back.
  - Keep the import and record it as accepted debt. No change now, but every later service that explains a decision would copy it.
- **Human decision:** ACCEPT the move with the scanner rule.
- **Reason:** The es-CO catalog is domain copy that every module's decisions use; it belongs in the kernel, and the fitness gate should catch the inverted edge.
- **Artifact changed:** `src/shared-kernel/messages.ts`, `messages.generated.ts`, `messages.test.ts` (moved from `src/server/trpc/`), `src/server/trpc/messages.ts` (re-export), `src/shared-kernel/admin-events.ts` (imports), `scripts/gen-solu2-api.mjs` (output path), `test-support/solu2/fitness.ts` (`importViolations`), `_bmad-output/test-artifacts/fitness/sys_fitness.test.ts` (`[SYS-AD1.probe]`, one assertion with a comment citing this entry).
- **Decided by:** Martín.

### 20. `[CORRECTED]` The test wiring binds the production outbox (Testing)

- **Phase:** 2 (Epic 1, Story 1.3 code review triage).
- **Persona/Skill:** `bmad-code-review` (fresh context), triage.
- **Prompt (summary):** Review finding L5: the Solu-2 fixture `wiring()` (`test-support/solu2/fixtures.ts`) binds the simulated `SqlOutboxV2`, which writes the payload as given. The production `PgOutboxV2` runs it through the AD-SYS-8 redactor, so no ATDD or NFR suite ever exercises the outbox egress. Editing a fixed Solu-2 fixture needs Martín's decision.
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** bind `PgOutboxV2` in `wiring()`. Both write the same rows, so the suites keep passing, and every publishing story is then tested through the real egress.
  - Add redaction to `SqlOutboxV2`. Nothing in the wiring changes, but two outboxes must then be kept in step.
  - Keep `SqlOutboxV2` and rely on the `PgOutboxV2` unit tests. No change, but an event published by a later story would never be seen redacted end to end.
- **Human decision:** ACCEPT the production outbox in `wiring()`.
- **Reason:** The suites should test what runs; the simulated outbox had no behaviour the real one lacks.
- **Artifact changed:** `test-support/solu2/fixtures.ts` (`wiring()`, with a comment citing this entry), `_bmad-output/test-artifacts/fixtures/README.md` (`sim_events` row).
- **Decided by:** Martín.

### 21. Who wires the post-commit dispatch and the sweeper (Planning)

- **Phase:** 2 (Epic 1, Story 1.3 code review triage).
- **Persona/Skill:** `bmad-code-review` (fresh context), triage.
- **Prompt (summary):** Review finding M4: Story 1.3 builds `dispatch()` and `sweep()` but nothing calls them yet. No story publishes an event, and no `/api/jobs/*` endpoint exists. Without an owner, the first published event would sit `pending` with nothing to deliver it.
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** first use owns the wiring. The first story that publishes an event wires the post-commit `dispatch()` with `PgOutboxV2` into the composition root. The first story that creates a `/api/jobs/*` endpoint (Story 4.4, `trm-fetch`) wires `sweep()` into it and into the hourly tick. Both are written in the Story 1.3 cross-story notes and as an Epic 1 gate pending item. Each piece is built when something needs it, and the gate checks it was not forgotten.
  - Wire both now in Story 1.3, with a job endpoint built ahead of its story. Done once, but it adds a route no story asked for yet.
  - Leave it to Story 1.5 (the delivery health views). That story reads deliveries but publishes nothing, so the wiring would sit there untested.
- **Human decision:** ACCEPT first use owns the wiring.
- **Reason:** Each piece is wired by the first story that can test it, and the gate catches it if that story forgets.
- **Artifact changed:** `_bmad-output/implementation-artifacts/1-3-deliver-every-committed-event-exactly-once-in-effect.md` (cross-story notes).
- **Decided by:** Martín.

### 22. The delivery cut: foundation plus three Identity stories, then an epic-batched flow (Scope)

- **Phase:** 2 (after Story 1.3, the day before the Impl-1 delivery).
- **Persona/Skill:** none; a scope review against the verbatim course statement.
- **Prompt (summary):** Martín compared the plan with the original statement: one group delivers the foundation scaffold plus 3 core stories of a module in 4–6 hours. The full ceremony took most of a day for Story 1.3 alone, so the 43-story cut (#1, #2) cannot be delivered tomorrow. Stories 1.1–1.3 are cross-cutting infrastructure, not the direct functionality the statement's core stories describe. And the project must still end up complete.
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** Deliver the foundation (scaffold and Stories 1.1–1.3) plus the Identity chain 2.1 (Core), 2.2 (MEC) and 2.3 (Failure-state). Their dependencies are all done, and they are one module's user-facing stories, as the statement asks. The three run the same ceremony steps in compact form: a short story file, `bmad-dev-story` test-first, `bmad-code-review` in a subagent in the same session, triage of High and Medium findings only, and log entries only for real decisions. The walkthrough and README come last, with an hour kept for them: 2 stories with the walkthrough beat 3 without it. After the delivery, the rest of the 43 continue epic by epic: `bmad-quick-dev` takes the ATDD tests as the spec, there is one code review per epic, story files are minimal and each story still gets its own commit. The red gate keeps the quality net: a story marked `done` must turn its ATDD tests green.
  - Deliver 1.1–1.3 as the 3 stories and spend the time on documents only. It is the cheapest, but the stories are infrastructure, and a grader may read them as the scaffold.
  - Keep the 43-story cut with the full ceremony. It is the plan as written, but it cannot be delivered on time, and it leaves the walkthrough unwritten.
- **Human decision:** ACCEPT the delivery cut and the epic-batched flow afterwards.
- **Reason:** It meets the statement as written, with one module's Core, MEC and Failure-state stories built on a foundation that is already reviewed. The epic-batched flow is the only pace at which the whole product gets finished, and the ATDD tests and gates still hold every story to its contract.
- **Artifact changed:** `853449c:docs/impl-1/task-statement.md` (scope note, §1, §3, §5, §6, Appendices A and B), `_bmad-output/implementation-artifacts/sprint-status.yaml` (`impl1_delivery`).
- **Decided by:** Martín.

### 23. A proof-only story is committed right after the story it proves; the gate stays as it is (Process)

- **Phase:** 3 (Stories 2.1 and 2.2).
- **Persona/Skill:** `bmad-dev-story`, then the `scripts/check-atdd-red.mjs` gate.
- **Prompt (summary):** Implementing Story 2.1 turned three of Story 2.2's four tests green before 2.2 was `done`. 2.2 is proof-only (Files: —): its tests prove IDN-1, which 2.1 owns. The red gate therefore flagged them as premature greens at the 2.1 commit, against F-5's "implementing a story never breaks the gate". The epics file holds about 19 such proof-only stories.
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** Commit the owning story and its proof story back to back, and leave the gate unchanged. The gate goes green again at the proof commit, F-5 keeps its full strictness, and the epic batches commit both stories together anyway.
  - Let the gate accept the green tests of a proof-only story once its owning story is `done`. Intermediate commits stay green, but the gate gets looser.
  - Combine the owning story and its proof in one commit. This breaks the one-commit-per-story rule.
- **Human decision:** ACCEPT the recommendation.
- **Reason:** It keeps both rules, the strict gate and one commit per story. The red gate appears only on a local intermediate commit that is never pushed on its own, and the commit after it restores green.
- **Artifact changed:** none (practice). Applied in `7f903f2` (2.1) followed by `2189038` (2.2).
- **Decided by:** Martín.

### 24. The two done procedures are wired behind a real session before the delivery (Scope)

- **Phase:** 3 (after Story 2.3, the day before the Impl-1 delivery).
- **Persona/Skill:** none; a compliance check against the verbatim course statement.
- **Prompt (summary):** Martín asked whether the delivery fully meets the statement. The agent found that the six stories are proven only through their services. Over HTTP, every `authed` and `admin` procedure still fails as `Unexpected` (500), because the router gates through `UNWIRED_IDENTITY`, no production composition root builds the services, no production `TransactionRunner` exists, and Better Auth's handler is not mounted. Two procedures belong to done stories: `access.completeIndividualProfile` (IDN-1.ingress, Story 2.1) and `admin.events.replay` (S-SYS.replay, Story 1.3). Story 2.3 has no procedure; its projection is an outbound port that later stories call. Story 2.1's notes also said, wrongly, that no `access.*` procedure exists; Story 1.1 registered it.
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** Wire the two procedures now and pull forward only what they need: a production composition root (`src/server/composition.ts`), a production `PgTransactionRunner` shared with the test harness, Better Auth mounted at `/api/auth/*` with a `SessionReader` port in identity, and a real `IdentityGateV2` in identity (session → `NotAuthenticated` 401; `isAdmin` → `AdminOnly` 403; `requireCanBuy` stays Story 2.4's). HTTP tests go through `serveTrpc` with a signed Better Auth session cookie. Sign-up and sign-in stay unconfigured, because no Impl-1 story owns them. The subscribers' handlers stay unwired until their stories, so a production replay records `failed`.
  - Leave the wiring to Epic 2 and record it as a known limit. Nothing changes the day before the delivery, but a grader calling the API sees only 500s for the delivered stories.
  - Wire every registered procedure. Impossible: most belong to stories after the cut.
- **Human decision:** ACCEPT the recommendation.
- **Reason:** The delivered stories become callable end to end, with their gates proven over HTTP, and the work pulled forward is exactly what those two procedures need. Story 2.4 and the later stories still own canBuy, sign-in and the subscribers.
- **Correction found while wiring:** Better Auth checks the Prisma schema at runtime and refused every session read, because the SQL migrations (decision #6) leave out `"Session".ipAddress` (R-12) and the OAuth-only `"Account"` columns. `createAuth` sets `advanced.database.validateSchema: false`, with the reason in a comment. Nothing had called Better Auth before, so the defect was latent.
- **Artifact changed:** `src/server/composition.ts`, `src/server/composition.test.ts`, `src/server/auth.ts`, `src/server/sessions.ts`, `src/server/trpc/router.v2.ts` (`buildAppRouter`), `src/shared-kernel/infra/pg-transactions.ts`, `src/modules/identity/application/gate.ts`, `src/modules/identity/ports/session.ts`, `app/api/trpc/[trpc]/route.ts`, `app/api/auth/[...all]/route.ts`, `test-support/db.ts`; Story 2.1's notes.
- **Decided by:** Martín.

### 25. The regulated-select rule follows the schema's `-- regulated` markers (Architecture)

- **Phase:** 3 (Epic 1 close review, after Stories 1.4 and 1.5).
- **Persona/Skill:** `bmad-code-review` (Blind Hunter, Edge Case Hunter, Acceptance Auditor).
- **Prompt (summary):** The Acceptance Auditor found that `REGULATED_COLUMNS` in `tezg/regulated-select` lists two columns the Story 1.4 Intent does not name: `"Order"."comprobanteObjectKey"` (AD-17) and `"TopUpRequest"."proofObjectKey"` (AD-SYS-8). The schema marks both `-- regulated`. The spec's Ask First said to stop before widening the rule, and the implementation did not ask.
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** Keep both columns and record the decision. The rule then follows the schema, and the drift test fails when a schema marker is missing from the list, so the lint and the schema cannot diverge.
  - Trim the list to the Intent's columns and drop the drift test. The rule matches the spec word for word, but two regulated columns go unguarded and the next marker goes unnoticed.
  - Defer the choice to Story 3.4, which owns `tezg/legal-identity-confined`.
- **Human decision:** ACCEPT the recommendation.
- **Reason:** The two columns are regulated by AD-17 and AD-SYS-8, not by the rule. The schema is the source of truth that the rule and the fitness tests already read, and a copy that can drift is the defect the drift test prevents.
- **Also in this review:** the write scan of `tezg/table-owner` and of the fitness scanner `sqlWrites` no longer counts an upsert's `DO UPDATE` or a `FOR NO KEY UPDATE` lock as a write, and it matches uppercase SQL keywords only, so prose such as "could not update" is not read as SQL. This extends decision #18 (a row lock is a read). No lowercase SQL write exists in `src/` or `test-support/`.
- **Artifact changed:** `tools/lint/tezg-plugin.mjs`, `tools/lint/tezg-plugin.test.mjs` (the drift test), `test-support/solu2/fitness.ts`, `_bmad-output/test-artifacts/fitness/sys_fitness.test.ts`; Story 1.4's Review Findings.
- **Decided by:** Martín.

### 26. Story 2.4 is pulled forward as the check only; sign-in, sign-up and the throttle hook complete it in Impl-2 (Scope)

- **Phase:** 3 (after the Epic 2 close review, `38156cc`).
- **Persona/Skill:** none; a scope review of the Epic 2 deferrals.
- **Prompt (summary):** Story 2.4 is in `impl2_scope`, but the epic-batched flow (#22) built it with Epic 2. Every `canBuy` procedure needs `requireCanBuy`, and the bound tests `[S-FR-IDN-7.h]` and `[S-FR-IDN-7.f]` turned green. The story delivers `requireCanBuy` and `checkAuthThrottle`, a read-only count. It does not record failed sign-ins or sign-ups in `"AuthThrottleEvent"`, and no Better Auth `hooks.before` calls the check. No story in `epics.md` configures sign-up (with its consent fields and email verification) or sign-in, so the hook has nowhere to run (`src/server/auth.ts`). Martín asked when the decision, the hook and the deferred findings would be done.
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** Keep 2.4 `done` for what it delivers and record the gap here. Story 2.4 is Impl-2 scope anyway, so its completion in Impl-2 adds the sign-up and sign-in configuration, the `"AuthThrottleEvent"` insert, the hook and the throttle hardening deferred by the Epic 2 review. Until then the brute-force limit is not active, and this entry says so.
  - Add a new story now through `bmad-correct-course` and build sign-in in Impl-1. It closes the gap, but it is auth work outside the 43 Impl-1 stories.
  - Revert 2.4 to backlog. The green bound tests would then fail the red gate, and every `canBuy` procedure would refuse with a 500 again.
- **Human decision:** ACCEPT the recommendation.
- **Reason:** `done` keeps meaning what the bound tests prove, and the record makes clear that brute-force protection is not active yet. The remaining work stays in the release that owns Story 2.4.
- **Also decided:** the other Epic 2 deferrals have owners. The `PgAuditLog` second clock read is fixed before Epic 3, because Epic 3 adds audited operations: `AuditEntry.at` carries the writer's `now` (AD-SYS-6). The trace's per-line es-CO text goes to page 1.3 (Impl-2). The contact card's buyer-facing refusal goes to Story 9.3. The FK race on a deleted `"User"` waits for a flow that deletes accounts. From now on, each epic's specs pick up the `deferred-work.md` items they own.
- **Artifact changed:** `_bmad-output/implementation-artifacts/deferred-work.md`, `src/shared-kernel/audit.ts`, `src/shared-kernel/infra/pg-audit.ts` (+ test), `test-support/simulated/index.ts`, `src/modules/identity/application/idn.v2.ts` (+ test), `_bmad-output/planning-artifacts/detailed-design/contracts.md` (the `audit` row), Story 2.5's Review Findings.
- **Decided by:** Martín.

### 27. Epic 3 is built whole: Stories 3.3 and 3.4 leave `impl2_scope`, in the order 3.1, 3.2, 3.3, 3.5, 3.4 (Scope)

- **Phase:** 3 (Epic 3 planning, after `140bd6a`).
- **Persona/Skill:** `bmad-quick-dev`, epic-batched (#22).
- **Prompt (summary):** Stories 3.3 and 3.4 are listed in `impl2_scope`, but their bound tests run code that Stories 3.1, 3.2 and 3.5 must build anyway:
  - 3.3 is proof-only. Its six tests, the refusals of VER-1 and VER-2, turn green as soon as 3.1 and 3.2 are done.
  - 3.4's `[VER-3.I2]` calls only the reads of 3.5.
  - Built alone, 3.1, 3.2 and 3.5 would leave unexpected greens, and the red gate would fail.
- **AI output (summary):** The agent offered three ways:
  - **(recommended)** Build the whole epic. Build 3.3 and 3.4 early, as 2.4 was (#26), and commit in the order 3.1, 3.2, 3.3, 3.5, 3.4. As with #23, the 3.1, 3.2 and 3.5 commits may be red locally, are never pushed alone, and the next commit restores the gate. 3.4 also delivers the `tezg/legal-identity-confined` lint rule (#25) and the NFR-VER-3 benchmark.
  - Build only 3.1, 3.2 and 3.5, and mark the early-green tests as expected in the gate. The gate would then need an exception list, and 3.3 would be `done` in practice without saying so.
  - Postpone the whole of Epic 3 to Impl-2. This leaves VER, a P0 risk (R-02), unbuilt in Impl-1.
- **Human decision:** ACCEPT the recommendation.
- **Reason:** `done` keeps meaning what the bound tests prove, the gate needs no exceptions, and the legal-identity guard ships with the first code that writes a legal identity.
- **Also decided:**
  - P2 of VER-2 (the NIT check digit, the CC length and the consent version) is built. `RequestValidationFailed` belongs to the shared kernel, so a kernel helper `rejectRequest` raises it.
  - IDN-1's claim becomes callable at a given `now`, so VER reuses it unchanged.
  - NFR-VER-2 is proven by `[VER-3.I1]` from the log itself, with no runtime counter.
  - Epic 3 picks up the deferred items it owns: the `RETURNING` false negative, closed by the new lint rule, and the keyset `OR $1 IS NULL`, split into two statements in the queue and in the access list.
  - Like 2.4, Stories 3.3 and 3.4 stay listed under `impl2_scope` with an exception note, are `done` early, and do not count toward the 43 Impl-1 stories.
  - The ATDD test data used the NIT `9001234563`, whose DIAN check digit is wrong (the mod-11 digit of `900123456` is 8). The bound tests would have tested a refusal, not a submit. The data is corrected to `9001234568`. Martín chose to correct the data over relaxing the check.
  - `RequestValidationFailed` now carries one citation per issue (`errors.ts`), so P2 names every bad field at once. No issue echoes the submitted value, because the NIT and the CC are regulated.
  - The `I1` race is settled inside the transaction. The insert runs under a savepoint, and a unique violation on the one-Pending index (23505) rolls back to it. The loser then re-reads the winner and raises `ApplicationAlreadyPending` citing the winner's `submittedAt`.
  - Quarantine objects are deleted only after the commit, so a refused submit can be retried with the same upload keys. The promoted `ver-documents` copies are deleted when promotion or the transaction fails.
  - A non-null `qrUploadKey` is refused in the shape stage, and `qrObjectKey` is stored `null`. The spec first stored the key unpromoted, but a security review found that a client key could name another account's object, which Story 3.5 would then show to buyers. Promoting the QR waits for its upload.
  - Production `ObjectStorage` and `MalwareScanner` adapters are not part of Impl-1. `compose()` binds stand-ins that fail as NotImplemented, and `deferred-work.md` records the gap.
  - With Story 3.1 done and 3.2 not yet, `[VER-2.P1]`, `[VER-2.P3]` and `[VER-2.P7]` of Story 3.3 are early greens. Story 3.3 is committed after 3.2 and restores the gate.
- **Artifact changed:** `_bmad-output/implementation-artifacts/sprint-status.yaml` (the `impl2_scope` note), the five Epic 3 story files, `deferred-work.md`, `_bmad-output/test-artifacts/atdd/ver_contracts.test.ts` and `ver_supporting.test.ts` (the NIT), `_bmad-output/planning-artifacts/detailed-design/contracts.md` (`ApplicationSubmitted`), `src/server/trpc/errors.ts`.
- **Decided by:** Martín.

### 28. Epic 3 close review: the unknown-id denial stays unlogged, the NFR-VER-3 binding stands, and the epic is signed (Governance)

- **Phase:** 3 (Epic 3 close review, after `b4a7e1f`).
- **Persona/Skill:** `bmad-code-review` (Blind Hunter, Edge Case Hunter, Acceptance Auditor) over `140bd6a..b4a7e1f`.
- **Prompt (summary):** The review of Stories 3.1–3.5 left 2 decisions, 9 patches, 10 deferrals and 17 dismissed findings. The two decisions:
  - A non-admin asking for an unknown application id gets `LegalIdentityAccessDenied` and an audit row, but no `"LegalIdentityAccessLog"` row, because `applicationId` is a foreign key. "Rows = reads + denials" undercounts those attempts.
  - Story 3.4 bound `[NFR-VER-3.queue]` and `[NFR-VER-3.sign]` without a recorded approval, although its Ask First covers any bound-test change.
- **AI output (summary):** The agent recommended:
  - **(recommended)** Accept the unlogged unknown-id denial and record it. The audit row keeps the attempt, the same answer for existing and unknown ids hides whether an application exists, and the schema stays as designed. The alternative was a nullable or dropped FK.
  - **(recommended)** Confirm the binding. `gate:nfr-red:impl1` only accepts a green NFR test that a done story binds, and Story 7.1's `[NFR-ORD-2.p95]` is the precedent. The alternative was to revert it and leave the benchmark red.
  - Apply all 9 patches.
- **Human decision:** ACCEPT all three recommendations, and sign the Epic 3 gate (#5).
- **Reason:** Both decisions keep the design that the contracts and the gates already assume, and the patches close real defects without changing a contract.
- **Also decided (the patches):**
  - `submitApplication` and `promoteDocuments` clean up with `Promise.allSettled`, so a failed delete never hides the error that caused the cleanup, and a failed post-commit quarantine delete no longer fails a submit that committed. A storage or scanner failure partway through promotion now deletes the copies already made.
  - Duplicate `documentUploadKeys` are refused, and name lengths count code points, as the schema's `char_length` CHECKs do.
  - `decideApplication` calls `requireAdmin` (AD-16), like every other admin operation.
  - `getApplicationForReview` runs the admin check, the read, the signing, the `granted` row and its audit row in one transaction, so a failed sign writes nothing.
  - The unit, HTTP and benchmark fixtures use the valid NIT `9001234568` (#27). The benchmark header and `nfr-evidence.md` say the storage is the in-memory double; the re-measured figures are queue p95 6.1 ms and signed-URL read p95 8.2 ms.
  - Story 3.5's notes say `updatePaymentInstructions` refuses a non-null `qrUploadKey`.
- **Artifact changed:** `src/modules/identity/application/ver.v2.ts` (+ test), `src/server/composition.test.ts`, `_bmad-output/test-artifacts/nfr/ver3_latency.test.ts`, `_bmad-output/test-artifacts/nfr-evidence.md`, `deferred-work.md` (the Epic 3 section), the Review Findings of Stories 3.1, 3.2, 3.4 and 3.5, `sprint-status.yaml` (`epic-3: done`).
- **Decided by:** Martín.

### 29. Epic 4 is built whole, its close review keeps the schema and the AD-CAT-3 mismatch, and the epic is signed (Governance)

- **Phase:** 3 (Epic 4 planning at `d552afa`, then the close review over `d552afa..3cd2cff`).
- **Persona/Skill:** `bmad-quick-dev`, epic-batched (#22), then `bmad-code-review` (Blind Hunter, Edge Case Hunter, Acceptance Auditor).
- **Prompt (summary):** Two rounds.
  - **The specs.** Martín approved the five Epic 4 specs together. With them came three choices:
    - Story 4.3 is in `impl2_scope`, but its three bound tests turn green with 4.1 and 4.2, because `[CAT-1.I1]` requires every losing start to be `FeedRunInProgress`;
    - NFR-CAT-1 has two halves owned by two stories: provenance (4.4) and browse (4.5);
    - no catalog code names an unknown `runId`.
  - **The close review.** It left 2 decisions, 18 patches, 3 deferrals and 14 dismissed findings. The two decisions:
    - a feed `name` over 200 characters stalls the run, because the schema's CHECK refuses the insert, and no `"QuarantinedFeedRow"` reason code fits it;
    - the TRM source re-delivers a stored value over a different range. AD-CAT-3 rule 4 names only an identical row and a different value.
- **AI output (summary):** The agent recommended:
  - **(recommended)** Build the whole epic, as 2.4, 3.3 and 3.4 were (#26, #27). 4.3 is proof-only and is committed right after 4.2 (#23). It leaves `impl2_scope` and does not count toward the 43 Impl-1 stories. The alternatives were a gate exception or postponing CAT to Impl-2.
  - **(recommended)** Bind `[NFR-CAT-1.provenance]` to 4.4 and `[NFR-CAT-1.browse]` to 4.5 in `epics.source.mjs`, as #28 did for NFR-VER-3. The alternatives were the provenance half only, or an unbound benchmark.
  - **(recommended)** An unknown `runId` is `RequestValidationFailed` on `runId`, through `rejectRequest` (the #27 pattern). The alternatives were a new `FeedRunNotFound` code, or an empty answer.
  - **(recommended)** Quarantine a name outside 1–200 as `MissingRequiredField`. Migration 001 is applied, and `db-migrate` refuses an edited one. The alternatives were a new code through a migration 002, or truncating the name.
  - **(recommended)** Keep a same-value, different-range TRM as an audited mismatch. It is a validity conflict the admin sees on 2.3; nothing is invented, and today's rate is carried forward with its stale label. The alternatives were to treat it as already stored, or to insert the uncovered remainder.
  - Apply all 18 patches.
- **Human decision:** ACCEPT every recommendation, and sign the Epic 4 gate (#5).
- **Reason:** `done` keeps meaning what the bound tests prove, and the gate needs no exception. Each decision keeps the applied schema and the AD-CAT rules as written. The patches close real defects without changing a DTO or a bound test.
- **Also decided (the patches):**
  - `validateRow` trims every value. It quarantines a name over 200 code points, a number whose digit run exceeds 9 digits (`"numberSort" INT`), and an `observedAt` that is not ISO 8601 with an offset or lies in the future. A database refusal can no longer stall a run.
  - The continue's lease is handed back expired at `now − 1 ms`, not cleared, so a long run continued in slices is never failed as abandoned.
  - A source answering no rows and not done hands the run back instead of spinning.
  - A missing adapter (`NotImplementedError`) propagates instead of failing the run or reading as `sourceUnavailable`, so `UNWIRED_FEED` and `UNWIRED_FX` fail as their comment says.
  - A failed run's audit row records the error's code.
  - A continue that loses its lease answers the run as it now stands.
  - The continue refusal cites `AD-CAT-1 rule 2`.
  - A `KindChanged` quarantine stores the row the feed sent.
  - The quarantine cursor carries its reason filter.
  - `fetchTrm` refuses a delivered row that is unordered, malformed, or does not cover today. The mismatch cites `FR-CAT-8`, and its audit row names the stored row.
  - `period`, `getFxRate`'s date and `asOf` are refused through `rejectRequest` instead of a 500.
  - The P2 citation is the frozen `{missingIds}`.
  - The price history builds its series in linear time.
  - The benchmark needs more than 48 priced ids.
- **Environment note:** the local Postgres must run with `max_connections=200`, as `docker-compose.yml` sets it. With the default 100, `[CAT-1.I1]`'s 50-way race once failed with `53300` while other files ran in parallel. The CI service container runs with the default.
- **Artifact changed:** `src/modules/catalog/**`, `src/server/composition.ts` (+ test), `test-support/solu2/fixtures.ts`, `_bmad-output/planning-artifacts/detailed-design/contracts.md` (§13), `_bmad-output/planning-artifacts/epics.source.mjs` and `epics.md`, `_bmad-output/test-artifacts/nfr/cat1_latency.test.ts`, `_bmad-output/test-artifacts/nfr-evidence.md`, `deferred-work.md`, the five Epic 4 story files, and `sprint-status.yaml` (4.3 out of `impl2_scope`; `epic-4: done`).
- **Decided by:** Martín.

### 30. Epic 5 is built whole, a null location and the area filter wait for Epic 6, its close review bounds restock, and the epic is signed (Governance)

- **Phase:** 3 (Epic 5 planning at `ab3430b`, then the close review over `ab3430b..4485962`).
- **Persona/Skill:** `bmad-quick-dev`, epic-batched (#22), then `bmad-code-review` (Blind Hunter, Edge Case Hunter, Acceptance Auditor).
- **Prompt (summary):** Two rounds.
  - **The specs.** Martín approved the six Epic 5 specs together. With them came four choices:
    - **Scope.** Stories 5.3, 5.4 and 5.5 are in `impl2_scope`, but their bound tests run code that 5.1 and 5.2 must build:
      - `[INV-2.P1]` passes as soon as `createListing` calls eligibility first;
      - `[INV-1.I1]` requires every losing reserve to be `InsufficientQuantity`;
      - `[INV-3.I2]` passes with the fail-closed reserve (AD-3).
      Built without them, the other INV-2 refusals would fail for a reason other than NotImplemented, and the gate refuses that too.
    - **A `null` location.** FR-INV-1 says it defaults to the individual seller's meeting point, but INV has no identity port that reads it, and the ATDD fakes provide only two methods.
    - **A stale `expectedVersion`** on `updateListing` has no registry code.
    - **NFR-INV-4** is in the DoD of four stories.
  - **The close review.** It left 2 decisions, 10 patches, 2 deferrals and 17 dismissed findings. The two decisions:
    - two application decisions for a business with no listings are not serialized, because no row exists to lock;
    - restock accepts any integer `delta`, and one beyond INT range answers 500.
- **AI output (summary):** The agent recommended:
  - **(recommended)** Build the whole epic, as 2.4, 3.3, 3.4 and 4.3 were (#26, #27, #29), committing in the order 5.1, 5.3, 5.2, 5.4, 5.5, 5.6. 5.3 and 5.4 are proof-only, committed right after the story they prove (#23). 5.5 also wires the real `listings` delivery handler in `compose()`. The three leave `impl2_scope` and do not count toward the 43 Impl-1 stories. The alternatives were a gate exception, or postponing INV (risk R-05, P0).
  - **(recommended)** Store no coordinates for a `null` location, and defer the meeting-point default to Epic 6 (DSC), the first consumer of a listing's coordinates. The alternatives were an optional `meetingPoint` on IDN-2 now, or a new P-IDN port that would break `[S-FR-INV-2.h]`'s fake.
  - **(recommended)** Refuse a stale version as `RequestValidationFailed` on `expectedVersion`, through `rejectRequest` (the #27 and #29 pattern). The alternatives were a new `ListingVersionConflict` code, or last-write-wins.
  - **(recommended)** Bind `[NFR-INV-4.create]` (p95 ≤ 800 ms) to 5.1, and `[NFR-INV-4.reserve]` (≤ 150 ms) and `[NFR-INV-4.bundle]` (≤ 300 ms) to 5.2, as #28 and #29 did. The alternatives were the reserve half only, or no benchmark.
  - **(recommended)** Accept the unserialized decisions and defer them. VER decides one application at a time, the newest non-ignored decision is still the newest, and a listing that escapes a racing rejection is not purchasable, because a reserve reads the verification live. The alternative was a new advisory namespace (AD-SYS-4 rule 4) taken by the subscriber and by listing creation.
  - **(recommended)** Bound restock to `|delta| ≤ 999` per call (the create bound), refused through `rejectRequest`, with no cap on the total. The alternatives were a cap on the resulting quantity at INT range, or leaving it as a 500.
  - Apply all 10 patches.
- **Human decision:** ACCEPT every recommendation, and sign the Epic 5 gate (#5).
- **Reason:** `done` keeps meaning what the bound tests prove, and the gate needs no exception. The deferrals each have an owner epic: Epic 6 (location, area), Epic 8 (the first-event race), Epic 11 (the availability batch). The patches close real defects without changing a DTO or a bound test.
- **Also decided (the patches):**
  - A listing that draws on no unit (a bundle without components) is `Unexpected` in a reserve, never a reservation that takes no stock.
  - The domain `purchasable` treats an omitted projection as absent (fail-closed, AD-3).
  - A rejection withdraws, and an approval restores, only the seller's business listings.
  - `createBundle` checks that each component's condition fits its kind (`InvalidItemRef`).
  - `listMyListings` reads the verification for business rows only, so a page mixing seller kinds reads each row correctly.
  - `reserveForTrade` refuses a listing closed to trade (`ListingNotOpenToTrade`).
  - A fractional or negative `expectedVersion` is refused through `rejectRequest`.
  - The Paused detail cites `{ businessId, ledgerSeq, projection, paused }` (INV-3 Q4; `balanceAfter` is not stored), and the Unverified detail cites the real verification status.
  - The test pool's `error` listener ignores only `57P01`.
- **Also in this epic:**
  - CAT's seven §15.11 ports now read on the ambient transaction (AD-SYS-4 rule 9). A reserve calls `catalog.getEntries` inside the order's transaction, and the ports used to open a connection of their own.
  - The per-file test pool gets an `error` listener: `DROP DATABASE … WITH (FORCE)` sometimes reached a client still closing after a 50-client race, and the resulting `57P01` surfaced as an uncaught error.
  - `getAvailabilitySummary` refuses a non-null `area` as NotImplemented until DSC-3 (Story 6.1).
  - The measured figures (local Postgres 16):
    - `[NFR-INV-4.create]` p95 4.3 ms;
    - `.reserve` p95 4.3 ms;
    - `.bundle` p95 10.4 ms;
    - `[INV-1.MEC]`, 100 repetitions, in 479 ms.
- **Artifact changed:** `src/modules/listings/**`, `src/modules/catalog/application/cat.v2.ts`, `src/server/composition.ts` (+ test), `test-support/db.ts`, `test-support/solu2/fixtures.ts`, `_bmad-output/planning-artifacts/detailed-design/contracts.md` (§13, eight stored-only rows), `_bmad-output/planning-artifacts/epics.source.mjs` and `epics.md`, `_bmad-output/test-artifacts/nfr/inv4_latency.test.ts`, `_bmad-output/test-artifacts/nfr-evidence.md`, `deferred-work.md`, the six Epic 5 story files, and `sprint-status.yaml` (5.3, 5.4 and 5.5 out of `impl2_scope`; `epic-5: done`).
- **Decided by:** Martín.

### 31. Epic 6 is built whole, a null location copies the meeting point, its close review counts only real exclusions, and the epic is signed (Governance)

- **Phase:** 3 (Epic 6 planning at `e143f13`, then the close review over `e143f13..ced24e1`).
- **Persona/Skill:** `bmad-quick-dev`, epic-batched (#22), then `bmad-code-review` (Blind Hunter, Edge Case Hunter, Acceptance Auditor).
- **Prompt (summary):** Two rounds.
  - **The specs.** Martín approved the four Epic 6 specs together. With them came four choices:
    - **Scope.** Story 6.4 is in `impl2_scope`, but its three bound tests check clauses that 6.2 and 6.3 must build:
      - `[DSC-1.Q4]` checks `excluded` and `decision`, two required fields of DSC-1's response;
      - `[DSC-1.P2]` checks the refusal that runs before DSC-1's statement;
      - `[DSC-2.P1]` checks DSC-2's first step.

      Built without them, they would fail for a reason other than NotImplemented, which the gate also refuses.
    - **A `null` location** (deferred by #30): FR-INV-1 defaults it to the individual seller's meeting point.
    - **NFR-DSC-1** has two thresholds: the §3 seed and 50,000 listings.
    - **`purchasableOnly`:** the seller's verification comes from identity after the one statement.
  - **The close review.** It left 2 decisions, 6 patches, 2 deferrals and 9 dismissed findings. The two decisions:
    - without an area, listings with no usable location were returned and also counted as excluded, under an `excluded` decision that speaks of an area search;
    - DSC-2 Q4 names a "no active listings" decision, but `GetCardDetailResponse` has no decision field.
- **AI output (summary):** The agent recommended:
  - **(recommended)** Build the whole epic, as 2.4, 3.3, 3.4, 4.3, 5.3, 5.4 and 5.5 were (#26, #27, #29, #30), committing in the order 6.1, 6.2, 6.3, 6.4. 6.4 is proof-only, committed right after 6.3 (#23). It leaves `impl2_scope` and does not count toward the 43 Impl-1 stories. The alternative was a gate exception.
  - **(recommended)** Copy the meeting point at create: IDN-2's response gains an optional `meetingPoint`, read by identity's own repository, and `createListing` and `createBundle` store it when `location` is null. DSC-1 stays one statement over `"Listing".lat/lng`, and `listings` reads no identity table. A business with a null location still stores none (INV-2 P5). The alternatives were resolving it at read, which breaks the one statement and paging, or keeping it deferred.
  - **(recommended)** Bind both halves, `[NFR-DSC-1.seed]` and `[NFR-DSC-1.scale]`, to 6.2, the owner of DSC-1, as #29 and #30 did. 6.4's DoD line is met once the NFR is Green — benchmark. The alternatives were the seed half only, or the scale half on 6.4.
  - **(recommended)** For `purchasableOnly`, filter the listing's own facts in SQL and drop unverified sellers' rows from the page, so a page can hold fewer than 24. This goes to `deferred-work.md` for the search UI. The alternatives were two statements (losing the one snapshot of NFR-DSC-3), or ignoring the flag.
  - **(recommended)** Count only real exclusions: without an area `excluded.unusableLocation` is 0 and the decision is `SearchRanked`. The no-area order stays `(soldOut, priceCop, id)`, as contracts.md DSC-1 Q1 states. The alternatives were also ranking them after the located rows (AD-DSC-1 rule 4 to the letter), or counting them with another template.
  - **(recommended)** Defer DSC-2's decision field to the card page story (UI 2.2), which renders the empty state from `hasActiveListings` and `excluded`. The alternative was a DTO change now.
  - Apply all 6 patches.
- **Human decision:** ACCEPT every recommendation, and sign the Epic 6 gate (#5).
- **Reason:** `done` keeps meaning what the bound tests prove, and the gate needs no exception. The meeting point closes an Epic 5 deferral without a cross-module read. The review decisions keep the response honest (a returned row is never "excluded") without changing a DTO or a bound test.
- **Also decided (the patches):**
  - A card's `listingPriceCop` is the lowest price over every matching listing in the area, read by the same statement (`withMinPrice`), not only over the first 100 rows returned (AD-DSC-2 rule 4).
  - IDN-2 reads the eligibility facts and the meeting point in one snapshot.
  - A bad `maxPriceCop`, and a card detail with no `area`, are refused through `rejectRequest` for in-process callers, before any neighbour call.
  - A test pins the SQL order to the domain's `compareRank`.
  - The benchmark's header no longer says its tests stay red.
- **Also dismissed, with evidence:** a `count(*) FILTER (…)` form of the unusable count was tried. It evaluates the correlated availability for every visible listing, and the 50,000-listing benchmark went from 24 s to over 10 minutes. The scalar subquery with the location test first stays, in the same statement and snapshot.
- **Also in this epic:**
  - `getAvailabilitySummary` filters by area with DSC-1's own predicates (deferred by #30), and refuses a bad area as `InvalidSearchArea`.
  - §13 gains three stored-only rows, with no placeholders: `ListingRanked`, `SearchRanked` and `ListingLocationUnusable`.
  - `discovery.search` and `discovery.cardDetail` are wired as public procedures.
  - The measured figures (local Postgres 16):
    - `[NFR-DSC-1.seed]` p95 19.0 ms;
    - `[NFR-DSC-1.scale]` p95 97.2 ms at 50,000 listings;
    - `[DSC-2.MEC]` one run of both radii in 264 ms.
- **Environment note:** Docker did not run in this session either. The preinstalled `postgresql-16` cluster on port 55432 with `max_connections=200`, `fsync=off` and `full_page_writes=off` ran `npm run test:ci` in about 2 minutes.
- **Artifact changed:** `src/modules/listings/**`, `src/modules/identity/{dto,application,ports,infra}/` (`meetingPoint`), `src/server/composition.ts` (+ test), `test-support/solu2/fixtures.ts`, `_bmad-output/planning-artifacts/detailed-design/contracts.md` (§13, three stored-only rows), `_bmad-output/planning-artifacts/epics.source.mjs` and `epics.md`, `_bmad-output/test-artifacts/nfr/dsc1_latency.test.ts`, `_bmad-output/test-artifacts/nfr-evidence.md`, `deferred-work.md`, the four Epic 6 story files, and `sprint-status.yaml` (6.4 out of `impl2_scope`; `epic-6: done`).
- **Decided by:** Martín.
