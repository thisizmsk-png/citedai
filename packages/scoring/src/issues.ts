import type { Issue } from "@citedai/shared";
import { ISSUE_TYPES } from "@citedai/shared";
import type { PageContent } from "./scorer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

/** True if the paragraph looks like a short answer/definition (2-3 sentences, <60 words). */
function isAnswerBlock(text: string): boolean {
  const words = text.trim().split(/\s+/);
  if (words.length < 8 || words.length > 60) return false;
  // Must have at least 1 sentence-ending punctuation
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  return sentences.length >= 1 && sentences.length <= 4;
}

/** Extract short paragraphs that follow headings from the raw HTML. */
function findAnswerBlocks(content: PageContent): string[] {
  const blocks: string[] = [];
  // Split HTML by heading tags and check the first paragraph after each heading
  const parts = content.html.split(/<h[1-6][^>]*>/i);
  for (let i = 1; i < parts.length; i++) {
    // Find the first <p> after the heading close
    const afterHeading = parts[i].replace(/<\/h[1-6]>/i, "");
    const pMatch = afterHeading.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (pMatch) {
      const text = pMatch[1].replace(/<[^>]+>/g, "").trim();
      if (isAnswerBlock(text)) {
        blocks.push(text);
      }
    }
  }
  return blocks;
}

/** Check if any heading is phrased as a question. */
function hasQuestionHeadings(content: PageContent): boolean {
  return content.headings.some(
    (h) => h.level >= 2 && h.text.trim().endsWith("?"),
  );
}

/** Count <img> tags missing alt text in raw HTML. */
function countImagesWithoutAlt(html: string): number {
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  let missing = 0;
  for (const tag of imgTags) {
    // Missing alt attribute, or alt="" (empty)
    const altMatch = tag.match(/\balt\s*=\s*["']([^"']*)["']/i);
    if (!altMatch || altMatch[1].trim() === "") {
      missing++;
    }
  }
  return missing;
}

/** Parse a date string and return how many months old it is, or null if unparseable. */
function monthsAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

// ---------------------------------------------------------------------------
// Main detection function
// ---------------------------------------------------------------------------

/**
 * Detect AEO issues for a page and return prioritized recommendations.
 *
 * Called after scoring. Uses the same PageContent input.
 * Returns issues sorted by severity (critical > warning > info),
 * then by estimatedImpact descending within each severity band.
 */
