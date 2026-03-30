import type { Plan, PlanLimits } from "./types";

// ---------------------------------------------------------------------------
// Plan limits
// ---------------------------------------------------------------------------

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  starter: {
    maxSites: 1,
    maxPagesPerScan: 100,
    scanFrequency: "weekly",
    monitoredQueries: 0,
    apiAccess: false,
    exportPdf: false,
  },
  pro: {
    maxSites: 5,
    maxPagesPerScan: 500,
    scanFrequency: "daily",
    monitoredQueries: 25,
    apiAccess: true,
    exportPdf: true,
  },
  agency: {
    maxSites: 25,
    maxPagesPerScan: 500,
    scanFrequency: "daily",
    monitoredQueries: 100,
    apiAccess: true,
    exportPdf: true,
  },
};

// ---------------------------------------------------------------------------
// Scoring weights (max points per dimension)
// ---------------------------------------------------------------------------

export const SCORE_WEIGHTS = {
  extractability: {
    max: 40,
    components: {
      answer_blocks: 12,
      definition_formatting: 8,
      step_lists: 6,
      comparison_tables: 6,
      faq_structure: 8,
    },
  },
  authority: {
    max: 35,
    components: {
      schema_markup: 10,
      author_attribution: 8,
      publication_date: 5,
      source_citations: 7,
      llms_txt: 5,
    },
  },
  freshness: {
    max: 25,
    components: {
      updated_date: 8,
      content_recency: 7,
      version_refs: 5,
      broken_links: 5,
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Queue names
// ---------------------------------------------------------------------------

export const QUEUE_NAMES = {
  CRAWL: "crawl",
  CITATION_MONITOR: "citation-monitor",
} as const;

// ---------------------------------------------------------------------------
// Issue types
// ---------------------------------------------------------------------------

export const ISSUE_TYPES = {
  // Extractability
  MISSING_ANSWER_BLOCK: "missing_answer_block",
  NO_DEFINITION_FORMAT: "no_definition_format",
  NO_STEP_LISTS: "no_step_lists",
  NO_COMPARISON_TABLES: "no_comparison_tables",
  WEAK_FAQ_STRUCTURE: "weak_faq_structure",

  // Authority
  NO_SCHEMA: "no_schema",
  NO_AUTHOR: "no_author",
  NO_PUB_DATE: "no_pub_date",
  NO_CITATIONS: "no_citations",
  NO_LLMS_TXT: "no_llms_txt",

  // Freshness
  STALE_DATE: "stale_date",
  OUTDATED_CONTENT: "outdated_content",
  OUTDATED_VERSIONS: "outdated_versions",
  BROKEN_LINKS: "broken_links",

  // Info-level
  TITLE_LENGTH: "title_length",
  THIN_CONTENT: "thin_content",
  NO_META_DESCRIPTION: "no_meta_description",
  IMAGES_MISSING_ALT: "images_missing_alt",
} as const;

// ---------------------------------------------------------------------------
// Crawl settings
// ---------------------------------------------------------------------------

export const CRAWL_SETTINGS = {
  MAX_CONCURRENT_REQUESTS: 5,
  REQUEST_TIMEOUT_MS: 15_000,
  USER_AGENT: "CitedAI-Crawler/1.0 (+https://citedai.com/bot)",
  RESPECT_ROBOTS_TXT: true,
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 2_000,
} as const;
