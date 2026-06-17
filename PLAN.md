# AISEO — AI Görünürlük & Önerilebilirlik Aracı (Plan)

n8n "AI SEO Readability Audit" akışından ilhamla; web sitelerini **AI motorları (ChatGPT,
Perplexity, Claude, Google AI Overviews) için daha görünür ve önerilebilir** hale getirmeyi
amaçlayan, üyelikli bir web uygulaması.

## Faz 1 — MVP (bu kod tabanı)
- ✅ Üyelik sistemi (Supabase Auth, e-posta + şifre)
- ✅ İstediğiniz kadar URL ekleme (aynı anda, çoklu)
- ✅ Tüm URL'lerin birleşik **Dashboard**'u (ortalama GEO skoru, açık iyileştirme sayısı)
- ✅ JS'siz HTML üzerinden **GEO/AEO analiz motoru** (n8n mantığının portu + genişletme)
  - URL temizleme → HTML çekme (Googlebot UA) → cheerio ile özellik çıkarımı
  - `robots.txt` / `llms.txt` taraması (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…)
  - Claude ile yapısal denetim → 6 kategori skoru + somut sorun listesi
- ✅ **Improvements** arayüzü: her sorunda **Improve** butonu → kodun yeri + mevcut kod +
  kopyalanabilir önerilen kod + açıklama; "Düzeltildi/Yok say" durum yönetimi
- ✅ Site detay sayfası (kategori skorları + özet + açık iyileştirmeler)

## Faz 2 — Sonraki (şema hazır, dolum mantığı bekliyor)
- ⏳ Prompt tabanlı **AI görünürlük takibi** (tohum sorgular → LLM → marka tespiti, cron)
- ⏳ Gömülebilir **JS snippet** ile AI-referrer (chatgpt.com / perplexity.ai) **satış dönüşümü** atfı
- ⏳ Ödeme / plan yükseltme

> İlgili tablolar (`visibility_queries`, `visibility_results`, `conversions`)
> `supabase/migrations/0001_init.sql` içinde RLS ile hazır.

## Teknoloji
Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres + Auth + RLS)
· Claude (`@anthropic-ai/sdk`, varsayılan `claude-sonnet-4-6`) · cheerio · Vercel.

## GEO/AEO Skor Kategorileri
`ai_crawlability` · `structured_data` · `content_structure` · `entity_authority` ·
`readability` · `recommendability`

## Mimari
```
app/(auth)        → login / signup + auth server actions
app/(dashboard)   → dashboard / sites/[id] / improvements + site/audit server actions
lib/analysis/*    → sanitizeUrl, fetchHtml, extractFeatures, checkRobots, claudeAudit, runAudit
lib/supabase/*    → client / server / admin / middleware (session)
supabase/migrations → şema + RLS
```

Kurulum için `README.md`.
