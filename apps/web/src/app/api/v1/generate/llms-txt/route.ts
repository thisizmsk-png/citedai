import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { validateExternalUrl } from "@/lib/ssrf-guard";

// ---------------------------------------------------------------------------
// Rate limiting (in-memory for MVP)
// ---------------------------------------------------------------------------
const MAX_RATE_ENTRIES = 10_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
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
// Input validation
// ---------------------------------------------------------------------------
const MAX_URL_LENGTH = 2048;
const MAX_BODY_SIZE = 5 * 1024 * 1024;

function sanitizeUrl(input: string): string {
  return input.trim().slice(0, MAX_URL_LENGTH);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LlmsTxtRequest {
  url: string;
  title?: string;
  description?: string;
  pages?: { url: string; description: string }[];
}

interface DiscoveredPage {
  url: string;
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Safe fetch helper with SSRF protection (C2 fix)
// ---------------------------------------------------------------------------
async function safeFetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    // SSRF check — block internal/private URLs
    const parsedUrl = new URL(url);
    const isExternal = await validateExternalUrl(parsedUrl);
    if (!isExternal) return null;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "CitedAI-Generator/1.0 (+https://citedai.com/bot)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;

    // Read with size limit
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_BODY_SIZE) { reader.cancel(); return null; }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Discover pages from homepage + sitemap
// ---------------------------------------------------------------------------
async function discoverPages(origin: string): Promise<DiscoveredPage[]> {
  const pages: DiscoveredPage[] = [];
  const seen = new Set<string>();

  // 1. Try sitemap.xml
  const sitemapUrls = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  for (const sitemapUrl of sitemapUrls) {
    const xml = await safeFetchText(sitemapUrl, 8_000);
    if (!xml) continue;

    // Extract <loc> entries from sitemap
    const locMatches = xml.match(/<loc>([^<]+)<\/loc>/gi) ?? [];
    for (const match of locMatches) {
      const url = match.replace(/<\/?loc>/gi, "").trim();
      if (url && !seen.has(url) && url.startsWith("http")) {
        seen.add(url);
        // Derive a description from the URL path
        const path = new URL(url).pathname;
        const desc = pathToDescription(path);
        pages.push({ url, title: desc, description: desc });
      }
      if (pages.length >= 50) break; // Cap discovery
    }
    if (pages.length > 0) break;
  }

  // 2. Crawl homepage for links
  const html = await safeFetchText(origin, 8_000);
  if (html) {
    const $ = cheerio.load(html);
    const hostname = new URL(origin).hostname;

    // Extract page title and meta description for the main site
    const siteTitle = $("title").text().trim();
    const siteDesc =
      $('meta[name="description"]').attr("content") ??
      $('meta[property="og:description"]').attr("content") ??
      "";

    // If we don't have sitemap pages, add the homepage
    if (!seen.has(origin) && !seen.has(origin + "/")) {
      pages.unshift({
        url: origin,
        title: siteTitle || hostname,
        description: siteDesc || `Main page of ${hostname}`,
      });
      seen.add(origin);
    }

    // Extract internal links
    $("a[href]").each((_, el) => {
      if (pages.length >= 50) return;
      const href = $(el).attr("href") ?? "";
      try {
        const resolved = new URL(href, origin);
        if (resolved.hostname !== hostname) return;
        const cleanUrl = `${resolved.origin}${resolved.pathname}`;
        if (seen.has(cleanUrl)) return;
        seen.add(cleanUrl);

        const linkText = $(el).text().trim();
        const desc = linkText || pathToDescription(resolved.pathname);
        pages.push({ url: cleanUrl, title: desc, description: desc });
      } catch {
        // Skip malformed
      }
    });
  }

  return pages.slice(0, 50);
}

function pathToDescription(path: string): string {
  if (path === "/" || path === "") return "Homepage";
  const cleaned = path
    .replace(/^\/+|\/+$/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\.\w+$/, "");
  // Capitalize words
  return cleaned
    .split("/")
    .pop()
    ?.split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") ?? path;
}

// ---------------------------------------------------------------------------
// Generate /llms.txt content per llmstxt.org spec
// ---------------------------------------------------------------------------
function generateLlmsTxt(
  siteUrl: string,
  title: string,
  description: string,
  pages: DiscoveredPage[],
): string {
  const hostname = new URL(siteUrl).hostname;
  const lines: string[] = [];

  // Title (H1 equivalent)
  lines.push(`# ${title || hostname}`);
  lines.push("");

  // Description blockquote
  if (description) {
    lines.push(`> ${description}`);
    lines.push("");
  }

  // Group pages by section
  const sections = groupPagesBySection(pages);

  for (const [section, sectionPages] of Object.entries(sections)) {
    lines.push(`## ${section}`);
    lines.push("");
    for (const page of sectionPages) {
      lines.push(`- [${page.title}](${page.url}): ${page.description}`);
    }
    lines.push("");
  }

  // Optional section
  if (pages.length > 20) {
    lines.push("## Optional");
    lines.push("");
    lines.push(
      "- The above pages represent the most important content. For a complete index, see the sitemap.",
    );
    lines.push("");
  }

  return lines.join("\n");
}

function groupPagesBySection(
  pages: DiscoveredPage[],
): Record<string, DiscoveredPage[]> {
  const sections: Record<string, DiscoveredPage[]> = {};

  for (const page of pages) {
    let section = "Pages";
    try {
      const path = new URL(page.url).pathname.toLowerCase();
      if (path === "/" || path === "") {
        section = "Main";
      } else if (path.includes("/blog") || path.includes("/post") || path.includes("/article")) {
        section = "Blog";
      } else if (path.includes("/doc") || path.includes("/guide") || path.includes("/tutorial")) {
        section = "Documentation";
      } else if (path.includes("/api")) {
        section = "API Reference";
      } else if (path.includes("/about") || path.includes("/team") || path.includes("/contact")) {
        section = "About";
      } else if (path.includes("/pricing") || path.includes("/plan")) {
        section = "Pricing";
      } else if (path.includes("/product") || path.includes("/feature")) {
        section = "Product";
      } else if (path.includes("/legal") || path.includes("/privacy") || path.includes("/terms")) {
        section = "Legal";
      }
    } catch {
      // Keep default
    }

    if (!sections[section]) sections[section] = [];
    sections[section].push(page);
  }

  // Ensure "Main" comes first
  const ordered: Record<string, DiscoveredPage[]> = {};
  if (sections["Main"]) {
    ordered["Main"] = sections["Main"];
    delete sections["Main"];
  }
  Object.assign(ordered, sections);
  return ordered;
}

// ---------------------------------------------------------------------------
// POST /api/v1/generate/llms-txt
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // Rate limit
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
        { error: { code: "MISSING_URL", message: "Provide a url to generate /llms.txt for" } },
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

    const origin = parsedUrl.origin;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    // Use provided pages or auto-discover
    let pages: DiscoveredPage[];
    if (Array.isArray(body.pages) && body.pages.length > 0) {
      pages = (body.pages as { url?: string; description?: string }[])
        .filter((p) => typeof p.url === "string" && p.url.trim())
        .map((p) => ({
          url: p.url as string,
          title: pathToDescription(new URL(p.url as string).pathname),
          description: typeof p.description === "string" ? p.description : "",
        }));
    } else {
      // Auto-discover from sitemap + homepage
      pages = await discoverPages(origin);
    }

    // If no title, try fetching from homepage
    let finalTitle = title;
    let finalDescription = description;
    if (!finalTitle || !finalDescription) {
      const html = await safeFetchText(origin, 6_000);
      if (html) {
        const $ = cheerio.load(html);
        if (!finalTitle) {
          finalTitle =
            $('meta[property="og:site_name"]').attr("content") ??
            $("title").text().trim().split(/\s*[|–—-]\s*/)[0] ??
            parsedUrl.hostname;
        }
        if (!finalDescription) {
          finalDescription =
            $('meta[name="description"]').attr("content") ??
            $('meta[property="og:description"]').attr("content") ??
            "";
        }
      }
    }

    if (!finalTitle) finalTitle = parsedUrl.hostname;

    const content = generateLlmsTxt(origin, finalTitle, finalDescription, pages);

    return NextResponse.json({
      data: {
        content,
        filename: "llms.txt",
        pagesDiscovered: pages.length,
      },
    });
  } catch (err: unknown) {
    console.error("[generate/llms-txt] Unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred. Please try again." } },
      { status: 500 },
    );
  }
}
