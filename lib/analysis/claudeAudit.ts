import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import type { AuditResult, HtmlFeatures, RobotsInfo, GeoCategory } from "@/lib/types";

// Claude'u yapısal çıktıya zorlamak için tool-use şeması.
const AUDIT_TOOL: Anthropic.Tool = {
  name: "report_geo_audit",
  description:
    "Bir web sayfasının AI motorları (ChatGPT, Perplexity, Claude, Google AI Overviews) açısından görünürlük ve önerilebilirlik denetim sonucunu raporla.",
  input_schema: {
    type: "object",
    properties: {
      overall_score: {
        type: "integer",
        description: "0-100 arası genel GEO/AEO skoru.",
      },
      summary: {
        type: "string",
        description: "Sitenin mevcut durumunun EN FAZLA 2-3 kısa cümlelik özeti (Türkçe). Uzun yazma.",
      },
      category_scores: {
        type: "object",
        description: "Her kategori için 0-100 skor.",
        properties: {
          ai_crawlability: { type: "integer" },
          structured_data: { type: "integer" },
          content_structure: { type: "integer" },
          entity_authority: { type: "integer" },
          readability: { type: "integer" },
          recommendability: { type: "integer" },
        },
        required: [
          "ai_crawlability",
          "structured_data",
          "content_structure",
          "entity_authority",
          "readability",
          "recommendability",
        ],
      },
      issues: {
        type: "array",
        description:
          "ZORUNLU. Sitenin AI tarafından daha görünür ve önerilebilir olması için yapılması gereken somut iyileştirmeler. En etkili 5-8 madde (her zaman en az 3 madde üret). Kod örneklerini kısa ve odaklı tut.",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [
                "ai_crawlability",
                "structured_data",
                "content_structure",
                "entity_authority",
                "readability",
                "recommendability",
              ],
            },
            severity: { type: "string", enum: ["high", "medium", "low"] },
            title: { type: "string", description: "Kısa başlık (Türkçe)." },
            description: {
              type: "string",
              description: "Sorunun ve neden önemli olduğunun açıklaması (Türkçe).",
            },
            code_location: {
              type: "string",
              description:
                "Düzeltmenin sitenin kodunda nereye gireceği (ör. '<head> içine', 'ürün şablonu', 'robots.txt').",
            },
            current_code: {
              type: "string",
              description: "Varsa mevcut/eksik kodun durumu; yoksa kısa not.",
            },
            suggested_code: {
              type: "string",
              description:
                "Kopyalanıp yapıştırılabilir önerilen kod (HTML/JSON-LD/metin). Gerçek, geçerli kod olmalı.",
            },
          },
          required: [
            "category",
            "severity",
            "title",
            "description",
            "code_location",
            "current_code",
            "suggested_code",
          ],
        },
      },
    },
    required: ["overall_score", "summary", "category_scores", "issues"],
  },
};

