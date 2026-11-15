<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:FFCB05,50:CC0000,100:3B4CCA&height=130&section=header" width="100%" alt="banner" />
<img src="assets/logo/tezg-wordmark.svg" height="120" alt="TEZG" />

<sub><b>TCG — but EZ</b> · Collection Tracker + Local Marketplace for Colombia</sub>

<a href="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif">
  <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif" width="80" alt="Pikachu" />
</a>

### One accurate, COP-priced view of your Pokémon TCG collection — with a local marketplace growing on top of it.

<img src="https://readme-typing-svg.demolab.com/?font=Fira+Code&weight=600&size=20&pause=1200&color=CC0000&center=true&vCenter=true&width=680&lines=Track+your+collection.;Follow+the+market.;Trade+with+other+Colombian+collectors.;No+more+eBay+%2B+PriceCharting+%2B+Collectr+juggling." alt="typing tagline" />

<br/>

![Status](https://img.shields.io/badge/status-Impl--2%3A%2072%20of%2072%20stories%20done-brightgreen?style=for-the-badge)
![Scope](https://img.shields.io/badge/scope-backend%20only%20(for%20now)-orange?style=for-the-badge)
![Region](https://img.shields.io/badge/region-Colombia-8A2BE2?style=for-the-badge)
![Made with BMAD](https://img.shields.io/badge/planned%20with-BMAD%2FWDS-2596BE?style=for-the-badge)

</div>

<br/>

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCB05,100:3B4CCA&height=3&width=1000" width="100%" alt="divider" />
</div>

<div align="center">
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="24" valign="middle"/>&nbsp;<img src="assets/logo/title-what-is-tezg.svg" height="34" valign="middle" alt="What is TEZG?"/>
</div>

Colombian Pokémon TCG collectors, buyers, individual sellers, and small businesses today stitch together eBay, PriceCharting, and Collectr — and eat cross‑border shipping and import‑tax costs to do it. Everything else that exists locally is informal WhatsApp/Telegram groups with no structure.

**TEZG** is being designed as **a collection tracker with a local marketplace attached**: one accurate, COP‑priced view of a collector's cards, their market value, and their wishlist — growing, over time, into a real place to buy, sell, and trade directly with other Colombian collectors.

> Collection‑tracking value ships first and stands on its own. Marketplace liquidity — the seller community — is built on top of it. That's a deliberate sequencing decision, not a gap.

> **Today TEZG is backend only.** The service, its API and its test suites are built; the user-facing frontend is not. See [Current scope](#current-scope-backend-only).

<div align="center">

| | | | |
|:---:|:---:|:---:|:---:|
| <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/6.gif" width="70"/> | <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/9.gif" width="70"/> | <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/3.gif" width="70"/> | <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/133.gif" width="70"/> |
| **Collection** | **Marketplace** | **Trading** | **Community** |
| Binder-style tracking of what you own, its condition, and its current market value in COP | Peer‑to‑peer listings for individual sellers and verified businesses — no payment gateway in the middle | Direct card‑for‑card trade offers between individual collectors | Built local‑first for Colombia, growing with the people who actually use it |

</div>

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=rect&color=0:3B4CCA,100:FFCB05&height=3&width=1000" width="100%" alt="divider" />
</div>

## Current scope: backend only

> **For now TEZG is a backend.** What runs today is the API service: a Next.js 16 app that serves tRPC 11 over HTTP on PostgreSQL 16, with Better Auth sessions, the scheduled-job routes and the health probes. There is **no finished frontend yet**. The handful of pages that exist (sign-in, inbox, binder, public seller profile) are a thin demo slice used to exercise the API and the E2E journeys, not the product UI. The real way to use TEZG today is through its API (see [Use the API directly](#use-the-api-directly-trpc-over-http)).

## Running TEZG

This is the backend of TEZG. It lives in `backend/`; the repository root has the general [README](../README.md) and the frontend is planned in [`frontend/`](../frontend/README.md). Run every command from `backend/` unless a step says otherwise.

### Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 22 (see `.nvmrc`; `>=22` is required) | runs the service, the tests and the gates |
| Docker Desktop | running | PostgreSQL 16 (port `55432`) and the k6 image |
| Git | any | to clone the repository |

On Windows, clone with long paths, because some paths under `.agents/skills/` are longer than 260 characters:

```bash
git clone -c core.longpaths=true https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management.git tezg
cd tezg/backend
```

### Option A: Docker only (quick start)

You need Docker and nothing else:

```bash
docker compose down              # start clean: removes old containers and the old network
docker compose up -d --wait      # builds the service, starts PostgreSQL 16, migrates, serves :3000
curl http://localhost:3000/api/health/ready
# {"ready":true,"checks":{"database":"ok","migrations":"current"},"pending":[]}
```

Compose builds the service, starts PostgreSQL 16, applies the migrations and serves the API on `http://localhost:3000`. Both health probes are green once `--wait` returns. The database runs on tmpfs, so `docker compose down` discards it. This database is **empty**: you can call the public API procedures, but there are no accounts. To get accounts, see [Demo data](#demo-data-and-the-demo-server).

- **Always run `docker compose down` first.** `npm run db:up`, `npx playwright test` and `npm test` start the same `tezg-postgres-1` container on their own. If that container is days old, `docker compose up` reuses it and the app can fail to resolve it (`Error: getaddrinfo EAI_AGAIN postgres`). Running `down` first recreates both containers on a fresh network.
- **Use `-d --wait`, not plain `docker compose up`.** Without `-d` the terminal stays attached, and Ctrl+C stops both containers.
- **Options A and B both use port 3000.** `docker compose stop app` stops only the app container and keeps PostgreSQL running for Option B.

Stop it with `docker compose down`.

The image build downloads the base images from Docker Hub and the npm packages from the registry. Behind a proxy that re-signs TLS, `npm ci` inside the build fails ("Exit handler never called"), because the build stage does not trust the proxy's certificate. The Dockerfile has no setting for that case; use Option B instead, with your proxy's CA configured for Node and npm on the host.

### Option B: development setup (recommended)

**Before `npm ci`, stop every Node process running from this folder** (`npm run dev`, `npm start`, a Playwright or k6 server). `npm ci` deletes `node_modules` first, and on Windows it cannot delete a file a running process has open (`EPERM ... next-swc.win32-x64-msvc.node`, see [Troubleshooting](#troubleshooting)).

```bash
npm ci                    # also generates the Prisma client and installs the lint toolchain
cp .env.example .env      # every variable is documented there and validated at start-up
npm run db:up             # PostgreSQL 16 on 127.0.0.1:55432
npm run db:migrate        # creates tezg_dev and applies the migrations
npm run dev               # http://localhost:3000
```

Check it:

```bash
curl http://localhost:3000/api/health/live    # {"status":"ok"}
curl http://localhost:3000/api/health/ready   # {"ready":true,...}
```

Things to know:

- **`.env` is required for `npm run dev`** and any deployment. `src/shared-kernel/config.ts` refuses to start if `JOBS_SECRET`, `BETTER_AUTH_SECRET` or `IP_HMAC_KEY` is missing or shorter than 32 characters. `JOBS_SECRET` is the bearer every scheduled job call sends (`POST /api/jobs/<job>?trigger=tick`). `.env.example` already contains valid local values, and `docker-compose.yml` sets its own. The tests need no `.env`.
- **`TEZG_PG_POOL_MAX`** (2–50, default 2) sizes the database pool. Keep 2 for normal use; set 10 when you load-test a long-lived server.
- `npm run dev` writes an `AGENTS.md` file in `backend/`. Git ignores it.
- `npm ci` with npm 11 warns that the install scripts of `@prisma/engines` and `prisma` are "not yet covered by allowScripts". The warning is harmless: the project's own `postinstall` still generates the Prisma client.
- `npm run db:reset` drops and recreates the dev database. `npm run db:down` stops PostgreSQL, and because the data is on tmpfs, that deletes every database.

### Demo data and the demo server

**Sign-up is refused on purpose.** No mail provider is wired yet, so `POST /api/auth/sign-up/email` answers `500 Unexpected` before it writes anything (Story 2.6). To sign in you need accounts created by a seed. The simplest seed is the Playwright E2E run: it creates the `tezg_e2e` database, fills it with demo accounts and data, and keeps them after the run.

1. **Create the demo data** (once per PostgreSQL start):

   ```bash
   npx playwright install chromium   # first time only
   npx playwright test               # starts Postgres, builds the app, seeds tezg_e2e, runs the 6 journeys
   ```

   Expect `6 passed`. The first run takes a few minutes because it makes a production build.

2. **Start the demo server:**

   ```bash
   npm run demo        # http://localhost:4000
   ```

   The demo has its own port, **4000**, so it never collides with Option A or `npm run dev` (3000), the Playwright server (3100) or k6 (3200). `scripts/demo.mjs` starts PostgreSQL if needed, checks that the demo accounts exist in `tezg_e2e` (and tells you to run `npx playwright test` if they don't), then starts the app with `DATABASE_URL` pointing at `tezg_e2e` and `BETTER_AUTH_URL=http://localhost:4000`, so Better Auth never answers "Invalid origin". It needs no `.env` changes. Open `http://localhost:4000` (use `localhost`, not `127.0.0.1`) and stop it with Ctrl+C. For another port: `$env:DEMO_PORT = "4100"; npm run demo` in PowerShell, or `DEMO_PORT=4100 npm run demo` in Git Bash.

**Demo accounts:**

| Who | Email | Password | What they have |
|---|---|---|---|
| Julián (collector) | `julian.e2e@tezg.test` | `clave-segura-de-julian` | the binder "Kanto 151" with 4 cards |
| Camila (buyer) | `camila.e2e@tezg.test` | `clave-segura-de-camila` | an inbox with two shops, "Cartas Andrés" and "Tienda Pokeparadise" |
| Lucía (seller) | — (public profile, no sign-in) | — | a 4.5 rating from 2 visible reviews and 1 review hidden by moderation |

**Demo pages.** These are the thin test slice described in [Current scope](#current-scope-backend-only), not a product frontend. Their text is in Spanish (es-CO), because the product targets Colombia.

| Page | URL | Try this |
|---|---|---|
| Home | `http://localhost:4000/` | shows "Servicio listo" when the server, database and migrations are healthy |
| Sign in | `/ingresar` | sign in as Julián or Camila. A wrong password shows the es-CO error; after 10 failed attempts in 15 minutes the account is throttled |
| My collections | `/coleccion` | as Julián: open "Kanto 151" |
| Binder | `/coleccion/<collectionId>` | re-sort the cards and reload: the order persists. "Add by link" refuses an `http://` link and adds an `https://` one to a pocket |
| Inbox | `/mensajes` | as Camila: open a conversation and see the unread badge clear; mute the other one and see the unread total drop |
| Seller profile | `/perfil/e2eluciax000000000000000` | public: Lucía's rating and reviews, without the hidden one. Any other id shows the "Not available" page |

The pages that need a session (`/coleccion`, `/mensajes`) send you to `/ingresar` first and then bring you back.

### Use the API directly (tRPC over HTTP)

This is the main way to use TEZG today. Every procedure is one HTTP request; batching is off:

- **Query:** `GET /api/trpc/<procedure>?input=<URL-encoded JSON>`
- **Mutation:** `POST /api/trpc/<procedure>` with a JSON body
- **Success:** `{"result":{"data":...}}`
- **Refusal:** `{"error":{"code","httpStatus","decision":{"humanMessage",...}}}`. The `humanMessage` is in es-CO and the decision cites the rule that refused the call.

The full list of 109 procedures is in [`openapi.yaml`](_bmad-output/planning-artifacts/detailed-design/schemas/openapi.yaml). The examples below use Git Bash and the demo server (`npm run demo`, port 4000), because they read the demo accounts. In PowerShell, write `curl.exe` instead of `curl`.

**Public reads (no session):**

```bash
# catalog page 1, 3 entries:  {"filters":{},"page":1,"pageSize":3}
curl "http://localhost:4000/api/trpc/catalog.browse?input=%7B%22filters%22%3A%7B%7D%2C%22page%22%3A1%2C%22pageSize%22%3A3%7D"

# Lucía's public profile:  {"userId":"e2eluciax000000000000000","page":1}
curl "http://localhost:4000/api/trpc/reputation.profile?input=%7B%22userId%22%3A%22e2eluciax000000000000000%22%2C%22page%22%3A1%7D"
```

**Sign in, then call procedures that need a session.** The session lives in a cookie, kept in `jar.txt`:

```bash
curl -c jar.txt -H "content-type: application/json" \
  -d '{"email":"julian.e2e@tezg.test","password":"clave-segura-de-julian"}' \
  http://localhost:4000/api/auth/sign-in/email

curl -b jar.txt "http://localhost:4000/api/trpc/collections.list?input=%7B%7D"
# {"result":{"data":{"collections":[{"collectionId":"e2ekantox000000000000000","name":"Kanto 151","entryCount":4}]}}}

curl -b jar.txt -H "content-type: application/json" -d '{"name":"Demo"}' \
  http://localhost:4000/api/trpc/collections.create
# {"result":{"data":{"collectionId":"...","name":"Demo","decision":{"outcome":"allowed","reasonCode":"CollectionCreated",...}}}}
```

Without the cookie, the same call is refused: `401 NotAuthenticated` with "Inicia sesión para continuar."

**Scheduled jobs.** These are what a cron scheduler would call. They need the `JOBS_SECRET` from your `.env` as a bearer token:

```bash
JOBS_SECRET=$(grep '^JOBS_SECRET=' .env | cut -d= -f2-)
curl -X POST -H "Authorization: Bearer $JOBS_SECRET" \
  "http://localhost:4000/api/jobs/outbox-sweep?trigger=tick"
# {"job":"outbox-sweep","trigger":"tick","runId":"...","outcome":"succeeded","result":{"attempted":0,"delivered":0,"failed":0}}
```

The jobs are `trm-fetch`, `expiry-materialize`, `commission-reconcile` and `outbox-sweep`; the trigger is `tick`, `daily-morning` or `daily-night`. A missing or wrong bearer gets `401` and no run is recorded. Two runs of the same job never overlap: the second is a `skipped` no-op.

### Tests and quality gates

| Command | What it does |
|---|---|
| `npm test` | `npm run db:up`, then `npm run test:ci` (~12 min) |
| `npm run test:ci` | The full suite against a running PostgreSQL: lint, the dependency, no-sleep, evidence-checksum and Prisma gates, 757 unit/integration tests with the 90 % per-file branch threshold on the domain cores, then `gate:impl1` (typecheck, the Solu-2 contract gates, the trace gate, `gate:purity`, the fitness suite, 384 ATDD tests and 30 NFR benchmarks). CI runs this command; it takes about 12 minutes, most of it the benchmarks, which run one file at a time |
| `npm run test:unit` | Only the unit and integration tests colocated with the code (`*.test.ts`), with coverage (~30 s) |
| `npx playwright test` | The 6 E2E journeys (1–3 min): it starts the Compose PostgreSQL, recreates and seeds `tezg_e2e`, builds and serves the app on port 3100, and runs the specs through their Page Objects with 14 axe-core WCAG scans (`trace: 'on-first-retry'`; add `--trace on` for a `trace.zip` per test in `test-results/`) |
| `npm run nfr:k6` | The k6 load run (~3 min): it seeds `tezg_k6`, serves the production build on port 3200 and runs `grafana/k6` in Docker at 100 requests/s per endpoint for 60 s; it fails on any p95, p99, error-rate, 5xx or dropped-iteration threshold |
| `npm run gate:no-sleep` | Refuses timed waits (`waitForTimeout`, `pg_sleep`, promise sleeps) everywhere, and locators built in a Playwright spec |
| `npm run gate:evidence` | Recomputes the SHA-256 digest of every run-evidence file in `_bmad-output/test-artifacts/evidence/impl2/` and fails if one differs from `SHA256SUMS`, is missing or is not listed; `npm run gen:evidence` rewrites `SHA256SUMS` |
| `npm run gen:trace:solu2` | Regenerates `_bmad-output/test-artifacts/traceability-matrix.md` (final verdict: PASS) |
| `npm run lint` | ESLint, run from its own toolchain in `tools/lint/` |
| `npm run typecheck` | TypeScript 7, no emit |
| `npm run db:migrate` / `db:reset` | Applies the pending migrations / drops the database and migrates from scratch |
| `npm run db:pull` | Regenerates `prisma/schema.prisma` from the migrations, then the client |
| `npm run gate:deps` | Every dependency pinned exactly, on the approved list, and free of high or critical advisories |
| `npm run gate:prisma` | Fails when `prisma/schema.prisma` drifts from the migrations |
| `npm run gen:api:solu2` | Regenerates `openapi.yaml` from `operations.json` |
| `npm run build` / `start` | Production build and server |

The Vitest tests need only `npm run db:up`; Playwright and k6 start it themselves, and k6 also needs Docker for its image. Each test file gets its own database, cloned from a template migrated once per run. They reach PostgreSQL through `TEZG_PG_HOST`, `TEZG_PG_PORT`, `TEZG_PG_USER`, `TEZG_PG_PASSWORD` and `TEZG_PG_DB` (defaults: `127.0.0.1:55432`, user, password and maintenance database `tezg`).

Run one story's bound tests, for example the Story 4.6 circuit breaker, or open a committed Playwright trace:

```bash
npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/cat_breaker.test.ts
npx playwright show-trace _bmad-output/test-artifacts/evidence/impl2/traces/binder-sort-and-add-link.zip
```

Results and evidence: the walkthrough [`walkthrough-impl2.md`](_bmad-output/implementation-artifacts/walkthrough-impl2.md), the traceability matrix and verdict [`traceability-matrix.md`](_bmad-output/test-artifacts/traceability-matrix.md), the run logs, k6 summary, traces and `SHA256SUMS` in `_bmad-output/test-artifacts/evidence/impl2/`, the sprint status [`sprint-status.yaml`](_bmad-output/implementation-artifacts/sprint-status.yaml), the AI decision log [`impl-2-ai-decision-log.md`](_bmad-output/decision-logs/impl-2-ai-decision-log.md) and the deliverable map [`docs/impl-2/README.md`](docs/impl-2/README.md).

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `docker compose up` → `app-1 Error: getaddrinfo EAI_AGAIN postgres` and `app-1 exited with code 1` | The `tezg-postgres-1` container was reused from an earlier `npm run db:up`, Playwright or test run, and the new app container did not join its network | `docker compose down`, then `docker compose up -d --wait` |
| `npm ci` → `EPERM: operation not permitted, unlink ...\node_modules\@next\swc-win32-x64-msvc\next-swc.win32-x64-msvc.node` | A Node process from this folder still has Next's native binary open, usually a forgotten `npm run dev` or `next start` | Stop it with Ctrl+C in its terminal. If you cannot find it, list the Node processes in PowerShell with `Get-CimInstance Win32_Process -Filter "Name='node.exe'" \| Select ProcessId,CommandLine` and stop the ones pointing into this folder with `Stop-Process -Id <id>`. Close VS Code too if it still fails, then rerun `npm ci` |
| The app opens on **3001** and sign-in always fails (`[Better Auth]: Invalid origin: http://localhost:3001`, `POST /api/auth/sign-in/email 403`) | Port 3000 was taken, usually by Option A's app container, so Next moved to 3001. Better Auth only trusts `BETTER_AUTH_URL` (`http://localhost:3000`) | Use `npm run demo` (port 4000 with a matching `BETTER_AUTH_URL`). For `npm run dev` itself, run `docker compose stop app` first |
| Port 3000 already in use | Option A's app container and `npm run dev` both use port 3000 | `docker compose stop app`, or `npx next dev -p 3001` with `BETTER_AUTH_URL=http://localhost:3001` |
| Sign-in says the email or password is wrong, even with the demo password | The dev server reads `tezg_dev` (the `.env` default), which has no accounts, or a PostgreSQL restart wiped the demo data | Use `npm run demo`, which always reads `tezg_e2e`; if the accounts are gone, rerun `npx playwright test` |
| `npm run db:up` fails: port 55432 not available (Windows) | WinNAT/Hyper-V reserved a port range that includes 55432 (`netsh interface ipv4 show excludedportrange protocol=tcp` lists them) | In an **administrator** PowerShell, `net stop winnat` then `net start winnat`. Or run PostgreSQL on another port: `docker run -d --name tezg-pg-alt -p 15432:5432 -e POSTGRES_USER=tezg -e POSTGRES_PASSWORD=tezg postgres:16.6`, set `TEZG_PG_PORT=15432` for the tests, and change the port in `DATABASE_URL` for `npm run dev` |
| `npm run dev` exits naming a variable | `.env` is missing, or a secret is shorter than 32 characters | `cp .env.example .env` |
| Sign-up answers `500 Unexpected` | Expected: no mail provider is wired, so sign-up is refused before any write | Use the demo accounts |
| Sign-in answers `429` | The brute-force throttle: 10 failed sign-ins per account or 30 per IP in 15 minutes | Wait for the retry time shown, or rerun `npx playwright test`, which resets the demo accounts |
| The demo accounts are gone | PostgreSQL runs on tmpfs, so a container restart wipes every database | Rerun `npx playwright test` |
| `gate:evidence` fails after `npm run nfr:k6` | k6 overwrites the committed `k6-summary.json` | `git checkout -- _bmad-output/test-artifacts/evidence/impl2/k6-summary.json`, or record the new run with `npm run gen:evidence` |
| `sorry, too many clients already` | Postgres allows fewer than the 200 connections the race tests use | Use the Compose Postgres (`npm run db:up`), which sets `max_connections=200` |
| `docker compose up` build fails at `npm ci` behind a proxy | The build stage does not trust the proxy's certificate | Use Option B |

## What Impl-2 delivers

Impl-2 is closed: all 72 stories of the 13 epics are `done`. It built the 7 stories Impl-1 reserved and three new ones: 1.6 (the jobs route, single-flight behind `JOBS_SECRET`), 2.6 (sign-up, sign-in and the throttle) and 4.6 (a circuit breaker on the TRM source, shared in Postgres). Each is paired with a testing flow: ATDD-first with the red run committed before the code, test-along, the hardening of the Impl-1 tests, the NFR gate (k6 and concurrency hammers) and Playwright journeys through Page Objects with axe-core WCAG scans, and one committed `trace.zip` per journey, captured locally and on CI. The final trace (`traceability-matrix.md`) awards **PASS**, and the CI workflow `impl2-quality-gate` releases only when the suite, the journeys and k6 all pass. A close-phase architecture audit (Winston) found three MEDIUM and seven LOW findings; nine are fixed and one is accepted. Every run-evidence file has its SHA-256 digest in `SHA256SUMS`, checked by `npm run gate:evidence`. Every registry procedure is now wired, and the service has its first pages: sign-in, the inbox, the binder and the public seller profile. One item is open: re-run on the current code, the k6 load run fails on the 2-connection runtime pool, and the fix is a decision for the team ([`docs/impl-2/README.md`](docs/impl-2/README.md), "Known deferrals").

Where each Impl-2 deliverable is, what changed in each artifact and how to run everything: [`docs/impl-2/README.md`](docs/impl-2/README.md). The walkthrough: [`walkthrough-impl2.md`](_bmad-output/implementation-artifacts/walkthrough-impl2.md).

## What Impl-1 delivers

Impl-1 is closed: all 43 stories of its cut are `done`, together with 19 stories pulled forward from Impl-2 (62 of the project's 69). The 7 stories reserved for Impl-2 (8.5, 8.6, 9.6, 11.5, 11.6, 13.5, 13.6) kept their ATDD tests red for the right reason (`NotImplementedError`) until Impl-2 built them. The final trace's gate is PASS: every Impl-1 story's bound tests pass, at least two per story, and every P0 risk is covered.

> The first graded delivery (the foundation and three Identity stories, decision log #22) is the tag [`impl1-entrega`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/tree/impl1-entrega). The close of Impl-1 will be the tag `impl1-done`, set on `main` once the close is merged.

| Epic | What it guarantees |
|---|---|
| 1 SYS | Every refusal is one `{ error: ErrorBody }` with a registry code, its HTTP status, an es-CO message and a cited decision; every change is audited and regulated values are redacted at every egress; every committed event reaches each subscriber exactly once in effect; time, ids and module boundaries are deterministic |
| 2 IDN | A seller claims the individual or business track exactly once, and an account that may not list learns why from one capability projection |
| 3 VER | A business application with its legal identity is decided exactly once, and every legal-identity read is audited |
| 4 CAT | Catalog feed runs keep each card's id through renames and reprints, and a price is never fabricated |
| 5 INV | Listings share one stock pool, and a reservation in the caller's transaction is restored on abort: the last unit is never sold twice |
| 6 DSC | Area search ranks listings deterministically and explains what it excluded |
| 7 ORD | An order is bought, paid and closed safely in any order of confirmations, with no funds held by the platform |
| 8 COM | Each order is charged exactly once against the business's prepaid commission account |
| 9 MSG | Messaging follows the business's current verification, and the contact handoff renders every product name |
| 10 TRD | Two sessions accepting the last unit get one Accepted and one Unfulfillable |
| 11 COL | A closed order becomes exactly one prompt and one entry set |
| 12 VAL | A collection is valued exactly in COP, with a null (never NaN) change on a zero baseline |
| 13 REP | Only closed purchases review businesses, and a hide racing a new review never skews the aggregate |

**Over HTTP at the Impl-1 close**, 84 of the 111 procedures are wired behind a Better Auth session (or public, where the contract says so). A request without a session gets `NotAuthenticated` (401), and a non-admin on an admin procedure `AdminOnly` (403). Of the other 27, the 24 tRPC procedures of the reserved stories answer `Unexpected` (500) until they are built, and the 3 job routes (`jobs/trm-fetch`, `jobs/expiry-materialize`, `jobs/commission-reconcile`) have no route handler yet, so they answer 404. Sign-up and sign-in are not configured yet (Story 2.4's Impl-2 completion), and the production storage, malware scanner, catalog feed and TRM adapters are not chosen yet: [`walkthrough-impl1.md`](_bmad-output/implementation-artifacts/walkthrough-impl1.md) §18 lists every known limit with its owner.

The walkthrough covers each story's goal, procedures, database changes, blast radius and test evidence, together with the suite and gate output. Each story's full record is in `_bmad-output/implementation-artifacts/`.

**Where each deliverable is** (Impl-1 task statement §6.1):

| Deliverable | Path |
|---|---|
| Code: scaffold and stories | `src/`, `app/`, `scripts/` (migrations runner), `docker-compose.yml`, `Dockerfile`, `.env.example` |
| Tests | `src/**/*.test.ts`, `_bmad-output/test-artifacts/` (ATDD, NFR, fitness), `test-support/` |
| Fixtures | `test-support/fixtures/` |
| Sprint status | [`_bmad-output/implementation-artifacts/sprint-status.yaml`](_bmad-output/implementation-artifacts/sprint-status.yaml) |
| Story files | [`_bmad-output/implementation-artifacts/`](_bmad-output/implementation-artifacts/) |
| Walkthrough and test output | [`_bmad-output/implementation-artifacts/walkthrough-impl1.md`](_bmad-output/implementation-artifacts/walkthrough-impl1.md) |
| Final trace and test review | [`_bmad-output/test-artifacts/traceability-matrix.md`](_bmad-output/test-artifacts/traceability-matrix.md) (the final trace and quality gate, regenerated by `npm run gen:trace:solu2`), [`test-review.md`](_bmad-output/test-artifacts/test-review.md); the Impl-1 versions stay in git: `git show 31999bc:_bmad-output/test-artifacts/impl1-final-trace.md`, `git show 31999bc:_bmad-output/test-artifacts/impl1-test-review.md` |
| Deliverable map | [`docs/impl-1/README.md`](docs/impl-1/README.md); for Impl-2, [`docs/impl-2/README.md`](docs/impl-2/README.md) |
| AI decision log | [`_bmad-output/decision-logs/impl-1-ai-decision-log.md`](_bmad-output/decision-logs/impl-1-ai-decision-log.md) |
| PRD | [`_bmad-output/planning-artifacts/prd.md`](_bmad-output/planning-artifacts/prd.md) and `addendum.md` |
| Contracts (OpenAPI, schemas) | [`_bmad-output/planning-artifacts/detailed-design/`](_bmad-output/planning-artifacts/detailed-design/) |

## Architecture

TEZG is a modular monolith in hexagonal style (Plan-2 ARCHITECTURE, Solu-2 detailed design):

- **Inbound adapters.** A Next.js 16 App Router app with a thin page slice since Impl-2 (`/ingresar`, `/mensajes`, `/coleccion`, `/perfil/<userId>`). `app/api/trpc/[trpc]/route.ts` serves tRPC 11 on the non-batched wire, from the composition root `src/server/composition.ts`. `app/api/auth/[...all]/route.ts` mounts Better Auth for sessions. `app/api/jobs/[job]/route.ts` serves the scheduled jobs behind `JOBS_SECRET`. `app/api/health/` holds the liveness and readiness probes.
- **Modules.** The 12 logical modules live in nine folders under `src/modules/<module>/`: `identity` (IDN, VER), `catalog`, `listings` (INV, DSC), `orders`, `commission`, `trading`, `messaging`, `collections` (COL, VAL) and `reviews`. Each folder has a `domain/` (pure: no framework, driver, network or wall clock; `gate:purity` enforces it), `application/`, `ports/`, `dto/` and `infra/`. Other modules may import it only through its `index.ts`, and only along the AD-1 edges.
- **Persistence.** PostgreSQL 16. The SQL DDL in `_bmad-output/planning-artifacts/detailed-design/schemas/` is the schema source of truth: `npm run db:migrate` applies it, and every table belongs to exactly one module. Repositories run SQL through the `Sql`/`Tx` ports. The Prisma model is generated from the migrated database and backs Better Auth only.
- **Shared kernel.** `src/shared-kernel/` holds the ports (`Clock`, `IdGenerator`, `TransactionRunner`, the outbox), the error registry, the event registry and the validated configuration (`config.ts`).
- **Determinism.** Time and ids come only through ports. Every external system is a simulated adapter, and the tests run behind a network guard on a virtual clock.

| Path | Contents |
|---|---|
| `app/` | Route handlers (tRPC, auth, jobs, health) and the Impl-2 pages |
| `src/` | Modules, shared kernel, server wiring (`src/server/`) |
| `prisma/schema.prisma` | Generated model (`npm run db:pull`) |
| `test-support/` | Test harness: per-file databases, virtual clock, ids, simulated adapters, the Reference Seed Profile (`fixtures/`) |
| `docs/` | One short summary per course task, in development order (`docs/README.md`) |
| `_bmad-output/` | Every BMAD artifact (`_bmad-output/README.md`): specs, planning (PRDs, UX, architecture, the Solu-2 detailed design with `contracts.md`, `openapi.yaml`, events and DDL), the ATDD and fitness suites (`test-artifacts/`), the story files, sprint status and walkthrough (`implementation-artifacts/`), and the decision logs |
| `scripts/`, `tools/lint/` | Gates, generators, the migration runner, the lint toolchain |

<div align="center">
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="24" valign="middle"/>&nbsp;<img src="assets/logo/title-tech-stack.svg" height="34" valign="middle" alt="Tech Stack"/>
</div>

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)
![tRPC](https://img.shields.io/badge/tRPC-11-2596BE?style=for-the-badge&logo=trpc&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Better Auth](https://img.shields.io/badge/Better%20Auth-1.x-000000?style=for-the-badge)
![Vitest](https://img.shields.io/badge/Vitest-5-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

</div>

<div align="center">
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="24" valign="middle"/>&nbsp;<img src="assets/logo/title-design-principles.svg" height="34" valign="middle" alt="Design Principles"/>
</div>

- **Peer‑to‑peer settlement, no payment gateway** — the platform never holds funds; buyers and sellers confirm payment and receipt between themselves.
- **Module boundaries are real boundaries** — each module (catalog, listings, orders, trading, commission, collection, identity...) owns its own data and exposes a public interface; nothing reaches into another module's internals.
- **Local‑first, COP‑native** — money, dates, and pricing are designed around Colombia from the start, not bolted on later.

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=rect&color=0:CC0000,100:FFCB05&height=3&width=1000" width="100%" alt="divider" />
</div>

<div align="center">

<sub>TCG, but EZ.</sub>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:3B4CCA,50:CC0000,100:FFCB05&height=120&section=footer&reversed=true" width="100%" alt="footer" />

</div>
