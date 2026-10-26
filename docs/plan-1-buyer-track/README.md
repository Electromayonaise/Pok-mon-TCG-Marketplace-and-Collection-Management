# Plan-1: Buyer/Collector track (2026-09-04 – 09-06)

**Goal.** AI-assisted product planning (PRD → UX → architecture → readiness) for one user journey, the course's "Guest" track. For TEZG that is the collector who browses the catalog, buys from a verified business and tracks her orders. The track builds on the whole-system spec, product brief and architecture spine (AD-1..13) rather than restating them.

## What was done

- **PRD** (`bmad-prd`). Protagonist: Valentina, a release-driven collector who also sells now and then. Requirements FR-1..FR-9, including the dual-role "My Sales" summary. Testable NFRs were set: comprobante upload in under 10 s, 5 MB per image.
- **UX scenarios** (WDS): four scenarios — find a first card, pick a listing she trusts, pay without a payment gateway, check orders and sales — broken into 10 page specs, mobile-first.
- **Design system and experience** (`DESIGN.md`, `EXPERIENCE.md`). The visual direction is "Trusted Ledger": navy and cream, one teal accent, chosen over two alternatives. The reference price shows in COP only.
- **Architecture** extending the spine with AD-14..AD-17: comprobante storage and ACL with 10-minute signed URLs, business order access after closure with a snapshotted `businessId`, the My Sales query, and the regulated-data class of comprobante content.
- **Reviews**: adversarial and edge-case passes on the PRD, UX and architecture, each triaged.
- **Readiness check**: NEEDS WORK at first, READY after remediation. The missing error state of the My Sales tab was ruled a blocker and fixed in the page spec, `EXPERIENCE.md` and the architecture.
- **Decision log**: 16 human decisions.

Scope widened during the task: after the instructor confirmed it, the [Seller/Business track](../plan-1-seller-track/README.md) was added as a second pass.

## Artifacts

"Last commit" is the last commit that changed the artifact before the reorganization. Every removed or merged artifact is intact in commit [`853449c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/853449c) under its path there.

| Artifact | Path at `853449c` | Now | Last commit |
|---|---|---|---|
| PRD, addendum | 2 files, `docs/plan-1-buyer-track/` | **Removed, superseded** by the Plan-2 [`prd.md`](../../_bmad-output/planning-artifacts/prd.md) and [`addendum.md`](../../_bmad-output/planning-artifacts/addendum.md) | [`b2f7cf7`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/b2f7cf7) |
| Architecture (AD-14..AD-17) | `docs/plan-1-buyer-track/ARCHITECTURE.md` | **Merged.** AD-14..AD-17 and their error codes are copied verbatim into [`ARCHITECTURE.md`](../../_bmad-output/planning-artifacts/ARCHITECTURE.md), Appendix A.1. The rest is superseded by it | [`32dd795`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/32dd795) |
| Design system ("Trusted Ledger") | `docs/plan-1-buyer-track/DESIGN.md` | **Merged.** Its 7 components (button-primary, price-block, payment-details-block, order-status-row, upload-dropzone, listing-card, empty-state) and the colour rationale are copied into [`ux/DESIGN.md`](../../_bmad-output/planning-artifacts/ux/DESIGN.md) | [`3adb767`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3adb767) |
| Experience | `docs/plan-1-buyer-track/EXPERIENCE.md` | **Removed, superseded** by [`ux/EXPERIENCE.md`](../../_bmad-output/planning-artifacts/ux/EXPERIENCE.md) | [`3adb767`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3adb767) |
| UX scenarios and 10 page specs | `docs/plan-1-buyer-track/C-UX-Scenarios/` | **Removed, superseded** by [`ux/C-UX-Scenarios/`](../../_bmad-output/planning-artifacts/ux/C-UX-Scenarios/). Page 4.1 Orders List, which Plan-2 inherits, is kept as [`orders-list-adopted-from-plan-1.md`](../../_bmad-output/planning-artifacts/ux/C-UX-Scenarios/06-ord-order-comprobante/orders-list-adopted-from-plan-1.md) | [`3adb767`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3adb767) |
| Reviews (PRD, UX, architecture) | 5 files, `docs/plan-1-buyer-track/` | **Removed** with the artifacts they reviewed | [`32dd795`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/32dd795) |
| Readiness report | `docs/plan-1-buyer-track/implementation-readiness-report-2026-09-05.md` | **Removed, superseded** by [`implementation-readiness-report.md`](../../_bmad-output/planning-artifacts/implementation-readiness-report.md) | [`19bb430`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/19bb430) |
| Process logs (`.memlog.md`, `_progress/`) | 2 files, `docs/plan-1-buyer-track/` | **Removed** with the artifacts they logged | [`19bb430`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/19bb430) |
| Decision log | `docs/plan-1-buyer-track/decision-log.md` | **Current:** [`_bmad-output/decision-logs/plan-1-buyer-track-decision-log.md`](../../_bmad-output/decision-logs/plan-1-buyer-track-decision-log.md) | [`19bb430`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/19bb430) |

**Restoring a removed artifact.** Read it with `git show 853449c:<path>`, or bring it back into the working tree with `git checkout 853449c -- <path>`, using the path in the table. For example:

```bash
git checkout 853449c -- docs/plan-1-buyer-track/prd.md
```

<details><summary>All 5 commits that changed this task's files</summary>

| Commit | Date | Message |
|---|---|---|
| [`b2f7cf7`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/b2f7cf7) | 2026-09-06 | Add Plan-1 Buyer/Collector track PRD (Phase 1) |
| [`8faba32`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/8faba32) | 2026-09-06 | Add Plan-1 Buyer/Collector track UX scenario outlines (Phase 2) |
| [`3adb767`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/3adb767) | 2026-09-06 | Add Plan-1 Buyer/Collector track design system and page specs (Phase 3) |
| [`32dd795`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/32dd795) | 2026-09-06 | Add Plan-1 Buyer/Collector track architecture (Phase 4) |
| [`19bb430`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/19bb430) | 2026-09-06 | Close out Plan-1 Buyer/Collector track (Phase 5 + decision log) |

</details>