export function detectIssues(content: PageContent): Issue[] {
  const issues: Issue[] = [];

  // =========================================================================
  // CRITICAL issues
  // =========================================================================

  // 1. No Schema.org markup
  if (content.schemaMarkup.length === 0) {
    issues.push({
      category: "extractability",
      severity: "critical",
      issueType: ISSUE_TYPES.NO_SCHEMA,
      description:
        "No Schema.org structured data found on this page. AI systems rely on schema markup to understand content type and structure.",
      recommendation:
        "Add JSON-LD schema markup (Article, FAQPage, or HowTo) to help AI systems parse and cite your content.",
      suggestedFix: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${content.title ?? "Your Page Title"}",
  "author": { "@type": "Person", "name": "Author Name" },
  "datePublished": "${new Date().toISOString().split("T")[0]}",
  "description": "A concise description of your article."
}
</script>`,
      estimatedImpact: 9,
    });
  }

  // 2. No answer blocks (short definition paragraphs after headings)
  const answerBlocks = findAnswerBlocks(content);
  if (answerBlocks.length === 0) {
    issues.push({
      category: "extractability",
      severity: "critical",
      issueType: ISSUE_TYPES.MISSING_ANSWER_BLOCK,
      description:
        "No self-contained answer blocks found. AI systems cannot extract a concise, quotable answer from this page.",
      recommendation:
        "Add a 2-3 sentence summary paragraph immediately after your main heading (H1) that directly answers the page's primary question. Repeat for each H2 section.",
      suggestedFix: `<!-- Add after your H1 or key H2 headings -->
<p>
  [Topic] is [concise definition in 1 sentence]. It works by [brief mechanism].
  This matters because [key benefit or implication].
</p>`,
      estimatedImpact: 9,
    });
  }

  // 3. No /llms.txt file
  if (!content.hasLlmsTxt) {
    issues.push({
      category: "authority",
      severity: "critical",
      issueType: ISSUE_TYPES.NO_LLMS_TXT,
      description:
        "No /llms.txt file found for this domain. AI crawlers cannot discover your content preferences.",
      recommendation:
        "Create a /llms.txt file at your domain root to tell AI systems how to use your content.",
      suggestedFix: `# /llms.txt — AI Content Guidance
# See https://llmstxt.org for specification

# Site info
> Site: ${content.url ? new URL(content.url).hostname : "yourdomain.com"}
> Description: Brief description of your site and expertise areas.

# Content policies
> Cite-OK: yes
> Crawl-OK: yes
> Attribution: Please cite as "[Site Name]"

# Key pages
- /about: Author credentials and expertise
- /: Main content hub`,
      estimatedImpact: 8,
    });
  }

  // =========================================================================
  // WARNING issues
  // =========================================================================

  // 4. No publication date
  if (!content.publishDate) {
    issues.push({
      category: "authority",
      severity: "warning",
      issueType: ISSUE_TYPES.NO_PUB_DATE,
      description:
        "No publication date found. AI systems use dates to assess content freshness and may deprioritize undated content.",
      recommendation:
        'Add a visible publication date and a <meta property="article:published_time"> tag.',
      suggestedFix: `<meta property="article:published_time" content="${new Date().toISOString()}" />
<time datetime="${new Date().toISOString().split("T")[0]}">Published: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time>`,
      estimatedImpact: 7,
    });
  }

  // 5. No author attribution
  if (!content.author) {
    issues.push({
      category: "authority",
      severity: "warning",
      issueType: ISSUE_TYPES.NO_AUTHOR,
      description:
        "No author attribution found. AI systems weigh attributed content higher when selecting sources to cite.",
      recommendation:
        'Add an author byline with credentials and a <meta name="author"> tag.',
      suggestedFix: `<meta name="author" content="Your Name" />
<address class="author">
  By <a rel="author" href="/about">Your Name</a>, [Your Credentials]
</address>`,
      estimatedImpact: 7,
    });
  }

  // 6. No FAQ-style headings (questions)
  if (!hasQuestionHeadings(content)) {
    issues.push({
      category: "extractability",
      severity: "warning",
      issueType: ISSUE_TYPES.WEAK_FAQ_STRUCTURE,
      description:
        "No question-style headings (H2/H3 ending with '?') found. AI systems match user queries against heading text.",
      recommendation:
        "Rephrase some section headings as questions that your audience actually asks (e.g., 'What is X?', 'How does Y work?').",
      suggestedFix: `<!-- Instead of: -->
<h2>Benefits of X</h2>

<!-- Use: -->
<h2>What are the benefits of X?</h2>
<p>The main benefits of X are... [2-3 sentence answer]</p>`,
      estimatedImpact: 7,
    });
  }

  // 7. No ordered lists (step-by-step content)
  const orderedLists = content.lists.filter((l) => l.ordered);
  if (orderedLists.length === 0) {
    issues.push({
      category: "extractability",
      severity: "warning",
      issueType: ISSUE_TYPES.NO_STEP_LISTS,
      description:
        "No ordered/numbered lists found. Step-by-step content is highly extractable by AI systems for how-to answers.",
      recommendation:
        'Add at least one numbered list for any procedural or sequential content (e.g., "How to..." sections).',
      suggestedFix: `<h2>How to [accomplish task]</h2>
<ol>
  <li><strong>Step 1:</strong> [Action and brief explanation]</li>
  <li><strong>Step 2:</strong> [Action and brief explanation]</li>
  <li><strong>Step 3:</strong> [Action and brief explanation]</li>
</ol>`,
      estimatedImpact: 6,
    });
  }

  // 8. No comparison tables
  if (content.tables.length === 0) {
    issues.push({
      category: "extractability",
      severity: "warning",
      issueType: ISSUE_TYPES.NO_COMPARISON_TABLES,
      description:
        "No comparison tables found. AI systems favor structured tabular data for comparison queries.",
      recommendation:
        "Add a comparison table if your content involves comparing options, features, or alternatives.",
      suggestedFix: `<table>
  <thead>
    <tr><th>Feature</th><th>Option A</th><th>Option B</th></tr>
  </thead>
  <tbody>
    <tr><td>Price</td><td>$X</td><td>$Y</td></tr>
    <tr><td>Key Benefit</td><td>...</td><td>...</td></tr>
  </tbody>
</table>`,
      estimatedImpact: 5,
    });
  }

  // 9. No external citations/links
  const externalLinks = content.links.filter((l) => l.isExternal);
  if (externalLinks.length === 0) {
    issues.push({
      category: "authority",
      severity: "warning",
      issueType: ISSUE_TYPES.NO_CITATIONS,
      description:
        "No outbound links to external sources. AI systems trust content that cites authoritative references.",
      recommendation:
        "Link to reputable external sources (studies, official docs, data sources) to support your claims.",
      estimatedImpact: 5,
    });
  }

  // 10. Content older than 6 months
  const bestDate = content.modifiedDate ?? content.publishDate;
  const age = monthsAgo(bestDate);
  if (age !== null && age > 6) {
    issues.push({
      category: "freshness",
      severity: "warning",
      issueType: ISSUE_TYPES.STALE_DATE,
      description: `Content was last updated ${age} months ago. AI systems prefer fresh content and may deprioritize stale pages.`,
      recommendation:
        "Review and update the content with current information, then update the modified date.",
      suggestedFix: `<meta property="article:modified_time" content="${new Date().toISOString()}" />`,
      estimatedImpact: 6,
    });
  }

  // =========================================================================
  // INFO issues
  // =========================================================================

  // 11. Title too long or too short
  if (content.title) {
    const titleLen = content.title.length;
    if (titleLen > 60) {
      issues.push({
        category: "extractability",
        severity: "info",
        issueType: ISSUE_TYPES.TITLE_LENGTH,
        description: `Title is ${titleLen} characters (>${60}). Long titles get truncated in AI-generated citations and search results.`,
        recommendation:
          "Shorten the title to 60 characters or fewer while keeping the primary keyword near the start.",
        estimatedImpact: 3,
      });
    } else if (titleLen < 30) {
      issues.push({
        category: "extractability",
        severity: "info",
        issueType: ISSUE_TYPES.TITLE_LENGTH,
        description: `Title is only ${titleLen} characters (<30). Short titles lack enough context for AI systems to match against queries.`,
        recommendation:
          "Expand the title to at least 30 characters, incorporating your target keyword and a descriptive qualifier.",
        estimatedImpact: 3,
      });
    }
  } else {
    issues.push({
      category: "extractability",
      severity: "info",
      issueType: ISSUE_TYPES.TITLE_LENGTH,
      description:
        "Page has no title tag. AI systems use titles as the primary identifier when citing content.",
      recommendation: "Add a <title> tag with your primary keyword and a concise descriptor.",
      estimatedImpact: 4,
    });
  }

  // 12. Thin content (low word count)
  if (content.wordCount < 300) {
    issues.push({
      category: "extractability",
      severity: "info",
      issueType: ISSUE_TYPES.THIN_CONTENT,
      description: `Page has only ${content.wordCount} words. Content under 300 words is considered thin and is unlikely to be cited by AI systems.`,
      recommendation:
        "Expand the content to at least 300 words with substantive information, examples, and explanations.",
      estimatedImpact: 4,
    });
  }

  // 13. No meta description
  const metaDesc =
    content.metaTags["description"] ??
    content.metaTags["og:description"] ??
    null;
  if (!metaDesc || metaDesc.trim() === "") {
    issues.push({
      category: "extractability",
      severity: "info",
      issueType: ISSUE_TYPES.NO_META_DESCRIPTION,
      description:
        "No meta description found. AI systems use meta descriptions as a quick summary signal.",
      recommendation:
        "Add a <meta name=\"description\"> tag with a 150-160 character summary of the page's key takeaway.",
      suggestedFix: `<meta name="description" content="A concise 150-160 character summary of this page's main point and value to readers." />`,
      estimatedImpact: 3,
    });
  }

  // 14. Images without alt text
  const missingAltCount = countImagesWithoutAlt(content.html);
  if (missingAltCount > 0) {
    issues.push({
      category: "extractability",
      severity: "info",
      issueType: ISSUE_TYPES.IMAGES_MISSING_ALT,
      description: `${missingAltCount} image${missingAltCount > 1 ? "s" : ""} found without alt text. AI systems use alt text to understand visual content.`,
      recommendation:
        "Add descriptive alt text to all images that conveys the same information the image provides.",
      estimatedImpact: 2,
    });
  }

  // =========================================================================
  // Sort: critical first, then by estimatedImpact descending
  // =========================================================================
  return issues.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.estimatedImpact - a.estimatedImpact;
  });
}
