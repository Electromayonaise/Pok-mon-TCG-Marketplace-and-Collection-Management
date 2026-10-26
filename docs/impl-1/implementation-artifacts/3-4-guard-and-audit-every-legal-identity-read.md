---
title: 'Story 3.4: Guard and audit every legal-identity read'
type: 'feature'
created: '2026-10-25'
status: 'ready-for-dev'
baseline_commit: '140bd6a1b6b03ae0a7a56b826bc4ec3b9c326ef8'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/docs/solu-2/planning/epics.md'
  - '{project-root}/docs/solu-2/planning/detailed-design/contracts.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `getApplicationForReview` and `listLegalIdentityAccess` throw `NotImplementedError`, so 7 bound tests are red. An admin cannot see a shop's NIT or documents, and nothing proves that every read of a legal identity, denials included, leaves a log row (NFR-VER-2). Story 3.4 is in `impl2_scope`, but `[VER-3.I2]` turns green once 3.5 is done, so it is pulled forward (decision #27).

**Approach:**
- An admin read runs in one transaction: it reads the legal identity through `legalIdentityRepository`, signs each document for 600 s and inserts a `granted` log row.
- A non-admin first commits a `denied` row and its audit row in their own transaction, then raises (AD-VER-2 rules 2–3).
- A lint rule confines the table to one file (AD-VER-2 rule 1; decision #25).
- An NFR-VER-3 benchmark proves the latency.
- Wire both procedures.

## Boundaries & Constraints

**Always:**
- The clock is read once.
- **Denial (P1):** the procedure uses the authed builder plus a check in the body.
  - A non-admin commits `"LegalIdentityAccessLog" {actorId, applicationId, fieldsRead: [], outcome: 'denied', procedure: 'verification.getApplicationForReview', createdAt: now}` and `audit('verification.legalIdentity.denied')` in a separate transaction.
  - Then it raises `LegalIdentityAccessDenied` (403), citing `FR-VER-5 {applicationId, outcome: 'denied'}`.
- **Unknown (P2):** an admin asking for an unknown id gets `ApplicationNotFound` (404), with zero writes. The read happens before the insert, in the same transaction.
- **Grant (Q1–Q3):**
  - `legalIdentityRepository.readForReview` returns the type, the number and the document keys.
  - Each key goes through `storage.sign('ver-documents', key, 600)`, with `expiresAt = now + 600 s`.
  - Insert one `granted` row with `fieldsRead ['type','number','documentKeys']`, and `audit('verification.legalIdentity.read')` holding the field names only.
- **NFR-VER-2 counter (AD-VER-2 rule 5):** `readForReview` is the only reader. `[VER-3.I1]` proves "rows = reads + denials" from the log itself. No runtime metric is added.
- **Audit list (S-FR-VER-5.audit):** admin only. Rows newest first, 50 per page, keyset `("createdAt", id)` in two statements (the Story 1.5 deferred item). `fieldsRead` holds names only.
- **Lint `tezg/legal-identity-confined`:** any string or template literal naming `BusinessApplicationLegalIdentity` outside `src/modules/identity/infra/legalIdentityRepository.ts` is an error. It catches what the `regulated-select` rule misses on `RETURNING` (the Story 1.4 deferred item). Add tests in `tools/lint/tezg-plugin.test.mjs` and enable it in the ESLint config. Migrations, the schema and the tests are outside its file glob.
- **Benchmark (NFR-VER-3):** `docs/solu-2/test/nfr/ver3_latency.test.ts` uses the shared harness of `ord1_latency.test.ts` and records the result in `nfr-evidence.md`.
  - The queue with 1,000 Pending: p95 ≤ 1,000 ms.
  - The signed URL issue: p95 ≤ 300 ms.
- Wire `verification.getApplicationForReview` (authed) and `verification.legalIdentityAudit` (admin), with HTTP cases.

**Ask First:** a runtime counter for NFR-VER-2; any DTO or bound-test change.

**Never:** a legal-identity value in an error, a log line or an audit row; a denial that rolls back with the error.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin read | Pending with a NIT | DTO with the NIT, signed URLs, one `granted` row | N/A |
| Non-admin | a user | one `denied` row survives | `LegalIdentityAccessDenied` 403 |
| Unknown id | admin | zero writes | `ApplicationNotFound` 404 |
| Counting | 2 reads + 1 denial | 3 log rows | N/A |
| Other reads | status, queue | no `legalIdentity` field | N/A |
| Expiry | read at `now` | `expiresAt = now + 600 000 ms` | N/A |
| Audit list | after a denial | `{outcome: 'denied', fieldsRead: []}` | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/identity/application/ver.v2.ts` -- `getApplicationForReview`, `listLegalIdentityAccess`
- `src/modules/identity/infra/legalIdentityRepository.ts` -- `readForReview`
- `src/modules/identity/infra/pg.ts` -- the access-log insert and list
- `tools/lint/tezg-plugin.mjs` + test, the ESLint config -- `legal-identity-confined`
- `docs/solu-2/test/nfr/ver3_latency.test.ts` (new), `nfr-evidence.md`
- `src/server/composition.ts` + `.test.ts` -- wiring
- the bound tests: 6 in `ver_contracts.test.ts`, plus `[S-FR-VER-5.audit.h]`

## Tasks & Acceptance

**Execution:**
- [ ] ports + infra -- `readForReview`, `insertAccessLog`, `listAccessLog` (two statements)
- [ ] `application/ver.v2.ts` -- both methods; a unit test that the denial survives the error
- [ ] lint rule, its tests and the config; `npm run lint` stays at 0
- [ ] the NFR-VER-3 benchmark and its evidence
- [ ] `composition.ts` + test -- the two procedures
- [ ] `sprint-status.yaml` -- 3.4 out of `impl2_scope` (decision #27)

**Acceptance Criteria:**
- Given the 7 bound tests, when they run, then they pass.
- Given the string `"BusinessApplicationLegalIdentity"` in `infra/pg.ts`, when lint runs, then `legal-identity-confined` reports it.
- Given Epic 3 fully `done`, when `npm run test:ci` runs, then every gate is green.

## Verification

**Commands:**
- `npm run lint` -- expected: 0 errors
- `npm run test:ci` -- expected: exit 0
- the benchmark command from `nfr-evidence.md` -- expected: both p95 values under their thresholds
