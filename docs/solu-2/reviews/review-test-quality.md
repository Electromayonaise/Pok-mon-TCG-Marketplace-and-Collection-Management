---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-10-19'
workflowType: 'testarch-test-review'
inputDocuments:
  - .claude/skills/bmad-testarch-test-review/steps-c/criteria-registry.md
  - .claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md
  - .claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md
  - .claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md
  - docs/solu-2/test/test-design.md
  - docs/solu-2/planning/detailed-design/contracts.md
---

# Test Quality Review: Solu-2 test suite (`docs/solu-2/test/`)

**Quality Score**: 32/100 (F - Needs Improvement)
**Review Date**: 2026-10-19
**Review Scope**: directory
**Reviewer**: Murat (TEA) for Martín Gómez, test-lead (directions relayed by Mateo Rubio)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions (`docs/solu-2/test/traceability-matrix.md`).

## Executive Summary

**Overall Assessment**: Needs Improvement

**Recommendation**: Request Changes

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ The suite fails for the right reason. Of the 351 ATDD tests and 3 NFR benchmarks, every one fails on `NotImplementedError` after a Given step that succeeded (`gate:atdd-red:solu2`, `gate:nfr-red:solu2`). None passes vacuously and none breaks on a fixture.

✅ No test lacks an assertion (C4), and none asserts only on a fake it configured (C5). This was checked mechanically over all 366 `it()` bodies. Race tests assert the error codes of the losers first, so a `NotImplementedError` surfaces in the failure message.

✅ Determinism is built in: the virtual clock, readable fixed ids, the network guard and real Postgres connections. There are no hard waits and no wall-clock fixtures. The static fitness functions are each proven against a planted violation, so their green state is not vacuous.

### Key Weaknesses

❌ Five tests let control flow decide what is asserted (H3), for example `if (i === 0)` in `[REP-1.MEC]` and the ternaries that select an expected value in `[DSC-1.I4]` and `[MSG-2.MEC]`.

❌ Six ATDD files exceed 300 lines (H5): `inv` 398, `ord` 371, `com` 345, `trd` 310, `ver` 309, `col` 303.

❌ One module-level map is mutated inside a test (H4, `rep_contracts.test.ts`). Six files also rebuild four- to six-field request literals inline three or more times with no builder (M2).

### Summary

The suite proves what it must for the Phase 3 gate. Every contract clause, MEC and AD has a test, and every test is red for the right reason. The deductions are about how some tests are written. None is about what they prove.

- **The H3 findings are the urgent ones.** Each is a test that, once its story is implemented, could pass while the behaviour is broken: an empty capability list makes `[IDN-3.I3]` vacuous, and an unexpected listing id makes `[DSC-1.I4]` compare against the wrong point.
- **The H4 finding** is an order-dependence that would surface as soon as the REP file runs in a different order.
- **The H5 and M2 findings** are maintainability debt that grows with every story that edits these files.

All 24 findings are mechanical to fix, and none changes what a test proves. The computed recommendation is **Request Changes**. The triage decision is Martín's at the Phase 3 gate.

---

## Quality Criteria Assessment

