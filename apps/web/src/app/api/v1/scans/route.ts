import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, sites, scans, users } from "@citedai/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { PLAN_LIMITS } from "@citedai/shared";
import type { Plan } from "@citedai/shared";
import { crawlQueue } from "@/lib/queue";

/**
 * POST /v1/scans — Initiate a site scan.
 *
 * Body: { siteId: string, maxPages?: number }
 *
 * 1. Authenticate user
 * 2. Verify site ownership
 * 3. Check plan limits (concurrent scans, scan frequency)
 * 4. Create scan record in DB
 * 5. Enqueue BullMQ crawl job
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

    const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
    const requestedMaxPages =
      typeof body.maxPages === "number" && body.maxPages > 0
        ? Math.floor(body.maxPages)
        : undefined;

    if (!siteId) {
      return NextResponse.json(
        { error: { code: "MISSING_SITE_ID", message: "siteId is required" } },
        { status: 400 },
      );
    }

    // Verify site ownership
    const [site] = await db
      .select()
      .from(sites)
      .where(and(eq(sites.id, siteId), eq(sites.userId, user.id)))
      .limit(1);

    if (!site) {
      return NextResponse.json(
        { error: { code: "SITE_NOT_FOUND", message: "Site not found or you do not own it" } },
        { status: 404 },
      );
    }

    // Fetch user plan
    const [userRecord] = await db
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const plan: Plan = userRecord?.plan ?? "starter";
    const limits = PLAN_LIMITS[plan];

    // Cap maxPages to plan limit
    const maxPages = Math.min(requestedMaxPages ?? site.maxPages, limits.maxPagesPerScan);

    // Check for already running scans on this site
    const [activeScan] = await db
      .select({ id: scans.id })
      .from(scans)
      .where(
        and(
          eq(scans.siteId, siteId),
          sql`${scans.status} IN ('queued', 'crawling', 'scoring')`,
        ),
      )
      .limit(1);

    if (activeScan) {
      return NextResponse.json(
        {
          error: {
            code: "SCAN_IN_PROGRESS",
            message: "A scan is already running for this site. Wait for it to complete.",
          },
        },
        { status: 409 },
      );
    }

    // Check scan frequency limit (prevent scanning more often than plan allows)
    if (site.lastScannedAt) {
      const minIntervalMs =
        limits.scanFrequency === "daily" ? 23 * 60 * 60 * 1000 : 6 * 24 * 60 * 60 * 1000;
      const timeSinceLastScan = Date.now() - new Date(site.lastScannedAt).getTime();

      if (timeSinceLastScan < minIntervalMs) {
        const nextAvailable = new Date(
          new Date(site.lastScannedAt).getTime() + minIntervalMs,
        ).toISOString();
        return NextResponse.json(
          {
            error: {
              code: "SCAN_FREQUENCY_LIMIT",
              message: `Your ${plan} plan allows ${limits.scanFrequency} scans. Next scan available after ${nextAvailable}.`,
            },
          },
          { status: 429 },
        );
      }
    }

    // Create scan record
    const [scan] = await db
      .insert(scans)
      .values({
        siteId,
        status: "queued",
        pagesCrawled: 0,
        pagesTotal: maxPages,
      })
      .returning();

    // Enqueue BullMQ job
    await crawlQueue.add(
      `crawl-${site.domain}`,
      {
        scanId: scan.id,
        siteId: site.id,
        domain: site.domain,
        maxPages,
        userId: user.id,
      },
      {
        jobId: scan.id,
        priority: plan === "agency" ? 1 : plan === "pro" ? 2 : 3,
      },
    );

    return NextResponse.json(
      {
        data: {
          id: scan.id,
          siteId: scan.siteId,
          status: scan.status,
          maxPages,
          createdAt: scan.createdAt,
        },
      },
      { status: 202 },
    );
  } catch (err: unknown) {
    console.error("[scans] POST error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 },
    );
  }
}
