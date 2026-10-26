# Spec Task 1 — System spec (2026-08-08 – 08-09)

**Goal.** Write a 1–2 page spec of the Pokémon TCG marketplace and collection platform from the course problem statement, in seven fixed sections (Contract, Why, Capabilities, Constraints, Non-Goals, Success Signal, Assumptions), and justify it.

## What was done

Six stages, one commit each:

1. **Human draft** written without AI spec tooling.
2. **AI kernel** from `bmad-spec`, run against the problem statement on its own: 16 capabilities, 9 constraints, 10 non-goals, 6 assumptions and 7 open questions.
3. **Reconciliation** of the two into the final spec. The Contract section was written by hand, because `bmad-spec` has no contract field. The open questions became flagged assumptions.
4. **Human review** worked through five flagged assumptions. Business purchases happen in-platform, prices are in COP with USD/COP reference pairs, and only verified businesses get in-app messaging. Reviews of a business need a completed purchase. Individual sellers complete a short profile before their first listing.
5. **Adversarial review** (`bmad-review-adversarial-general`): 6 of 12 findings folded in. Test design and the edge-case hunter were skipped on purpose, because they need planning inputs this task does not have.
6. **Trim** to the 2-page cap: 1,440 → 1,057 words, merging bullets without dropping substance.

## Result

A spec with 13 contract operations, 12 capabilities and 9 constraints, plus a justification document with the AI usage log and a self-review against the rubric.

## Artifacts

"Last commit" is the last commit that changed the artifact before the reorganization. Every removed or merged artifact is intact in commit [`853449c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/853449c) under its path there.

| Artifact | Path at `853449c` | Now | Last commit |
|---|---|---|---|
| Final spec | `docs/spec-task-1/SPEC.md` | **Removed, superseded.** The `bmad-spec` kernel [`_bmad-output/specs/spec-pokemon-tcg-marketplace/SPEC.md`](../../_bmad-output/specs/spec-pokemon-tcg-marketplace/SPEC.md) folded this spec's Contract in on 2026-08-25 and is the current spec | [`2e8a39b`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/2e8a39b) |
| Human first draft (stage 1) | `docs/spec-task-1/01-human-draft/SPEC.md` | **Removed, superseded** by the final spec | [`1477625`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/1477625) |
| Justification, AI usage, self-review | `docs/spec-task-1/JUSTIFICATION.md` | **Removed** from the BMAD output: a course write-up, not a BMAD artifact. Summarized above | [`2930d45`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/2930d45) |
| AI kernel (stage 2) | `_bmad-output/specs/spec-pokemon-tcg-marketplace/` | **Current:** [`_bmad-output/specs/spec-pokemon-tcg-marketplace/`](../../_bmad-output/specs/spec-pokemon-tcg-marketplace/) | [`a01d833`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/a01d833) |

**Restoring a removed artifact.** Read it with `git show 853449c:<path>`, or bring it back into the working tree with `git checkout 853449c -- <path>`, using the path in the table. For example:

```bash
git checkout 853449c -- docs/spec-task-1/SPEC.md
```

<details><summary>All 9 commits that changed this task's files</summary>

| Commit | Date | Message |
|---|---|---|
| [`1477625`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/1477625) | 2026-08-08 | docs(spec-task-1): stage 1 - plain-reasoning draft of the 7-section spec |
| [`05bf2df`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/05bf2df) | 2026-08-08 | docs(spec-task-1): stage 3 - reconcile human draft + AI kernel into final deliverables |
| [`4fe6767`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/4fe6767) | 2026-08-08 | docs(spec-task-1): fill in stage-3 commit hash in justification doc |
| [`9d73e93`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/9d73e93) | 2026-08-08 | docs(spec-task-1): stage 4 - human review resolves/narrows five flagged assumptions |
| [`dd8dae4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/dd8dae4) | 2026-08-08 | docs(spec-task-1): fill in stage-4 commit hash in justification doc |
| [`4c78ce9`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/4c78ce9) | 2026-08-09 | Stage 5: fold in adversarial-review findings, skip test-design/edge-case-hunter as inapplicable |
| [`e15348a`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/e15348a) | 2026-08-09 | Fill in stage-5 commit hash in Process/Git Trail table |
| [`2e8a39b`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/2e8a39b) | 2026-08-09 | Trim SPEC.md to fit the assignment's 2-page cap |
| [`2930d45`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/2930d45) | 2026-08-09 | Fill in stage-6 commit hash in JUSTIFICATION.md git trail |

</details>
