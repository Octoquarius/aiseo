import * as cheerio from "cheerio";
import type { HtmlFeatures } from "@/lib/types";

// JS bağımlılığını ele veren yaygın engelleme mesajları (EN + TR + DE).
const JS_BLOCK_INDICATORS = [
  "enable javascript",
  "javascript is required",
  "please enable javascript",
  "javascript'i etkinleştir",
  "javascript gerekli",
  "lütfen javascript",
  "javascript moet ingeschakeld zijn",
  "javascript erforderlich",
];

const FAQ_INDICATORS = [
  "sıkça sorulan",
  "frequently asked",
  "faq",
  "s.s.s",
  "sss",
];

// n8n "Extract HTML Features" mantığının cheerio portu + GEO sinyalleri.
export function extractFeatures(
  html: string,
  finalUrl: string,
  statusCode: number,
): HtmlFeatures {
  const $ = cheerio.load(html);

  // Script/style'ları kaldırıp görünür metni çıkar.
  $("script, style, noscript").remove();
  const cleanedText = $("body").text().replace(/\s+/g, " ").trim();
  const lowerText = cleanedText.toLowerCase();

  const $orig = cheerio.load(html); // ham (etiketler korunmuş) kopya

  const structuredDataTypes: string[] = [];
  $orig('script[type="application/ld+json"]').each((_, el) => {
    const raw = $orig(el).contents().text();
    try {
      const json = JSON.parse(raw);
      const collect = (node: unknown) => {
        if (Array.isArray(node)) return node.forEach(collect);
        if (node && typeof node === "object") {
          const t = (node as Record<string, unknown>)["@type"];
          if (typeof t === "string") structuredDataTypes.push(t);
          else if (Array.isArray(t))
            t.forEach((x) => typeof x === "string" && structuredDataTypes.push(x));
        }
      };
      collect(json);
    } catch {
      structuredDataTypes.push("(parse-error)");
    }
  });

  const headingOutline: string[] = [];
  $orig("h1, h2, h3").each((_, el) => {
    const tag = (el as { tagName?: string }).tagName ?? "h?";
    const text = $orig(el).text().replace(/\s+/g, " ").trim().slice(0, 80);
    if (text) headingOutline.push(`${tag.toUpperCase()}: ${text}`);
  });

  const origin = new URL(finalUrl).origin;
  let internalLinkCount = 0;
  let externalLinkCount = 0;
  $orig("a[href]").each((_, el) => {
    const href = $orig(el).attr("href") || "";
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const abs = new URL(href, finalUrl);
      if (abs.origin === origin) internalLinkCount++;
      else externalLinkCount++;
    } catch {
      /* geçersiz href yok say */
    }
  });

  let imagesMissingAlt = 0;
  const imageCount = $orig("img").length;
  $orig("img").each((_, el) => {
    const alt = $orig(el).attr("alt");
    if (!alt || !alt.trim()) imagesMissingAlt++;
  });

  const hasDateSignal =
    $orig('time, [datetime], meta[property="article:published_time"], meta[property="article:modified_time"]').length > 0 ||
    /\b(20[12]\d|19\d\d)\b/.test(cleanedText.slice(0, 2000));

  const metaDescription = $orig('meta[name="description"]').attr("content") || null;
  const title = $orig("title").first().text().trim() || null;
  const lang = $orig("html").attr("lang") || null;

  return {
    finalUrl,
    statusCode,
    visibleTextLength: cleanedText.length,
    previewText: cleanedText.slice(0, 500),
    title,
    hasH1: $orig("h1").length > 0,
    h1Count: $orig("h1").length,
    hasH2: $orig("h2").length > 0,
    hasH3: $orig("h3").length > 0,
    headingOutline: headingOutline.slice(0, 40),
    hasMetaDescription: !!metaDescription,
    metaDescription,
    hasOpenGraph: $orig('meta[property^="og:"]').length > 0,
    hasTwitterCard: $orig('meta[name^="twitter:"]').length > 0,
    hasCanonical: $orig('link[rel="canonical"]').length > 0,
    hasStructuredData: structuredDataTypes.length > 0,
    structuredDataTypes: Array.from(new Set(structuredDataTypes)),
    hasNoscript: /<noscript[\s>]/i.test(html),
    jsWarning: JS_BLOCK_INDICATORS.some((p) => lowerText.includes(p)),
    imageCount,
    imagesMissingAlt,
    internalLinkCount,
    externalLinkCount,
    listCount: $orig("ul, ol").length,
    tableCount: $orig("table").length,
    hasFaq:
      structuredDataTypes.some((t) => t.toLowerCase().includes("faq")) ||
      FAQ_INDICATORS.some((p) => lowerText.includes(p)),
    hasDateSignal,
    lang,
  };
}