| Criterion                            | Status         | Violations | Basis | Notes |
| ------------------------------------ | -------------- | ---------- | ----- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS        | 0  | Convention: `bddNaming` (13 of 13) | Every title states the behaviour and opens with its clause id, e.g. `[INV-1.I1] 50 buyers race for the last unit: exactly 1 reservation, 49 InsufficientQuantity, stock 0` |
| Test IDs                             | ✅ PASS (n/a)  | 0  | Convention: `testIds` (0 of 13) | No DOM; the repo uses no element test-id convention. Clause ids in titles are checked by `gate:ids:solu2` instead |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS (n/a)  | 0  | Convention: `priorityMarkers` (0 of 13) | The repo uses no priority marker in titles; priority lives in the risk register (`test-design.md` §2) |
| Disabled or Focused Tests            | ✅ PASS        | 0  | Absolute | No `.skip`, `.only`, `.todo`, `xit` or `fit` |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS        | 0  | Absolute | The single timer (`sys_contracts.test.ts:143`) is a deadlock watchdog raced against the call; it orders no step |
| Determinism (no conditionals)        | ❌ FAIL        | 5  | Absolute + Applicability | H3 ×5; H2 closed: no fixture uses the live clock (`performance.now` in the benchmark is a measurement) |
| Isolation (cleanup, no shared state) | ❌ FAIL        | 1  | Absolute | H4: `targets` mutated in `[REP-3.MEC]`; C5 none |
| Fixture Patterns                     | ⚠️ WARN        | 6  | Applicability: the files construct request payloads | M2 ×6 (shared with Data Factories, counted once) |
| Data Factories                       | ⚠️ WARN        | 6  | Applicability: the files construct request payloads; Convention `dataFactories` 13 of 13 | Row factories are used everywhere; request builders are missing in 6 files |
| Network-First Pattern                | ✅ PASS (n/a)  | 0  | Applicability: no file navigates | Backend suite; the network is closed by the guard |
| Explicit Assertions                  | ✅ PASS        | 0  | Absolute | C3, C4, M6 none; every `.rejects` is awaited |
| Test Length (≤300 lines)             | ❌ FAIL        | 6 files: 398, 371, 345, 310, 309, 303 | Absolute | H5 ×6 |
| Test Duration (≤1.5 min)             | ✅ PASS        | — | Absolute | H1 and M1 do not fire. The 100-repetition races are the long tests (see Recommendation R-14) |
| Flakiness Patterns                   | ❌ FAIL        | 6  | Absolute + Applicability | H3 ×5 and H4 ×1, counted above |

**Total Violations**: 0 Critical, 12 High, 6 Medium, 1 Low

**Convention Baseline**: 13 test files sampled outside the review set (`docs/solu-1/tests/`, all of them):

- `bddNaming`, `dataFactories`, `fixtures` and `assertionStyle` are established (13 of 13);
- `priorityMarkers`, `testIds` and `networkFirst` are absent (0 of 13).

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -12 × 5 = -60
Medium Violations:       -6 × 2 = -12
Low Violations:          -1 × 1 = -1

Bonus Points:
  Excellent BDD:         +5
  Comprehensive Fixtures: +0
  Data Factories:        +0
  Network-First:         +0
  Perfect Isolation:     +0
  All Test IDs:          +0
                         --------
Total Bonus:             +5

Final Score:             32/100
Grade:                   F
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### R-1. `[REP-1.MEC]` asserts the cited state only when `i === 0`

**Severity**: P1 (High)
**Location**: `docs/solu-2/test/atdd/rep_contracts.test.ts:79`
**Row**: H3
**Criterion**: Determinism (no conditionals)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**: the loop body chooses whether to assert. It works today, but it hides the one deep check of the MEC inside a conditional.

**Current Code**:

```typescript
// ⚠️ Could be improved (current implementation)
for (let i = 0; i < 100; i++) {
  const error = await caught(() => rep.writeReview({ … }));
  codes.add(codeOf(error));
  if (i === 0) {
    expect(codeOf(error)).toBe('NotVerifiedPurchaser');
    expect(citedInputs(error)).toMatchObject({ latestState: 'Paid' });
  }
}
```

**Recommended Improvement**:

```typescript
// ✅ Better approach (recommended)
const first = await caught(() => rep.writeReview(review(0)));
expect(codeOf(first)).toBe('NotVerifiedPurchaser');
expect(citedInputs(first)).toMatchObject({ latestState: 'Paid' });
const rest = [];
for (let i = 1; i < 100; i++) rest.push(codeOf(await caught(() => rep.writeReview(review(i)))));
expect(new Set(rest)).toEqual(new Set(['NotVerifiedPurchaser']));
```

**Benefits**: every repetition runs the same path, and the deep assertion is visible at top level.

**Priority**: HIGH row; the MEC is P0 (R-12).

### R-2. `[COM-3.Q4]` skips the explanation check when `decision` is absent

**Severity**: P1 (High) · **Location**: `docs/solu-2/test/atdd/com_contracts.test.ts:215` · **Row**: H3 · **Criterion**: Determinism

**Issue Description**: `if ('decision' in result) explainAssert(…)`. An implementation that returns no decision passes. Narrow the union with an assertion instead: `expect(result).toHaveProperty('decision')`, then `explainAssert((result as { decision: unknown }).decision, …)`.

### R-3. `[DSC-1.I4]` picks the expected point with a nested ternary

**Severity**: P1 (High) · **Location**: `docs/solu-2/test/atdd/dsc_contracts.test.ts:105` · **Row**: H3 · **Criterion**: Determinism

