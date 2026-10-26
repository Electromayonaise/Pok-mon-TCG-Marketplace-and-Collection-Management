# Plan-1: Seller/Business track (2026-09-06)

**Goal.** The second Plan-1 pass, the course's "Host" track: the individual seller who lists and trades, and the verified business that sells through the platform and pays commission. It extends the [Buyer/Collector track](../plan-1-buyer-track/README.md) without rewriting it.

## What was done

- **PRD** with two protagonists: Valentina as an individual seller, and Andrés as a verified business. They are separate because the spec makes the two seller types mutually exclusive. Requirements FR-S1..FR-S9 cover the individual-seller profile, listings, trade offers, business verification, commission balance and order fulfilment.
- **UX scenarios**: four scenarios — publish a first listing, manage a trade offer, verify the business and fund the balance, fulfil a sale — in 11 page specs. Andrés's device was decided per page: the back-office pages are desktop-first, the notification pages mobile-first.
- **Design system**: no new colors; every seller component reuses the buyer track's "Trusted Ledger" palette, because TEZG is one app.
- **Architecture**: adds AD-18 (seller-type exclusivity as an atomic conditional update, covering Pending business applications too) and AD-19 (commission balance, with a floor-guard alternative documented and rejected). Adopts the buyer track's AD-14, AD-15 and AD-17.
- **Reviews** of the PRD, UX and architecture, each triaged.
- **Readiness check**: NEEDS WORK at first, READY after remediation. A new finding showed that a Pending business could not reach listing creation in the UX, contrary to FR-S9. The fix went into `EXPERIENCE.md`, `DESIGN.md` and three page specs.
- **Decision log**: 13 human decisions.

## Artifacts

"Last commit" is the last commit that changed the artifact before the reorganization. Every removed or merged artifact is intact in commit [`853449c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/853449c) under its path there.

| Artifact | Path at `853449c` | Now | Last commit |
|---|---|---|---|
| PRD, addendum | 2 files, `docs/plan-1-seller-track/` | **Removed, superseded** by the Plan-2 [`prd.md`](../../_bmad-output/planning-artifacts/prd.md) and [`addendum.md`](../../_bmad-output/planning-artifacts/addendum.md) | [`e87b1f4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/e87b1f4) |
| Architecture (AD-18, AD-19) | `docs/plan-1-seller-track/ARCHITECTURE.md` | **Merged.** AD-18, AD-19 and their error codes are copied verbatim into [`ARCHITECTURE.md`](../../_bmad-output/planning-artifacts/ARCHITECTURE.md), Appendix A.2. The rest is superseded by it | [`2d054f7`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/2d054f7) |
| Design system (seller extension) | `docs/plan-1-seller-track/DESIGN.md` | **Merged.** Its 6 components (verification-status-badge, commission-balance-card, trade-offer-card, comprobante-viewer, open-to-trade-toggle, create-listing-form) and its colour notes are copied into [`ux/DESIGN.md`](../../_bmad-output/planning-artifacts/ux/DESIGN.md) | [`38e53c8`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/38e53c8) |
| Experience | `docs/plan-1-seller-track/EXPERIENCE.md` | **Removed, superseded** by [`ux/EXPERIENCE.md`](../../_bmad-output/planning-artifacts/ux/EXPERIENCE.md) | [`38e53c8`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/38e53c8) |
| UX scenarios and 11 page specs | `docs/plan-1-seller-track/C-UX-Scenarios/` | **Removed, superseded** by [`ux/C-UX-Scenarios/`](../../_bmad-output/planning-artifacts/ux/C-UX-Scenarios/) | [`38e53c8`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/38e53c8) |
| Reviews (PRD, UX, architecture) | 5 files, `docs/plan-1-seller-track/` | **Removed** with the artifacts they reviewed | [`2d054f7`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/2d054f7) |
| Readiness report | `docs/plan-1-seller-track/implementation-readiness-report-2026-09-06.md` | **Removed, superseded** by [`implementation-readiness-report.md`](../../_bmad-output/planning-artifacts/implementation-readiness-report.md) | [`ba52cdf`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/ba52cdf) |
| Process logs (`.memlog.md`, `_progress/`) | 2 files, `docs/plan-1-seller-track/` | **Removed** with the artifacts they logged | [`ba52cdf`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/ba52cdf) |
| Decision log | `docs/plan-1-seller-track/decision-log.md` | **Current:** [`_bmad-output/decision-logs/plan-1-seller-track-decision-log.md`](../../_bmad-output/decision-logs/plan-1-seller-track-decision-log.md) | [`ba52cdf`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/ba52cdf) |

**Restoring a removed artifact.** Read it with `git show 853449c:<path>`, or bring it back into the working tree with `git checkout 853449c -- <path>`, using the path in the table. For example:

```bash
git checkout 853449c -- docs/plan-1-seller-track/prd.md
```

<details><summary>All 5 commits that changed this task's files</summary>

| Commit | Date | Message |
|---|---|---|
| [`e87b1f4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/e87b1f4) | 2026-09-06 | Add Plan-1 Seller/Business track PRD (Phase 1) |
| [`88f758b`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/88f758b) | 2026-09-06 | Add Plan-1 Seller/Business track UX scenario outlines (Phase 2) |
| [`38e53c8`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/38e53c8) | 2026-09-06 | Add Plan-1 Seller/Business track design system and page specs (Phase 3) |
| [`2d054f7`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/2d054f7) | 2026-09-06 | Add Plan-1 Seller/Business track architecture (Phase 4) |
| [`ba52cdf`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/ba52cdf) | 2026-09-06 | Close out Plan-1 Seller/Business track (Phase 5 + decision log) |

</details>
