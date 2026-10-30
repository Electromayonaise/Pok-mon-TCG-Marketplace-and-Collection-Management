---
title: 'Story 12.1: Value a collection exactly'
type: 'feature'
created: '2026-10-30'
status: 'draft'
baseline_commit: '49b09cc'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `ValServiceV2.valueCollection` and the pure `valueEntries` throw `NotImplementedError`: Valentina cannot see what her collection is worth.

**Approach:** VAL-1 as written in contracts.md §11 and AD-VAL-1 rules 1–5, reading COL's entries (Epic 11) and the catalog's `getReferencePricesAsOf` (Story 4.4).

## Boundaries & Constraints

**Always:**
- One `REPEATABLE READ READ ONLY` transaction (Solu-1 GAP-2). P1 first: a plain read of `"Collection"` by `(id, ownerId)` (no `FOR SHARE`, which a read-only transaction refuses); a foreign or unknown id is `CollectionNotFound` citing `{ owned: false }` (COL's body), with no further read (Q-fail).
- Q1: the entries by `("manualPosition", id)`; the distinct catalog ids go to `catalog.getReferencePricesAsOf` in sequential chunks of 500, each with the same `asOf = clock.now()` (read once). The catalog reads on the ambient transaction, so every chunk sees the one snapshot.
- Q2 (pure, `domain/val.ts`): external → `ExternalEntryNotInCatalog`; no price → `NoReferencePrice`; else `cop × qty` in BigInt, counted in `staleCount` when stale. `conversionDriftBoundCop = ⌊Σ qty(fxDerived) / 2⌋`, reported, never applied. A total or bound above `Number.MAX_SAFE_INTEGER` is `Unexpected` (`assertSafeInteger`, review E-20).
- I2: `valueEntries` accepts only the branded `ReferencePriceInput`; a `@ts-expect-error` src test proves a listing `Cop` does not type-check (AD-VAL-1 rule 5, FR-VAL-5).
- Q3: zero writes, no audit. Q4: decision **D2** `CollectionValued` (stored-only §13 row, outcome `allowed`) citing `{ rule: 'FR-VAL-1', inputs: { valuedCount, notValuedCount, staleCount, conversionDriftBoundCop } }`.
- **D4 repository:** `ValRepository` gets `ownsCollectionForRead` and `readValuationEntries`, implemented by a new `PgValRepository` in `infra/pg.ts` and joined to the one repository (R-14).
- Wiring: `valuation.current`. **NFR-VAL-2 (D5):** `[NFR-VAL-2.current]` in a new `_bmad-output/test-artifacts/nfr/val2_latency.test.ts` (shared harness, the real catalog, the seed's 500-entry collection), p95 ≤ 1,500 ms, bound to 12.1 in `epics.source.mjs`/`epics.md`; `nfr-evidence.md` updated.

**Ask First:** any bound-test change; a contract or DTO shape change.

**Never:** a float or `Number` multiplication on COP; a listing price; a write.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mixed | 45,000 × 2, 9,999 × 1 (stale), unpriced, external | 99,999; valued 2; stale 1; 2 notValued | N/A |
| Big | 90 × 999 × 99,999,999 | exact BigInt | N/A |
| 600 cards | two chunks | both `asOf = now` | N/A |
| Empty | no entries | 0, valued 0 | N/A |
| Foreign | Julián | — | `CollectionNotFound` |

</frozen-after-approval>

## Code Map

- `src/modules/collections/{domain/val.ts,ports/val.v2.ts,infra/pg.ts,application/val.v2.ts}` + src tests
- `src/server/composition.ts`; `contracts.md` §13; `messages.generated.ts` (generated)
- `_bmad-output/test-artifacts/nfr/val2_latency.test.ts`, `nfr-evidence.md`, `epics.source.mjs`/`epics.md`

## Tasks & Acceptance

**Execution:**
- [ ] domain + repository + service + src tests; §13 row; wiring; benchmark + binding
- [ ] `sprint-status.yaml` -- 12.1 `done`

**Acceptance Criteria:**
- Given 12.1 `done`, when `[VAL-1.Q1]`, `[VAL-1.I1]`, `[VAL-1.I2]`, `[NFR-VAL-2.current]` run, then they pass; 12.3's `[VAL-1.MEC]` and 12.4's `[VAL-1.P1]` are early greens (D1).

## Verification

- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/val_contracts.test.ts -t "VAL-1"`
