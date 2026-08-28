// Shared types — between the analysis engine and the UI.

export type GeoCategory =
  | "ai_crawlability"
  | "structured_data"
  | "content_structure"
  | "entity_authority"
  | "readability"
  | "recommendability";

export const GEO_CATEGORIES: { key: GeoCategory; label: string; labelTr: string }[] = [
  { key: "ai_crawlability", label: "AI Crawlability", labelTr: "AI Crawlability" },
  { key: "structured_data", label: "Structured Data", labelTr: "Structured Data" },
  { key: "content_structure", label: "Content & Answerability", labelTr: "Content & Answerability" },
  { key: "entity_authority", label: "Entity & Authority", labelTr: "Entity & Authority" },
  { key: "readability", label: "Readability", labelTr: "Readability" },
  { key: "recommendability", label: "Recommendability", labelTr: "Recommendability" },
];

export type Severity = "high" | "medium" | "low";

export type ImprovementStatus = "open" | "fixed" | "dismissed";

// Result of raw HTML feature extraction (cheerio) — port of n8n's "Extract HTML Features" + extensions.
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

// robots.txt / llms.txt scan.
export interface RobotsInfo {
  robotsTxtUrl: string;
  robotsTxtFound: boolean;
  llmsTxtUrl: string;
  llmsTxtFound: boolean;
  sitemapFound: boolean;
  // AI bot name -> blocked? (true = blocked)
  blockedAiBots: string[];
  allowedAiBots: string[];
}

// Claude's structured audit output (a single issue).
export interface AuditIssue {
  category: GeoCategory;
  severity: Severity;
  title: string;
  description: string;
  code_location: string;
  current_code: string;
  suggested_code: string;
}

// Full output of a Claude audit.
export interface AuditResult {
  overall_score: number;
  category_scores: Record<GeoCategory, number>;
  summary: string;
  issues: AuditIssue[];
}

// Combined pipeline output (before it's written to the DB).
export interface FullAuditOutput {
  features: HtmlFeatures;
  robots: RobotsInfo;
  audit: AuditResult;
  model: string;
}

// ============================================================
// Phase 2: AI visibility tracking
// ============================================================

// Currently web-search-enabled Claude is the only engine; openai/perplexity may be added later.
export type VisibilityEngine = "claude-web";

export interface SeedQuery {
  query_text: string;
}

// Analysis of a single query's result on a single engine.
export interface ProbeResult {
  appeared: boolean;
  rank: number | null; // position if mentioned (1 = first recommended), otherwise null
  snippet: string | null; // sentence/quote mentioning the brand
  competitors: string[]; // competitor brand/site names highlighted in the answer
  raw_answer: string; // the engine's raw answer
}
