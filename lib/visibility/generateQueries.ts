import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";

const QUERY_TOOL: Anthropic.Tool = {
  name: "report_seed_queries",
  description:
    "Bir markanın AI motorlarında görünürlüğünü test etmek için kullanılacak gerçekçi kullanıcı sorularını raporla.",
  input_schema: {
    type: "object",
    properties: {
      queries: {
        type: "array",
        description:
          "Gerçek kullanıcıların bu sektörde bir ürün/hizmet ararken AI'a soracağı türden, MARKAYI İÇERMEYEN sorular. 5-7 adet.",
        items: { type: "string" },
      },
    },
    required: ["queries"],
  },
};

// Site bağlamından (marka, URL, içerik önizleme) tohum sorgular üretir.
// Sorular markayı içermez; amaç markanın 'organik' olarak önerilip önerilmediğini ölçmek.
export async function generateQueries(params: {
  brand: string;
  url: string;
  contextSummary?: string;
  previewText?: string;
  model?: string;
}): Promise<string[]> {
  const anthropic = getAnthropic();
  const model = params.model || DEFAULT_MODEL;

  const prompt = `Bir markanın AI arama motorlarındaki (ChatGPT, Perplexity, Claude) görünürlüğünü ölçeceğiz.

Marka: ${params.brand}
Site: ${params.url}
${params.contextSummary ? `Site özeti: ${params.contextSummary}` : ""}
${params.previewText ? `İçerik önizleme: "${params.previewText.slice(0, 300)}"` : ""}

Görev: Bu markanın sektöründe, gerçek kullanıcıların bir ürün/hizmet/öneri ararken bir AI asistanına soracağı türden 5-7 doğal soru üret.

Kurallar:
- Sorular MARKA ADINI İÇERMEMELİ (amaç: marka kendiliğinden önerilecek mi?).
- Türkçe, doğal, satın alma/öneri niyeti taşıyan sorular olsun.
- Örnek kalıp: "en iyi ... markaları neler?", "... için hangi ...yi önerirsin?", "uygun fiyatlı ... nereden alınır?".
- Sektöre özgü ve spesifik ol; çok genel olma.

Sonucu yalnızca report_seed_queries aracıyla ver.`;

  const res = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    temperature: 0.7,
    tools: [QUERY_TOOL],
    tool_choice: { type: "tool", name: "report_seed_queries" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  const queries = (toolUse?.input as { queries?: string[] })?.queries ?? [];
  return queries.map((q) => q.trim()).filter(Boolean).slice(0, 7);
}
