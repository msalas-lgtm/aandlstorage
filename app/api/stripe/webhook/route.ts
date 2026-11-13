import type Stripe from "stripe";
import { applyPayment, money } from "@/lib/billing";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { stripe, stripeConfigured } from "@/lib/stripe";

// Stripe calls this after a customer pays. It is the only place an online card payment is recorded.
// Every call is checked against STRIPE_WEBHOOK_SECRET, so nobody else can fake a payment.
export async function POST(request: Request) {
  if (!stripeConfigured()) return new Response("Stripe is not set up", { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    // The signature covers the exact raw body, so read it as text and do not parse it first.
    event = stripe().webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "payment" && session.payment_status === "paid") {
      const customerId = Number(session.client_reference_id);
      const cents = session.amount_total ?? 0;
      if (!Number.isInteger(customerId) || customerId <= 0 || cents <= 0 || session.currency !== "usd") {
        console.error("Stripe webhook: ignored a session with unusable details", session.id);
        return new Response("ok");
      }

      const { data: customer } = await db().from("customers").select("full_name").eq("id", customerId).maybeSingle();
      if (!customer) {
        console.error("Stripe webhook: unknown customer for session", session.id);
        return new Response("ok");
      }

      const intent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? "");
      const result = await applyPayment(customerId, cents, "card", intent ? `Stripe ${intent}` : "Stripe", { sessionId: session.id, paymentIntent: intent });
      // A failure here returns 500 so Stripe tries again later; nothing is lost.
      if (result.error) {
        console.error("Stripe webhook: couldn't record payment", session.id, result.error);
        return new Response("Could not record payment", { status: 500 });
      }
      if (!result.duplicate) {
        await sendEmail({
          subject: `Online payment received: ${money(cents)} (${customer.full_name})`,
          text: `${customer.full_name} paid ${money(cents)} by card online.\n\nIt was applied to their account automatically. See Admin > Customers.`,
        });
      }
    }
  }

  return new Response("ok");
}
