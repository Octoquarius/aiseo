import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import type { AuditResult, HtmlFeatures, RobotsInfo, GeoCategory } from "@/lib/types";

// Tool-use schema to force Claude into structured output.
const AUDIT_TOOL: Anthropic.Tool = {
  name: "report_geo_audit",
  description:
    "Report the visibility and recommendability audit result for a web page with respect to AI engines (ChatGPT, Perplexity, Claude, Google AI Overviews).",
  input_schema: {
    type: "object",
    properties: {
      overall_score: {
        type: "integer",
        description: "Overall GEO/AEO score from 0-100.",
      },
      summary: {
        type: "string",
        description: "A summary of the site's current state in AT MOST 2-3 short sentences (English). Don't write long text.",
      },
      category_scores: {
        type: "object",
        description: "A 0-100 score for each category.",
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
          "REQUIRED. Concrete improvements needed to make the site more visible and recommendable to AI. The 5-8 most impactful items (always produce at least 3 items). Keep code samples short and focused.",
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
            title: { type: "string", description: "Short title (English)." },
            description: {
              type: "string",
              description: "Explanation of the issue and why it matters (English).",
            },
            code_location: {
              type: "string",
              description:
                "Where the fix goes in the site's code (e.g. 'inside <head>', 'product template', 'robots.txt').",
            },
            current_code: {
              type: "string",
              description: "The current/missing code if any; otherwise a brief note.",
            },
            suggested_code: {
              type: "string",
              description:
                "Suggested code that can be copy-pasted (HTML/JSON-LD/text). Must be real, valid code.",
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
  return `You are an expert evaluating a web page's VISIBILITY and RECOMMENDABILITY (GEO/AEO) with respect to AI search engines (ChatGPT, Perplexity, Claude, Google AI Overviews). The HTML was fetched without executing JavaScript — i.e. what LLM crawlers see.

The goal isn't just readability; it's increasing the likelihood that the site gets CITED as a SOURCE and RECOMMENDED by AI in an answer.

## Technical Scan Summary
- Final URL: ${features.finalUrl} (HTTP ${features.statusCode})
- Language: ${features.lang ?? "not specified"}
- Visible text length: ${features.visibleTextLength} characters
- Title: ${features.title ?? "NONE"}
- Meta description: ${features.hasMetaDescription ? features.metaDescription : "NONE"}
- H1 count: ${features.h1Count} | H2: ${features.hasH2} | H3: ${features.hasH3}
- Heading outline: ${features.headingOutline.slice(0, 15).join(" | ") || "none"}
- Open Graph: ${features.hasOpenGraph} | Twitter Card: ${features.hasTwitterCard} | Canonical: ${features.hasCanonical}
- Structured data (JSON-LD) types: ${features.structuredDataTypes.join(", ") || "NONE"}
- FAQ content: ${features.hasFaq} | List count: ${features.listCount} | Tables: ${features.tableCount}
- Date/freshness signal: ${features.hasDateSignal}
- Internal links: ${features.internalLinkCount} | External links: ${features.externalLinkCount}
- Images: ${features.imageCount} (missing alt: ${features.imagesMissingAlt})
- <noscript> fallback: ${features.hasNoscript} | JS-blocking warning: ${features.jsWarning}

## robots.txt / llms.txt
- robots.txt found: ${robots.robotsTxtFound}
- Sitemap defined: ${robots.sitemapFound}
- llms.txt found: ${robots.llmsTxtFound}
- BLOCKED AI bots: ${robots.blockedAiBots.join(", ") || "none"}
- Allowed AI bots: ${robots.allowedAiBots.join(", ") || "none"}

## Content preview (first 500 characters)
"${features.previewText}"

## Task
Evaluate this page across 6 categories (ai_crawlability, structured_data, content_structure, entity_authority, readability, recommendability) and give an overall score from 0-100. For each issue, produce a copy-pasteable, REAL code example (e.g. missing JSON-LD schema, llms.txt content, robots.txt fix, FAQ block HTML).

Important rules:
- If the visible text is under 300 characters or there's a JS-blocking warning, flag as an issue that the site may be inaccessible to LLMs due to its JS dependency.
- If any AI bot is blocked, make this a high-priority (high) issue and provide a corrected robots.txt.
- For the "recommendability" category, suggest terminology/phrasing and comparison/authority content of the kind AI tends to highlight in the site's niche, if missing.

Return the result only by calling the report_geo_audit tool.`;
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
    // Caught here if max_tokens was hit and the tool output never completed.
    throw new Error(
      `Claude did not return a structured audit result (stop_reason: ${response.stop_reason}).`,
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
