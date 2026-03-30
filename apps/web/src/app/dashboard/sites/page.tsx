"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Site {
  id: string;
  domain: string;
  verified: boolean;
  verificationMethod: string;
  verificationToken: string;
  lastScanDate: string | null;
  aeoScore: number | null;
  createdAt: string;
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
// Score badge
// ---------------------------------------------------------------------------
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="text-tiny text-text-tertiary">No scans yet</span>
    );
  }
  const color =
    score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-error";
  return (
    <span className={`text-h4 font-bold tabular-nums ${color}`}>{score}</span>
  );
}

// ---------------------------------------------------------------------------
// Verification status
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
      Pending
    </span>
  );
}

// ---------------------------------------------------------------------------
// Site card
// ---------------------------------------------------------------------------
function SiteCard({ site }: { site: Site }) {
  const scanDate = site.lastScanDate
    ? new Date(site.lastScanDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Link
      href={`/dashboard/sites/${site.id}`}
      className="glass-card block p-6 transition-all hover:border-border-hover"
      aria-label={`View details for ${site.domain}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {/* Favicon placeholder */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-bg-tertiary">
              <svg className="h-5 w-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-h5 font-medium text-text-primary">{site.domain}</h3>
              <div className="mt-1 flex items-center gap-3">
                <VerificationBadge verified={site.verified} />
                {scanDate && (
                  <span className="text-tiny text-text-tertiary">
                    Last scan: {scanDate}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="section-label">AEO Score</span>
          <ScoreBadge score={site.aeoScore} />
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Add Site form
// ---------------------------------------------------------------------------
function AddSiteForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (domain: string) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [domain, setDomain] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = domain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (cleaned) onSubmit(cleaned);
  }

  return (
    <div className="glass-card p-6">
      <h3 className="mb-4 text-h5 font-medium text-text-primary">Add a new site</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="add-site-domain" className="section-label mb-2 block">
            Domain
          </label>
          <input
            id="add-site-domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            required
            className="w-full border border-border bg-bg-secondary px-4 py-3 text-body text-text-primary placeholder-text-tertiary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            aria-label="Enter domain to add"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Spinner className="h-4 w-4" />
                Adding...
              </>
            ) : (
              "Add Site"
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center bg-brand-subtle">
        <svg className="h-8 w-8 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      </div>
      <h2 className="mb-2 text-h3 font-semibold text-text-primary">No sites yet</h2>
      <p className="mb-8 max-w-sm text-body-sm text-text-secondary">
        Add your first site to start monitoring its AEO performance across AI answer engines.
      </p>
      <button onClick={onAdd} className="btn-primary">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Your First Site
      </button>
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
export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingSubmit, setAddingSubmit] = useState(false);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/sites");
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || `Failed to load sites (${res.status})`);
      }
      // The API returns { data: [], pagination: {} }
      // Sites may be in data array or in body.data
      const siteList: Site[] = (body.data || []).map((s: Record<string, unknown>) => ({
        id: s.id || `site_${Math.random().toString(36).slice(2, 8)}`,
        domain: s.domain || "unknown",
        verified: s.verified ?? false,
        verificationMethod: s.verificationMethod || "dns",
        verificationToken: s.verificationToken || "",
        lastScanDate: s.lastScanDate || null,
        aeoScore: s.aeoScore ?? null,
        createdAt: s.createdAt || new Date().toISOString(),
      }));
      setSites(siteList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  async function handleAddSite(domain: string) {
    setAddingSubmit(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || `Failed to add site (${res.status})`);
      }
      // Add the new site to the list
      const newSite: Site = {
        id: body.data.id,
        domain: body.data.domain,
        verified: body.data.verified ?? false,
        verificationMethod: body.data.verificationMethod || "dns",
        verificationToken: body.data.verificationToken || "",
        lastScanDate: null,
        aeoScore: null,
        createdAt: body.data.createdAt || new Date().toISOString(),
      };
      setSites((prev) => [newSite, ...prev]);
      setShowAddForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add site");
    } finally {
      setAddingSubmit(false);
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Spinner className="h-10 w-10 text-brand" />
        <p className="text-body-sm text-text-secondary">Loading your sites...</p>
      </div>
    );
  }

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">My Sites</h1>
          <p className="mt-1 text-body-sm text-text-tertiary">
            Manage your monitored domains and track AEO performance.
          </p>
        </div>
        <div className="flex gap-3">
          {sites.length > 0 && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
              aria-label="Add a new site"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Site
            </button>
          )}
          <Link
            href="/dashboard"
            className="btn-outline"
          >
            Quick Scan
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Add site form */}
      {showAddForm && (
        <div className="mb-8">
          <AddSiteForm
            onSubmit={handleAddSite}
            onCancel={() => setShowAddForm(false)}
            submitting={addingSubmit}
          />
        </div>
      )}

      {/* Sites list or empty state */}
      {sites.length === 0 && !showAddForm ? (
        <EmptyState onAdd={() => setShowAddForm(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      )}
    </main>
  );
}
