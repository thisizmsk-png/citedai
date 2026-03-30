import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for use in Client Components ("use client").
 *
 * Uses NEXT_PUBLIC_ env vars so the values are available in the browser bundle.
 * This is a singleton-safe factory — @supabase/ssr deduplicates internally.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
