import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CitedAI - Get Cited by AI Answer Engines",
  description:
    "Score your content for AI-citability. Get actionable recommendations to appear in ChatGPT, Perplexity, and Google AI Overviews.",
};

/* -----------------------------------------------------------------------
   Logo
   ----------------------------------------------------------------------- */
function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="8" fill="url(#logo-gradient)" />
      <path d="M8 14.5C8 10.9 10.9 8 14.5 8c2.2 0 4.1 1.1 5.3 2.7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="14.5" cy="14.5" r="3" fill="#fff" />
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0a0a0c" />
          <stop offset="1" stopColor="#2a2a2e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* -----------------------------------------------------------------------
   Header — Sticky, translucent, minimal (Linear/Vercel pattern)
   ----------------------------------------------------------------------- */
function Header() {
  return (
    <header className="glass fixed top-0 z-50 w-full border-b border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-h5 font-semibold text-text-primary tracking-tight">
            Cited<span className="text-brand">AI</span>
          </span>
        </Link>

        {/* Center links (3-5 max) */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/" className="text-body-sm text-text-secondary transition-colors hover:text-text-primary">
            Features
          </Link>
          <Link href="/#pricing" className="text-body-sm text-text-secondary transition-colors hover:text-text-primary">
            Pricing
          </Link>
          <Link href="/dashboard" className="text-body-sm text-text-secondary transition-colors hover:text-text-primary">
            Dashboard
          </Link>
        </nav>

        {/* Right CTA cluster */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-body-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            Sign in
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg bg-brand px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

/* -----------------------------------------------------------------------
   Footer — 4-col with logo (Linear/Stripe pattern)
   ----------------------------------------------------------------------- */
function Footer() {
  return (
    <footer className="border-t border-border bg-bg-primary">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo />
              <span className="text-h5 font-semibold text-text-primary tracking-tight">
                Cited<span className="text-brand">AI</span>
              </span>
            </Link>
            <p className="mt-4 text-body-sm text-text-secondary max-w-xs">
              Get your content cited by AI answer engines. Score, fix, and monitor your AI visibility.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-tiny font-medium uppercase tracking-wide text-text-tertiary">Product</h4>
            <ul className="mt-4 space-y-3">
              <li><Link href="/" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Free Scanner</Link></li>
              <li><Link href="/dashboard" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Dashboard</Link></li>
              <li><Link href="/#pricing" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">API</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-tiny font-medium uppercase tracking-wide text-text-tertiary">Resources</h4>
            <ul className="mt-4 space-y-3">
              <li><Link href="/" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Documentation</Link></li>
              <li><Link href="/" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Blog</Link></li>
              <li><Link href="/" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Changelog</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-tiny font-medium uppercase tracking-wide text-text-tertiary">Company</h4>
            <ul className="mt-4 space-y-3">
              <li><Link href="/" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">About</Link></li>
              <li><Link href="/" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Privacy</Link></li>
              <li><Link href="/" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-caption text-text-tertiary">
            &copy; {new Date().getFullYear()} CitedAI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-caption text-text-tertiary hover:text-text-secondary transition-colors">Twitter</Link>
            <Link href="/" className="text-caption text-text-tertiary hover:text-text-secondary transition-colors">GitHub</Link>
            <Link href="/" className="text-caption text-text-tertiary hover:text-text-secondary transition-colors">Discord</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* -----------------------------------------------------------------------
   Root Layout
   ----------------------------------------------------------------------- */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased font-sans">
        <Header />
        <div className="pt-16">{/* offset for fixed header */}
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
