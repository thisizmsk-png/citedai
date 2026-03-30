import type { AeoScore, ScoreBreakdownItem } from "@citedai/shared";
import { SCORE_WEIGHTS } from "@citedai/shared";

// ---------------------------------------------------------------------------
// Input type — what the crawler passes to the scoring engine
// ---------------------------------------------------------------------------

export interface PageContent {
  url: string;
  title: string | null;
  html: string;
  text: string;
  wordCount: number;
  headings: { level: number; text: string }[];
  lists: { ordered: boolean; items: string[] }[];
  tables: { headers: string[]; rows: string[][] }[];
  links: { href: string; text: string; isExternal: boolean }[];
  schemaMarkup: object[];
  metaTags: Record<string, string>;
  publishDate: string | null;
  modifiedDate: string | null;
  author: string | null;
  hasLlmsTxt: boolean;
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

/**
 * Score a page's content for AI-citability.
 *
 * This is a deterministic rules engine — no LLM calls.
 * Each sub-score is computed independently and summed.
 *
 * Returns an AeoScore with overall (0-100), three dimension scores,
 * and a full breakdown per component.
 */
export function scorePageContent(content: PageContent): AeoScore {
  const breakdown: Record<string, ScoreBreakdownItem> = {};

  // --- Extractability (0-40) ---
  breakdown.answer_blocks = scoreAnswerBlocks(content);
  breakdown.definition_formatting = scoreDefinitions(content);
  breakdown.step_lists = scoreStepLists(content);
  breakdown.comparison_tables = scoreComparisonTables(content);
  breakdown.faq_structure = scoreFaqStructure(content);

  // --- Authority (0-35) ---
  breakdown.schema_markup = scoreSchemaMarkup(content);
  breakdown.author_attribution = scoreAuthorAttribution(content);
  breakdown.publication_date = scorePublicationDate(content);
  breakdown.source_citations = scoreSourceCitations(content);
  breakdown.llms_txt = scoreLlmsTxt(content);

  // --- Freshness (0-25) ---
  breakdown.updated_date = scoreUpdatedDate(content);
  breakdown.content_recency = scoreContentRecency(content);
  breakdown.version_refs = scoreVersionRefs(content);
  breakdown.broken_links = scoreBrokenLinks(content);

  // Sum dimension scores
  const extractability = sumDimension(breakdown, SCORE_WEIGHTS.extractability.components);
  const authority = sumDimension(breakdown, SCORE_WEIGHTS.authority.components);
  const freshness = sumDimension(breakdown, SCORE_WEIGHTS.freshness.components);

  return {
    overall: extractability + authority + freshness,
    extractability,
    authority,
    freshness,
    breakdown,
  };
}

// ---------------------------------------------------------------------------
// Dimension summing helper
// ---------------------------------------------------------------------------

function sumDimension(
  breakdown: Record<string, ScoreBreakdownItem>,
  components: Record<string, number>,
): number {
  return Object.keys(components).reduce(
    (sum, key) => sum + (breakdown[key]?.score ?? 0),
    0,
  );
}

// ---------------------------------------------------------------------------
// Extractability scorers (stubs — implement rules here)
// ---------------------------------------------------------------------------

function scoreAnswerBlocks(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.extractability.components.answer_blocks;

  // Split text into paragraphs and find short ones with definitional patterns
  const paragraphs = content.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const headingTexts = new Set(content.headings.map((h) => h.text.trim().toLowerCase()));

  const definitionalPatterns = /\b(?:is|are|refers?\s+to|means?|describes?|represents?|involves?)\b/i;
  let answerBlockCount = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const wordCount = para.split(/\s+/).length;

    // Must be short (<60 words) and contain a definitional pattern
    if (wordCount > 60) continue;
    if (!definitionalPatterns.test(para)) continue;

    // Check if a heading appears just before this paragraph.
    // We approximate this by checking if the previous paragraph matches a heading text,
    // or if any H2/H3 heading text appears as a prefix line in the paragraph block.
    const prevPara = i > 0 ? paragraphs[i - 1].trim().toLowerCase() : "";
    const isAfterHeading =
      headingTexts.has(prevPara) ||
      headingTexts.has(prevPara.replace(/[?:]/g, "").trim()) ||
      // Also check if the paragraph itself starts with content that echoes a heading
      content.headings.some(
        (h) =>
          (h.level === 2 || h.level === 3) &&
          para.toLowerCase().startsWith(h.text.toLowerCase().replace(/[?]/g, "").trim().split(" ")[0]),
      );

    if (isAfterHeading) {
      answerBlockCount++;
    }
  }

