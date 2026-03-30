"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types (mirrors shared types)
// ---------------------------------------------------------------------------
interface Issue {
  category: "extractability" | "authority" | "freshness";
  severity: "critical" | "warning" | "info";
  issueType: string;
  description: string;
  recommendation: string;
  suggestedFix?: string;
  estimatedImpact: number;
}

interface ScanData {
  domain: string;
  lastScan: string;
  overall: number;
  extractability: number;
  authority: number;
  freshness: number;
  pagesScanned: number;
  issues: Issue[];
}

// ---------------------------------------------------------------------------
// Mock data (replaced by real API calls when backend is wired)
// ---------------------------------------------------------------------------
const mockData: ScanData = {
  domain: "example.com",
  lastScan: "2026-03-29T14:22:00Z",
  overall: 62,
  extractability: 28,
  authority: 20,
  freshness: 14,
  pagesScanned: 47,
  issues: [
    {
      category: "extractability",
      severity: "critical",
      issueType: "no_answer_blocks",
      description: "No concise answer blocks detected on 32 pages",
      recommendation:
        "Add a TL;DR or summary paragraph within the first 200 words that directly answers the page's primary question.",
      suggestedFix:
        '<p class="answer-summary">Your direct answer here in 1-2 sentences.</p>',
      estimatedImpact: 9,
    },
    {
      category: "extractability",
      severity: "critical",
      issueType: "missing_schema",
      description: "No structured data (JSON-LD) found on 41 pages",
      recommendation:
        "Add Article or FAQPage schema markup to every content page. This helps AI engines parse your content structure.",
      suggestedFix:
        '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article",...}</script>',
      estimatedImpact: 8,
    },
    {
      category: "authority",
      severity: "warning",
      issueType: "weak_author_signals",
      description: "Author name and credentials missing on 28 pages",
      recommendation:
        "Add a visible author byline with credentials (e.g., CPA, PhD) and link to an author bio page with Schema Person markup.",
      estimatedImpact: 6,
    },
    {
      category: "authority",
      severity: "warning",
      issueType: "no_citations",
      description: "No outbound citations to authoritative sources on 19 pages",
      recommendation:
        "Cite primary research, government sources, or recognized industry authorities with hyperlinked references.",
      estimatedImpact: 5,
    },
    {
      category: "freshness",
      severity: "warning",
      issueType: "stale_dates",
      description: "12 pages have not been updated in over 6 months",
      recommendation:
        "Update the dateModified field and add current-year data points to signal freshness to AI crawlers.",
      estimatedImpact: 5,
    },
    {
      category: "freshness",
      severity: "info",
      issueType: "no_llms_txt",
      description: "No /llms.txt or /llms-full.txt file detected",
      recommendation:
        "Create a /llms.txt file that describes your site structure and key pages for LLM crawlers.",
      suggestedFix:
        "# llms.txt\\nTitle: Example.com\\nDescription: ...\\nPages:\\n- /about\\n- /blog\\n- /faq",
      estimatedImpact: 3,
    },
    {
      category: "extractability",
      severity: "info",
      issueType: "long_paragraphs",
      description: "15 pages have paragraphs exceeding 150 words",
      recommendation:
        "Break long paragraphs into shorter blocks (< 80 words). AI engines prefer scannable, chunked content.",
      estimatedImpact: 3,
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreColorClass(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 70) return "text-emerald-400";
  if (pct >= 40) return "text-amber-400";
  return "text-red-400";
}

function ringColorClass(score: number): string {
  if (score >= 70) return "border-emerald-500";
  if (score >= 40) return "border-amber-500";
  return "border-red-500";
}

function arcColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 70) return "#10b981";
  if (pct >= 40) return "#f59e0b";
  return "#ef4444";
}

function severityBadge(severity: Issue["severity"]): string {
  switch (severity) {
    case "critical":
      return "border-red-800 bg-red-950/60 text-red-300";
    case "warning":
      return "border-amber-800 bg-amber-950/60 text-amber-300";
    case "info":
      return "border-blue-800 bg-blue-950/60 text-blue-300";
  }
}

function severityLabel(severity: Issue["severity"]): string {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    case "info":
      return "Info";
  }
}

function categoryLabel(cat: Issue["category"]): string {
  switch (cat) {
    case "extractability":
      return "Extractability";
    case "authority":
      return "Authority";
    case "freshness":
      return "Freshness";
  }
}

