import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

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
// Constants
// ---------------------------------------------------------------------------
const MAX_URL_LENGTH = 2048;
const MAX_BODY_SIZE = 5 * 1024 * 1024;
const VALID_SCHEMA_TYPES = ["Article", "FAQPage", "HowTo", "WebPage"] as const;
type SchemaType = (typeof VALID_SCHEMA_TYPES)[number];

function sanitizeUrl(input: string): string {
  return input.trim().slice(0, MAX_URL_LENGTH);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SchemaRequest {
  url: string;
  type: SchemaType;
  title?: string;
  author?: string;
  datePublished?: string;
  description?: string;
}

interface PageMeta {
  title: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified: string;
  image: string;
  hostname: string;
  headings: { level: number; text: string }[];
  faqPairs: { question: string; answer: string }[];
  steps: string[];
}

// ---------------------------------------------------------------------------
// Fetch and extract page metadata
// ---------------------------------------------------------------------------
async function fetchPageMeta(url: string): Promise<PageMeta | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "CitedAI-Generator/1.0 (+https://citedai.com/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8_000),
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
    const html = new TextDecoder().decode(Buffer.concat(chunks));

    const $ = cheerio.load(html);
    const parsedUrl = new URL(url);

    const title =
      $('meta[property="og:title"]').attr("content") ??
      $("title").text().trim() ??
      "";

    const description =
      $('meta[name="description"]').attr("content") ??
      $('meta[property="og:description"]').attr("content") ??
      "";

    const author =
      $('meta[name="author"]').attr("content") ??
      $('meta[property="article:author"]').attr("content") ??
      "";

    const datePublished =
      $('meta[property="article:published_time"]').attr("content") ??
      $('meta[name="datePublished"]').attr("content") ??
      $("time[datetime]").first().attr("datetime") ??
      "";

    const dateModified =
      $('meta[property="article:modified_time"]').attr("content") ??
      $('meta[name="dateModified"]').attr("content") ??
      "";

    const image =
      $('meta[property="og:image"]').attr("content") ??
      $('meta[name="twitter:image"]').attr("content") ??
      "";

    // Extract headings for FAQ detection
    const headings: { level: number; text: string }[] = [];
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
      const tag = $(el).prop("tagName")?.toLowerCase() ?? "";
      const level = parseInt(tag.replace("h", ""), 10);
      const text = $(el).text().trim();
      if (text && !isNaN(level)) headings.push({ level, text });
    });

    // Extract FAQ pairs (question headings + following paragraph)
    const faqPairs: { question: string; answer: string }[] = [];
    $("h2, h3").each((_, el) => {
      const qText = $(el).text().trim();
      if (qText.endsWith("?")) {
        const nextP = $(el).next("p").text().trim();
        if (nextP) {
          faqPairs.push({ question: qText, answer: nextP });
        }
      }
    });

    // Extract ordered list items for HowTo steps
    const steps: string[] = [];
    $("ol").first().find("li").each((_, el) => {
      const text = $(el).text().trim();
      if (text) steps.push(text);
    });

    return {
      title,
      description,
      author,
      datePublished,
      dateModified,
      image,
      hostname: parsedUrl.hostname,
      headings,
      faqPairs,
      steps,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Schema generators
// ---------------------------------------------------------------------------

function generateArticleSchema(
  url: string,
  meta: PageMeta | null,
  overrides: Partial<SchemaRequest>,
): object {
  const now = new Date().toISOString().split("T")[0];
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: overrides.title || meta?.title || "Article Title",
    description: overrides.description || meta?.description || "Article description",
    url,
    datePublished: overrides.datePublished || meta?.datePublished || now,
    dateModified: meta?.dateModified || overrides.datePublished || now,
    author: {
      "@type": "Person",
      name: overrides.author || meta?.author || "Author Name",
    },
    publisher: {
      "@type": "Organization",
      name: meta?.hostname || new URL(url).hostname,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  if (meta?.image) {
    schema.image = {
      "@type": "ImageObject",
      url: meta.image,
    };
  }

  return schema;
}

function generateFaqPageSchema(
  url: string,
  meta: PageMeta | null,
  overrides: Partial<SchemaRequest>,
): object {
  // Use extracted FAQ pairs or generate placeholder
  let faqItems: { question: string; answer: string }[] = meta?.faqPairs ?? [];
  if (faqItems.length === 0) {
    // Generate placeholder FAQ items from question headings
    const questionHeadings = meta?.headings?.filter((h) => h.text.endsWith("?")) ?? [];
    if (questionHeadings.length > 0) {
      faqItems = questionHeadings.map((h) => ({
        question: h.text,
        answer: "Answer to this question.",
      }));
    } else {
      faqItems = [
        { question: "What is [topic]?", answer: "Replace with your answer." },
        { question: "How does [topic] work?", answer: "Replace with your answer." },
        { question: "Why is [topic] important?", answer: "Replace with your answer." },
      ];
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: overrides.title || meta?.title || "Frequently Asked Questions",
    description: overrides.description || meta?.description || "",
    url,
    mainEntity: faqItems.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

function generateHowToSchema(
  url: string,
  meta: PageMeta | null,
  overrides: Partial<SchemaRequest>,
): object {
  // Use extracted steps or generate placeholder
  let steps = meta?.steps ?? [];
  if (steps.length === 0) {
    steps = [
      "Step 1: Replace with your first step.",
      "Step 2: Replace with your second step.",
      "Step 3: Replace with your third step.",
    ];
  }

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: overrides.title || meta?.title || "How To Guide",
    description: overrides.description || meta?.description || "",
    url,
    datePublished: overrides.datePublished || meta?.datePublished || new Date().toISOString().split("T")[0],
    author: {
      "@type": "Person",
      name: overrides.author || meta?.author || "Author Name",
    },
    step: steps.map((text, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: `Step ${i + 1}`,
      text,
    })),
  };
}

function generateWebPageSchema(
  url: string,
  meta: PageMeta | null,
  overrides: Partial<SchemaRequest>,
): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: overrides.title || meta?.title || "Page Title",
    description: overrides.description || meta?.description || "",
    url,
    datePublished: overrides.datePublished || meta?.datePublished || new Date().toISOString().split("T")[0],
    dateModified: meta?.dateModified || new Date().toISOString().split("T")[0],
    author: {
      "@type": "Person",
      name: overrides.author || meta?.author || "Author Name",
    },
    isPartOf: {
      "@type": "WebSite",
      name: meta?.hostname || new URL(url).hostname,
      url: new URL(url).origin,
    },
  };
}

// ---------------------------------------------------------------------------
// POST /api/v1/generate/schema
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
        { error: { code: "MISSING_URL", message: "Provide a url to generate schema for" } },
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

    // Validate schema type
    const schemaType = typeof body.type === "string" ? body.type : "Article";
    if (!VALID_SCHEMA_TYPES.includes(schemaType as SchemaType)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_TYPE",
            message: `Invalid schema type. Must be one of: ${VALID_SCHEMA_TYPES.join(", ")}`,
          },
        },
        { status: 400 },
      );
    }

    // Fetch page metadata for auto-fill
    const meta = await fetchPageMeta(parsedUrl.toString());

    const overrides: Partial<SchemaRequest> = {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      author: typeof body.author === "string" ? body.author.trim() : undefined,
      datePublished: typeof body.datePublished === "string" ? body.datePublished.trim() : undefined,
      description: typeof body.description === "string" ? body.description.trim() : undefined,
    };

    // Generate schema based on type
    let schema: object;
    switch (schemaType as SchemaType) {
      case "Article":
        schema = generateArticleSchema(parsedUrl.toString(), meta, overrides);
        break;
      case "FAQPage":
        schema = generateFaqPageSchema(parsedUrl.toString(), meta, overrides);
        break;
      case "HowTo":
        schema = generateHowToSchema(parsedUrl.toString(), meta, overrides);
        break;
      case "WebPage":
        schema = generateWebPageSchema(parsedUrl.toString(), meta, overrides);
        break;
      default:
        schema = generateArticleSchema(parsedUrl.toString(), meta, overrides);
    }

    // Format the full script tag
    const markup = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;

    return NextResponse.json({
      data: {
        markup,
        type: schemaType,
        schema,
        autoFilledFrom: meta ? parsedUrl.toString() : null,
      },
    });
  } catch (err: unknown) {
    console.error("[generate/schema] Unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred. Please try again." } },
      { status: 500 },
    );
  }
}
