---
title: 'Story 3.4: Guard and audit every legal-identity read'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: '140bd6a1b6b03ae0a7a56b826bc4ec3b9c326ef8'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
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
- **Benchmark (NFR-VER-3):** `_bmad-output/test-artifacts/nfr/ver3_latency.test.ts` uses the shared harness of `ord1_latency.test.ts` and records the result in `nfr-evidence.md`.
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
- `_bmad-output/test-artifacts/nfr/ver3_latency.test.ts` (new), `nfr-evidence.md`
- `src/server/composition.ts` + `.test.ts` -- wiring
- the bound tests: 6 in `ver_contracts.test.ts`, plus `[S-FR-VER-5.audit.h]`

## Tasks & Acceptance

**Execution:**
- [x] ports + infra -- `readForReview`, `insertAccessLog`, `listAccessLog` (two statements)
- [x] `application/ver.v2.ts` -- both methods; a unit test that the denial survives the error
- [x] lint rule, its tests and the config; `npm run lint` stays at 0
- [x] the NFR-VER-3 benchmark and its evidence
- [x] `composition.ts` + test -- the two procedures
- [x] `sprint-status.yaml` -- 3.4 out of `impl2_scope` (decision #27)

**Acceptance Criteria:**
- Given the 7 bound tests, when they run, then they pass.
- Given the string `"BusinessApplicationLegalIdentity"` in `infra/pg.ts`, when lint runs, then `legal-identity-confined` reports it.
- Given Epic 3 fully `done`, when `npm run test:ci` runs, then every gate is green.

## Verification

**Commands:**
- `npm run lint` -- expected: 0 errors
- `npm run test:ci` -- expected: exit 0
- the benchmark command from `nfr-evidence.md` -- expected: both p95 values under their thresholds

## Implementation Notes

- Code review is batched with the rest of Epic 3 at its close (decision #22).
- The 7 bound tests pass. `gate:atdd-red:impl1`: 74 green for done stories, 278 red for the right reason, 0 not as expected. `npm run test:ci` exits 0.
- **One reader:** `readForReview` lives in `legalIdentityRepository.ts`, next to `insertLegalIdentity`. `PgVerRepository` implements the rest of `VerRepository`, minus those two methods. The access-log insert stays in `pg.ts`; it names `"LegalIdentityAccessLog"`, which the lint rule allows.
- **Denial for an unknown id:** a non-admin asking for an id that does not exist still gets `LegalIdentityAccessDenied`, so the answer does not reveal whether an application exists. Its audit row is written. Its log row is not, because `"LegalIdentityAccessLog".applicationId` is a foreign key. The insert is an `INSERT … SELECT` over `"BusinessApplication"` and returns whether it wrote a row, so an unknown id writes nothing instead of failing on the FK.
- **Expiry:** `expiresAt` comes from the service's single clock read plus 600 s, not from the storage adapter. Stored keys are bucket-qualified (`ver-documents/<key>`), and the prefix is stripped before `sign('ver-documents', key, 600)`.
- **Audit data:** `AuditEntry.data` takes scalars only, so `fieldsRead` is joined (`'type,number,documentKeys'`). The log row keeps the array.
- **Audit list:** 51 rows are fetched to tell whether a next page exists. The cursor codec is shared with the queue under a list tag (`'queue'`, `'legal-access'`), so each list refuses the other's cursor with `RequestValidationFailed` on `cursor`. The WHERE clause is built from the optional filter and the optional keyset, never with `OR $1 IS NULL`.
- **Lint:** `tezg/legal-identity-confined` reports any string or template literal matching `\bBusinessApplicationLegalIdentity\b` outside `legalIdentityRepository.ts`. That covers the Story 1.4 `RETURNING` gap for this table; `deferred-work.md` says so.
- **Benchmark:** `ver3_latency.test.ts` tops the §3 seed up to 1,000 Pending applications, each with a legal identity. Measured on local Docker Postgres 16: queue p95 4.9 ms (≤ 1,000), signed-URL read p95 10.0 ms (≤ 300). The signed-URL figure times the whole `getApplicationForReview` call, so it bounds the URL issue from above.
- **Binding the benchmark:** `gate:nfr-red:impl1` only accepts a green NFR test that a done story binds, and every test id must be bound by exactly one story. So `[NFR-VER-3.queue]` and `[NFR-VER-3.sign]` joined Story 3.4's tests in `epics.source.mjs`, the same way Story 7.1 binds `[NFR-ORD-2.p95]`. `epics.md` was regenerated: the story now binds 9 tests, and its DoD no longer carries the "add its benchmark" line. `nfr-evidence.md` gained a **Green — benchmark** status and a *Measured* table.
- **Wiring:** `verification.getApplicationForReview` uses the authed builder, so a non-admin's attempt reaches the service and is logged. `verification.legalIdentityAudit` is admin. `composition.test.ts` adds two HTTP cases.
- **Unit tests:**
  - `ver.v2.test.ts`: the denial survives its error with no regulated value; a non-admin with an unknown id; the grant signs both documents and audits field names only; audit paging (50 + 1), the filter, `AdminOnly` and a refused queue cursor.
  - `ver-domain.test.ts`: the access-log cursor round trip, and each list refusing the other's cursor.
