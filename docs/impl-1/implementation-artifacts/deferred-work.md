# Deferred Work

Findings a code review chose not to fix now, with the reason. Each later review reads this file first.

## Deferred from: code review of 1-4-keep-time-sockets-and-module-boundaries-deterministic (2026-10-25)

- `regulated-select` false negatives on `RETURNING`, concatenated or interpolated SQL, schema-qualified and unquoted uppercase names. The rule guards the repo's literal style; the DB-backed fitness tests remain the proof.
- `error-owner` misses an aliased `raiserFor` and member callees (`x.raiserFor`). No such call exists; revisit if one appears.
- The drift test reads column markers only; table-level `-- regulated` markers and `TRUNCATE a, b` lists are not parsed. The schema has neither today.

## Deferred from: code review of 1-5-show-admins-the-delivery-and-tick-health (2026-10-25)

- The `OR $1 IS NULL` keyset predicate may keep the planner off the partial index on large tables. Volumes are tiny; measure before splitting the statement.
- No test for the stuck list's second page, nor that a refused cursor reads nothing. The failed list covers the keyset; the decoder throws before the read.
- `TickSilent` renders "(sin dato)" when no tick ever ran. Wording polish for the admin UI story.
