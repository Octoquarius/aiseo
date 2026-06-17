import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import type { VisibilityEngine } from "@/lib/types";

// Web aramalı Claude — model canlı web sonuçlarına dayanarak cevap verir.
// Bu, gerçek AI arama motorlarının (ChatGPT-search, Perplexity) davranışına yakındır.
async function askClaudeWeb(query: string, model: string): Promise<string> {
  const anthropic = getAnthropic();

  // web_search bir sunucu aracıdır; SDK tip tanımı sürüme göre değişebildiğinden cast ediyoruz.
  const webSearchTool = {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 5,
  } as unknown as Anthropic.Tool;

  const res = await anthropic.messages.create({
    model,
    max_tokens: 1500,
    tools: [webSearchTool],
    messages: [
      {
        role: "user",
        content: `${query}\n\nGüncel ve gerçek bilgiye dayanarak, somut marka/ürün/site önerileriyle yanıtla.`,
      },
    ],
  });

  // Tüm metin bloklarını birleştir (web arama sonuçlarından sonra gelen nihai cevap).
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export async function askEngine(
  engine: VisibilityEngine,
  query: string,
  model: string = DEFAULT_MODEL,
): Promise<string> {
  switch (engine) {
    case "claude-web":
      return askClaudeWeb(query, model);
    default:
      throw new Error(`Desteklenmeyen motor: ${engine}`);
  }
}
