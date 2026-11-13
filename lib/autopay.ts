import "server-only";
import { applyPayment, getBilling, money } from "@/lib/billing";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { stripe } from "@/lib/stripe";

// Recurring billing: a customer saves a card with Stripe (the card form is Stripe's, so we never see the number),
// and each day the billing job charges the amount they owe. Everything is recorded like any other payment.

const MAX_FAILURES = 3; // after this many declined attempts in a row autopay switches itself off
const MIN_CENTS = 50; // Stripe's minimum charge

const today = () => new Date().toISOString().slice(0, 10);

export async function ensureStripeCustomer(customerId: number, name: string) {
  const { data } = await db().from("customers").select("stripe_customer_id").eq("id", customerId).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id as string;
  const created = await stripe().customers.create(
    { name, metadata: { customer_id: String(customerId) } },
    { idempotencyKey: `stripe-customer-${customerId}` },
  );
  await db().from("customers").update({ stripe_customer_id: created.id }).eq("id", customerId);
  return created.id;
}

// Called when Stripe confirms a card was saved: remembers which card, and switches autopay on.
export async function saveAutopayCard(customerId: number, stripeCustomerId: string, paymentMethodId: string) {
  const method = await stripe().paymentMethods.retrieve(paymentMethodId);
  const owner = typeof method.customer === "string" ? method.customer : method.customer?.id;
  if (owner !== stripeCustomerId || !method.card) throw new Error("That card doesn't belong to this customer.");

  const client = db();
  const { data: before } = await client.from("customers").select("autopay_payment_method").eq("id", customerId).maybeSingle();
  await stripe().customers.update(stripeCustomerId, { invoice_settings: { default_payment_method: paymentMethodId } });
  await client
    .from("customers")
    .update({
      autopay_payment_method: paymentMethodId,
      autopay_brand: method.card.brand,
      autopay_last4: method.card.last4,
      autopay_enabled: true,
      autopay_failures: 0,
      autopay_last_error: "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);
  // Replacing a card removes the old one from Stripe.
  const old = before?.autopay_payment_method as string | null | undefined;
  if (old && old !== paymentMethodId) await stripe().paymentMethods.detach(old).catch(() => null);
}

export async function removeAutopayCard(customerId: number) {
  const client = db();
  const { data } = await client.from("customers").select("autopay_payment_method").eq("id", customerId).maybeSingle();
  if (data?.autopay_payment_method) await stripe().paymentMethods.detach(data.autopay_payment_method).catch(() => null);
  await client
    .from("customers")
    .update({ autopay_payment_method: null, autopay_brand: "", autopay_last4: "", autopay_enabled: false, autopay_failures: 0, autopay_last_error: "", updated_at: new Date().toISOString() })
    .eq("id", customerId);
}

type AutopayCustomer = { id: number; full_name: string; stripe_customer_id: string; autopay_payment_method: string; autopay_failures: number };
export type AutopayResult = "charged" | "nothing due" | "declined" | "error";

// Charges one customer what they owe. A repeat run on the same day for the same amount is safe: Stripe returns
// the same payment and the payment is only recorded once.
export async function chargeAutopayCustomer(customer: AutopayCustomer): Promise<{ result: AutopayResult; cents: number }> {
  const client = db();
  const billing = await getBilling(customer.id);
  const cents = billing.amountDueCents;
  if (cents < MIN_CENTS) {
    await client.from("customers").update({ autopay_last_attempt: today() }).eq("id", customer.id);
    return { result: "nothing due", cents: 0 };
  }

  let failure = "";
  try {
    const intent = await stripe().paymentIntents.create(
      {
        amount: cents,
        currency: "usd",
        customer: customer.stripe_customer_id,
        payment_method: customer.autopay_payment_method,
        off_session: true,
        confirm: true,
        description: "A&L Self Storage autopay",
        metadata: { customer_id: String(customer.id), autopay: "1" },
      },
      { idempotencyKey: `autopay-${customer.id}-${today()}-${cents}` },
    );
    if (intent.status === "succeeded") {
      const recorded = await applyPayment(customer.id, cents, "card", "Autopay", { sessionId: intent.id, paymentIntent: intent.id });
      if (recorded.error) {
        // The card was charged but we couldn't save it: tell the office so it can be added by hand.
        console.error("Autopay charged but not recorded", intent.id, recorded.error);
        await sendEmail({ subject: `ACTION NEEDED: autopay charged but not recorded (${customer.full_name})`, text: `${money(cents)} was charged to ${customer.full_name} (Stripe ${intent.id}) but couldn't be saved to their account: ${recorded.error}\n\nRecord the payment by hand in Admin > Customers.` });
        return { result: "error", cents };
      }
      await client.from("customers").update({ autopay_failures: 0, autopay_last_error: "", autopay_last_attempt: today() }).eq("id", customer.id);
      return { result: "charged", cents };
    }
    failure = `Payment needs more action (${intent.status}).`;
  } catch (error) {
    failure = error instanceof Error ? error.message : "The payment didn't go through.";
  }

  const failures = customer.autopay_failures + 1;
  const switchedOff = failures >= MAX_FAILURES;
  await client
    .from("customers")
    .update({ autopay_failures: failures, autopay_last_error: failure.slice(0, 300), autopay_last_attempt: today(), ...(switchedOff ? { autopay_enabled: false } : {}) })
    .eq("id", customer.id);
  await sendEmail({
    subject: `Autopay didn't go through: ${customer.full_name} (${money(cents)})`,
    text: `We couldn't charge ${customer.full_name} ${money(cents)} by autopay.\n\nReason: ${failure}\nAttempt ${failures} of ${MAX_FAILURES}.${switchedOff ? "\n\nAutopay has been switched off for this customer until they add a card again." : ""}`,
  });
  return { result: "declined", cents };
}

// Charges every customer with autopay on who owes money and hasn't been tried today.
export async function runAutopay() {
  const { data } = await db()
    .from("customers")
    .select("id,full_name,stripe_customer_id,autopay_payment_method,autopay_failures,autopay_last_attempt")
    .eq("autopay_enabled", true)
    .eq("archived", false)
    .not("stripe_customer_id", "is", null)
    .not("autopay_payment_method", "is", null);
  const summary = { charged: 0, chargedCents: 0, declined: 0, nothingDue: 0, errors: 0, skippedToday: 0 };
  for (const customer of (data ?? []) as (AutopayCustomer & { autopay_last_attempt: string | null })[]) {
    if (customer.autopay_last_attempt === today()) {
      summary.skippedToday += 1;
      continue;
    }
    const { result, cents } = await chargeAutopayCustomer(customer);
    if (result === "charged") {
      summary.charged += 1;
      summary.chargedCents += cents;
    } else if (result === "declined") summary.declined += 1;
    else if (result === "error") summary.errors += 1;
    else summary.nothingDue += 1;
  }
  return summary;
}
