import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";

const QUERY_TOOL: Anthropic.Tool = {
  name: "report_seed_queries",
  description:
    "Report realistic user questions to be used for testing a brand's visibility in AI engines.",
  input_schema: {
    type: "object",
    properties: {
      queries: {
        type: "array",
        description:
          "Questions of the kind real users would ask an AI when looking for a product/service in this industry, WITHOUT MENTIONING THE BRAND. 5-7 items.",
        items: { type: "string" },
      },
    },
    required: ["queries"],
  },
};

// Generates seed queries from site context (brand, URL, content preview).
// The queries don't mention the brand; the goal is to measure whether the brand is 'organically' recommended.
export async function generateQueries(params: {
  brand: string;
  url: string;
  contextSummary?: string;
  previewText?: string;
  model?: string;
}): Promise<string[]> {
  const anthropic = getAnthropic();
  const model = params.model || DEFAULT_MODEL;

  const prompt = `We're going to measure a brand's visibility in AI search engines (ChatGPT, Perplexity, Claude).

Brand: ${params.brand}
Site: ${params.url}
${params.contextSummary ? `Site summary: ${params.contextSummary}` : ""}
${params.previewText ? `Content preview: "${params.previewText.slice(0, 300)}"` : ""}

Task: Generate 5-7 natural questions of the kind real users would ask an AI assistant when looking for a product/service/recommendation in this brand's industry.

Rules:
- Questions MUST NOT MENTION THE BRAND NAME (goal: will the brand be recommended organically?).
- Make them natural, English questions carrying purchase/recommendation intent.
- Example patterns: "what are the best ... brands?", "which ... would you recommend for ...?", "where can I find affordable ...?".
- Be industry-specific and concrete; don't be too generic.

Return the result only via the report_seed_queries tool.`;

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
