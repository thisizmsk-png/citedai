import { NextRequest, NextResponse } from "next/server";
import { scorePageContent, detectIssues, type PageContent } from "@citedai/scoring";
import * as cheerio from "cheerio";

/**
 * POST /v1/analyze — Analyze a single URL for AEO readiness
 *
 * Free-tier / quick-check endpoint. No auth required.
 * Rate-limited by IP (TODO: add rate limiting via Upstash).
 *
 * Body: { url: string }
 * Returns: AEO score + top issues + breakdown
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: { code: "MISSING_URL", message: "Provide a url to analyze" } },
        { status: 400 },
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: "Invalid URL format" } },
        { status: 400 },
      );
    }

    // Fetch the page
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "CitedAI-Scanner/1.0 (+https://citedai.com/bot)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: { code: "FETCH_FAILED", message: `HTTP ${response.status} from ${parsedUrl.hostname}` } },
        { status: 422 },
      );
    }

    const html = await response.text();

    // Check for /llms.txt
    let hasLlmsTxt = false;
    try {
      const llmsRes = await fetch(`${parsedUrl.origin}/llms.txt`, {
        method: "HEAD",
        signal: AbortSignal.timeout(3_000),
      });
      hasLlmsTxt = llmsRes.ok;
    } catch {
      // Ignore — just means no llms.txt
    }

    // Parse HTML into structured content
    const content = parseHtml(parsedUrl.toString(), html, hasLlmsTxt);

    // Score
    const score = scorePageContent(content);

    // Detect issues (limit to top 5 for free scan)
    const allIssues = detectIssues(content);
    const topIssues = allIssues.slice(0, 5);

    return NextResponse.json({
      data: {
        url: parsedUrl.toString(),
        title: content.title,
        wordCount: content.wordCount,
        score: score.overall,
        extractability: score.extractability,
        authority: score.authority,
        freshness: score.freshness,
        breakdown: score.breakdown,
        issues: topIssues,
        totalIssues: allIssues.length,
        hasSchemaMarkup: content.schemaMarkup.length > 0,
        hasLlmsTxt,
        schemaTypes: content.schemaMarkup
          .map((s: any) => s["@type"])
          .filter(Boolean),
      },
    });
  } catch (err: any) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      return NextResponse.json(
        { error: { code: "TIMEOUT", message: "Page took too long to respond" } },
        { status: 504 },
      );
    }
    console.error("[analyze] Error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to analyze URL" } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Inline HTML parser (same logic as worker, duplicated to avoid worker dep)
// ---------------------------------------------------------------------------

function parseHtml(url: string, html: string, hasLlmsTxt: boolean): PageContent {
  const $ = cheerio.load(html);
  const parsedUrl = new URL(url);

  // Title
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").text().trim() ||
    null;

  // Text content (strip non-content elements)
  $("script, style, nav, footer, header, aside, noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Headings
  const headings: PageContent["headings"] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = $(el).prop("tagName")?.toLowerCase() || "";
    const level = parseInt(tag.replace("h", ""), 10);
    const hText = $(el).text().trim();
    if (hText && !isNaN(level)) {
      headings.push({ level, text: hText });
    }
  });

  // Lists
  const lists: PageContent["lists"] = [];
  $("ol, ul").each((_, el) => {
    const ordered = $(el).prop("tagName")?.toLowerCase() === "ol";
    const items: string[] = [];
    $(el)
      .children("li")
      .each((_, li) => {
        const t = $(li).text().trim();
        if (t) items.push(t);
      });
    if (items.length > 0) lists.push({ ordered, items });
  });

  // Tables
  const tables: PageContent["tables"] = [];
  $("table").each((_, el) => {
    const headers: string[] = [];
    $(el)
      .find("thead th, tr:first-child th")
      .each((_, th) => { headers.push($(th).text().trim()); });
    const rows: string[][] = [];
    $(el)
      .find("tbody tr, tr")
      .each((_, tr) => {
        const cells: string[] = [];
        $(tr)
          .find("td")
          .each((_, td) => { cells.push($(td).text().trim()); });
        if (cells.length > 0) rows.push(cells);
      });
    if (headers.length > 0 || rows.length > 0) tables.push({ headers, rows });
  });

  // Links
  const links: PageContent["links"] = [];
  // Re-load to get links from full HTML (we removed elements above)
  const $full = cheerio.load(html);
  $full("a[href]").each((_, el) => {
    const href = $full(el).attr("href") || "";
    const linkText = $full(el).text().trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("javascript:") || href.startsWith("tel:")) return;
    try {
      const resolved = new URL(href, url);
      links.push({
        href: resolved.toString(),
        text: linkText,
        isExternal: resolved.hostname !== parsedUrl.hostname,
      });
    } catch {
      // Skip malformed URLs
    }
  });

  // Schema markup
  const schemaMarkup: object[] = [];
  $full('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($full(el).html() || "");
      if (parsed) schemaMarkup.push(parsed);
    } catch {
      // Skip malformed JSON-LD
    }
  });

  // Meta tags
  const metaTags: Record<string, string> = {};
  $full("meta").each((_, el) => {
    const name = $full(el).attr("name") || $full(el).attr("property") || "";
    const content = $full(el).attr("content") || "";
    if (name && content) metaTags[name] = content;
  });

  // Dates
  const publishDate =
    metaTags["article:published_time"] ||
    metaTags["datePublished"] ||
    metaTags["date"] ||
    null;
  const modifiedDate =
    metaTags["article:modified_time"] ||
    metaTags["dateModified"] ||
    null;

  // Author
  const author =
    metaTags["article:author"] ||
    metaTags["author"] ||
    null;

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
    hasLlmsTxt,
  };
}
