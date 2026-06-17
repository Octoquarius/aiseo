import { describe, it, expect } from "vitest";
import { evaluateRobotsTxt } from "./checkRobots";

describe("evaluateRobotsTxt", () => {
  it("GPTBot tamamen engelliyse blocked listesine ekler", () => {
    const txt = `User-agent: GPTBot\nDisallow: /`;
    const r = evaluateRobotsTxt(txt);
    expect(r.blockedAiBots).toContain("GPTBot");
    expect(r.allowedAiBots).not.toContain("GPTBot");
  });

  it("wildcard Disallow / tüm AI botlarını engeller", () => {
    const txt = `User-agent: *\nDisallow: /`;
    const r = evaluateRobotsTxt(txt);
    expect(r.blockedAiBots).toContain("ClaudeBot");
    expect(r.blockedAiBots).toContain("PerplexityBot");
  });

  it("spesifik Allow, wildcard Disallow'u geçersiz kılar", () => {
    const txt = `User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /`;
    const r = evaluateRobotsTxt(txt);
    expect(r.allowedAiBots).toContain("GPTBot");
    expect(r.blockedAiBots).toContain("CCBot");
  });

  it("sitemap satırını tespit eder", () => {
    const txt = `User-agent: *\nAllow: /\nSitemap: https://x.com/sitemap.xml`;
    expect(evaluateRobotsTxt(txt).sitemapFound).toBe(true);
  });

  it("kural yoksa tüm botları izinli sayar", () => {
    const r = evaluateRobotsTxt(`User-agent: *\nDisallow:`);
    expect(r.blockedAiBots).toHaveLength(0);
  });
});
