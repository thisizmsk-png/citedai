import { NextRequest, NextResponse } from "next/server";

/**
 * POST /v1/scans - Initiate a site scan
 *
 * Validates plan limits, creates scan record, enqueues BullMQ job.
 */

export async function POST(request: NextRequest) {
  // TODO: Auth middleware, check plan limits, create scan, enqueue job
  const body = await request.json();
  const { siteId, maxPages } = body;

  if (!siteId) {
    return NextResponse.json(
      { error: { code: "MISSING_SITE_ID", message: "siteId is required" } },
      { status: 400 },
    );
  }

  // Stub response
  return NextResponse.json(
    {
      data: {
        id: "scan_stub",
        siteId,
        status: "queued",
        maxPages: maxPages ?? 100,
        createdAt: new Date().toISOString(),
      },
    },
    { status: 202 },
  );
}
