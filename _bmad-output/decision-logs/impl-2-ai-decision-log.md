# AI Decision Log — Impl-2 (Advanced implementation, testing alternatives and hardening)

**Scope:** TEZG Impl-2: the 7 reserved stories of the 69-story backlog (8.5, 8.6, 9.6, 11.5, 11.6, 13.5, 13.6), the two items Impl-1 left to Impl-2 (Story 2.4's sign-in completion and the jobs route), the five BMad testing flows, and the release quality gate. The course statement is the Impl-2 task statement (a course document, kept outside the repository like Impl-1's). Earlier entries stay in `_bmad-output/decision-logs/impl-1-ai-decision-log.md` and the logs before it.
**Pair:** Martín Gómez, Mateo Rubio. In Impl-2, Mateo takes the decisions this log records (#1).

**Operating rule (inherited).** The agent drafts and recommends. Mateo decides, through a choice menu in the terminal or in his own words, at the scope stage, at each spec approval, on each review finding and at each epic gate. This log records exactly what was decided and by whom. It never records an agent-inferred decision, and prompts are not reconstructed after the fact. Where the agent applied a default without asking, the entry says so.

**Entry fields:** Phase · Persona/Skill · Prompt (summary) · AI output (summary) · Human decision (ACCEPT / MODIFY / REJECT) · Reason · Artifact changed · **Decided by**. AI proposals that were rejected, corrected or improved are tagged `[REJECTED]`, `[CORRECTED]` or `[IMPROVED]`.

**Tagged AI proposals (index):**

| Entry | Tag | AI proposal | Outcome | Decided by |
| --- | --- | --- | --- | --- |
| #7 | `[CORRECTED]` | Impl-2 plan: finish sign-in "as Story 2.4's completion" and build the jobs route with no story | The agent found the gate conflict itself (a self-correction, not a human catch); Mateo chose two new stories, 1.6 and 2.6 | Mateo |
| #8 | `[CORRECTED]` | Impl-1 AI tests (written by the BMad agents) proved lock waits with 200 ms sleeps, a `pg_sleep(0.05)` and a timer watchdog (Flaky Sleeper); the mutation check shows the sleep version passes with the `FOR SHARE` lock removed | `untilBlockedOnLock` on `pg_stat_activity`, `single-connection.ts` and `gate:no-sleep`; Mateo confirmed the AI authorship (#27) | Mateo |
| #9 | `[CORRECTED]` | Impl-1 AI test `contact-domain.test.ts` "maximal trade": `if (steps.includes('collapsedItems')) expect(…)`, a conditional assertion that never ran (Blindly Green) | Made unconditional: the input must fit without a collapse; the collapse has its own forced test | Mateo |
| #23 | `[CORRECTED]` | Story 2.6 (AI): sign-up with `UNWIRED_EMAIL` "fails as NotImplemented (500), never silently", recorded in `deferred-work.md` | Found by the fresh-context review: Better Auth commits the user and answers 200 though the email fails, so the account can never be verified; Mateo chose to refuse sign-up before any write while mail is unwired | Mateo |
| #23 | `[CORRECTED]` | Story 11.5 (AI): the `/ingresar?siguiente=` guard (a regex that refused only `//` and `/\` after the first slash) ("a path on this site only") | Found by the review: `/%09/evil.com` redirects off-site after sign-in; Mateo approved resolving against the origin, with unit tests | Mateo |

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

### 8. `[CORRECTED]` Flow C hardens Impl-1's tests: lock waits on `pg_stat_activity`, per-file 90 % branch coverage, and a dead domain function removed (Testing)

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

### 13. Epic 8 specs: the reconcile job stops at 50 s and restarts, three new red tests for 8.5, and a 50-line admin ledger (Scope)

- **Phase:** B (spec approval of Epic 8: Stories 8.5 and 8.6).
- **Persona/Skill:** `bmad-create-story`, `bmad-testarch-atdd` (Murat), reading COM-3, S-FR-COM-7 and S-FR-COM-8.ledger in `contracts.md` and the NFR-COM-2 row in `nfr-evidence.md`.
- **Prompt (summary):** Three choices the contracts left open. COM-3 says the all-accounts job "resumes on the next run", but the schema has no cursor. NFR-COM-2's measurement (difference 0 over 10,000 operations with 20 % duplicates) had no test. The admin ledger has no page size.
- **AI output (summary):**
  - **Bound:** **(recommended)** stop at 50 s of Clock time, cite `partial: true`, restart from the first account next run. The alternatives were a persisted resume cursor (a migration) or no bound.
  - **New 8.5 tests:** **(recommended)** all three: `[COM-3.C1]` (reconcile racing 50 concurrent deductions, 20 repetitions), `[COM-3.C2]` (the job path through `/api/jobs/commission-reconcile`), `[NFR-COM-2.drift]` (10,000 seeded-random operations). The alternatives were the two concurrency tests only, or none.
  - **Ledger page:** **(recommended)** 50 lines newest first with a keyset cursor, as on the business's own page (Impl-1 #33). The alternative was 25.
- **Human decision:** ACCEPT all three recommendations.
- **Red phase:** `evidence/impl2/14-story-8.5-red.log`: the 6 Solu-2 tests and the 3 new ones fail on `NotImplemented` (C2 surfaces it from the failed JobRun's `errorCode`, because the 500 body carries no message).
- **Artifact changed:** `contracts.md` (COM-3 concurrency and batch bound), `epics.source.mjs` and `epics.md` (8.5 binds 9 tests and depends on 1.6), `test-design.md` §2 (R-23), `sprint-status.yaml`, `atdd/com_reconcile.test.ts`, `nfr/com2_drift.test.ts`.
- **Decided by:** Mateo.

### 14. Story 8.5 is green: reconcile reads each account `FOR SHARE` before its ledger, and the drift proof replays 10,000 operations with 0 discrepancies (Implementation)

- **Phase:** B (Story 8.5 green), in a story subagent (the user asked that every story be dispatched to a subagent to save tokens).
- **Persona/Skill:** `bmad-dev-story` (Amelia), reading COM-3, COM-3.last and #13.
- **Prompt (summary):** Implement `reconcile` and `getLastReconciliation` until the 9 bound tests pass, within #13's 50 s bound and with the job lock inside COM-3 (P2).
- **AI output (summary):** a pure `accountDiscrepancies` check in the domain; one transaction per account that reads the account `FOR SHARE` and then the ledger's sum, count and highest seq; on the job path, the lock held in an outer transaction that also writes the run row and its audit row; the stored-only codes `ReconciliationClean`, `…Discrepancies`, `…AccountNotFound`, `…Partial`; the admin procedures `commission.reconcile` and `commission.admin.lastReconciliation`; NFR-COM-2 green.
- **Agent defaults (no menu):**
  - A ledger is gapless only if its entry count and its highest seq both equal `ledgerSeq`.
  - A partial run cites `ReconciliationPartial` first, then one `FR-COM-8` citation per discrepancy.
  - The account reads run in read-write transactions, because Postgres refuses `FOR SHARE` in read-only ones.
  - Extra integration tests cover the 50 s bound (with a Clock that advances on each read), `AdminOnly` before any write, and an empty last run.
- **Problems found and fixed in the subagent's own work:** the message catalog's placeholder allow-list (`messages.test.ts`) rejected the new placeholders, so `businessId`, `accountsChecked`, `rateBps`, `expected` and `actual` were added. And `[SYS-6.R1]` read a test helper called `now()` as a wall-clock read, so it was renamed. No defect was found in earlier code.
- **Evidence:** `evidence/impl2/14-story-8.5-red.log`, `evidence/impl2/15-story-8.5-green.log`: `test:ci` exit 0, with `solu2-atdd` at 345 green and 22 red for the right reason, and `solu2-nfr` at 24 green. `[NFR-COM-2.drift]`: 1,988 top-ups, 6,480 orders and 1,532 duplicate deliveries (19.1 %), 0 discrepancies, about 170 s.
- **Deferred:** a restart-from-the-first-account run can keep missing the last accounts at large volume (owner: the launch checklist); an admin all-accounts run happens inside the request and can take up to 50 s (owner: the UI 7.4 story).
- **Artifact changed:** the commission module, `composition.ts` (+ test), `messages.test.ts`, `contracts.md` §13, `nfr-evidence.md`, `deferred-work.md`, `sprint-status.yaml`, `traceability-matrix.md`, Story 8.5's file. Commit `30e2654`.
- **Decided by:** agent default within #13.

### 15. Story 9.6 specs: bounded inbox and thread reads, a stale-tab hammer, and a real sign-in page for the E2E journeys (Scope)

- **Phase:** B (spec approval of Story 9.6 and its Flow E slice), asked while Story 8.6 ran in its subagent.
- **Persona/Skill:** `bmad-create-story`, `bmad-testarch-atdd` (Murat), `bmad-ux` (page 12.2), reading S-FR-MSG-7, S-FR-MSG-8, AD-MSG-3 and the messaging DTOs.
- **Prompt (summary):** Four choices the contracts and the UX left open: the page sizes (`ListInbox` has a cursor and `GetThread` an `afterSeq`, neither with a size); the new red tests for Flow A + D; how the inbox and binder journeys sign in, since Story 2.6 built only the API; and when a thread becomes read on page 12.2.
- **AI output (summary):**
  - **Page sizes:** **(recommended)** 20 conversations per inbox page by `(lastMessageAt desc, id)` with a keyset cursor, and at most 100 messages per thread call. The alternatives were inbox 50 with an unbounded thread, or inbox 20 with an unbounded thread.
  - **New red tests:** **(recommended)** `[S-FR-MSG-7.C1]` (50 concurrent `markRead` calls with random seqs, 20 repetitions: `lastReadSeq` ends at the highest seq and never goes down) and `[S-FR-MSG-7.f2]` (a non-participant is refused on inbox, thread, `markRead` and mute with zero writes). The alternatives were the hammer only, or no new tests.
  - **Sign-in:** **(recommended)** 9.6's UI slice adds `/ingresar` (email and password, es-CO errors, a 429 shown with its retry time) and `/mensajes`, and the journey signs in through the page with a seeded, verified user. The alternatives were adding a sign-up page too, or injecting a signed session cookie.
  - **Read marks:** **(recommended)** opening a conversation calls `markRead` with the last seq shown, and mute is a toggle. The alternative was an explicit "mark as read" button.
- **Human decision:** ACCEPT all four recommendations.
- **Reason:** Bounded reads keep the inbox fast at any volume; the hammer is the Flow D proof of AD-MSG-3; a real sign-in page keeps the E2E journey honest end to end.
- **Artifact changed:** none yet (Story 9.6's red and green commits).
- **Decided by:** Mateo.

### 16. Story 8.6 is green; a mistaken future rate is corrected by a later one, and page 7.4's text is fixed (Implementation + Scope)

- **Phase:** B (Story 8.6 green, Flow B test-along), in a story subagent; then a menu for the open decision it reported.
- **Persona/Skill:** `bmad-dev-story` (Amelia), reading S-FR-COM-7, S-FR-COM-7.list, S-FR-COM-8.ledger, AD-COM-2 rule 6 and #13.
- **Prompt (summary):** Implement the three operations test-along until the 4 bound tests pass, with #13's 50-line ledger and a seq keyset.
- **AI output (summary):** pure rate rules in the domain (the 60 s tolerance, the `max(effectiveFrom, now)` clamp, the rate in force); an append-only setting with its audit row; an account-bound ledger cursor; the admin procedures `commission.admin.setRate`, `.rates` and `.ledger`; 5 domain and 6 integration tests, plus one HTTP test.
- **Agent defaults (no menu):**
  - A second setting at the same instant is `RequestValidationFailed` on `effectiveFrom`, with zero writes, so no new code was invented. `ON CONFLICT DO NOTHING` makes a concurrent pair get the refusal, never a 500.
  - Exactly 60 s in the past is accepted and stored as now.
  - A cursor from another account or another list is refused.
  - The rate list is ordered newest `effectiveFrom` first.
- **Defect found and fixed (Impl-1 code):** `newestLedgerLines` sorted by `seq::text`, so the business's own account page (S-FR-COM-9, Story 8.1) listed seq 9 before 52 and showed the wrong 50 lines once a ledger passed 9 entries. It now sorts by the numeric column, and a new test fails on the old SQL.
- **Open decision put to Mateo:** page 7.4 said a mistaken future rate "is replaced by scheduling another row with the same or an earlier start", but `UNIQUE (effectiveFrom)` refuses the same start and an earlier start never overrides a later one. Options: **(recommended)** keep the contract and fix page 7.4's text: correct with a later start, and the mistaken rate applies in between; drop the unique key so the newest row wins at an instant (a migration and a contract change); or allow a same-start replacement while still in the future (a migration and a contract change).
- **Human decision:** ACCEPT the recommendation: page 7.4's Editing row now describes the correction by a later start.
- **Evidence:** `evidence/impl2/16-story-8.6-green.log`: `test:ci` exit 0, `solu2-atdd` 349 green and 18 red for the right reason, `domain/com.ts` 98.57 % branches.
- **Deferred:** page 7.4's "Registrada" column and its worked example have no field in `ListCommissionRatesResponse`; `listCommissionRates` has no paging (owner: the UI 7.4 story).
- **Artifact changed:** the commission module, `composition.ts` (+ test), `contracts.md` §15 and §15.12, `deferred-work.md`, `sprint-status.yaml` (8.6 and Epic 8 `done`), `traceability-matrix.md`, Story 8.6's file (commit `ecd8ca6`); `ux/C-UX-Scenarios/…/7.4-rate-settings-reconciliation.md` (this entry's commit).
- **Decided by:** Mateo (the open decision); agent defaults within #13.

### 17. Epic 11 specs: a batch identity port for the wishlist, link-spoof and NFR-COL-2 tests, and a binder journey (Scope)

- **Phase:** B (spec approval of Stories 11.5 and 11.6), asked while Story 9.6 ran in its subagent.
- **Persona/Skill:** `bmad-create-story`, `bmad-testarch-atdd` and `bmad-testarch-nfr` (Murat), reading S-FR-COL-3..6, the collections DTOs, `deferred-work.md` (Epic 5) and `nfr-evidence.md` (NFR-COL-2).
- **Prompt (summary):** 11.6 is proof-only: its tests prove 11.5's operations, so the two stories land together in one subagent (the red gate fails if one is `done` while the other's tests already pass). Three choices: an Epic 5 deferral gives the COL wishlist a batch identity port (`getSellerKinds`) plus AD-INV-3 rule 2's parity test; which new tests to add; and what the binder's E2E journey covers.
- **AI output (summary):**
  - **Batch port:** **(recommended)** listings asks identity once per page through `getSellerKinds`, and a parity test proves the batch and single forms agree. This closes the Epic 5 deferral and supports NFR-COL-2's wishlist budget. The alternative was keeping per-seller reads and measuring first.
  - **New tests:** **(recommended)** `[S-FR-COL-3.f2]`, red before code (`javascript:`, `data:`, `HTTP://`, userinfo and over-long URLs refused with `InvalidExternalLink` on the field; R-28), plus the NFR-COL-2 benchmark (a 500-entry sorted binder at p95 ≤ 800 ms, a 200-card wishlist at ≤ 1,000 ms). The alternatives were only one of the two.
  - **Binder journey:** **(recommended)** sign in, open a seeded binder, switch the sort (stable on reload), add a promo card by an https link, and see an http:// link refused on the field. The alternatives were adding the wishlist panel, or a read-only binder.
- **Human decision:** ACCEPT all three recommendations.
- **Artifact changed:** none yet (the Stories 11.5 and 11.6 commits).
- **Decided by:** Mateo.

### 18. Epic 13 specs: k6 locally and as a blocking CI job, two race tests and a profile benchmark, and a public profile journey (Scope)

- **Phase:** B (spec approval of Stories 13.5 and 13.6), asked while Story 9.6 ran in its subagent.
- **Persona/Skill:** `bmad-testarch-nfr` (k6) and `bmad-testarch-atdd` (Murat), `bmad-ux` (page 11.2), reading S-FR-REP-5..7, NFR-REP-2 and test-design.md §7.4.
- **Prompt (summary):** 13.6 is proof-only, so 13.5 and 13.6 land together. Three choices: how the k6 proof runs and whether CI enforces it, which new tests to add, and what the public profile journey covers.
- **AI output (summary):**
  - **k6:** **(recommended)** `npm run nfr:k6` seeds `tezg_k6` with the §3 marketplace seed (a Vitest seed proof that also asserts the seed counts), serves the production build, and runs `grafana/k6:1.4.2` in Docker: a 50-VU ramp for 60 s on `reputation.profile` and `catalog.browse`. Thresholds: profile p95 ≤ 300 ms and p99 ≤ 800 ms, browse p95 ≤ 1,000 ms, 0 % 5xx, < 1 % errors. CI gets an `nfr-k6` job that the release gate requires. The alternatives were local only, or a non-blocking CI job.
  - **New tests:** **(recommended)** `[S-FR-REP-7.C1]`, red (100 rounds of profile reads racing hides and unhides: every read's aggregate count equals its page's visible reviews, one `REPEATABLE READ` snapshot); `[S-FR-REP-5.C1]`, red (20 concurrent hides of one listing: one log row and one hide); and the NFR-REP-2 profile benchmark (p95 ≤ 300 ms). The alternatives were the benchmark only, or the races only.
  - **Profile journey:** **(recommended)** with no sign-in, a visitor sees a seeded seller's rating, count and first page of visible reviews; a hidden review is neither shown nor counted; an unknown seller shows the es-CO not-found state. The alternatives were adding paging, or the header only.
- **Human decision:** ACCEPT all three recommendations.
- **Artifact changed:** none yet (the Stories 13.5 and 13.6 commits).
- **Decided by:** Mateo.

### 19. Story 9.6 is green with the first two UI pages and a Playwright journey; a second dead domain stub is removed (Implementation)

- **Phase:** B (Story 9.6, Flow A + D + E), in a story subagent. It was resumed once after an API usage limit interrupted it mid-run; no work was lost.
- **Persona/Skill:** `bmad-dev-story` (Amelia), `bmad-testarch-atdd` (Murat), reading S-FR-MSG-7, S-FR-MSG-8, AD-MSG-3, page 12.2 and #15.
- **Prompt (summary):** Red tests `[S-FR-MSG-7.C1]` and `[S-FR-MSG-7.f2]` before any code (`0291b05`). Then the four use cases, their procedures, the pages `/ingresar` and `/mensajes`, and a Playwright journey, within #15's page sizes.
- **AI output (summary):** pure read-state rules and an inbox keyset in the domain; one conditional read-mark statement; a buyer-only mute and an explained business no-op; four stored-only codes (`ConversationThreadShown`, `ConversationMuted`, `ConversationUnmuted`, `MuteNotAvailableToBusiness`); the procedures `messaging.inbox`, `.thread`, `.markRead`, `.setMuted`. The sign-in page posts to the guarded Better Auth route; the inbox shows badges and the total, marks a thread read on open, has a mute toggle, and polls every 30 s. Page objects `SignInPage` and `InboxPage`, and a journey that seeds a verified buyer with Better Auth's own password hash.
- **Agent defaults (no menu):**
  - `markRead` writes nothing when the clamped seq is not above the mark. Read marks and mutes write no audit rows.
  - A repeated mute keeps the first `mutedAt`.
  - A negative or fractional seq is `RequestValidationFailed`.
  - Since the inbox DTO has no role, a business also sees the mute toggle, and its click shows the server's notice.
  - The client files reference the DOM lib, which `tsconfig.json` lacks.
- **Test problem found and fixed:** the first E2E run failed with a strict-mode violation, because Next.js's route announcer is a second `role=alert`. The sign-in page object now scopes its locators to the named form.
- **Dead code put to Mateo:** the subagent reported `sendEligibility` in `messaging/domain/msg.ts`, a `NotImplementedError` stub nothing calls (Story 9.2 uses identity's `requireMessagingEligibility`). Options: **(recommended)** delete it, as with `turnVerdict` (#8); or keep it and record it. **Human decision:** ACCEPT the recommendation: deleted, and its row in `ports-and-adapters.md` is updated.
- **Evidence:** `evidence/impl2/17-story-9.6-red.log` (6 failed on `NotImplemented`), `18-story-9.6-e2e.log` (Playwright 3 passed, 21.8 s), `19-story-9.6-green.log` (`test:ci` exit 0, `solu2-atdd` 355 green and 14 red for the right reason, `domain/msg.ts` 100 % branches).
- **Deferred:** no inbox preview, verification markers or per-message Pending notice (DTO fields); no composer, filters or deep link; the business sees the mute toggle; one identity call per shop for names; no return-to page, sign-out or sign-up on `/ingresar`.
- **Artifact changed:** the messaging module, `composition.ts` (+ test), `app/` (`_client/api.ts`, `_server/runtime.ts` `callProcedure`, `ingresar/`, `mensajes/`, `layout.tsx`), `_bmad-output/test-artifacts/e2e/` (`inbox.spec.ts`, `pages/SignInPage.ts`, `pages/InboxPage.ts`, `support/inbox-seed.ts`), `contracts.md`, `epics.source.mjs` and `epics.md`, `test-design.md` (R-26), `deferred-work.md`, `nfr-evidence.md`, `sprint-status.yaml` (9.6 and Epic 9 `done`), `traceability-matrix.md`, Story 9.6's file (commits `0291b05`, `90db9da`); `domain/msg.ts` and `ports-and-adapters.md` (this entry's commit).
- **Decided by:** Mateo (#15 and the dead stub); agent defaults within #15.

### 20. Stories 11.5 and 11.6 are green with the binder pages; an unsafe link answers its registry code over HTTP too (Implementation + Architecture)

- **Phase:** B (Stories 11.5 and 11.6 together; Flow A for 11.6's red test `7c78cb1`, then Flow B + D + E), in a story subagent; then a menu on the contract mismatch it reported.
- **Persona/Skill:** `bmad-dev-story` (Amelia), `bmad-testarch-atdd` and `-nfr` (Murat), reading S-FR-COL-3..6, AD-COL-1, S-12 and #17.
- **AI output (summary):** the link rule, the binder order (`entryId` as the last tie-break), completion (`null` for 0 cards), move/copy, layout, reorder and the wishlist; listings' availability now reads verification through batch `getSellerKinds` calls of at most 500 ids, with AD-INV-3 rule 2's parity test (a deliberate bad change made it fail, then it was reverted); 9 procedures; NFR-COL-2 green (a 500-entry sorted binder at p95 20.7 ms; a 200-card wishlist at 24.4 ms); the pages `/coleccion`, `/coleccion/[id]` and `/coleccion/[id]/agregar`, and `/ingresar?siguiente=` (same-site paths only); page objects `BinderPage` and `AddLinkPage`, and a binder journey.
- **Agent defaults (no menu):**
  - The sort is ascending, with missing values last; `setNumber` orders by set, then by card number as written.
  - `BinderEntryDTO` gained `externalUrl`, `imageUrl` and `orderId`.
  - A reorder names every entry exactly once.
  - Layout, reorder and real wishlist changes are audited.
  - The wishlist is ordered by lowest price, with unavailable cards last.
  - Routes follow the UX spec, `/coleccion/<id>`.
- **Mismatch put to Mateo:** the DTO's `@pattern ^https://` made the tRPC parser refuse `http://`, `javascript:`, `data:` and `//host` with the generic `RequestValidationFailed`, before the service ran. So over HTTP, S-FR-COL-3's own `InvalidExternalLink` appeared only for userinfo or over-long links. Options: **(recommended)** drop the `@pattern` so every unsafe link reaches the service and answers the registry code; or keep two codes for one rule. **Human decision:** ACCEPT the recommendation: `@pattern` removed from `url` and `imageUrl`, the zod inputs and OpenAPI regenerated, and the HTTP test now expects `InvalidExternalLink`.
- **Evidence:** `evidence/impl2/20-story-11.6-red.log`, `21-story-11.5-e2e.log` (Playwright 4 passed, 17.8 s), `22-story-11.5-11.6-green.log` (`test:ci` exit 0, `solu2-atdd` 364 green and 6 red for the right reason, `solu2-nfr` 26 green, `domain/col.ts` 100 % branches).
- **Artifact changed:** the collections module, listings' `inv.v2.ts` (+ test), `operations.json`, `openapi.yaml`, `composition.ts` (+ test), the ATDD and NFR files, the E2E files (`binder.spec.ts`, `BinderPage.ts`, `AddLinkPage.ts`, `support/binder-seed.ts`, `support/db.ts`), `contracts.md`, `test-design.md` (R-28), `epics.source.mjs` and `epics.md`, `nfr-evidence.md`, `deferred-work.md`, `sprint-status.yaml` (11.5, 11.6 and Epic 11 `done`), both story files (commits `7c78cb1`, `7162354`); `col.v2.dto.ts`, the generated inputs, OpenAPI and `composition.test.ts` (this entry's commit).
- **Decided by:** Mateo (#17 and the mismatch); agent defaults within #17.

### 21. Stories 13.5 and 13.6 close the backlog: every ATDD and NFR test is green, k6 passes, and CI drives k6 at a fixed rate (Implementation + Testing)

- **Phase:** B (Stories 13.5 and 13.6, Flow A + D + E), in a story subagent; then a menu on the k6 risk it reported.
- **Persona/Skill:** `bmad-dev-story` (Amelia), `bmad-testarch-atdd` and `bmad-testarch-nfr` (Murat), reading S-FR-REP-5..7, AD-12, AD-REP-2, AD-REP-3, NFR-REP-2 and #18.
- **AI output (summary):** red commit `f8f2b62` (`[S-FR-REP-7.C1]`, `[S-FR-REP-5.C1]`), then green `23d0157`:
  - listing hide and unhide with their log;
  - review search with `\`, `%` and `_` escaped, and the review log;
  - a public profile read in one `REPEATABLE READ` transaction;
  - the two logs merged for the 11.4 view, and four stored-only codes;
  - every registry procedure now has a resolver;
  - `[NFR-REP-2.profile]`;
  - `npm run nfr:k6` (the §3 seed in `tezg_k6`, the production build, `grafana/k6:1.4.2` in Docker) and an `nfr-k6` CI job that `release` requires;
  - the public page `/perfil/[userId]` with its page object and journey.
- **Test problems the subagent found and fixed itself:**
  - **A race test that could not fail:** the first version of `[S-FR-REP-7.C1]` still passed when the profile read was deliberately broken to `READ COMMITTED`, so it could not catch the defect it names, the Blindly Green trap. It was strengthened to 4 admins hiding and unhiding while 4 readers read 3 times per round, and now fails 3 of 3 runs on the broken code. Its id and claim are unchanged.
  - **"Too many clients" (53300):** with 16 local workers, the ATDD files' 60-connection pools exceeded Postgres's 200 connections, which failed race tests of done stories (on `HEAD` as well). `solu2-atdd` now runs 3 files at a time (`maxWorkers: 3`).
- **Agent defaults (no menu):**
  - `GetProfileResponse` gained `seller { userId, kind, displayName }` for the header, read in the same snapshot.
  - A listing hide bumps its `version`.
  - Search queries are 1–200 characters, and profile pages run 1–1,000.
  - The route follows the UX spec, `/perfil/`.
- **Risk put to Mateo:** the local k6 run passed (profile p95 177.4 ms, p99 292.7 ms; browse p95 176.7 ms; 0 % errors and 0 5xx over 11,981 requests each), but two earlier runs gave profile p95 235.9 and 279.1 ms against 300 ms. The unthrottled 50-VU burst measures how fast one runner can spin, so a slower CI runner could fail the blocking job on noise. Options: **(recommended)** keep the job blocking but drive k6 at a fixed arrival rate with the same thresholds; keep the burst as is; or make CI report-only. **Human decision:** ACCEPT the recommendation (applied in the next commit).
- **Evidence:** `evidence/impl2/23-story-13.5-13.6-red.log`, `24-k6.log`, `k6-summary.json`, `25-story-13.5-e2e.log` (Playwright 6 passed, 16.3 s), `26-story-13.5-13.6-green.log` (`test:ci` exit 0, `solu2-atdd` 372 green and 0 red, `solu2-nfr` 27 green).
- **Artifact changed:** listings and reviews modules, `src/server/moderation-log.ts`, `composition.ts` (+ tests), `rep2_latency.test.ts`, `nfr/k6/`, `scripts/nfr-k6.mjs`, `vitest.config.ts`, `package.json`, the E2E files, `.github/workflows/impl2-quality-gate.yml`, `contracts.md`, `epics.source.mjs` and `epics.md`, `test-design.md` (R-29, R-30, R-31), `nfr-evidence.md`, `deferred-work.md`, `sprint-status.yaml` (all 71 stories `done`), both story files.
- **Decided by:** Mateo (#18 and the k6 rate); agent defaults within #18.

### 22. k6 runs at a fixed arrival rate with a warm-up, as the PRD §7 benchmarks do (Testing)

- **Phase:** C (applying #21), in a subagent; then a menu on the warm-up it added.
- **Persona/Skill:** `bmad-testarch-nfr` (Murat).
- **AI output (summary):** two `constant-arrival-rate` scenarios at 100 iterations/s each for 60 s (25 VUs pre-allocated, at most 50), tagged `endpoint:profile` and `endpoint:browse`, with no `sleep()`. A new threshold fails a starved run: `dropped_iterations` < 1 % (60 per scenario, 120 in all). The other thresholds are unchanged, and the job still blocks `release`.
- **Problem found:** without a warm-up, the cold Next server dropped 60–63 iterations in its first second, so the run failed on dropped iterations alone, although its latency was fine (profile p95 112 ms). An earlier attempt run alongside `npm run lint` was discarded (CPU contention: p95 567 ms). The subagent added a `setup()` warm-up (5 batches of 25 concurrent reads per endpoint, tagged out of the measured figures) and asked whether it was acceptable.
- **Options put to Mateo:** **(recommended)** keep the warm-up, which matches the PRD §7 protocol of the benchmarks (50 warm-up calls before the measured ones); or remove it and loosen the threshold to 2 %.
- **Human decision:** ACCEPT the recommendation.
- **Evidence:** two runs, both exit 0, 0.00 % errors and 0 5xx: profile p95 34.4 and 38.3 ms, p99 156.2 and 113.7 ms; browse p95 36.4 and 39.4 ms, p99 140.3 and 98.7 ms; 0–3 dropped iterations of 6,000 per endpoint (`evidence/impl2/24-k6.log`, `k6-summary.json`).
- **Artifact changed:** `nfr/k6/reputation-profile.js`, `scripts/nfr-k6.mjs`, `.github/workflows/impl2-quality-gate.yml`, `test-design.md` §7.4 (and R-30), `nfr-evidence.md`, `deferred-work.md` (commit `c84225a`).
- **Decided by:** Mateo.

### 23. The fresh-context code review of Impl-2: an open redirect and a half-done sign-up fixed, three deferrals with owners (Governance)

- **Phase:** C (close), over `a7c5d81..85dbad8`.
- **Persona/Skill:** `bmad-code-review` in a fresh-context subagent (Blind Hunter, Edge Case Hunter, Acceptance Auditor, run in turn), as #4 asked; then a fix subagent. A first review of the Phase A and Stories 1.6 and 2.6 batch had been stopped at a usage limit before it reported, so this one covers all of Impl-2.
- **AI output (summary):**
  - **What held up:** the constant-time job bearer; every admin gate; no raw IP stored; React escaping everywhere; https-only external images with `no-referrer`; the profile's single snapshot; the one-statement `markRead`; job locks held for the run; E2E specs that use only page objects.
  - **Findings after deduplication:** 3 patches, 1 decision, 3 deferrals, 9 dismissed (each verified against the code):
    - **F1 HIGH:** an open redirect, `/ingresar?siguiente=%2F%09%2Fevil.com`, lands on `evil.com` after a real sign-in, because a tab, newline or CR after the first slash passes the regex.
    - **F2 MEDIUM:** a production sign-up writes `User` and `Account` before the unwired email sender throws.
    - **F3 LOW:** the inbox page and `unreadTotal` claimed one snapshot under `READ COMMITTED`.
    - **F4 LOW:** a failed lock `COMMIT` returned a broken connection to the pool and turned a committed job into a 500.
    - **F5 LOW:** es-CO templates render raw ISO instants and "1 cuentas".
    - **F6 LOW:** the merged moderation log's later-page cursors would skip rows.
    - **F7 LOW:** Better Auth's own limiter is off on every route.
- **Human decisions (menus):**
  - **F2:** **(recommended)** refuse `POST /sign-up/email` before Better Auth while the email sender is unwired. The alternatives were `sendOnSignUp: false` while unwired, or keeping it and recording the risk. ACCEPT.
  - **F1, F3, F4:** apply all three. ACCEPT (the alternative was F1 only).
  - **F5:** defer the typed formatter (Bogotá date and time, COP) to the microcopy and UI phase, and fix the plural now. ACCEPT.
  - **F6, F7:** defer both, F6 to the UX 11.4 moderation view story and F7 to the mail-provider launch item. ACCEPT.
- **What the fixes found:** the earlier Story 2.6 deferral was wrong. It said a production sign-up "fails as NotImplemented (500)", but with the guard disabled the new test got **200**: Better Auth swallowed the email error and committed an account that can never be verified. That was worse than a visible error, and is corrected here.
- **Fix choices (agent defaults):**
  - **F1:** `app/ingresar/destination.ts` resolves `siguiente` against the origin and keeps same-origin paths only. It also refuses whitespace, control characters and any value not starting with `/`. Unit tests cover `	`, `
`, ``, `//`, `/\`, `javascript:` and good paths.
  - **F2:** `createAuth` exposes `emailWired`, and the guard throws `NotImplementedError` before reading the body. `[S-FR-IDN-7.signup.unwired]` proves no `User`, `Account` or throttle row and a 500 `Unexpected` body; it fails without the fix.
  - **F3:** the inbox read runs in `REPEATABLE READ` read-only.
  - **F4:** `client.release(error)` on a failed `COMMIT`; the runner logs `job.lock.releaseFailed` with only the error code and keeps the run's outcome.
  - **F5:** "Conciliación sin diferencias; cuentas revisadas: {accountsChecked}.", and `ReconciliationPartial` likewise.
- **Evidence:** `evidence/impl2/27-review-fixes.log`: `test:ci` exit 0, with 678 unit tests (96.48 % branches) and `solu2-atdd` 373 green and 0 red, and `solu2-nfr` 27 green; `npx playwright test` 6 passed (25.7 s).
- **Artifact changed:** `app/ingresar/` (`destination.ts` + test, `SignInForm.tsx`), `src/server/auth.ts`, `auth-routes.ts`, `composition.ts`, `src/modules/messaging/application/msg.v2.ts`, `src/shared-kernel/jobs.ts` (+ test), `infra/pg-jobs.ts`, `atdd/idn_auth.test.ts`, `contracts.md`, `epics.source.mjs` and `epics.md`, `traceability-matrix.md`, `deferred-work.md` (commit `cd50fa1`).
- **Decided by:** Mateo.


### 24. The final trace passes; the test review's F becomes a remediation, and the pyramid deviation is documented and narrowed (Governance + Testing)

- **Phase:** C (close), in a subagent (`ff6b103`, `478e3c6`, `d777941`); then menus.
- **Persona/Skill:** `bmad-testarch-trace` and `bmad-testarch-test-review` (Murat).
- **AI output (summary):**
  - **Final trace (#5):** `traceability-matrix.md` is generated as the Impl-2 final trace: PRD requirement → story → test files → CI evidence → verdict, with the gate rule in its §1. **Gate decision: PASS.** FRs 96 / 96, NFRs 55 / 56 (NFR-SYS-11, WCAG, waived as "Deferred — launch"), risks 31 / 31, §14 ADs 61 / 61, stories 71 / 71 `done`, 419 / 419 test ids enforced green, 0 unmapped. `impl1-final-trace.md` is removed (readable with `git show 31999bc:<path>`). The trace's test state now comes from `sprint-status.yaml`.
  - **Gaps the trace closed (agent defaults):** NFR-IDN-1 had no artifact (Impl-1 #39 R3 gave it to the Impl-2 hardening), so `nfr/idn1_latency.test.ts` was added (p95 4.8, 4.2 and 13.1 ms against 50 ms). R-24, R-25 and R-27 were planned in §7.2 but missing from the §2 register, and were added. The trace's id pattern missed ids with no digit (`[S-SYS.jobs.auth]`), which was fixed. Lint broke after a traced Playwright run, so the lint config now ignores `playwright-report/`.
  - **Trace evidence (#10):** one `trace.zip` per journey from `npx playwright test --trace on` (6 passed) in `evidence/impl2/traces/`.
  - **Test review:** 59 / 100 (F, Request Changes) under the skill's fixed severities:
    - seven files over 300 lines (HIGH; the Impl-1 review had graded this LOW, which the registry does not allow);
    - `composition.test.ts` depends on test order: a shuffled run fails 3 of 67, because Story 13.5's test advances the shared clock (HIGH);
    - inline rows where a factory exists (MEDIUM);
    - no test that cannot fail, no hard waits, no conditional assertions.

    The Impl-1 MEDIUM-1 to MEDIUM-3 are confirmed fixed by Flow C.
  - **Pyramid:** tests added by Impl-2, unit / integration / E2E: 43 % / 52 % / 5 % (+9 NFR); whole suite 24 % / 76 % / 0.6 % (+32 NFR). Neither meets 70 / 20 / 10. The suite is integration-heavy by design (test-design §3) and is not an ice-cream cone.
- **Human decisions (menus):**
  - **Test review:** **(recommended)** split the seven long files by procedure (moving tests, not changing them), reset the shared clock in a `beforeEach`, verify with a shuffled run, then re-review. The alternatives were fixing only the order bug, or deferring all. ACCEPT.
  - **Pyramid:** **(recommended)** add pure unit tests where domain rules are still proven only through the database, and document the deliberate deviation with both counts in `test-review.md` and the walkthrough. The alternatives were documenting only, or reclassifying only. ACCEPT.
- **Evidence:** `evidence/impl2/28-final-trace.log` (`test:ci` exit 0: 678 unit tests, `solu2-atdd` 373 green, `solu2-nfr` 30 green), `29-playwright-traces.log`.
- **Artifact changed:** `scripts/gen-solu2-trace.mjs`, `traceability-matrix.md`, `test-review.md` (renamed from `impl1-test-review.md`), `impl1-final-trace.md` (removed), `nfr/idn1_latency.test.ts`, `test-design.md` §2, `tools/lint/base.mjs`, `nfr-evidence.md`, `deferred-work.md`, `_bmad-output/README.md`, `docs/impl-1/README.md`, the root `README.md`, `walkthrough-impl1.md`'s header, `evidence/impl2/traces/`.
- **Decided by:** Mateo.


### 25. The test-review remediation reaches 100 / 100; the benchmarks run one file at a time, and the cross-list cursor is fixed now (Testing + Governance)

- **Phase:** C (close), in a subagent (`276c280`, `2501bf6`, `727c74f`); then menus.
- **Persona/Skill:** `bmad-testarch-test-review` (Murat), `bmad-dev-story` (Amelia).
- **AI output (summary):**
  - **Long files (HIGH-1..7):** the seven files over 300 lines became 23 files of 87–216 lines, by moving tests without changing them. Shared Given steps live in `test-support/http-app.ts` and `test-support/suites/*.ts`. The new `atdd/rep_reads.test.ts` regenerated `epics.md` and the trace.
  - **Order dependence (HIGH-8):** each composition test gets a freshly composed app at T0. Shuffling every project found two more order dependences, both fixed: `atdd/sys_jobs.test.ts` (a shared clock) and `pg-outbox.test.ts` (a shared id sequence). Seeds 1, 2, 3, 42 and 1234 pass for `impl1-unit` (726), `solu2-atdd` (373) and `solu2-fitness` (12).
  - **MEDIUM-1:** inline rows use factories (`failedDelivery`, `catalogSet` and `fxRate` added to `fixtures.ts`). The three unused variables of Impl-1 LOW-2 were removed, so lint has 0 warnings.
  - **Pure unit tests:** 48 tests cover the job runner and job route, the auth guard (with a fake Better Auth handler), cursors, the moderation-log merge, the destination rule, the binder page and the API client. Three rules moved from services into the domain: `isBinderSort`, `isExactOrder` and `readMarkAdvances`. The code was broken 18 times on purpose, and every break failed its tests.
  - **Re-review:** 100 / 100 (A, Approve), 0 findings. `test-review.md` gains the "Deliberate deviation" section.
  - **Pyramid** (unit / integration / E2E):
    - Impl-2's additions: 43.1 / 52.0 / 4.9 % → 59.1 / 37.4 / 3.5 %.
    - Whole suite: 23.9 / 75.5 / 0.6 % → 27.4 / 72.0 / 0.6 %.
  - **Agent self-correction:** commit `2501bf6` claimed every new test runs under 10 ms. In fact 45 of 48 do, and three first-in-file tests take 18–36 ms. The agent corrected the claim in the review and in `727c74f`'s body.
  - **Open findings:**
    - Run in parallel, the benchmarks slowed each other down: `[NFR-IDN-1.*]` measured 52–108 ms against 50 ms in shuffled runs. `test:ci` then failed twice in normal order too, because Vitest reruns the last-failed files first. The agent set `fileParallelism: false` on `solu2-nfr` and asked for a confirmation.
    - The listing cursor has no list tag, so an `inventory.mine` cursor is accepted by `inventory.admin.log`. It was recorded in `deferred-work.md`.
- **Human decisions (menus):**
  - **NFR benchmarks:** **(recommended)** keep them serial. Each benchmark measures on a quiet machine, so a failure points at the code and not at another benchmark. The step takes about 15 min instead of 5, inside the 30-minute CI timeout. The alternatives were `maxWorkers: 2` with the heavy benchmarks split out, or reverting to parallel. ACCEPT.
  - **Cross-list cursor:** **(recommended)** fix it now under Flow A: a list tag in the cursor, refused with `RequestValidationFailed` from the other list, with the red test committed first. The alternative was leaving it deferred, since the admin log already requires the admin role. ACCEPT.
- **Evidence:** `evidence/impl2/30-test-remediation.log`: `test:ci` exit 0 (15.5 min), `solu2-atdd` 373 green, `solu2-nfr` 30 green, trace gate PASS, 97.48 % branches; `npx playwright test` 6 passed.
- **Artifact changed:** `test-review.md`, `vitest.config.ts`, `test-support/` (`http-app.ts`, `suites/`, `fixtures.ts`), 23 split test files, 48 new unit tests, `src/modules/*/domain/` (`isBinderSort`, `isExactOrder`, `readMarkAdvances`), `epics.md`, `traceability-matrix.md`, `deferred-work.md`.
- **Decided by:** Mateo.


### 26. The listing cursor is tagged with its list; each list keeps its own refusal text (Implementation + Testing)

- **Phase:** C (close), Flow A fix, in a subagent (`dc47a0d` red, `58aa73e` green); then a menu.
- **Persona/Skill:** `bmad-dev-story` (Amelia).
- **Prompt (summary):** tag INV's keyset cursor with its list, the way REP does. A cursor from the other list, or an untagged one, is refused with `RequestValidationFailed` on `cursor`. The red tests are committed first (decision #25).
- **AI output (summary):**
  - `encodeListingCursor` / `decodeListingCursor(tag, …)` take a list tag, `'mine' | 'log'`. `listMyListings` and `listListingModerationLog` each decode only their own tag.
  - Three domain unit cases, plus one integration case per list that uses a real cursor issued by the other list (and an untagged one for the owner list).
  - **Red, for the right reason:** 3 failed and 31 passed. The integration calls returned a page instead of an error, so each list accepted the other's cursor. The round-trip failed because the old decoder took no tag.
  - **Agent self-correction:** the domain refusal tests passed while red, but only because the old one-argument decoder refuses anything carrying a tag. They only mean something once the fixed decoder exists. The agent said so in the evidence log instead of presenting them as red.
- **Agent defaults:**
  - The cursor is base64url of `tag|createdAt|id`, REP's idiom.
  - Old untagged cursors are refused with no fallback; the client starts again from page 1.
  - No new test ids (the cases sit beside the existing unit and integration tests).
  - The 52-row moderation-log seeding became the shared `moderationLog(n)` suite helper.
- **Human decision (menu):** **(recommended)** keep each list's existing refusal text: "no es un cursor válido" on the owner list and "no es un cursor de esta lista" on the moderation log. Both texts predate the fix, the code is `RequestValidationFailed` either way, and unifying them is a microcopy change with no functional gain. The alternative was unifying both to "de esta lista". ACCEPT.
- **Evidence:** `evidence/impl2/31-cursor-list-tag.log`, red and green. `test:ci` exit 0: 729 unit tests (97.49 % branches; `listings/domain` 95.36 %), trace gate PASS, `solu2-atdd` 373 green, `solu2-nfr` 30 green. Playwright was not rerun because the UI never builds a cursor.
- **Artifact changed:** `src/modules/listings/domain/inv.ts`, `application/inv.v2.ts`, `inv-domain.test.ts`, `inv.v2-manage.test.ts`, `inv.v2-moderation.test.ts`, `test-support/suites/inv.ts`, and `deferred-work.md` (the entry is struck through, kept, and cites this decision).
- **Decided by:** Mateo.


### 27. The Impl-2 documentation is written; the branch is pushed so CI captures the traces, and #8 is tagged as a correction of AI tests (Governance + Documentation)

- **Phase:** C (close), documentation, in a subagent (`3f2632d`, `787a0e1`); then menus.
- **Persona/Skill:** tech writing (no BMad skill), reading the statement, `docs/impl-1/README.md`, this log, the story files, `test-review.md`, `traceability-matrix.md` and `evidence/impl2/`.
- **Prompt (summary):** write `walkthrough-impl2.md` and `docs/impl-2/README.md`. The README covers the §5 deliverable map, the checklist, the rubric with its evidence paths, where each `_bmad-output` artifact is and what changed in it, how to run everything, the CI and the commits. Also update `docs/README.md`, the root README, `_bmad-output/README.md` and `project-context.md`.
- **AI output (summary):**
  - The six files, with every figure copied from a committed log. The link check found 117 relative links with anchors and 0 broken. Lint exits 0, the trace gate passes and fitness passes 12 / 12. `project-context.md` gains 11 testing rules (47 → 58).
  - **Gaps reported, not hidden:**
    - no CI run, since the branch was never pushed;
    - the pyramid deviation;
    - NFR-SYS-11 (WCAG) waived;
    - #8 quotes a coverage baseline (91.55 %, `ord.ts` 88.9 %) that differs from the committed log (92.38 %, 93.05 %); the walkthrough quotes the log;
    - the 8.5 red log has no `gate:atdd-red` line;
    - the 2.6 `serveAuth` stub landed with the 1.6 green commit;
    - the 8.6 same-instant rate guard has only a sequential test.
  - **Stale text found:** `sprint-status.yaml` still said "69 stories", and its two `last_updated` values differed. `test-review.md` Recommendation 1 still called the cursor tag deferred. The main agent fixed all three here.
  - **The second correction was weak:** only #9 was clearly a human correction of an AI *test*. #23 corrected an untested claim in `deferred-work.md`, not a test.
- **Human decisions (menus):**
  - **CI traces:** **(recommended)** push `impl-2` to `origin` with no PR or merge, so that `impl2-quality-gate` runs once. Then link the run, its artifacts and its `trace.zip` in the docs; a job that fails on CI is shown to Mateo before any fix. The alternatives were Mateo pushing it himself, or keeping local evidence only as a known gap. ACCEPT.
  - **The second correction:** Mateo confirmed that the BMad AI agents wrote the Impl-1 tests. **(recommended)** #8 is tagged `[CORRECTED]` in the index. The AI tests proved lock waits with 200 ms sleeps (the Flaky Sleeper trap), and `02-flowC-lock-mutation.log` shows the sleep version still passing with the `FOR SHARE` lock removed. The human choice was `untilBlockedOnLock` and `gate:no-sleep`. The alternatives were looking for more evidence, or keeping #9 and #23. ACCEPT.
- **Evidence:** link check 117 / 0; `gate:trace:solu2` PASS; `gate:epics:solu2` 13 epics, 71 stories.
- **Artifact changed:** `walkthrough-impl2.md`, `docs/impl-2/README.md`, `docs/README.md`, `README.md`, `_bmad-output/README.md`, `project-context.md` (the subagent's commits); this log's index and #8 heading, `sprint-status.yaml` (71 stories, `last_updated`), `test-review.md` (Recommendation 1 fixed by #26), and walkthrough §16 and README row 6 (the #8 authorship).
- **Decided by:** Mateo.


### 28. The first CI run fails on a connection limit the local stack never hit; the CI Postgres is set to match docker-compose.yml (Testing + CI)

- **Phase:** C (close), CI, after the push of #27.
- **Persona/Skill:** `bmad-testarch-ci` (Murat), main agent.
- **AI output (summary):**
  - **Run 1** ([41901553179](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41901553179), `ef77c50`): `e2e` and `nfr-k6` passed, `gate` failed, and `release` printed `Quality gate: FAIL`.
  - **Reproduction:** a clean clone, run in `node:22` on Linux, passed every step of `test:ci`, including the red gate against a Postgres at the default 100 connections. The failing line was only in the job log. GitHub serves job logs to signed-in users, so the agent asked how to read it.
  - **Cause, from the log:** `[S-FR-MSG-7.C1]` (50 concurrent `markRead`, done story) got `sorry, too many clients already`. The CI service runs Postgres at its default `max_connections = 100`. `solu2-atdd` runs 3 files at once, with pools of up to 60 connections each. The `vitest.config.ts` comment relied on the 200 of `docker-compose.yml`, which CI never had. The red gate did its job: a done story's test must pass, and it did not on CI.
- **Human decisions (menus):**
  - **Reading the log:** **(recommended)** use the stored git credential once, in memory, for the read-only job-log endpoint of Mateo's own repository, without printing or saving it. The alternatives were Mateo pasting the log, or re-running as a possible flake. ACCEPT.
  - **The fix:** **(recommended)** make CI match the dev stack. In the `gate` and `nfr-k6` jobs, a step runs `ALTER SYSTEM SET max_connections = 200`, restarts the service container, waits for `pg_isready` under a bounded `timeout` (no sleep), and asserts `SHOW max_connections` = 200. The tests are unchanged. The alternatives were running ATDD one file at a time (several minutes slower), or shrinking the pools to 30, which would queue the 50-way races instead of running them truly concurrently. ACCEPT.
- **Evidence:** `evidence/impl2/32-ci-run.log`, with the excerpt of run 1 and the cause; run 2 is recorded in #29.
- **Artifact changed:** `.github/workflows/impl2-quality-gate.yml`, the comment in `vitest.config.ts`, `evidence/impl2/32-ci-run.log`.
- **Decided by:** Mateo.


### 29. CI run 2 passes the release gate; a second, traced Playwright run puts one trace.zip per journey on CI (Testing + CI)

- **Phase:** C (close), CI.
- **Persona/Skill:** `bmad-testarch-ci` (Murat), main agent.
- **AI output (summary):**
  - **Run 2** ([41922563597](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41922563597), `5bc619f`): every job succeeded, and `release` printed `gate=success e2e=success nfr-k6=success`, `Quality gate: PASS`.
    - **gate:** `ALTER SYSTEM` took effect; `no-sleep` 0 problems; 729 unit tests, 97.49 % branches; trace gate PASS; `solu2-atdd` 373 green and 0 not as expected; `solu2-nfr` 30 green.
    - **e2e:** 6 passed on one worker.
    - **nfr-k6:** profile p95 27.68 ms and p99 169.2 ms; browse p95 47.58 ms; `http_req_failed` 0.00 %; 3 dropped iterations, under the limit of 120.
  - **Gap found:** the `playwright` artifact held only `playwright-report/index.html`. With `trace: 'on-first-retry'`, a green run records no trace, so no `trace.zip` had been captured on CI, which is what the rubric's top band asks for.
- **Human decision (menu):** **(recommended)** keep `trace: 'on-first-retry'` in `playwright.config.ts`, as the statement asks. After the gating run, the `e2e` job runs `npx playwright test --trace on --output test-results-forensic` and uploads one `trace.zip` per journey as the `playwright-traces` artifact (`if-no-files-found: error`). The alternatives were running the gating step itself with `--trace on`, which would make CI differ from the stated config, or keeping traces on retry only. ACCEPT.
- **Evidence:** `evidence/impl2/32-ci-run.log` (runs 1–3); run 3 is linked in #30.
- **Artifact changed:** `.github/workflows/impl2-quality-gate.yml`, `.gitignore` and `tools/lint/base.mjs` (ignore `test-results-forensic/`).
- **Decided by:** Mateo.


### 30. Close: Impl-2 is done, with the release gate passing on CI and the traces captured there (Governance)

- **Phase:** C (close).
- **Persona/Skill:** main agent; `bmad-testarch-ci` (Murat).
- **AI output (summary):**
  - **Run 3** ([41964862300](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41964862300), `cdb295b`): every job succeeded, and `release` printed `gate=success e2e=success nfr-k6=success`, `Quality gate: PASS`.
    - **gate:** 729 unit tests, 97.49 % branches; trace gate PASS; fitness 12; `solu2-atdd` 373 green; `solu2-nfr` 30 green; 0 not as expected.
    - **e2e:** the gating run had 6 passed (16.8 s), then the forensic run 6 passed (7.7 s).
    - **nfr-k6:** profile p95 8.29 ms and p99 15.33 ms, browse p95 24.02 ms, 0.00 % errors, 0 5xx and 0 dropped iterations.
    - **Artifacts:** `playwright`, `playwright-traces` (6 `trace.zip`) and `k6-summary`.
  - The six CI traces are committed in `evidence/impl2/traces-ci/`, beside the six local ones in `traces/`. `32-ci-run.log` holds the excerpts of the three runs.
  - The walkthrough §13 and §15 and `docs/impl-2/README.md` (the rubric rows 4 and 5, the CI table, the runs table, the commits and the evidence row) now cite the CI runs in place of "no CI run exists". This log is at 30 entries.
- **State at the close:**
  - 71 / 71 stories and 13 / 13 epics `done`.
  - The final trace is PASS: FRs 96 / 96, NFRs 55 / 56 with WCAG waived to launch, risks 31 / 31, ADs 61 / 61, 419 / 419 test ids green.
  - The test review scores 100 / 100.
  - Three human corrections of AI tests are logged (#8, #9, #23) and indexed with `[CORRECTED]`. The CI connection limit (#28) was a CI-configuration finding that the red gate caught.
  - Open items, each with an owner, are in `deferred-work.md`: the launch checklist, the UI phase, F5–F7, and the serial benchmarks.
- **Human decision:** none new; this entry records the outcome of #27–#29.
- **Evidence:** `evidence/impl2/32-ci-run.log`, `evidence/impl2/traces-ci/`.
- **Artifact changed:** `walkthrough-impl2.md`, `docs/impl-2/README.md`, `32-ci-run.log`, `traces-ci/` (new).
- **Decided by:** Mateo (#27–#29).


### 31. A line-by-line audit against the statement finds seven gaps; a TRM circuit breaker, axe-core scans and a Winston audit are added (Governance)

- **Phase:** C (close), re-audit at Mateo's request ("read again the task and make sure it is accomplished to minute detail and all the rubric is addressed").
- **Persona/Skill:** main agent, reading `tasks/impl2-task-statement.md` §1–§6 against the repository.
- **AI output (summary):**
  - **Confirmed:**
    - 71 / 71 story files and 13 / 13 epics `done`, with 0 unchecked tasks.
    - No GitHub issues; the 12 PRs are all closed.
    - The trace PASS with 0 unmapped requirements.
    - CI run 4 ([41966565252](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/41966565252)) green.
  - **Gaps found:**
    1. The no-sleep gate's own planted samples (`waitForTimeout(500)`, `sleep(5000)`) are literal text in `scripts/check-no-sleep.mjs`, so a plain grep of the codebase finds them.
    2. The walkthrough does not name the 4 classic traps with their evidence.
    3. The walkthrough does not map the 5 NFR dimensions (security, concurrency, performance, resilience, usability).
    4. The k6 table has no CI figures, and nothing backs learning objective 7's "cryptographic logs".
    5. Rubric 1 names circuit breakers; the code degrades gracefully but has no open / half-open breaker.
    6. Usability rests on NFR-SYS-11 (WCAG), which is waived.
    7. Phase A names a "Winston & Murat audit"; Winston was never invoked in Impl-2.
  - **Agent defaults (gaps 1–4):**
    - The planted samples are assembled at run time, so the literal text appears nowhere in the code.
    - The walkthrough gains a section on the 4 traps and a table of the 5 NFR dimensions, and its k6 table a row from the CI run.
    - A `SHA256SUMS` file covers the evidence, and the trace's CI-evidence section names the passing CI run.
- **Human decisions (menus):**
  - **Circuit breaker:** **(recommended)** build a small Flow A story. It adds a pure breaker state machine in the catalog domain: closed, open after N failures, half-open after a cool-down on the Clock. The breaker wraps the TRM source adapter, and its state lives in Postgres so every instance shares it. The red tests come first. The alternative was documenting the existing mechanisms only. ACCEPT.
  - **Accessibility:** **(recommended)** add `@axe-core/playwright`, exact-pinned. The journeys assert 0 WCAG 2.x A / AA violations on the home, sign-in, inbox, binder and profile pages. NFR-SYS-11 becomes PASS for the automated rules, with the manual audit deferred to launch. The alternative was keeping it waived. ACCEPT.
  - **Log name:** **(recommended)** keep `impl-2-ai-decision-log.md`. It ends in the statement's `ai-decision-log.md`, follows the one-log-per-phase convention, and the README maps it. The alternative was renaming it. ACCEPT.
  - **Winston:** **(recommended)** run `bmad-agent-architect` (Winston) now, over Impl-2's hardening, labelled honestly as a close-phase audit and not as shift-left. Findings go through menus. The alternative was documenting the gap. ACCEPT.
- **Artifact changed:** this log; the work follows in #32 and after.
- **Decided by:** Mateo.


### 32. Story 4.6: a circuit breaker on the TRM source, shared in Postgres and proven under a race (Implementation + Architecture + Testing)

- **Phase:** C (close-phase hardening, after #31), Flow A, in a story subagent (`4a84964` red, `bde313d` green); then menus.
- **Persona/Skill:** `bmad-correct-course`, `bmad-create-story`, `bmad-testarch-atdd` (Murat), `bmad-dev-story` (Amelia).
- **Prompt (summary):** build the TRM circuit breaker of #31. It needs a pure state machine, its state in Postgres, atomic transitions, a degraded outcome and admin visibility, with the red tests committed first.
- **AI output (summary):**
  - **Backlog:** Story 4.6 "Open a circuit breaker when the TRM source keeps failing" (71 → 72 stories). It traces to NFR-CAT-4, FR-CAT-8 and AD-CAT-3, and adds the new P0 risk R-32 (3 × 2). The PRD has no explicit circuit-breaker requirement, and the agent said so instead of inventing one.
  - **Red (`4a84964`):** all 6 bound tests failed on `NotImplementedError: NotImplemented: catalog.getFxSourceBreaker`. The gate line: `solu2-atdd: 379 tests in 26 files; 6 red for the right reason; 373 green …; 0 not as expected`. Each test reads the breaker through the new admin read before checking an effect, so the red reason is the missing read and not a wrong outcome.
  - **Green (`bde313d`):**
    - The pure machine `catalog/domain/breaker.ts` (100 % branches): `closed` → `open` after 3 failures in a row → `half-open` after the cool-down, with one probe whose lease runs for 60 s.
    - The `"FxSourceBreaker"` row, from the new migration `002_fx_source_breaker.sql`, is changed under `FOR UPDATE`.
    - `fetchTrm` answers `circuitOpen` (code `FxRateCircuitOpen`, `allowedWithNotice`), keeps the last rate and never calls the source.
    - Admins read the state through `catalog.fx.breaker` (page 2.3). The shared-kernel tick health may not read a catalog table.
    - The lint rule, the table-ownership fitness scan and the epics generator now read every migration file.
  - **Gate (`33-story-4.6.log`):** `test:ci` exit 0. 743 unit tests; trace PASS with 425 / 425 ids and 72 / 72 stories; `solu2-atdd` 379 green; `solu2-nfr` 30 green.
  - **Mutation check:** with `FOR UPDATE` removed, the hammer C1 sees 42 probes instead of 1, and C2 loses failure counts and leaves the breaker closed.
- **Human decisions (menus):**
  - **Cool-down:** **(recommended)** 30 min. NFR-CAT-4 requires one attempt an hour, so the hourly tick always finds the breaker half-open. What it stops are admin retries and concurrent calls between ticks. The alternative was 150 min, which would really skip ticks but needs NFR-CAT-4 amended. ACCEPT.
  - **Admin retry:** **(recommended)** it goes through the breaker: one rule for everyone, answered with `circuitOpen` and the next probe time. The alternative was a force flag. ACCEPT.
  - **AD rule:** **(recommended)** the Winston audit writes AD-CAT-3 rule 7 for the breaker and binds its tests in the AD matrix. The alternative was keeping the deferral. ACCEPT.
- **Evidence:** `evidence/impl2/33-story-4.6.log` (red and green).
- **Artifact changed:**
  - Code and migration: `catalog/domain/breaker.ts` (+ test), `application/cat.v2.ts`, `infra/pg.ts`, `ports/cat.v2.ts`, `schemas/002_fx_source_breaker.sql`.
  - Tests: `atdd/cat_breaker.test.ts`.
  - Planning and tracking: `epics.source.mjs`, `epics.md`, `sprint-status.yaml`, the story file 4-6, `contracts.md`, `operations.json`, `ui-states.json`, `openapi.yaml`.
  - Test and trace artifacts: `test-design.md` (R-32), `nfr-evidence.md`, `traceability-matrix.md`, `deferred-work.md`.
- **Decided by:** Mateo.


### 33. axe-core WCAG scans in every journey; NFR-SYS-11 passes for the automated rules, with the manual audit kept for launch (Testing + Usability)

- **Phase:** C (close-phase hardening, after #31), Flow E, in a subagent (`c8b896b`, `57d5cf4`); then a menu.
- **Persona/Skill:** `bmad-testarch-nfr` and `bmad-testarch-trace` (Murat), dev agent.
- **Prompt (summary):** add `@axe-core/playwright` and make the journeys assert 0 WCAG 2.x A / AA violations on every page that exists. NFR-SYS-11 becomes PASS for the automated rules, with the manual audit deferred to launch.
- **AI output (summary):**
  - **Dependency:** `@axe-core/playwright` 4.14.0, exact-pinned (the latest stable). It is approved in the `scripts/check-deps.mjs` APPROVED map with "Impl-2 #31, #33". `gate:deps`: 24 dependencies, no high or critical advisory. This is the dependency approval `gate:deps` requires.
  - **Check:** `BasePage.expectNoA11yViolations()` runs AxeBuilder with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`. On failure it prints each violation's id, impact, help text and targets, so it cannot be blindly green. The 6 journeys make 14 scans, each after a web-first assertion. They cover home, sign-in and its refusal, the inbox (3 states), the binder (3 states), the add-link page and its field error, the collections list (a new `CollectionsPage` page object), and the seller profile with its Not-available page.
  - **The check can fail:** a planted `<img>` without `alt` and an unlabelled `<input>` failed the smoke journey with `image-alt (critical)` and `label (critical)`. The plant was reverted and never committed.
  - **Findings:**
    - The real scans had 0 violations.
    - One "needs review" item was fixed: the profile average was a `<p aria-label="4,5 de 5">`, and a paragraph may not carry a name, so a screen reader could drop "de 5". It is now a `<span role="img">` with the same look.
    - Three `color-contrast` "needs review" items remain, on the decorative star glyphs (aria-hidden, dark on white).
  - **Trace:** NFR-SYS-11 now reads "Green — gate (the automated WCAG 2.x A and AA rules); Deferred — launch (the manual audit: screen reader, keyboard walk-through, contrast of dynamic states)". The trace gives it PASS with a part deferred, 0 NFRs waived, and the gate PASS.
  - **Run:** `npx playwright test` reported `6 passed (30.6s)`.
- **Agent defaults:**
  - The check fails on a violation of any impact, not only serious or critical.
  - The `// Traces:` lines of the 4 specs carry NFR-SYS-11; no bracketed ids were added.
  - The binder journey now ends on `/coleccion`, so that page is scanned too.
  - A §7.4 threshold row was added, with no new risk.
- **Human decision (menu):** **(recommended)** the check asserts definite violations only. axe's "needs review" items, such as the 3 decorative star glyphs, go to the manual launch audit, because asserting them would fail on cases axe itself cannot decide. The alternative was failing on them too. ACCEPT.
- **Evidence:** `evidence/impl2/34-a11y-axe.log`: the passing run, the planted-violation failure and the fix.
- **Artifact changed:**
  - Dependencies: `package.json` and the lockfile, `scripts/check-deps.mjs`.
  - Page objects and specs: `e2e/pages/BasePage.ts`, `CollectionsPage.ts` (new), the 4 specs.
  - App: `app/perfil/[userId]/page.tsx`.
  - Test and trace artifacts: `nfr-evidence.md`, `test-design.md` §7.4, `traceability-matrix.md`.
  - Docs: `docs/impl-2/README.md`, `walkthrough-impl2.md`.
- **Decided by:** Mateo.


### 34. Winston's close-phase architecture audit: AD-CAT-3 rule 7 is written; three MEDIUM and seven LOW findings, nine of them fixed now (Architecture + Governance)

- **Phase:** C (close), after #31–#33. This is a close-phase audit, not shift-left: Phase A's audit was Murat's test design (#6) alone.
- **Persona/Skill:** `bmad-agent-architect` (Winston), in a subagent (`2ba4c20`, `15bb068`); then menus.
- **Prompt (summary):** audit `a7c5d81..HEAD` against rubric 1 (ports and adapters, concurrency, degradation and circuit breakers) and rubric 2 (the AD-n invariants). Write AD-CAT-3 rule 7 and bind it in §14, as decided in #32. Fix nothing else.
- **AI output (summary):**
  - **Report:** `_bmad-output/planning-artifacts/architecture-audit-impl2.md`, which has verdicts, per-check tables with file:line evidence, and findings.
  - **Verdicts:** ports and adapters PASS; concurrency defense CONCERNS; graceful degradation and circuit breakers CONCERNS; AD invariants CONCERNS. Every Impl-2 write path has a named mechanism, and the risky ones have a race test.
  - **Rule 7:** AD-CAT-3 rule 7 covers the TRM circuit breaker. A new §14 row binds the six `[S-FR-CAT-8.breaker.*]` tests. Trace PASS with 62 / 62 AD rows, and the 4.6 deferral is closed.
  - **Findings:**
    - **F1 (MEDIUM):** `src/server/db.ts` uses pg's default pool of 10, while AD-SYS-4 says `max: 1`. The job lock and the reconcile need two connections, so `max: 1` would hang.
    - **F2 (MEDIUM):** the breaker updates its row under `FOR UPDATE` with no from-state check or version column, contrary to AD-SYS-5's wording. It is correct, as the race tests and the mutation check prove.
    - **F3 (MEDIUM):** failed job runs are stored but shown nowhere. The tick health reads "on schedule" even when every job fails.
    - **F4–F10 (LOW):**
      - F4: four §13 jobs are neither built nor deferred.
      - F5: AD-CAT-3 rule 6's wording contradicts the admin retry.
      - F6: the TRM source call has no deadline.
      - F7: the Impl-2 race tests are not bound in their §14 rows.
      - F8: no race test or unique index covers the binder positions.
      - F9: `ports-and-adapters.md` is stale.
      - F10: admin checks go through identity's repository type.
- **Gate lines:** lint and typecheck exit 0; `gate:purity` 14 files, 0 problems; trace `62 AD rows … 425 test ids (425 enforced green) … gate PASS; 0 problems`; ids, codes and epics current; fitness 12 passed.
- **Human decisions (menus):**
  - **F1:** **(recommended)** amend AD-SYS-4 and §4 to `max: 2` (one connection for the lock, one for the work), set it in `db.ts`, and add a test that runs every job on a 2-connection pool so a hang fails. The alternative was taking the lock per batch transaction (size M). ACCEPT.
  - **F2:** **(recommended)** make the code match the rule rather than recording an exception. A `version` column (migration 003) and a from-state and version predicate on the UPDATE are added, `FOR UPDATE` stays, and the race tests stay green. The alternative was recording a named exception. ACCEPT.
  - **F3:** **(recommended)** extend the tick health and admin page 2.3 with each job's last outcome, the failed runs in 24 h and the runs stuck in `running`, so the health turns degraded when jobs fail. The alternative was a launch-checklist item. ACCEPT.
  - **LOW:** **(recommended)** fix now:
    - F4, F5, F6 and F9 (docs and deferrals);
    - F7 (bind the race tests in §14);
    - F8 (a binder-position race test, plus a unique index if it finds a duplicate).

    F10 stays as Impl-1 #32 accepted it.
- **Agent defaults:**
  - Rule 7 is a separate §14 row.
  - The adapter's 3 transport retries count as one breaker call.
  - Verdict rule: PASS when nothing is above LOW, CONCERNS when there is a MEDIUM, FAIL when there is a HIGH.
- **Artifact changed:** `ARCHITECTURE.md`, `contracts.md`, `epics.md`, `traceability-matrix.md`, `deferred-work.md`, `docs/impl-2/README.md`, `_bmad-output/README.md`, `architecture-audit-impl2.md` (new); the fixes follow in #35.
- **Decided by:** Mateo.


### 35. Winston's findings F1–F9 are fixed: a 2-connection pool proven per job, the breaker moves by version, and job failures reach the health page (Architecture + Testing)

- **Phase:** C (close), in a subagent (`a8f5d1a`, `2acf4e6`, `926e68a`, `e9a5352`, `78310df`); then menus.
- **Persona/Skill:** `bmad-dev-story` (Amelia), `bmad-testarch-atdd` (Murat).
- **Prompt (summary):** fix audit findings F1–F9 as decided in #34, and accept F10.
- **AI output (summary):**
  - **F1:** AD-SYS-4 rules 7 and 9, ARCH §4, `ports-and-adapters.md` and `src/server/db.ts` all say `max: 2`. The new `boundedPool(db, n)` helper refuses checkout n+1 at once, with no timer. `[S-SYS.jobs.pool]` runs all four jobs, the nightly reconcile included, through the real route on a pool of 2. Each succeeds; on a pool of 1, each is refused at once.
  - **F2:** migration `003_fx_source_breaker_version.sql`. The transition is `UPDATE … WHERE state = $from AND version = $v`, still under `FOR UPDATE`, and a 0-row update raises `UnexpectedError` and rolls back. The 4.6 races stay green.
  - **F3:** `admin.jobs.tickHealth` returns, per job, the last outcome and code, the failed runs in the last 24 h, and the runs still `running` 15 minutes after start. The decision checks `TickSilent`, then the new stored-only code `ScheduledJobsDegraded`, then `TickOnSchedule`. Page 2.3 gains "Tareas (24 h)". The work is tested with `[S-SYS.tick.jobs]` and pure tests of the rule.
  - **F4, F5, F6, F9:**
    - the four unbuilt jobs are deferred to the launch checklist;
    - rule 6 now reads "no read path";
    - the adapter must answer within 45 s;
    - `ports-and-adapters.md` is refreshed for Impl-2.
  - **F7:** the §14 rows of AD-SYS-4, AD-COM-1, AD-COM-2, AD-MSG-3, AD-COL-1, AD-REP-2, AD-12, AD-REP-3 and AD-IDN-3 now bind their Impl-2 race tests. Trace: 62 AD rows, 429 test ids, PASS.
  - **F8, no bug:** `[S-FR-COL-5.C1]` (10 rounds of 20 concurrent binder writes) and `[S-FR-COM-7.C1]` (concurrent rate settings) pass, so no unique index was added. Two mutations prove each test can fail:
    - with the `col:owner` lock removed, 16 entries end at one position;
    - with the `UNIQUE` removed, 20 of 20 settings are stored.
  - **Audit:** `architecture-audit-impl2.md` marks F1–F9 Fixed and F10 Accepted, and the verdicts are recomputed.
  - **Gates:** `test:ci` run 2 exit 0 (unit 751, `solu2-atdd` 383 green, `solu2-nfr` 30 green, trace PASS); Playwright 6 / 6, including the axe scans.
- **Open findings:**
  - **Pool starvation:** with `max: 2`, two job requests on one instance would each hold one connection and wait forever for the second.
  - **Slow benchmark:** `test:ci` run 1 failed when `[NFR-VAL-2.trend]` hit its 600 s timeout, on a path no change touched. On its own it passed in 256 s with p95 251 ms.
- **Agent defaults:**
  - A run counts as stuck when it is still `running` 15 minutes after start, within the 24 h window.
  - `degraded` covers failed or stuck jobs only, and a silent tick takes precedence.
  - A breaker conflict is an `UnexpectedError`, not a new 409.
- **Human decisions (menus):**
  - **Pool starvation:** **(recommended)** set a checkout timeout on the runtime pool. Exhaustion then fails the run as a visible `failed` JobRun, which F3 shows, instead of hanging, and a test holds both connections and sees the second job fail. The alternatives were a launch deferral, or taking the lock inside the work transaction (size M). ACCEPT.
  - **Slow benchmark:** **(recommended)** investigate now. Find where the 256–600 s goes, make the setup faster or the bound honest, prove stable timings over repeated runs, and never loosen the latency threshold. The alternative was a flaky-risk deferral. ACCEPT.
- **Evidence:** `evidence/impl2/35-architecture-fixes.log` (the gate lines, the F1 pool test, the F8 mutations, and the run-1 timeout).
- **Artifact changed:**
  - Docs: `ARCHITECTURE.md`, `contracts.md`, `ports-and-adapters.md`, `deferred-work.md`, `architecture-audit-impl2.md`, the 2.3 UX spec, `ui-states.json`.
  - Schema: migration 003.
  - Code and tests: `src/server/db.ts`, the shared-kernel admin events and tick health, the catalog breaker, `test-support/single-connection.ts`, and the new tests.
  - Regenerated: `epics.md`, `traceability-matrix.md`, `openapi.yaml`, `messages.generated.ts`, `ui-states.md`, `prisma/schema.prisma`.
- **Decided by:** Mateo.


### 36. A starved job run fails visibly instead of hanging; the slow benchmark is slow in its measured calls, not its setup, so the price lookup is optimised (Architecture + Testing)

- **Phase:** C (close), in a subagent (`811dceb`, `0370255`, `d15e57b`); then menus.
- **Persona/Skill:** `bmad-dev-story` (Amelia), `bmad-testarch-nfr` (Murat).
- **Prompt (summary):** carry out #35: give the runtime pool a checkout timeout, and investigate the slow `[NFR-VAL-2.trend]`.
- **AI output (summary):**
  - **Pool:** `RUNTIME_POOL = { max: 2, connectionTimeoutMillis: 10_000 }`. That is far above a healthy checkout and far below the 50 s batch bound.
    - The timeout alone was not enough: the runner, refused a connection for its `running` row, threw and left no row. `JobHold.release(last)` now writes the run's end in the lock's own transaction, which needs no further connection.
    - A starved run that holds its lock ends `failed` / `Unexpected` with HTTP 500, and the tick health (#35 F3) shows it.
    - A run refused even its lock's connection writes no row, logs `job.lock.acquireFailed` and answers 500.
    - New test `[S-SYS.jobs.starved]`, with a 200 ms test timeout. Two mutations make it fail: the old no-row behaviour, and a pool with no timeout.
  - **Test edit:** `[S-SYS.jobs.pool]`'s refused pool-of-1 run now expects a fifth row, `failed` / `Unexpected`, where it used to expect none.
  - **Benchmark: the root cause is not the seeding.** The seed takes 4.5 s and is already bulk SQL. About 92 % of the time is the 550 measured calls; each sorts 43,200 price rows to keep 480 and spills about 1.8 MB to disk.
    - Run 1's 600 s timeout came from a machine about 6× slower that day: 79 minutes for the gate, against 13.
    - Three solo runs took 97–102 s, with p95 193–212 ms. The workload, threshold and 600 s bound are unchanged.
  - **Correction of the main agent:** #35 said the benchmark "passed alone in 256 s"; that was the whole 3-test file. The trend test alone takes about 100 s.
  - **Gate:** `test:ci` exit 0 in 13 min 24 s. Unit 757; trace PASS with 430 ids; `solu2-atdd` 384 green; `solu2-nfr` 30 green. Playwright 6 / 6.
- **Human decisions (menus):**
  - **Price lookup:** **(recommended)** optimise it now. It becomes one indexed `LIMIT 1` per card: the same 480 rows in 7 ms instead of 61 ms, with no disk spill, about 5× faster on the VAL-2 benchmarks. It is guarded by the existing CAT and VAL tests, which stay unchanged, and the before and after p95 are recorded. The alternatives were a launch deferral, or accepting it. ACCEPT.
  - **Starved-run code:** **(recommended)** keep `Unexpected`. Starvation is an infrastructure fault, and the `job.lock.*` log names it. The alternative was a new code, `JobPoolExhausted`. ACCEPT.
  - **Edited assertion:** **(recommended)** accept the change to `[S-SYS.jobs.pool]`. The old assertion encoded the hang-prone behaviour #35 removed, and two mutations make the new one fail. The alternative was reverting it and proving the fifth row only in `[S-SYS.jobs.starved]`. ACCEPT.
- **Evidence:** `evidence/impl2/36-pool-timeout-and-bench.log`.
- **Artifact changed:**
  - Code and tests: `src/server/db.ts`, `src/shared-kernel/jobs.ts`, `infra/pg-jobs.ts`, the runner, route and jobs tests, `atdd/sys_jobs.test.ts`, `nfr/val2_latency.test.ts` (its header comment).
  - Docs: `ARCHITECTURE.md` (AD-SYS-4), `ports-and-adapters.md`, `contracts.md`, `deferred-work.md`.
  - Generated: `epics.source.mjs`, `epics.md`, `traceability-matrix.md`.
- **Decided by:** Mateo.


### 37. The as-of price read is one indexed `LIMIT 1` per card; the valuation benchmarks run 3–4.5× faster with the same rows (Performance)

- **Phase:** C (close), in a subagent (`f024606`, `8d8fd4d`), as decided in #36.
- **Persona/Skill:** `bmad-dev-story` (Amelia), `bmad-testarch-nfr` (Murat).
- **AI output (summary):**
  - **Query:** `latestObservations` (`catalog/infra/pg.ts`) serves VAL's `getReferencePricesAsOf` and CAT-1's `getPriceProvenance`.
    - Before, it was a `DISTINCT ON` that sorted all 43,200 observations for 480 cards: an external merge on disk, 48–61 ms.
    - Now it `unnest`s the ids and runs a LATERAL `ORDER BY "observedAt" DESC, source, id LIMIT 1` per id over the existing `reference_price_as_of` index: no Sort node and no temp I/O, 2.5 ms. No migration was needed.
  - **Same rows:** both statements return identical rows for the 480 ids plus an unpriced card, a sealed one and a duplicate id, at three instants, and for a two-source tie. AD-CAT-2 is unchanged: the latest observation at or before asOf, ties by source then id, never a fabricated price. AD-CAT-2 rule 4 and CAT-1 Q1 describe the new statement.
  - **Benchmarks** (3 solo runs each, median, before → after):
    - current: 40.7 → 12.8 s, p95 87.5 → 20.0 ms;
    - trend: 100.6 → 22.2 s, p95 197.0 → 44.7 ms;
    - 365-day history: unchanged path, p95 259.6 → 296.7 ms, which is machine noise.
  - **Thresholds and bounds:** thresholds, dataset and iterations are unchanged. The trend's explicit 600 s bound goes back to the project's 300 s, about 13× its run time.
  - **Gate:** `test:ci` exit 0 in 11 min 43 s (13 min 24 s before). Unit 757, branch coverage 97.56 %, trace PASS, `solu2-atdd` 384 green, `solu2-nfr` 30 green. No CAT or VAL assertion changed. Playwright 6 / 6.
- **Agent default:** the 365-day history query, the longest NFR test at about 130 s, is left as is. Most of its time is returning about 43k rows, not a sort.
- **Human decision:** none new (#36 decided it).
- **Evidence:** `evidence/impl2/37-price-lookup.log`: both statements, the same-row checks, `EXPLAIN (ANALYZE, BUFFERS)` before and after, 15 benchmark runs, the gate and Playwright.
- **Artifact changed:** `src/modules/catalog/infra/pg.ts`, `nfr/val2_latency.test.ts`, `ARCHITECTURE.md` (AD-CAT-2 rule 4), `contracts.md` (CAT-1 Q1), `nfr-evidence.md`.
- **Decided by:** Mateo (#36).


### 38. The re-audit docs and signed evidence are written; a k6 re-run finds that #35's 2-connection pool broke the load budget (Governance + Performance)

- **Phase:** C (close), in a subagent (`94b42e7`, `03213fb`); then menus.
- **Persona/Skill:** tech writing; `bmad-testarch-nfr` (Murat) for the k6 re-run.
- **Prompt (summary):** update the walkthrough and `docs/impl-2/README.md` for #31–#37. Add the degradation and circuit-breaker section, the 4 traps, the 5 NFR dimensions, Winston's audit, a Story 4.6 card and the CI k6 figures. Sign the evidence with SHA-256 and a gate.
- **AI output (summary):**
  - **Walkthrough, renumbered §1–§23:**
    - §3 graceful degradation and circuit breakers (file:line and a test for each path);
    - §4 Winston's audit, labelled close-phase;
    - §8 the Story 4.6 card;
    - §18 the 4 traps;
    - §19 the 5 NFR dimensions;
    - §20 signed evidence;
    - the k6 table with CI run 3 beside the local run.
  - **Greps for §18:** `vi.mock` 0; `vi.fn`, `vi.spyOn` and `vi.stubGlobal` 5 uses, all on ports; `fake<T>` over 18 port types; 0 conditional `expect`, 0 skip / only / todo, 0 files with no assertion.
  - **Signed evidence:** `scripts/evidence-sums.mjs` writes `evidence/impl2/SHA256SUMS` (47 files). `npm run gate:evidence`, in `test:ci`, fails on a changed, missing or unlisted file; three mutations prove it. `ci-runs.json` feeds a trace §2 paragraph naming the CI run and the digests.
  - **Updated docs:** `docs/impl-2/README.md` (a phase "C. Re-audit (#31–#37)"), the root, `docs/` and `_bmad-output/` READMEs.
  - **Gates:** lint, typecheck, `no-sleep` and `epics` pass; trace PASS with 430 ids; evidence 47 / 47; the link check finds 139 links, 0 broken.
  - **Regression found:** k6 had not run since #35 cut the runtime pool to `max: 2`, because it is not part of `test:ci` and the F1 subagent did not run it.
    - At `94b42e7`: **FAIL**, profile p95 659.84 ms against 300 ms and 1,347 dropped iterations against 120, with 0 errors but requests queuing on 2 connections.
    - With `max: 10` (a temporary edit): PASS, p95 26.89 ms.
    - CI's `nfr-k6` job, and so `release`, would have failed on the next push. The README left that checklist item unchecked, not claimed.
  - **Process lesson:** a change to a shared runtime setting must re-run every proof that depends on it, including those outside `test:ci`. The sub-agent prompts now say so.
- **Human decisions (menus):**
  - **Pool:** **(recommended)** make it configurable: a validated env setting (`TEZG_PG_POOL_MAX`, default 2, minimum 2) in `config.ts`.
    - Serverless instances keep 2, the minimum a job needs. Long-lived servers (`next start` for k6, E2E and Docker) set 10.
    - Amend AD-SYS-4 §4 and rule 9. `[S-SYS.jobs.pool]` and `[S-SYS.jobs.starved]` still prove 2. Re-run k6 as evidence 39.
    - The alternatives were a default of 10, which gives up the serverless sizing argument, or lowering the k6 rate, which weakens the proof.
    - ACCEPT.
  - **Test review:** **(recommended)** re-run `bmad-testarch-test-review` over the whole suite at HEAD. The 100 / 100 of `727c74f` predates Story 4.6, the axe scans, F1–F9 and the pool tests. Any finding is fixed before the push, by menu. The alternative was keeping the old review with a note. ACCEPT.
- **Evidence:** `evidence/impl2/38-reaudit-docs.log` (both k6 runs, the evidence mutations, the pyramid recount and the link check).
- **Artifact changed:** `walkthrough-impl2.md`, `docs/impl-2/README.md`, `README.md`, `docs/README.md`, `_bmad-output/README.md`, `scripts/evidence-sums.mjs` (new), `package.json`, `scripts/gen-solu2-trace.mjs`, `traceability-matrix.md`, `evidence/impl2/SHA256SUMS` and `ci-runs.json` (new).
- **Decided by:** Mateo.


### 39. The runtime pool is configurable; long-lived servers use 10 connections and k6 passes again (Performance + Architecture)

- **Phase:** C (close), in a subagent (`f453ca6`, `333233c`), as decided in #38.
- **Persona/Skill:** `bmad-dev-story` (Amelia), `bmad-testarch-nfr` (Murat).
- **AI output (summary):**
  - **Setting:** `TEZG_PG_POOL_MAX` is validated in `src/shared-kernel/config.ts` (`PG_POOL_MAX = { default: 2, min: 2, max: 50 }`). An invalid value stops the app at start-up with its name. `runtimePool(url, { max })` reads it, and the 10 s checkout timeout stays.
  - **Who sets what:** the k6 server, the E2E server and the Docker app set 10; serverless instances, and any unset environment, keep 2. `.env.example` documents it.
  - **Tests:**
    - 14 config tests: the default, 2, 10 and 50, and eight invalid values.
    - `[S-SYS.jobs.pool]` and `[S-SYS.jobs.starved]` build their pool from the config's minimum and default and stay on 2.
    - Two mutations make them fail: a default of 10, and a minimum of 1.
  - **Docs:** AD-SYS-4 (§4, rules 7 and 9, the trade-off), `contracts.md`, `ports-and-adapters.md` and the audit's F1 row are amended.
  - **Every dependent proof re-run** (#38's rule):
    - **k6:** PASS, k6 exit 0. Profile p95 41.25 ms and p99 122.91 ms; browse p95 42.80 ms; 0.00 % errors, 0 5xx, 3 dropped against a limit of 120. Before (log 38): p95 659.84 ms, 1,347 dropped.
    - **Playwright:** 6 passed (28.2 s), with the 14 axe scans.
    - **`test:ci`:** exit 0 in 11 min 48 s. 767 unit tests, 97.56 % branches; trace PASS with 430 ids; `solu2-atdd` 384 green; `solu2-nfr` 30 green.
    - **`gate:evidence`:** 48 / 48, regenerated last.
- **Agent defaults:**
  - An empty value is rejected, not treated as unset.
  - The k6 and E2E runners use `process.env.TEZG_PG_POOL_MAX ?? '10'`.
  - `runtimePool` takes `max` as a required argument.
- **Human decision:** none new (#38 decided it).
- **Evidence:** `evidence/impl2/39-pool-config-k6.log`, `k6-summary.json`.
- **Artifact changed:**
  - Code and tests: `config.ts` (+ test), `db.ts`, `atdd/sys_jobs.test.ts`.
  - Runners and env: `scripts/nfr-k6.mjs`, `scripts/e2e-server.mjs`, `playwright.config.ts`, `docker-compose.yml`, `.env.example`.
  - Docs: `ARCHITECTURE.md`, `contracts.md`, `ports-and-adapters.md`, `architecture-audit-impl2.md`, `walkthrough-impl2.md`, `docs/impl-2/README.md`, `nfr-evidence.md`.
  - Generated: `epics.md`, `traceability-matrix.md`, `SHA256SUMS`.
- **Decided by:** Mateo (#38).


### 40. The test review re-run over the whole suite: 1 HIGH and 2 MEDIUM found and fixed, 100 / 100, Approve (Testing + Governance)

- **Phase:** C (close), in a subagent (`e3af8f3`, `d968efb`), as decided in #38; then a menu.
- **Persona/Skill:** `bmad-testarch-test-review` (Murat).
- **Prompt (summary):** re-run the review at HEAD with the registry's fixed severities, as in #24. Fix the mechanical findings and report the judgment calls. Shuffle seeds 1, 2, 3 and 42, and recount the pyramid.
- **AI output (summary):**
  - **At `efa178c`:** 1 HIGH and 2 MEDIUM, scored 101 and capped at 100 (A). The recommendation was still Request Changes, because any HIGH forces it.
    - HIGH-1: `atdd/sys_contracts.test.ts` had grown to 303 lines when #35's `[S-SYS.tick.jobs]` was added.
    - MEDIUM-1: `JobRun` rows were built inline 4 times.
    - MEDIUM-2: `admin-events.test.ts` copied the `failedDelivery()` factory column for column. The `727c74f` review missed it, and the new review says so.
  - **Fixed, with no assertion changed:**
    - the file was split by moving tests, into `sys_contracts.test.ts` (187 lines) and the new `sys_admin.test.ts` (98 lines), with shared steps in `test-support/suites/sys.ts`;
    - a `jobRun()` factory was added, and the copy now calls the shared factory.

    Result: **0 findings, 100 / 100 (A), Approve**.
  - **No other row fires:** 0 hard waits, 0 conditional assertions, 0 skip / only, 0 files without an assertion, and no order dependence. All 12 shuffled runs pass (`impl1-unit` 767, `solu2-atdd` 384 in 27 files, `solu2-fitness` 12).
  - **Pyramid at HEAD** (unit / integration / E2E):
    - whole suite: 27.9 / 71.6 / 0.6 %;
    - Impl-2's additions: 55.7 / 41.5 / 2.8 %, down from 58.7 % unit, since the re-audit added mostly database races and bounds.

    The "Deliberate deviation" section is updated.
  - **Gate:** `test:ci` exit 0 in 11 min 16 s; 97.56 % branches; trace PASS with 430 ids; `solu2-atdd` 384 green; `solu2-nfr` 30 green; `gate:evidence` 49 / 49.
- **Human decisions (menu):** **(recommended)** all three judgment calls. ACCEPT.
  - **Missing factories:** leave the shapes that have no factory yet (OutboxEvent with EventDelivery, CommissionLedgerEntry, FxSourceBreaker). None repeats 3 times in a file.
  - **Binder race:** keep `[S-FR-COL-5.C1]` as is. It asserts the invariant unconditionally (distinct positions, 22 entries), and pinning the reorder's outcome would need a conditional assertion, or a fixed lock order that removes the race.
  - **Pinned constants:** keep the tests that pin the decided constants (breaker policy, job-health window, `PG_POOL_MAX`). Each caught a mutation of the decided value.
- **Evidence:** `evidence/impl2/40-test-review-rerun.log`.
- **Artifact changed:** `test-review.md` (overwritten in place), `atdd/sys_contracts.test.ts`, `atdd/sys_admin.test.ts` (new), `test-support/suites/sys.ts` (new), `fixtures.ts`, `admin-events.test.ts`, `epics.md`, `traceability-matrix.md`, `walkthrough-impl2.md`, `docs/impl-2/README.md`, `SHA256SUMS`.
- **Decided by:** Mateo.


### 41. Close of the re-audit: every statement line evidenced, and CI run 5 is the sign-off (Governance)

- **Phase:** C (close).
- **Persona/Skill:** main agent; `bmad-testarch-ci` (Murat).
- **AI output (summary):**
  - **CI run 5** ([42522585504](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/actions/runs/42522585504), `053f5e9`): every re-audit commit (#31–#40) ran on CI. `release` printed `gate=success e2e=success nfr-k6=success`, `Quality gate: PASS`.
    - **gate:** `no-sleep` 354 files, 0 problems; `gate:evidence` 49 / 49; 767 unit tests, 97.56 % branches; trace PASS with 430 ids; `solu2-atdd` 384 green; `solu2-nfr` 30 green.
    - **e2e:** the gating run had 6 passed (22.8 s) and the forensic run 6 passed (18.2 s), each with the 14 axe scans.
    - **nfr-k6:** with `TEZG_PG_POOL_MAX=10`, profile p95 6.30 ms, p99 10.46 ms, browse p95 15.40 ms; 0.00 % errors, 0 5xx, 0 dropped.
  - **Recorded:**
    - run 5 is the sign-off in `ci-runs.json`, which feeds trace §2;
    - runs 4 and 5 are excerpted in `32-ci-run.log`;
    - the six run-5 `trace.zip` files, with the axe scans, replace run 3's in `traces-ci/` (git history keeps the old ones);
    - the walkthrough's k6 table and CI list, and the README's rubric rows 4 and 5, runs table and evidence row, now cite run 5;
    - `SHA256SUMS` was regenerated last.
  - **The re-audit of #31, line by line against the statement:**
    - **Gaps closed:** the sleep literals (#31); the walkthrough sections on the 4 traps, the 5 NFR dimensions, graceful degradation and circuit breakers, and the CI k6 figures (#38); signed evidence (#38); the circuit breaker, Story 4.6 (#32); the automated accessibility checks, with 0 NFRs waived (#33); Winston's audit with F1–F9 fixed (#34–#36); the k6 regression the re-run caught (#38–#39); the test review re-run at 100 / 100 (#40); CI on the final code (this entry).
    - **Still open, stated as such:** the pyramid below 70 / 20 / 10, which is the documented deliberate deviation; the manual WCAG audit at launch; and Winston's audit being close-phase rather than shift-left.
  - **State:** 72 / 72 stories and 13 / 13 epics `done`; the trace PASS with 96 / 96 FRs, 56 / 56 NFRs (3 with a part deferred to launch), 32 / 32 risks, 62 / 62 AD rows and 430 / 430 ids; the test review 100 / 100. This log holds 41 entries, with three human corrections of AI tests (#8, #9, #23).
- **Human decision:** none new; this entry records the outcome of #31–#40.
- **Evidence:** `evidence/impl2/32-ci-run.log`, `ci-runs.json`, `traces-ci/`, `SHA256SUMS`.
- **Artifact changed:** `32-ci-run.log`, `ci-runs.json`, `traces-ci/*.zip`, `traceability-matrix.md`, `walkthrough-impl2.md`, `docs/impl-2/README.md`, `SHA256SUMS`.
- **Decided by:** Mateo (#31–#40).
