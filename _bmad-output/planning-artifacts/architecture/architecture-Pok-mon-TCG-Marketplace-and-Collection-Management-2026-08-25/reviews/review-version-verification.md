---
lens: version-verification
target: ARCHITECTURE-SPINE.md
reviewed: '2026-08-25'
verdict: partial-pass
---

# Review: Version & Reality-Check Verification — Architecture Spine Stack

## Mandate

Independently re-verify (via web search) every stack claim in the spine's "Stack" table and surrounding deployment text, rather than trusting the author's "web-verified 2026-08-25" label at face value. Check version accuracy, whether Better Auth is genuinely the current best practice over Auth.js, whether the claimed free tiers are real and as described, whether tRPC 11 + Next.js 16 App Router has known gotchas, and whether anything named has been deprecated/renamed/superseded.

## Verdict

**Partial pass.** Two claims (Next.js 16.3.3 Active LTS; Better Auth over Auth.js) check out accurately against the live web and are genuinely current as of today. Two version pins (tRPC 11.13.2, Prisma 7.4.2) are real published versions but are stale relative to what was actually current on the same verification date, meaning the "web-verified" pass either used cached knowledge or wasn't re-run close enough to commit time. One infrastructure claim (Vercel free tier as production host) was not reality-checked against Vercel's own Terms of Service and is a genuine risk to the deployment plan as written, not just a stale-version nit. Tailwind's pin is accurate. No named technology has been deprecated or renamed.

## Findings

### 1. [HIGH] Vercel Hobby (free tier) prohibits the commercial use this project requires — not caught by the spine

The spine's Stack table and deployment diagram commit to "Vercel free tier (hosting, CI/CD, PR preview environments)" as the production deployment target, with no caveat.

Vercel's own Terms of Service define commercial use broadly: **"any Deployment that is used for the purpose of financial gain of anyone involved in any part of the production of the project"** — explicitly including "any method of requesting or processing payment from visitors of the site." The Hobby plan is contractually restricted to personal/non-commercial use, and Vercel reserves the right to disable or remove Hobby deployments "with or without notice at their sole discretion." All commercial usage requires Pro or Enterprise.

This project is a marketplace that takes a prepaid commission from verified business sellers (CAP-21, AD-3) and mediates buyer/seller transactions with payment-confirmation evidence (AD-2) — this is commercial activity by Vercel's own definition, even though the platform itself never custodies funds. As written, the architecture's production hosting plan carries real risk of deployment suspension without notice. This should have surfaced during a genuine reality-check against Vercel's ToS, not just its feature list (unlimited deployments, PR previews, free tier limits) — which is all the spine appears to have checked.

- **Fix:** either explicitly flag this as an accepted/deferred risk with a migration trigger (e.g., "upgrade to Vercel Pro before first commission-paying business goes live"), or note the ambiguity and get a definitive read (Vercel support / ToS interpretation) before treating Hobby as the committed production tier.

### 2. [MEDIUM] tRPC version pin (11.13.2) is stale relative to what was live on the claimed verification date

The spine pins `tRPC 11.13.2` as "web-verified 2026-08-25." Live npm data on the same date shows `@trpc/server` at **11.18.0** and `@trpc/client` at **11.17.0** — several minor versions ahead of the pin. 11.13.2 is a real, valid v11 release (no wrong-technology issue, and no known v11→v11 breaking changes), but a pin several minors behind current on the exact date it's claimed to have been checked suggests the check reused training-data knowledge of tRPC's version rather than an actual fresh lookup. Low functional risk (semver-compatible), but it undermines confidence in the "web-verified" label as applied here.

