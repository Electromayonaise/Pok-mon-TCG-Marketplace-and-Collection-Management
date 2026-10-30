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

![Status](https://img.shields.io/badge/status-Impl--1%3A%2043%20of%2043%20stories%20done-brightgreen?style=for-the-badge)
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

## Quick start

You need Docker and nothing else:

```bash
git clone https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management.git tezg
cd tezg
docker compose up -d --wait
curl http://localhost:3000/api/health/ready
# {"ready":true,"checks":{"database":"ok","migrations":"current"},"pending":[]}
```

Compose builds the service, starts PostgreSQL 16, applies the migrations and serves the API on `http://localhost:3000`. Both health probes are green once `--wait` returns. The database runs on tmpfs, so `docker compose down` discards it.

On Windows, clone with `git clone -c core.longpaths=true …`, because some paths under `.agents/skills/` exceed 260 characters.

The image build downloads the base images from Docker Hub and the npm packages from the registry. Behind a proxy that re-signs TLS, `npm ci` inside the build fails ("Exit handler never called"); build with the proxy and its CA available to the build stage, or use the development setup below, which needs only the PostgreSQL image.

## Development setup

You need Node.js 22 (`.nvmrc`) and Docker.

```bash
npm ci                    # also generates the Prisma client and installs the lint toolchain
cp .env.example .env      # every variable is documented there and validated at start-up
npm run db:up             # PostgreSQL 16 on 127.0.0.1:55432
npm run db:migrate        # creates tezg_dev and applies the migrations
npm run dev               # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm test` | `npm run db:up`, then `npm run test:ci` |
| `npm run test:ci` | The full suite against a running PostgreSQL: lint, the dependency and Prisma gates, the unit tests, then `gate:impl1` (typecheck, the Solu-2 contract gates, `gate:purity`, the fitness suite and the Impl-1 red gates). CI runs this command |
| `npm run test:unit` | The unit and integration tests colocated with the code (`*.test.ts`) |
| `npm run lint` | ESLint, run from its own toolchain in `tools/lint/` |
| `npm run typecheck` | TypeScript 7, no emit |
| `npm run db:migrate` / `db:reset` | Applies the pending migrations / drops the database and migrates from scratch |
| `npm run db:pull` | Regenerates `prisma/schema.prisma` from the migrations, then the client |
| `npm run gate:deps` | Every dependency pinned exactly, on the approved list, and free of high or critical advisories |
| `npm run gate:prisma` | Fails when `prisma/schema.prisma` drifts from the migrations |
| `npm run gen:api:solu2` | Regenerates `openapi.yaml` from `operations.json` |
| `npm run build` / `start` | Production build and server |

The tests need only `npm run db:up`: each test file gets its own database, cloned from a template migrated once per run. They reach PostgreSQL through `TEZG_PG_HOST`, `TEZG_PG_PORT`, `TEZG_PG_USER`, `TEZG_PG_PASSWORD` and `TEZG_PG_DB` (defaults: `127.0.0.1:55432`, user, password and maintenance database `tezg`).

### Troubleshooting: port 55432 on Windows

Windows (WinNAT/Hyper-V) can reserve a port range that includes 55432. `npm run db:up` (or `docker compose up`) then fails because the port is not available. `netsh interface ipv4 show excludedportrange protocol=tcp` lists the reserved ranges. There are two fixes:

- **Release the range.** In an administrator PowerShell, run `net stop winnat` and then `net start winnat`. Then run `npm test` as usual.
- **Use another port.** Start PostgreSQL 16 on a free port and point the tests at it:

  ```bash
  docker run -d --name tezg-pg-alt -p 15432:5432 -e POSTGRES_USER=tezg -e POSTGRES_PASSWORD=tezg postgres:16.6
  export TEZG_PG_PORT=15432
  npm run test:ci
  ```

  For `npm run dev`, also change the port in `DATABASE_URL` in `.env`.

## What Impl-1 delivers

Impl-1 is closed: all 43 stories of its cut are `done`, together with 19 stories pulled forward from Impl-2 (62 of the project's 69). The 7 stories reserved for Impl-2 (8.5, 8.6, 9.6, 11.5, 11.6, 13.5, 13.6) keep their ATDD tests red for the right reason (`NotImplementedError`). The final trace's gate is PASS: every Impl-1 story's bound tests pass, at least two per story, and every P0 risk is covered.

> The first graded delivery (the foundation and three Identity stories, decision log #22) is the tag [`impl1-entrega`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/tree/impl1-entrega). The close of Impl-1 is the tag `impl1-done`.

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

**Over HTTP**, 84 of the 111 procedures are wired behind a Better Auth session (or public, where the contract says so). A request without a session gets `NotAuthenticated` (401), and a non-admin on an admin procedure `AdminOnly` (403). The other 27 belong to the reserved stories or to the jobs route and answer `Unexpected` (500) until they are built. Sign-up and sign-in are not configured yet (Story 2.4's Impl-2 completion), and the production storage, malware scanner, catalog feed and TRM adapters are not chosen yet: [`walkthrough-impl1.md`](_bmad-output/implementation-artifacts/walkthrough-impl1.md) §18 lists every known limit with its owner.

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
| Final trace and test review | [`_bmad-output/test-artifacts/impl1-final-trace.md`](_bmad-output/test-artifacts/impl1-final-trace.md), [`impl1-test-review.md`](_bmad-output/test-artifacts/impl1-test-review.md) |
| Deliverable map | [`docs/impl-1/README.md`](docs/impl-1/README.md) |
| AI decision log | [`_bmad-output/decision-logs/impl-1-ai-decision-log.md`](_bmad-output/decision-logs/impl-1-ai-decision-log.md) |
| PRD | [`_bmad-output/planning-artifacts/prd.md`](_bmad-output/planning-artifacts/prd.md) and `addendum.md` |
| Contracts (OpenAPI, schemas) | [`_bmad-output/planning-artifacts/detailed-design/`](_bmad-output/planning-artifacts/detailed-design/) |

## Architecture

TEZG is a modular monolith in hexagonal style (Plan-2 ARCHITECTURE, Solu-2 detailed design):

- **Inbound adapters.** A Next.js 16 App Router app with no pages. `app/api/trpc/[trpc]/route.ts` serves tRPC 11 on the non-batched wire, from the composition root `src/server/composition.ts`. `app/api/auth/[...all]/route.ts` mounts Better Auth for sessions. `app/api/health/` holds the liveness and readiness probes.
- **Modules.** The 12 logical modules live in nine folders under `src/modules/<module>/`: `identity` (IDN, VER), `catalog`, `listings` (INV, DSC), `orders`, `commission`, `trading`, `messaging`, `collections` (COL, VAL) and `reviews`. Each folder has a `domain/` (pure: no framework, driver, network or wall clock; `gate:purity` enforces it), `application/`, `ports/`, `dto/` and `infra/`. Other modules may import it only through its `index.ts`, and only along the AD-1 edges.
- **Persistence.** PostgreSQL 16. The SQL DDL in `_bmad-output/planning-artifacts/detailed-design/schemas/` is the schema source of truth: `npm run db:migrate` applies it, and every table belongs to exactly one module. Repositories run SQL through the `Sql`/`Tx` ports. The Prisma model is generated from the migrated database and backs Better Auth only.
- **Shared kernel.** `src/shared-kernel/` holds the ports (`Clock`, `IdGenerator`, `TransactionRunner`, the outbox), the error registry, the event registry and the validated configuration (`config.ts`).
- **Determinism.** Time and ids come only through ports. Every external system is a simulated adapter, and the tests run behind a network guard on a virtual clock.

| Path | Contents |
|---|---|
| `app/` | Route handlers (tRPC, health) |
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
