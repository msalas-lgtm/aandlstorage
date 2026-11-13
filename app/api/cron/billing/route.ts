import { timingSafeEqual } from "node:crypto";
import { runAutopay } from "@/lib/autopay";
import { runRentBilling } from "@/lib/billing-run";
import { stripeConfigured } from "@/lib/stripe";

// The daily billing job. Each day it (1) adds this month's rent charge to every active rental that doesn't have
// one yet, then (2) charges the saved card of every customer with automatic payments on who owes money.
// Safe to run more than once a day: a rental never gets two rent charges for a month, and a customer is only
// charged once a day. Nothing is emailed to customers; the office is emailed if a card is declined.
//
// Protected by CRON_SECRET: the caller must send "Authorization: Bearer <CRON_SECRET>" (Vercel Cron does this by itself).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return new Response("CRON_SECRET is not set", { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response("Unauthorized", { status: 401 });

  const month = new Date().toISOString().slice(0, 7);
  const rent = await runRentBilling(month);
  const autopay = stripeConfigured() ? await runAutopay() : null;
  return Response.json({ month, rent, autopay });
}
