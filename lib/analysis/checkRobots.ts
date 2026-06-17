import type { RobotsInfo } from "@/lib/types";
import { fetchText } from "./fetchHtml";
import { originOf } from "./sanitizeUrl";

// İçeriği AI motorlarına besleyen önemli botlar.
export const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
  "Meta-ExternalAgent",
];

interface RobotsGroup {
  agents: string[];
  disallow: string[];
  allow: string[];
}

// robots.txt'i User-agent gruplarına ayrıştırır.
function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (current && (field === "disallow" || field === "allow")) {
      if (field === "disallow") current.disallow.push(value);
      else current.allow.push(value);
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

// Belirli bir bot kök ("/") için engellenmiş mi? En spesifik eşleşen grup kazanır.
function isBotBlocked(groups: RobotsGroup[], bot: string): boolean {
  const botLower = bot.toLowerCase();
  const specific = groups.find((g) => g.agents.includes(botLower));
  const wildcard = groups.find((g) => g.agents.includes("*"));
  const group = specific ?? wildcard;
  if (!group) return false; // kural yok = izinli

  // Allow "/" varsa açıkça izinli kabul et.
  if (group.allow.some((p) => p === "/" || p === "")) return false;
  // Disallow "/" = tüm site engelli.
  return group.disallow.some((p) => p === "/");
}

// Saf değerlendirme — robots.txt metninden AI bot erişimini hesaplar (test edilebilir).
export function evaluateRobotsTxt(text: string): {
  sitemapFound: boolean;
  blockedAiBots: string[];
  allowedAiBots: string[];
} {
  const sitemapFound = /^\s*sitemap\s*:/im.test(text);
  const groups = parseRobots(text);
  const blockedAiBots: string[] = [];
  const allowedAiBots: string[] = [];
  for (const bot of AI_BOTS) {
    if (isBotBlocked(groups, bot)) blockedAiBots.push(bot);
    else allowedAiBots.push(bot);
  }
  return { sitemapFound, blockedAiBots, allowedAiBots };
}

export async function checkRobots(pageUrl: string): Promise<RobotsInfo> {
  const origin = originOf(pageUrl);
  const robotsTxtUrl = `${origin}/robots.txt`;
  const llmsTxtUrl = `${origin}/llms.txt`;

  const [robotsRes, llmsRes] = await Promise.all([
    fetchText(robotsTxtUrl),
    fetchText(llmsTxtUrl),
  ]);

  const robotsTxtFound = !!robotsRes && robotsRes.statusCode === 200 && robotsRes.text.trim().length > 0;
  const llmsTxtFound = !!llmsRes && llmsRes.statusCode === 200 && llmsRes.text.trim().length > 0;

  let blockedAiBots: string[] = [];
  let allowedAiBots: string[] = [];
  let sitemapFound = false;

  if (robotsTxtFound && robotsRes) {
    const evaluated = evaluateRobotsTxt(robotsRes.text);
    sitemapFound = evaluated.sitemapFound;
    blockedAiBots = evaluated.blockedAiBots;
    allowedAiBots = evaluated.allowedAiBots;
  } else {
    // robots.txt yoksa varsayılan: tüm botlar izinli.
    allowedAiBots = [...AI_BOTS];
  }

  return {
    robotsTxtUrl,
    robotsTxtFound,
    llmsTxtUrl,
    llmsTxtFound,
    sitemapFound,
    blockedAiBots,
    allowedAiBots,
  };
}