**Issue Description**: an unexpected listing id silently falls through to point 2. Build a `Map` from listing id to point, and assert `byId.get(r.listingId)` is defined before comparing.

### R-4. `[IDN-3.I3]` loops over a list that may be empty

**Severity**: P1 (High) · **Location**: `docs/solu-2/test/atdd/idn_contracts.test.ts:164` · **Row**: H3 · **Criterion**: Determinism

**Issue Description**: an empty `trace.capabilities` makes the test pass with zero assertions. Assert the six names first, as `[IDN-3.Q1]` does, then compare the whole list in one call: `expect(Object.fromEntries(trace.capabilities.map((l) => [l.name, l.value]))).toEqual(caps.capabilities)`.

### R-5. `[MSG-2.MEC]` selects the expected text with a ternary

**Severity**: P1 (High) · **Location**: `docs/solu-2/test/atdd/msg_contracts.test.ts:145` · **Row**: H3 · **Criterion**: Determinism

**Issue Description**: replace `prices` with a table of `[price, expected]` pairs: `[[1_000, '$1.000 COP'], [100_000_000, '$100.000.000 COP']]`.

### R-6. `[REP-3.MEC]` mutates the module-level `targets` map

**Severity**: P1 (High) · **Location**: `docs/solu-2/test/atdd/rep_contracts.test.ts:235` (declared at line 33) · **Row**: H4 · **Criterion**: Isolation

**Issue Description**: one hundred entries are added to a map that every later test reads. A test that relies on "unknown user → `none`" for one of those ids would change outcome with file order. Make `targets` a function that returns a fresh object, and give the MEC its own local map.

### R-7 to R-12. Six ATDD files exceed 300 lines

**Severity**: P1 (High) · **Row**: H5 · **Criterion**: Test Length

| # | File | Lines |
|---|---|---|
| R-7 | `inv_contracts.test.ts` | 398 |
| R-8 | `ord_contracts.test.ts` | 371 |
| R-9 | `com_contracts.test.ts` | 345 |
| R-10 | `trd_contracts.test.ts` | 310 |
| R-11 | `ver_contracts.test.ts` | 309 |
| R-12 | `col_contracts.test.ts` | 303 |

**Recommended Improvement**: keep `<module>_contracts.test.ts` for the core operations, which is the path the statement names. Move the §15 supporting contracts and the §15.12 read models into `<module>_supporting.test.ts`. Each core file then drops to about 200 lines. The test ids are unchanged, so `gate:ids:solu2` and the matrix need no edit.

### R-13. Six files rebuild four- to six-field request literals inline

**Severity**: P2 (Medium) · **Row**: M2 · **Criterion**: Data Factories / Fixture Patterns

| File:line (first of n) | Shape |
|---|---|
| `col_contracts.test.ts:145` (8) | `addEntry` (6 fields) |
| `msg_contracts.test.ts:52` (9) | `sendMessage` (4) |
| `trd_contracts.test.ts:135` (7) | `counterOffer` (4) |
| `rep_contracts.test.ts:41` (8) | `writeReview` (4) |
| `com_contracts.test.ts:267` (3) | `requestTopUp` (4) |
| `dsc_contracts.test.ts:83` (5) | `search` (an identical 4-field literal) |

**Recommended Improvement**: write one local builder per shape, with overrides, the way `createInput()` (INV) and `hide()` (REP) already do. For example, `review({ targetUserId: id('julian') })`.

### R-14. Unexplained spread constants in `[VAL-1.MEC]`

**Severity**: P3 (Low) · **Location**: `docs/solu-2/test/atdd/val_contracts.test.ts:91` · **Row**: L6

**Issue Description**: `1_000 + ((i * 7_919) % 250_000)` has no comment. Name it: `// deterministic spread over 1,000–250,999 COP (7,919 is prime, so no period below 250,000)`.

### Observations with no registry row (no severity, no deduction)

