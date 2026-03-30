"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="md:hidden p-2 text-text-primary"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 border-b border-border bg-bg-primary md:hidden z-40">
          <nav className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-3">
            <Link href="/#features" onClick={() => setOpen(false)} className="py-2 text-body-sm text-text-secondary hover:text-text-primary">Features</Link>
            <Link href="/#pricing" onClick={() => setOpen(false)} className="py-2 text-body-sm text-text-secondary hover:text-text-primary">Pricing</Link>
            <Link href="/dashboard" onClick={() => setOpen(false)} className="py-2 text-body-sm text-text-secondary hover:text-text-primary">Dashboard</Link>
            <div className="border-t border-border pt-3 flex flex-col gap-2">
              <Link href="/auth/login" onClick={() => setOpen(false)} className="py-2 text-body-sm text-text-secondary">Sign in</Link>
              <Link href="/auth/login" onClick={() => setOpen(false)} className="bg-brand py-2.5 text-center text-body-sm font-medium text-text-inverse">Get Started</Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
