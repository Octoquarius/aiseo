import type { FullAuditOutput } from "@/lib/types";
import { sanitizeUrl } from "./sanitizeUrl";
import { fetchHtml } from "./fetchHtml";
import { extractFeatures } from "./extractFeatures";
import { checkRobots } from "./checkRobots";
import { claudeAudit } from "./claudeAudit";
import { DEFAULT_MODEL } from "@/lib/anthropic";

// Full analysis pipeline: sanitize -> fetch -> extract + robots -> Claude audit.
export async function runAudit(
  rawUrl: string,
  model: string = DEFAULT_MODEL,
): Promise<FullAuditOutput> {
  const url = sanitizeUrl(rawUrl);

  const { html, finalUrl, statusCode } = await fetchHtml(url);
  const features = extractFeatures(html, finalUrl, statusCode);

  // robots/llms.txt and the Claude audit run sequentially: the robots result feeds the prompt.
  const robots = await checkRobots(finalUrl);
  const { result, model: usedModel } = await claudeAudit(features, robots, model);

  return { features, robots, audit: result, model: usedModel };
}