- **Uncleared watchdog.** `[SYS-4.R9]` races the call against a `setTimeout` that is never cleared, which keeps a 3 s timer alive after the test. Clear it in `finally`.
- **Duration of the race proofs.** About 12 tests repeat a race 100 times with `TRUNCATE` between repetitions, for example `[TRD-1.MEC]`, `[COM-1.MEC]` and `[REP-3.MEC]`. They are fast while red. Once implemented they are the candidates to exceed 1.5 min, so each MEC story's DoD should record its runtime and keep the 60 s timeout honest.
- **Benchmark output.** `[NFR-ORD-2.p95]` writes its percentiles to `.vitest-results/nfr-ord-2.json`. When the story is done, CI should upload that file, which the current `.vitest-results/` artifact step already does.

---

## Best Practices Found

### 1. Losers' codes asserted first in every race

**Location**: e.g. `docs/solu-2/test/atdd/rep_contracts.test.ts` `[REP-1.I2]`, `trd_contracts.test.ts:120`
**Pattern**: explicit failure localisation

`expect(outcome.rejected.map(codeOf).filter((c) => c !== 'DuplicateReview')).toEqual([])` prints the unexpected codes, including `NotImplementedError`, before any count is compared. A red race test therefore names its real cause.

### 2. Planted-violation probes for every static check

**Location**: `docs/solu-2/test/fitness/sys_fitness.test.ts` (`[SYS-AD1.probe]`, `[SYS-AD8.probe]`, `[SYS-6.R1.probe]`)

Each scanner is shown to catch a violation before it is trusted to report none. The probes already caught two real defects during Phase 3: the `trading → catalog` edge and the `role` input key.

### 3. Real composition in the NFR benchmark

**Location**: `docs/solu-2/test/nfr/ord1_latency.test.ts`

The latency proof binds `OrdServiceV2` to the actual `listings` and `identity` application services, as the composition root will. It measures the path users take, not a fake.

---

## Test File Analysis

### File Metadata

- **File Path**: `docs/solu-2/test/` (18 files: 13 ATDD, 1 fitness, 1 fixture proof, 3 NFR)
- **File Size**: 4,028 lines in total
- **Test Framework**: Vitest 5 on Node 22, PostgreSQL 16.6
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 76
- **Test Cases (it/test)**: 366 bodies carrying 370 ids (some titles cite two clause ids)
- **Average Test Length**: about 10 lines per test
- **Fixtures Used**: 5 (`fake_clock`, `db`, `seed_marketplace`, `sim_events`, `explain_assert`); see `docs/solu-2/test/fixtures/README.md`
- **Data Factories Used**: 23: the 22 Given-step factories of `test-support/solu2/fixtures.ts` plus `seedMarketplace` (`user`, `business`, `individualSeller`, `catalogEntry`, `listing`, `unit`, `order`, `tradeOffer`, `collection`, `entry`, `review`, `seedMarketplace`, …)

### Test Scope

- **Test IDs**: clause ids per `contracts.md` (189 cited, all defined: `gate:ids:solu2`)
- **Priority Distribution**: by risk, not by marker. 15 P0 risks and 5 P1 risks map to tests in `test-design.md` §2; the remaining tests are unknown by marker.

### Assertions Analysis

- **Total Assertions**: 731 lines with `expect`, plus `explainAssert` (each `explainAssert` is 4–8 checks)
- **Assertions per Test**: about 2.0 `expect` lines (avg)
- **Assertion Types**: `toBe`, `toEqual`, `toMatchObject`, `toHaveLength`, `rejects.toThrow`, and `explainAssert` for decisions

---

## Context and Integration

### What the Context Said

`test-design.md` makes the 12 MECs and three cross-cutting risks P0. Four of the findings sit in P0 tests:

- R-1: `[REP-1.MEC]`;
- R-5: `[MSG-2.MEC]`;
- R-6: `[REP-3.MEC]`;
- R-3: `[DSC-1.I4]`, which is part of R-04's boundary proof.

That raises their urgency; it does not change their severity. `contracts.md` §0 says that every test "turns red if its clause is removed". The H3 findings are exactly the cases where that promise could break after implementation, which is why they are recommended first.

### Related Artifacts

- **Test Design**: [test-design.md](../test/test-design.md)
- **Risk Assessment**: 15 P0, 5 P1 (20 risks)
- **Priority Framework**: P0–P2 applied in the register

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **test-quality.md** — Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **data-factories.md** — Factory functions with overrides
- **test-levels-framework.md** — level appropriateness (integration first for races)
- **criteria-registry.md** — row identities and pinned severities

For coverage mapping, consult `docs/solu-2/test/traceability-matrix.md`.

---

## Next Steps

