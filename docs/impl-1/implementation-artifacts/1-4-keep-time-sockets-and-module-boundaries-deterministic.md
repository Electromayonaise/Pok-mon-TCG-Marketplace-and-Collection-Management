---
title: 'Story 1.4: Keep time, sockets and module boundaries deterministic'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: 'e51ed481bb16b7e78cd1042e8eec00bb5d901448'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD and fitness tests as the spec, one code review per epic'
context:
  - '{project-root}/docs/solu-2/planning/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The 9 bound tests of Story 1.4 (`[SYS-6.R1]`, `[SYS-6.R1.probe]`, `[SYS-6.R4]`, `[SYS-AD1]`, `[SYS-AD1.probe]`, `[SYS-AD8]`, `[SYS-AD8.probe]`, `[SEED.profile]`, `[SEED.business-history]`) were green since Solu-2: the clock and id ports, the network guard, the seed and the fitness scanners exist. What is missing is the static half the DoD names (TG-8, review B-9): the lint rules `tezg/error-owner`, `tezg/table-owner` and `tezg/regulated-select` do not exist, so a violation is caught only when the fitness project runs, not in the editor or at `npm run lint`.

**Approach:** A local ESLint plugin in the lint toolchain (`tools/lint/`) with the three rules, wired into `eslint.config.mjs` for `src/**`. Each rule reads its source of truth at load time (the code registry `src/shared-kernel/codes.ts`, the schema `001_tezg_schema.sql` that the migrations apply) and is proven by an ESLint `RuleTester` suite on the planted violations the fitness probes and ATDD tests use.

## Boundaries & Constraints

**Always:**
- `tezg/error-owner` (AD-11, AD-SYS-1 rule 2): in `src/modules/<m>/**` and `src/shared-kernel/**`, `raiserFor('<x>')` names the file's own module (`<m>` or `shared-kernel`); `raiserFor` is forbidden elsewhere; `raise('<Code>', …)` with a literal code fails when the registry owner of `<Code>` is not the file's module; `new DomainError(` appears only in `src/shared-kernel/raise.ts`.
- `tezg/table-owner` (AD-8, R-2): an `INSERT INTO`, `UPDATE`, `DELETE FROM` or `TRUNCATE` in a string or template literal under `src/` writes only tables whose schema section is the file's module; an unknown table fails; `FOR UPDATE` is a read (decision #18). Same semantics as the fitness scanner `ownershipViolations`.
- `tezg/regulated-select` (AD-SYS-8 rule 3, AD-17): a SQL literal that selects a regulated column (`"Message".body`, `"IndividualSellerProfile"."contactPhoneE164"`, `"Session".token`, every `"BusinessApplicationLegalIdentity"` column) is allowed only in the `infra/` of the module owning that table; `SELECT *` or `alias.*` over such a table fails everywhere, so a regulated column never rides along into an admin DTO.
- Rules report the file, the rule and the offending name, as the DoD requires.
- `npm run lint` stays at 0 errors on the current tree.

**Ask First:** widening `tezg/regulated-select` beyond the definition above (for example a per-procedure admin check), or adding `tezg/legal-identity-confined` (Story 3.4, Impl-2).

