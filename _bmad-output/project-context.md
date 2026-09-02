---
project_name: 'Pokémon TCG Marketplace and Collection Management Platform'
user_name: 'Martin'
date: '2026-09-01'
sections_completed: ['technology_stack', 'language_specific_rules', 'framework_specific_rules', 'testing_rules', 'code_quality_style_rules', 'development_workflow_rules', 'critical_dont_miss_rules']
status: 'complete'
rule_count: 47
optimized_for_llm: true
existing_patterns_found: 0
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

_No source tree exists yet (pre-implementation, planning-only repo) — these rules are sourced from `ARCHITECTURE-SPINE.md`'s 13 architecture decisions, not from observed code patterns._

---

## Technology Stack & Versions

- Next.js 16.3.3 (App Router, TypeScript) — Active LTS
- tRPC 11.18.x
- Prisma ORM 7.6.x — **requires `@prisma/adapter-pg`**, no longer optional as of Prisma 7; a raw `PrismaClient()` without the adapter will fail against Supabase Postgres
- PostgreSQL via Supabase managed Postgres, free tier — 500MB DB / 1GB storage / 2-project cap / 7-day auto-pause on inactivity / **no backup retention**
- Better Auth 1.x
- Tailwind CSS 4.3.3
- Supabase Storage, free tier (same 1GB cap as above)
- Vercel, free/Hobby tier — confirmed non-compliant with Hobby's commercial-use ToS (this platform takes commission); team decision was to accept the risk and stay on Hobby, not a code-level concern but worth knowing if touching deploy config

## Critical Implementation Rules

### Language-Specific Rules

**Configuration Requirements:**
- IDs: `cuid2` string primary keys everywhere — never auto-increment ints or UUIDs
- Money: integer COP (no decimals) for all transactional/listing prices; USD/COP reference-price pairs (CAP-3) are a *distinct* value object — never merge or coerce between the two money shapes
- Dates: stored UTC ISO 8601; converted to `America/Bogota` only at the presentation layer, never in domain/application code

**Import/Export Patterns:**
- A module may import another module's *public application-service interface* (both reads and the specific write-commands it exposes on the caller's behalf) — never another module's domain core, repository, or Prisma models directly (AD-1)
- Cross-module writes are exactly one of two patterns, never a third: a direct synchronous command call sharing the caller's transaction (correctness-critical only, e.g. `listings.reserveInventory(...)`, AD-6), or an in-process domain event (AD-9/AD-10)

