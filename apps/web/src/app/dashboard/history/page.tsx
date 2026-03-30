"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Site {
  id: string;
  domain: string;
}

interface ScanHistoryItem {
  id: string;
  siteId: string;
  siteDomain: string;
  status: "queued" | "crawling" | "scoring" | "completed" | "failed";
  score: number | null;
  pagesScanned: number;
  maxPages: number;
  createdAt: string;
  completedAt: string | null;
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Scan status badge
// ---------------------------------------------------------------------------
function ScanStatusBadge({ status }: { status: ScanHistoryItem["status"] }) {
  const styles: Record<ScanHistoryItem["status"], string> = {
    queued: "border-info/30 bg-info/10 text-info",
    crawling: "border-info/30 bg-info/10 text-info",
    scoring: "border-warning/30 bg-warning/10 text-warning",
    completed: "border-success/30 bg-success/10 text-success",
    failed: "border-error/30 bg-error/10 text-error",
  };
  const labels: Record<ScanHistoryItem["status"], string> = {
    queued: "Queued",
    crawling: "Crawling",
    scoring: "Scoring",
    completed: "Completed",
    failed: "Failed",
  };

  return (
    <span className={`inline-flex items-center border px-2.5 py-1 text-tiny font-medium ${styles[status]}`}>
      {(status === "crawling" || status === "scoring" || status === "queued") && (
        <Spinner className="mr-1.5 h-3 w-3" />
      )}
      {labels[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Score cell
// ---------------------------------------------------------------------------
function ScoreCell({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-tiny text-text-tertiary">--</span>;
  }
  const color =
    score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-error";
  const bgColor =
    score >= 70 ? "bg-success/10" : score >= 40 ? "bg-warning/10" : "bg-error/10";
  return (
    <span className={`inline-flex h-10 w-10 items-center justify-center ${bgColor} text-h5 font-bold tabular-nums ${color}`}>
      {score}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Filter dropdown
// ---------------------------------------------------------------------------
function SiteFilter({
  sites,
  selectedSiteId,
  onChange,
}: {
  sites: Site[];
  selectedSiteId: string | null;
  onChange: (siteId: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="site-filter" className="section-label whitespace-nowrap">
        Filter by site
      </label>
      <select
        id="site-filter"
        value={selectedSiteId ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="border border-border bg-bg-secondary px-4 py-2.5 text-body-sm text-text-primary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
        aria-label="Filter scans by site"
      >
        <option value="">All sites</option>
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.domain}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scan history row
// ---------------------------------------------------------------------------
function HistoryRow({ scan }: { scan: ScanHistoryItem }) {
  const date = new Date(scan.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="glass-card flex items-center gap-5 p-5 transition-all hover:border-border-hover">
      {/* Score */}
      <div className="shrink-0">
        <ScoreCell score={scan.score} />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/sites/${scan.siteId}`}
            className="text-h5 font-medium text-text-primary transition-colors hover:text-brand"
          >
            {scan.siteDomain}
          </Link>
          <ScanStatusBadge status={scan.status} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-tiny text-text-tertiary">
          <span>{date}</span>
          <span className="text-text-disabled">&middot;</span>
          <span className="tabular-nums">{scan.pagesScanned} pages scanned</span>
        </div>
      </div>

      {/* Action */}
      {scan.status === "completed" && (
        <Link
          href={`/dashboard?scanId=${scan.id}`}
          className="shrink-0 btn-outline py-2 px-4 text-tiny"
          aria-label={`View full results for ${scan.siteDomain} scan from ${date}`}
        >
          View Results
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center bg-brand-subtle">
        <svg className="h-8 w-8 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="mb-2 text-h3 font-semibold text-text-primary">
        {hasFilter ? "No scans match this filter" : "No scan history yet"}
      </h2>
      <p className="mb-8 max-w-sm text-body-sm text-text-secondary">
        {hasFilter
          ? "Try selecting a different site or clear the filter to see all scans."
          : "Run your first scan from a site page to start building your history."
        }
      </p>
      <div className="flex gap-3">
        <Link href="/dashboard/sites" className="btn-primary">
          Go to Sites
        </Link>
        <Link href="/dashboard" className="btn-outline">
          Quick Scan
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error banner
// ---------------------------------------------------------------------------
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between border border-error/30 bg-error/10 px-5 py-3" role="alert">
      <span className="text-body-sm text-error">{message}</span>
      <button
        onClick={onDismiss}
        className="ml-4 shrink-0 text-error transition-colors hover:text-error/70"
        aria-label="Dismiss error"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------------
function SummaryStats({ scans }: { scans: ScanHistoryItem[] }) {
  const completedScans = scans.filter((s) => s.status === "completed");
  const avgScore =
    completedScans.length > 0
      ? Math.round(
          completedScans.reduce((sum, s) => sum + (s.score || 0), 0) /
            completedScans.length
        )
      : null;
  const totalPages = scans.reduce((sum, s) => sum + s.pagesScanned, 0);
  const uniqueSites = new Set(scans.map((s) => s.siteId)).size;

  const stats = [
    { label: "Total Scans", value: scans.length.toString() },
    { label: "Avg Score", value: avgScore !== null ? avgScore.toString() : "--" },
    { label: "Pages Analyzed", value: totalPages.toLocaleString() },
    { label: "Sites", value: uniqueSites.toString() },
  ];

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card p-5">
          <p className="section-label mb-2">{stat.label}</p>
          <p className="text-h3 font-bold tabular-nums text-text-primary">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function HistoryPage() {
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSiteId, setFilterSiteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch sites first to get domain mapping
      const sitesRes = await fetch("/api/v1/sites");
      const sitesBody = await sitesRes.json();
      if (!sitesRes.ok) {
        throw new Error(sitesBody?.error?.message || "Failed to load data");
      }

      const siteList: Site[] = (sitesBody.data || []).map(
        (s: Record<string, unknown>) => ({
          id: s.id as string,
          domain: s.domain as string,
        })
      );
      setSites(siteList);

      // In a full implementation, there would be a GET /api/v1/scans endpoint.
      // For the stub API, scans list is empty.
      setScans([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filter
  const filteredScans = filterSiteId
    ? scans.filter((s) => s.siteId === filterSiteId)
    : scans;

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Spinner className="h-10 w-10 text-brand" />
        <p className="text-body-sm text-text-secondary">Loading scan history...</p>
      </div>
    );
  }

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">Scan History</h1>
          <p className="mt-1 text-body-sm text-text-tertiary">
            View all past scans across your monitored sites.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/sites" className="btn-outline">
            My Sites
          </Link>
          <Link href="/dashboard" className="btn-primary">
            New Scan
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Summary stats */}
      {scans.length > 0 && <SummaryStats scans={scans} />}

      {/* Filter */}
      {sites.length > 0 && scans.length > 0 && (
        <div className="mb-6">
          <SiteFilter
            sites={sites}
            selectedSiteId={filterSiteId}
            onChange={setFilterSiteId}
          />
        </div>
      )}

      {/* Scans list or empty state */}
      {filteredScans.length === 0 ? (
        <EmptyState hasFilter={filterSiteId !== null} />
      ) : (
        <div className="space-y-3">
          {filteredScans.map((scan) => (
            <HistoryRow key={scan.id} scan={scan} />
          ))}
        </div>
      )}
    </main>
  );
}
