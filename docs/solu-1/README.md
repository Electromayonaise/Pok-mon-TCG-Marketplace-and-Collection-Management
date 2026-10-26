# Solu-1: Contract-driven solutioning (2026-10-18 – 10-19)

**Goal.** Turn the Plan-2 package into contracts a developer agent can implement without inventing a decision, for all 12 modules. Each module gets three core functions: a read-only guard, a contended mutation with exactly one winner, and a resolver that returns an explicit result when data is missing. Individual work by Mateo Rubio. No production logic.

## What was done

- **Phase 1, contracts** (Winston, `bmad-agent-architect`): a matrix of 37 behavioral contracts with preconditions, postconditions and invariants (P/Q/I). DSC and VAL own no writes, so their contended slot is a concurrency-safe read. CAT carries a supplementary fourth contract for its mandatory edge case. Review triage: 21 accepted and 3 rejected, and one Plan-2 rule corrected from a rollback to a savepoint.
- **Phase 2, ports and adapters, schema, DTOs**: the hexagonal map, 12 SQL-first migrations (`000`–`010`, `099` grants), DTOs and interface stubs. Seller-track exclusivity is enforced by a composite foreign key. The admin guard moved to `adminProcedure`, because the agent's own earlier fix broke AD-1.
- **Phase 3, test preparation** (TEA): the Vitest + fast-check harness against a real Postgres. The schema suite is GREEN and proves the migrations enforce the invariants physically. The ATDD suite is RED: 131 tests fail on `NotImplementedError`. The CI gate and the TEA skill matrix were added too.
- **Phase 4, backlog and gate**: 12 epics with 37 stories, one story per contract. A deterministic readiness audit, wired into `bmad-sprint-planning`, returned IR-PASS (signed off 2026-10-19). Sprint status was then generated with every story in backlog.
- **Decision log**: 20 entries.

## Result

The first contract set and backlog. [Solu-2](../solu-2/README.md) built the full detailed design on top of it and replaced every Solu-1 artifact, so none of them is kept in `_bmad-output/`. The Solu-1 test projects, gates and CI workflow were retired with them. Only the decision log stays.

## Artifacts

"Last commit" is the last commit that changed the artifact before the reorganization. Every removed or merged artifact is intact in commit [`853449c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/853449c) under its path there.

| Artifact | Path at `853449c` | Now | Last commit |
|---|---|---|---|
| Contract matrix (37 contracts) | `docs/solu-1/planning/contracts.md` | **Removed, superseded** by [`detailed-design/contracts.md`](../../_bmad-output/planning-artifacts/detailed-design/contracts.md), which restates the 17 shared operations in the Solu-2 template | [`d094c25`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/d094c25) |
| Ports and adapters | `docs/solu-1/planning/ports-and-adapters.md` | **Removed, superseded** by [`detailed-design/ports-and-adapters.md`](../../_bmad-output/planning-artifacts/detailed-design/ports-and-adapters.md) | [`d094c25`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/d094c25) |
| SQL migrations (`000`–`010`, `099`) | `docs/solu-1/planning/schemas/` | **Removed, superseded** by [`detailed-design/schemas/001_tezg_schema.sql`](../../_bmad-output/planning-artifacts/detailed-design/schemas/001_tezg_schema.sql), the migration the service runs | [`d094c25`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/d094c25) |
| Epics and stories (12 × 37) | `docs/solu-1/planning/epics.md` | **Removed, superseded** by [`epics.md`](../../_bmad-output/planning-artifacts/epics.md) | [`5fdf9d4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/5fdf9d4) |
| Readiness gate report | `docs/solu-1/planning/readiness-gate-report.md` | **Removed, superseded** by [`sprint-readiness-report.md`](../../_bmad-output/planning-artifacts/sprint-readiness-report.md) | [`c36817b`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/c36817b) |
| Reviews | `docs/solu-1/reviews/` | **Removed** with the artifacts they reviewed | [`ccdde0c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/ccdde0c) |
| Test suites (131 RED ATDD tests, GREEN schema suite), TEA matrix, framework report | `docs/solu-1/tests/` | **Removed, superseded** by [`test-artifacts/`](../../_bmad-output/test-artifacts/). The `solu1-*` Vitest projects, the `gate:solu1` scripts and `solu1-quality-gate.yml` were retired with them | [`b1e5fcb`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/b1e5fcb) |
| Sprint status (all backlog) | `docs/solu-1/implementation-artifacts/sprint-status.yaml` | **Removed, superseded** by [`implementation-artifacts/sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml) | [`22345b9`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/22345b9) |
| Process log (`.memlog.md`) | `docs/solu-1/planning/.memlog.md` | **Removed** with the artifacts it logged | [`3cfe4f4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3cfe4f4) |
| Decision log | `docs/solu-1/ai-log/decision-log-solu1.md` | **Current:** [`_bmad-output/decision-logs/solu-1-decision-log.md`](../../_bmad-output/decision-logs/solu-1-decision-log.md) | [`3cfe4f4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3cfe4f4) |

**Restoring a removed artifact.** Read it with `git show 853449c:<path>`, or bring it back into the working tree with `git checkout 853449c -- <path>`, using the path in the table. For example:

```bash
git checkout 853449c -- docs/solu-1/planning/contracts.md
```

<details><summary>All 16 commits that changed this task's files</summary>

| Commit | Date | Message |
|---|---|---|
| [`4b35061`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/4b35061) | 2026-10-18 | Add Solu-1 adapted statement and Phase 1 contract matrix (37 P/Q/I) |
| [`9befe93`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/9befe93) | 2026-10-18 | Track the Solu-1 adapted statement by anchoring the task* ignore to the root |
| [`d094c25`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/d094c25) | 2026-10-18 | Add Solu-1 Phase 2: Ports & Adapters map, SQL migrations, DTOs and interface stubs |
| [`e3461f6`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/e3461f6) | 2026-10-18 | Add Solu-1 Phase 3: TEA harness, GREEN schema suite, RED ATDD suite and CI gate |
| [`4cf53eb`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/4cf53eb) | 2026-10-18 | Add contract-bound epics and stories |
| [`60497a4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/60497a4) | 2026-10-18 | Add adversarial review of the stories |
| [`efca451`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/efca451) | 2026-10-18 | Apply story review fixes to the backlog |
| [`b1e5fcb`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/b1e5fcb) | 2026-10-18 | Run the seller-track race 100 times |
| [`e2862e3`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/e2862e3) | 2026-10-18 | List each story's consumed neighbour ports |
| [`5fdf9d4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/5fdf9d4) | 2026-10-18 | Add a Definition of Done to the backlog |
| [`22345b9`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/22345b9) | 2026-10-18 | Generate sprint status for the backlog |
| [`ccdde0c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/ccdde0c) | 2026-10-18 | Mark the story review as triaged |
| [`daacf96`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/daacf96) | 2026-10-18 | Add the readiness gate report |
| [`3cfe4f4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3cfe4f4) | 2026-10-18 | Record the backlog and gate decisions |
| [`c36817b`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/c36817b) | 2026-10-19 | Generate the Solu-2 sprint status and sign off both readiness gates |
| [`7fa61bd`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/7fa61bd) | 2026-10-19 | remove extra docs |

</details>
