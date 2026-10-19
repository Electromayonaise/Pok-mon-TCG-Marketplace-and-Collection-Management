# Solu-2 — Deliverable map

Where every deliverable of the Solu-2 task lives, how to open or run it, and how far along it is. The adapted statement is [`docs/solu-2/task-statement.md`](solu-2/task-statement.md); the decisions behind everything below are in [`docs/solu-2/ai-log/decision-log-solu2.md`](solu-2/ai-log/decision-log-solu2.md).

**Status legend:** ✅ done · 🟡 in progress · ⬜ not started

## How to get started

```bash
git checkout solu-2                  # this package's branch (built on solu-1)
npm ci                               # exact-pinned toolchain (Node 22, TypeScript 7, Vitest 5)
npm run db:up                        # PostgreSQL 16 in Docker on 127.0.0.1:55432 (throwaway)
```

Documents live under `docs/solu-2/`. Code-shaped artifacts — interface stubs, DTO types, the test harness — live at the repository root (`src/`, `test-support/`), the layout ARCHITECTURE §3 fixes for the real code, shared with Solu-1.

## Phase 0 — Intake & architecture gap audit

| Deliverable (statement §) | Path | How to reach / run | Status |
|---|---|---|---|
| Adapted statement, TEZG seed table of the 37 core operations (§3.0.1, Annex A) | `docs/solu-2/task-statement.md` | read | ✅ |
| Implementability gap audit, ≥ 6 gaps, triaged (§3.0.2) | `docs/solu-2/reviews/review-arch-implementability.md` | read: 17 gaps, triaged at the Phase 0 gate (log #6) | ✅ |
| Stack declaration (§3.0.3) | `docs/solu-2/planning/ARCHITECTURE.md` → "Stack Decisions" | read | ✅ |

## Phase 1 — Behavioral contracts

| Deliverable | Path | How to reach / run | Status |
|---|---|---|---|
| 37 core-operation contracts (P/Q/I, concurrency, time, latency) | `docs/solu-2/planning/detailed-design/contracts.md` §1–§12 (operation map in §0.2) | read | ✅ |
| Typed error catalog | same file, §13 | read; `node scripts/check-code-citations.mjs <file>` checks every cited code against `src/shared-kernel/codes.ts` (183 citations, 0 problems) | ✅ |
| Invariant binding table (AD → enforcement point → red test) | same file, §14 (every AD, plus R-2) | read | ✅ |
| Supporting contracts (every FR not bound by a core operation) | same file, §15 (38 FRs) | read | ✅ |

## Phase 2 — Ports & adapters, schemas, DTOs, events

| Deliverable | Path | How to reach / run | Status |
|---|---|---|---|
| Hexagonal map + layer-tagged Mermaid diagram | `docs/solu-2/planning/detailed-design/ports-and-adapters.md` | read (Mermaid renders on GitHub); `npm run gate:purity` enforces hard rule 1 | ✅ |
| Complete schema (every Plan-2 entity, `audit_events`, ≥ 2 physical invariants) | `docs/solu-2/planning/detailed-design/schemas/001_tezg_schema.sql` (55 tables) | applied by the test harness; or `psql -v ON_ERROR_STOP=1 -U tezg -d tezg < …` against `npm run db:up` | ✅ |
| DTOs (request/response per operation, `ErrorBody`, `ExplanationDTO`) | `docs/solu-2/planning/detailed-design/schemas/dto.ts` (an index; each DTO lives in `src/modules/<host>/dto/*.v2.dto.ts`; `ErrorBody` and `ExplanationDTO` in `src/shared-kernel/explanation.ts`) | `npm run typecheck` | ✅ |
| Event catalog (`eventId`, `occurredAt`, `schemaVersion`) | `docs/solu-2/planning/detailed-design/schemas/events.md` (types: `src/shared-kernel/events.ts`) | read | ✅ |
| OpenAPI for every ingress procedure and error | `docs/solu-2/planning/detailed-design/schemas/openapi.yaml` (111 procedures, generated) | open in any OpenAPI viewer; `npm run gate:api:solu2` fails on drift from `operations.json` | ✅ |
| Interface stubs (no production logic) | `src/modules/<host>/application/*.v2.ts`, `ports/*.v2.ts` (generated); `src/shared-kernel/external.ts`; simulated adapters in `test-support/simulated/` | `npm run typecheck`; `npm run gen:api:solu2` regenerates them | ✅ |
| Operation registry: the single source for the OpenAPI, the DTO index, the stubs and the ports | `docs/solu-2/planning/detailed-design/schemas/operations.json` | `npm run gen:api:solu2` / `npm run gate:api:solu2` | ✅ |
| UI state → contract and DTO map (readiness check 2; review G-17) | `docs/solu-2/planning/detailed-design/ui-states.md`, from `schemas/ui-states.json` | `npm run gate:ui:solu2` (43 pages, 327 states) | ✅ |
| Detailed-design review (adversarial + edge-case hunter), triaged | `docs/solu-2/reviews/review-detailed-design.md` (14 findings: 12 accepted, 2 rejected; log #9) | read | ✅ |

## Phase 3 — Test preparation (TEA)

| Deliverable | Path | How to reach / run | Status |
|---|---|---|---|
| Risk register (≥ 8, every MEC P0), level allocation, thresholds, testability gaps | `docs/solu-2/test/test-design.md` (20 risks: 15 P0 = 12 MECs + 3 cross-cutting, 5 P1) | read; `npm run gate:trace:solu2` fails if a P0 risk has no red test | ✅ |
| Fixtures: `fake_clock`, `seed_marketplace`, `sim_events`, `db`, `explain_assert` | `test-support/` and `test-support/solu2/`, indexed in `docs/solu-2/test/fixtures/README.md`; the PRD §3 seed is `test-support/solu2/seed-marketplace.ts` | the seed profile is proven count by count: `npm run test:fitness:solu2` (`[SEED.profile]`) | ✅ |
| ATDD red suite: per operation happy, P-violation, invariant under concurrency/repetition/boundary; every MEC; explainability | `docs/solu-2/test/atdd/<module>_contracts.test.ts` (core operations) and `<module>_supporting.test.ts` (§15 contracts, where the module needed the split), plus `sys_contracts.test.ts` for the walking skeleton: 352 tests in 19 files | `npm run gate:atdd-red:solu2` (every test must fail on `NotImplementedError`); `npm run gate:ids:solu2` (every id `contracts.md` cites exists once) | ✅ |
| Static fitness functions (the green halves of AD-1, AD-8, AD-9, AD-SYS-6, AD-SYS-8, R-2) | `docs/solu-2/test/fitness/sys_fitness.test.ts` (scanners in `test-support/solu2/fitness.ts`) | `npm run test:fitness:solu2`; each scanner is first proven against a planted violation | ✅ |
| CI quality gate | `docs/solu-2/test/ci/quality-gate.yml`, byte-identical to `.github/workflows/solu2-quality-gate.yml` | runs on push to `main` and `solu-*` and on PRs; locally `npm run gate:solu2` (needs `npm run db:up`) | ✅ |
| NFR evidence plan (NFR, metric, measurement, artifact, status), with ≥ 1 performance, reliability and security NFR | `docs/solu-2/test/nfr-evidence.md` (all 56 NFRs); red benchmarks in `docs/solu-2/test/nfr/` (ORD-1 p95, outbox crash-sweep, canary scan) | read; `npm run gate:nfr-red:solu2` | ✅ |
| Traceability matrix (FR/NFR → scenario → AD → clause → test → story → status) | `docs/solu-2/test/traceability-matrix.md` (generated; the story column fills in Phase 4) | `npm run gen:trace:solu2` regenerates it; `npm run gate:trace:solu2` fails on any FR, AD or P0 risk without a test, or a stale matrix | ✅ |
| TEA skill matrix (artifact + defect caught per skill) | `docs/solu-2/test/tea-skill-matrix.md` | read | ✅ |
| Test-quality review, triaged | `docs/solu-2/reviews/review-test-quality.md` (32/100 → 19 findings accepted by Martín, log #11 → re-review 100/100) | read | ✅ |

## Phase 4 — Backlog & readiness gate

| Deliverable | Path | How to reach / run | Status |
|---|---|---|---|
| Epics and stories (skeleton + 12 module epics) | `docs/solu-2/planning/epics.md`: 13 epics, 69 stories, generated from `planning/epics.source.mjs`; backlog review in `reviews/review-epics.md` | read; `npm run gen:epics:solu2` regenerates it; `npm run gate:epics:solu2` fails on drift | ✅ |
| Readiness gate report (terminal output, sign-off, gate drill) | `docs/solu-2/planning/readiness-gate-report.md` (IR-PASS; signed off by Mateo, log #13) | reproduce: `node scripts/readiness-audit.mjs --package docs/solu-2` | ✅ |
| Sprint status | `docs/solu-2/implementation-artifacts/sprint-status.yaml` (13 epics, 69 stories, all `backlog`) | generated by `bmad-sprint-planning` after an IR-PASS; `npm run gate:atdd-red:solu2` reads it | ✅ |

## Phase 5 — Wrap-up

| Deliverable | Path | How to reach / run | Status |
|---|---|---|---|
| ARCHITECTURE v2 (a delta over Plan-2: refinements R-n, then links to the detailed design) | `docs/solu-2/planning/ARCHITECTURE.md` | read | 🟡 |
| AI decision log (≥ 6 entries, ≥ 2 rejections, pair attribution) | `docs/solu-2/ai-log/decision-log-solu2.md` | read | 🟡 |
| Final traceability run | `docs/solu-2/test/traceability-matrix.md` | read | ⬜ |
| Repository tag | `solu2-ready` | `git show solu2-ready` | ⬜ |

## Tooling shared with Solu-1

| Tool | Path | Purpose |
|---|---|---|
| Readiness audit | `scripts/readiness-audit.mjs` (Solu-2 checks in `scripts/readiness-audit-solu2.mjs`) | Deterministic IR-PASS / IR-FAIL; wired into `bmad-sprint-planning` by `_bmad/custom/bmad-sprint-planning.toml` |
| Backlog generator | `scripts/gen-solu2-epics.mjs` | Builds `epics.md` from `epics.source.mjs`; refuses unbound operations or tests, double bindings and forward dependencies |
| Red check | `scripts/check-atdd-red.mjs` | Every ATDD test of a not-done story fails on `NotImplementedError`; done stories must pass |
| Code citations | `scripts/check-code-citations.mjs` | Every `Code` (HTTP n, owner) matches the registry |
| Test-id coverage | `scripts/check-test-ids.mjs` | Every test id `contracts.md` cites is defined exactly once; every core operation has a test (`npm run gate:ids:solu2`) |
| Traceability generator | `scripts/gen-solu2-trace.mjs` | Builds the matrix and enforces the Phase 3 gate (`npm run gen:trace:solu2`, `gate:trace:solu2`) |
| Harness | `test-support/` (see its `README.md`) | Per-file Postgres databases, virtual clock, deterministic ids, data factories, outbox double, race barrier |