// ---------------------------------------------------------------------------
// Gauge SVG Component
// ---------------------------------------------------------------------------
function ScoreGauge({
  label,
  score,
  max,
  size = 120,
}: {
  label: string;
  score: number;
  max: number;
  size?: number;
}) {
  const pct = score / max;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * pct;
  const color = arcColor(score, max);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1f2937"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumference}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="relative -mt-[calc(50%+8px)] mb-4 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${scoreColorClass(score, max)}`}>
          {score}
        </span>
        <span className="text-xs text-gray-500">/ {max}</span>
      </div>
      <span className="mt-1 text-sm font-medium text-gray-400">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issue Row
// ---------------------------------------------------------------------------
function IssueRow({ issue, index }: { issue: Issue; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-4 px-5 py-4 text-left"
      >
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-gray-400">
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-medium ${severityBadge(issue.severity)}`}
            >
              {severityLabel(issue.severity)}
            </span>
            <span className="rounded-md border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
              {categoryLabel(issue.category)}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-200">{issue.description}</p>
        </div>
        <svg
          className={`mt-1 h-4 w-4 shrink-0 text-gray-500 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 px-5 py-4">
          <div className="mb-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Recommendation
            </h4>
            <p className="text-sm text-gray-300">{issue.recommendation}</p>
          </div>
          {issue.suggestedFix && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Suggested Fix
              </h4>
              <pre className="overflow-x-auto rounded-md bg-gray-950 p-3 text-xs text-gray-300">
                <code>{issue.suggestedFix}</code>
              </pre>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <span>Estimated impact:</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-sm ${
                    i < issue.estimatedImpact ? "bg-indigo-500" : "bg-gray-800"
                  }`}
                />
              ))}
            </div>
            <span>{issue.estimatedImpact}/10</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const [data] = useState<ScanData>(mockData);
  const [rescanning, setRescanning] = useState(false);

  const criticalIssues = data.issues.filter((i) => i.severity === "critical");
  const warningIssues = data.issues.filter((i) => i.severity === "warning");
  const infoIssues = data.issues.filter((i) => i.severity === "info");

  function handleRescan() {
    setRescanning(true);
    // TODO: call /api/v1/scans POST when backend is wired
    setTimeout(() => setRescanning(false), 2000);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ---------------------------------------------------------------- */}
      {/* Site Overview Card */}
      {/* ---------------------------------------------------------------- */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{data.domain}</h1>
          <p className="mt-1 text-sm text-gray-400">
            Last scanned: {formatDate(data.lastScan)} &middot; {data.pagesScanned}{" "}
            pages analyzed
          </p>
        </div>
        <button
          onClick={handleRescan}
          disabled={rescanning}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
        >
          {rescanning ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Rescanning...
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                />
              </svg>
              Rescan Site
            </>
          )}
        </button>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Overall Score + Breakdown Gauges */}
      {/* ---------------------------------------------------------------- */}
      <div className="mb-8 grid gap-6 lg:grid-cols-4">
        {/* Overall large card */}
        <div
          className={`flex flex-col items-center justify-center rounded-2xl border ${ringColorClass(data.overall)} bg-gray-900/60 p-8 lg:row-span-1`}
        >
          <div
            className={`flex h-32 w-32 items-center justify-center rounded-full border-4 ${ringColorClass(data.overall)} bg-gray-950`}
          >
            <div className="text-center">
              <div className={`text-5xl font-extrabold ${scoreColorClass(data.overall, 100)}`}>
                {data.overall}
              </div>
              <div className="text-xs text-gray-500">/ 100</div>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-gray-400">Overall AEO Score</p>
        </div>

        {/* Three dimension gauges */}
        <div className="col-span-1 flex items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/50 p-6 lg:col-span-3">
          <div className="grid w-full grid-cols-3 gap-6">
            <ScoreGauge label="Extractability" score={data.extractability} max={40} />
            <ScoreGauge label="Authority" score={data.authority} max={35} />
            <ScoreGauge label="Freshness" score={data.freshness} max={25} />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Issue Summary Badges */}
      {/* ---------------------------------------------------------------- */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
            {criticalIssues.length}
          </span>
          <span className="text-sm text-red-300">Critical</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
            {warningIssues.length}
          </span>
          <span className="text-sm text-amber-300">Warnings</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-blue-800/50 bg-blue-950/30 px-4 py-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {infoIssues.length}
          </span>
          <span className="text-sm text-blue-300">Info</span>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Issues List — grouped by severity */}
      {/* ---------------------------------------------------------------- */}
      <div className="space-y-8">
        {criticalIssues.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Critical Issues
            </h2>
            <div className="space-y-3">
              {criticalIssues.map((issue, i) => (
                <IssueRow key={issue.issueType} issue={issue} index={i} />
              ))}
            </div>
          </section>
        )}

        {warningIssues.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Warnings
            </h2>
            <div className="space-y-3">
              {warningIssues.map((issue, i) => (
                <IssueRow key={issue.issueType} issue={issue} index={i} />
              ))}
            </div>
          </section>
        )}

        {infoIssues.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-blue-400">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Informational
            </h2>
            <div className="space-y-3">
              {infoIssues.map((issue, i) => (
                <IssueRow key={issue.issueType} issue={issue} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
