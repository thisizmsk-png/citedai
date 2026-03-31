import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, users } from "@citedai/db";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import type { Plan } from "@citedai/shared";

// ---------------------------------------------------------------------------
// Stripe client
// ---------------------------------------------------------------------------

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
}); }

// ---------------------------------------------------------------------------
// Price IDs — replace with real Stripe price IDs after creating products
// ---------------------------------------------------------------------------

const PRICE_IDS: Record<Plan, { monthly: string; yearly: string }> = {
  starter: {
    monthly: "price_starter_monthly",
    yearly: "price_starter_yearly",
  },
  pro: {
    monthly: "price_pro_monthly",
    yearly: "price_pro_yearly",
  },
  agency: {
    monthly: "price_agency_monthly",
    yearly: "price_agency_yearly",
  },
};

// ---------------------------------------------------------------------------
// POST /v1/billing/checkout — Create a Stripe Checkout session
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

    const plan = body.plan as string | undefined;
    const interval = body.interval as string | undefined;

    if (!plan || !["starter", "pro", "agency"].includes(plan)) {
      return NextResponse.json(
        { error: { code: "INVALID_PLAN", message: "plan must be one of: starter, pro, agency" } },
        { status: 400 },
      );
    }

    if (!interval || !["monthly", "yearly"].includes(interval)) {
      return NextResponse.json(
        { error: { code: "INVALID_INTERVAL", message: "interval must be one of: monthly, yearly" } },
        { status: 400 },
      );
    }

    const priceId = PRICE_IDS[plan as Plan][interval as "monthly" | "yearly"];

    // Fetch or create Stripe customer
    const [userRecord] = await db
      .select({ stripeCustomerId: users.stripeCustomerId, email: users.email })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    let customerId = userRecord?.stripeCustomerId;

    if (!customerId) {
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

    // Create Checkout session
    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/billing`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
        },
      },
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
    });

    return NextResponse.json({ data: { url: session.url } });
  } catch (err: unknown) {
    console.error("[billing/checkout] POST error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 },
    );
  }
}
