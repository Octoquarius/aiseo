import { describe, it, expect } from "vitest";
import { sanitizeUrl, originOf } from "./sanitizeUrl";

describe("sanitizeUrl", () => {
  it("adds https to input without a protocol", () => {
    expect(sanitizeUrl("example.com")).toBe("https://example.com/");
  });

  it("preserves an existing http protocol", () => {
    expect(sanitizeUrl("http://example.com/path")).toBe("http://example.com/path");
  });

  it("trims leading/trailing whitespace", () => {
    expect(sanitizeUrl("  example.com  ")).toBe("https://example.com/");
  });

  it("lowercases the hostname", () => {
    expect(sanitizeUrl("HTTPS://Example.COM/Path")).toBe("https://example.com/Path");
  });

  it("throws on empty input", () => {
    expect(() => sanitizeUrl("   ")).toThrow();
  });

  it("throws on an unsupported protocol like ftp", () => {
    expect(() => sanitizeUrl("ftp://example.com")).toThrow();
  });

  it("originOf returns the root origin", () => {
    expect(originOf("https://example.com/a/b?c=1")).toBe("https://example.com");
  });
});
