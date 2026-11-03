# AI Decision Log — Impl-2 (Advanced implementation, testing alternatives and hardening)

**Scope:** TEZG Impl-2: the 7 reserved stories of the 69-story backlog (8.5, 8.6, 9.6, 11.5, 11.6, 13.5, 13.6), the two items Impl-1 left to Impl-2 (Story 2.4's sign-in completion and the jobs route), the five BMad testing flows, and the release quality gate. The course statement is the Impl-2 task statement (a course document, kept outside the repository like Impl-1's). Earlier entries stay in `_bmad-output/decision-logs/impl-1-ai-decision-log.md` and the logs before it.
**Pair:** Martín Gómez, Mateo Rubio. In Impl-2, Mateo takes the decisions this log records (#1).

**Operating rule (inherited).** The agent drafts and recommends. Mateo decides, through a choice menu in the terminal or in his own words, at the scope stage, at each spec approval, on each review finding and at each epic gate. This log records exactly what was decided and by whom. It never records an agent-inferred decision, and prompts are not reconstructed after the fact. Where the agent applied a default without asking, the entry says so.

**Entry fields:** Phase · Persona/Skill · Prompt (summary) · AI output (summary) · Human decision (ACCEPT / MODIFY / REJECT) · Reason · Artifact changed · **Decided by**. AI proposals that were rejected, corrected or improved are tagged `[REJECTED]`, `[CORRECTED]` or `[IMPROVED]`.

**Tagged AI proposals (index):**

| Entry | Tag | AI proposal | Outcome | Decided by |
| --- | --- | --- | --- | --- |
| #7 | `[CORRECTED]` | Impl-2 plan: finish sign-in "as Story 2.4's completion" and build the jobs route with no story | The agent found the gate conflict itself (a self-correction, not a human catch); Mateo chose two new stories, 1.6 and 2.6 | Mateo |
| #9 | `[CORRECTED]` | Impl-1 AI test `contact-domain.test.ts` "maximal trade": `if (steps.includes('collapsedItems')) expect(…)`, a conditional assertion that never ran (Blindly Green) | Made unconditional: the input must fit without a collapse; the collapse has its own forced test | Mateo |

---

### 1. Impl-2 is the 7 reserved stories plus Story 2.4's sign-in and the jobs route; Mateo decides (Scope)

- **Phase:** 0 (statement adaptation), on branch `impl-2` off `main` at `a7c5d81`.
- **Persona/Skill:** none (session planning), reading the Impl-2 task statement, `docs/impl-1/README.md`, `sprint-status.yaml`, `epics.md`, `deferred-work.md` and `impl1-test-review.md`.
- **Prompt (summary):** Mateo attached the Impl-2 course statement and asked the agent to read it and the Impl-1 README, run the process for each of the 7 stories left, address the whole rubric, overwrite the artifacts in `_bmad-output/` without duplicating them, and put everything else the task asks for in a README under `docs/impl-2/`, saying where each thing is and what changed in each artifact. He asked for a plan with the stories and every assumption before anything started, and then for every question to be put to him as a terminal menu.
- **AI output (summary):** The agent mapped the statement's generic "Stories X.4–X.6" to TEZG's 7 reserved stories, each paired with a testing flow: 8.5, 9.6, 11.6 and 13.6 ATDD-first (Flow A), 8.6 and 11.5 test-along (Flow B), 13.5 quality gate with k6 (Flow D), Playwright journeys for 9.6, 11.5 and 13.5 (Flow E), and Impl-1's test-review findings as Flow C. It reported four gaps against the rubric: no page exists for Flow E, neither Playwright, k6 nor a coverage tool is installed, the suite holds sleeps the "zero sleeps" check forbids, and sign-in is not configured. Then it asked:
  - **Who decides:** **(recommended)** Mateo; Martín, as in Impl-1; or the pair jointly.
  - **The two items Impl-1 handed to Impl-2** (Impl-1 #26 and #39 R4): Story 2.4's sign-up, sign-in and throttle hook, and the jobs route (`commission-reconcile`, order and offer expiry, `trm-fetch`, `JOBS_SECRET`, single-flight). **(recommended)** both: 2.4 gives Playwright a real sign-in page instead of a session seeded behind the app's back, and the jobs route is the single-flight and degradation hardening the rubric scores. The alternatives were only 2.4, only the jobs route, or neither (both stay in `deferred-work.md`).
- **Human decision:** ACCEPT both recommendations.
- **Reason:** Impl-2 must leave TEZG with every story (Impl-1 #1), and the two handed-over items are Impl-2's by Impl-1's own record; leaving them would break that promise. Mateo is the one running this task.
- **Artifact changed:** this log; `_bmad-output/implementation-artifacts/sprint-status.yaml` (Impl-2 header, next commit).
- **Decided by:** Mateo.

### 2. Flow E gets a thin UI slice of three pages (Scope)

- **Phase:** 0.
- **Persona/Skill:** none (session planning), reading `ux/C-UX-Scenarios/` and `ux/mockups/`.
- **Prompt (summary):** The statement makes Playwright E2E mandatory for interactive workflows, but the service has no pages: Impl-1 #3 gave the front end its own phase after Impl-2. How big should the slice pulled forward be?
- **AI output (summary):** **(recommended)** three pages, each backed by one of this task's stories and built from its mockup and `_tokens.css` with no UI library: the seller profile (UX 11.2, Story 13.5), the inbox and thread (UX 12.2, Story 9.6) and the binder (UX 9.1, Story 11.5), giving three journeys. The alternatives were one page (the public profile, which needs no sign-in) or four (adding the admin reconciliation page, UX 7.4, Story 8.5).
- **Human decision:** ACCEPT the recommendation.
- **Reason:** Three journeys cover one public read, one authenticated read-and-write flow and one authenticated reorder flow, so the POM is exercised across real interaction kinds; the rest of the front end stays in its own phase.
- **Artifact changed:** none yet (Phase C builds the pages).
- **Decided by:** Mateo.

### 3. New test tooling: Playwright, the V8 coverage provider, and k6 as a Docker image (Architecture)

- **Phase:** 0.
- **Persona/Skill:** none; `scripts/check-deps.mjs` refuses any package without a decision-log entry.
- **Prompt (summary):** Which tools may the task add for Flow E, the ≥ 90 % branch coverage requirement and the k6 load proof?
- **AI output (summary):** **(recommended)** `@playwright/test` and `@vitest/coverage-v8` as exact-pinned dev dependencies on the approved list, and k6 run as a pinned `grafana/k6` Docker image, so it adds no npm dependency and needs no install on a developer machine. The alternatives were a local k6 binary (installed on every machine and in CI), or dropping the coverage tool, which leaves the coverage requirement unproven.
- **Human decision:** ACCEPT the recommendation.
- **Reason:** Docker is already the one prerequisite of `npm test` (the Compose Postgres), so k6 in Docker adds no new prerequisite.
- **Artifact changed:** `package.json`, `scripts/check-deps.mjs` (approved list), when Phase A installs them.
- **Decided by:** Mateo.

### 4. One `impl-2` branch, a fresh-context review subagent per epic, and menus at spec, finding and gate (Governance)

- **Phase:** 0.
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** How should git, the code review the DoD asks for "in a fresh context" (`epics.md` DoD item 5), and the human check-ins run?
- **AI output (summary):**
  - **Git:** **(recommended)** one `impl-2` branch off `main`, one local commit per phase or story, nothing pushed or opened as a PR until Mateo says so. The alternatives were a branch per epic (as Impl-1's PRs #2–#11), committing on `main`, or no commits (the docs could then cite no hashes).
  - **Review:** **(recommended)** one `bmad-code-review` subagent per epic (Blind Hunter, Edge Case Hunter, Acceptance Auditor) in a fresh context; the agent triages and Mateo decides each finding. The alternative was a review in this session, which does not meet DoD item 5.
  - **Check-ins:** **(recommended)** per epic: spec approval, a decision on every review finding and AI-proposal correction, and the signed gate, plus a menu whenever a noteworthy choice comes up. The alternatives were only real forks (defaults logged as agent defaults), or a spec and close per story.
- **Human decision:** ACCEPT every recommendation. Mateo also asked the agent to propose the interesting choices it meets during development as menus and to record each answer here.
- **Reason:** It is the Impl-1 epic-batched ceremony (Impl-1 #5) with Mateo as decider, and it keeps every human decision on the record the rubric's AI-governance criterion reads.
- **Artifact changed:** none (git branch `impl-2`).
- **Decided by:** Mateo.

### 5. The Impl-2 final trace is `traceability-matrix.md`; superseded Impl-1 reports leave `_bmad-output/`; `docs/impl-2/README.md` maps everything (Governance)

- **Phase:** 0.
- **Persona/Skill:** none, reading `docs/README.md` (the "latest version only" rule) and `_bmad-output/README.md`.
- **Prompt (summary):** The statement names the trace `traceability-matrix.md`. Impl-1 kept a generated design matrix with that name and a hand-written `impl1-final-trace.md`. Mateo asked that artifacts be overwritten, not duplicated.
- **AI output (summary):** **(recommended)** extend `scripts/gen-solu2-trace.mjs` so `traceability-matrix.md` maps PRD requirement → story → test files → CI evidence → verdict and carries the gate decision; remove `impl1-final-trace.md` (it stays in git, and `docs/impl-2/README.md` says how to restore it); `impl1-test-review.md` becomes `test-review.md`, which the Impl-2 review overwrites. Records that are not versions of each other stay: `walkthrough-impl1.md` next to the new `walkthrough-impl2.md` (they cover different stories), and every decision log. The alternatives were renaming the Impl-1 trace to `final-trace.md`, or keeping both traces.
- **Human decision:** ACCEPT the recommendation.
- **Reason:** One file then answers "is every requirement proven?", under the name the statement asks for, and the generator keeps it current instead of a hand-maintained copy.
- **Artifact changed:** `scripts/gen-solu2-trace.mjs`, `traceability-matrix.md`, `impl1-final-trace.md` (removed), `impl1-test-review.md` → `test-review.md`, `docs/impl-2/README.md` (new), in Phase C.
- **Decided by:** Mateo.

### 6. New Impl-2 acceptance tests live in the ATDD and NFR files, bound to their story in the backlog source (Testing)

- **Phase:** 0, while drafting the Impl-2 test design.
- **Persona/Skill:** `bmad-testarch-test-design` (Murat), reading `scripts/check-atdd-red.mjs`, `scripts/gen-solu2-epics.mjs` and `scripts/gen-solu2-trace.mjs`.
- **Prompt (summary):** Flow A needs acceptance tests beyond the Solu-2 ones where the contract names behaviour no red test proves yet (for example "a run concurrent with deductions → no false discrepancy", COM-3; a stale tab racing other tabs, AD-MSG-3), and Flow D needs concurrency hammers. The agent found that the gates enforce "red until the story is done, green after" only for bracketed test ids that `epics.source.mjs` binds to a story, and that the risk register may only cite ids that exist.
- **AI output (summary):** **(recommended)** write them as new bracketed tests in `_bmad-output/test-artifacts/atdd/` or `nfr/`, bind each to its story in `epics.source.mjs` and regenerate `epics.md`, so `gate:atdd-red` enforces the red phase and the trace and risk register pick them up. The alternatives were colocating them in `src/**/*.test.ts` (no gate proves the red phase; the run log is the only proof), or splitting by flow.
- **Human decision:** ACCEPT the recommendation.
- **Reason:** A red phase a gate enforces is evidence; a red phase only a log shows can be skipped silently. Unit tests of Flows B and C stay colocated in `src/`, as in Impl-1, because they are not acceptance tests.
- **Consequence the agent noted:** each story's new tests, their binding and their risk rows land in one commit, before its production code, because `gate:trace` fails on a risk citing an id that does not exist yet.
- **Artifact changed:** `epics.source.mjs` and `epics.md` per story; `test-design.md` §2 per story.
- **Decided by:** Mateo.

### 7. `[CORRECTED]` Sign-in and the jobs route become two new stories, 1.6 and 2.6, not tasks of done stories (Scope)

- **Phase:** 0.
- **Persona/Skill:** `bmad-correct-course` (backlog change), reading `scripts/check-atdd-red.mjs`.
- **Prompt (summary):** Entry #1 brought Story 2.4's sign-in completion and the jobs route into Impl-2. The agent's plan had treated them as "complete Story 2.4" and "build the route". While designing their red tests it found that this cannot work with the gate: 2.4 is `done`, so any new test bound to it must pass at once (no red phase), and reopening 2.4 would require its passing tests to fail on `NotImplementedError`. The jobs route has no story at all; its three registry procedures (`jobs/trm-fetch`, `jobs/expiry-materialize`, `jobs/commission-reconcile`) are owned by the operations of Stories 4.4, 7.5 and 8.5.
- **AI output (summary):** The agent withdrew its plan's framing and offered **(recommended)** two new stories through `bmad-correct-course`: **1.6** "Run scheduled jobs single-flight behind `JOBS_SECRET`" (Epic 1, the platform) and **2.6** "Sign up, sign in and throttle failed attempts" (Epic 2), each with its own red tests, `sprint-status.yaml` row and gate-enforced red → done path; the backlog grows from 69 to 71 stories. The alternatives were tasks inside the existing stories (no red phase any gate tracks), or one combined Story 1.6 (69 → 70).
- **Human decision:** ACCEPT the recommendation (the corrected framing).
- **Reason:** "Done" keeps meaning what its bound tests prove (Impl-1 #26), and both items get the same ATDD discipline as the 7 reserved stories.
- **Artifact changed:** `epics.source.mjs`, `epics.md`, `sprint-status.yaml` (when each story's red tests land).
- **Decided by:** Mateo.

### 8. Flow C hardens Impl-1's tests: lock waits on `pg_stat_activity`, per-file 90 % branch coverage, and a dead domain function removed (Testing)

- **Phase:** A (shift-left), before any Impl-2 story code.
- **Persona/Skill:** `bmad-testarch-automate` (Flow C, test-after: coverage scan → gap analysis → regression tests), `bmad-testarch-framework`; inputs `impl1-test-review.md` (MEDIUM-1, -2, -3) and a V8 coverage run.
- **Prompt (summary):** The statement's checklist forbids sleeps and asks ≥ 90 % branch coverage on the core domain logic. The baseline (`evidence/impl2/01-coverage-baseline.log`) gave 91.55 % branches over the 13 domain cores from the unit project, with four cores below 90 %: `dsc.ts` 75 %, `trd.ts` 80.6 %, `contact.ts` 83.3 %, `ord.ts` 88.9 %. The suite held two 200 ms "is it still blocked?" sleeps, three 1–5 ms `setTimeout` interleavings in `db.test.ts`, a `pg_sleep(0.05)` that widened a race window in `dispatcher.test.ts`, and the deadlock watchdog timer copied into seven files.
- **AI output (summary):** Three menus:
  - **Coverage rule:** **(recommended)** a per-file threshold `{ branches: 90, perFile: true }` on `src/modules/*/domain/**` and unit tests backfilled for the weak cores. The alternatives were the global total only (already passing, so the weak cores stay weak) or counting the ATDD project too (needs a wrapper while the reserved tests are red).
  - **Lock waits:** **(recommended)** a helper that waits until `pg_stat_activity` shows the blocked statement with `wait_event_type = 'Lock'`, bounded by a probe count, not a clock. The alternative was `SET lock_timeout` and asserting `55P03`, which proves a timeout rather than the later success.
  - **Dead code:** the scan found `turnVerdict` in `trading/domain/trd.ts` with no caller since Impl-1 #35 (D4) replaced it with `offerActionRefusal`; it was the only reason `trd.ts` sat at 80.6 %. **(recommended)** delete it, because a test on dead code is padding. The alternative was keeping it with a unit test.
- **Human decision:** ACCEPT all three recommendations.
- **Agent defaults applied without a menu (reported here):**
  - The deadlock watchdog (a 3 s timer raced against the work) became `test-support/single-connection.ts`: a pool of one connection that refuses a second concurrent checkout at once, with the same message. It fails at once instead of after a timer, and the seven copies are one helper (MEDIUM-3).
  - `db.test.ts` forces its interleavings with gates the test opens itself; `dispatcher.test.ts`'s winner holds its row lock until the loser is either blocked on it (reported by Postgres) or has settled, so both interleavings are proven. The first attempt (wait only for the loser to settle) deadlocked, because the loser blocks in its attempt-count `UPDATE` before it ever reaches `SKIP LOCKED`; the helper got an `orSettled` option for this case.
  - `npm run gate:no-sleep` (`scripts/check-no-sleep.mjs`) is in `test:ci`. It refuses `waitForTimeout`, `time.sleep`, `pg_sleep`, `sleep(n)` and promise sleeps everywhere, and raw locators in Playwright specs; each rule first proves it catches a planted violation.
- **Evidence:**
  - **Mutation check** (`evidence/impl2/02-flowC-lock-mutation.log`): with the `FOR SHARE` at `identity/infra/pg.ts:362` removed, the hardened VER test fails ("no backend waited on a lock … after 5000 probes"); the old 200 ms version would have passed. The file was restored.
  - **After the backfill** (`evidence/impl2/03-coverage-after-flowC.log`): 593 unit tests pass, 95.81 % branches overall, every core ≥ 90 %.
  - `gate:no-sleep`: 0 problems.
- **Artifact changed:** `test-support/locks.ts`, `test-support/single-connection.ts` (new); `scripts/check-no-sleep.mjs` (new), `package.json` (`gate:no-sleep`, `test:unit --coverage`), `vitest.config.ts` (coverage); the seven watchdog files, `ver.v2.test.ts`, `inv.v2.test.ts`, `db.test.ts`, `dispatcher.test.ts`; the backfill in `dsc-domain.test.ts`, `ord-domain.test.ts`, `contact-domain.test.ts`, `trd-domain.test.ts`; `trading/domain/trd.ts` (`turnVerdict` removed) and its row in `detailed-design/ports-and-adapters.md`.
- **Decided by:** Mateo.

### 9. `[CORRECTED]` An Impl-1 AI test asserted only under a condition that never held (Testing)

- **Phase:** A, during the Flow C backfill of `contact.ts`.
- **Persona/Skill:** `bmad-testarch-automate` (gap analysis).
- **Prompt (summary):** To cover `contact.ts`'s `collapsedItems` branch, the agent read the existing composer tests. The Impl-1 "maximal trade" test (written by the agent in Story 9.3) ends with `if (m.truncationSteps.includes('collapsedItems')) expect(m.text).toMatch(/\+\d+ más/)`. Its input (letters, not emoji) always fits after the item names shrink, so the collapse never happens and the line never asserts anything, while the test reads as if it covered the collapse: the "Blindly Green" trap.
- **AI output (summary):** The agent wrote a backfill test that forces the collapse (ten 30-emoji names) and asked what to do with the old line: **(recommended)** make it unconditional, asserting that this input fits with `['offeredItems']` only and shows no "+N más"; delete it; or leave it.
- **Human decision:** ACCEPT the recommendation: the conditional becomes two unconditional assertions.
- **Reason:** A test may only assert what its input determines. Pinning "no collapse here" makes the old test fail if the truncation order ever changes, instead of silently skipping.
- **Artifact changed:** `src/modules/listings/contact-domain.test.ts`.
- **Decided by:** Mateo.

### 10. The Playwright framework and the Impl-2 CI gate are in place before the stories; traces are proven by an evidence run (Testing)

- **Phase:** A (shift-left: `bmad-testarch-framework`, `bmad-testarch-ci`), before any Impl-2 story code.
- **Persona/Skill:** `bmad-testarch-framework`, `bmad-testarch-ci` (Murat).
- **Prompt (summary):** The statement asks for the E2E framework and the CI quality gate before the complex stories, Playwright with Page Objects, web-first assertions and `trace: 'on-first-retry'`, and forensic traces "captured on CI". The configured option writes a `trace.zip` only for a test that failed and retried, so a green suite has none.
- **AI output (summary):** For the trace evidence: **(recommended)** keep `on-first-retry`, upload any retry trace from CI, and commit one `trace.zip` per journey from an evidence run (`npx playwright test --trace on`) at the close. The alternatives were a forced-retry demonstration run, or CI artifacts only.
- **Human decision:** ACCEPT the recommendation.
- **Agent defaults applied without a menu (reported here):**
  - **One command.** `npx playwright test` starts everything through `scripts/e2e-server.mjs`: the Compose Postgres (skipped in CI), a recreated and migrated `tezg_e2e` database, `next build` and `next start` on port 3100. It runs against the production build rather than `next dev`, so no on-demand compilation sits inside a web-first assertion's retry window. Next.js warns that `next start` does not support `output: 'standalone'`; it serves correctly, and the Docker image still uses the standalone server.
  - **Config** (`playwright.config.ts`): serial workers (the journeys share one database and each seeds its own rows), `retries` 1 locally and 2 in CI (so the first retry exists everywhere), `expect.timeout` 10 s as the auto-retry bound, es-CO locale and the Bogotá time zone, HTML and JSON reporters.
  - **Page Objects** in `_bmad-output/test-artifacts/e2e/pages/` (`BasePage`, `HomePage`), with role- and label-based locators; `gate:no-sleep` refuses a locator built in a spec. The E2E suite has its own SQL seed helpers, because the Vitest fixtures import `vitest`'s `expect`.
  - **App shell:** `app/layout.tsx`, `app/page.tsx` (which shows the readiness verdict, so the smoke journey proves the server, the database and its migrations), `app/globals.css` (the mockups' tokens without the mock chrome), and `app/_server/runtime.ts`, the composition root that the tRPC route and the pages share (the system clock stays outside `src/`, AD-SYS-6).
  - **CI:** `.github/workflows/impl1-quality-gate.yml` becomes `impl2-quality-gate.yml`: the unchanged `gate` job, an `e2e` job that uploads the report and traces whether it passes or fails, and a `release` job that prints `Quality gate: PASS` only when both passed. The k6 job joins it with Story 13.5 (Flow D).
- **Evidence:** the first run of the smoke journey passed against the production build (1 passed, 36.4 s, exit 0).
- **Artifact changed:** `playwright.config.ts`, `scripts/e2e-server.mjs`, `_bmad-output/test-artifacts/e2e/` (new); `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/_server/runtime.ts` (new), `app/api/trpc/[trpc]/route.ts`; `.github/workflows/impl2-quality-gate.yml` (renamed from `impl1-quality-gate.yml`); the Solu-2 workflow comment and its mirror; `test-support/README.md`; `tsconfig.json`; `.gitignore`.
- **Decided by:** Mateo.

### 11. Specs of Stories 1.6 and 2.6: an outbox-sweep job route, a hand-run scheduler, sign-in before verification, and the throttle as designed (Scope)

- **Phase:** B (spec approval of the first Impl-2 batch: Epics 1 and 2), before their red tests.
- **Persona/Skill:** `bmad-create-story`, reading `contracts.md` (COM-3 P2, S-FR-IDN-7, §15 S-SYS), `ARCHITECTURE.md` (§4, §13, AD-IDN-3, S-8, S-9), `operations.json` and `deferred-work.md`.
- **Prompt (summary):** The two stories of #7 needed four choices the design left open:
  - The registry has three job routes, but ARCH §13 also lists an `outbox-sweep` job with no route, so nothing would ever trigger the sweeper in production (NFR-SYS-6).
  - Whether to ship the scheduler (G-3's GitHub Actions tick) that calls the routes.
  - AD-IDN-3 wants email verification, but no mail provider exists, and buying is already gated by `requireCanBuy`.
  - The Epic 2 review's deferred throttle question: a per-account limit lets anyone who knows an email lock that account out.
- **AI output (summary):**
  - **Sweep:** **(recommended)** a fourth registry procedure, `jobs/outbox-sweep` (op `S-SYS.sweep`), a contract change with `openapi.yaml` regenerated. The alternatives were running the sweep inside `expiry-materialize` (one JobRun row hiding two jobs), or deferring it.
  - **Scheduler:** **(recommended)** `.github/workflows/jobs-tick.yml` with `workflow_dispatch` only, its `schedule:` commented until a deployment exists, so the repository never fails an hourly run. The alternatives were the full hourly schedule now (it fails every hour until a deployment exists), or no workflow.
  - **Verification:** **(recommended)** an unverified user may sign in, and `requireCanBuy` keeps refusing buying, offering and writing; Better Auth sends verification through an `EmailSender` port whose production binding is `UNWIRED_EMAIL` (NotImplemented, like storage) and whose test binding captures the link. The alternative was blocking sign-in until verified, which with no mail provider means no real user can sign in until launch.
  - **Throttle key:** **(recommended)** AD-IDN-3 as designed, 10 failed sign-ins per account and 30 per IP in 15 minutes, with the lockout risk accepted and recorded. The alternative keyed the account limit by account and IP together, a contract change that gives a distributed attacker 10 tries per IP.
- **Human decision:** ACCEPT all four recommendations.
- **Reason:** Each closes a gap without inventing a provider the project does not have: the sweep and the scheduler make the resilience design reachable; sign-in without verification keeps the product usable while the money paths stay gated.
- **Also recorded (Story 1.6's red phase, `evidence/impl2/10-story-1.6-red.log`):** the first red run had `[S-SYS.jobs.C1]` failing "for another reason": `expect(rejected).toEqual([])` reported an assertion error and hid the `NotImplementedError` behind it. The agent found it through `gate:atdd-red`, and the test now rethrows the first rejection, so it fails with its real cause in the red phase and in any later regression.
- **Artifact changed:** `operations.json`, `openapi.yaml` and the generated surface, `contracts.md` §15 (`S-SYS.jobs`, `S-SYS.sweep`), `dto.ts`, `admin-events.dto.ts`, `epics.source.mjs` and `epics.md` (Story 1.6; 2.6 with its red tests), `test-design.md` §2 (R-21), `sprint-status.yaml`, Story 1.6's file.
- **Decided by:** Mateo.

### 12. Story 2.6 guards Better Auth's routes from outside, and its red tests run through the real handler (Architecture)

- **Phase:** B (Story 2.6's red phase), after Story 1.6 closed green (`7ac39a2`).
- **Persona/Skill:** `bmad-testarch-atdd` (Murat), `bmad-dev-story` (Amelia), reading Better Auth 1.7.7's option types (`hooks`, `databaseHooks`, `emailVerification`, `rateLimit`).
- **Prompt (summary):** AD-IDN-3 names "a Better Auth `hooks.before` on sign-in and sign-up". The agent had to decide where the throttle check sits.
- **AI output (summary):** The agent chose, and reports here, a guard around Better Auth's handler (`serveAuth` in `src/server/auth-routes.ts`) rather than Better Auth's internal `hooks.before`, for three reasons:
  - Inside Better Auth, a refusal becomes Better Auth's error JSON. Outside it, a 429 is the platform's `{ error: ErrorBody }` with the `retryAt` citation (AD-SYS-1).
  - A thrown `NotImplementedError` inside a hook becomes a generic 500, so the red tests would fail "for another reason". At the guard, the red phase fails on `NotImplemented: auth.serveAuth`, which `gate:atdd-red` requires.
  - The guard sees the request before Better Auth parses it, so the consent fields can be checked and removed without declaring them as Better Auth inputs.

  The behaviour is the one AD-IDN-3 describes: the check runs before the password is verified, one row per known key is written after a failure, and Better Auth's own rate limiter is off. The consent instant is written by Better Auth's `databaseHooks.user.create.before` from the Clock.
- **Human decision:** none asked: an implementation choice inside the approved design (#11), recorded as an agent default. The bound tests pin the AD-IDN-3 behaviour, whichever mechanism carries it.
- **Red phase:** `evidence/impl2/12-story-2.6-red.log`: 6 failed on `NotImplementedError`; `gate:atdd-red:impl1` 34 red for the right reason, 0 not as expected.
- **Artifact changed:** `contracts.md` (S-FR-IDN-7, the Story 2.6 clauses), `epics.source.mjs` and `epics.md` (Story 2.6; 71 stories), `test-design.md` §2 (R-22), `sprint-status.yaml`, Story 2.6's file, `_bmad-output/test-artifacts/atdd/idn_auth.test.ts`.
- **Decided by:** agent default within #11 (no menu).
