import { describe, it, expect } from "vitest";
import { runAudit } from "./runAudit";

// Gerçek ağ + Claude API çağrısı yapar. Sadece RUN_SMOKE=1 ile çalışır.
// Çalıştır: RUN_SMOKE=1 npx vitest run lib/analysis/integration.smoke.test.ts
describe("runAudit (entegrasyon)", () => {
  it.skipIf(!process.env.RUN_SMOKE)(
    "gerçek bir siteyi uçtan uca analiz eder",
    async () => {
      const out = await runAudit("https://example.com");
      console.log("Model:", out.model);
      console.log("Genel skor:", out.audit.overall_score);
      console.log("Kategori skorları:", out.audit.category_scores);
      console.log("Özet:", out.audit.summary);
      console.log("Sorun sayısı:", out.audit.issues.length);
      console.log("İlk sorun:", out.audit.issues[0]?.title);
      console.log("robots AI engelli:", out.robots.blockedAiBots);

      expect(out.audit.overall_score).toBeGreaterThanOrEqual(0);
      expect(out.audit.overall_score).toBeLessThanOrEqual(100);
      expect(Array.isArray(out.audit.issues)).toBe(true);
      expect(out.features.finalUrl).toContain("example.com");
    },
    180000,
  );
});
