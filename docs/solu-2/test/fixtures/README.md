# Solu-2 fixtures (task statement §6, step 3.2)

The five fixtures the statement names are in the table below, with what each guarantees and where it lives. Everything is deterministic:

- time comes from a virtual clock;
- ids are readable names or counters;
- no value is random;
- the only reachable socket is the test Postgres.

| Fixture | File | What it is | Guarantee |
|---|---|---|---|
| `fake_clock` | `test-support/clock.ts` (`VirtualClock`), handed out by `wiring(db).clock` | The `Clock` port, seeded at `2026-10-01T15:00:00Z` (10:00 Bogotá). `now()`, `iso()`, `advance(ms)`, `set(ms)` | No code under test reads the system clock (`[SYS-6.R1]`). Every expiry, cooldown, freshness window and `occurredAt` is driven by `advance` |
| `db` | `test-support/db.ts` (`useTestDatabase`) | One Postgres 16.6 database per test file, cloned from a template migrated once per run from `schemas/001_tezg_schema.sql`. Seed rows are restored before each test. 60 pooled connections; `PgTransactionRunner` binds the `TransactionRunner` port | Every test starts from the same rows. Races use real connections (NFR-SYS-10). A pool of 1 is available for the ambient-transaction proof (`[SYS-4.R9]`) |
| `seed_marketplace` | `test-support/solu2/seed-marketplace.ts` (`seedMarketplace`), plus the Given-step factories in `test-support/solu2/fixtures.ts` | The PRD §3 Reference Seed Profile: 10,000 catalog entries (90-day history for 2,000, 300 unpriced), 87 TRM rows, 300 users, 14 businesses in every verification shape, 1,500 listings, 200 orders, 8 commission accounts, 50 trades, 300 collections, 400 reviews. `scale` grows the catalog | Proven count by count by `[SEED.profile]` and `[SEED.business-history]` (green). Every row satisfies every CHECK, because the inserts would fail otherwise |
| `sim_events` | `src/shared-kernel/infra/pg-outbox.ts` (`PgOutboxV2`, bound by `wiring()` since decision log Impl-1 #20; `SqlOutboxV2` in `test-support/simulated/index.ts` is no longer bound), `SubscriberFaults` and `src/shared-kernel/dispatcher.ts` (`OutboxDispatcherV2`) | The outbox as the publisher sees it: the R-1 envelope, one `pending` delivery per registered subscriber. A fault injector makes one named subscriber throw a chosen code. The dispatcher, sweeper and replay are driven directly by the tests | Crash-between-commit-and-dispatch, unrecorded attempts and replay are all reproducible (`[SYS-2.R4]`, `[SYS-2.R6]`, `[NFR-SYS-6.sweep]`) |
| `explain_assert` | `test-support/solu2/fixtures.ts` (`explainAssert`) | The one shared assertion helper. It checks a `Decision` or an error body: code, ≥ 1 citation, `rule` matching `^(AD\|FR\|NFR)-…`, the observed inputs, an es-CO `humanMessage` with no PascalCase code, and `occurredAt` | Explainability is checked identically everywhere (NFR-SYS-1) |

## Supporting helpers

| Helper | File | Use |
|---|---|---|
| `wiring(db)` | `test-support/solu2/fixtures.ts` | Every port a service needs: clock, ids, transactions, outbox, audit, storage, scanner, faults, and the empty repository (R-14) |
| `fake<T>(name, impl)` | same | A neighbour port. A method the test did not provide throws, naming itself, so an unexpected call fails loudly |
| Factories (`user`, `business`, `catalogEntry`, `listing`, `order`, `tradeOffer`, `collection`, `review`, …) | same | Given steps that insert one row each, with the minimum valid shape; they assert nothing |
| `race(n, attempt)`, `codeOf(error)` | `test-support/concurrency.ts` | A barrier that starts N calls together and keeps every outcome |
| `caught`, `httpOf`, `citedInputs` | `test-support/errors.ts` | Error inspection for Then steps; HTTP status from the registry |
| Simulated external adapters | `test-support/simulated/index.ts` | `InMemoryObjectStorage` (quarantine, signed reads), `SimulatedScanner` (rejects truncated files), `FixtureFeedSource` (`down`/`stale`/`malformedRows`/`renamedRows`), `FixtureFxRateSource` (`down`/`mismatch`), `AdminTopUpConfirmation` |
| Network guard | `test-support/solu2/network-guard.ts` | A setup file of every Solu-2 project: any socket other than the test Postgres throws (NFR-SYS-3, `[SYS-6.R4]`) |
| Fitness scanners | `test-support/solu2/fitness.ts` | Pure scanners for the import graph, table ownership, wall-clock reads and the generated OpenAPI. Each one is proven by a planted violation |
| `percentile` | `test-support/solu2/bench.ts` | The nearest-rank p95 of the PRD §7 protocol |

## Projects

| Project | Include | Expected state |
|---|---|---|
| `solu2-atdd` | `docs/solu-2/test/atdd/` | Red: every test fails on `NotImplementedError` (`npm run gate:atdd-red:solu2`) |
| `solu2-fitness` | `docs/solu-2/test/fitness/`, `docs/solu-2/test/fixtures/` | Green (`npm run test:fitness:solu2`), burned in 5 × in CI |
| `solu2-nfr` | `docs/solu-2/test/nfr/` | Red until the measured stories are done (`npm run gate:nfr-red:solu2`) |

Run the whole chain with `npm run gate:solu2`. It needs Docker Postgres on port 55432 (`docker compose up -d`).
