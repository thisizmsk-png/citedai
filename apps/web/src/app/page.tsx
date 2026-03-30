"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
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
  if (pct >= 70) return "text-success";
  if (pct >= 40) return "text-warning";
  return "text-error";
}

function ringColor(score: number): string {
  if (score >= 70) return "ring-success";
  if (score >= 40) return "ring-warning";
  return "ring-error";
}

function bgBarColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 70) return "bg-success";
  if (pct >= 40) return "bg-warning";
  return "bg-error";
}

// ---------------------------------------------------------------------------
// Scroll Reveal Hook
// ---------------------------------------------------------------------------
function useScrollReveal() {
  useEffect(() => {
    // H9: Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealElements = document.querySelectorAll(".reveal, .stagger");

    if (prefersReducedMotion) {
      revealElements.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ---------------------------------------------------------------------------
// Spotlight Card Hook
// ---------------------------------------------------------------------------
// useSpotlight removed (AI slop — mouse-following glow effect)

// ---------------------------------------------------------------------------
// Icons (inline SVG, no deps)
// ---------------------------------------------------------------------------
function IconSearch({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function IconCheck({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function IconSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function IconEye({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconShield({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IconBolt({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function IconChart({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function IconCode({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

function IconUsers({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function IconTarget({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Feature Card — flat, no effects
// ---------------------------------------------------------------------------
function FeatureCard({
  icon,
  title,
  description,
  accentColor,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
  className?: string;
}) {
  return (
    <div className={`card p-8 ${className}`}>
      <div
        className="mb-5 flex h-10 w-10 items-center justify-center"
        style={{ color: accentColor }}
      >
        <span style={{ color: accentColor }}>{icon}</span>
      </div>
      <h3 className="text-h4 text-text-primary">{title}</h3>
      <p className="mt-3 text-body-sm text-text-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );
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

    if (loading) return; // H2: prevent double-submit
    setLoading(true);
    setError(null);
    setResult(null);

    const controller = new AbortController(); // H1: abort on unmount
    try {
      const res = await fetch("/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `Analysis failed (${res.status})`);
      }

      const json = await res.json();
      const d = json.data ?? json;
      setResult({
        url: d.url,
        title: d.title,
        score: {
          overall: d.score,
          extractability: d.extractability,
          authority: d.authority,
          freshness: d.freshness,
          breakdown: d.breakdown ?? {},
        },
        issues: d.issues ?? [],
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "We could not complete the scan. Check the URL and try again."); // C3: specific error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form onSubmit={handleScan} className="relative">
        <div className="glass-card flex items-center gap-2 rounded-sm p-2">
          <div className="flex flex-1 items-center gap-3 pl-4">
            <IconSearch className="h-5 w-5 text-text-tertiary shrink-0" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/your-page" aria-label="Enter a URL to scan"
              required
              className="w-full bg-transparent py-3 text-body text-text-primary placeholder-text-tertiary outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading} aria-busy={loading}
            className=" shrink-0 rounded-sm bg-brand px-6 py-3.5 text-body-sm font-medium text-white transition-all hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <IconSpinner className="h-4 w-4" />
                Scanning...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Analyze Page
                <IconArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>
        </div>
      </form>

      {/* H12: aria-live region for screen readers */}
      <div aria-live="polite" aria-atomic="true">
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-sm border border-error/20 bg-error/5 px-4 py-3 text-body-sm text-error">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 shrink-0 underline hover:no-underline">Dismiss</button>
          </div>
        )}

        {result && <ScanResultCard result={result} />}
      </div>
    </div>
  );
}

function ScanResultCard({ result }: { result: ScanResult }) {
  const { score } = result;

  return (
    <div className="mt-8 glass-card rounded-sm p-6">
      <div className="mb-5 border-b border-border pb-4">
        <p className="text-caption text-text-tertiary truncate">{result.url}</p>
        {result.title && (
          <p className="mt-1 text-body-sm font-medium text-text-primary truncate">{result.title}</p>
        )}
      </div>

      <div className="mb-6 flex items-center justify-center">
        <div className={`flex h-28 w-28 items-center justify-center rounded-sm ring-4 ${ringColor(score.overall)} bg-bg-primary`}>
          <div className="text-center">
            <div className={`text-4xl font-bold tabular-nums ${scoreColor(score.overall, 100)}`}>
              {score.overall}
            </div>
            <div className="text-tiny text-text-tertiary">/ 100</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <DimensionBar label="Extractability" score={score.extractability} max={40} />
        <DimensionBar label="Authority" score={score.authority} max={35} />
        <DimensionBar label="Freshness" score={score.freshness} max={25} />
      </div>

      {result.issues.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <h4 className="mb-3 text-body-sm font-semibold text-text-secondary">Top Issues</h4>
          <ul className="space-y-2">
            {result.issues.slice(0, 3).map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-tiny font-bold ${
                    issue.severity === "critical"
                      ? "bg-error/20 text-error"
                      : issue.severity === "warning"
                        ? "bg-warning/20 text-warning"
                        : "bg-info/20 text-info"
                  }`}
                >
                  {issue.severity === "critical" ? "!" : issue.severity === "warning" ? "~" : "i"}
                </span>
                <span className="text-text-secondary">{issue.description}</span>
              </li>
            ))}
          </ul>
          {result.issues.length > 3 && (
            <p className="mt-3 text-caption text-text-tertiary">
              + {result.issues.length - 3} more issues found
            </p>
          )}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className=" inline-block rounded-sm bg-brand px-5 py-2.5 text-body-sm font-medium text-white transition-colors hover:bg-brand-hover"
        >
          Get Full Report
        </Link>
      </div>
    </div>
  );
}

function DimensionBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-body-sm">
        <span className="text-text-secondary">{label}</span>
        <span className={`font-semibold tabular-nums ${scoreColor(score, max)}`}>
          {score}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-sm bg-bg-tertiary">
        <div
          className={`h-full rounded-sm transition-all duration-500 ${bgBarColor(score, max)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const painPoints = [
  {
    icon: <IconEye className="h-5 w-5" />,
    title: "Invisible to AI",
    description:
    " ChatGPT, Perplexity, and Google AI Overviews cite your competitors, not you. Your content exists but AI cannot extract answers from it.",
    color: "#0a0a0c",
  },
  {
    icon: <IconChart className="h-5 w-5" />,
    title: "Losing Organic Traffic",
    description:
    " AI answer engines serve zero-click results. Users never reach your site. Your SEO playbook was built for a world that no longer exists.",
    color: "#0a0a0c",
  },
  {
    icon: <IconShield className="h-5 w-5" />,
    title: "No Visibility Into AI Search",
    description:
    " Google Analytics cannot tell you when AI cites your page. You have no idea where you stand in the answer-engine landscape.",
    color: "#22c55e",
  },
];

const steps = [
  {
    step: "1",
    title: "Scan",
    description:
    " Paste any URL. Our engine analyzes extractability, authority signals, and freshness against 40+ AEO factors in under 10 seconds.",
  },
  {
    step: "2",
    title: "Fix",
    description:
    " Get an actionable issue list ranked by impact. Each recommendation includes a suggested code or copy fix you can apply immediately.",
  },
  {
    step: "3",
    title: "Monitor",
    description:
    " Track your AEO score over time. Get alerts when AI engines start or stop citing your pages. See which queries trigger citations.",
  },
];

const features = [
  {
    icon: <IconSearch className="h-5 w-5" />,
    title: "AEO Score Engine",
    description:
    " 40+ ranking factors across extractability, authority, and freshness. Deterministic, transparent scoring you can act on today.",
    accent: "#0a0a0c",
    large: true,
  },
  {
    icon: <IconCode className="h-5 w-5" />,
    title: "Code-Level Fixes",
    description:
    " Every issue includes a copy-paste fix. Schema markup, structured data, and content restructuring.",
    accent: "#0a0a0c",
    large: false,
  },
  {
    icon: <IconBolt className="h-5 w-5" />,
    title: "Real-Time Monitoring",
    description:
    " Daily rescans with trend tracking. Know instantly when your score changes.",
    accent: "#0a0a0c",
    large: false,
  },
  {
    icon: <IconUsers className="h-5 w-5" />,
    title: "Competitor Intelligence",
    description:
    " See how your AEO score compares to competitors. Find gaps they exploit that you don't.",
    accent: "#0a0a0c",
    large: true,
  },
  {
    icon: <IconChart className="h-5 w-5" />,
    title: "Citation Tracking",
    description:
    " Monitor when ChatGPT, Perplexity, or Google AI Overviews cite your content. Know exactly which queries surface your pages.",
    accent: "#0a0a0c",
    large: false,
  },
];

const plans = [
  {
    name: "Starter",
    price: 49,
    description: "For solo creators and small blogs.",
    features: [
    " 3 sites monitored",
    " 100 pages per scan",
    " Weekly rescans",
    " 50 monitored queries",
    " Email reports",
    " Issue recommendations",
    ],
    cta: "Try Starter Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: 149,
    description: "For content teams and growing brands.",
    features: [
    " 10 sites monitored",
    " 500 pages per scan",
    " Daily rescans",
    " 250 monitored queries",
    " API access",
    " PDF export",
    " Slack integration",
    " Priority support",
    ],
    cta: "Try Pro Free",
    highlighted: true,
  },
  {
    name: "Agency",
    price: 499,
    description: "For agencies managing client portfolios.",
    features: [
    " Unlimited sites",
    " 2,000 pages per scan",
    " Daily rescans",
    " 1,000 monitored queries",
    " Full API access",
    " White-label reports",
    " Client dashboards",
    " Dedicated support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------
export default function Home() {
  useScrollReveal();

  return (
    <main id="main-content" className="relative">
      {/* ================================================================= */}
      {/* HERO (nav is in layout.tsx) */}
      {/* ================================================================= */}
      <section className="relative overflow-hidden" >
        {/* Noise texture overlay */}

        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-36 pb-24 text-center lg:pt-44">
          {/* Simple beta label — no pill, no pulsing dot */}
          <p className="reveal mb-8 section-label">Public beta — free during early access</p>

          {/* Headline */}
          <h1 className="reveal text-display text-text-primary mx-auto max-w-4xl text-balance">
            Get cited by{" "}
            <span className="text-accent">AI answer engines</span>
          </h1>

          {/* Subtext */}
          <p className="reveal mt-6 text-body-lg text-text-secondary mx-auto max-w-2xl text-pretty">
            Score any page for AI-citability. Get actionable fixes to appear in ChatGPT,
            Perplexity, and Google AI Overviews.
          </p>

          {/* Scanner */}
          <div className="reveal mt-14">
            <FreeScanner />
          </div>

          <p className="reveal mt-5 text-caption text-text-tertiary">
            No sign-up required. Scan any public URL instantly.
          </p>

          {/* Stats removed — AI slop tell (hero metric row) */}
        </div>
      </section>

      {/* ================================================================= */}
      {/* PROBLEM — pain points */}
      {/* ================================================================= */}
      <section className="relative py-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <div className="reveal mx-auto max-w-2xl text-center mb-16">
            <p className="section-label mb-4">The Problem</p>
            <h2 className="text-h2 text-text-primary">
              SEO got you to page one.{" "}
              <span className="text-text-tertiary">AI search rewrites the rules.</span>
            </h2>
            <p className="mt-5 text-body-lg text-text-secondary">
              Answer engines generate responses, not links. If your content is not
              structured for extraction, AI will cite someone else.
            </p>
          </div>

          <div className="stagger grid gap-5 md:grid-cols-3">
            {painPoints.map((point) => (
              <div
                key={point.title}
                className="glass-card  group rounded-sm p-8"
              >
                <div
                  className="mb-5 flex h-11 w-11 items-center justify-center rounded-sm"
                  style={{ backgroundColor: `${point.color}12` }}
                >
                  <span style={{ color: point.color }}>{point.icon}</span>
                </div>
                <h3 className="text-h4 text-text-primary">{point.title}</h3>
                <p className="mt-3 text-body-sm text-text-secondary leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SOCIAL PROOF — simple counter */}
      {/* ================================================================= */}
      <section className="py-10 border-t border-border">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-body-sm text-text-tertiary">
            <span className="font-medium text-text-secondary tabular-nums">2,400+</span> pages scanned during beta
          </p>
        </div>
      </section>

      {/* ================================================================= */}
      {/* FEATURES — Asymmetric bento grid */}
      {/* ================================================================= */}
      <section id="features" className="py-32 border-t border-border relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="reveal mx-auto max-w-2xl text-center mb-16">
            <p className="section-label mb-4">Features</p>
            <h2 className="text-h2 text-text-primary">
              Built for{" "}
              <span className="text-accent">AEO professionals</span>
            </h2>
            <p className="mt-5 text-body-lg text-text-secondary">
              Every feature designed around real citation workflows.
            </p>
          </div>

          {/* Asymmetric bento: row 1 = 2 large, row 2 = 3 small */}
          <div className="reveal grid gap-4 md:grid-cols-2">
            {features.filter((f) => f.large).map((feat) => (
              <FeatureCard
                key={feat.title}
                icon={feat.icon}
                title={feat.title}
                description={feat.description}
                accentColor={feat.accent}
                className="min-h-[220px]"
              />
            ))}
          </div>
          <div className="reveal mt-4 grid gap-4 md:grid-cols-3">
            {features.filter((f) => !f.large).map((feat) => (
              <FeatureCard
                key={feat.title}
                icon={feat.icon}
                title={feat.title}
                description={feat.description}
                accentColor={feat.accent}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* HOW IT WORKS — connected steps with gradient line */}
      {/* ================================================================= */}
      <section id="how-it-works" className="py-32 bg-bg-secondary border-y border-border relative noise">
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="reveal mx-auto max-w-2xl text-center mb-20">
            <p className="section-label mb-4">How It Works</p>
            <h2 className="text-h2 text-text-primary">Three steps to AI citations</h2>
            <p className="mt-5 text-body-lg text-text-secondary">
              From scan to citation in minutes, not months.
            </p>
          </div>

          <div className="stagger relative grid gap-12 md:grid-cols-3 md:gap-8">
            {/* Gradient connecting line (desktop only) */}
            <div
              className="pointer-events-none absolute top-[44px] left-[16.67%] right-[16.67%] hidden h-px md:block"
              style={{
                background:
                " var(--color-border)",
              }}
            />

            {steps.map((s) => (
              <div key={s.step} className="relative text-center">
                {/* Step number with card */}
                <div className="mx-auto mb-8 flex h-[72px] w-[72px] items-center justify-center border border-border">
                  <span className="text-h2 font-bold text-text-primary relative z-10">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-h3 text-text-primary">{s.title}</h3>
                <p className="mt-3 text-body-sm text-text-secondary mx-auto max-w-xs leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* PRICING */}
      {/* ================================================================= */}
      <section id="pricing" className="py-32">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="reveal">
            <p className="section-label mb-4">Pricing</p>
            <h2 className="text-h2 text-text-primary">
              Simple, transparent pricing
            </h2>
            <p className="mt-5 text-body-lg text-text-secondary">
              Start free for 14 days. No credit card required.
            </p>
          </div>

          <div className="stagger mt-16 grid gap-5 text-left md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-sm p-8 transition-all ${
                  plan.highlighted
                    ? ""
                    : "glass-card"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 rounded-sm bg-brand px-4 py-1 text-tiny font-medium text-white">
                    Most Popular
                  </div>
                )}

                <div className="relative z-10">
                  <h3 className="text-h4 text-text-primary">{plan.name}</h3>
                  <p className="mt-2 text-caption text-text-tertiary">{plan.description}</p>

                  <p className="mt-6">
                    <span className="text-h1 font-bold text-text-primary tabular-nums">${plan.price}</span>
                    <span className="text-body-sm text-text-tertiary">/month</span>
                  </p>

                  <Link
                    href="/auth/login"
                    className={`mt-8 block w-full rounded-sm py-3.5 text-center text-body-sm font-medium transition-all ${
                      plan.highlighted
                        ? " bg-brand text-white hover:bg-brand-hover"
                        : "border border-border text-text-primary hover:bg-bg-tertiary hover:border-border-hover"
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  <ul className="mt-8 space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-3 text-body-sm text-text-secondary">
                        <IconCheck className="h-4 w-4 shrink-0 text-brand" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* FINAL CTA */}
      {/* ================================================================= */}
      <section className="py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="reveal border-t border-b border-border py-20 text-center">
            <div className="relative z-10">
              <h2 className="text-h1 font-bold text-text-primary">
                Stop guessing.{" "}
                <span className="text-accent">Start getting cited.</span>
              </h2>
              <p className="mt-5 text-body-lg text-text-secondary mx-auto max-w-xl">
                Join the beta and discover exactly where your content stands in the
                AI answer-engine landscape.
              </p>
              <Link
                href="/auth/login"
                className=" mt-10 inline-flex items-center gap-2 rounded-sm bg-brand px-8 py-4 text-body font-medium text-white  transition-all hover:bg-brand-hover"
              >
                Start Your 14-Day Free Trial
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-5 text-caption text-text-tertiary">
                No credit card required. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer is in layout.tsx */}
    </main>
  );
}