### Immediate Actions (Before the Phase 3 gate closes)

1. **Fix the five H3 findings and the H4 finding (R-1 to R-6).** Rewrite the conditional assertions and isolate `targets`.
   - Priority: P1
   - Owner: Martín (test-lead)
   - Estimated Effort: 30 min

2. **Split the six oversize files (R-7 to R-12)** into `<module>_contracts` and `<module>_supporting`.
   - Priority: P1
   - Owner: Martín
   - Estimated Effort: 45 min

3. **Add the six request builders (R-13)** and name the VAL spread constant (R-14).
   - Priority: P2
   - Owner: Martín
   - Estimated Effort: 30 min

### Follow-up Actions (Phase 4 / story DoD)

1. **Record the race-test runtimes** in each MEC story's DoD, and clear the watchdog timer in `[SYS-4.R9]`.
   - Priority: P3
   - Target: Epic 1 and each module's MEC story

### Re-Review Needed?

⚠️ Re-review after the fixes. Request changes, then re-review.

---

## Decision

**Recommendation**: Request Changes

**Rationale**: there are no critical findings, so nothing here is a test that cannot fail. But twelve HIGH rows fired:

- **H3 and H4 (six findings):** these would let a test pass with broken behaviour after implementation, or make a result depend on order.
- **H5 (six files):** these make the files harder to change story by story.

The computed rule is "any HIGH → Request Changes". The fixes are mechanical and preserve every test id, so the traceability matrix and the red check are unaffected.

> Test quality needs improvement with 32/100 score. The 12 HIGH findings should be fixed before the Phase 4 stories start editing these files. 0 critical violations were detected; 6 of the HIGH findings pose flakiness or false-pass risks, and 6 are maintainability risks.

---

## Appendix

### Violation Summary by Location

| Location | Severity | Criterion | Issue | Fix |
| --- | --- | --- | --- | --- |
| `col_contracts.test.ts` (file) | P1 | H5 Test Length | 303 lines | Split supporting contracts |
| `col_contracts.test.ts:145` | P2 | M2 | `addEntry` literal ×8 | Builder |
| `com_contracts.test.ts` (file) | P1 | H5 | 345 lines | Split |
| `com_contracts.test.ts:215` | P1 | H3 | `if ('decision' in result)` | Assert, then narrow |
| `com_contracts.test.ts:267` | P2 | M2 | `requestTopUp` literal ×3 | Builder |
| `dsc_contracts.test.ts:83` | P2 | M2 | identical `search` literal ×5 | Builder or constant |
| `dsc_contracts.test.ts:105` | P1 | H3 | ternary picks expected point | Map by id |
| `idn_contracts.test.ts:164` | P1 | H3 | loop may assert nothing | One `toEqual` over the whole map |
| `inv_contracts.test.ts` (file) | P1 | H5 | 398 lines | Split |
| `msg_contracts.test.ts:52` | P2 | M2 | `sendMessage` literal ×9 | Builder |
| `msg_contracts.test.ts:145` | P1 | H3 | ternary selects expected text | Table of pairs |
| `ord_contracts.test.ts` (file) | P1 | H5 | 371 lines | Split |
| `rep_contracts.test.ts:41` | P2 | M2 | `writeReview` literal ×8 | Builder |
| `rep_contracts.test.ts:79` | P1 | H3 | `if (i === 0)` | Assert the first call outside the loop |
| `rep_contracts.test.ts:235` | P1 | H4 | module-level `targets` mutated | Fresh map per test |
| `trd_contracts.test.ts` (file) | P1 | H5 | 310 lines | Split |
| `trd_contracts.test.ts:135` | P2 | M2 | `counterOffer` literal ×7 | Builder |
| `val_contracts.test.ts:91` | P3 | L6 | unexplained `7_919`, `250_000` | Comment |
| `ver_contracts.test.ts` (file) | P1 | H5 | 309 lines | Split |

### Quality Trends

