# AISEO

An analysis tool that makes your website more **visible and recommendable** to AI engines
(ChatGPT, Perplexity, Claude, Google AI Overviews). See [PLAN.md](./PLAN.md) for a product
overview.

## Setup

### 1. Dependencies
```bash
npm install
```

### 2. Supabase
1. Create a project on [supabase.com](https://supabase.com).
2. Run `supabase/migrations/0001_init.sql` in the SQL Editor (tables + RLS + trigger).
3. Enable Authentication → Providers → Email. (For development, if you disable "Confirm email",
   you'll be signed in immediately after signup.)

### 3. Environment variables
Copy `.env.example` to `.env.local` and fill it in:
```
NEXT_PUBLIC_SUPABASE_URL=...          # Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...         # secret — server only
ANTHROPIC_API_KEY=...                 # console.anthropic.com
```

### 4. Running
```bash
npm run dev      # http://localhost:3000
npm run test     # unit tests (lib/analysis)
npm run build    # production build
npm run lint
```

## Usage
1. Sign up / log in.
2. Add one or more URLs from the dashboard → they're analyzed automatically.
3. See the score on the site card, click for details.
4. In the **Improvements** tab, for each issue click **Improve** → see where/how to add the
   fix, copy it, mark it as "Fixed".

## How it works
The analysis is performed on raw HTML without executing JavaScript — i.e. what LLM crawlers
see. Pipeline: `sanitizeUrl → fetchHtml → extractFeatures + checkRobots → claudeAudit`
(see `lib/analysis/`). Claude returns structured JSON via tool use; each issue becomes an
`improvements` record.

> Note: Sites that render heavily with JS show little content in raw HTML; the tool reports
> this as a warning/issue (most LLMs don't execute JS either).
