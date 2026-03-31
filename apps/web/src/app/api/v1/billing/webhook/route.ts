import { NextRequest, NextResponse } from "next/server";
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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// ---------------------------------------------------------------------------
// Plan mapping from Stripe price IDs
// ---------------------------------------------------------------------------

const PRICE_TO_PLAN: Record<string, Plan> = {
  price_starter_monthly: "starter",
  price_starter_yearly: "starter",
  price_pro_monthly: "pro",
  price_pro_yearly: "pro",
  price_agency_monthly: "agency",
  price_agency_yearly: "agency",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function planFromSubscription(subscription: Stripe.Subscription): Plan {
  // Check subscription metadata first
  const metaPlan = subscription.metadata?.plan as Plan | undefined;
  if (metaPlan && ["starter", "pro", "agency"].includes(metaPlan)) {
    return metaPlan;
  }

  // Fall back to price ID lookup
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId && PRICE_TO_PLAN[priceId]) {
    return PRICE_TO_PLAN[priceId];
  }

  return "starter";
}

async function updateUserPlan(
  stripeCustomerId: string,
  plan: Plan,
  subscriptionId: string | null,
) {
  await db
    .update(users)
    .set({
      plan,
      stripeSubscriptionId: subscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(users.stripeCustomerId, stripeCustomerId));
}

async function updateUserBySupabaseId(
  supabaseUserId: string,
  plan: Plan,
  stripeCustomerId: string,
  subscriptionId: string | null,
) {
  await db
    .update(users)
    .set({
      plan,
      stripeCustomerId,
      stripeSubscriptionId: subscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, supabaseUserId));
}

// ---------------------------------------------------------------------------
// POST /v1/billing/webhook — Stripe webhook handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: { code: "MISSING_SIGNATURE", message: "Missing stripe-signature header" } },
        { status: 400 },
      );
    }

    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("[billing/webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: { code: "INVALID_SIGNATURE", message } },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      // -----------------------------------------------------------------
      // Checkout completed — new subscription created
      // -----------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription" || !session.subscription) {
          break;
        }

        const subscription = await getStripe().subscriptions.retrieve(
          session.subscription as string,
        );
        const plan = planFromSubscription(subscription);
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? "";

        // Try metadata-based user lookup first, then fall back to customer ID
        const supabaseUserId = session.metadata?.supabase_user_id;

        if (supabaseUserId) {
          await updateUserBySupabaseId(
            supabaseUserId,
            plan,
            customerId,
            subscription.id,
          );
        } else if (customerId) {
          await updateUserPlan(customerId, plan, subscription.id);
        }

        console.log(
          `[billing/webhook] checkout.session.completed: customer=${customerId} plan=${plan}`,
        );
        break;
      }

      // -----------------------------------------------------------------
      // Subscription updated — plan change, renewal, etc.
      // -----------------------------------------------------------------
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const plan = planFromSubscription(subscription);
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? "";

        // Only update plan if subscription is active or trialing
        if (["active", "trialing"].includes(subscription.status)) {
          await updateUserPlan(customerId, plan, subscription.id);
          console.log(
            `[billing/webhook] subscription.updated: customer=${customerId} plan=${plan} status=${subscription.status}`,
          );
        }
        break;
      }

      // -----------------------------------------------------------------
      // Subscription deleted — downgrade to starter
      // -----------------------------------------------------------------
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? "";

        await updateUserPlan(customerId, "starter", null);
        console.log(
          `[billing/webhook] subscription.deleted: customer=${customerId} downgraded to starter`,
        );
        break;
      }

      default: {
        // Unhandled event type — acknowledge receipt
        console.log(`[billing/webhook] Unhandled event type: ${event.type}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("[billing/webhook] Processing error:", err);
    return NextResponse.json(
      { error: { code: "WEBHOOK_PROCESSING_ERROR", message: "Failed to process webhook event" } },
      { status: 500 },
    );
  }
}
