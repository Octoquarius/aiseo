import { describe, it, expect } from "vitest";
import { runAudit } from "./runAudit";

// Makes a real network + Claude API call. Only runs with RUN_SMOKE=1.
// Run: RUN_SMOKE=1 npx vitest run lib/analysis/integration.smoke.test.ts
describe("runAudit (integration)", () => {
  it.skipIf(!process.env.RUN_SMOKE)(
    "analyzes a real site end-to-end",
    async () => {
      const out = await runAudit("https://example.com");
      console.log("Model:", out.model);
      console.log("Overall score:", out.audit.overall_score);
      console.log("Category scores:", out.audit.category_scores);
      console.log("Summary:", out.audit.summary);
      console.log("Issue count:", out.audit.issues.length);
      console.log("First issue:", out.audit.issues[0]?.title);
      console.log("robots AI blocked:", out.robots.blockedAiBots);

      expect(out.audit.overall_score).toBeGreaterThanOrEqual(0);
      expect(out.audit.overall_score).toBeLessThanOrEqual(100);
      expect(Array.isArray(out.audit.issues)).toBe(true);
      expect(out.features.finalUrl).toContain("example.com");
    },
    180000,
  );
});
