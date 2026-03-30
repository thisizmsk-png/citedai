// ---------------------------------------------------------------------------
// AEO Score types
// ---------------------------------------------------------------------------

export interface ScoreBreakdownItem {
  score: number;
  max: number;
  detail: string;
}

export interface AeoScore {
  overall: number; // 0-100
  extractability: number; // 0-40
  authority: number; // 0-35
  freshness: number; // 0-25
  breakdown: Record<string, ScoreBreakdownItem>;
}

export interface PageAnalysis {
  url: string;
  title: string | null;
  score: AeoScore;
  issues: Issue[];
  wordCount: number;
  hasSchemaMarkup: boolean;
  hasLlmsTxt: boolean;
  hasAnswerBlocks: boolean;
  answerBlocksDetected: string[];
  schemaPresent: string[];
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export type IssueCategory = "extractability" | "authority" | "freshness";
export type IssueSeverity = "critical" | "warning" | "info";

export interface Issue {
  category: IssueCategory;
  severity: IssueSeverity;
  issueType: string;
  description: string;
  recommendation: string;
  suggestedFix?: string;
  estimatedImpact: number; // 1-10
}

// ---------------------------------------------------------------------------
// Scan jobs
// ---------------------------------------------------------------------------

export interface CrawlJobData {
  scanId: string;
  siteId: string;
  domain: string;
  maxPages: number;
  userId: string;
}

export interface CrawlJobProgress {
  pagesCrawled: number;
  pagesTotal: number;
  currentUrl?: string;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export type Plan = "starter" | "pro" | "agency";

export interface PlanLimits {
  maxSites: number;
  maxPagesPerScan: number;
  scanFrequency: "weekly" | "daily";
  monitoredQueries: number;
  apiAccess: boolean;
  exportPdf: boolean;
}

// ---------------------------------------------------------------------------
// API response wrappers
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

// ---------------------------------------------------------------------------
// Citation monitoring (V2)
// ---------------------------------------------------------------------------

export type CitationPlatform = "chatgpt" | "perplexity" | "google_ai";

export interface Citation {
  pageUrl: string;
  platform: CitationPlatform;
  queryText: string;
  snippet: string;
  responseContext: string;
  citedAt: Date;
  detectedAt: Date;
}

// ---------------------------------------------------------------------------
// Scan status
// ---------------------------------------------------------------------------

export type ScanStatus = "queued" | "crawling" | "scoring" | "completed" | "failed";
