import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import type { ProbeResult } from "@/lib/types";

const ANALYZE_TOOL: Anthropic.Tool = {
  name: "report_brand_presence",
  description:
    "Bir AI cevabında belirli bir markanın geçip geçmediğini, sırasını ve rakiplerini raporla.",
  input_schema: {
    type: "object",
    properties: {
      appeared: {
        type: "boolean",
        description: "Marka veya sitesi cevapta önerildi/anıldı mı?",
      },
      rank: {
        type: ["integer", "null"],
        description: "Anıldıysa kaçıncı sırada/önemde (1 = ilk/öne çıkan öneri). Anılmadıysa null.",
      },
      snippet: {
        type: ["string", "null"],
        description: "Markadan bahseden cümle/alıntı (kısa). Anılmadıysa null.",
      },
      competitors: {
        type: "array",
        description: "Cevapta önerilen diğer marka/site/ürün adları (rakipler), önem sırasına göre.",
        items: { type: "string" },
      },
    },
    required: ["appeared", "rank", "snippet", "competitors"],
  },
};

// Bir motorun cevabını analiz eder: marka geçti mi, sıra, rakipler.
export async function analyzeAnswer(params: {
  brand: string;
  aliases: string[];
  query: string;
  answer: string;
  model?: string;
}): Promise<ProbeResult> {
  const anthropic = getAnthropic();
  const model = params.model || DEFAULT_MODEL;

  const prompt = `Aşağıda bir kullanıcı sorusu ve bir AI asistanının verdiği cevap var. Görevin: hedef markanın bu cevapta önerilip önerilmediğini tespit etmek.

Hedef marka: "${params.brand}"
Marka için eşanlamlılar/alan adı: ${params.aliases.join(", ")}

Kullanıcı sorusu: "${params.query}"

AI cevabı:
"""
${params.answer.slice(0, 6000)}
"""

Tespit et:
- appeared: Hedef marka (veya alan adı) cevapta önerildi mi?
- rank: Önerildiyse, önerilen seçenekler arasında kaçıncı/ne kadar öne çıkıyor (1 = ilk).
- snippet: Markadan bahseden kısa alıntı.
- competitors: Cevapta önerilen DİĞER marka/site adları.

Sonucu yalnızca report_brand_presence aracıyla ver.`;

  const res = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    temperature: 0,
    tools: [ANALYZE_TOOL],
    tool_choice: { type: "tool", name: "report_brand_presence" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  const raw = (toolUse?.input ?? {}) as Partial<ProbeResult>;

  return {
    appeared: !!raw.appeared,
    rank: typeof raw.rank === "number" ? raw.rank : null,
    snippet: raw.snippet ?? null,
    competitors: Array.isArray(raw.competitors) ? raw.competitors.slice(0, 10) : [],
    raw_answer: params.answer,
  };
}