- **Fix:** re-pin to (or float on) a current 11.x minor, or explicitly note this is an intentionally conservative pin (it isn't stated as one).

### 3. [MEDIUM] Prisma ORM version pin (7.4.2) is stale, and Prisma 8 is already in release-candidate — not mentioned

The spine pins `Prisma ORM 7.4.2` as current. That version did exist (Feb 27, 2026 patch release), but by the claimed verification date:
- `Prisma ORM 7.6.0` had already shipped (March 27, 2026), and
- **Prisma 8 was already in public release-candidate** (8.0.0-rc.5 as of early August 2026) — a major-version transition the spine doesn't mention at all, even as a "watch this" note.

Separately, and more architecturally relevant: **Prisma 7 made driver adapters mandatory** — the Rust query engine was removed, so a Postgres project must explicitly install and wire `@prisma/adapter-pg` (or an equivalent adapter) to talk to the database at all. This is a real setup requirement for the Prisma 7 + Supabase-managed-Postgres combination the spine commits to, and it isn't mentioned anywhere in the Stack section or Structural Seed — worth a one-line note so the eventual implementer doesn't discover it as a surprise breaking change.

- **Fix:** re-verify the Prisma pin close to build start given 8.0 GA is imminent; add a one-line note that Prisma 7's driver-adapter requirement (`@prisma/adapter-pg`) is a mandatory setup step against Supabase Postgres.

### 4. [MEDIUM] Supabase free-tier specifics are asserted generically, not reality-checked against actual current caps

The spine says "Supabase managed Postgres, free tier" and "Supabase Storage free tier" without citing concrete limits, and the Deferred section treats "PR-preview-against-shared-DB proving too risky" as a hypothetical future concern. Live Supabase pricing data as of August 2026 shows concrete, currently-binding constraints the spine should have surfaced now rather than deferred:
- **500 MB database storage** and **1 GB file storage** on Free — tight for a catalog + card-art-cache + comprobante-upload use case, worth sizing against expected data volume.
- **Free projects auto-pause after 7 days of no database activity**, and are **capped at 2 active free projects per account** — directly relevant to whether PR-preview environments (which the deployment diagram shows hitting the same Postgres/Storage) can coexist with a low-traffic dev cadence without the project pausing mid-review.
- **Zero backup/point-in-time-recovery retention on Free** — meaningful given Supabase Storage is the system of record for comprobante files, which are the platform's core evidentiary artifact for AD-2's payment-confirmation model.

None of this is wrong, but none of it appears to have been checked against Supabase's actual current free-tier page either — the spine's free-tier claim is directionally correct but not verified to the level of specificity the mandate asks for.

- **Fix:** add the concrete caps (500 MB DB / 1 GB storage / 7-day pause / 2-project cap / zero backup retention) to the Deferred or Stack section so the risk is visible now, not just "revisit later."

### 5. [LOW / confirmed accurate] Better Auth over Auth.js — checks out

Verified: in early 2026 the Better Auth team took over maintenance of Auth.js (Auth.js now receives security-only updates; new feature development is Better-Auth-only), and Better Auth is the currently-recommended choice for new Next.js projects. This matches the spine's claim almost exactly, including the "maintenance-only mode in early 2026" framing. No issue.

### 6. [LOW / confirmed accurate] Next.js 16.3.3 (Active LTS) — checks out, including the coincidental date

Verified against nextjs.org's own blog: Next.js 16.x has been Active LTS since October 21, 2025 (remains Active LTS until Next 17 ships), and 16.3.3 is real — it's the version shipped in Next.js's **August 2026 security release** (fixing several CVEs, including request-smuggling and SSRF-via-rewrites issues), dated to land the same week as this spine's creation date. This is a case where the date coincidence is real, not fabricated. No issue — this claim was genuinely checked.

### 7. [LOW / informational] tRPC 11 + Next.js 16 App Router — no material incompatibility found

No known structural incompatibility between tRPC v11 and Next.js 16's App Router. tRPC v11 specifically rewrote its App Router integration and ships purpose-built links (`experimental_nextCacheLink`) for Next.js's `unstable_cache`/cache-tag model. One nuance worth a line in the spine (not currently present): Next.js 16's opt-in `cacheComponents` mode excludes data fetching from prerenders by default, so tRPC calls under that mode need explicit caching decisions — this is a configuration detail for implementation, not an architecture-level blocker.

### 8. [LOW / confirmed accurate] Tailwind CSS 4.3.3 — checks out

Verified on npm: `tailwindcss@4.3.3` is a real, current release (published mid-July 2026, no newer 4.4.x found as of the review date). Claim is accurate.

## Summary Table

| Claim | Verified? | Notes |
| --- | --- | --- |
| Next.js 16.3.3 (Active LTS) | Yes — accurate | Real Aug 2026 security release; 16.x genuinely Active LTS |
| tRPC 11.13.2 | Partially — stale | Live latest was 11.18.0/11.17.0 on the same claimed date |
| Prisma ORM 7.4.2 | Partially — stale | 7.6.0 already shipped; Prisma 8 already in RC; driver-adapter requirement unmentioned |
| Better Auth over Auth.js | Yes — accurate | Auth.js in maintenance-only since early 2026, confirmed |
| Tailwind CSS 4.3.3 | Yes — accurate | Confirmed current on npm |
| Supabase free tier (Postgres + Storage) | Partially — generic | Real caps (500MB/1GB/7-day pause/2-project cap/no backups) not cited |
| Vercel free tier (hosting + PR previews) | Feature claim accurate; **commercial-use restriction not checked** | Hobby ToS likely conflicts with a commission-taking marketplace |
| tRPC 11 + Next.js 16 App Router compatibility | Yes — no material gotcha found | Minor `cacheComponents` interaction worth a note |

## Sources

- [Next.js 16.3 blog](https://nextjs.org/blog/next-16-3)
- [Next.js Support Policy (LTS definitions)](https://nextjs.org/support-policy)
- [Next.js EOL/LTS tracker — 16.3.2 LTS, August 2026](https://eosl.date/eol/product/nextjs/)
- [@trpc/server — npm versions](https://www.npmjs.com/package/@trpc/server?activeTab=versions)
- [@trpc/client — npm versions](https://www.npmjs.com/package/@trpc/client?activeTab=versions)
- [tRPC v11 + Next.js App Router integration](https://dev.to/whoffagents/trpc-v11-nextjs-app-router-end-to-end-type-safety-without-the-boilerplate-4h5m)
- [Prisma changelog — v7.6.0](https://www.prisma.io/changelog/2026-03-27)
- [Prisma changelog — v7.4.2](https://www.prisma.io/changelog/2026-02-27)
- [Prisma 7 upgrade guide (driver adapters mandatory)](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma "Rust-free" architecture announcement](https://www.prisma.io/blog/from-rust-to-typescript-a-new-chapter-for-prisma-orm)
- [Prisma v8.0.0-rc.5 release notes](https://www.gitclear.com/open_repos/prisma/prisma/release/v8.0.0-rc.1-dev.8)
- [Better Auth vs NextAuth vs Clerk, 2026](https://supastarter.dev/blog/better-auth-vs-nextauth-vs-clerk)
- [Auth.js is now part of Better Auth — GitHub discussion](https://github.com/nextauthjs/next-auth/discussions/13252)
- [Tailwind CSS — npm versions](https://www.npmjs.com/package/tailwindcss?activeTab=versions)
- [Supabase Pricing 2026 breakdown](https://uibakery.io/blog/supabase-pricing)
- [Supabase Free Tier Limits 2026](https://aiagencyplus.com/supabase-free-tier-limits/)
- [Supabase Project Pausing docs](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Vercel Terms of Service](https://vercel.com/legal/terms)
- [Vercel Hobby Plan docs](https://vercel.com/docs/plans/hobby)
- [Vercel free tier limits 2026](https://www.promptstoproduct.com/vercel-free-tier-limits)
