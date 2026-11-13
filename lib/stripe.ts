import "server-only";
import Stripe from "stripe";

// Card payments use Stripe Checkout: the customer types their card on Stripe's own page, so card numbers
// never reach this server (and never touch our database or logs). We only store the amount and Stripe's ids.
export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

let client: Stripe | null = null;

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  client ??= new Stripe(key);
  return client;
}

// Where Stripe sends the customer back to. Set SITE_URL to the public address (for example https://www.aandlstorage.com).
export function returnBaseUrl(fallback: string) {
  return (process.env.SITE_URL || fallback).replace(/\/$/, "");
}