  // Also count paragraphs that match definitional patterns even without strict heading proximity
  // if there are H2/H3 headings on the page (looser heuristic for real-world HTML)
  if (answerBlockCount === 0 && content.headings.some((h) => h.level === 2 || h.level === 3)) {
    for (const para of paragraphs) {
      const wordCount = para.split(/\s+/).length;
      if (wordCount <= 60 && definitionalPatterns.test(para)) {
        answerBlockCount++;
      }
    }
  }

  if (answerBlockCount >= 3) return { score: max, max, detail: `${answerBlockCount} answer blocks detected` };
  if (answerBlockCount > 0) {
    const proportional = Math.round((answerBlockCount / 3) * max);
    return { score: proportional, max, detail: `${answerBlockCount} answer block(s) detected` };
  }
  return { score: 0, max, detail: "No answer blocks found" };
}

function scoreDefinitions(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.extractability.components.definition_formatting;

  // Extract the page topic from the title (strip common suffixes like " | Site Name", " - Blog")
  const rawTitle = (content.title ?? "").replace(/\s*[|–—-]\s*[^|–—-]+$/, "").trim();
  if (!rawTitle) return { score: 0, max, detail: "No title to derive topic from" };

  // Get the first meaningful paragraph of the text content
  const paragraphs = content.text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 20);
  if (paragraphs.length === 0) return { score: 0, max, detail: "No content paragraphs found" };

  // Check the first few paragraphs (the definition often appears in the first 1-3)
  const topicWords = rawTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const definitionVerbs = /\b(?:is|are|refers?\s+to|means?|can\s+be\s+defined\s+as|is\s+defined\s+as|is\s+a|is\s+an|is\s+the)\b/i;

  for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
    const para = paragraphs[i];
    const firstSentence = para.split(/[.!?]/)[0] ?? "";
    const lowerSentence = firstSentence.toLowerCase();

    // Check if the first sentence contains the topic words and a definitional verb
    const topicMatch = topicWords.filter((w) => lowerSentence.includes(w));
    const hasDefinitionVerb = definitionVerbs.test(firstSentence);

    if (topicMatch.length >= Math.max(1, Math.floor(topicWords.length * 0.5)) && hasDefinitionVerb) {
      // Full score if it's the very first paragraph
      if (i === 0) return { score: max, max, detail: "Clear definition in first paragraph" };
      // Partial if it's in paragraphs 2-3
      return { score: Math.round(max * 0.6), max, detail: `Definition found in paragraph ${i + 1} (not first)` };
    }
  }

  // Check if any heading contains "what is" pattern as a weaker signal
  const hasWhatIsHeading = content.headings.some((h) =>
    /^what\s+(is|are)\b/i.test(h.text.trim()),
  );
  if (hasWhatIsHeading) {
    return { score: Math.round(max * 0.4), max, detail: "'What is' heading found but no clear definition paragraph" };
  }

  return { score: 0, max, detail: "No clear definition of the page topic" };
}

function scoreStepLists(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.extractability.components.step_lists;
  const orderedLists = content.lists.filter((l) => l.ordered);
  if (orderedLists.length >= 2) return { score: max, max, detail: `${orderedLists.length} ordered lists` };
  if (orderedLists.length === 1) return { score: Math.round(max * 0.6), max, detail: "1 ordered list" };
  return { score: 0, max, detail: "No ordered lists" };
}

function scoreComparisonTables(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.extractability.components.comparison_tables;
  if (content.tables.length >= 1) return { score: max, max, detail: `${content.tables.length} table(s)` };
  return { score: 0, max, detail: "No tables" };
}

