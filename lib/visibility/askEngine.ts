import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import type { VisibilityEngine } from "@/lib/types";

// Web-search-enabled Claude — the model answers based on live web results.
// This closely mirrors the behavior of real AI search engines (ChatGPT-search, Perplexity).
async function askClaudeWeb(query: string, model: string): Promise<string> {
  const anthropic = getAnthropic();

  // web_search is a server-side tool; we cast because the SDK type definition can vary by version.
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
        content: `${query}\n\nAnswer with concrete brand/product/site recommendations, based on current and factual information.`,
      },
    ],
  });

  // Concatenate all text blocks (the final answer that follows the web search results).
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
      throw new Error(`Unsupported engine: ${engine}`);
  }
}
