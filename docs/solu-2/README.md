# Solu-2: Detailed design package (2026-10-18 – 10-25)

**Goal.** The full detailed design for all 12 modules, deep enough that implementation invents nothing: contracts, schema, API surface, events, a red test suite and a ready backlog. Pair work by Mateo Rubio and Martín Gómez. Built on Solu-1 and, like it, free of production logic.

## What was done

- **Phase 0, intake**: the adapted statement with 37 core operations. An implementability audit found 17 gaps in the Plan-2 architecture, all accepted. The stack was declared: TypeScript 7, Node 22, tRPC 11, PostgreSQL 16, Vitest. The architecture was versioned as a delta over Plan-2 (refinements R-1..R-17).
- **Phase 1, contracts**: the 37 core operations in the full template (P/Q/I, concurrency, time, latency), a typed error catalog, an invariant binding table with one row per AD, and supporting contracts for the 38 FRs the core operations do not bind.
- **Phase 2, design**: the ports-and-adapters map. A complete schema (55 tables, `audit_events`) that is now the migration the app runs. An operation registry (`operations.json`) that generates the OpenAPI document (111 procedures), the DTO index and the interface stubs. Also the event catalog and a map from UI states to contracts (43 pages, 327 states).
- **Phase 3, test preparation**: a risk register with 20 risks (15 P0) and fixtures, including the PRD seed profile. A red ATDD suite of 352 tests in 19 files, static fitness functions, red NFR benchmarks, an NFR evidence plan for all 56 NFRs, a generated traceability matrix and a CI quality gate. The test-quality review went from 32/100 to 100/100 after 19 accepted findings.
- **Phase 4, backlog**: 13 epics with 69 stories, generated from `epics.source.mjs`: a walking-skeleton epic, then one epic per module. Readiness audit IR-PASS, signed off by Mateo. Sprint status with every story in backlog.
- **Phase 5, wrap-up**: the architecture v2 links table and the final traceability run (P0 15/15, ADs 61/61, FRs 96/96). Tagged `solu2-ready`.
- **Decision log**: 13 entries.

## Result

The detailed design and backlog Impl-1 implements. Its schema, OpenAPI, test suite and epics are read directly by the code, the generators and the `gate:*` scripts.

## Artifacts