function scoreFaqStructure(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.extractability.components.faq_structure;

  const questionHeadings = content.headings.filter(
    (h) => (h.level === 2 || h.level === 3) && h.text.trim().endsWith("?"),
  );

  const count = questionHeadings.length;
  if (count >= 3) return { score: max, max, detail: `${count} FAQ-style question headings` };
  if (count === 2) return { score: Math.round(max * 0.7), max, detail: "2 FAQ-style question headings" };
  if (count === 1) return { score: Math.round(max * 0.4), max, detail: "1 FAQ-style question heading" };
  return { score: 0, max, detail: "No question headings (H2/H3 ending with ?)" };
}

// ---------------------------------------------------------------------------
// Authority scorers (stubs)
// ---------------------------------------------------------------------------

function scoreSchemaMarkup(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.authority.components.schema_markup;
  if (content.schemaMarkup.length > 0) return { score: max, max, detail: `${content.schemaMarkup.length} schema(s)` };
  return { score: 0, max, detail: "No Schema.org found" };
}

function scoreAuthorAttribution(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.authority.components.author_attribution;
  if (content.author) return { score: max, max, detail: "Author byline present" };
  return { score: 0, max, detail: "No author attribution" };
}

function scorePublicationDate(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.authority.components.publication_date;
  if (content.publishDate) return { score: max, max, detail: "Date visible" };
  return { score: 0, max, detail: "No publication date" };
}

function scoreSourceCitations(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.authority.components.source_citations;
  const externalLinks = content.links.filter((l) => l.isExternal);
  if (externalLinks.length >= 5) return { score: max, max, detail: `${externalLinks.length} outbound citations` };
  if (externalLinks.length >= 1) return { score: Math.round(max * 0.6), max, detail: `${externalLinks.length} outbound citation(s)` };
  return { score: 0, max, detail: "No outbound citations" };
}

function scoreLlmsTxt(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.authority.components.llms_txt;
  if (content.hasLlmsTxt) return { score: max, max, detail: "/llms.txt present" };
  return { score: 0, max, detail: "No /llms.txt file" };
}

// ---------------------------------------------------------------------------
// Freshness scorers (stubs)
// ---------------------------------------------------------------------------

function scoreUpdatedDate(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.freshness.components.updated_date;

  const dateStr = content.modifiedDate ?? content.publishDate;
  if (!dateStr) return { score: 0, max, detail: "No modified or publish date" };

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { score: 0, max, detail: `Unparseable date: ${dateStr}` };

  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return { score: max, max, detail: "Date is in the future (possibly pre-scheduled)" };
  if (daysDiff <= 30) return { score: max, max, detail: `Updated ${daysDiff} day(s) ago` };
  if (daysDiff <= 90) return { score: Math.round(max * 0.75), max, detail: `Updated ${daysDiff} days ago` };
  if (daysDiff <= 180) return { score: Math.round(max * 0.5), max, detail: `Updated ${daysDiff} days ago` };
  if (daysDiff <= 365) return { score: Math.round(max * 0.25), max, detail: `Updated ${daysDiff} days ago` };
  return { score: 0, max, detail: `Last updated ${daysDiff} days ago (stale)` };
}

function scoreContentRecency(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.freshness.components.content_recency;

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  const text = content.text;

  const hasCurrentYear = text.includes(String(currentYear));
  const hasLastYear = text.includes(String(lastYear));

  // Check for outdated year references (2020 or earlier)
  const outdatedYearPattern = /\b(20[01]\d|200\d)\b/g;
  const outdatedMatches = text.match(outdatedYearPattern) ?? [];
  // Filter out years that are clearly not date references (e.g., in URLs or version numbers)
  const hasOutdatedRefs = outdatedMatches.length > 0;

  if (hasCurrentYear && !hasOutdatedRefs) {
    return { score: max, max, detail: `References current year (${currentYear}), no outdated years` };
  }
  if (hasCurrentYear && hasOutdatedRefs) {
    return { score: Math.round(max * 0.7), max, detail: `References ${currentYear} but also has outdated year refs` };
  }
  if (hasLastYear && !hasOutdatedRefs) {
    return { score: Math.round(max * 0.6), max, detail: `References ${lastYear}, no outdated years` };
  }
  if (hasLastYear && hasOutdatedRefs) {
    return { score: Math.round(max * 0.3), max, detail: `References ${lastYear} with outdated year refs` };
  }
  if (hasOutdatedRefs) {
    return { score: 0, max, detail: `Only outdated year references found (${outdatedMatches.join(", ")})` };
  }
  return { score: Math.round(max * 0.3), max, detail: "No year references found in content" };
}

