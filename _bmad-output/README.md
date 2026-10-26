# BMAD output

The latest version of every BMAD/WDS artifact for TEZG, in the folders `_bmad/bmm/config.yaml` and `_bmad/tea/config.yaml` name. Each artifact exists once, with no per-task subfolders. [`docs/`](../docs/README.md) summarizes each course task, says which of these artifacts it produced or changed, and lists the commits, including how to restore the superseded versions that were removed from here.

## Layout

| Path | Contents |
|---|---|
| `A-Product-Brief/`, `B-Trigger-Map/`, `_progress/`, `wds-workflow-status.yaml` | WDS Phases 0–2 for the whole product: the project brief, the trigger map and the four personas |
| `project-context.md` | Implementation rules derived from the architecture decisions |
| `specs/spec-pokemon-tcg-marketplace/` | The system spec (`SPEC.md`, built with `bmad-spec`, its memlog and companions) and the architecture spine (`ARCHITECTURE-SPINE.md`, AD-1..AD-13) |
| `planning-artifacts/prd.md`, `addendum.md` | The PRD for all 12 modules (96 FRs, 56 NFRs) and its cross-cutting addendum |
| `planning-artifacts/ux/` | UX: scenarios and page specs (`C-UX-Scenarios/`), `DESIGN.md`, `EXPERIENCE.md`, es-CO microcopy, HTML mockups, wireframes |
| `planning-artifacts/ARCHITECTURE.md` | The architecture: AD-SYS-1..8, the per-module AD-&lt;CODE&gt;-n, and the inherited AD-14..AD-19 (Appendix A) |
| `planning-artifacts/ARCHITECTURE-v2-delta.md` | Architecture v2: the stack, refinements R-1..R-17 and the links to the detailed design |
| `planning-artifacts/detailed-design/` | Contracts, ports and adapters, the schema (the migration the service runs), OpenAPI, DTOs, events, UI states |
| `planning-artifacts/epics.md`, `epics.source.mjs` | The backlog: 13 epics, 69 stories, generated from the source file |
| `planning-artifacts/implementation-readiness-report.md` | The planning readiness gate: PRD, UX and architecture aligned (PASS) |
| `planning-artifacts/sprint-readiness-report.md` | The sprint readiness gate on the backlog (IR-PASS) |
| `planning-artifacts/reviews/` | Every review of the planning artifacts, each with its triage |
| `planning-artifacts/.memlog.md`, `.memlog-detailed-design.md` | The process logs of the PRD and of the detailed design |
| `test-artifacts/` | The ATDD, fitness and NFR suites, fixtures, the CI gate mirror (`ci/`), test design, NFR evidence, the traceability matrix |
| `implementation-artifacts/` | `sprint-status.yaml`, one file per story, `walkthrough-impl1.md` |
| `decision-logs/` | The human/AI decision log of every task from Plan-1 on. They are records, not versions of one another, so all are kept |

## Documents that build on each other

A few artifacts are layers, not versions: each one adds to the one before and does not restate it, so they have different names.

| Topic | Read in this order |
|---|---|
| Architecture | `specs/spec-pokemon-tcg-marketplace/ARCHITECTURE-SPINE.md` (AD-1..AD-13) → `planning-artifacts/ARCHITECTURE.md` (AD-SYS, AD-&lt;CODE&gt;, and AD-14..AD-19 in Appendix A) → `planning-artifacts/ARCHITECTURE-v2-delta.md` (stack and R-1..R-17) |
| Requirements | `specs/spec-pokemon-tcg-marketplace/SPEC.md` (capabilities) → `planning-artifacts/prd.md` + `addendum.md` (FRs, NFRs) → `planning-artifacts/detailed-design/contracts.md` (operations) → `planning-artifacts/epics.md` (stories) |
| Readiness | `planning-artifacts/implementation-readiness-report.md` (the plan) → `planning-artifacts/sprint-readiness-report.md` (the backlog) |

## Paths the build reads

The code depends on several of these paths, so moving a file here means updating its readers too:

- `planning-artifacts/detailed-design/schemas/`: the migration runner (`scripts/lib/migrations.mjs`), `next.config.ts`, the API generator, `.dockerignore`;
- `test-artifacts/`: `vitest.config.ts`, `tsconfig.json`, `tools/lint/base.mjs`;
- `implementation-artifacts/sprint-status.yaml`, `planning-artifacts/epics.md`, `detailed-design/contracts.md`, `prd.md`, `ux/C-UX-Scenarios/` and the four Solu-2 reviews: the `gate:*` scripts in `package.json`, the generators and readiness audit in `scripts/`, and `_bmad/custom/bmad-sprint-planning.toml`;
- `test-artifacts/ci/quality-gate.yml`: must stay byte-identical to `.github/workflows/solu2-quality-gate.yml`.