"Last commit" is the last commit that changed the artifact before the reorganization. Every removed or merged artifact is intact in commit [`853449c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/853449c) under its path there.

| Artifact | Path at `853449c` | Now | Last commit |
|---|---|---|---|
| Architecture v2 (delta over Plan-2) | `docs/solu-2/planning/ARCHITECTURE.md` | **Current:** [`_bmad-output/planning-artifacts/ARCHITECTURE-v2-delta.md`](../../_bmad-output/planning-artifacts/ARCHITECTURE-v2-delta.md) (renamed: Plan-2's `ARCHITECTURE.md` keeps that name) | [`468acd9`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/468acd9) |
| Detailed design: contracts, ports, schema, OpenAPI, DTOs, events, UI states | `docs/solu-2/planning/detailed-design/` | **Current:** [`_bmad-output/planning-artifacts/detailed-design/`](../../_bmad-output/planning-artifacts/detailed-design/) | [`5325d67`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/5325d67) |
| Epics and stories (13 × 69) and their generator source | 2 files, `docs/solu-2/planning/` | **Current:** [`_bmad-output/planning-artifacts/epics.md`](../../_bmad-output/planning-artifacts/epics.md), [`_bmad-output/planning-artifacts/epics.source.mjs`](../../_bmad-output/planning-artifacts/epics.source.mjs) | [`3a0d629`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3a0d629) |
| Readiness gate report | `docs/solu-2/planning/readiness-gate-report.md` | **Current:** [`_bmad-output/planning-artifacts/sprint-readiness-report.md`](../../_bmad-output/planning-artifacts/sprint-readiness-report.md) (renamed from `readiness-gate-report.md`, which Plan-2 also had) | [`c36817b`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/c36817b) |
| Reviews | `docs/solu-2/reviews/` | **Current:** in [`_bmad-output/planning-artifacts/reviews/`](../../_bmad-output/planning-artifacts/reviews/), together with the Plan-2 reviews (no file names collide) | [`6ec7f7e`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/6ec7f7e) |
| Test suites, test design, NFR evidence, traceability matrix, CI gate | `docs/solu-2/test/` | **Current:** [`_bmad-output/test-artifacts/`](../../_bmad-output/test-artifacts/). The traceability matrix is regenerated against the live sprint status, so the six delivered stories show `done` | [`65741c1`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/65741c1) |
| Sprint status (all backlog) | `docs/solu-2/implementation-artifacts/sprint-status.yaml` | **Removed, superseded** by [`implementation-artifacts/sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml). The Solu-2 red gate, readiness audit and trace generator now read that file | [`c36817b`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/c36817b) |
| Deliverable map (`docs/solu-2.md`) | `docs/solu-2.md` | **Removed:** a task document, not a BMAD artifact. Summarized above | [`468acd9`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/468acd9) |
| Process log (`.memlog.md`) | `docs/solu-2/planning/.memlog.md` | **Current:** [`_bmad-output/planning-artifacts/.memlog-detailed-design.md`](../../_bmad-output/planning-artifacts/.memlog-detailed-design.md) (renamed: Plan-2's PRD memlog keeps `.memlog.md`) | [`468acd9`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/468acd9) |
| Decision log | `docs/solu-2/ai-log/decision-log-solu2.md` | **Current:** [`_bmad-output/decision-logs/solu-2-decision-log.md`](../../_bmad-output/decision-logs/solu-2-decision-log.md) | [`376b08a`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/376b08a) |

**Restoring a removed artifact.** Read it with `git show 853449c:<path>`, or bring it back into the working tree with `git checkout 853449c -- <path>`, using the path in the table. For example:

```bash
git checkout 853449c -- docs/solu-2/implementation-artifacts/sprint-status.yaml
```

<details><summary>All 69 commits that changed this task's files</summary>

| Commit | Date | Message |
|---|---|---|
| [`d5a6602`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/d5a6602) | 2026-10-18 | Add the adapted task statement for the detailed-design package |
| [`bb590d1`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/bb590d1) | 2026-10-18 | Open the detailed-design decision log |
| [`faa40b8`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/faa40b8) | 2026-10-18 | Add the deliverable map for the detailed-design package |
| [`1947b95`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/1947b95) | 2026-10-18 | Add the architecture implementability review |
| [`227c83f`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/227c83f) | 2026-10-18 | Declare the stack and record the accepted architecture refinements |
| [`9877acf`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/9877acf) | 2026-10-18 | Record the gap triage decision |
| [`d4c2d65`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/d4c2d65) | 2026-10-18 | Correct the core-operation count and two review findings |
| [`8ad7efd`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/8ad7efd) | 2026-10-18 | Add the behavioral contracts for the 37 core operations |
| [`b0387ee`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/b0387ee) | 2026-10-18 | Amend the top-up refinement and add the contract-gate refinements |
| [`bc249b6`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/bc249b6) | 2026-10-18 | Record the contract gate decisions |
| [`0d09b70`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/0d09b70) | 2026-10-18 | Add the complete schema for every Plan-2 entity |
| [`69c8143`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/69c8143) | 2026-10-18 | Add the operation registry and the API surface generator |
| [`f20b078`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/f20b078) | 2026-10-18 | Generate the OpenAPI document, DTO index and interface stubs |
| [`189bca2`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/189bca2) | 2026-10-18 | Add contracts for the ports modules offer each other |
| [`e4c17fd`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/e4c17fd) | 2026-10-18 | Add the event catalog with the envelope and subscribers |
| [`675cc4a`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/675cc4a) | 2026-10-18 | Inject external ports into the generated module dependencies |
| [`ae292d2`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/ae292d2) | 2026-10-18 | Add the ports and adapters map with the layer diagram |
| [`6908b43`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/6908b43) | 2026-10-18 | Add the read operations the UI states need |
| [`ef06ea0`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/ef06ea0) | 2026-10-18 | Map every UI state to its backing contract and DTO |
| [`3300967`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3300967) | 2026-10-18 | Add contracts for the read models found by the UI-state check |
| [`4b752c3`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/4b752c3) | 2026-10-18 | Add the detailed-design review |
| [`7446cc0`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/7446cc0) | 2026-10-18 | Carry value constraints, fixed inputs and repository ports into the generated surface |
| [`db5dae5`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/db5dae5) | 2026-10-18 | Make the UI-state check fail on an unclassified state |
| [`e49b7e4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/e49b7e4) | 2026-10-18 | Name each contract's DTOs and record refinements R-12 to R-14 |
| [`3f2ba64`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3f2ba64) | 2026-10-18 | Record the detailed-design gate decisions |
| [`75d406a`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/75d406a) | 2026-10-18 | Record the test preparation scope decisions |
| [`ad8d3b8`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/ad8d3b8) | 2026-10-18 | Add the red acceptance suite for IDN |
| [`28b2ac7`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/28b2ac7) | 2026-10-18 | Add the red acceptance suite for VER |
| [`a36fadf`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/a36fadf) | 2026-10-18 | Add the red acceptance suite for CAT |
| [`5939422`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/5939422) | 2026-10-18 | Add the red acceptance suite for DSC |
| [`a420096`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/a420096) | 2026-10-18 | Add the red acceptance suite for INV |
| [`11825c6`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/11825c6) | 2026-10-18 | Add the red acceptance suite for ORD |
| [`82d30b5`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/82d30b5) | 2026-10-18 | Add the red acceptance suite for COM |
| [`4863900`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/4863900) | 2026-10-18 | Add the red acceptance suite for TRD |
| [`5a2e353`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/5a2e353) | 2026-10-18 | Add the red acceptance suite for MSG |
| [`2bc5ae9`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/2bc5ae9) | 2026-10-18 | Add the red acceptance suite for COL |
| [`64d5fae`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/64d5fae) | 2026-10-18 | Add the red acceptance suite for VAL |
| [`4b3f22b`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/4b3f22b) | 2026-10-18 | Add the red acceptance suite for REP |
| [`660268c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/660268c) | 2026-10-18 | Route trading's item-ref lookup through listings types |
| [`f66622d`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/f66622d) | 2026-10-18 | Add the walking-skeleton platform stubs |
| [`446117f`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/446117f) | 2026-10-18 | Add the red acceptance suite for SYS |
| [`de8535d`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/de8535d) | 2026-10-18 | Rename the trading.mine role filter to side |
| [`00535e4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/00535e4) | 2026-10-18 | Add the green SYS fitness functions |
| [`b98ca4c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/b98ca4c) | 2026-10-18 | Add the test-id coverage gate |
| [`3accf3b`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3accf3b) | 2026-10-19 | Add the seed_marketplace reference profile |
| [`937292e`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/937292e) | 2026-10-19 | Add the red NFR benchmarks |
| [`0940a43`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/0940a43) | 2026-10-19 | Add the Solu-2 CI quality gate |
| [`0aa89cc`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/0aa89cc) | 2026-10-19 | Add the risk-based test design and NFR evidence plan |
| [`49e5871`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/49e5871) | 2026-10-19 | Add the generated traceability matrix and its gate |
| [`fdc8743`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/fdc8743) | 2026-10-19 | Document the Solu-2 fixtures |
| [`4f20abc`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/4f20abc) | 2026-10-19 | Add the Solu-2 test-quality review |
| [`4626187`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/4626187) | 2026-10-19 | Fix the conditional assertions and inline literals in the ATDD suite |
| [`326dbce`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/326dbce) | 2026-10-19 | Split the six oversize ATDD files into core and supporting suites |
| [`70ebcd3`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/70ebcd3) | 2026-10-19 | Record the test-review triage and re-review |
| [`9a72495`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/9a72495) | 2026-10-19 | Close Phase 3: TEA skill matrix, decision #11, deliverable map |
| [`66059fb`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/66059fb) | 2026-10-19 | Race the IDN MEC at the claim and move the end-to-end race to VER |
| [`3a0d629`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3a0d629) | 2026-10-19 | Add the Solu-2 backlog: walking skeleton plus 12 module epics |
| [`6ec7f7e`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/6ec7f7e) | 2026-10-19 | Add the backlog review and machine-readable triage status lines |
| [`c36817b`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/c36817b) | 2026-10-19 | Generate the Solu-2 sprint status and sign off both readiness gates |
| [`376b08a`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/376b08a) | 2026-10-19 | Log the Phase 4 decisions and update the deliverable map |
| [`468acd9`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/468acd9) | 2026-10-19 | Close Solu-2: ARCHITECTURE v2 links and the final trace |
| [`7fa61bd`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/7fa61bd) | 2026-10-19 | remove extra docs |
| [`3187e01`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3187e01) | 2026-10-24 | feat(scaffold): Next.js + tRPC service, migrations, Prisma model, health probes and gates |
| [`edf22a4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/edf22a4) | 2026-10-25 | feat(story-1.1): refuse every request with one typed, explained error body |
| [`9114475`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/9114475) | 2026-10-25 | fix(story-1.1): client-caused tRPC rejections are 400; no free text in refusal copy (decisions #10, #11) |
| [`a0fc7fb`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/a0fc7fb) | 2026-10-25 | feat(story-1.2): audit trail and redaction at every egress |
| [`65741c1`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/65741c1) | 2026-10-25 | feat(story-1.3): deliver every committed event exactly once in effect |
| [`7f903f2`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/7f903f2) | 2026-10-25 | feat(story-2.1): claim the individual seller track and complete the profile in one transaction |
| [`5325d67`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/5325d67) | 2026-10-25 | feat(story-2.3): explain why an account may not list, from one capability projection |

</details>
