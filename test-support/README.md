# test-support — the TEZG red-phase harness

Shared fixtures for the Solu packages. A test proves a contract against **real PostgreSQL 16**, because several invariants depend on row-level concurrency semantics that no in-memory store reproduces (Plan-2 task statement §2). Time, ids and randomness are fully controlled.

## Setup

```bash
npm ci
npm run db:up        # docker compose: postgres:16.6 on 127.0.0.1:55432 (tmpfs, throwaway)
```

Connection settings come from `TEZG_PG_*` (see `.env.example`). The defaults match `docker-compose.yml`.

## Running

| Command | What it proves | Expected today |
|---|---|---|
| `npm run test:schema:solu1` | The migrations physically enforce the invariants (GREEN) | all pass |
| `npm run test:atdd:solu1` | The contract scaffolds (RED) | all fail with `NotImplementedError` |
| `npm run gate:atdd-red:solu1` | Every ATDD test fails, and fails *for the right reason* | exit 0 |
| `npm run gate:solu1` | typecheck + GREEN + RED check + code citations | exit 0 |

## Architecture

| Fixture | File | Purpose |
|---|---|---|
| `db` | `db.ts`, `global-setup.ts` | Global setup migrates one template database per project (re-built only when a migration file changes). Each test file clones it (`CREATE DATABASE … TEMPLATE`), `TRUNCATE`s before every test, and drops it after the file |
| `fake_clock` | `clock.ts` | `VirtualClock`, seeded at `2026-10-01T15:00:00Z` (ARCH §4), advanced explicitly; never sleeps |
| ids | `ids.ts` | `SequentialIds` (cuid2-shaped, counter-based) and `id('name')` (readable, injective fixture ids) |
| `seed_marketplace` | `seed.ts` | Data factories for every table the contracts touch. Each satisfies every constraint and asserts nothing |
| outbox | `outbox.ts` | Test binding of the `Outbox` port: writes `OutboxEvent` and its `EventDelivery` rows inside the caller's transaction |
| concurrency | `concurrency.ts` | `race(n, fn)`: N calls released by one barrier, every outcome kept |
| errors | `errors.ts` | `caught`, `httpOf`, `citedInputs`: extraction only; every `expect` stays in the test body |
| wiring | `wiring.ts` | Fresh clock, ids and outbox per test |

## Best practices (from the TEA knowledge base)

- **Deterministic:** no `Date.now()`, no `Math.random`. fast-check properties use a fixed `seed` (`test-quality.md` example 1).
- **Isolated:** a clean database per test; fake maps reset in `beforeEach` (`test-quality.md` example 2).
- **Explicit:** assertions live in the test, never in a helper (`test-quality.md` example 3).
- **Red for the right reason:** a refusal test reads the code first (`codeOf(error)`), so an unimplemented stub fails with `expected 'NotImplementedError' to be '<Code>'`. A race test asserts the losers' codes first. `scripts/check-atdd-red.mjs` rejects any test that passes or fails for another reason.
- **No assertions on the test double:** assert what the system under test decided (event type, payload, rows), not what a fake produced (review T-05).

## CI integration

`.github/workflows/solu1-quality-gate.yml`: a Postgres 16 service, then typecheck → GREEN (with JUnit) → RED check → code citations, and a 10× burn-in of the GREEN suite. Reports are uploaded as artifacts.

## Knowledge-base references

`.claude/skills/bmad-testarch-atdd/resources/knowledge/`: `test-quality.md`, `data-factories.md`, `fixture-architecture.md`, `test-levels-framework.md`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `connect ECONNREFUSED 127.0.0.1:55432` | Database not running | `npm run db:up` |
| `source database "tezg_tpl_solu1" is being accessed by other users` | A crashed run left a connection to the template | `npm run db:down && npm run db:up` |
| `Migration NNN failed: …` in global setup | A migration's SQL is invalid | Run the file with `psql -v ON_ERROR_STOP=1` (see `docs/solu-1/planning/schemas/README.md`) |
| A RED test reported "failed for another reason" | A Given step or a fixture broke, so the test never reached the stub | Read the first line the checker prints. Typical causes are fixture id collisions or a violated constraint in a factory |
