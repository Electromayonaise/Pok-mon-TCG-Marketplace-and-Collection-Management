# AI Decision Log — Impl-1 (Foundation Build, all 12 modules)

**Scope:** TEZG Impl-1: the scaffold and 43 of the 69 Solu-2 stories, built through the BMad Full Ceremony (`docs/impl-1/task-statement.md`). Earlier entries stay in `docs/plan-2/ai-log/decision-log.md`, `docs/solu-1/ai-log/decision-log-solu1.md` and `docs/solu-2/ai-log/decision-log-solu2.md`.
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

---

### 1. Impl-1 covers all 12 modules, and the project must end up with every story (Scope)

- **Phase:** 0 (statement adaptation).
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** Martín attaches the Impl-1 course statement and asks to adapt it to this repository. In his words: *"a diferencia del enunciado nosotros debemos de hacer todos los modulos y todas las hus (es un proyecto solo de los 2, que la idea es que quede completo)"*. He asks for the adaptation in a new folder and for the important decisions to be put to him, because this log must record his decisions.
- **AI output (summary):** The agent explained what Impl-1 asks for: a runnable hexagonal scaffold, 3 core stories of one module, ≥ 90 % passing tests, `sprint-status.yaml`, a walkthrough and this log. It noted that failure recovery and advanced testing are explicitly Impl-2's, then put the open decisions to Martín: the story cut, UI, deployment and gate cadence.
- **Human decision:** All 12 modules and, across Impl-1 and Impl-2, all 69 stories.
- **Reason:** TEZG is the pair's own product, not one module of a shared system, so a one-module slice would leave it incomplete. This is the same reading Plan-2 #1 and Solu-2 #1 made.
- **Artifact changed:** `docs/impl-1/task-statement.md` (scope note, Appendix B).
- **Decided by:** Martín.

### 2. `[CORRECTED]` The Impl-1 story cut: from "3 per module" to the dependency-closed 43 (Scope)

- **Phase:** 0.
- **Persona/Skill:** none (session planning), reading `docs/solu-2/planning/epics.md`.
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
- **Artifact changed:** `docs/impl-1/task-statement.md` Appendix B.
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
- **Artifact changed:** `docs/impl-1/task-statement.md` (§1, Appendix B.3).
- **Decided by:** Martín.

### 4. Run locally only, through Docker Compose (Scaffold)

- **Phase:** 0 (for Phase 1).
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** Where does the app run in Impl-1?
- **AI output (summary):** The agent recommended local only. `docker compose up` brings up Postgres 16 and the app, and one `npm` command runs everything. The reason given: the statement grades a deterministic one-command local run, and a real deployment brings in credentials and external services. The alternative offered: also deploy to Vercel Hobby + Supabase, as Plan-2's ARCHITECTURE describes.
- **Human decision:** ACCEPT local only.
- **Reason:** Determinism and a clean-clone run are what the checklist verifies. A deployment is left for later.
- **Artifact changed:** `docs/impl-1/task-statement.md` (§1, §6.2, Appendix A).
- **Decided by:** Martín.

### 5. One review and sign-off gate per epic (Governance)

- **Phase:** 0 (for Phases 2–3).
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** At which points does Martín review and sign off? This decides where his entries in this log come from.
- **AI output (summary):** The agent recommended a gate per epic. The agents take each story through the whole ceremony, including a fresh-context code review. At each epic's close, Martín triages the findings, accepts or rejects corrections and signs. The alternatives offered: a gate per story (most control, slowest) or per phase (fastest, fewer decisions of his in the log).
- **Human decision:** ACCEPT a gate per epic.
- **Reason:** With 43 stories, a per-story gate slows the build without adding control, because the code review runs on every story anyway. A per-epic gate still gives 13 decision points.
- **Artifact changed:** `docs/impl-1/task-statement.md` §3 (epic gate).
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
- **Artifact changed:** `package.json`, `package-lock.json`, `scripts/check-deps.mjs` (approval references), `docs/impl-1/task-statement.md` (§1 Stack, §4.2).
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
- **Artifact changed:** `.github/workflows/impl1-quality-gate.yml` (new); the triggers of `.github/workflows/solu1-quality-gate.yml` and `solu2-quality-gate.yml`, plus its mirror `docs/solu-2/test/ci/quality-gate.yml`; `package.json` (`gate:impl1`, `test`). All of these land in Story 1.1.
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
- **Artifact changed:** `docs/solu-2/planning/detailed-design/contracts.md` §13 (six templates), `src/server/trpc/messages.generated.ts` (regenerated), `src/server/trpc/messages.test.ts`, the Story 1.1 Review Findings and Change Log.
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
- **Artifact changed:** `docs/solu-2/test/nfr/canary_scan.test.ts` (line 47 and a comment citing this entry); the Story 1.2 Debug Log and Change Log.
- **Decided by:** Martín.
