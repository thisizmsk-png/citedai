# CitedAI

> Get your content cited by AI answer engines. Scan, fix, and monitor your AI citability.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## What is AEO?

**Answer Engine Optimization (AEO)** is the practice of optimizing your content to be cited by AI-generated answers — ChatGPT, Perplexity, Google AI Overviews, and Gemini. Traditional SEO gets you ranked. AEO gets you *cited*.

CitedAI scans your content, scores it across 3 dimensions with 14 checks, and tells you exactly what to fix.

---

## Features

### MVP (Built)
- [x] **AEO Scoring Engine** — deterministic 14-rule scoring (0-100) across 3 dimensions
- [x] **Free URL Scanner** — ungated, no signup required, instant score + top issues
- [x] **Issue Detector** — 14 issue types with severity, recommendations, and suggested code fixes
- [x] **Site Crawler** — sitemap.xml discovery + link-following fallback
- [x] **`/llms.txt` Detection** — checks if your site has the AI content index file
- [x] **Schema.org Analysis** — detects and scores JSON-LD structured data
- [x] **Landing Page** — conversion-optimized with free scanner, pricing, how-it-works
- [x] **Dashboard** — score gauges, issue list grouped by severity, dimension breakdown

### V2 (Planned)
- [ ] Citation monitoring across ChatGPT, Perplexity, Google AI Overviews
- [ ] Competitor citation comparison
- [ ] Multi-site agency dashboard
- [ ] Weekly scan scheduling
- [ ] Email alerts on score changes

### V3 (Future)
- [ ] AI rewrite suggestions (one-click fixes)
- [ ] CMS push (WordPress, Webflow, Ghost)
- [ ] REST API + webhooks for integrations
- [ ] White-label agency reports

---

## AEO Scoring Engine

Every page is scored 0-100 across three dimensions:

### Extractability (0-40)
Can AI find and parse your answers?

| Check | Max Points | What It Measures |
|-------|-----------|-----------------|
| Answer Blocks | 12 | Short definition paragraphs after headings |
| Definition Formatting | 8 | Clear "X is..." definitions in first paragraph |
| Step Lists | 6 | Ordered lists (how-to content) |
| Comparison Tables | 6 | HTML tables for structured comparisons |
| FAQ Structure | 8 | Question headings (H2/H3 ending with ?) |

### Authority (0-35)
Should AI trust your content?

| Check | Max Points | What It Measures |
|-------|-----------|-----------------|
| Schema Markup | 10 | JSON-LD structured data (Article, FAQ, HowTo) |
| Author Attribution | 5 | Named author with byline |
| Publication Date | 5 | Visible publish date |
| Source Citations | 10 | Outbound links to authoritative sources |
| /llms.txt | 5 | AI content index file at domain root |

### Freshness (0-25)
Is your content current?

| Check | Max Points | What It Measures |
|-------|-----------|-----------------|
| Updated Date | 8 | How recently the page was modified |
| Content Recency | 7 | References to current year, no outdated years |
| Version References | 5 | Software versions are current (not outdated) |
| Broken Links | 5 | All links still resolve (assumed OK in MVP) |

---

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+

### Setup

```bash
# Clone
git clone https://github.com/thisizmsk-png/citedai.git
cd citedai

# Install dependencies
pnpm install

# Set up environment
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your values (see Configuration below)

# Start development
cd apps/web && npx next dev --turbopack
```

The app runs at `http://localhost:3000`. The free URL scanner works immediately — no database required.

### With Full Stack (Database + Worker)

```bash
# 1. Set up Supabase (local or cloud)
npx supabase start  # or use cloud.supabase.com

# 2. Run database migrations
cd packages/db && npx drizzle-kit push

# 3. Start Redis (for job queue)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 4. Start the worker
cd apps/worker && npx tsx src/index.ts

# 5. Start the web app
cd apps/web && npx next dev --turbopack
```

---

## Architecture

