# Impl-1: Implementation and foundation build (2026-10-24 – 10-26)

**Goal.** Turn the Solu-2 design into running, automatically tested code that conforms to its contracts, schema and invariants, through the BMad Full Ceremony. Pair work; Martín Gómez takes the decisions the log records.

## What was done

- **Scope**: Impl-1 covers the walking skeleton plus the Core and MEC stories of all 12 modules: 43 of the 69 stories. The other 26 belong to Impl-2, and the front end is a later phase. Delivery cut (decision #22): the foundation plus three Identity stories. The other 37 stories follow epic by epic, and their ATDD tests stay red for the right reason.
- **Scaffold**: a Next.js 16 + tRPC 11 service with no pages, PostgreSQL 16 via Docker Compose, and a migration runner over the Solu-2 schema. Prisma is generated from the DDL and backs Better Auth only. Also health probes, an isolated lint toolchain, a dependency gate, and an Impl-1 CI gate.
- **Stories done** (sprint status `done`):

  | Story | What it guarantees |
  |---|---|
  | 1.1 | Every refusal is one typed `ErrorBody`: a registry code, an HTTP status, an es-CO message and a cited decision |
  | 1.2 | Every change is audited in its own transaction, and regulated values are redacted from every egress |
  | 1.3 | Every committed event reaches each subscriber exactly once in effect: outbox, retries, sweeper, admin replay |
  | 2.1 | An individual seller completes their profile and claims the track in one transaction |
  | 2.2 | When two seller tracks race on one account, exactly one wins (proven over 100 concurrent repetitions) |
  | 2.3 | An account that may not list learns why and when it may reapply, from one pure projection |

- **Ceremony**: 1.1–1.3 ran the Full Ceremony: `bmad-create-story`, test-first `bmad-dev-story`, then a fresh-context `bmad-code-review` with every finding triaged. 2.1–2.3 ran the compact ceremony. The two done procedures (`access.completeIndividualProfile`, `admin.events.replay`) are wired behind a real Better Auth session (decision #24).
- **Decision log**: 24 entries, 9 tagged `[CORRECTED]` and 2 tagged `[IMPROVED]`.

## Known limits

Only the two procedures above are wired; every other procedure answers `Unexpected` (500) until its story. Sign-up and sign-in are not configured. The event subscribers' handlers and the production dispatch and sweeper come with later stories. See §11 of the walkthrough.

## Artifacts

"Last commit" is the last commit that changed the artifact before the reorganization. Every removed or merged artifact is intact in commit [`853449c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/853449c) under its path there.

| Artifact | Path at `853449c` | Now | Last commit |
|---|---|---|---|
| Sprint status | `docs/impl-1/implementation-artifacts/sprint-status.yaml` | **Current:** [`_bmad-output/implementation-artifacts/sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml) | [`5325d67`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/5325d67) |
| Story files 1.1–1.3, 2.1–2.3 | 6 files, `docs/impl-1/implementation-artifacts/` | **Current:** `1-*.md`, `2-*.md` in [`_bmad-output/implementation-artifacts/`](../../_bmad-output/implementation-artifacts/) | [`853449c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/853449c) |
| Walkthrough | `docs/impl-1/walkthrough-impl1.md` | **Current:** [`_bmad-output/implementation-artifacts/walkthrough-impl1.md`](../../_bmad-output/implementation-artifacts/walkthrough-impl1.md) | [`853449c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/853449c) |
| Adapted task statement | `docs/impl-1/task-statement.md` | **Removed:** a course statement, not a BMAD artifact. Its scope decisions are in the decision log and the sprint status | [`792ac82`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/792ac82) |
| AI decision log | `docs/impl-1/ai-log/ai-decision-log.md` | **Current:** [`_bmad-output/decision-logs/impl-1-ai-decision-log.md`](../../_bmad-output/decision-logs/impl-1-ai-decision-log.md) | [`853449c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/853449c) |
| Code and tests | 4 files, `./` | **Current:** in the repository root, `src/`, `app/`, `scripts/`, `test-support/` (see the root [`README.md`](../../README.md)) | [`c36153b`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/c36153b) |

**Restoring a removed artifact.** Read it with `git show 853449c:<path>`, or bring it back into the working tree with `git checkout 853449c -- <path>`, using the path in the table. For example:

```bash
git checkout 853449c -- docs/impl-1/task-statement.md
```

<details><summary>All 14 commits that changed this task's files</summary>

| Commit | Date | Message |
|---|---|---|
| [`4ee99d5`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/4ee99d5) | 2026-10-24 | chore(impl-1): adapt the Impl-1 statement and plan the sprint |
| [`3187e01`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3187e01) | 2026-10-24 | feat(scaffold): Next.js + tRPC service, migrations, Prisma model, health probes and gates |
| [`edf22a4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/edf22a4) | 2026-10-25 | feat(story-1.1): refuse every request with one typed, explained error body |
| [`9114475`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/9114475) | 2026-10-25 | fix(story-1.1): client-caused tRPC rejections are 400; no free text in refusal copy (decisions #10, #11) |
| [`a0fc7fb`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/a0fc7fb) | 2026-10-25 | feat(story-1.2): audit trail and redaction at every egress |
| [`65741c1`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/65741c1) | 2026-10-25 | feat(story-1.3): deliver every committed event exactly once in effect |
| [`792ac82`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/792ac82) | 2026-10-25 | chore(impl-1): delivery cut: foundation plus Identity 2.1-2.3, then epic batches (decision #22) |
| [`7f903f2`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/7f903f2) | 2026-10-25 | feat(story-2.1): claim the individual seller track and complete the profile in one transaction |
| [`2189038`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/2189038) | 2026-10-25 | test(story-2.2): prove exactly one seller track wins a race (MEC, 100 repetitions) |
| [`3857fd1`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3857fd1) | 2026-10-25 | docs(impl-1): commit a proof story right after the story it proves (decision #23) |
| [`5325d67`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/5325d67) | 2026-10-25 | feat(story-2.3): explain why an account may not list, from one capability projection |
| [`b317ad7`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/b317ad7) | 2026-10-25 | docs(impl-1): implementation walkthrough and README for the delivery |
| [`c37dc23`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/c37dc23) | 2026-10-25 | docs(impl-1): record the clean-clone and Docker check, status progression and deliverable map |
| [`853449c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/853449c) | 2026-10-25 | docs(impl-1): record decision #24 and the wired procedures in the walkthrough and README |

</details>
