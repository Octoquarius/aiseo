# AISEO — AI Visibility & Recommendability Tool (Plan)

Inspired by the n8n "AI SEO Readability Audit" flow; a membership-based web application aimed
at making websites **more visible and recommendable to AI engines (ChatGPT, Perplexity,
Claude, Google AI Overviews)**.

## Phase 1 — MVP (this codebase)
- ✅ Membership system (Supabase Auth, email + password)
- ✅ Add as many URLs as you like (multiple at once)
- ✅ Unified **Dashboard** for all URLs (average GEO score, number of open improvements)
- ✅ **GEO/AEO analysis engine** over JS-free HTML (port of the n8n logic + extensions)
  - URL sanitization → HTML fetch (Googlebot UA) → feature extraction with cheerio
  - `robots.txt` / `llms.txt` scanning (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…)
  - Structured audit via Claude → 6 category scores + a concrete list of issues
- ✅ **Improvements** UI: an **Improve** button for each issue → code location + current code +
  copyable suggested code + explanation; "Fixed/Ignore" status management
- ✅ Site detail page (category scores + summary + open improvements)

## Phase 2 — Next (schema ready, population logic pending)
- ⏳ Prompt-based **AI visibility tracking** (seed queries → LLM → brand detection, cron)
- ⏳ **Sales conversion** attribution via embeddable **JS snippet** for AI referrers
  (chatgpt.com / perplexity.ai)
- ⏳ Payment / plan upgrades

> The related tables (`visibility_queries`, `visibility_results`, `conversions`) are already
> set up with RLS in `supabase/migrations/0001_init.sql`.

## Tech stack
Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres + Auth + RLS)
· Claude (`@anthropic-ai/sdk`, default `claude-sonnet-4-6`) · cheerio · Vercel.

## GEO/AEO score categories
`ai_crawlability` · `structured_data` · `content_structure` · `entity_authority` ·
`readability` · `recommendability`

## Architecture
```
app/(auth)        → login / signup + auth server actions
app/(dashboard)   → dashboard / sites/[id] / improvements + site/audit server actions
lib/analysis/*    → sanitizeUrl, fetchHtml, extractFeatures, checkRobots, claudeAudit, runAudit
lib/supabase/*    → client / server / admin / middleware (session)
supabase/migrations → schema + RLS
```

See `README.md` for setup.
