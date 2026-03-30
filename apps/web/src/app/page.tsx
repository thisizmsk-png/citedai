"use client";

import { useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types for the free scanner result (matches API shape)
// ---------------------------------------------------------------------------
interface ScoreBreakdown {
  score: number;
  max: number;
  detail: string;
}

interface ScanResult {
  url: string;
  title: string | null;
  score: {
    overall: number;
    extractability: number;
    authority: number;
    freshness: number;
    breakdown: Record<string, ScoreBreakdown>;
  };
  issues: {
    category: string;
    severity: string;
    description: string;
    recommendation: string;
    suggestedFix?: string;
  }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function scoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 70) return "text-emerald-400";
  if (pct >= 40) return "text-amber-400";
  return "text-red-400";
}

function ringColor(score: number): string {
  if (score >= 70) return "ring-emerald-500";
  if (score >= 40) return "ring-amber-500";
  return "ring-red-500";
}

function bgBarColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 70) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

// ---------------------------------------------------------------------------
// Free URL Scanner Component
// ---------------------------------------------------------------------------
function FreeScanner() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `Analysis failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data.data ?? data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form onSubmit={handleScan} className="flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/your-page"
          required
          className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-5 py-3.5 text-base text-white placeholder-gray-500 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning...
            </span>
          ) : (
            "Scan Free"
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && <ScanResultCard result={result} />}
    </div>
  );
}

function ScanResultCard({ result }: { result: ScanResult }) {
  const { score } = result;

  return (
    <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-900/80 p-6 backdrop-blur-sm">
      {/* URL & title */}
      <div className="mb-5 border-b border-gray-800 pb-4">
        <p className="text-sm text-gray-400 truncate">{result.url}</p>
        {result.title && (
          <p className="mt-1 font-medium text-white truncate">{result.title}</p>
        )}
      </div>

      {/* Overall score */}
      <div className="mb-6 flex items-center justify-center">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full ring-4 ${ringColor(score.overall)} bg-gray-950`}
        >
          <div className="text-center">
            <div className={`text-4xl font-bold ${scoreColor(score.overall, 100)}`}>
              {score.overall}
            </div>
            <div className="text-xs text-gray-500">/ 100</div>
          </div>
        </div>
      </div>

      {/* Three dimension bars */}
      <div className="space-y-4">
        <DimensionBar label="Extractability" score={score.extractability} max={40} />
        <DimensionBar label="Authority" score={score.authority} max={35} />
        <DimensionBar label="Freshness" score={score.freshness} max={25} />
      </div>

      {/* Top issues preview */}
      {result.issues.length > 0 && (
        <div className="mt-6 border-t border-gray-800 pt-5">
          <h4 className="mb-3 text-sm font-semibold text-gray-300">Top Issues</h4>
          <ul className="space-y-2">
            {result.issues.slice(0, 3).map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    issue.severity === "critical"
                      ? "bg-red-900/60 text-red-300"
                      : issue.severity === "warning"
                        ? "bg-amber-900/60 text-amber-300"
                        : "bg-blue-900/60 text-blue-300"
                  }`}
                >
                  {issue.severity === "critical" ? "!" : issue.severity === "warning" ? "~" : "i"}
                </span>
                <span className="text-gray-300">{issue.description}</span>
              </li>
            ))}
          </ul>
          {result.issues.length > 3 && (
            <p className="mt-3 text-xs text-gray-500">
              + {result.issues.length - 3} more issues found
            </p>
          )}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Get Full Report &rarr;
        </Link>
      </div>
    </div>
  );
}

function DimensionBar({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  const pct = Math.round((score / max) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className={`font-semibold ${scoreColor(score, max)}`}>
          {score}/{max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bgBarColor(score, max)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pain Points
// ---------------------------------------------------------------------------
const painPoints = [
  {
    icon: "?",
    title: "Invisible to AI",
    description:
      "ChatGPT, Perplexity, and Google AI Overviews cite your competitors, not you. Your content exists but AI cannot extract answers from it.",
  },
  {
    icon: "$",
    title: "Losing Organic Traffic",
    description:
      "AI answer engines serve zero-click results. Users never reach your site. Your SEO playbook was built for a world that no longer exists.",
  },
  {
    icon: "!",
    title: "No Visibility Into AI Search",
    description:
      "Google Analytics cannot tell you when AI cites your page. You have no idea where you stand in the answer-engine landscape.",
  },
];

// ---------------------------------------------------------------------------
// How It Works Steps
// ---------------------------------------------------------------------------
const steps = [
  {
    step: "1",
    title: "Scan",
    description:
      "Paste any URL. Our engine analyzes extractability, authority signals, and freshness against 40+ AEO factors in under 10 seconds.",
  },
  {
    step: "2",
    title: "Fix",
    description:
      "Get an actionable issue list ranked by impact. Each recommendation includes a suggested code or copy fix you can apply immediately.",
  },
  {
    step: "3",
    title: "Monitor",
    description:
      "Track your AEO score over time. Get alerts when AI engines start (or stop) citing your pages. See which queries trigger your citations.",
  },
];

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------
const plans = [
  {
    name: "Starter",
    price: 49,
    description: "For solo creators and small blogs.",
    features: [
      "3 sites monitored",
      "100 pages per scan",
      "Weekly rescans",
      "50 monitored queries",
      "Email reports",
      "Issue recommendations",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Pro",
    price: 149,
    description: "For content teams and growing brands.",
    features: [
      "10 sites monitored",
      "500 pages per scan",
      "Daily rescans",
      "250 monitored queries",
      "API access",
      "PDF export",
      "Slack integration",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Agency",
    price: 499,
    description: "For agencies managing client portfolios.",
    features: [
      "Unlimited sites",
      "2,000 pages per scan",
      "Daily rescans",
      "1,000 monitored queries",
      "Full API access",
      "White-label PDF reports",
      "Client dashboards",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------
export default function Home() {
  return (
    <main>
      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl px-4 pb-20 pt-24 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900/60 px-4 py-1.5 text-xs font-medium text-gray-300">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Now in public beta
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Is AI citing{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              your content
            </span>
            ?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-400">
            Score any page for AI-citability. Get actionable fixes to appear in ChatGPT,
            Perplexity, and Google AI Overviews.
          </p>

          <div className="mt-10">
            <FreeScanner />
          </div>

          <p className="mt-4 text-xs text-gray-600">
            No sign-up required. Scan any public URL instantly.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Social proof bar */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-gray-800/50 bg-gray-900/30 py-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 text-sm text-gray-500">
          <span>40+ AEO ranking factors</span>
          <span className="hidden sm:inline text-gray-700">|</span>
          <span>3 AI engines tracked</span>
          <span className="hidden sm:inline text-gray-700">|</span>
          <span>Actionable fixes, not just scores</span>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Problem Section */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">
              SEO got you to page one. AI search is rewriting the rules.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              Answer engines generate responses, not links. If your content is not
              structured for extraction, AI will cite someone else.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {painPoints.map((point) => (
              <div
                key={point.title}
                className="rounded-xl border border-gray-800 bg-gray-900/50 p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-lg font-bold text-indigo-400">
                  {point.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{point.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* How It Works */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-gray-800/50 bg-gray-900/30 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">How It Works</h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Three steps to get your content cited by AI answer engines.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
                  {s.step}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Pricing */}
      {/* ------------------------------------------------------------------ */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Simple, Transparent Pricing</h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Start free for 14 days. No credit card required.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 ${
                  plan.highlighted
                    ? "border-indigo-500 bg-gray-900/80 shadow-lg shadow-indigo-600/10"
                    : "border-gray-800 bg-gray-900/50"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}

                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-400">{plan.description}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">${plan.price}</span>
                  <span className="text-sm text-gray-500">/mo</span>
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3 text-sm text-gray-300">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/login"
                  className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : "border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Final CTA */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t border-gray-800/50 bg-gray-900/30 py-20">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">
            Stop guessing. Start getting cited.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-gray-400">
            Join the beta and discover exactly where your content stands in the
            AI answer-engine landscape.
          </p>
          <Link
            href="/auth/login"
            className="mt-8 inline-block rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30"
          >
            Start Your 14-Day Free Trial
          </Link>
          <p className="mt-3 text-xs text-gray-600">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>
    </main>
  );
}
