# Impl-1: Implementation and foundation build (2026-10-24 – 10-30)

**Goal.** Turn the Solu-2 design into running, automatically tested code that conforms to its contracts, schema and invariants, through the BMad Full Ceremony. Pair work; Martín Gómez takes the decisions the log records.

## What was done

- **Scope**: Impl-1 covers the walking skeleton plus the Core and MEC stories of all 12 modules, and the prerequisites they depend on: 43 of the 69 stories (decision log #2). The other 26 belong to Impl-2, and the front end is a phase after it (#3).
- **Result**: all 43 Impl-1 stories are `done`, and 19 stories of `impl2_scope` were pulled forward with their epics because the Core and MEC stories turn their tests green (#26–#38): 62 of 69. The 7 reserved stories (8.5, 8.6, 9.6, 11.5, 11.6, 13.5, 13.6) are untouched, and their 28 ATDD tests stay red for `NotImplementedError`. All 13 epic gates are signed.
- **Scaffold**: a Next.js 16 + tRPC 11 service with no pages, PostgreSQL 16 via Docker Compose, and a migration runner over the Solu-2 schema, which no story had to change. Prisma is generated from the DDL and backs Better Auth only. Also health probes, an isolated lint toolchain, a dependency gate and the Impl-1 CI gate. 84 of the 111 procedures are wired.
- **Ceremony**: 1.1–1.3 ran the Full Ceremony and 2.1–2.3 the compact ceremony; together they are the delivery cut of 2026-10-26 (tag `impl1-entrega`, #22). Every later story ran the epic-batched flow: spec approval by menu, test-first stories, one three-layer code review per epic and Martín's signed gate (#5). Epics 1–3 were committed on `main`; Epics 4–13 are PRs #2–#11.
- **Close (Phase 4)**: the final trace (gate PASS), the test review (95/100, A), the walkthrough of the 43 stories, this deliverable map, the README check from a clean clone and decision log #39. The tag `impl1-done` is set on `main` after this close is merged.

## Deliverable map (task statement §6.1)

The task statement is at `853449c:docs/impl-1/task-statement.md`. Its paths predate the reorganization that moved every BMAD artifact to `_bmad-output/` (`docs/README.md`), so each deliverable is where that convention puts it (decision log #39).

| §6.1 | Deliverable | Path | Status |
|---|---|---|---|
| 1 | Functional source code: the scaffold and the 43 stories | `src/`, `app/`, `scripts/`, `prisma/`, `test-support/` | 43 / 43 done |
| 2 | Automated test suite: every acceptance criterion, ≥ 90 % passing, 0 skipped; Impl-2 tests red for the right reason, reported apart | `src/**/*.test.ts`, [`_bmad-output/test-artifacts/`](../../_bmad-output/test-artifacts/) (ATDD, NFR, fitness); per-story results in [`impl1-final-trace.md`](../../_bmad-output/test-artifacts/impl1-final-trace.md) | 100 % of the Impl-1 bound tests pass; 0 skipped; 28 Impl-2 tests red, reported apart |
| 3 | `sprint-status.yaml` | [`_bmad-output/implementation-artifacts/sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml) | 62 `done`, 7 `backlog` |
| 4 | `walkthrough-impl1.md`: architecture and layout; per story the goal, procedures, database changes and test evidence; the suite and gate output | [`_bmad-output/implementation-artifacts/walkthrough-impl1.md`](../../_bmad-output/implementation-artifacts/walkthrough-impl1.md) (asked for at `docs/impl-1/`) | All 43 stories plus the 19 pulled forward |
| 5 | AI decision log: ≥ 6 interactions, ≥ 2 corrections | [`_bmad-output/decision-logs/impl-1-ai-decision-log.md`](../../_bmad-output/decision-logs/impl-1-ai-decision-log.md) (asked for at `docs/impl-1/ai-log/`) | 39 entries; 12 tagged proposals (10 `[CORRECTED]`, 2 `[IMPROVED]`) |
| 6 | Scaffold infrastructure and README | [`docker-compose.yml`](../../docker-compose.yml), [`Dockerfile`](../../Dockerfile), [`.env.example`](../../.env.example), `package.json` and `gate:deps`, [`README.md`](../../README.md) | Checked from a clean clone (below): the development setup passes as written; the Quick start passed only once the build stage could reach the registries |

Supporting artifacts: the 62 story files in [`_bmad-output/implementation-artifacts/`](../../_bmad-output/implementation-artifacts/), [`deferred-work.md`](../../_bmad-output/implementation-artifacts/deferred-work.md) (every open item with its owner), the test review [`impl1-test-review.md`](../../_bmad-output/test-artifacts/impl1-test-review.md), [`nfr-evidence.md`](../../_bmad-output/test-artifacts/nfr-evidence.md) and the generated [`traceability-matrix.md`](../../_bmad-output/test-artifacts/traceability-matrix.md).

## Self-assessment (task statement §6.2)

| Item | Evidence |
|---|---|
| Execution | From a clean clone, the README's development setup and `npm test` pass as written, and one command, `npm test`, runs the suite. The Quick start's `docker compose up` failed in the check's container because the image build could not reach Docker Hub and the npm registry; with the proxy and its CA given to the build stage (a temporary Dockerfile outside the repository), both services came up `healthy` with both health probes green (below) |
| Scaffold integrity | `gate:purity`: 13 domain files, 0 problems; `[SYS-AD1]`, `[SYS-6.R1]`, `[SYS-6.R4]` green |
| Stories implemented | 43 / 43 `done`, each with its domain logic and repository adapter, and with tRPC procedures wherever its contract exposes one; 9 stories implement in-process ports or proofs only (walkthrough §3–§15, "Procedures") |
| Contract compliance | `gate:api:solu2` (111 ingress procedures against `openapi.yaml` and `contracts.md`), `gate:codes:solu2`, `gate:ids:solu2` |
| Test coverage | ≥ 2 bound tests per story, all passing (`impl1-final-trace.md` §1) |
| Error handling | Every refusal is `{ error: ErrorBody }` with its code and status (Story 1.1, `[SYS-1.R6]`); no stack trace reaches the client |
| BMad traceability | `sprint-status.yaml` matches the code: `gate:atdd-red:impl1` requires every done story's tests to pass and every other one to fail on `NotImplementedError` |
| AI governance | The decision log records prompts, outputs and Martín's decisions (39 entries) |

## README check from a clean clone (2026-10-30)

The README was followed to the letter in a fresh `git clone` of `main` at `949c219`, in this session's cloud container.

| README step | Outcome |
|---|---|
| Quick start: `git clone …`, `cd tezg` | OK |
| Quick start: `docker compose up -d --wait` | **Failed in this container, not because of the README.** First Docker Hub answered `429 Too Many Requests` for `node:22.12.0-bookworm-slim` (the container's shared pull quota); with the image taken from `mirror.gcr.io` and tagged locally, `npm ci` inside the build died with "Exit handler never called", because the build stage cannot reach the npm registry through the container's TLS-re-signing proxy. With the proxy and its CA passed to the build stage through a temporary Dockerfile outside the repository, the image built, and `docker compose up -d --wait --no-build` started both services `healthy` |
| Quick start: `curl http://localhost:3000/api/health/ready` | OK: `{"ready":true,"checks":{"database":"ok","migrations":"current"},"pending":[]}`; `/api/health/live` gave `{"status":"ok"}`. `catalog.browse` answered an empty page, and `orders.create` without a session answered `NotAuthenticated` (401) |
| Development: `npm ci` | OK (also generates the Prisma client and installs the lint toolchain) |
| Development: `cp .env.example .env` | OK |
| Development: `npm run db:up` | OK: the Compose PostgreSQL 16 healthy on 127.0.0.1:55432 |
| Development: `npm run db:migrate` | OK: `created database tezg_dev`, `applied 001_tezg_schema.sql` |
| Development: `npm run dev` | OK: both probes green on `http://localhost:3000`. **It writes an untracked `AGENTS.md`** (Next.js 16's agent-rules file), so the tree is dirty afterwards: `.gitignore` now ignores it |
| `npm test` | OK: exit 0, output in the walkthrough §17 |

**Changes from the check** (commit `c5960d9`): the README says that a proxy which re-signs TLS breaks `npm ci` inside the image build, and points to the development setup; `.gitignore` ignores `/AGENTS.md`; the README's status badge and "What Impl-1 delivers" now describe the 43 stories.

## Known limits

[`walkthrough-impl1.md`](../../_bmad-output/implementation-artifacts/walkthrough-impl1.md) §18 lists every open item by owner. In short:

- **Impl-2:** the 7 reserved stories; Story 2.4's sign-in, sign-up and throttle hook; the jobs route (`trm-fetch`, order and offer expiry, `commission-reconcile`, `JOBS_SECRET`, single-flight), which no story in `epics.md` builds yet; the NFR-COL-2 and NFR-REP-2 profile benchmarks (Stories 11.5 and 13.5); the test-review hardening, which also owns NFR-IDN-1's benchmark.
- **Launch checklist:** the production object storage, malware scanner and upload ticket; the production catalog feed and TRM readers; `IP_HMAC_KEY` and `BETTER_AUTH_SECRET`; the support contact; WCAG and transfer-time NFRs.
- **UI phase:** raw status tokens and ISO instants inside es-CO texts, and the DTO decision fields the pages need.

## Artifacts

| Artifact | Path | Last commit |
|---|---|---|
| Sprint status | [`_bmad-output/implementation-artifacts/sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml) | [`f549b79`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/f549b79) (the close changes no status) |
| Story files (62) | `[0-9]*-*.md` in [`_bmad-output/implementation-artifacts/`](../../_bmad-output/implementation-artifacts/) | [`f549b79`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/f549b79) |
| Walkthrough | [`_bmad-output/implementation-artifacts/walkthrough-impl1.md`](../../_bmad-output/implementation-artifacts/walkthrough-impl1.md) | this close |
| Deferred work | [`_bmad-output/implementation-artifacts/deferred-work.md`](../../_bmad-output/implementation-artifacts/deferred-work.md) | this close |
| Final trace | [`_bmad-output/test-artifacts/impl1-final-trace.md`](../../_bmad-output/test-artifacts/impl1-final-trace.md) | this close |
| Test review | [`_bmad-output/test-artifacts/impl1-test-review.md`](../../_bmad-output/test-artifacts/impl1-test-review.md) | this close |
| AI decision log | [`_bmad-output/decision-logs/impl-1-ai-decision-log.md`](../../_bmad-output/decision-logs/impl-1-ai-decision-log.md) | this close |
| Adapted task statement | Removed: a course statement, not a BMAD artifact. Read it with `git show 853449c:docs/impl-1/task-statement.md` | [`792ac82`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/792ac82) |
| Code and tests | The repository root, `src/`, `app/`, `scripts/`, `test-support/` (see the root [`README.md`](../../README.md)) | this close (`.gitignore`) |

**Restoring a removed artifact.** Read it with `git show 853449c:<path>`, or bring it back with `git checkout 853449c -- <path>`.

## Commits

Impl-1 has 96 non-merge commits on `main` from `4ee99d5` (2026-10-24, the sprint plan) to `f549b79` (2026-10-30, the Epic 13 close), plus this close. List them with:

```bash
git fetch origin main
git log --no-merges --format='%h %ad %s' --date=short 4ee99d5^..f549b79
```

| Epic | Close commit | Pull request |
|---|---|---|
| 1, 2, 3 | `af97624`, `38156cc`, `d552afa` | committed on `main`; the delivery is tag `impl1-entrega` (`853449c`) |
| 4 | `8a97cc2` | [#2](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/2) |
| 5 | `ed3d521` | [#3](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/3) |
| 6 | `592200a` | [#4](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/4) |
| 7 | `704908c` | [#5](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/5) |
| 8 | `cd4b913` | [#6](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/6) |
| 9 | `e5c87a1` | [#7](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/7) |
| 10 | `2cc6939` | [#8](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/8) |
| 11 | `a4bdaf4` | [#9](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/9) |
| 12 | `4ac1b02` | [#10](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/10) |
| 13 | `f549b79` | [#11](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/pull/11) |
