import type { CrawlJobData, CrawlJobProgress } from "@citedai/shared";
import { CRAWL_SETTINGS } from "@citedai/shared";
import { scorePageContent, detectIssues, type PageContent } from "@citedai/scoring";
import * as cheerio from "cheerio";

type ProgressCallback = (progress: CrawlJobProgress) => Promise<void>;

/**
 * Main crawl job handler.
 *
 * Steps:
 * 1. Fetch sitemap.xml to discover pages
 * 2. For each page (up to maxPages):
 *    a. HTTP GET the page
 *    b. Parse HTML into PageContent
 *    c. Run scoring engine
 *    d. Detect issues
 *    e. Batch-insert page + issues into DB
 *    f. Report progress
 * 3. Update scan record with final scores
 */
export async function processCrawlJob(
  data: CrawlJobData,
  onProgress: ProgressCallback,
): Promise<void> {
  const { scanId, siteId, domain, maxPages } = data;

  // Step 0: Check for /llms.txt
  const hasLlmsTxt = await checkLlmsTxt(domain);

  // Step 1: Discover pages
  const pageUrls = await discoverPages(domain, maxPages);

  await onProgress({ pagesCrawled: 0, pagesTotal: pageUrls.length });

  // Step 2: Crawl and score each page
  for (let i = 0; i < pageUrls.length; i++) {
    const url = pageUrls[i];

    try {
      // 2a. Fetch page
      const html = await fetchPage(url);

      // 2b. Parse into PageContent
      const content = parsePageContent(url, html);
      content.hasLlmsTxt = hasLlmsTxt;

      // 2c. Score
      const score = scorePageContent(content);

      // 2d. Detect issues
      const issues = detectIssues(content);

      // 2e. Persist (TODO: batch insert via @citedai/db)
      // await db.insert(pages).values({ ... })
      // await db.insert(issuesTable).values(issues.map(...))

      console.log(
        `[crawl] Scored ${url} — overall=${score.overall}, issues=${issues.length}`,
      );
    } catch (err) {
      console.warn(`[crawl] Failed to process ${url}:`, err);
      // Continue to next page — don't fail the entire scan
    }

    await onProgress({
      pagesCrawled: i + 1,
      pagesTotal: pageUrls.length,
      currentUrl: url,
    });
  }

  // Step 3: Update scan with aggregated scores
  // TODO: Calculate averages and update scan record
  console.log(`[crawl] Scan ${scanId} complete. ${pageUrls.length} pages processed.`);
}

// ---------------------------------------------------------------------------
// /llms.txt checker
// ---------------------------------------------------------------------------

/**
 * Check whether a domain serves a /llms.txt file.
 * Returns true if the file exists (HTTP 200), false otherwise.
 */
export async function checkLlmsTxt(domain: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${domain}/llms.txt`, {
      method: "HEAD",
      headers: { "User-Agent": CRAWL_SETTINGS.USER_AGENT },
      signal: AbortSignal.timeout(CRAWL_SETTINGS.REQUEST_TIMEOUT_MS),
      redirect: "follow",
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Page discovery
// ---------------------------------------------------------------------------

/**
 * Discover crawlable pages for a domain.
 *
 * Phase 1: Try /sitemap.xml (and /sitemap_index.xml for indexes).
 * Phase 2: If sitemap yields <5 URLs, crawl homepage and follow internal links.
 * Results are deduped and capped at maxPages.
 */
export async function discoverPages(domain: string, maxPages: number): Promise<string[]> {
  console.log(`[crawl] Discovering pages for ${domain} (max ${maxPages})`);

  const discovered = new Set<string>();

  // Phase 1: Sitemap
  await discoverFromSitemap(`https://${domain}/sitemap.xml`, discovered, maxPages);

  // Also try sitemap_index.xml if the main sitemap didn't yield much
  if (discovered.size < maxPages) {
    await discoverFromSitemap(`https://${domain}/sitemap_index.xml`, discovered, maxPages);
  }

  // Phase 2: If sitemap yielded <5 URLs, crawl homepage for internal links
  if (discovered.size < 5) {
    console.log(`[crawl] Sitemap yielded ${discovered.size} URLs, falling back to homepage crawl`);
    await discoverFromHomepage(domain, discovered, maxPages);
  }

  const urls = Array.from(discovered).slice(0, maxPages);
  console.log(`[crawl] Discovered ${urls.length} pages for ${domain}`);
  return urls;
}

/**
 * Parse a sitemap or sitemap index XML and collect URLs.
 * For sitemap indexes, recursively fetches child sitemaps.
 */
