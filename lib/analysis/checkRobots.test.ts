import { describe, it, expect } from "vitest";
import { evaluateRobotsTxt } from "./checkRobots";

describe("evaluateRobotsTxt", () => {
  it("adds GPTBot to the blocked list when it's fully disallowed", () => {
    const txt = `User-agent: GPTBot\nDisallow: /`;
    const r = evaluateRobotsTxt(txt);
    expect(r.blockedAiBots).toContain("GPTBot");
    expect(r.allowedAiBots).not.toContain("GPTBot");
  });

  it("wildcard Disallow / blocks all AI bots", () => {
    const txt = `User-agent: *\nDisallow: /`;
    const r = evaluateRobotsTxt(txt);
    expect(r.blockedAiBots).toContain("ClaudeBot");
    expect(r.blockedAiBots).toContain("PerplexityBot");
  });

  it("a specific Allow overrides a wildcard Disallow", () => {
    const txt = `User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /`;
    const r = evaluateRobotsTxt(txt);
    expect(r.allowedAiBots).toContain("GPTBot");
    expect(r.blockedAiBots).toContain("CCBot");
  });

  it("detects the sitemap line", () => {
    const txt = `User-agent: *\nAllow: /\nSitemap: https://x.com/sitemap.xml`;
    expect(evaluateRobotsTxt(txt).sitemapFound).toBe(true);
  });

  it("treats all bots as allowed when there are no rules", () => {
    const r = evaluateRobotsTxt(`User-agent: *\nDisallow:`);
    expect(r.blockedAiBots).toHaveLength(0);
  });
});
