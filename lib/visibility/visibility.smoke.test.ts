import { describe, it, expect } from "vitest";
import { generateQueries } from "./generateQueries";
import { probeOne } from "./runVisibility";

// Gerçek ağ + Claude (web_search) çağrıları. Sadece RUN_SMOKE=1 ile çalışır.
// Çalıştır: RUN_SMOKE=1 npx vitest run lib/visibility/visibility.smoke.test.ts
describe("görünürlük motoru (entegrasyon)", () => {
  it.skipIf(!process.env.RUN_SMOKE)(
    "sorgu üretir",
    async () => {
      const qs = await generateQueries({ brand: "Nike", url: "https://www.nike.com" });
      console.log("Üretilen sorgular:", qs);
      expect(qs.length).toBeGreaterThan(0);
      expect(qs.join(" ").toLowerCase()).not.toContain("nike"); // marka içermemeli
    },
    60000,
  );

  it.skipIf(!process.env.RUN_SMOKE)(
    "web-aramalı prob marka varlığını tespit eder",
    async () => {
      const r = await probeOne({
        brand: "Nike",
        url: "https://www.nike.com",
        query: "en iyi koşu ayakkabısı markaları hangileri?",
        engine: "claude-web",
      });
      console.log("appeared:", r.appeared, "rank:", r.rank);
      console.log("competitors:", r.competitors);
      console.log("snippet:", r.snippet);
      console.log("answer (ilk 300):", r.raw_answer.slice(0, 300));

      expect(typeof r.appeared).toBe("boolean");
      expect(r.raw_answer.length).toBeGreaterThan(0);
      expect(Array.isArray(r.competitors)).toBe(true);
    },
    150000,
  );
});
