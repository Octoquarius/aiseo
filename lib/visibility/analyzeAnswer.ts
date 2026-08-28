import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import type { ProbeResult } from "@/lib/types";

const ANALYZE_TOOL: Anthropic.Tool = {
  name: "report_brand_presence",
  description:
    "Report whether a specific brand appears in an AI answer, its rank, and its competitors.",
  input_schema: {
    type: "object",
    properties: {
      appeared: {
        type: "boolean",
        description: "Was the brand or its site recommended/mentioned in the answer?",
      },
      rank: {
        type: ["integer", "null"],
        description: "If mentioned, its position/prominence (1 = first/most prominent recommendation). null if not mentioned.",
      },
      snippet: {
        type: ["string", "null"],
        description: "The (short) sentence/quote mentioning the brand. null if not mentioned.",
      },
      competitors: {
        type: "array",
        description: "Other brand/site/product names (competitors) recommended in the answer, in order of prominence.",
        items: { type: "string" },
      },
    },
    required: ["appeared", "rank", "snippet", "competitors"],
  },
};

// Analyzes an engine's answer: whether the brand appeared, its rank, and competitors.
export async function analyzeAnswer(params: {
  brand: string;
  aliases: string[];
  query: string;
  answer: string;
  model?: string;
}): Promise<ProbeResult> {
  const anthropic = getAnthropic();
  const model = params.model || DEFAULT_MODEL;

  const prompt = `Below is a user question and the answer given by an AI assistant. Your task: determine whether the target brand was recommended in this answer.

Target brand: "${params.brand}"
Synonyms/domain for the brand: ${params.aliases.join(", ")}

User question: "${params.query}"

AI answer:
"""
${params.answer.slice(0, 6000)}
"""

Determine:
- appeared: Was the target brand (or its domain) recommended in the answer?
- rank: If recommended, how prominent is it among the recommended options (1 = first).
- snippet: A short quote mentioning the brand.
- competitors: OTHER brand/site names recommended in the answer.

Return the result only via the report_brand_presence tool.`;

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
