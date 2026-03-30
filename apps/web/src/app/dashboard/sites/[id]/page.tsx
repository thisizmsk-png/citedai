"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SiteDetail {
  id: string;
  domain: string;
  verified: boolean;
  verificationMethod: string;
  verificationToken: string;
  aeoScore: number | null;
  createdAt: string;
}

interface Scan {
  id: string;
  siteId: string;
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
// Score display
// ---------------------------------------------------------------------------
function ScoreDisplay({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-text-tertiary">--</span>;
  }
  const color =
    score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-error";
  const ringColor =
    score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  const size = 140;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * (score / 100);

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
            fill="none" stroke={ringColor} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-h2 font-bold tabular-nums ${color}`}>{score}</span>
          <span className="text-tiny text-text-tertiary">/ 100</span>
        </div>
      </div>
      <span className="text-body-sm font-medium text-text-secondary">AEO Score</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verification badge
// ---------------------------------------------------------------------------
function VerificationBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 border border-success/30 bg-success/10 px-2.5 py-1 text-tiny font-medium text-success">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 border border-warning/30 bg-warning/10 px-2.5 py-1 text-tiny font-medium text-warning">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      Pending Verification
    </span>
  );
}

// ---------------------------------------------------------------------------
// Scan status badge
// ---------------------------------------------------------------------------
function ScanStatusBadge({ status }: { status: Scan["status"] }) {
  const styles: Record<Scan["status"], string> = {
    queued: "border-info/30 bg-info/10 text-info",
    crawling: "border-info/30 bg-info/10 text-info",
    scoring: "border-warning/30 bg-warning/10 text-warning",
    completed: "border-success/30 bg-success/10 text-success",
    failed: "border-error/30 bg-error/10 text-error",
  };
  const labels: Record<Scan["status"], string> = {
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
// Scan row
// ---------------------------------------------------------------------------
function ScanRow({ scan }: { scan: Scan }) {
  const date = new Date(scan.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const scoreColor =
    scan.score === null
      ? "text-text-tertiary"
      : scan.score >= 70
        ? "text-success"
        : scan.score >= 40
          ? "text-warning"
          : "text-error";

  return (
    <div className="glass-card flex items-center gap-4 p-5 transition-all hover:border-border-hover">
      {/* Score */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-bg-tertiary">
        {scan.score !== null ? (
          <span className={`text-h5 font-bold tabular-nums ${scoreColor}`}>{scan.score}</span>
        ) : (
          <span className="text-tiny text-text-tertiary">--</span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <ScanStatusBadge status={scan.status} />
          <span className="text-tiny text-text-tertiary">{date}</span>
        </div>
        <p className="mt-1 text-body-sm text-text-secondary">
          {scan.pagesScanned} / {scan.maxPages} pages scanned
        </p>
      </div>

      {/* Link to results */}
      {scan.status === "completed" && (
        <Link
          href={`/dashboard?scanId=${scan.id}`}
          className="shrink-0 text-body-sm font-medium text-brand transition-colors hover:text-brand-hover"
          aria-label={`View scan results from ${date}`}
        >
          View Results
          <svg className="ml-1 inline-block h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty scans state
// ---------------------------------------------------------------------------
function EmptyScansState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center bg-bg-tertiary">
        <svg className="h-6 w-6 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <p className="text-body-sm text-text-secondary">
        No scans yet. Run your first scan to analyze this site.
      </p>
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
// Main page
// ---------------------------------------------------------------------------
export default function SiteDetailPage() {
  const params = useParams();
  const siteId = params.id as string;

  const [site, setSite] = useState<SiteDetail | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanTriggering, setScanTriggering] = useState(false);

  const fetchSiteData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch site details
      const sitesRes = await fetch("/api/v1/sites");
      const sitesBody = await sitesRes.json();
      if (!sitesRes.ok) {
        throw new Error(sitesBody?.error?.message || "Failed to load site");
      }

      // Find the specific site
      const siteData = (sitesBody.data || []).find(
        (s: Record<string, unknown>) => s.id === siteId
      );

      if (siteData) {
        setSite({
          id: siteData.id,
          domain: siteData.domain,
          verified: siteData.verified ?? false,
          verificationMethod: siteData.verificationMethod || "dns",
          verificationToken: siteData.verificationToken || "",
          aeoScore: siteData.aeoScore ?? null,
          createdAt: siteData.createdAt || new Date().toISOString(),
        });
      } else {
        // Site not found — show error, not a fake placeholder
        setError("Site not found. It may have been deleted or you don't have access.");
      }

      // Scans would come from a separate endpoint in production
      // For now, set empty list (API stubs don't have scan listing)
      setScans([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchSiteData();
  }, [fetchSiteData]);

  async function handleRunScan() {
    if (!site) return;
    setScanTriggering(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site.id, maxPages: 100 }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || "Failed to start scan");
      }
      // Add the new scan to the list
      const newScan: Scan = {
        id: body.data.id,
        siteId: body.data.siteId,
        status: body.data.status || "queued",
        score: null,
        pagesScanned: 0,
        maxPages: body.data.maxPages || 100,
        createdAt: body.data.createdAt || new Date().toISOString(),
        completedAt: null,
      };
      setScans((prev) => [newScan, ...prev]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start scan");
    } finally {
      setScanTriggering(false);
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Spinner className="h-10 w-10 text-brand" />
        <p className="text-body-sm text-text-secondary">Loading site details...</p>
      </div>
    );
  }

  // Site not found
  if (!site) {
    return (
      <div className="mx-auto max-w-2xl py-32 text-center">
        <h1 className="mb-4 text-h2 font-semibold text-text-primary">Site not found</h1>
        <p className="mb-8 text-body-sm text-text-secondary">
          The site you are looking for does not exist or you do not have access.
        </p>
        <Link href="/dashboard/sites" className="btn-primary">
          Back to Sites
        </Link>
      </div>
    );
  }

  const createdDate = new Date(site.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-6 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-body-sm" aria-label="Breadcrumb">
        <Link href="/dashboard/sites" className="text-text-tertiary transition-colors hover:text-text-primary">
          My Sites
        </Link>
        <svg className="h-3.5 w-3.5 text-text-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-text-primary font-medium">{site.domain}</span>
      </nav>

      {/* Error */}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Site header */}
      <div className="mb-8 grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className="glass-card p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-h2 font-semibold text-text-primary">{site.domain}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <VerificationBadge verified={site.verified} />
                <span className="text-tiny text-text-tertiary">Added {createdDate}</span>
              </div>
              {!site.verified && site.verificationToken && (
                <div className="mt-4 border border-border bg-bg-secondary p-4">
                  <p className="section-label mb-2">Verify your domain</p>
                  <p className="mb-3 text-body-sm text-text-secondary">
                    Add this DNS TXT record to verify ownership:
                  </p>
                  <code className="block bg-bg-primary border border-border px-4 py-2.5 font-mono text-tiny text-text-primary select-all">
                    {site.verificationToken}
                  </code>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRunScan}
                disabled={scanTriggering}
                className="btn-primary disabled:opacity-60"
              >
                {scanTriggering ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Starting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                    </svg>
                    Run Scan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Score card */}
        <div className="glass-card flex items-center justify-center p-8">
          <ScoreDisplay score={site.aeoScore} />
        </div>
      </div>

      {/* Scans section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-label">Scan History</h2>
          <span className="text-tiny text-text-tertiary tabular-nums">
            {scans.length} scan{scans.length !== 1 ? "s" : ""}
          </span>
        </div>

        {scans.length === 0 ? (
          <div className="glass-card">
            <EmptyScansState />
          </div>
        ) : (
          <div className="space-y-3">
            {scans.map((scan) => (
              <ScanRow key={scan.id} scan={scan} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
