"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureStripeCustomer, removeAutopayCard } from "@/lib/autopay";
import { getSettings } from "@/lib/content";
import { db } from "@/lib/db";
import { stripe, stripeConfigured, returnBaseUrl } from "@/lib/stripe";
import { requireTenant } from "@/lib/tenant/session";

export type AutopayState = { status: "idle" | "info" | "error" | "ok" | "checkout"; message: string; clientSecret?: string; publishableKey?: string };

const AUTHORIZATION =
  "By saving this card you authorize A&L Self Storage to charge it each month for the rent and fees you owe, until you turn automatic payments off.";

// Opens Stripe's card form so the customer can save a card for automatic payments. The card goes straight to
// Stripe; the card is only attached to their account when Stripe's signed webhook confirms it.
export async function startAutopaySetupAction(): Promise<AutopayState> {
  const tenant = await requireTenant();
  const settings = await getSettings();
  if (!stripeConfigured()) {
    return { status: "info", message: `Automatic payments aren't switched on yet. Please call the office at ${settings.phone}.` };
  }

  const host = (await headers()).get("host");
  const base = returnBaseUrl(host ? `${host.startsWith("localhost") ? "http" : "https"}://${host}` : "");
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const popup = Boolean(publishableKey?.startsWith("pk_"));
  let url: string | null = null;
  let clientSecret: string | null = null;
  try {
    const stripeCustomerId = await ensureStripeCustomer(tenant.id, tenant.fullName);
    const session = await stripe().checkout.sessions.create({
      ...(popup
        ? { ui_mode: "embedded_page" as const, redirect_on_completion: "never" as const }
        : { success_url: `${base}/billing_accounts?saved=1`, cancel_url: `${base}/billing_accounts` }),
      mode: "setup",
      currency: "usd",
      customer: stripeCustomerId,
      client_reference_id: String(tenant.id),
      metadata: { customer_id: String(tenant.id) },
      custom_text: { submit: { message: AUTHORIZATION } },
    });
    url = session.url;
    clientSecret = session.client_secret;
  } catch (error) {
    console.error("Stripe card setup failed:", error instanceof Error ? error.message : error);
  }
  if (popup && clientSecret) return { status: "checkout", message: "", clientSecret, publishableKey };
  if (!url) return { status: "error", message: `Sorry, we couldn't start that. Please try again or call the office at ${settings.phone}.` };
  redirect(url);
}

// Turns automatic payments on or off without removing the saved card.
export async function setAutopayEnabledAction(data: FormData) {
  const tenant = await requireTenant();
  const on = String(data.get("enabled") ?? "") === "yes";
  const { data: row } = await db().from("customers").select("autopay_payment_method").eq("id", tenant.id).maybeSingle();
  if (on && !row?.autopay_payment_method) return;
  await db()
    .from("customers")
    .update({ autopay_enabled: on, autopay_failures: 0, autopay_last_error: "", updated_at: new Date().toISOString() })
    .eq("id", tenant.id);
  revalidatePath("/billing_accounts");
}

export async function removePaymentAccountAction() {
  const tenant = await requireTenant();
  await removeAutopayCard(tenant.id);
  revalidatePath("/billing_accounts");
}
