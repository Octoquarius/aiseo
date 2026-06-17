import type { FullAuditOutput } from "@/lib/types";
import { sanitizeUrl } from "./sanitizeUrl";
import { fetchHtml } from "./fetchHtml";
import { extractFeatures } from "./extractFeatures";
import { checkRobots } from "./checkRobots";
import { claudeAudit } from "./claudeAudit";
import { DEFAULT_MODEL } from "@/lib/anthropic";

// Tam analiz pipeline'ı: temizle -> getir -> çıkar + robots -> Claude denetimi.
export async function runAudit(
  rawUrl: string,
  model: string = DEFAULT_MODEL,
): Promise<FullAuditOutput> {
  const url = sanitizeUrl(rawUrl);

  const { html, finalUrl, statusCode } = await fetchHtml(url);
  const features = extractFeatures(html, finalUrl, statusCode);

  // robots/llms.txt ile Claude denetimi sıralı: robots sonucu prompt'a girer.
  const robots = await checkRobots(finalUrl);
  const { result, model: usedModel } = await claudeAudit(features, robots, model);

  return { features, robots, audit: result, model: usedModel };
}