**Error Handling Patterns:**
- A shared `DomainError` code enum lives in `shared-kernel`; every code has exactly one owning, throwing module (AD-11's explicit list) — never redefine the same conceptual error in two modules
- A module that detects another module's error condition (e.g. `orders` calling `listings.reserveInventory` and hitting insufficient quantity) must propagate the thrown error unchanged — never catch and re-throw its own differently-shaped copy
- Never ad-hoc error strings — the tRPC error formatter maps `DomainError` codes to the client

### Framework-Specific Rules

**Module & Router Conventions:**
- Module = plural noun directory (`catalog/`, `listings/`...); one tRPC router per module (`catalog.router.ts`)
- No generic CRUD layer anywhere — all writes go through the owning module's own application service

**Database (Prisma/AD-8):**
- Single shared Postgres DB, but table ownership mirrors module ownership: a module's Prisma models are written only by that module's own repository
- A module reading another module's data goes through that module's public query function — never a raw join across module-owned tables, even though Prisma's shared schema file makes that trivially easy to do by accident

**Cross-module writes (AD-6/AD-9/AD-10):**
- Correctness-critical writes (e.g. inventory decrement) use a direct synchronous command call inside the caller's own Prisma `$transaction`, passing the tx client through — reserved for cases where an event's eventual-consistency semantics can't be tolerated
- Everything else is an in-process domain event: publish only after the publisher's own transaction commits (never mid-transaction); subscribers run synchronously, same request; a subscriber's thrown error is caught and logged — it never rolls back or retries the publisher's write, and never blocks the response

**Auth (Better Auth):**
- Session cookie carries `userId`; role is derived, not a fixed enum — a user can be a buyer and an individual seller simultaneously, so check `isIndividualSellerProfileComplete` / `businessId` / `isAdmin` independently, never assume one mutually-exclusive role field

**Moderation (AD-12):**
- Every default browse/read query on `Listing`/`Review` must filter `hiddenAt IS NULL` — a missed filter silently leaks hidden/moderated content; only the admin moderation view is exempt

### Testing Rules

**Test Boundary Rules (derived from AD-1/AD-6/AD-8):**
- A test that needs to verify cross-module behavior (e.g. inventory reservation on order placement) is inherently an integration test, not a unit test — the module boundary in AD-1 means you cannot unit-test that interaction by mocking Prisma directly, since the calling module never touches the other module's Prisma models
- Tests must exercise the public application-service interface only — a test that imports another module's repository or domain core to set up fixtures is itself violating AD-1 and should be restructured

**Event-Driven Test Rules (derived from AD-9/AD-10):**
- Because subscriber errors are caught-and-logged rather than propagated (AD-10), a test asserting "subscriber X ran" must check for the subscriber's side effect directly — asserting on the publisher's response will never reveal a failed subscriber

**Not yet decided:** test framework/runner, coverage requirements, unit/integration file-organization split, mocking conventions — add once the team picks a framework.

### Code Quality & Style Rules

**Code Organization (derived from AD-1):**
- One top-level directory per module (plural noun); a file that needs to reach across modules imports only from that module's public application-service export, never a deep path into another module's internals

**Naming Conventions (derived from AD-11's `DomainError` list):**
- `DomainError` codes are `PascalCase` nouns/phrases naming the failure condition (e.g. `NotBusinessListing`), not generic strings like `ValidationError` — SPEC.md's success signals reference these exact codes, so renaming one is a breaking change across specs

**Not yet decided:** linter/formatter choice and config, file-naming case convention (kebab vs camel), comment/docstring requirements — none of these are determined by any AD.

### Development Workflow Rules

**Git Pattern (observed from history, not from an AD):**
- All work to date is committed directly to `main` — no feature-branch/PR workflow exists in this repo. Default to the same unless the user explicitly asks for a branch
- Commit message format is not standardized (mix of `type(scope): summary` and free-form) — don't invent or enforce a convention that isn't actually followed

**Deployment:**
- Vercel Hobby tier, commercial-use ToS risk knowingly accepted (see Technology Stack) — no CI/CD pipeline or staging environment exists yet

### Critical Don't-Miss Rules

**Anti-Patterns to Avoid:**
- Never integrate a payment gateway or model a "funds held" state in `orders` — the platform is peer-to-peer settlement by design (AD-2); "completed purchase" means `buyerItemReceivedConfirmedAt IS NOT NULL`, not `buyerPaidConfirmedAt`
- The comprobante (payment proof) is a stored file reference owned by the `Order` aggregate — never inline payment data or a payment blob stored on the order row
- `orders` closing (`OrderClosed`) never writes a `CollectionEntry` itself — it only triggers a dismissible prompt; `AddToCollection` stays a separate buyer-initiated call
- `listings` never stores or mutates a balance figure — it only reacts to `CommissionBalanceExhausted`/`Replenished` events; balance deduction triggers only off `OrderPaymentConfirmedByBusiness`, never a direct call into `commission`'s ledger
- `InventoryUnit.quantity` decrements at reservation (order/trade-offer creation), never at close/confirmation — this is the one correctness-critical ordering in the whole spine (AD-6); decrementing at close reopens the concurrent-oversell bug the adversarial reviewer flagged as Critical
- Sealed products are never a `BundleComponent` and never share `InventoryUnit` pooling logic with cards — don't extend the bundle/individual-listing reconciliation built for cards to sealed products
- `openToTrade` must default `false`, and `listings` (not `trading`) rejects setting it `true` on a verified-business listing — trading is individual-seller-only, enforced at the field's owning aggregate, never trusted from the caller
- Never auto-create a placeholder `CatalogEntry` for a link-added binder item (AD-7) — `BinderEntry.cardRef` is a tagged union specifically so this isn't needed
- Domain event payloads are self-contained snapshots, never a bare id — a new event type defaulting to `{ orderId }` and forcing subscribers to call back into the publisher reintroduces the coupling events exist to avoid (AD-9)
- Never build a general-purpose `ConsentRecord` table for `legalIdentity` consent — it's two named fields directly on `BusinessApplication` (AD-13), even though a shared consent table is the more "obvious" generic design
- Never build a shared cross-module moderation table for hide/unhide — the command lives on the owning module's own application service, gated by an admin-only tRPC procedure checking `identity`'s `isAdmin` (AD-12)

**Edge Cases:**
- `pickupAvailable` is computed on every read from `sellerType`, never cached or stored — if a seller's type changes, a stored flag would silently go stale
- A stalled order (buyer says paid, seller never confirms) has no auto-escalation — this is an accepted gap, not a bug to "fix" unprompted
- If retry logic is ever added to an event subscriber, it must be idempotent (e.g. dedupe by `orderId`) — not optional future-proofing, already assumed by AD-10's design

**Security/Compliance Rules:**
- `SellerNotVerified` and `IndividualSellerProfileIncomplete` are adjacent-sounding but mutually exclusive — the former only fires for an unapproved business account, never an individual seller
- `legalIdentity` documents in Supabase Storage are access-scoped to the admin-review path only — no other module reads them directly, even though nothing at the storage layer physically prevents it (AD-13)

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes, or once a real codebase exists and these architecture-derived rules can be cross-checked against actual patterns
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-09-01
