import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, users } from "@citedai/db";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Stripe client
// ---------------------------------------------------------------------------

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
}); }

// ---------------------------------------------------------------------------
// POST /v1/billing/portal — Create a Stripe Customer Portal session
// ---------------------------------------------------------------------------

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

    // Get user's Stripe customer ID
    const [userRecord] = await db
      .select({ stripeCustomerId: users.stripeCustomerId, email: users.email })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    let customerId = userRecord?.stripeCustomerId;

    if (!customerId) {
      // Create a Stripe customer if one doesn't exist yet
      const customer = await getStripe().customers.create({
        email: userRecord?.email ?? user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await db
        .update(users)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/billing`,
    });

    return NextResponse.json({ data: { url: portalSession.url } });
  } catch (err: unknown) {
    console.error("[billing/portal] POST error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 },
    );
  }
}
