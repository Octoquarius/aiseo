# AISEO

Web sitenizi AI motorları (ChatGPT, Perplexity, Claude, Google AI Overviews) için daha
**görünür ve önerilebilir** hale getiren analiz aracı. Ürüne genel bakış için [PLAN.md](./PLAN.md).

## Kurulum

### 1. Bağımlılıklar
```bash
npm install
```

### 2. Supabase
1. [supabase.com](https://supabase.com) üzerinde bir proje oluşturun.
2. SQL Editor'de `supabase/migrations/0001_init.sql` dosyasını çalıştırın (tablolar + RLS + trigger).
3. Authentication → Providers → Email'i etkinleştirin. (Geliştirme için "Confirm email"
   kapatılırsa kayıt sonrası anında giriş olur.)

### 3. Ortam değişkenleri
`.env.example`'ı `.env.local` olarak kopyalayıp doldurun:
```
NEXT_PUBLIC_SUPABASE_URL=...          # Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...         # gizli — yalnızca sunucu
ANTHROPIC_API_KEY=...                 # console.anthropic.com
```

### 4. Çalıştırma
```bash
npm run dev      # http://localhost:3000
npm run test     # birim testler (lib/analysis)
npm run build    # üretim derlemesi
npm run lint
```

## Kullanım
1. Kaydol / giriş yap.
2. Dashboard'dan bir veya birden çok URL ekle → otomatik analiz edilir.
3. Site kartından skoru gör, detay için tıkla.
4. **Improvements** sekmesinde her sorunda **Improve** → kodu nereye/nasıl ekleyeceğini gör,
   kopyala, "Düzeltildi" olarak işaretle.

## Nasıl çalışır
Analiz, JavaScript çalıştırılmadan ham HTML üzerinden yapılır — yani LLM tarayıcılarının
gördüğü hali. Pipeline: `sanitizeUrl → fetchHtml → extractFeatures + checkRobots → claudeAudit`
(bkz. `lib/analysis/`). Claude, tool-use ile yapısal JSON döndürür; her sorun bir
`improvements` kaydına dönüşür.

> Not: Ağır JS ile render edilen siteler ham HTML'de az içerik gösterir; araç bunu bir
> uyarı/issue olarak raporlar (LLM'ler de genelde JS çalıştırmaz).
