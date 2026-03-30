import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, sites, users } from "@citedai/db";
import { eq, and } from "drizzle-orm";
import { PLAN_LIMITS } from "@citedai/shared";
import type { Plan } from "@citedai/shared";
import { randomUUID } from "node:crypto";

/**
 * GET /v1/sites — List the authenticated user's sites.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    const userSites = await db
      .select()
      .from(sites)
      .where(eq(sites.userId, user.id))
      .orderBy(sites.createdAt);

    return NextResponse.json({
      data: userSites,
      pagination: { cursor: null, hasMore: false, total: userSites.length },
    });
  } catch (err: unknown) {
    console.error("[sites] GET error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 },
    );
  }
}

/**
 * POST /v1/sites — Add a site to monitor.
 *
 * Body: { domain: string }
 * Returns the created site record with a verification token.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
        { status: 400 },
      );
    }

    const rawDomain = typeof body.domain === "string" ? body.domain.trim() : "";

    if (!rawDomain) {
      return NextResponse.json(
        { error: { code: "MISSING_DOMAIN", message: "domain is required" } },
        { status: 400 },
      );
    }

    // Normalize domain — extract hostname from a full URL or bare domain
    let domain: string;
    try {
      const withProtocol = rawDomain.startsWith("http") ? rawDomain : `https://${rawDomain}`;
      const parsed = new URL(withProtocol);
      domain = parsed.hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_DOMAIN", message: "Could not parse domain. Provide a valid URL or hostname." } },
        { status: 400 },
      );
    }

    if (!domain || domain.length < 3 || !domain.includes(".")) {
      return NextResponse.json(
        { error: { code: "INVALID_DOMAIN", message: "Domain must be a valid hostname (e.g. example.com)" } },
        { status: 400 },
      );
    }

    // Check plan limits
    const [userRecord] = await db
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const plan: Plan = userRecord?.plan ?? "starter";
    const limits = PLAN_LIMITS[plan];

    const existingSites = await db
      .select()
      .from(sites)
      .where(eq(sites.userId, user.id));

    if (existingSites.length >= limits.maxSites) {
      return NextResponse.json(
        {
          error: {
            code: "PLAN_LIMIT_REACHED",
            message: `Your ${plan} plan allows ${limits.maxSites} site(s). Upgrade to add more.`,
          },
        },
        { status: 403 },
      );
    }

    // Check if this domain already exists for this user
    const [existing] = await db
      .select()
      .from(sites)
      .where(and(eq(sites.userId, user.id), eq(sites.domain, domain)))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: { code: "DUPLICATE_SITE", message: `You already have ${domain} registered` } },
        { status: 409 },
      );
    }

    // Generate verification token
    const verificationToken = `citedai-verify=${randomUUID()}`;

    // Insert site
    const [newSite] = await db
      .insert(sites)
      .values({
        userId: user.id,
        domain,
        verified: false,
        verificationMethod: "dns",
        verificationToken,
        maxPages: limits.maxPagesPerScan,
        scanFrequency: limits.scanFrequency,
      })
      .returning();

    return NextResponse.json({ data: newSite }, { status: 201 });
  } catch (err: unknown) {
    console.error("[sites] POST error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 },
    );
  }
}
