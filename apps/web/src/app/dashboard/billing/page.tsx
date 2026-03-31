"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Plan = "starter" | "pro" | "agency";
type Interval = "monthly" | "yearly";

interface UserBilling {
  plan: Plan;
  email: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  sitesUsed: number;
  sitesLimit: number;
  scansThisPeriod: number;
  pagesPerScan: number;
  monitoredQueries: number;
  monitoredQueriesLimit: number;
}

interface PlanConfig {
  name: string;
  description: string;
  monthly: number;
  yearly: number;
  features: string[];
  limits: {
    sites: number;
    pagesPerScan: number;
    scanFrequency: string;
    monitoredQueries: number;
    apiAccess: boolean;
    exportPdf: boolean;
  };
}

// ---------------------------------------------------------------------------
// Plan configuration
// ---------------------------------------------------------------------------

const PLANS: Record<Plan, PlanConfig> = {
  starter: {
    name: "Starter",
    description: "For individuals getting started with AEO",
    monthly: 0,
    yearly: 0,
    features: [
      "1 site",
      "100 pages per scan",
      "Weekly scans",
      "Basic issue detection",
    ],
    limits: {
      sites: 1,
      pagesPerScan: 100,
      scanFrequency: "Weekly",
      monitoredQueries: 0,
      apiAccess: false,
      exportPdf: false,
    },
  },
  pro: {
    name: "Pro",
    description: "For growing businesses optimizing AI visibility",
    monthly: 49,
    yearly: 39,
    features: [
      "5 sites",
      "500 pages per scan",
      "Daily scans",
      "25 monitored queries",
      "API access",
      "PDF export",
    ],
    limits: {
      sites: 5,
      pagesPerScan: 500,
      scanFrequency: "Daily",
      monitoredQueries: 25,
      apiAccess: true,
      exportPdf: true,
    },
  },
  agency: {
    name: "Agency",
    description: "For agencies managing multiple client sites",
    monthly: 149,
    yearly: 119,
    features: [
      "25 sites",
      "500 pages per scan",
      "Daily scans",
      "100 monitored queries",
      "API access",
      "PDF export",
      "Priority support",
    ],
    limits: {
      sites: 25,
      pagesPerScan: 500,
      scanFrequency: "Daily",
      monitoredQueries: 100,
      apiAccess: true,
      exportPdf: true,
    },
  },
};

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
// Usage bar
// ---------------------------------------------------------------------------

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-body-sm text-text-secondary">{label}</span>
        <span className={`text-body-sm font-medium tabular-nums ${
          isAtLimit ? "text-error" : isNearLimit ? "text-warning" : "text-text-primary"
        }`}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-bg-tertiary">
        <div
          className={`h-full transition-all duration-500 ${
            isAtLimit ? "bg-error" : isNearLimit ? "bg-warning" : "bg-brand"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan card
// ---------------------------------------------------------------------------

function PlanCard({
  plan,
  config,
  currentPlan,
  interval,
  onSelect,
  loading,
}: {
  plan: Plan;
  config: PlanConfig;
  currentPlan: Plan;
  interval: Interval;
  onSelect: (plan: Plan) => void;
  loading: boolean;
}) {
  const isCurrent = plan === currentPlan;
  const price = interval === "monthly" ? config.monthly : config.yearly;
  const isUpgrade = getPlanRank(plan) > getPlanRank(currentPlan);
  const isDowngrade = getPlanRank(plan) < getPlanRank(currentPlan);

  return (
    <div className={`flex flex-col border p-6 transition-colors ${
      isCurrent
        ? "border-brand bg-brand-subtle"
        : "border-border bg-bg-primary hover:border-border-hover"
    }`}>
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-h4 font-medium text-text-primary">{config.name}</h3>
          {isCurrent && (
            <span className="border border-brand bg-brand px-2 py-0.5 text-tiny font-medium text-text-inverse uppercase tracking-wider">
              Current
            </span>
          )}
        </div>
        <p className="mt-1 text-body-sm text-text-tertiary">{config.description}</p>
      </div>

      <div className="mb-6">
        {price === 0 ? (
          <div className="flex items-baseline gap-1">
            <span className="text-h2 font-medium text-text-primary">Free</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-h2 font-medium text-text-primary">${price}</span>
            <span className="text-body-sm text-text-tertiary">/ mo</span>
          </div>
        )}
        {interval === "yearly" && price > 0 && (
          <p className="mt-1 text-caption text-success">
            Save ${(config.monthly - config.yearly) * 12}/year
          </p>
        )}
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {config.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-body-sm text-text-secondary">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <button
          disabled
          className="w-full border border-border bg-bg-secondary px-4 py-3 text-body-sm font-medium text-text-tertiary uppercase tracking-wider cursor-not-allowed"
        >
          Current Plan
        </button>
      ) : plan === "starter" ? (
        <button
          disabled
          className="w-full border border-border bg-bg-secondary px-4 py-3 text-body-sm font-medium text-text-tertiary uppercase tracking-wider cursor-not-allowed"
        >
          Free Tier
        </button>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className={`w-full px-4 py-3 text-body-sm font-medium uppercase tracking-wider transition-colors ${
            isUpgrade
              ? "bg-brand text-text-inverse hover:bg-brand-hover"
              : isDowngrade
                ? "border border-border bg-bg-primary text-text-primary hover:bg-bg-tertiary"
                : "bg-brand text-text-inverse hover:bg-brand-hover"
          } disabled:opacity-50`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-4 w-4" />
              Redirecting...
            </span>
          ) : isUpgrade ? (
            "Upgrade"
          ) : isDowngrade ? (
            "Downgrade"
          ) : (
            "Select"
          )}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPlanRank(plan: Plan): number {
  const ranks: Record<Plan, number> = { starter: 0, pro: 1, agency: 2 };
  return ranks[plan];
}

// ---------------------------------------------------------------------------
// Billing Page
// ---------------------------------------------------------------------------

export default function BillingPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [billing, setBilling] = useState<UserBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<Interval>("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    sessionId ? "Subscription updated successfully." : null,
  );

  // Fetch billing data
  const fetchBilling = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user data from sites endpoint to get plan info
      const [sitesRes, userRes] = await Promise.all([
        fetch("/api/v1/sites"),
        fetch("/api/v1/billing/status"),
      ]);

      // Sites count from the sites API
      const sitesBody = await sitesRes.json();
      const sitesUsed = sitesRes.ok ? (sitesBody.data?.length ?? sitesBody.pagination?.total ?? 0) : 0;

      // User billing info — if status endpoint doesn't exist yet, use defaults
      let plan: Plan = "starter";
      let email = "";
      let stripeCustomerId: string | null = null;
      let stripeSubscriptionId: string | null = null;
      let scansThisPeriod = 0;
      let monitoredQueries = 0;

      if (userRes.ok) {
        const userBody = await userRes.json();
        plan = userBody.data?.plan ?? "starter";
        email = userBody.data?.email ?? "";
        stripeCustomerId = userBody.data?.stripeCustomerId ?? null;
        stripeSubscriptionId = userBody.data?.stripeSubscriptionId ?? null;
        scansThisPeriod = userBody.data?.scansThisPeriod ?? 0;
        monitoredQueries = userBody.data?.monitoredQueries ?? 0;
      }

      const planConfig = PLANS[plan];

      setBilling({
        plan,
        email,
        stripeCustomerId,
        stripeSubscriptionId,
        sitesUsed,
        sitesLimit: planConfig.limits.sites,
        scansThisPeriod,
        pagesPerScan: planConfig.limits.pagesPerScan,
        monitoredQueries,
        monitoredQueriesLimit: planConfig.limits.monitoredQueries,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  // Clear success message after 5s
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle checkout
  async function handleCheckout(plan: Plan) {
    try {
      setCheckoutLoading(plan);
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error?.message || "Failed to create checkout session");
      }

      if (body.data?.url) {
        window.location.href = body.data.url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setCheckoutLoading(null);
    }
  }

  // Handle portal
  async function handlePortal() {
    try {
      setPortalLoading(true);
      const res = await fetch("/api/v1/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error?.message || "Failed to open billing portal");
      }

      if (body.data?.url) {
        window.location.href = body.data.url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Portal failed");
      setPortalLoading(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  // Error state
  if (error && !billing) {
    return (
      <div className="mx-auto max-w-2xl py-32 text-center">
        <div className="mb-6 border border-error/30 bg-error/10 px-6 py-4 text-body-sm text-error">
          {error}
        </div>
        <button
          onClick={fetchBilling}
          className="border border-border bg-bg-secondary px-5 py-2.5 text-body-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentPlan = billing?.plan ?? "starter";
  const currentConfig = PLANS[currentPlan];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* ================================================================= */}
      {/* Header */}
      {/* ================================================================= */}
      <div className="mb-10">
        <h1 className="text-h2 font-medium text-text-primary">Billing</h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          Manage your subscription, view usage, and upgrade your plan.
        </p>
      </div>

      {/* ================================================================= */}
      {/* Success / Error banners */}
      {/* ================================================================= */}
      {successMessage && (
        <div className="mb-6 flex items-center gap-3 border border-success/30 bg-success/10 px-5 py-3">
          <svg className="h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-body-sm text-success">{successMessage}</span>
        </div>
      )}

      {error && billing && (
        <div className="mb-6 border border-error/30 bg-error/10 px-5 py-3">
          <span className="text-body-sm text-error">{error}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* Current Plan + Usage */}
      {/* ================================================================= */}
      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        {/* Current plan card */}
        <div className="border border-border p-6">
          <span className="text-overline text-text-tertiary">Current Plan</span>
          <div className="mt-3 flex items-baseline gap-3">
            <h2 className="text-h3 font-medium text-text-primary">{currentConfig.name}</h2>
            {currentPlan !== "starter" && (
              <span className="text-body-sm text-text-tertiary">
                ${currentConfig.monthly}/mo
              </span>
            )}
          </div>
          <p className="mt-2 text-body-sm text-text-tertiary">{currentConfig.description}</p>

          {billing?.stripeSubscriptionId && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="mt-6 w-full border border-border bg-bg-primary px-4 py-3 text-body-sm font-medium text-text-primary uppercase tracking-wider transition-colors hover:bg-bg-tertiary disabled:opacity-50"
            >
              {portalLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Opening Portal...
                </span>
              ) : (
                "Manage Subscription"
              )}
            </button>
          )}
        </div>

        {/* Usage card */}
        <div className="border border-border p-6">
          <span className="text-overline text-text-tertiary">Usage</span>
          <div className="mt-5 space-y-5">
            <UsageBar
              used={billing?.sitesUsed ?? 0}
              limit={billing?.sitesLimit ?? 1}
              label="Sites"
            />
            <UsageBar
              used={billing?.scansThisPeriod ?? 0}
              limit={billing?.pagesPerScan ?? 100}
              label="Pages per scan"
            />
            {currentConfig.limits.monitoredQueries > 0 && (
              <UsageBar
                used={billing?.monitoredQueries ?? 0}
                limit={billing?.monitoredQueriesLimit ?? 0}
                label="Monitored queries"
              />
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 border border-border px-3 py-1.5">
              <span className="text-tiny text-text-tertiary">Scan frequency</span>
              <span className="text-tiny font-medium text-text-primary">{currentConfig.limits.scanFrequency}</span>
            </div>
            {currentConfig.limits.apiAccess && (
              <div className="flex items-center gap-2 border border-success/30 bg-success/10 px-3 py-1.5">
                <span className="text-tiny font-medium text-success">API Access</span>
              </div>
            )}
            {currentConfig.limits.exportPdf && (
              <div className="flex items-center gap-2 border border-success/30 bg-success/10 px-3 py-1.5">
                <span className="text-tiny font-medium text-success">PDF Export</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Plan selector */}
      {/* ================================================================= */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-h4 font-medium text-text-primary">Plans</h2>
        <div className="flex border border-border">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-4 py-2 text-tiny font-medium uppercase tracking-wider transition-colors ${
              interval === "monthly"
                ? "bg-brand text-text-inverse"
                : "bg-bg-primary text-text-secondary hover:bg-bg-tertiary"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-4 py-2 text-tiny font-medium uppercase tracking-wider transition-colors ${
              interval === "yearly"
                ? "bg-brand text-text-inverse"
                : "bg-bg-primary text-text-secondary hover:bg-bg-tertiary"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {(Object.entries(PLANS) as [Plan, PlanConfig][]).map(([plan, config]) => (
          <PlanCard
            key={plan}
            plan={plan}
            config={config}
            currentPlan={currentPlan}
            interval={interval}
            onSelect={handleCheckout}
            loading={checkoutLoading === plan}
          />
        ))}
      </div>

      {/* ================================================================= */}
      {/* Feature comparison */}
      {/* ================================================================= */}
      <div className="mt-10 border border-border">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-h5 font-medium text-text-primary">Feature Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-tiny font-medium uppercase tracking-wider text-text-tertiary">Feature</th>
                <th className="px-6 py-3 text-tiny font-medium uppercase tracking-wider text-text-tertiary text-center">Starter</th>
                <th className="px-6 py-3 text-tiny font-medium uppercase tracking-wider text-text-tertiary text-center">Pro</th>
                <th className="px-6 py-3 text-tiny font-medium uppercase tracking-wider text-text-tertiary text-center">Agency</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "Sites", starter: "1", pro: "5", agency: "25" },
                { feature: "Pages per scan", starter: "100", pro: "500", agency: "500" },
                { feature: "Scan frequency", starter: "Weekly", pro: "Daily", agency: "Daily" },
                { feature: "Monitored queries", starter: "0", pro: "25", agency: "100" },
                { feature: "API access", starter: false, pro: true, agency: true },
                { feature: "PDF export", starter: false, pro: true, agency: true },
              ].map((row) => (
                <tr key={row.feature} className="border-b border-border last:border-b-0">
                  <td className="px-6 py-3 text-body-sm text-text-secondary">{row.feature}</td>
                  {(["starter", "pro", "agency"] as const).map((plan) => {
                    const val = row[plan];
                    return (
                      <td key={plan} className="px-6 py-3 text-center">
                        {typeof val === "boolean" ? (
                          val ? (
                            <svg className="mx-auto h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            <span className="text-body-sm text-text-disabled">&mdash;</span>
                          )
                        ) : (
                          <span className="text-body-sm font-medium text-text-primary tabular-nums">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
