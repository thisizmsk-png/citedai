# CitedAI -- AEO Platform

> **Read this first.** This file is loaded automatically by Claude Code to provide full project context.

---

## What This Project Does

CitedAI is a SaaS platform that helps businesses get their content cited by AI answer engines (ChatGPT, Perplexity, Google AI Overviews). It crawls a user's website, scores each page on AI-citability across three dimensions (Extractability, Authority, Freshness), and provides prioritized, actionable recommendations to improve those scores.

Target: solo founder building to first 100 customers. 100 sites, up to 500 pages each, scanning daily -- roughly 50K pages/day at peak.

---

## Tech Stack

| Layer | Technology | Where |
|-------|-----------|-------|
| Frontend | Next.js 15 (App Router, RSC) | Vercel |
| Styling | Tailwind CSS v4, shadcn/ui | apps/web |
| API | Next.js API Routes (CRUD + auth) | Vercel Serverless |
| Worker | Node.js + BullMQ (long-running crawls) | Railway |
| Database | PostgreSQL via Supabase | Supabase |
| ORM | Drizzle ORM | packages/db |
| Auth | Supabase Auth (JWT + OAuth) | Supabase |
| Queue | BullMQ + Redis | Railway |
| Billing | Stripe | External |
| Email | Resend | External |
| Monorepo | Turborepo + pnpm workspaces | Root |
| Language | TypeScript (strict) throughout | All |

---

## Critical Commands

```bash
# Install dependencies
pnpm install

# Development (all workspaces)
pnpm dev

# Build all
pnpm build

# Run tests
pnpm test

# Database
pnpm db:generate        # Generate Drizzle migrations
pnpm db:migrate         # Run migrations
pnpm db:push            # Push schema to DB (dev only)
pnpm db:studio          # Open Drizzle Studio

# Individual workspace dev
pnpm --filter @citedai/web dev
pnpm --filter @citedai/worker dev

# Lint
pnpm lint
```

---

## Project Structure

```
citedai/
├── CLAUDE.md                         <- You are here
├── package.json                      <- Root monorepo config
├── pnpm-workspace.yaml               <- Workspace definitions
├── turbo.json                        <- Turborepo pipeline config
├── tsconfig.json                     <- Base TypeScript config
├── .env.example                      <- Environment variable template
├── .gitignore
│
├── apps/
│   ├── web/                          <- Next.js 15 frontend + API routes
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx        <- Root layout
│   │   │   │   ├── page.tsx          <- Landing page
│   │   │   │   ├── dashboard/        <- Dashboard pages
│   │   │   │   ├── auth/             <- Auth pages
│   │   │   │   └── api/v1/           <- API routes
│   │   │   │       ├── sites/        <- Site CRUD
│   │   │   │       ├── scans/        <- Scan dispatch
│   │   │   │       └── analyze/      <- Single-page analysis
│   │   │   ├── lib/
│   │   │   │   ├── supabase/         <- Supabase client helpers
│   │   │   │   └── queue.ts          <- BullMQ queue instance
│   │   │   └── components/           <- React components
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── worker/                       <- Crawl worker (Railway)
│       ├── src/
│       │   ├── index.ts              <- BullMQ worker entry
│       │   └── crawl-handler.ts      <- Crawl job processor
│       └── package.json
│
├── packages/
│   ├── db/                           <- Drizzle ORM + schema
│   │   ├── src/
│   │   │   ├── schema.ts            <- Full DB schema (tables, enums, relations, indexes)
│   │   │   ├── client.ts            <- Drizzle client instance
│   │   │   └── index.ts             <- Public exports
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── scoring/                      <- AEO scoring engine (shared)
│   │   ├── src/
│   │   │   ├── scorer.ts            <- Deterministic scoring rules
│   │   │   ├── issues.ts            <- Issue detection
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── shared/                       <- Types, utils, constants
│       ├── src/
│       │   ├── types.ts             <- All shared TypeScript types
│       │   ├── constants.ts         <- Plan limits, scoring weights, queue names
│       │   └── index.ts
│       └── package.json
```

---

## Data Model

Full schema is in `packages/db/src/schema.ts`. Key tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (plan, Stripe IDs) |
| `sites` | Monitored domains (verified, settings) |
| `scans` | Scan jobs (status, aggregate scores) |
| `pages` | Per-page results per scan (scores, breakdown) |
| `issues` | Individual AEO issues (category, severity, fix suggestion) |
| `citations` | V2: tracked AI citations |
| `monitored_queries` | V2: queries to monitor across AI platforms |
| `competitors` | Competitor domains to compare against |
| `api_keys` | User API keys (hashed) |

Multi-tenancy via Supabase Row Level Security. Pages stored per-scan (not deduplicated) to enable historical comparison.

---

## Scoring Engine

Three dimensions, deterministic rules, no LLM:

| Dimension | Max Points | What It Measures |
|-----------|-----------|-----------------|
| Extractability | 40 | Answer blocks, definitions, step lists, tables, FAQ structure |
| Authority | 35 | Schema markup, author, pub date, citations, /llms.txt |
| Freshness | 25 | Updated date, content recency, version refs, broken links |

Implementation: `packages/scoring/src/scorer.ts`

---

## Architecture Decisions

- **Next.js API Routes for CRUD, separate worker for crawling.** Crawling 500 pages takes 5-15 min. Cannot run in serverless. Worker is a persistent Node.js process on Railway consuming BullMQ jobs.
- **Supabase for everything managed.** Auth + DB + Realtime + Storage in one platform. RLS for multi-tenancy.
- **BullMQ + Redis for job queue.** Progress events, retry with backoff, rate limiting, job priorities.
- **Drizzle ORM.** Type-safe, SQL-like API, lightweight. No magic. Generates clean migrations.
- **Page data stored per scan.** Enables "did this page improve?" comparisons. Storage is cheap.
- **Issues as separate table.** Need to filter by severity, category, resolved status independently.
- **No soft delete (MVP).** Supabase point-in-time recovery is sufficient for now.

---

## Development Conventions

- **TypeScript strict mode** everywhere. No `any`. No `as` casts without justification.
- **pnpm workspaces** for dependency management. Use `workspace:*` for internal deps.
- **Shared types in `@citedai/shared`**. Never duplicate types across packages.
- **Environment variables** via `.env` at root. Copy from `.env.example`.
- **Error handling**: wrap external calls in try/catch. Never let a single page failure crash a scan.
- **Logging**: `console.log` with `[module]` prefix for now. Structured logging (pino) in V2.
- **No premature abstraction**. Three similar lines > one clever abstraction.
- **Tests**: Vitest for packages, Playwright for E2E (future).

---

## HLD Reference

Full High-Level Design document: `docs/HLD_AEO_Platform.md` (in the youtube-automation-framework repo where this project was designed).

---

## Global Skills Reference

Global skills at `~/.claude/` apply to this project. Key relevant skills:
- `/lld` -- Low-level design
- `/code-review` -- Code review
- `/testing` -- Test writing
- `/database-design` -- Schema design
- `/api-design` -- REST API design
- `/hld` -- High-level design
- `/aeo-optimization` -- AEO domain knowledge