function scoreVersionRefs(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.freshness.components.version_refs;

  const text = content.text;

  // Known current versions (approximate, as of 2026)
  // Format: [pattern, minCurrentMajor]
  const versionChecks: { name: string; pattern: RegExp; minCurrent: number }[] = [
    { name: "Python", pattern: /Python\s+(\d+)(?:\.(\d+))?/gi, minCurrent: 3 },
    { name: "Node.js", pattern: /Node(?:\.js)?\s+v?(\d+)/gi, minCurrent: 20 },
    { name: "React", pattern: /React\s+v?(\d+)/gi, minCurrent: 18 },
    { name: "Next.js", pattern: /Next(?:\.js)?\s+v?(\d+)/gi, minCurrent: 14 },
    { name: "TypeScript", pattern: /TypeScript\s+v?(\d+)/gi, minCurrent: 5 },
    { name: "Angular", pattern: /Angular\s+v?(\d+)/gi, minCurrent: 17 },
    { name: "Vue", pattern: /Vue(?:\.js)?\s+v?(\d+)/gi, minCurrent: 3 },
    { name: "PHP", pattern: /PHP\s+v?(\d+)/gi, minCurrent: 8 },
    { name: "Java", pattern: /Java\s+(\d+)/gi, minCurrent: 17 },
    { name: "Go", pattern: /Go\s+(\d+)\.(\d+)/gi, minCurrent: 1 }, // Go 1.21+
    { name: "Ruby", pattern: /Ruby\s+v?(\d+)\.(\d+)/gi, minCurrent: 3 },
    { name: "Swift", pattern: /Swift\s+v?(\d+)/gi, minCurrent: 5 },
    { name: "Kotlin", pattern: /Kotlin\s+v?(\d+)\.(\d+)/gi, minCurrent: 1 },
    { name: "Docker", pattern: /Docker\s+v?(\d+)/gi, minCurrent: 24 },
    { name: "Kubernetes", pattern: /Kubernetes\s+v?(\d+)\.(\d+)/gi, minCurrent: 1 },
    { name: "Terraform", pattern: /Terraform\s+v?(\d+)/gi, minCurrent: 1 },
    { name: "webpack", pattern: /webpack\s+v?(\d+)/gi, minCurrent: 5 },
    { name: "Vite", pattern: /Vite\s+v?(\d+)/gi, minCurrent: 5 },
  ];

  let currentCount = 0;
  let outdatedCount = 0;
  const details: string[] = [];

  for (const check of versionChecks) {
    // Reset regex state
    check.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = check.pattern.exec(text)) !== null) {
      const majorVersion = parseInt(match[1], 10);
      if (isNaN(majorVersion)) continue;

      if (majorVersion >= check.minCurrent) {
        currentCount++;
      } else {
        outdatedCount++;
        details.push(`${check.name} ${match[0].trim()}`);
      }
    }
  }

  const totalRefs = currentCount + outdatedCount;
  if (totalRefs === 0) {
    // No version references — neutral, give partial score
    return { score: Math.round(max * 0.6), max, detail: "No software version references found" };
  }

  if (outdatedCount === 0) {
    return { score: max, max, detail: `${currentCount} current version ref(s), none outdated` };
  }

  if (currentCount > outdatedCount) {
    return {
      score: Math.round(max * 0.5),
      max,
      detail: `${currentCount} current, ${outdatedCount} outdated version ref(s): ${details.join(", ")}`,
    };
  }

  return {
    score: 0,
    max,
    detail: `${outdatedCount} outdated version ref(s): ${details.join(", ")}`,
  };
}

function scoreBrokenLinks(content: PageContent): ScoreBreakdownItem {
  const max = SCORE_WEIGHTS.freshness.components.broken_links;
  // TODO: This requires HTTP checks — may be done at crawl time
  return { score: max, max, detail: "Link check not yet implemented (assumes OK)" };
}