| Review Date | Score | Grade | Critical Issues | Trend |
| --- | --- | --- | --- | --- |
| 2026-10-19 | 32/100 | F | 0 | First Solu-2 review (Solu-1's ATDD review: `docs/solu-1/reviews/review-atdd-test-quality.md`) |

### Related Reviews

The suite score above is the only ledger. Per-file numbers apply the same arithmetic to each file alone, for orientation only.

| File | Score | Grade | Critical | Status |
| --- | --- | --- | --- | --- |
| `atdd/cat_contracts.test.ts` | 100/100 | A | 0 | Approved |
| `atdd/col_contracts.test.ts` | 98/100 | A | 0 | Request Changes (H5) |
| `atdd/com_contracts.test.ts` | 93/100 | A | 0 | Request Changes (H5, H3) |
| `atdd/dsc_contracts.test.ts` | 98/100 | A | 0 | Request Changes (H3) |
| `atdd/idn_contracts.test.ts` | 100/100 | A | 0 | Request Changes (H3) |
| `atdd/inv_contracts.test.ts` | 100/100 | A | 0 | Request Changes (H5) |
| `atdd/msg_contracts.test.ts` | 98/100 | A | 0 | Request Changes (H3) |
| `atdd/ord_contracts.test.ts` | 100/100 | A | 0 | Request Changes (H5) |
| `atdd/rep_contracts.test.ts` | 93/100 | A | 0 | Request Changes (H3, H4) |
| `atdd/sys_contracts.test.ts` | 100/100 | A | 0 | Approved |
| `atdd/trd_contracts.test.ts` | 98/100 | A | 0 | Request Changes (H5) |
| `atdd/val_contracts.test.ts` | 100/100 | A | 0 | Approve with Comments (L6) |
| `atdd/ver_contracts.test.ts` | 100/100 | A | 0 | Request Changes (H5) |
| `fitness/sys_fitness.test.ts` | 100/100 | A | 0 | Approved |
| `fixtures/seed_marketplace.test.ts` | 100/100 | A | 0 | Approved |
| `nfr/canary_scan.test.ts` | 100/100 | A | 0 | Approved |
| `nfr/ord1_latency.test.ts` | 100/100 | A | 0 | Approved |
| `nfr/outbox_crash_sweep.test.ts` | 100/100 | A | 0 | Approved |

**Suite Average**: per-file scores are capped at 100 with the BDD bonus, which is why they average far above the suite ledger. The suite score is 32/100 (F).

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-solu2-suite-20261019
**Timestamp**: 2026-10-19
**Version**: 1.0

---

## Feedback on This Review

This review applies the rubric consistently. Context can reveal additional findings and clarify impact; it cannot waive a violation, change severity, or alter the score. Formal risk acceptance belongs in trace or the release gate.

---

## Reviewed Files

- docs/solu-2/test/atdd/cat_contracts.test.ts
- docs/solu-2/test/atdd/col_contracts.test.ts
- docs/solu-2/test/atdd/com_contracts.test.ts
- docs/solu-2/test/atdd/dsc_contracts.test.ts
- docs/solu-2/test/atdd/idn_contracts.test.ts
- docs/solu-2/test/atdd/inv_contracts.test.ts
- docs/solu-2/test/atdd/msg_contracts.test.ts
- docs/solu-2/test/atdd/ord_contracts.test.ts
- docs/solu-2/test/atdd/rep_contracts.test.ts
- docs/solu-2/test/atdd/sys_contracts.test.ts
- docs/solu-2/test/atdd/trd_contracts.test.ts
- docs/solu-2/test/atdd/val_contracts.test.ts
- docs/solu-2/test/atdd/ver_contracts.test.ts
- docs/solu-2/test/fitness/sys_fitness.test.ts
- docs/solu-2/test/fixtures/seed_marketplace.test.ts
- docs/solu-2/test/nfr/canary_scan.test.ts
- docs/solu-2/test/nfr/ord1_latency.test.ts
- docs/solu-2/test/nfr/outbox_crash_sweep.test.ts

## Review Context

- docs/solu-2/test/test-design.md
- docs/solu-2/planning/detailed-design/contracts.md
- test-support/solu2/fixtures.ts
- test-support/solu2/seed-marketplace.ts
- test-support/solu2/fitness.ts
- test-support/simulated/index.ts

## Triage (Phase 3 gate)

*Filled from Martín's decisions at the Phase 3 gate (decision log Solu-2 #11).*

| Finding | Decision | Outcome |
|---|---|---|
| R-1 to R-6 (H3 ×5, H4) | pending | — |
| R-7 to R-12 (H5 ×6) | pending | — |
| R-13 (M2 ×6) | pending | — |
| R-14 (L6) | pending | — |
