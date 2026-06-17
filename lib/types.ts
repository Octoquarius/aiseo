// Paylaşılan tipler — analiz motoru ve UI arasında.

export type GeoCategory =
  | "ai_crawlability"
  | "structured_data"
  | "content_structure"
  | "entity_authority"
  | "readability"
  | "recommendability";

export const GEO_CATEGORIES: { key: GeoCategory; label: string; labelTr: string }[] = [
  { key: "ai_crawlability", label: "AI Crawlability", labelTr: "AI Taranabilirlik" },
  { key: "structured_data", label: "Structured Data", labelTr: "Yapısal Veri" },
  { key: "content_structure", label: "Content & Answerability", labelTr: "İçerik & Cevaplanabilirlik" },
  { key: "entity_authority", label: "Entity & Authority", labelTr: "Varlık & Otorite" },
  { key: "readability", label: "Readability", labelTr: "Okunabilirlik" },
  { key: "recommendability", label: "Recommendability", labelTr: "Önerilebilirlik" },
];

export type Severity = "high" | "medium" | "low";

export type ImprovementStatus = "open" | "fixed" | "dismissed";

// Ham HTML özellik çıkarımı (cheerio) sonucu — n8n "Extract HTML Features" portu + genişletme.
export interface HtmlFeatures {
  finalUrl: string;
  statusCode: number;
  visibleTextLength: number;
  previewText: string;
  title: string | null;
  hasH1: boolean;
  h1Count: number;
  hasH2: boolean;
  hasH3: boolean;
  headingOutline: string[];
  hasMetaDescription: boolean;
  metaDescription: string | null;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  hasCanonical: boolean;
  hasStructuredData: boolean;
  structuredDataTypes: string[];
  hasNoscript: boolean;
  jsWarning: boolean;
  imageCount: number;
  imagesMissingAlt: number;
  internalLinkCount: number;
  externalLinkCount: number;
  listCount: number;
  tableCount: number;
  hasFaq: boolean;
  hasDateSignal: boolean;
  lang: string | null;
}

// robots.txt / llms.txt taraması.
export interface RobotsInfo {
  robotsTxtUrl: string;
  robotsTxtFound: boolean;
  llmsTxtUrl: string;
  llmsTxtFound: boolean;
  sitemapFound: boolean;
  // AI bot adı -> engelli mi (true = engelli)
  blockedAiBots: string[];
  allowedAiBots: string[];
}

// Claude'un yapısal denetim çıktısı (tek bir issue).
export interface AuditIssue {
  category: GeoCategory;
  severity: Severity;
  title: string;
  description: string;
  code_location: string;
  current_code: string;
  suggested_code: string;
}

// Claude denetiminin tam çıktısı.
export interface AuditResult {
  overall_score: number;
  category_scores: Record<GeoCategory, number>;
  summary: string;
  issues: AuditIssue[];
}

// Pipeline'ın birleşik çıktısı (DB'ye yazılmadan önce).
export interface FullAuditOutput {
  features: HtmlFeatures;
  robots: RobotsInfo;
  audit: AuditResult;
  model: string;
}
