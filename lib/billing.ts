import "server-only";
import { db } from "@/lib/db";

// Billing model:
//  - A charge (rent, fee, ...) is a ledger entry. Its amount plus tax is what is owed; paid_cents is what has been paid.
//  - A payment pays the oldest unpaid charges first. Credit on the account is applied first, and any
//    amount left over (or not enough to pay a charge in full) is added to the credit.
//  - Balance = what is outstanding minus the credit.

export type Charge = {
  id: number;
  date: string;
  item: string;
  description: string;
  amountCents: number;
  taxCents: number;
  paidCents: number;
  dueCents: number;
  rentalId: number | null;
};

export type Billing = {
  charges: Charge[]; // charges that still have an amount due, oldest first
  outstandingCents: number;
  creditCents: number;
  balanceCents: number; // outstanding minus credit (negative means the customer is in credit)
  amountDueCents: number; // what they still need to pay after credit is applied
};

type LedgerRow = {
  id: number;
  entry_date: string;
  item: string;
  description: string;
  amount_cents: number;
  tax_cents: number;
  paid_cents: number;
  rental_id: number | null;
};

export function summarize(rows: LedgerRow[], creditCents: number): Billing {
  const charges = rows
    .map((row) => ({
      id: row.id,
      date: row.entry_date,
      item: row.item,
      description: row.description,
      amountCents: row.amount_cents,
      taxCents: row.tax_cents,
      paidCents: row.paid_cents,
      dueCents: row.amount_cents + row.tax_cents - row.paid_cents,
      rentalId: row.rental_id,
    }))
    .filter((charge) => charge.dueCents > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const outstandingCents = charges.reduce((sum, charge) => sum + charge.dueCents, 0);
  return {
    charges,
    outstandingCents,
    creditCents,
    balanceCents: outstandingCents - creditCents,
    amountDueCents: Math.max(0, outstandingCents - creditCents),
  };
}

export async function getBilling(customerId: number): Promise<Billing> {
  const client = db();
  const [{ data: rows }, { data: customer }] = await Promise.all([
    client.from("ledger_entries").select("*").eq("customer_id", customerId),
    client.from("customers").select("credit_cents").eq("id", customerId).maybeSingle(),
  ]);
  return summarize((rows ?? []) as LedgerRow[], customer?.credit_cents ?? 0);
}

export async function addCharge(
  customerId: number,
  charge: { item: string; description?: string; amountCents: number; taxCents?: number; date?: string; rentalId?: number | null; kind?: string },
) {
  return db().from("ledger_entries").insert({
    customer_id: customerId,
    rental_id: charge.rentalId ?? null,
    entry_date: charge.date ?? new Date().toISOString().slice(0, 10),
    item: charge.item,
    description: charge.description ?? "",
    amount_cents: charge.amountCents,
    tax_cents: charge.taxCents ?? 0,
    kind: charge.kind ?? "other",
  });
}

// Records a payment and applies it: credit first, then the oldest charges, then any leftover becomes credit.
// For Stripe payments, `stripe` carries the Checkout session id: a unique index makes a repeated confirmation a no-op (duplicate: true).
export async function applyPayment(
  customerId: number,
  amountCents: number,
  method: string,
  note = "",
  stripe?: { sessionId: string; paymentIntent: string },
) {
  const client = db();
  const { error } = await client.from("payments").insert({
    customer_id: customerId,
    amount_cents: amountCents,
    method,
    note,
    ...(stripe ? { stripe_session_id: stripe.sessionId, stripe_payment_intent: stripe.paymentIntent } : {}),
  });
  if (error) return stripe && error.code === "23505" ? { error: null, duplicate: true } : { error: error.message, duplicate: false };

  const { data: customer } = await client.from("customers").select("credit_cents").eq("id", customerId).maybeSingle();
  const { data: rows } = await client.from("ledger_entries").select("*").eq("customer_id", customerId);
  const billing = summarize((rows ?? []) as LedgerRow[], 0);

  let available = (customer?.credit_cents ?? 0) + amountCents;
  for (const charge of billing.charges) {
    if (available <= 0) break;
    const pay = Math.min(charge.dueCents, available);
    await client.from("ledger_entries").update({ paid_cents: charge.paidCents + pay }).eq("id", charge.id);
    available -= pay;
  }
  await client.from("customers").update({ credit_cents: available, updated_at: new Date().toISOString() }).eq("id", customerId);
  return { error: null, duplicate: false };
}

// Removes a charge. Whatever was already paid toward it goes back to the customer as credit.
export async function voidCharge(chargeId: number) {
  const client = db();
  const { data: entry } = await client.from("ledger_entries").select("customer_id,paid_cents").eq("id", chargeId).maybeSingle();
  if (!entry) return;
  if (entry.paid_cents > 0) {
    const { data: customer } = await client.from("customers").select("credit_cents").eq("id", entry.customer_id).maybeSingle();
    await client.from("customers").update({ credit_cents: (customer?.credit_cents ?? 0) + entry.paid_cents }).eq("id", entry.customer_id);
  }
  await client.from("ledger_entries").delete().eq("id", chargeId);
}

export const money = (cents: number) =>
  `${cents < 0 ? "-" : ""}$${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