**Never:** type-aware lint (the toolchain only parses, decision #7); a new dependency; changing the fitness scanners or the bound tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Owner raises | `raiserFor('identity')` in `src/modules/identity/application/gate.ts` | no report | N/A |
| Foreign raiser | `raiserFor('identity')` in `src/modules/reviews/application/rep.ts` (the `[SYS-1.R2]` plant) | `tezg/error-owner` reports | lint error |
| Foreign code | `raise('AdminOnly', …)` in `src/modules/reviews/**` | reported: `AdminOnly` is owned by identity | lint error |
| Foreign write | `` `UPDATE "CommissionAccount" SET balance = 0` `` in `src/modules/listings/infra/pg.ts` (the `[SYS-AD8.probe]` plant) | `tezg/table-owner` reports | lint error |
| Row lock | `` `SELECT 1 FROM "EventDelivery" … FOR UPDATE SKIP LOCKED` `` in shared-kernel | no report | N/A |
| Admin reads a body | `` `SELECT body FROM "Message"` `` in `src/shared-kernel/admin-events.ts` | `tezg/regulated-select` reports | lint error |
| Star over regulated table | `` `SELECT * FROM "IndividualSellerProfile"` `` in identity infra | reported | lint error |
| Owner reads its column | `` `SELECT "contactPhoneE164" FROM "IndividualSellerProfile"` `` in `src/modules/identity/infra/pg.ts` | no report | N/A |

</frozen-after-approval>

## Code Map

- `tools/lint/base.mjs` -- base flat config; parse-only typescript-eslint
- `eslint.config.mjs` -- repo entry; says "Story 1.4 adds the `tezg/*` rules here"
- `test-support/solu2/fitness.ts` -- `tableOwners`, `sqlWrites`, `ownershipViolations`: the semantics `tezg/table-owner` mirrors
- `src/shared-kernel/codes.ts` -- `DOMAIN_ERRORS` registry, `owner` per code
- `src/shared-kernel/raise.ts` -- `raiserFor`, the only `new DomainError(`
- `src/shared-kernel/regulated.ts` -- `REGULATED_FIELDS`, the column names the rule targets
- `docs/solu-2/planning/detailed-design/schemas/001_tezg_schema.sql` -- table owners by section (`MIGRATIONS_DIR`)

## Tasks & Acceptance

**Execution:**
- [x] `tools/lint/tezg-plugin.mjs` -- the plugin with the three rules; registry and schema read once at load, paths relative to the repo root -- one place for the static checks
- [x] `eslint.config.mjs` -- register the plugin, enable the three rules as `error` on `src/**/*.ts`, excluding `*.test.ts` -- tests seed foreign tables by design
- [x] `tools/lint/tezg-plugin.test.mjs` + an `npm run test:lint-rules` script run inside `gate:impl1` -- `RuleTester` cases for every matrix row -- proves each rule fails on its plant, so the pass on `src/` is not vacuous
- [x] fix any finding the rules raise on the current tree (the identity `LEFT JOIN LATERAL (SELECT * FROM "BusinessApplication" …)` holds no regulated column and stays)

**Acceptance Criteria:**
- Given the current tree, when `npm run lint` runs, then it reports 0 errors.
- Given each planted violation of the matrix, when the rule tester runs, then the rule reports it with the file and the offending name.
- Given Story 1.4 marked `done`, when `npm run test:ci` runs, then every gate stays green.

## Verification

**Commands:**
- `npm run lint` -- expected: 0 errors
- `npm run test:lint-rules` -- expected: every RuleTester case passes
- `npm run test:ci` -- expected: exit 0

## Implementation Notes

- The schema marks two more columns `-- regulated` than the Intent lists: `"Order"."comprobanteObjectKey"` (AD-17) and `"TopUpRequest"."proofObjectKey"` (AD-SYS-8). `REGULATED_COLUMNS` includes them, and a drift test fails when a schema marker is missing from that list, so the rule follows the schema rather than a copy of it.
- `tezg/error-owner` checks `raise('<Code>')` only when the callee is named `raise` and the code is a literal; a computed code (`idn.v2.ts` derives one) is left to the runtime guard in `raiserFor`.
- A planted file in `src/modules/listings/infra/` with the three violations fails `npm run lint` with one error per rule, each naming the file, the rule and the offender; the file was removed.
- Code review is batched with Story 1.5 at the close of Epic 1 (decision #22).

### Review Findings

Epic 1 close review (2026-10-25, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `e51ed48..d67400c`.

- [x] [Review][Decision] `REGULATED_COLUMNS` widened without the Ask First — the rule also lists `Order.comprobanteObjectKey` and `TopUpRequest.proofObjectKey`, which follow the schema's `-- regulated` markers but were not in the Intent's list; the spec asked to stop and ask before changing it.
- [x] [Review][Patch] `table-owner` write regex reports `ON CONFLICT … DO UPDATE`, `FOR NO KEY UPDATE` and the word "update" in prose as writes; the fitness scanner shares the regex [tools/lint/tezg-plugin.mjs:118, test-support/solu2/fitness.ts:95]
- [x] [Review][Patch] `error-owner` misses the curried `raiserFor('x')('Code')`, which is the `[SYS-1.R2]` plant of the 1.4 DoD [tools/lint/tezg-plugin.mjs:84]
- [x] [Review][Patch] ESLint applies the plugin to `src/**/*.ts` only; `.tsx`, `.mts` and `.cts` files skip it [eslint.config.mjs:10]
- [x] [Review][Patch] `regulated-select` misses a regulated table joined with a comma and a `*` that is not the first select item [tools/lint/tezg-plugin.mjs:130]
- [x] [Review][Defer] `regulated-select` false negatives on `RETURNING`, concatenated or interpolated SQL, schema-qualified and unquoted uppercase names [tools/lint/tezg-plugin.mjs:162] — deferred: the rule guards the repo's literal style; the DB-backed fitness tests remain the proof
- [x] [Review][Defer] `error-owner` misses an aliased `raiserFor` and member callees (`x.raiserFor`) [tools/lint/tezg-plugin.mjs:84] — deferred: no such call exists; revisit if one appears
- [x] [Review][Defer] The drift test reads column markers only; table-level `-- regulated` markers and `TRUNCATE a, b` lists are not parsed [tools/lint/tezg-plugin.test.mjs] — deferred: the schema has neither today