async function discoverFromSitemap(
  sitemapUrl: string,
  discovered: Set<string>,
  maxPages: number,
): Promise<void> {
  try {
    const response = await fetch(sitemapUrl, {
      headers: { "User-Agent": CRAWL_SETTINGS.USER_AGENT },
      signal: AbortSignal.timeout(CRAWL_SETTINGS.REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return;

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    // Check if this is a sitemap index (contains <sitemap> elements)
    const childSitemaps = $("sitemap > loc");
    if (childSitemaps.length > 0) {
      // It's a sitemap index — fetch each child sitemap
      for (let i = 0; i < childSitemaps.length && discovered.size < maxPages; i++) {
        const childUrl = $(childSitemaps[i]).text().trim();
        if (childUrl) {
          await discoverFromSitemap(childUrl, discovered, maxPages);
        }
      }
      return;
    }

    // Regular sitemap — extract <loc> URLs
    $("url > loc").each((_, el) => {
      if (discovered.size >= maxPages) return false;
      const loc = $(el).text().trim();
      if (loc) {
        discovered.add(loc);
      }
    });
  } catch (err) {
    console.warn(`[crawl] Failed to fetch sitemap ${sitemapUrl}:`, err);
  }
}

/**
 * Crawl the homepage HTML and extract internal links to discover pages.
 */
async function discoverFromHomepage(
  domain: string,
  discovered: Set<string>,
  maxPages: number,
): Promise<void> {
  const homepageUrl = `https://${domain}`;

  // Always include the homepage itself
  discovered.add(homepageUrl);
  discovered.add(`${homepageUrl}/`);

  try {
    const html = await fetchPage(homepageUrl);
    const $ = cheerio.load(html);

    $("a[href]").each((_, el) => {
      if (discovered.size >= maxPages) return false;

      const raw = $(el).attr("href");
      if (!raw) return;

      // Resolve relative URLs
      let resolved: URL;
      try {
        resolved = new URL(raw, homepageUrl);
      } catch {
        return; // skip malformed URLs
      }

      // Strip fragments
      resolved.hash = "";

      // Only same-domain links
      if (resolved.hostname !== domain) return;

      // Only http/https
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return;

      const normalized = resolved.toString();
      discovered.add(normalized);
    });
  } catch (err) {
    console.warn(`[crawl] Failed to crawl homepage for ${domain}:`, err);
  }

  // Remove the trailing-slash duplicate of homepage if both exist
  if (discovered.has(homepageUrl) && discovered.has(`${homepageUrl}/`)) {
    discovered.delete(`${homepageUrl}/`);
  }
}

// ---------------------------------------------------------------------------
// Page fetcher
// ---------------------------------------------------------------------------

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": CRAWL_SETTINGS.USER_AGENT },
    signal: AbortSignal.timeout(CRAWL_SETTINGS.REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

// ---------------------------------------------------------------------------
// HTML parser
// ---------------------------------------------------------------------------

/**
 * Parse an HTML document into structured PageContent for scoring.
 *
 * Extracts: title, text, headings, lists, tables, links, schema markup,
 * meta tags, publish/modified dates, and author.
 */
export function parsePageContent(url: string, html: string): PageContent {
  const $ = cheerio.load(html);

  // --- Title ---
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
  const titleTag = $("title").first().text().trim();
  const title = ogTitle || titleTag || null;

  // --- Text content ---
  // Remove non-content elements before extracting text
  $("script, style, noscript, nav, footer, header, iframe, svg").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = text ? text.split(/\s+/).length : 0;

  // Reload for structured extraction (we need the full DOM back)
  const $full = cheerio.load(html);

  // --- Headings ---
  const headings: PageContent["headings"] = [];
  $full("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tagName = (el as any).tagName?.toLowerCase() ?? "";
    const level = parseInt(tagName.replace("h", ""), 10);
    const headingText = $full(el).text().trim();
    if (headingText && !isNaN(level)) {
      headings.push({ level, text: headingText });
    }
  });

  // --- Lists ---
  const lists: PageContent["lists"] = [];
  $full("ol, ul").each((_, el) => {
    const tagName = (el as any).tagName?.toLowerCase() ?? "";
    const ordered = tagName === "ol";
    const items: string[] = [];
    $full(el)
      .children("li")
      .each((_, li) => {
        const itemText = $full(li).text().trim();
        if (itemText) items.push(itemText);
      });
    if (items.length > 0) {
      lists.push({ ordered, items });
    }
  });

  // --- Tables ---
  const tables: PageContent["tables"] = [];
  $full("table").each((_, table) => {
    const headers: string[] = [];
    $full(table)
      .find("thead th, thead td, tr:first-child th")
      .each((_, th) => {
        headers.push($full(th).text().trim());
      });

    const rows: string[][] = [];
    const bodyRows = $full(table).find("tbody tr");
    const rowEls = bodyRows.length > 0 ? bodyRows : $full(table).find("tr").slice(headers.length > 0 ? 1 : 0);
    rowEls.each((_, tr) => {
      const cells: string[] = [];
      $full(tr)
        .find("td, th")
        .each((_, td) => {
          cells.push($full(td).text().trim());
        });
      if (cells.length > 0) {
        rows.push(cells);
      }
    });

    if (headers.length > 0 || rows.length > 0) {
      tables.push({ headers, rows });
    }
  });

  // --- Links ---
  const pageUrl = new URL(url);
  const links: PageContent["links"] = [];
  $full("a[href]").each((_, el) => {
    const href = $full(el).attr("href");
    if (!href) return;

    let resolved: URL;
    try {
      resolved = new URL(href, url);
    } catch {
      return;
    }

    // Skip non-http links (mailto:, javascript:, tel:, etc.)
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return;

    const linkText = $full(el).text().trim();
    const isExternal = resolved.hostname !== pageUrl.hostname;

    links.push({
      href: resolved.toString(),
      text: linkText,
      isExternal,
    });
  });

  // --- Schema markup (JSON-LD) ---
  const schemaMarkup: object[] = [];
  $full('script[type="application/ld+json"]').each((_, el) => {
    const raw = $full(el).html();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        schemaMarkup.push(parsed);
      }
    } catch {
      // skip malformed JSON-LD
    }
  });

  // --- Meta tags ---
  const metaTags: Record<string, string> = {};
  $full("meta").each((_, el) => {
    const name =
      $full(el).attr("name") ||
      $full(el).attr("property") ||
      $full(el).attr("http-equiv");
    const content = $full(el).attr("content");
    if (name && content) {
      metaTags[name] = content;
    }
  });

  // --- Dates ---
  const publishDate = extractDate($full, metaTags, schemaMarkup, "publish");
  const modifiedDate = extractDate($full, metaTags, schemaMarkup, "modified");

  // --- Author ---
  const author = extractAuthor($full, metaTags, schemaMarkup);

  return {
    url,
    title,
    html,
    text,
    wordCount,
    headings,
    lists,
    tables,
    links,
    schemaMarkup,
    metaTags,
    publishDate,
    modifiedDate,
    author,
    hasLlmsTxt: false, // set by the caller after checkLlmsTxt
  };
}

// ---------------------------------------------------------------------------
// Date extraction helper
// ---------------------------------------------------------------------------

function extractDate(
  $: cheerio.CheerioAPI,
  metaTags: Record<string, string>,
  schemas: object[],
  type: "publish" | "modified",
): string | null {
  // 1. Meta tags
  if (type === "publish") {
    const meta =
      metaTags["article:published_time"] ||
      metaTags["datePublished"] ||
      metaTags["date"] ||
      metaTags["DC.date.issued"];
    if (meta) return meta;
  } else {
    const meta =
      metaTags["article:modified_time"] ||
      metaTags["dateModified"] ||
      metaTags["DC.date.modified"];
    if (meta) return meta;
  }

  // 2. Schema.org JSON-LD
  const schemaKey = type === "publish" ? "datePublished" : "dateModified";
  for (const schema of schemas) {
    const value = findInSchema(schema, schemaKey);
    if (value && typeof value === "string") return value;
  }

  // 3. <time> element (publish only)
  if (type === "publish") {
    const timeEl = $("time[datetime]").first().attr("datetime");
    if (timeEl) return timeEl;
  }

  return null;
}

/**
 * Recursively search a schema object for a key.
 */
function findInSchema(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  if (key in (obj as Record<string, unknown>)) {
    return (obj as Record<string, unknown>)[key];
  }
  for (const v of Object.values(obj as Record<string, unknown>)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        const found = findInSchema(item, key);
        if (found) return found;
      }
    } else if (v && typeof v === "object") {
      const found = findInSchema(v, key);
      if (found) return found;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Author extraction helper
// ---------------------------------------------------------------------------

function extractAuthor(
  $: cheerio.CheerioAPI,
  metaTags: Record<string, string>,
  schemas: object[],
): string | null {
  // 1. Meta tags
  const metaAuthor =
    metaTags["article:author"] ||
    metaTags["author"] ||
    metaTags["DC.creator"];
  if (metaAuthor) return metaAuthor;

  // 2. Schema.org — look for author.name or author string
  for (const schema of schemas) {
    const authorVal = findInSchema(schema, "author");
    if (typeof authorVal === "string") return authorVal;
    if (authorVal && typeof authorVal === "object" && "name" in (authorVal as Record<string, unknown>)) {
      const name = (authorVal as Record<string, unknown>).name;
      if (typeof name === "string") return name;
    }
  }

  // 3. <meta name="author"> (already covered above via metaTags)
  // 4. rel="author" link
  const relAuthor = $('a[rel="author"]').first().text().trim();
  if (relAuthor) return relAuthor;

  return null;
}
