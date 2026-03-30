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
  if (pct >= 70) return "text-success";
  if (pct >= 40) return "text-warning";
  return "text-error";
}

function arcColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 70) return "#22c55e";
  if (pct >= 40) return "#f59e0b";
  return "#ef4444";
}

function overallRingColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function severityBadge(severity: Issue["severity"]): string {
  switch (severity) {
    case "critical": return "border-error/30 bg-error/10 text-error";
    case "warning": return "border-warning/30 bg-warning/10 text-warning";
    case "info": return "border-info/30 bg-info/10 text-info";
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
// Score Ring SVG (Linear-grade)
// ---------------------------------------------------------------------------
function ScoreRing({ score, max, size = 120, strokeWidth = 8, label }: {
  score: number; max: number; size?: number; strokeWidth?: number; label: string;
}) {
  const pct = score / max;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * pct;
  const color = arcColor(score, max);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--color-bg-tertiary)" strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-h3 font-bold tabular-nums ${scoreColorClass(score, max)}`}>{score}</span>
          <span className="text-tiny text-text-tertiary">/ {max}</span>
        </div>
      </div>
      <span className="text-body-sm font-medium text-text-secondary">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overall Score Hero (large ring)
// ---------------------------------------------------------------------------
function OverallScore({ score }: { score: number }) {
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * (score / 100);
  const color = overallRingColor(score);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--color-bg-tertiary)" strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-display font-bold tabular-nums ${scoreColorClass(score, 100)}`} style={{ fontSize: '3.5rem' }}>
            {score}
          </span>
          <span className="text-caption text-text-tertiary">/ 100</span>
        </div>
      </div>
      <span className="text-body-sm font-medium text-text-secondary">Overall AEO Score</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issue Row (expandable)
// ---------------------------------------------------------------------------
function IssueRow({ issue, index }: { issue: Issue; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-bg-secondary transition-all hover:border-border-hover">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-start gap-4 px-5 py-4 text-left">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-tiny font-bold text-text-tertiary tabular-nums">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-0.5 text-tiny font-medium ${severityBadge(issue.severity)}`}>
              {issue.severity === "critical" ? "Critical" : issue.severity === "warning" ? "Warning" : "Info"}
            </span>
            <span className="rounded-md border border-border bg-bg-tertiary px-2 py-0.5 text-tiny text-text-tertiary">
              {categoryLabel(issue.category)}
            </span>
          </div>
          <p className="mt-2 text-body-sm text-text-primary">{issue.description}</p>
        </div>
        <svg
          className={`mt-1 h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-5 space-y-4">
          <div>
            <h4 className="mb-1.5 text-tiny font-medium uppercase tracking-wide text-text-tertiary">
              Recommendation
            </h4>
            <p className="text-body-sm text-text-secondary">{issue.recommendation}</p>
          </div>
          {issue.suggestedFix && (
            <div>
              <h4 className="mb-1.5 text-tiny font-medium uppercase tracking-wide text-text-tertiary">
                Suggested Fix
              </h4>
              <pre className="overflow-x-auto rounded-lg bg-bg-primary border border-border p-4 text-tiny text-text-secondary font-mono">
                <code>{issue.suggestedFix}</code>
              </pre>
            </div>
          )}
          <div className="flex items-center gap-3 text-caption text-text-tertiary">
            <span>Estimated Impact</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`h-2 w-2 rounded-sm transition-colors ${
                  i < issue.estimatedImpact ? "bg-brand" : "bg-bg-tertiary"
                }`} />
              ))}
            </div>
            <span className="tabular-nums font-medium text-text-secondary">{issue.estimatedImpact}/10</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ onScan, scanning }: { onScan: (url: string) => void; scanning: boolean }) {
  const [url, setUrl] = useState("");

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-32 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-subtle">
        <svg className="h-8 w-8 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <h2 className="mb-2 text-h3 font-semibold text-text-primary">Scan a URL to get started</h2>
      <p className="mb-8 text-body-sm text-text-secondary">
        Enter any page URL to analyze its AEO readiness across 40+ factors.
      </p>
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
          className="flex-1 rounded-xl border border-border bg-bg-secondary px-5 py-3.5 text-body text-text-primary placeholder-text-tertiary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="submit"
          disabled={scanning}
          className="rounded-xl bg-brand px-6 py-3.5 text-body-sm font-medium text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-hover disabled:opacity-60"
        >
          {scanning ? "Scanning..." : "Analyze"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status pill
// ---------------------------------------------------------------------------
function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
      active
        ? "border-success/30 bg-success/10"
        : "border-border bg-bg-secondary"
    }`}>
      <span className={`text-tiny font-medium ${active ? "text-success" : "text-text-tertiary"}`}>
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breakdown grid item
// ---------------------------------------------------------------------------
function BreakdownItem({ name, score, max }: { name: string; score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="flex items-center justify-between rounded-lg bg-bg-primary border border-border px-4 py-3">
      <span className="text-body-sm text-text-secondary capitalize">{name.replace(/_/g, " ")}</span>
      <div className="flex items-center gap-3">
        <div className="w-16 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct >= 70 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-error"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-body-sm font-semibold tabular-nums ${scoreColorClass(score, max)}`}>
          {score}/{max}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
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

      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("url", url);
      window.history.replaceState(null, "", newUrl.toString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (urlParam && !data && !loading) {
      scanUrl(urlParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParam]);

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="relative">
          <svg className="h-12 w-12 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-body-sm text-text-secondary">Analyzing page across 40+ AEO factors...</p>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-32 text-center">
        <div className="mb-6 rounded-xl border border-error/30 bg-error/10 px-6 py-4 text-body-sm text-error">
          {error}
        </div>
        <button
          onClick={() => { setError(null); setData(null); }}
          className="rounded-lg border border-border bg-bg-secondary px-5 py-2.5 text-body-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
        >
          Try Another URL
        </button>
      </div>
    );
  }

  // Empty
  if (!data) {
    return <EmptyState onScan={scanUrl} scanning={loading} />;
  }

  // Results
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
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* ================================================================= */}
      {/* Site Header */}
      {/* ================================================================= */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">{hostname}</h1>
          <p className="mt-1 text-body-sm text-text-tertiary">
            {data.title && <span className="text-text-secondary">{data.title}</span>}
            {data.title && <span className="mx-2 text-text-disabled">&middot;</span>}
            Scanned {scanTime} &middot; {data.wordCount.toLocaleString()} words
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => scanUrl(data.url)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-body-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Rescan
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-border px-5 py-2.5 text-body-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
          >
            New Scan
          </Link>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Score Overview — Overall + 3 Dimensions */}
      {/* ================================================================= */}
      <div className="mb-8 grid gap-6 lg:grid-cols-4">
        {/* Overall Score */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-bg-secondary p-8">
          <OverallScore score={data.score} />
        </div>

        {/* Three Dimensions */}
        <div className="lg:col-span-3 grid grid-cols-3 gap-6 rounded-2xl border border-border bg-bg-secondary p-8">
          <ScoreRing label="Extractability" score={data.extractability} max={40} size={120} strokeWidth={8} />
          <ScoreRing label="Authority" score={data.authority} max={35} size={120} strokeWidth={8} />
          <ScoreRing label="Freshness" score={data.freshness} max={25} size={120} strokeWidth={8} />
        </div>
      </div>

      {/* ================================================================= */}
      {/* Quick Status Pills */}
      {/* ================================================================= */}
      <div className="mb-8 flex flex-wrap gap-3">
        {data.hasSchemaMarkup && (
          <StatusPill active label={`Schema.org: ${data.schemaTypes.join(", ") || "Detected"}`} />
        )}
        <StatusPill active={data.hasLlmsTxt} label={`/llms.txt: ${data.hasLlmsTxt ? "Found" : "Missing"}`} />
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-1.5">
          <span className="text-tiny text-text-tertiary tabular-nums">{data.totalIssues} issues found</span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Issue Summary Badges */}
      {/* ================================================================= */}
      <div className="mb-8 flex flex-wrap gap-3">
        {criticalIssues.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-4 py-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-error text-tiny font-bold text-white tabular-nums">
              {criticalIssues.length}
            </span>
            <span className="text-body-sm text-error">Critical</span>
          </div>
        )}
        {warningIssues.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning text-tiny font-bold text-white tabular-nums">
              {warningIssues.length}
            </span>
            <span className="text-body-sm text-warning">Warnings</span>
          </div>
        )}
        {infoIssues.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/10 px-4 py-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-info text-tiny font-bold text-white tabular-nums">
              {infoIssues.length}
            </span>
            <span className="text-body-sm text-info">Info</span>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Score Breakdown Grid */}
      {/* ================================================================= */}
      {Object.keys(data.breakdown).length > 0 && (
        <div className="mb-8 rounded-2xl border border-border bg-bg-secondary p-6">
          <h3 className="mb-4 text-tiny font-medium uppercase tracking-wide text-text-tertiary">
            Score Breakdown
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.breakdown).map(([key, item]) => (
              <BreakdownItem key={key} name={key} score={item.score} max={item.max} />
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Issues List */}
      {/* ================================================================= */}
      <div className="space-y-10">
        {criticalIssues.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-h4 font-semibold text-error">
              <span className="h-2 w-2 rounded-full bg-error" /> Critical Issues
            </h2>
            <div className="space-y-3">
              {criticalIssues.map((issue, i) => <IssueRow key={`critical-${i}`} issue={issue} index={i} />)}
            </div>
          </section>
        )}
        {warningIssues.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-h4 font-semibold text-warning">
              <span className="h-2 w-2 rounded-full bg-warning" /> Warnings
            </h2>
            <div className="space-y-3">
              {warningIssues.map((issue, i) => <IssueRow key={`warning-${i}`} issue={issue} index={i} />)}
            </div>
          </section>
        )}
        {infoIssues.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-h4 font-semibold text-info">
              <span className="h-2 w-2 rounded-full bg-info" /> Informational
            </h2>
            <div className="space-y-3">
              {infoIssues.map((issue, i) => <IssueRow key={`info-${i}`} issue={issue} index={i} />)}
            </div>
          </section>
        )}
      </div>

      {/* Upgrade CTA */}
      {data.totalIssues > data.issues.length && (
        <div className="mt-10 rounded-2xl border border-border bg-bg-secondary p-8 text-center">
          <p className="text-body text-text-secondary">
            Showing {data.issues.length} of {data.totalIssues} issues.
          </p>
          <Link
            href="/#pricing"
            className="mt-4 inline-block rounded-lg bg-brand px-6 py-3 text-body-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Upgrade for Full Report
          </Link>
        </div>
      )}
    </div>
  );
}
