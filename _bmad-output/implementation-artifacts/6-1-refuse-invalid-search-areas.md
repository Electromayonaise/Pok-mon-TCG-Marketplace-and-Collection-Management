---
title: 'Story 6.1: Refuse invalid search areas'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'e143f13'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `assertSearchArea` and the four DSC domain functions throw `NotImplementedError`, so the 4 bound tests are red, and DSC-1, DSC-2 and the wishlist's area filter have no guard to call.

**Approach:** DSC-3 as written in contracts.md §4: a pure check over the ADD-§2.4 constants, plus the pure DSC core (`haversineKm`, `insideRadius`, `compareRank`) that Stories 6.2 and 6.3 build on.

## Boundaries & Constraints

**Always:**
- **`validateSearchArea`** (domain): `radiusOutOfRange` unless `1 ≤ radiusKm ≤ 300`; `centreOutsideColombia` unless the centre is inside `COLOMBIA_BBOX` (inclusive) and not (0, 0). It reuses INV's `isValidLocation`, so the box is the one ADD-§2.4 constant (DSC-3 I1).
- **`assertSearchArea`** (service): a non-finite `lat`, `lng` or `radiusKm` is `RequestValidationFailed` through `rejectRequest` (P1, for in-process callers; the parser already refuses it). Any other refusal is `InvalidSearchArea` (400), citing `{ rule: 'FR-DSC-1', inputs: { lat, lng, radiusKm } }`. No I/O, no clock, no audit (Q2, Q3).
- **`haversineKm`**: ADD-§2.3, R = 6371.0088 km, double precision. **`insideRadius`**: `d ≤ r + 1e-6`. **`compareRank`**: sold-out last, then distance (with an area), then price, then id.
- Domain unit tests in `src/modules/listings/dsc-domain.test.ts`, the bounds and the order included.

**Ask First:** any DTO or bound-test change.

**Never:** a second copy of the Colombia box; any I/O in the guard.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bogotá 15 km | (4.711, −74.0721, 15) | `undefined` | N/A |
| Inclusive bounds | radius 1 and 300 | `undefined` | N/A |
| Too wide | radius 301 | — | `InvalidSearchArea` 400 citing the three inputs |
| Sentinel / abroad | (0, 0) / Madrid | — | `InvalidSearchArea` |
| NaN | `radiusKm: NaN` | — | `RequestValidationFailed` |

</frozen-after-approval>

## Code Map

- `src/modules/listings/domain/dsc.ts` -- the pure DSC core
- `src/modules/listings/application/dsc.v2.ts` -- `assertSearchArea`
- `src/modules/listings/dsc-domain.test.ts` -- unit tests

## Tasks & Acceptance

**Execution:**
- [x] `domain/dsc.ts` -- the four functions + unit tests
- [x] `application/dsc.v2.ts` -- `assertSearchArea`
- [x] `sprint-status.yaml` -- `epic-6: in-progress`, 6.1 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 6.1 `done`, when `[DSC-3.Q1]`, `[DSC-3.QF1]`, `[DSC-3.QF2]` and `[DSC-3.I1]` run, then they pass, and the gate stays green.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/dsc_contracts.test.ts -t "DSC-3"` -- expected: 4 pass
- `npx tsc --noEmit` -- expected: clean

## Implementation Notes

- Code review is batched with the rest of Epic 6 at its close (decision #22).
- Martín approved the four Epic 6 specs together (decision log Impl-1 #31).
- `checkSearchArea` is exported from `dsc.v2.ts` so INV's availability port (Story 6.2) calls the same guard without a DSC dependency in its deps.
- `boundingBox` (domain) gives AD-DSC-1 rule 2's prefilter a 0.1 % margin; a unit test checks it contains the four radius points.
