"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
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

interface ScoreBreakdown {
  score: number;
  max: number;
  detail: string;
}

interface ScanData {
  url: string;
  title: string | null;
  wordCount: number;
  score: number;
  extractability: number;
  authority: number;
  freshness: number;
  breakdown: Record<string, ScoreBreakdown>;
  issues: Issue[];
  totalIssues: number;
  hasSchemaMarkup: boolean;
  hasLlmsTxt: boolean;
  schemaTypes: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
    case "critical": return "border-red-800 bg-red-950/60 text-red-300";
    case "warning": return "border-amber-800 bg-amber-950/60 text-amber-300";
    case "info": return "border-blue-800 bg-blue-950/60 text-blue-300";
  }
}

function severityLabel(severity: Issue["severity"]): string {
  switch (severity) {
    case "critical": return "Critical";
    case "warning": return "Warning";
    case "info": return "Info";
  }
}

function categoryLabel(cat: Issue["category"]): string {
  switch (cat) {
    case "extractability": return "Extractability";
    case "authority": return "Authority";
    case "freshness": return "Freshness";
  }
}

// ---------------------------------------------------------------------------
// Gauge SVG Component
// ---------------------------------------------------------------------------
function ScoreGauge({ label, score, max, size = 120 }: {
  label: string; score: number; max: number; size?: number;
}) {
  const pct = score / max;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * pct;
  const color = arcColor(score, max);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={`${strokeDash} ${circumference}`}
          className="transition-all duration-700" />
      </svg>
      <div className="relative -mt-[calc(50%+8px)] mb-4 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${scoreColorClass(score, max)}`}>{score}</span>
        <span className="text-xs text-gray-500">/ {max}</span>
      </div>
      <span className="mt-1 text-sm font-medium text-gray-400">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issue Row (expandable)
// ---------------------------------------------------------------------------
function IssueRow({ issue, index }: { issue: Issue; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-start gap-4 px-5 py-4 text-left">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-gray-400">
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${severityBadge(issue.severity)}`}>
              {severityLabel(issue.severity)}
            </span>
            <span className="rounded-md border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
              {categoryLabel(issue.category)}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-200">{issue.description}</p>
        </div>
        <svg className={`mt-1 h-4 w-4 shrink-0 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 px-5 py-4">
          <div className="mb-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Recommendation</h4>
            <p className="text-sm text-gray-300">{issue.recommendation}</p>
          </div>
          {issue.suggestedFix && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Suggested Fix</h4>
              <pre className="overflow-x-auto rounded-md bg-gray-950 p-3 text-xs text-gray-300">
                <code>{issue.suggestedFix}</code>
              </pre>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <span>Impact:</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`h-2 w-2 rounded-sm ${i < issue.estimatedImpact ? "bg-indigo-500" : "bg-gray-800"}`} />
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
// Empty state — URL input form
// ---------------------------------------------------------------------------
function EmptyState({ onScan, scanning }: { onScan: (url: string) => void; scanning: boolean }) {
  const [url, setUrl] = useState("");

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20">
        <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <h2 className="mb-2 text-xl font-bold text-white">Scan a URL to get started</h2>
      <p className="mb-8 text-sm text-gray-400">Enter any page URL to analyze its AEO readiness</p>
      <form
        onSubmit={(e) => { e.preventDefault(); if (url.trim()) onScan(url.trim()); }}
        className="flex w-full gap-3"
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/blog/my-post"
          required
          className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-5 py-3 text-base text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
        />
        <button
          type="submit"
          disabled={scanning}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-60"
        >
          {scanning ? "Scanning..." : "Analyze"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page — uses /api/v1/analyze for live data
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-10 w-10 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url");

  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scanUrl(url: string) {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error?.message || `Analysis failed (${res.status})`);
      }

      setData(body.data);

      // Update URL without reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("url", url);
      window.history.replaceState(null, "", newUrl.toString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Auto-scan if URL param provided
  useEffect(() => {
    if (urlParam && !data && !loading) {
      scanUrl(urlParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParam]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <svg className="h-10 w-10 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="mt-4 text-sm text-gray-400">Analyzing page...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-6 py-4 text-sm text-red-300">
          {error}
        </div>
        <button
          onClick={() => { setError(null); setData(null); }}
          className="rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          Try Another URL
        </button>
      </div>
    );
  }

  // Empty state — no data yet
  if (!data) {
    return <EmptyState onScan={scanUrl} scanning={loading} />;
  }

  const hostname = (() => {
    try { return new URL(data.url).hostname; } catch { return data.url; }
  })();
  const scanTime = new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const criticalIssues = data.issues.filter((i) => i.severity === "critical");
  const warningIssues = data.issues.filter((i) => i.severity === "warning");
  const infoIssues = data.issues.filter((i) => i.severity === "info");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Site Overview */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{hostname}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {data.title && <span className="text-gray-300">{data.title}</span>}
            {data.title && <span className="mx-2 text-gray-600">|</span>}
            Scanned: {scanTime} &middot; {data.wordCount} words
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => scanUrl(data.url)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Rescan
          </button>
          <Link href="/dashboard" className="rounded-lg border border-gray-700 bg-gray-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700">
            New Scan
          </Link>
        </div>
      </div>

      {/* Score Cards */}
      <div className="mb-8 grid gap-6 lg:grid-cols-4">
        <div className={`flex flex-col items-center justify-center rounded-2xl border ${ringColorClass(data.score)} bg-gray-900/60 p-8`}>
          <div className={`flex h-32 w-32 items-center justify-center rounded-full border-4 ${ringColorClass(data.score)} bg-gray-950`}>
            <div className="text-center">
              <div className={`text-5xl font-extrabold ${scoreColorClass(data.score, 100)}`}>{data.score}</div>
              <div className="text-xs text-gray-500">/ 100</div>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-gray-400">Overall AEO Score</p>
        </div>

        <div className="col-span-1 flex items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/50 p-6 lg:col-span-3">
          <div className="grid w-full grid-cols-3 gap-6">
            <ScoreGauge label="Extractability" score={data.extractability} max={40} />
            <ScoreGauge label="Authority" score={data.authority} max={35} />
            <ScoreGauge label="Freshness" score={data.freshness} max={25} />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-6 flex flex-wrap gap-3">
        {data.hasSchemaMarkup && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-3 py-1.5">
            <span className="text-xs text-emerald-400">Schema.org: {data.schemaTypes.join(", ") || "Yes"}</span>
          </div>
        )}
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${data.hasLlmsTxt ? "border-emerald-800/50 bg-emerald-950/30" : "border-gray-800 bg-gray-900/50"}`}>
          <span className={`text-xs ${data.hasLlmsTxt ? "text-emerald-400" : "text-gray-500"}`}>
            /llms.txt: {data.hasLlmsTxt ? "Found" : "Missing"}
          </span>
        </div>
      </div>

      {/* Issue Summary Badges */}
      <div className="mb-6 flex flex-wrap gap-3">
        {criticalIssues.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">{criticalIssues.length}</span>
            <span className="text-sm text-red-300">Critical</span>
          </div>
        )}
        {warningIssues.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">{warningIssues.length}</span>
            <span className="text-sm text-amber-300">Warnings</span>
          </div>
        )}
        {infoIssues.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-800/50 bg-blue-950/30 px-4 py-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{infoIssues.length}</span>
            <span className="text-sm text-blue-300">Info</span>
          </div>
        )}
        {data.totalIssues > data.issues.length && (
          <div className="flex items-center rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-2">
            <span className="text-sm text-gray-400">+ {data.totalIssues - data.issues.length} more issues (upgrade for full report)</span>
          </div>
        )}
      </div>

      {/* Breakdown Details */}
      {Object.keys(data.breakdown).length > 0 && (
        <div className="mb-8 rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Score Breakdown</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.breakdown).map(([key, item]) => (
              <div key={key} className="flex items-center justify-between rounded-lg bg-gray-950/50 px-4 py-3">
                <span className="text-xs text-gray-400">{key.replace(/_/g, " ")}</span>
                <span className={`text-sm font-bold ${scoreColorClass(item.score, item.max)}`}>
                  {item.score}/{item.max}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues List */}
      <div className="space-y-8">
        {criticalIssues.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Critical Issues
            </h2>
            <div className="space-y-3">
              {criticalIssues.map((issue, i) => <IssueRow key={`critical-${i}`} issue={issue} index={i} />)}
            </div>
          </section>
        )}
        {warningIssues.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Warnings
            </h2>
            <div className="space-y-3">
              {warningIssues.map((issue, i) => <IssueRow key={`warning-${i}`} issue={issue} index={i} />)}
            </div>
          </section>
        )}
        {infoIssues.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-blue-400">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Informational
            </h2>
            <div className="space-y-3">
              {infoIssues.map((issue, i) => <IssueRow key={`info-${i}`} issue={issue} index={i} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
