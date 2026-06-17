import { describe, it, expect } from "vitest";
import { extractFeatures } from "./extractFeatures";

const RICH_HTML = `<!doctype html>
<html lang="tr">
<head>
  <title>Test Ürün Sayfası</title>
  <meta name="description" content="En iyi koşu ayakkabısı">
  <meta property="og:title" content="Test">
  <link rel="canonical" href="https://shop.example.com/p">
  <script type="application/ld+json">{"@type":"Product","name":"Ayakkabı"}</script>
</head>
<body>
  <h1>Koşu Ayakkabısı</h1>
  <h2>Özellikler</h2>
  <p>Bu ürün 2024 yılında üretildi ve çok hafiftir, uzun mesafe koşuları için idealdir.</p>
  <ul><li>Hafif</li><li>Dayanıklı</li></ul>
  <a href="/iletisim">İletişim</a>
  <a href="https://baska-site.com">Dış</a>
  <img src="/a.jpg" alt="ayakkabı">
  <img src="/b.jpg">
</body>
</html>`;

describe("extractFeatures", () => {
  const f = extractFeatures(RICH_HTML, "https://shop.example.com/p", 200);

  it("title ve meta description'ı çıkarır", () => {
    expect(f.title).toBe("Test Ürün Sayfası");
    expect(f.hasMetaDescription).toBe(true);
    expect(f.metaDescription).toContain("koşu");
  });

  it("başlıkları sayar", () => {
    expect(f.hasH1).toBe(true);
    expect(f.h1Count).toBe(1);
    expect(f.hasH2).toBe(true);
  });

  it("JSON-LD yapısal veri tiplerini bulur", () => {
    expect(f.hasStructuredData).toBe(true);
    expect(f.structuredDataTypes).toContain("Product");
  });

  it("og ve canonical tespit eder", () => {
    expect(f.hasOpenGraph).toBe(true);
    expect(f.hasCanonical).toBe(true);
  });

  it("iç/dış bağlantıları ayırır", () => {
    expect(f.internalLinkCount).toBe(1);
    expect(f.externalLinkCount).toBe(1);
  });

  it("alt eksik görselleri sayar", () => {
    expect(f.imageCount).toBe(2);
    expect(f.imagesMissingAlt).toBe(1);
  });

  it("tarih sinyalini ve dili yakalar", () => {
    expect(f.hasDateSignal).toBe(true);
    expect(f.lang).toBe("tr");
  });
});

describe("extractFeatures — JS engellemeli site", () => {
  const html = `<html><body><div>Please enable JavaScript to view this site.</div></body></html>`;
  const f = extractFeatures(html, "https://spa.example.com", 200);

  it("jsWarning'i tespit eder", () => {
    expect(f.jsWarning).toBe(true);
  });

  it("yapısal veri yokken false döner", () => {
    expect(f.hasStructuredData).toBe(false);
  });
});
