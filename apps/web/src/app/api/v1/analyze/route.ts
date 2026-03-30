import { NextRequest, NextResponse } from "next/server";
import { scorePageContent, detectIssues, type PageContent } from "@citedai/scoring";
import * as cheerio from "cheerio";
import dns from "node:dns/promises";
import net from "node:net";

// ---------------------------------------------------------------------------
// Rate limiting (in-memory for MVP — TODO: replace with Upstash Redis)
// Max 10K entries to prevent memory exhaustion (Bhishma Finding #5)
// ---------------------------------------------------------------------------
const MAX_RATE_ENTRIES = 10_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // Cap map size to prevent memory exhaustion
    if (rateLimitMap.size >= MAX_RATE_ENTRIES) {
      const oldest = rateLimitMap.keys().next().value;
      if (oldest) rateLimitMap.delete(oldest);
    }
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ---------------------------------------------------------------------------
// SSRF protection — resolves DNS and checks the actual IP addresses
// Fixes: DNS rebinding (Finding #1), redirect bypass (#2), IPv6/hex (#3)
// ---------------------------------------------------------------------------

function isPrivateIp(ip: string): boolean {
  // Normalize IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1)
  const normalized = ip.replace(/^::ffff:/, "");

  if (net.isIPv4(normalized)) {
    const parts = normalized.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  if (net.isIPv6(normalized)) {
    // Loopback ::1
    if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
    // Link-local fe80::/10
    if (normalized.startsWith("fe80:")) return true;
    // Unique local fc00::/7
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    return false;
  }

  return false;
}

async function resolveAndCheckDns(hostname: string): Promise<boolean> {
  // Direct IP address — check immediately
  if (net.isIP(hostname)) return isPrivateIp(hostname);

  // Block known internal hostnames
  const blocked = new Set([
    "localhost", "metadata.google.internal", "metadata.google.com",
  ]);
  if (blocked.has(hostname.toLowerCase())) return true;

  // Resolve DNS and check all resulting IPs
  try {
    const addresses = await dns.resolve4(hostname).catch(() => []);
    const addresses6 = await dns.resolve6(hostname).catch(() => []);
    const all = [...addresses, ...addresses6];

    if (all.length === 0) return false; // Let fetch handle DNS failure

    for (const addr of all) {
      if (isPrivateIp(addr)) return true;
    }
  } catch {
    // DNS resolution failed — let fetch handle it
  }

  return false;
}

function isBlockedProtocol(url: URL): boolean {
  return url.protocol !== "https:" && url.protocol !== "http:";
}

// ---------------------------------------------------------------------------
// Safe fetch with redirect validation (Bhishma Finding #2)
// ---------------------------------------------------------------------------
const MAX_REDIRECTS = 3;

async function safeFetch(
  url: URL,
  timeoutMs: number,
): Promise<Response> {
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount <= MAX_REDIRECTS) {
    if (isBlockedProtocol(currentUrl)) {
      throw new Error("BLOCKED_PROTOCOL");
    }

    const isPrivate = await resolveAndCheckDns(currentUrl.hostname);
    if (isPrivate) {
      throw new Error("BLOCKED_SSRF");
    }

    const response = await fetch(currentUrl.toString(), {
      headers: {
        "User-Agent": "CitedAI-Scanner/1.0 (+https://citedai.com/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual", // Don't auto-follow — we validate each redirect
      signal: AbortSignal.timeout(timeoutMs),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("REDIRECT_NO_LOCATION");

      redirectCount++;
      if (redirectCount > MAX_REDIRECTS) throw new Error("TOO_MANY_REDIRECTS");

      currentUrl = new URL(location, currentUrl);
      continue;
    }

    return response;
  }

  throw new Error("TOO_MANY_REDIRECTS");
}

// ---------------------------------------------------------------------------
// Streaming body reader with size limit (Bhishma Finding #6)
// ---------------------------------------------------------------------------
async function readBodyWithLimit(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const MAX_URL_LENGTH = 2048;
const MAX_HTML_SIZE = 5 * 1024 * 1024; // 5MB

function sanitizeUrl(input: string): string {
  return input.trim().slice(0, MAX_URL_LENGTH);
}

// ---------------------------------------------------------------------------
// POST /v1/analyze — Analyze a single URL for AEO readiness
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests. Try again in a minute." } },
        { status: 429 },
      );
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
        { status: 400 },
      );
    }

    const rawUrl = typeof body.url === "string" ? sanitizeUrl(body.url) : "";

    if (!rawUrl) {
      return NextResponse.json(
        { error: { code: "MISSING_URL", message: "Provide a url to analyze" } },
        { status: 400 },
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: "Invalid URL format" } },
        { status: 400 },
      );
    }

    // SSRF protection — check protocol before DNS resolution
    if (isBlockedProtocol(parsedUrl)) {
      return NextResponse.json(
        { error: { code: "BLOCKED_URL", message: "Only HTTP and HTTPS URLs are allowed" } },
        { status: 400 },
      );
    }

    // Fetch the page with SSRF-safe redirect handling
    let response: Response;
    try {
      response = await safeFetch(parsedUrl, 10_000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg === "BLOCKED_SSRF" || msg === "BLOCKED_PROTOCOL") {
        return NextResponse.json(
          { error: { code: "BLOCKED_URL", message: "Cannot scan internal or private URLs" } },
          { status: 400 },
        );
      }
      if (msg === "TOO_MANY_REDIRECTS" || msg === "REDIRECT_NO_LOCATION") {
        return NextResponse.json(
          { error: { code: "TOO_MANY_REDIRECTS", message: "URL redirected too many times" } },
          { status: 422 },
        );
      }
      if (msg.includes("fetch failed") || msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED")) {
        return NextResponse.json(
          { error: { code: "UNREACHABLE", message: `Could not reach ${parsedUrl.hostname}. Check the URL and try again.` } },
          { status: 422 },
        );
      }
      if (msg.includes("AbortError") || msg.includes("TimeoutError") || msg.includes("timed out")) {
        return NextResponse.json(
          { error: { code: "TIMEOUT", message: "Page took too long to respond (>10s)" } },
          { status: 504 },
        );
      }
      throw err;
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: { code: "FETCH_FAILED", message: `HTTP ${response.status} from ${parsedUrl.hostname}` } },
        { status: 422 },
      );
    }

    // Validate content type
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        { error: { code: "NOT_HTML", message: `URL returned ${contentType}, expected HTML` } },
        { status: 422 },
      );
    }

    // Read body with streaming size limit (prevents unbounded memory consumption)
    let html: string;
    try {
      html = await readBodyWithLimit(response, MAX_HTML_SIZE);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "BODY_TOO_LARGE") {
        return NextResponse.json(
          { error: { code: "TOO_LARGE", message: "Page exceeds 5MB size limit" } },
          { status: 422 },
        );
      }
      throw err;
    }

    // Check for /llms.txt (non-blocking, best-effort)
    let hasLlmsTxt = false;
    try {
      const llmsRes = await fetch(`${parsedUrl.origin}/llms.txt`, {
        method: "HEAD",
        signal: AbortSignal.timeout(3_000),
      });
      hasLlmsTxt = llmsRes.ok;
    } catch {
      // Ignore — no llms.txt or unreachable
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
          .map((s) => (s as Record<string, unknown>)["@type"])
          .filter(Boolean) as string[],
      },
    });
  } catch (err: unknown) {
    const errObj = err instanceof Error ? err : new Error(String(err));
    if (errObj.name === "AbortError" || errObj.name === "TimeoutError") {
      return NextResponse.json(
        { error: { code: "TIMEOUT", message: "Page took too long to respond (>10s)" } },
        { status: 504 },
      );
    }
    console.error("[analyze] Unexpected error:", errObj.message);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred. Please try again." } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// HTML parser
// ---------------------------------------------------------------------------
function parseHtml(url: string, html: string, hasLlmsTxt: boolean): PageContent {
  const $ = cheerio.load(html);
  const parsedUrl = new URL(url);

  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").text().trim() ||
    null;

  // Strip non-content elements for text extraction
  $("script, style, nav, footer, header, aside, noscript, svg, iframe").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const headings: PageContent["headings"] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = $(el).prop("tagName")?.toLowerCase() || "";
    const level = parseInt(tag.replace("h", ""), 10);
    const hText = $(el).text().trim();
    if (hText && !isNaN(level)) headings.push({ level, text: hText });
  });

  const lists: PageContent["lists"] = [];
  $("ol, ul").each((_, el) => {
    const ordered = $(el).prop("tagName")?.toLowerCase() === "ol";
    const items: string[] = [];
    $(el).children("li").each((_, li) => {
      const t = $(li).text().trim();
      if (t) items.push(t);
    });
    if (items.length > 0) lists.push({ ordered, items });
  });

  const tables: PageContent["tables"] = [];
  $("table").each((_, el) => {
    const headers: string[] = [];
    $(el).find("thead th, tr:first-child th").each((_, th) => {
      headers.push($(th).text().trim());
    });
    const rows: string[][] = [];
    $(el).find("tbody tr, tr").each((_, tr) => {
      const cells: string[] = [];
      $(tr).find("td").each((_, td) => {
        cells.push($(td).text().trim());
      });
      if (cells.length > 0) rows.push(cells);
    });
    if (headers.length > 0 || rows.length > 0) tables.push({ headers, rows });
  });

  // Re-load full HTML for links and schema (we removed elements above)
  const $full = cheerio.load(html);

  const links: PageContent["links"] = [];
  $full("a[href]").each((_, el) => {
    const href = $full(el).attr("href") || "";
    const linkText = $full(el).text().trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("javascript:") || href.startsWith("tel:")) return;
    try {
      const resolved = new URL(href, url);
      if (resolved.protocol === "https:" || resolved.protocol === "http:") {
        links.push({
          href: resolved.toString(),
          text: linkText,
          isExternal: resolved.hostname !== parsedUrl.hostname,
        });
      }
    } catch {
      // Skip malformed
    }
  });

  const schemaMarkup: object[] = [];
  $full('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($full(el).html() || "");
      if (parsed && typeof parsed === "object") schemaMarkup.push(parsed);
    } catch {
      // Skip malformed JSON-LD
    }
  });

  const metaTags: Record<string, string> = {};
  $full("meta").each((_, el) => {
    const name = $full(el).attr("name") || $full(el).attr("property") || "";
    const metaContent = $full(el).attr("content") || "";
    if (name && metaContent) metaTags[name] = metaContent;
  });

  const publishDate =
    metaTags["article:published_time"] ||
    metaTags["datePublished"] ||
    metaTags["date"] ||
    null;
  const modifiedDate =
    metaTags["article:modified_time"] ||
    metaTags["dateModified"] ||
    null;
  const author =
    metaTags["article:author"] ||
    metaTags["author"] ||
    null;

  return {
    url, title, html, text, wordCount, headings, lists, tables, links,
    schemaMarkup, metaTags, publishDate, modifiedDate, author, hasLlmsTxt,
  };
}
