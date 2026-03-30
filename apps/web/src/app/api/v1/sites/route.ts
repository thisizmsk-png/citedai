import { NextRequest, NextResponse } from "next/server";

/**
 * POST /v1/sites - Add a site to monitor
 * GET  /v1/sites - List user's sites
 */

export async function GET(_request: NextRequest) {
  // TODO: Auth middleware, fetch user sites from DB
  return NextResponse.json({
    data: [],
    pagination: { cursor: null, hasMore: false, total: 0 },
  });
}

export async function POST(request: NextRequest) {
  // TODO: Auth middleware, validate domain, create site, generate verification token
  const body = await request.json();
  const { domain } = body;

  if (!domain) {
    return NextResponse.json(
      { error: { code: "MISSING_DOMAIN", message: "domain is required" } },
      { status: 400 },
    );
  }

  // Stub response
  return NextResponse.json(
    {
      data: {
        id: "site_stub",
        domain,
        verified: false,
        verificationMethod: "dns",
        verificationToken: `citedai-verify=stub_${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
    },
    { status: 201 },
  );
}
