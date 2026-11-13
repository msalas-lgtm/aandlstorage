"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getBilling } from "@/lib/billing";
import { getSettings } from "@/lib/content";
import { stripe, stripeConfigured, returnBaseUrl } from "@/lib/stripe";
import { requireTenant } from "@/lib/tenant/session";

// "checkout" means the payment popup should open: it carries the Checkout session secret and the publishable key.
export type PayState = { status: "idle" | "info" | "error" | "checkout"; message: string; clientSecret?: string; publishableKey?: string };

const MIN_CENTS = 50; // Stripe's minimum charge

// Starts a Stripe Checkout payment. The customer comes from their signed-in session (never from the form),
// the amount is checked against what they actually owe, and the payment is only recorded later when Stripe's
// signed webhook confirms it (app/api/stripe/webhook/route.ts), never from the browser.
export async function proceedToPaymentAction(_prev: PayState, data: FormData): Promise<PayState> {
  const tenant = await requireTenant();
  const settings = await getSettings();

  const amount = Number(String(data.get("amount") ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "error", message: "Please enter the amount you want to pay." };
  }
  const cents = Math.round(amount * 100);

  if (!stripeConfigured()) {
    return {
      status: "info",
      message: `Online payments aren't switched on yet. To pay now, call the office at ${settings.phone} or stop by during office hours, and we'll record your payment right away.`,
    };
  }

  const billing = await getBilling(tenant.id);
  if (billing.amountDueCents <= 0) return { status: "error", message: "Nothing is due right now." };
  if (cents < MIN_CENTS) return { status: "error", message: "The smallest online payment is $0.50." };
  if (cents > billing.amountDueCents) {
    return { status: "error", message: "That is more than the amount due. Please enter the amount due or less." };
  }

  const host = (await headers()).get("host");
  const base = returnBaseUrl(host ? `${host.startsWith("localhost") ? "http" : "https"}://${host}` : "");
  // With STRIPE_PUBLISHABLE_KEY set, the card form opens in a popup on this page. Without it, Stripe's own page is used.
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const popup = Boolean(publishableKey?.startsWith("pk_"));
  let url: string | null = null;
  let clientSecret: string | null = null;
  try {
    const session = await stripe().checkout.sessions.create({
      ...(popup ? { ui_mode: "embedded_page" as const, redirect_on_completion: "never" as const } : { success_url: `${base}/statement?paid=1`, cancel_url: `${base}/statement?canceled=1` }),
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: cents,
            product_data: { name: "A&L Self Storage payment", description: `Account #${tenant.id}` },
          },
        },
      ],
      client_reference_id: String(tenant.id),
      metadata: { customer_id: String(tenant.id) },
      payment_intent_data: { metadata: { customer_id: String(tenant.id) } },
    });
    url = session.url;
    clientSecret = session.client_secret;
  } catch (error) {
    console.error("Stripe checkout failed:", error instanceof Error ? error.message : error);
  }
  if (popup && clientSecret) return { status: "checkout", message: "", clientSecret, publishableKey };
  if (!url) {
    return { status: "error", message: `Sorry, we couldn't start the payment. Please try again or call the office at ${settings.phone}.` };
  }
  redirect(url);
}