```
citedai/
├── apps/
│   ├── web/              # Next.js 15 (App Router + Turbopack)
│   │   ├── src/app/
│   │   │   ├── page.tsx              # Landing page + free scanner
│   │   │   ├── dashboard/page.tsx    # Scan results dashboard
│   │   │   ├── auth/login/page.tsx   # Authentication
│   │   │   └── api/v1/
│   │   │       ├── analyze/route.ts  # Free URL analysis endpoint
│   │   │       ├── sites/route.ts    # Site management
│   │   │       └── scans/route.ts    # Scan management
│   │   └── src/lib/
│   │       ├── queue.ts              # BullMQ job dispatch
│   │       └── supabase/server.ts    # Supabase SSR client
│   └── worker/           # Background crawl worker
│       └── src/
│           ├── index.ts              # BullMQ consumer
│           └── crawl-handler.ts      # Crawl + parse + score pipeline
├── packages/
│   ├── scoring/          # AEO scoring engine (shared)
│   │   └── src/
│   │       ├── scorer.ts             # 14-rule scoring algorithm
│   │       └── issues.ts             # Issue detection + recommendations
│   ├── db/               # Database layer (Drizzle ORM)
│   │   └── src/
│   │       ├── schema.ts             # 9 tables, 8 enums, 7 indexes
│   │       └── client.ts             # Connection pool
│   └── shared/           # Types, constants, plan limits
│       └── src/
│           ├── types.ts              # AeoScore, Issue, CrawlJob, Plan
│           └── constants.ts          # Score weights, plan limits, settings
├── turbo.json            # Turborepo pipeline config
├── pnpm-workspace.yaml   # Monorepo workspace definitions
└── CLAUDE.md             # AI coding assistant context
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 15 (App Router) | RSC, Turbopack, shadcn/ui ecosystem |
| Styling | Tailwind CSS 4 | Utility-first, dark theme |
| Backend | Next.js API Routes | Simple, colocated with frontend |
| Database | PostgreSQL (Supabase) | Auth + DB + RLS in one |
| ORM | Drizzle | Type-safe, lightweight |
| Queue | BullMQ + Redis | Reliable job processing |
| Crawler | cheerio + fetch | Lightweight HTML parsing (no Puppeteer) |
| Auth | Supabase Auth | Free, integrated with RLS |
| Hosting | Vercel + Railway | Frontend + worker separation |

---

## API Reference

### POST /api/v1/analyze

Analyze a single URL for AEO readiness. No authentication required.

**Request:**
```json
{
  "url": "https://example.com/blog/my-post"
}
```

**Response:**
```json
{
  "data": {
    "url": "https://example.com/blog/my-post",
    "title": "My Blog Post Title",
    "wordCount": 1250,
    "score": 62,
    "extractability": 28,
    "authority": 20,
    "freshness": 14,
    "breakdown": {
      "answer_blocks": { "score": 8, "max": 12, "detail": "2 answer block(s) detected" },
      "schema_markup": { "score": 10, "max": 10, "detail": "1 schema(s)" }
    },
    "issues": [
      {
        "category": "authority",
        "severity": "critical",
        "description": "No Schema.org markup found",
        "recommendation": "Add Article or FAQ schema",
        "suggestedFix": "<script type=\"application/ld+json\">...</script>",
        "estimatedImpact": 9
      }
    ],
    "totalIssues": 8,
    "hasSchemaMarkup": true,
    "hasLlmsTxt": false,
    "schemaTypes": ["Article"]
  }
}
```

**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | MISSING_URL | No URL provided |
| 400 | INVALID_URL | Malformed URL |
| 422 | FETCH_FAILED | Target site returned non-200 |
| 504 | TIMEOUT | Target site took >10 seconds |
| 500 | INTERNAL_ERROR | Unexpected server error |

---

## Configuration

### Environment Variables

```bash
# Supabase (required for full stack, not needed for free scanner)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (required for background worker)
REDIS_URL=redis://localhost:6379

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Deployment

### Vercel (Frontend)

```bash
# Connect repo to Vercel
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Deploy
vercel --prod
```

### Railway (Worker)

```bash
# Create Railway project
railway init

# Deploy worker
railway up --service worker
```

### Estimated Costs (100 customers)

| Service | Cost/month |
|---------|-----------|
| Vercel (Pro) | $20 |
| Supabase (Free tier) | $0 |
| Railway (worker) | $5 |
| Redis (Upstash free) | $0 |
| **Total** | **$25** |

---

## Roadmap

- [x] **MVP** — Scoring engine, free scanner, landing page, dashboard
- [ ] **V1.1** — /llms.txt generator, Schema.org generator
- [ ] **V2** — Citation monitoring (ChatGPT, Perplexity, Google AI)
- [ ] **V2.1** — Competitor tracking, agency dashboard
- [ ] **V3** — AI rewrite agent, CMS integrations, REST API

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit changes (`git commit -m 'feat: add my feature'`)
4. Push to branch (`git push origin feat/my-feature`)
5. Open a Pull Request

---

## Credits

Built by the **Mahabharat Agents** panel — a multi-agent engineering team:
- **Krishna** (CEO): Strategic research across 5 sources
- **Draupadi** (PM): Product specification with zero-bias protocol
- **Arjuna** (Principal SDE): System architecture and tech stack
- **Duryodhana** (Red Team): Found critical flaws before build started
- **Bhima** (Sr. Engineer): Scaffolded and implemented the MVP
- **Shakuni** (Growth): Go-to-market playbook

Agent configuration: [claude-cortex](https://github.com/thisizmsk-png/claude-cortex)

## License

MIT
