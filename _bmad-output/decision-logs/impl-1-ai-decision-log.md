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
| #32 | `[CORRECTED]` | Solu-2 `[NFR-ORD-2.p95]` spreads 550 purchases over `buyerId(5 + k % 218)` and every funded listing, ignoring ORD-1 P4 and the seed's open orders | Only the Given changes: buyers with an open seed order are set aside, and a buyer's k-th call goes to its k-th business | Martín |

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

### 32. Epic 7 is built whole, the admin check uses identity's own guard, the benchmark's Given respects ORD-1 P4, its close review cites every open order, and the epic is signed (Governance)

- **Phase:** 3 (Epic 7 planning at `f595122`, then the close review over `f595122..e1018fb`).
- **Persona/Skill:** `bmad-quick-dev`, epic-batched (#22), then `bmad-code-review` (Blind Hunter, Edge Case Hunter, Acceptance Auditor).
- **Prompt (summary):** Three rounds.
  - **The specs.** Martín approved the five Epic 7 specs together. With them came three choices:
    - **Scope.** Stories 7.3 and 7.4 are in `impl2_scope`, but their ten bound tests check clauses that 7.1 and 7.2 must build:
      - `[ORD-1.P3]` runs before the reserve, or the insert fails on `order_no_self_purchase`;
      - `[ORD-1.I2]` requires every loser to be `TooManyOpenOrders`;
      - ORD-2/3/4's 0-row re-read is what `[ORD-2.MEC]`, `[ORD-3.MEC]`, `[ORD-3.R1]` and `[ORD-4.MEC]` require.

      Built without them, they would fail for a reason other than NotImplemented.
    - **`AdminOnly`.** `[S-FR-ORD-10.f]` expects `AdminOnly` from the service. Its fake identity provides only `getBusinessPaymentInstructions`, and `orders` may not raise identity's code.
    - **An unset support contact.** `orders.supportContact.get` is public, and `SupportContactDTO` has no null.
  - **The benchmark.** `[NFR-ORD-2.p95]`, bound to Story 7.1, failed with `TooManyOpenOrders`. Its calls ignored the 1-per-business limit of ORD-1 P4 (OQ-11), and it used buyers the seed leaves with an open order.
  - **The close review.** It left 1 decision, 12 patches, 5 deferrals and 10 dismissed findings. The decision: AD-ORD-3 rule 3 says the admin lookup shows the order's `EventDelivery` rows. `AdminLookupOrdersResponse` has no such field, and no flag when it truncates at 50.
- **AI output (summary):** The agent recommended:
  - **(recommended)** Build the whole epic, as 2.4, 3.3, 3.4, 4.3, 5.3, 5.4, 5.5 and 6.4 were (#26, #27, #29, #30, #31), committing in the order 7.1, 7.3, 7.2, 7.4, 7.5. 7.3 and 7.4 are proof-only, each committed right after the story it proves (#23). They leave `impl2_scope` and do not count toward the 43 Impl-1 stories. The 7.2 and 7.4 commits stay red locally on `[ORD-2.I2]` and `[ORD-2.MEC]` until 7.5, because those tests call 7.5's cancel and expiry job. The alternatives were a gate exception, or postponing ORD (R-06, P0).
  - **(recommended)** identity exports its own admin guard, `requireAdmin(repo, tx, adminId)`, moved out of `ver.v2.ts`. ORD's `repo` type is its own tables plus identity's `AdminFactsReader`, which the one repository (R-14) already carries. Identity reads its own table and raises its own code inside the order's transaction. No bound test or `operations.json` changes. The alternatives were a `requireAdmin` on the `IdentityForOrd` port, which changes the bound fakes, or the router's admin builder only, which leaves `[S-FR-ORD-10.f]` red.
  - **(recommended)** An unset support contact is `Unexpected` (500) until an admin sets it, and the launch checklist sets it (`deferred-work.md`). The alternatives were a nullable DTO, or a default from a new environment variable.
  - **(recommended)** Change only the benchmark's Given. Buyers with an open seed order are set aside, and a buyer's k-th call goes to its k-th business. What is measured and the threshold stay the same. The alternatives were dropping the per-business limit, against ORD-1 P4 and `[ORD-1.I2]`, or unbinding the benchmark from 7.1.
  - **(recommended)** Defer the lookup's deliveries and truncation flag to the admin console story. The admin already reads deliveries through `admin.events.deliveries`. The alternative was a DTO change now, which would also read a kernel table.
  - Apply all 12 patches.
- **Human decision:** ACCEPT every recommendation, and sign the Epic 7 gate (#5).
- **Reason:** `done` keeps meaning what the bound tests prove, and the gate needs no exception. The admin check stays identity's own, with no change to a bound test or a contract. The benchmark now measures what NFR-ORD-2 asks, under the contract as written. The patches close real defects and spec deviations without changing a DTO.
- **Also decided (the patches):**
  - `TooManyOpenOrders` cites every open order at either limit, as ORD-1 P4 and the frozen 7.3 spec say.
  - `OrderNotVisibleToCaller` cites `AD-15`, as the frozen 7.2 spec says.
  - A fact update or cancel whose re-read finds nothing to refuse runs the conditional update once more. A commit that lands between the two statements, such as an upload, would otherwise answer 500.
  - Each fact's rule, stored instant and loser mapping come from one `FACTS` table, not from rule-string comparisons.
  - A comprobante key must be exactly the buyer's prefix plus one id segment. A refusal from the first check now deletes the buyer's quarantine object too.
  - The first support-contact changes serialize on `pg_advisory_xact_lock(orders:supportContact)`, since a missing row has nothing to lock.
  - The lookup and support-contact audit rows name the log row and the change row.
  - `expireDueOrders` stops only on a short batch or after 50 s.
  - A dead key comparison is gone.
  - An HTTP case proves `orders.create` on a pool of 1.
  - The benchmark asserts its Given (enough free buyers, and a listing in every business).
- **Also in this epic:**
  - `getBusinessPaymentInstructions` reads on the ambient transaction (AD-SYS-4 rule 9).
  - `Resolvers` accepts procedures with no input schema, so `orders.supportContact.get` is wired.
  - The src tests of `orders` compose INV from `test-support/solu2/services.ts`. `[SYS-AD1]` scans the tests in `src/` too, and orders → catalog is not an AD-1 edge.
  - §13 gains 14 stored-only rows with no placeholders: `OrderCreated`, `ComprobanteAttached`, `ComprobanteUrlIssued`, `ComprobanteNotUploaded`, `OrderPaidConfirmed`, `OrderPaymentReceived`, `OrderItemReceived`, `OrderAwaitingPayment`, `OrderPaid`, `OrderAwaitingBusiness`, `OrderPaymentConfirmed`, `OrderCompleted`, `OrderCancelled` and `OrderExpired`.
  - Thirteen `orders.*` procedures are wired. `expireDueOrders` has no jobs route yet (`deferred-work.md`).
  - The measured figures (local Postgres 16):
    - `[NFR-ORD-2.p95]` p95 11.0 ms (p50 6.5);
    - `[ORD-2.MEC]` 100 repetitions in 571 ms;
    - `[ORD-3.MEC]` 201 ms;
    - `[ORD-4.MEC]` 182 ms.
- **Environment note:** Docker did not run in this session either. The preinstalled `postgresql-16` cluster on port 55432 (`max_connections=200`, `fsync=off`, `full_page_writes=off`) ran `npm run test:ci` in about 2 minutes.
- **Artifact changed:** `src/modules/orders/**`, `src/modules/identity/{application,index}` (`admin.ts`, the ambient payment instructions), `src/server/composition.ts` (+ test), `src/server/trpc/router.v2.ts`, `test-support/solu2/{fixtures,services}.ts`, `_bmad-output/planning-artifacts/detailed-design/contracts.md` (§13, 14 stored-only rows), `_bmad-output/test-artifacts/nfr/ord1_latency.test.ts`, `_bmad-output/test-artifacts/nfr-evidence.md`, `deferred-work.md`, the five Epic 7 story files, and `sprint-status.yaml` (7.3 and 7.4 out of `impl2_scope`; `epic-7: done`).
- **Decided by:** Martín.

### 33. Epic 8 is built through 8.4, identity's guard raises NotBusinessAccount, the seller lock closes an Epic 5 deferral, its close review adds TopUpSelfDecision, and the epic is signed (Governance)

- **Phase:** 3 (Epic 8 planning at `9f6844d`, then the close review over `9f6844d..5913c75`).
- **Persona/Skill:** `bmad-quick-dev`, epic-batched (#22), then `bmad-code-review` (Blind Hunter, Edge Case Hunter, Acceptance Auditor).
- **Prompt (summary):** Two rounds.
  - **The specs.** Martín approved the four Epic 8 specs (8.1–8.4) together. With them came four choices:
    - **Scope.** Story 8.4 is in `impl2_scope`, but its seven bound tests check clauses that 8.1–8.3 must build:
      - `[S-FR-COM-2.f]` and `[S-FR-COM-2.f2]` are P3 and P2 of 8.1's `requestTopUp`;
      - `[S-FR-COM-9.f]` is the business check of 8.1's account read;
      - `[COM-2.P2]`, `[COM-2.P3]` and `[COM-2.reject.f]` are 8.3's 0-row re-read, which `[COM-2.I1]` also needs;
      - `[COM-1.P3]` is 8.2's 0-row account update.

      Stories 8.5 (reconcile) and 8.6 (rates, admin ledger) are operations of their own, so their 10 tests stay red for NotImplemented.
    - **`NotBusinessAccount`.** S-FR-COM-2 and S-FR-COM-9 propagate identity's code, but the bound `IdentityForCom` fake offers only `getCapabilities` and `getBusinessName`, and `commission` may not raise an identity code (`tezg/error-owner`).
    - **The Epic 5 seller-lock deferral**, left for Epic 8 to decide: a business with no `"SellerCommissionState"` row has nothing for `createListing` to lock.
    - **Minor choices:** the NFR-COM-3 benchmark's binding, the account page's ledger length, an `isAdmin` read for the proof URL, eight stored-only §13 rows, and which procedures are wired.
  - **The close review.** It left 3 decisions, 7 patches, 3 deferrals and 12 dismissed findings. The decisions:
    - one quarantined proof can back two concurrent top-up requests;
    - an admin who is also a business can decide their own top-up;
    - ARCHITECTURE AD-COM-2 rules 1 and 3 describe the rate read first and a sentinel rollback, while the code follows contracts.md §7 Q2 (duplicate check first, savepoint).
- **AI output (summary):** The agent recommended:
  - **(recommended)** Build 8.4 with the epic as a proof-only story, committed right after 8.3 (#23), as 7.3 and 7.4 were (#32). It leaves `impl2_scope` and does not count toward the 43 Impl-1 stories. The 8.1–8.3 commits stay red locally on 8.4's tests until the 8.4 commit. The alternatives were a gate exception, or postponing the epic.
  - **(recommended)** identity exports a pure `requireBusinessAccount(capabilities, rule)` that raises its own `NotBusinessAccount` when `sellerKind ≠ 'business'`; commission calls it with the result of `getCapabilities`. This is the pattern of `requireAdmin` (#32). The alternatives were a new port method (changes the bound fakes) or commission raising the code (breaks the lint rule).
  - **(recommended)** Keep the seller-lock item deferred. The alternative was closing it now with a `listings:seller` advisory lock.
  - **(recommended)** The minor choices: `[NFR-COM-3.deduction]` bound to 8.2 and `[NFR-COM-3.topUp]` to 8.3, in one new file; the 50 newest ledger lines; identity's `isAdmin` beside `requireAdmin`; the eight §13 rows; eight `commission.*` procedures and the subscriber wired, the five of 8.5 and 8.6 left unwired.
  - **(recommended)** Defer the proof reuse: a single-use upload ticket closes it at the source, and an admin confirms each top-up against the bank. The alternatives were a per-business advisory lock, or a partial unique index on the transfer reference.
  - **(recommended)** Defer the self-decision policy to the admin console story. The alternative was a new refusal now.
  - **(recommended)** Amend AD-COM-2 to the contract's form. The alternative was a note only.
  - Apply all 7 patches.
- **Human decision:** ACCEPT every recommendation except two, and sign the Epic 8 gate (#5):
  - **the seller lock is closed now** (the alternative), not deferred;
  - **an admin may not decide their own top-up** (the alternative): a new refusal `TopUpSelfDecision` (409, commission).
- **Reason:** `done` keeps meaning what the bound tests prove, and the gate needs no exception. Identity keeps raising its own code with no bound test or contract change. The seller lock and the self-decision rule close two real gaps in the money path while their owners' code is open.
- **Also decided (the patches):**
  - `requireBusinessAccount` cites the caller's rule: `FR-COM-2` for the top-up paths, `FR-COM-9` for the account.
  - `requestTopUp` reads the Clock once, after the proof scan, so a slow scan cannot commit a row older than queue pages an admin has already read.
  - The top-up amount reaches the repository as `bigint` (AD-SYS-7).
  - `cop()` raises `UnexpectedError`, not a bare `RangeError`.
  - The seller-lock test releases its subscriber transaction in `finally`.
  - An HTTP case replays an `OrderPaymentConfirmedByBusiness` through the real commission handler.
  - `rejectTopUp` and `listTopUpQueue` check the admin before the reason and the cursor (AD-16 first-fail).
- **Also in this epic:**
  - **The seller lock:** `pg_advisory_xact_lock(listings:seller:<businessId>)`, taken first by `createListing` and `createBundle` for a business and by `applyCommissionProjection`. AD-SYS-4 rule 4 gains the namespace, and rule 5's note says why it cannot deadlock. `applyApplicationDecision` does not take it (its sibling item stays deferred).
  - **`TopUpSelfDecision`:** COM-2 P3a in contracts.md, a §13 row, `codes.ts` and `operations.json` (confirm and reject). The conditional update carries `"businessId" <> :adminId`, so the refusal writes nothing.
  - AD-COM-2 rules 1 and 3 and the trade-off now describe the savepoint form of contracts.md §7 Q2.
  - §13 gains eight stored-only rows with no placeholders: `TopUpRequested`, `TopUpConfirmed`, `TopUpConfirmedBelowZero`, `TopUpRejected`, `CommissionAccountShown`, `CommissionAccountNotYetOpen`, `CommissionBalanceLow` and `CommissionBalanceNeedsTopUp`.
  - The `commission` subscriber is wired: `BusinessApplicationApproved` opens the account, and the two order events run COM-1. Eight `commission.*` procedures are wired.
  - COM's identity port spans IDN (`getCapabilities`) and VER (`getBusinessName`), so `compose()` binds an object of both.
  - The decision row's method is `insertTopUpDecisionLog`, because VER already offers `insertDecisionLog` on the one repository (R-14).
  - The measured figures (local Postgres 16):
    - `[NFR-COM-3.deduction]` p95 3.3 ms (p50 1.9);
    - `[NFR-COM-3.topUp]` p95 3.1 ms (p50 2.0);
    - `[COM-1.MEC]` 100 repetitions in 4,148 ms;
    - `[COM-1.MEC2]` 100 repetitions in 1,974 ms.
- **Environment note:** Docker did not run in this session either. A `postgresql-16` cluster on port 55432 (`max_connections=200`, `fsync=off`, `full_page_writes=off`) ran `npm run test:ci` in about 3 minutes, green.
- **Artifact changed:** `src/modules/commission/**`, `src/modules/identity/{application/admin.ts,index.ts}`, `src/modules/listings/{ports,infra,application}/` (the seller lock + test), `src/server/composition.ts` (+ test), `src/shared-kernel/codes.ts`, `test-support/solu2/fixtures.ts`, `_bmad-output/planning-artifacts/ARCHITECTURE.md` (AD-SYS-4 rules 4–5, AD-COM-2), `_bmad-output/planning-artifacts/detailed-design/contracts.md` (COM-2 P3a, §13: nine rows), `schemas/operations.json`, `ui-states.md`, `_bmad-output/planning-artifacts/epics.source.mjs` and `epics.md`, `_bmad-output/test-artifacts/nfr/com3_latency.test.ts`, `_bmad-output/test-artifacts/nfr-evidence.md`, `deferred-work.md`, the four Epic 8 story files, and `sprint-status.yaml` (8.4 out of `impl2_scope`; `epic-8: done`).
- **Decided by:** Martín.

### 34. Epic 9 is built through 9.5, identity's reader serves BusinessCannotInitiate, the contact windows are (now − w, now], two bound-test Givens are fixed, its close review guarantees the 2,000-character URL, and the epic is signed (Governance)

- **Phase:** 3 (Epic 9 planning at `787392b`, then the close review over `787392b..7be44bf`).
- **Persona/Skill:** `bmad-quick-dev`, epic-batched (#22), then `bmad-code-review` (Blind Hunter, Edge Case Hunter, Acceptance Auditor).
- **Prompt (summary):** Four rounds.
  - **The specs.** Martín approved the five Epic 9 specs (9.1–9.5) together. With them came seven choices:
    - **Scope.** Stories 9.4 and 9.5 are in `impl2_scope`, but their six bound tests check clauses that 9.2 and 9.3 must build:
      - `[MSG-1.P3]`, `[MSG-1.P4]` and `[MSG-1.P5]` are P3–P5 of 9.2's `sendMessage`, and `[MSG-3.MEC]` needs P5's refusal;
      - `[MSG-2.P2]` and `[MSG-2.P3]` are P2–P3 of 9.3's `generateContactMessage`, and 9.3's `[MSG-2.R1]` (exactly 30 of 50) needs the P4 limiter of `[MSG-2.P4]`.

      Story 9.6 (inbox, thread, read, mute) has procedures of its own, so its 4 tests stay red for NotImplemented.
    - **`BusinessCannotInitiate`.** MSG-1 P4 needs the sender's seller kind, but the bound `IdentityForMsg` fake offers only `requireMessagingEligibility`, `getDisplayNames` and `getBusinessName`.
    - **The compose→send race (R-09).** Whether MSG-3, read inside the send transaction, locks the latest application.
    - **Story 2.5's deferral.** The buyer-facing refusal when `getContactCard` raises the seller-facing `IndividualSellerProfileIncomplete`.
    - **`ipHmac`.** MSG-2's per-IP limit needs the caller IP's HMAC (S-7), and neither the tRPC context nor `config.ts` had it.
    - **Epic 3's deferral.** Whether Story 9.5 introduces the throttle tables that would stop a non-admin flooding `"LegalIdentityAccessLog"` (NFR-SYS-14).
    - **Minor choices:** the benchmark file and bindings, three stored-only §13 rows, the es-CO template, 9.6 untouched.
  - **Two bound tests during implementation.**
    - `[MSG-3.MEC]` rejects the business with `"rejectionReasonCode" = 'DataMismatch'` but never seeds that `RejectionReason`, so every repetition failed on the FK (23503).
    - `[MSG-2.R1]` failed twice. Its 50 concurrent calls share one virtual instant, so contracts.md's half-open `[now − w, now)` windows counted none of them (50 allowed). And it put all 50 listings on one seller, so FR-MSG-3's 10 per requester and seller per day allowed 10, not 30.
  - **The CI gate.** The pushed branch failed `impl1-quality-gate`. The `ContactMessageGenerated` template named a PascalCase product ("WhatsApp"), and a messaging src test approved a business with a direct `UPDATE … now()` (`[SYS-AD8]`, `[SYS-6.R1]`). The session had run the suites piecemeal and not the full `npm run test:ci` before the push.
  - **The close review.** It left 3 decisions, 7 patches, 4 deferrals and 10 dismissed findings. The decisions:
    - the leftmost `x-forwarded-for` hop is client-controlled, so a new header per request escapes the per-IP limit;
    - `externalUrl ≤ 2000` (MSG-2 I2) is not guaranteed once the FR-MSG-2 minimums cannot fit (a 400-character seller name, heavy emoji graphemes);
    - contracts.md MSG-1 P5, MSG-3's MEC and AD-MSG-2 rule 2 say the refusal carries the composed body back, which the ErrorBody cannot do and AD-SYS-8 rule 3 forbids.
- **AI output (summary):** The agent recommended:
  - **(recommended)** Build 9.4 and 9.5 with the epic as proof-only stories, each committed right after the story it proves (#23), as 7.3, 7.4 and 8.4 were (#32, #33). They leave `impl2_scope` and do not count toward the 43 Impl-1 stories. The alternatives were a gate exception, or postponing MSG.
  - **(recommended)** identity exports `sellerKindOf(repo, tx, userId)` beside `requireAdmin`; MSG's `repo` is its own tables plus identity's `AdminFactsReader`; messaging raises its own code. The alternatives were inferring the kind from the sender's eligibility (a Rejected business would get `NotBusinessAccount`) or a port method (changes the bound fake).
  - **(recommended)** Inside an ambient transaction, MSG-3 takes the latest application `FOR SHARE`, so a rejection waits for the send's commit. The alternative was a plain read.
  - **(recommended)** The buyer gets `ListingNotFound` citing `{ sellerContact: false }`, with zero writes. The alternatives were a new code, or propagating the seller-facing text.
  - **(recommended)** Wire `inventory.contact` with `IP_HMAC_KEY` (≥ 32 bytes) in `config.ts`, `.env.example` and `docker-compose.yml`, the HMAC computed in the request context and passed to resolvers as a third argument. The alternative was leaving the procedure unwired until Story 2.4's hook.
  - **(recommended)** Keep the Epic 3 item deferred with Story 2.4's Impl-2 completion as its owner: 9.5's limiter counts only `"ContactRequestLog"`, which is not a general throttle.
  - **(recommended)** The minor choices: one `nfr/msg_latency.test.ts` with `[NFR-MSG-2.send]` bound to 9.2 and `[NFR-MSG-1.contact]` to 9.3; §13 rows `MessagingEligible`, `RecipientNotYetVerified`, `MessageSent` and `ContactMessageGenerated`; the PRD's es-CO template.
  - **(recommended)** Fix both bound-test Givens, leaving their assertions unchanged: `[MSG-3.MEC]` seeds `DataMismatch` once; `[MSG-2.R1]` spreads its 50 listings over five sellers of 10. The alternatives were changing a fixture for every suite, unbinding the MEC, dropping the per-seller limit, or asserting 10.
  - **(recommended)** Make the windows `(now − w, now]` and amend contracts.md MSG-2 P4 and Time, and AD-MSG-1 rule 3: a row stamped `now` counts, and the oldest row stops counting exactly at the cited `retryAt` (with `[now − w, now)` it still counts at `retryAt`). The alternatives were a closed window, or a bound-test change.
  - Fix the gate in its own commit: a template without the product name, and the test approving through identity's `decideApplication`.
  - **(recommended)** Read the caller IP from `x-real-ip`, else the rightmost `x-forwarded-for` hop, normalized. The alternatives were a trusted-hop count in a new variable, or the leftmost hop as built.
  - **(recommended)** A last `overflow` step: the seller name to 20 graphemes, then every name below 20, until the URL fits; prices, cash, conditions, quantities and `copyText` stay whole. The alternatives were `Unexpected` (a long seller name becomes uncontactable) or a deferral.
  - **(recommended)** Amend the contract: the client keeps the text it composed, and the refusal never echoes it. The alternative was a `composedBody` field in the ErrorBody.
  - Apply all 7 patches.
- **Human decision:** ACCEPT every recommendation, and sign the Epic 9 gate (#5).
- **Reason:** `done` keeps meaning what the bound tests prove, and the gate needs no exception. The two Given fixes change what the tests set up, not what they assert, and each assertion is the contract's. The window bound and the overflow step make two contract promises (the retry time, I2) true at their edges. Identity keeps its tables and its codes to itself.
- **Also decided (the patches):**
  - A retry looks up the sender's `clientMessageId` right after P3, before P4 and P5, so a rejection after the original committed never turns a delivered message into a refusal (EC-14).
  - The 60-minute repeat matches counted rows only, so a chain of repeats no longer renews itself.
  - A single listing with no unit is `Unexpected`, not an empty product name.
  - A pool-of-1 test proves the contact path's catalog and identity reads join its transaction (AD-SYS-4 rule 9).
  - The send's audit data is `{ conversationId, seq }`, as the spec says.
  - `IP_HMAC_KEY` is checked in bytes.
  - contracts.md MSG-2 Q4 cites `truncationSteps` joined by commas (citation inputs are primitives), and §13 `ListingNotFound` names D4's source.
- **Also in this epic:**
  - `messaging.send` and `inventory.contact` are wired; MSG's identity port spans IDN (`getDisplayNames`) and VER (`getBusinessName`, `requireMessagingEligibility`).
  - Story 2.5's deferral is closed. The Epic 3 throttle item stays open with its owner named.
  - Production must set `IP_HMAC_KEY` before this branch ships (`deferred-work.md`, the launch checklist).
  - The measured figures (local Postgres 16):
    - `[NFR-MSG-2.send]` p95 6.6 ms (p50 3.0);
    - `[NFR-MSG-1.contact]` p95 4.5 ms (p50 2.4);
    - `[MSG-3.MEC]` 100 repetitions in 572 ms;
    - `[MSG-2.MEC]` 188 ms.
- **Environment note:** Docker did not run in this session either. A `postgresql-16` cluster on port 55432 (`max_connections=200`, `fsync=off`, `full_page_writes=off`) ran `npm run test:ci`.
- **Artifact changed:** `src/modules/messaging/**`, `src/modules/listings/{domain/contact.ts,ports/contact.v2.ts,infra/pg.ts,application/contact.v2.ts,index.ts}` (+ tests), `src/modules/identity/{application/{admin.ts,ver.v2.ts},domain/ver.ts,ports/ver.v2.ts,infra/pg.ts,index.ts}` (+ tests), `src/server/{composition.ts,ip-hmac.ts,trpc/init.ts,trpc/router.v2.ts}` (+ tests), `src/shared-kernel/config.ts` (+ test), `app/api/trpc/[trpc]/route.ts`, `.env.example`, `docker-compose.yml`, `test-support/solu2/fixtures.ts`, `_bmad-output/planning-artifacts/detailed-design/contracts.md` (MSG-1 P5, MSG-2 Q1/P4/Q4/Time, MSG-3 MEC; §13: four rows and `ListingNotFound`), `_bmad-output/planning-artifacts/ARCHITECTURE.md` (AD-MSG-1 rules 3–4, AD-MSG-2 rule 2), `epics.source.mjs` and `epics.md`, `_bmad-output/test-artifacts/atdd/msg_contracts.test.ts` (the two Givens), `_bmad-output/test-artifacts/nfr/msg_latency.test.ts`, `_bmad-output/test-artifacts/nfr-evidence.md`, `deferred-work.md`, the five Epic 9 story files, and `sprint-status.yaml` (9.4 and 9.5 out of `impl2_scope`; `epic-9: done`).
- **Decided by:** Martín.

### 35. Epic 10 is built whole, the trade handoff names items through listings, a stale version is refused before the turn, its close review keeps expired offers Expired, and the epic is signed (Governance)

- **Phase:** 3 (Epic 10 planning at `6b3cc16`, then the close review over `6b3cc16..0b562b6`).
- **Persona/Skill:** `bmad-quick-dev`, epic-batched (#22), then `bmad-code-review` (Blind Hunter, Edge Case Hunter, Acceptance Auditor).
- **Prompt (summary):** Three rounds.
  - **The specs.** Martín approved the five Epic 10 specs (10.1–10.5) together. With them came seven choices:
    - **D1, scope of 10.4.** Story 10.4 is in `impl2_scope`, but all 12 of its bound tests check clauses that 10.1–10.3 must build:
      - `[TRD-1.P2]`–`[TRD-1.P6]` are TRD-1's conditional update, re-read and Q-fail, which `[TRD-1.MEC]` needs;
      - `[TRD-2.P2]` and `[TRD-2.P5]`–`[TRD-2.P8]` are TRD-2's first-fail chain, and `[TRD-2.I3]` needs P6;
      - `[S-FR-TRD-1.f]`, `[S-FR-TRD-2w.f]` and `[S-FR-TRD-3.f]` are 10.1's unique index, withdraw re-read and visibility rule.
    - **D2, scope of 10.5.** One of its 8 tests, `[S-FR-TRD-9.f]` (an accept at `now = expiresAt`), is TRD-1 P2 and turns green with 10.3. The other 7 need `cancelTrade`, `confirmCompletion` and `expireDueOffers`.
    - **D3, item names.** MSG-2's `TradeSummary` needs names, but trading holds only `itemRef`s and may not import `catalog`.
    - **D4, the re-read order.** `[TRD-2.I3]` (two tabs, one version) leaves the loser seeing the flipped turn, so a stale version must be refused before the turn. contracts.md put the turn first.
    - **D5:** the refusal of `trading.handoff` for an offer that is not Accepted.
    - **D6:** Epic 9's deferral (an empty trade summary, an unchecked `BigInt`).
    - **D7, minor choices:** the benchmark file and bindings, eight stored-only §13 rows, the page size and cursor of `trading.mine`, makeOffer's check order, and the wiring.
  - **D3 again, during implementation.** The approved form (an optional `name` on P-CAT.refs) breaks `[P-CAT.refs.h]` and `[P-INV.refs.h]`, two done tests that assert the rows with `toEqual`.
  - **The close review.** It left 4 decisions, 11 patches, 2 deferrals and 13 dismissed findings. The decisions:
    - **R1:** the Q-fail and sibling marks match `status='Open'` only, so an offer already past `expiresAt` is stored Unfulfillable instead of reading Expired;
    - **R2:** the handoff reads the listing live, so after an accept a hidden or deactivated listing, or a missing catalog entry, makes `trading.handoff` fail, and an edit changes the text;
    - **R3:** `trading.mine` paged on the mutable `updatedAt`;
    - **R4:** a seller's withdraw got an undeclared `NotYourTurn` that read "Es turno de seller", checked after status and version.
- **AI output (summary):** The agent recommended:
  - **(recommended)** D1: build 10.4 as a proof-only story committed right after 10.3 (#23), as 7.3, 7.4, 8.4, 9.4 and 9.5 were (#32–#34). It leaves `impl2_scope` and does not count toward the 43. The alternatives were a gate exception, or postponing the epic.
  - **(recommended)** D2: build 10.5 whole with the epic, because an accepted trade with no cancel holds its unit forever. `expireDueOffers` is a service method; its jobs route stays with the Story 4.1/4.4/7.5 item. The alternatives were rebinding `[S-FR-TRD-9.f]` to 10.3 and leaving 7 tests red, or a gate exception.
  - D3 (first form), then **(recommended)** D3 revised: `TradeSummaryDTO` items become `{ itemRef?, name?, condition, qty }`. trading sends `itemRef`s, the contact service names them through its own `catalog.getEntries`, and an item with a `name` is used as is. No test changes. The alternatives were a `withNames` flag on P-CAT.refs, or changing the two bound tests to `toMatchObject`.
  - **(recommended)** D4: amend the order, so a stale version is refused before the turn. The clause numbers stay, because the test ids name them; the contract says P4 (P6) is evaluated before P3 (P5). The alternative was a bound-test change.
  - **(recommended)** D5: `TradeNotAccepted` (409), declared on `trading.handoff`. The alternative was `TradeOfferNotOpen`.
  - **(recommended)** D6: two layers. trading's `checkTerms` runs before anything is stored, and the contact service raises `Unexpected` for a broken summary. The alternative was trading alone.
  - **(recommended)** D7 as listed.
  - **(recommended)** R1: exclude expired offers from both marks. The alternative was the contract as written.
  - **(recommended)** R2: declare listings' `ListingNotFound` and `NotIndividualSellerListing` on `trading.handoff`, and defer a snapshot. The alternatives were a snapshot now, or a deferral only.
  - **(recommended)** R3: page on the immutable `(createdAt DESC, id)`, as `orders.mine` does. The alternative was keeping `updatedAt`.
  - **(recommended)** R4: refuse a seller's withdraw first, with `NotYourTurn` citing `{ turn: 'proposer' }`, declared. The alternatives were `TradeOfferNotVisibleToCaller`, or declaring the code only.
  - Apply all 11 patches.
- **Human decision:** ACCEPT every recommendation (D3 in its revised form), and sign the Epic 10 gate (#5).
- **Reason:** `done` keeps meaning what the bound tests prove, and the gate needs no exception. No bound test changes. trading never imports `catalog` and never raises a listings code. The order and expiry amendments make the contract match what its own tests and AD-TRD-1 rule 5 require.
- **Also decided (the patches):**
  - Only listings' refusals (`ListingNotOpenToTrade`, `ListingNotFound`, `NotIndividualSellerListing`, `InsufficientQuantity`) end an accept attempt. Any other error rolls back and leaves the offer Open. The refusal propagates even if the follow-up transaction fails, and that audit row cites `{ refusedBy }`.
  - `storeReservation` asserts its one row.
  - Duplicate `(itemRef, condition)` rows are `RequestValidationFailed`, so the 4-copy bound and the unchanged-counter check see every copy.
  - The contact service checks the trade summary (a null one too) before it reads the phone.
  - `requireTradeItems` cites the caller's rule.
  - The counter SQL takes the round limit as a parameter.
  - A pool-of-1 test covers offer and counter.
  - contracts.md:
    - TRD-1 Q1 step 2 names the placeholder reservation that the `trade_offer_accepted_has_reservation` CHECK needs;
    - the §13 sources list the new raisers;
    - the composition doc comment lists the trading wiring.
- **Also in this epic:**
  - All ten `trading.*` procedures are wired. TRD's `listings` port is INV's trade surface plus the contact service.
  - listings exports `requireTradeItems`, the `requireBusinessAccount` pattern of #33.
  - §13 gains eight stored-only rows: `TradeOfferMade`, `TradeOfferWithdrawn`, `TradeOfferRejected`, `TradeOfferShown`, `TradeOfferCountered`, `TradeOfferAccepted`, `TradeCancelled` and `TradeCompletionConfirmed`.
  - The "rest stays unwired" HTTP case now uses `messaging.inbox`.
  - Epic 9's trade-summary deferral is closed.
  - The measured figures (local Postgres 16):
    - `[NFR-TRD-2.counter]` p95 6.0 ms (p50 3.0);
    - `[NFR-TRD-2.accept]` p95 14.3 ms (p50 9.3), with the post-commit handoff;
    - `[TRD-1.MEC]` 100 repetitions in 5,954 ms.
- **Environment note:** Docker did not run in this session either. A `postgresql-16` cluster on port 55432 (`max_connections=200`, `fsync=off`, `full_page_writes=off`) ran `npm run test:ci` before every push. The first run caught three §13 templates whose placeholders the catalog test does not allow, and the `fix(epic-10)` placeholder commit rewrote them. The second run also failed, on a stale generated `ui-states.md` (D5 changed `operations.json`) and on a type import in `domain/trd.ts` that `gate:purity` forbids. The agent misread its exit code and pushed `impl-1-epic-10` red once. The close-review commit fixes both, and a trading src test that wrote `"Listing"` (`[SYS-AD8]`) now goes through listings' API. The agent now reads the script's own exit code before every push.
- **Artifact changed:**
  - `src/modules/trading/**`.
  - `src/modules/listings/{application/inv.v2.ts,application/contact.v2.ts,dto/contact.v2.dto.ts,index.ts}` (+ tests).
  - `src/server/composition.ts` (+ test).
  - `test-support/solu2/{fixtures.ts,services.ts}`.
  - `_bmad-output/planning-artifacts/detailed-design/contracts.md`: TRD-1 P3/P4, Q1 and Q-fail; TRD-2 P5/P6 and concurrency; MSG-2 `TradeSummary`; §13 (eight rows and four sources); §15 TRD; §15.12.
  - `schemas/operations.json` (`trading.withdraw`, `trading.handoff`).
  - `_bmad-output/planning-artifacts/ARCHITECTURE.md` (AD-TRD-1 rule 2, AD-TRD-2 rules 2–3).
  - `epics.source.mjs` and `epics.md`.
  - `_bmad-output/test-artifacts/nfr/trd2_latency.test.ts` and `_bmad-output/test-artifacts/nfr-evidence.md`.
  - `deferred-work.md`.
  - The five Epic 10 story files.
  - `sprint-status.yaml` (10.4 and 10.5 out of `impl2_scope`; `epic-10: done`).
- **Decided by:** Martín.

### 36. Epic 11 is built through 11.4, "General" is never the 51st collection, its close review splits lines over 999 copies, and the epic is signed (Governance)

- **Phase:** 3 (Epic 11 planning at `cfba71b`, then the close review over `cfba71b..1de5bf8`).
- **Persona/Skill:** `bmad-quick-dev`, epic-batched (#22), then `bmad-code-review` (Blind Hunter, Edge Case Hunter, Acceptance Auditor).
- **Prompt (summary):** Two rounds.
  - **The specs.** Martín approved the four Epic 11 specs (11.1–11.4) together. With them came four choices:
    - **D1, scope of 11.4.** Story 11.4 is in `impl2_scope`, but all 7 of its bound tests check clauses that 11.2 and 11.3 must build:
      - `[COL-3.P2]`–`[COL-3.P4]` are addEntry's own first-fail chain;
      - `[COL-1.P1]`–`[COL-1.P3]` and `[COL-1.dismiss.f]` are COL-1's re-read, Q-fail and rollback, and `[COL-1.MEC]` already expects `PromptAlreadyResolved`.
      Stories 11.5 and 11.6 stay red for NotImplemented: their methods are their own.
    - **D2, §13 codes.** Five COL responses carry a `decision` with no §13 code.
    - **D3, the subscriber.** The `collections` subscriber of `OrderClosed` was in `UNWIRED_HANDLERS`.
    - **D4, minor choices:** the list orders, no page on `collections.prompts.list` (its DTO has no cursor), `col:owner` on rename and delete, and no lock on dismiss.
    - **D5, "General" at the limit.** COL-3 Q1 creates "General" for an owner who has collections but none named "General", so at 50 collections it would be the 51st (AD-COL-1 rule 1).
  - **The close review.** It left 3 decisions, 7 patches, 2 deferrals and 9 dismissed findings. The decisions:
    - **R1:** `orders.create` has no qty cap and a bundle line is `perBundleQty × qty`, so an `OrderClosed` line can exceed 999 copies. COL-2 P2 then fails the delivery, and an accept would break the `"CollectionEntry".qty` CHECK.
    - **R2:** COL-2 Q4's rendering decision has no field in `PromptRowDTO`.
    - **R3:** the approved copy put a count inside a plural ("Agregamos 1 cartas"), and `entryCount` counts entries, not copies.
- **AI output (summary):** The agent recommended:
  - **(recommended)** D1: build 11.4 as a proof-only story committed right after 11.3 (#23), as 7.3, 7.4, 8.4, 9.4, 9.5 and 10.4 were (#32–#35). It leaves `impl2_scope` and does not count toward the 43. The alternatives were a gate exception, or postponing the epic.
  - **(recommended)** D2: five stored-only rows, `CollectionCreated`, `CollectionDeleted`, `CollectionEntryAdded`, `PromptAccepted` and `PromptDismissed`. The alternative was reusing a generic code.
  - **(recommended)** D3: `collectionsHandler(col)` runs COL-2 for `OrderClosed`, and any other type is `Unexpected`. `UNWIRED_HANDLERS` is removed.
  - **(recommended)** D4 as listed.
  - **(recommended)** D5: `CollectionLimitReached`, declared on `collections.addEntry`. The alternative was allowing a 51st collection.
  - **(recommended)** R1: a line becomes entries of at most 999 copies each, in order, with the same `orderId`, price and date. COL-2 P2 accepts any positive integer qty. The alternatives were failing the delivery, or clamping to 999.
  - **(recommended)** R2: defer to the prompt page story (UI 6.2, 9.4). The alternative was a DTO change with a `PromptShown` row.
  - **(recommended)** R3: count-neutral copy ("Entradas nuevas: {entryCount}.", "Entradas quitadas: …; de compras: …"). The alternative was keeping the approved copy.
  - Apply all 7 patches.
- **Human decision:** ACCEPT every recommendation, and sign the Epic 11 gate (#5).
- **Reason:** `done` keeps meaning what the bound tests prove, and the gate needs no exception. No bound test changes. `collections` never reads `orders` tables (AD-8, AD-9), and the 50-collection cap now holds on every path that creates a collection.
- **Also decided (the patches):**
  - `isCalendarDate` refuses year 0000, which Postgres cannot store, so the date is `RequestValidationFailed` instead of 500.
  - COL-2 P2 requires an ISO 8601 UTC close fact and treats a null `unitPriceCop` as absent.
  - `insertPrompt` raises `Unexpected` when the conflicting row is missing.
  - `CollectionNameTaken` cites `{ name }`, as the frozen 11.1 spec says.
  - ARCHITECTURE: AD-COL-1 rule 2 is no longer self-contradictory, and the §6.10 router table lists `InvalidAcquiredDate` and `CollectionLimitReached`.
  - The src tests cover a bundle line with no price and 2,000 copies, and they assert zero entries on refusal.
- **Also in this epic:**
  - Eight `collections.*` procedures are wired (`create`, `rename`, `delete`, `list`, `addEntry`, `prompts.accept`, `.dismiss`, `.list`), and so is the `collections` subscriber. The other nine stay unwired until Story 11.5.
  - `PgColRepository` joins the one repository (R-14).
  - The message-catalog test allows three new number placeholders: `entriesRemoved`, `platformPurchaseEntriesRemoved` and `entryCount`.
  - `[COL-1.MEC]` runs its 100 repetitions in 1,191–1,310 ms (local Postgres 16).
  - Epic 5's two `getAvailabilitySummary` deferrals stay open, now owned by Story 11.5 (its only consumer).
- **Environment note:** Docker did not run in this session. A `postgresql-16` cluster on port 55432 (`max_connections=200`, `fsync=off`, `full_page_writes=off`) ran `npm run test:ci` before the push. The agent read the script's own exit code (`TESTCI_EXIT`) before pushing. The worker restarted once mid-review and the cluster was started again.
- **Artifact changed:**
  - `src/modules/collections/**`.
  - `src/server/composition.ts` (+ test).
  - `src/shared-kernel/messages.generated.ts` and `messages.test.ts`.
  - `test-support/solu2/fixtures.ts`.
  - `_bmad-output/planning-artifacts/detailed-design/contracts.md`: COL-1 Q2, COL-2 P2, COL-3 Q1, and §13 (five rows and one trigger).
  - `schemas/operations.json` and `openapi.yaml` (`collections.addEntry`), and `ui-states.md`.
  - `_bmad-output/planning-artifacts/ARCHITECTURE.md` (AD-COL-1 rule 2, the §6.10 router table).
  - `deferred-work.md`.
  - The four Epic 11 story files.
  - `sprint-status.yaml` (11.4 out of `impl2_scope`; `epic-11: done`).
- **Decided by:** Martín.
