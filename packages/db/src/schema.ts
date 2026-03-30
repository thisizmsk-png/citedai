import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const planEnum = pgEnum("plan", ["starter", "pro", "agency"]);

export const scanStatusEnum = pgEnum("scan_status", [
  "queued",
  "crawling",
  "scoring",
  "completed",
  "failed",
]);

export const issueCategoryEnum = pgEnum("issue_category", [
  "extractability",
  "authority",
  "freshness",
]);

export const issueSeverityEnum = pgEnum("issue_severity", [
  "critical",
  "warning",
  "info",
]);

export const verificationMethodEnum = pgEnum("verification_method", [
  "dns",
  "meta",
  "file",
]);

export const scanFrequencyEnum = pgEnum("scan_frequency", [
  "weekly",
  "daily",
]);

export const citationPlatformEnum = pgEnum("citation_platform", [
  "chatgpt",
  "perplexity",
  "google_ai",
]);

export const queryStatusEnum = pgEnum("query_status", ["active", "paused"]);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  plan: planEnum("plan").notNull().default("starter"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    verified: boolean("verified").notNull().default(false),
    verificationMethod: verificationMethodEnum("verification_method").default("dns"),
    verificationToken: text("verification_token"),
    settings: jsonb("settings").$type<Record<string, unknown>>(),
    maxPages: integer("max_pages").notNull().default(100),
    scanFrequency: scanFrequencyEnum("scan_frequency").notNull().default("weekly"),
    lastScannedAt: timestamp("last_scanned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_sites_user_domain").on(table.userId, table.domain),
    index("idx_sites_user").on(table.userId),
  ],
);

export const scans = pgTable(
  "scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    status: scanStatusEnum("status").notNull().default("queued"),
    pagesCrawled: integer("pages_crawled").notNull().default(0),
    pagesTotal: integer("pages_total"),
    overallScore: integer("overall_score"),
    extractabilityAvg: integer("extractability_avg"),
    authorityAvg: integer("authority_avg"),
    freshnessAvg: integer("freshness_avg"),
    summaryStats: jsonb("summary_stats").$type<{
      pages_above_70: number;
      pages_below_30: number;
      critical_issues: number;
      top_issue_type: string;
    }>(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_scans_site_created").on(table.siteId, table.createdAt),
  ],
);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    score: integer("score"),
    extractability: integer("extractability"),
    authority: integer("authority"),
    freshness: integer("freshness"),
    wordCount: integer("word_count"),
    hasSchemaMarkup: boolean("has_schema_markup").default(false),
    hasLlmsTxt: boolean("has_llms_txt").default(false),
    hasAnswerBlocks: boolean("has_answer_blocks").default(false),
    scoreBreakdown: jsonb("score_breakdown").$type<Record<string, {
      score: number;
      max: number;
      detail: string;
    }>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_pages_scan_url").on(table.scanId, table.url),
    index("idx_pages_scan_score").on(table.scanId, table.score),
  ],
);

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    category: issueCategoryEnum("category").notNull(),
    severity: issueSeverityEnum("severity").notNull(),
    issueType: text("issue_type").notNull(),
    description: text("description").notNull(),
    recommendation: text("recommendation"),
    suggestedFix: text("suggested_fix"),
    estimatedImpact: integer("estimated_impact"),
    resolved: boolean("resolved").notNull().default(false),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_issues_page_severity").on(table.pageId, table.severity, table.resolved),
  ],
);

export const monitoredQueries = pgTable("monitored_queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  status: queryStatusEnum("status").notNull().default("active"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const citations = pgTable(
  "citations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    monitoredQueryId: uuid("monitored_query_id").references(
      () => monitoredQueries.id,
      { onDelete: "set null" },
    ),
    pageUrl: text("page_url"),
    platform: citationPlatformEnum("platform").notNull(),
    queryText: text("query_text").notNull(),
    snippet: text("snippet"),
    responseContext: text("response_context"),
    citedAt: timestamp("cited_at", { withTimezone: true }),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_citations_site_detected").on(table.siteId, table.detectedAt),
  ],
);

export const competitors = pgTable("competitors", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  name: text("name"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  sites: many(sites),
  apiKeys: many(apiKeys),
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
  user: one(users, { fields: [sites.userId], references: [users.id] }),
  scans: many(scans),
  monitoredQueries: many(monitoredQueries),
  competitors: many(competitors),
  citations: many(citations),
}));

export const scansRelations = relations(scans, ({ one, many }) => ({
  site: one(sites, { fields: [scans.siteId], references: [sites.id] }),
  pages: many(pages),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  scan: one(scans, { fields: [pages.scanId], references: [scans.id] }),
  site: one(sites, { fields: [pages.siteId], references: [sites.id] }),
  issues: many(issues),
}));

export const issuesRelations = relations(issues, ({ one }) => ({
  page: one(pages, { fields: [issues.pageId], references: [pages.id] }),
}));

export const monitoredQueriesRelations = relations(monitoredQueries, ({ one, many }) => ({
  site: one(sites, { fields: [monitoredQueries.siteId], references: [sites.id] }),
  citations: many(citations),
}));

export const citationsRelations = relations(citations, ({ one }) => ({
  site: one(sites, { fields: [citations.siteId], references: [sites.id] }),
  monitoredQuery: one(monitoredQueries, {
    fields: [citations.monitoredQueryId],
    references: [monitoredQueries.id],
  }),
}));

export const competitorsRelations = relations(competitors, ({ one }) => ({
  site: one(sites, { fields: [competitors.siteId], references: [sites.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
}));
