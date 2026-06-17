import { describe, it, expect } from "vitest";
import { sanitizeUrl, originOf } from "./sanitizeUrl";

describe("sanitizeUrl", () => {
  it("protokolsüz girdiye https ekler", () => {
    expect(sanitizeUrl("example.com")).toBe("https://example.com/");
  });

  it("mevcut http protokolünü korur", () => {
    expect(sanitizeUrl("http://example.com/path")).toBe("http://example.com/path");
  });

  it("baştaki/sondaki boşlukları temizler", () => {
    expect(sanitizeUrl("  example.com  ")).toBe("https://example.com/");
  });

  it("hostname'i küçük harfe çevirir", () => {
    expect(sanitizeUrl("HTTPS://Example.COM/Path")).toBe("https://example.com/Path");
  });

  it("boş girdide hata fırlatır", () => {
    expect(() => sanitizeUrl("   ")).toThrow();
  });

  it("ftp gibi desteklenmeyen protokolde hata fırlatır", () => {
    expect(() => sanitizeUrl("ftp://example.com")).toThrow();
  });

  it("originOf kök origin döndürür", () => {
    expect(originOf("https://example.com/a/b?c=1")).toBe("https://example.com");
  });
});