function buildPrompt(features: HtmlFeatures, robots: RobotsInfo): string {
  return `Bir web sayfasının AI arama motorları (ChatGPT, Perplexity, Claude, Google AI Overviews) açısından GÖRÜNÜRLÜĞÜNÜ ve ÖNERİLEBİLİRLİĞİNİ (GEO/AEO) değerlendiren bir uzmansın. HTML, JavaScript çalıştırılmadan çekildi — yani LLM tarayıcılarının gördüğü hali.

Amaç sadece okunabilirlik değil; sitenin AI tarafından bir cevapta KAYNAK gösterilme ve ÖNERİLME olasılığını artırmak.

## Teknik Tarama Özeti
- Final URL: ${features.finalUrl} (HTTP ${features.statusCode})
- Dil: ${features.lang ?? "belirtilmemiş"}
- Görünür metin uzunluğu: ${features.visibleTextLength} karakter
- Başlık (title): ${features.title ?? "YOK"}
- Meta description: ${features.hasMetaDescription ? features.metaDescription : "YOK"}
- H1 sayısı: ${features.h1Count} | H2: ${features.hasH2} | H3: ${features.hasH3}
- Başlık taslağı: ${features.headingOutline.slice(0, 15).join(" | ") || "yok"}
- Open Graph: ${features.hasOpenGraph} | Twitter Card: ${features.hasTwitterCard} | Canonical: ${features.hasCanonical}
- Yapısal veri (JSON-LD) tipleri: ${features.structuredDataTypes.join(", ") || "YOK"}
- FAQ içeriği: ${features.hasFaq} | Liste sayısı: ${features.listCount} | Tablo: ${features.tableCount}
- Tarih/güncellik sinyali: ${features.hasDateSignal}
- İç bağlantı: ${features.internalLinkCount} | Dış bağlantı: ${features.externalLinkCount}
- Görsel: ${features.imageCount} (alt eksik: ${features.imagesMissingAlt})
- <noscript> fallback: ${features.hasNoscript} | JS-engelleme uyarısı: ${features.jsWarning}

## robots.txt / llms.txt
- robots.txt bulundu: ${robots.robotsTxtFound}
- Sitemap tanımlı: ${robots.sitemapFound}
- llms.txt bulundu: ${robots.llmsTxtFound}
- ENGELLENEN AI botları: ${robots.blockedAiBots.join(", ") || "yok"}
- İzinli AI botları: ${robots.allowedAiBots.join(", ") || "yok"}

## İçerik önizleme (ilk 500 karakter)
"${features.previewText}"

## Görev
Bu sayfayı 6 kategoride değerlendir (ai_crawlability, structured_data, content_structure, entity_authority, readability, recommendability) ve 0-100 genel skor ver. Her sorun için kopyalanabilir GERÇEK kod örneği üret (ör. eksik JSON-LD şeması, llms.txt içeriği, robots.txt düzeltmesi, FAQ blok HTML'i).

Önemli kurallar:
- Görünür metin 300 karakterin altındaysa veya JS-engelleme uyarısı varsa, sitenin JS bağımlılığı nedeniyle LLM'lere erişilemez olabileceğini issue olarak belirt.
- Engellenen AI botu varsa bunu yüksek öncelikli (high) bir issue yap ve düzeltilmiş robots.txt ver.
- "recommendability" kategorisinde, sitenin nişinde AI'ın öne çıkardığı türden terim/ifade ve karşılaştırma/otorite içeriği eksikse öner.

Sonucu yalnızca report_geo_audit aracını çağırarak ver.`;
}

export async function claudeAudit(
  features: HtmlFeatures,
  robots: RobotsInfo,
  model: string = DEFAULT_MODEL,
): Promise<{ result: AuditResult; model: string }> {
  const anthropic = getAnthropic();

  const response = await anthropic.messages.create({
    model,
    max_tokens: 8192,
    temperature: 0.3,
    tools: [AUDIT_TOOL],
    tool_choice: { type: "tool", name: "report_geo_audit" },
    messages: [{ role: "user", content: buildPrompt(features, robots) }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    // max_tokens'a takılıp tool çıktısı tamamlanmadıysa burada yakalanır.
    throw new Error(
      `Claude yapısal denetim sonucu döndürmedi (stop_reason: ${response.stop_reason}).`,
    );
  }

  const raw = toolUse.input as {
    overall_score: number;
    summary: string;
    category_scores: Record<GeoCategory, number>;
    issues: AuditResult["issues"];
  };

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n || 0)));
  const category_scores = Object.fromEntries(
    Object.entries(raw.category_scores ?? {}).map(([k, v]) => [k, clamp(v as number)]),
  ) as Record<GeoCategory, number>;

  return {
    result: {
      overall_score: clamp(raw.overall_score),
      summary: raw.summary ?? "",
      category_scores,
      issues: Array.isArray(raw.issues) ? raw.issues : [],
    },
    model,
  };
}
