import { describe, it, expect } from "vitest";
import { generateQueries } from "./generateQueries";
import { probeOne } from "./runVisibility";

// Real network + Claude (web_search) calls. Only runs with RUN_SMOKE=1.
// Run: RUN_SMOKE=1 npx vitest run lib/visibility/visibility.smoke.test.ts
describe("visibility engine (integration)", () => {
  it.skipIf(!process.env.RUN_SMOKE)(
    "generates queries",
    async () => {
      const qs = await generateQueries({ brand: "Nike", url: "https://www.nike.com" });
      console.log("Generated queries:", qs);
      expect(qs.length).toBeGreaterThan(0);
      expect(qs.join(" ").toLowerCase()).not.toContain("nike"); // must not mention the brand
    },
    60000,
  );

  it.skipIf(!process.env.RUN_SMOKE)(
    "web-search probe detects brand presence",
    async () => {
      const r = await probeOne({
        brand: "Nike",
        url: "https://www.nike.com",
        query: "what are the best running shoe brands?",
        engine: "claude-web",
      });
      console.log("appeared:", r.appeared, "rank:", r.rank);
      console.log("competitors:", r.competitors);
      console.log("snippet:", r.snippet);
      console.log("answer (first 300):", r.raw_answer.slice(0, 300));

      expect(typeof r.appeared).toBe("boolean");
      expect(r.raw_answer.length).toBeGreaterThan(0);
      expect(Array.isArray(r.competitors)).toBe(true);
    },
    150000,
  );
});
