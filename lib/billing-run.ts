import "server-only";
import { db } from "@/lib/db";

// Monthly Billing: creates each month's rent charge for every active, confirmed rental (once per month),
// and adds late fees to charges that are overdue under the Late/Lien rules (once per charge and rule).
// Nothing here emails or texts anyone: it only adds charges to customer accounts.

export type RentDue = {
  rentalId: number;
  customerId: number;
  customerName: string;
  unitName: string;
  rentCents: number;
};

export const monthBounds = (month: string) => {
  // month is "YYYY-MM"
  const [year, mon] = month.split("-").map(Number);
  const start = `${year}-${String(mon).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const end = `${year}-${String(mon).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  const label = new Date(Date.UTC(year, mon - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, label };
};

// Rentals that still need this month's rent charge.
export async function rentDueForMonth(month: string): Promise<RentDue[]> {
  const client = db();
  const { start, end } = monthBounds(month);
  const { data: rentals } = await client
    .from("rentals")
    .select("id,customer_id,unit_name,monthly_rent_cents,started_on,customers(full_name,archived)")
    .eq("confirmed", true)
    .is("ended_on", null)
    .lte("started_on", end);
  const { data: existing } = await client
    .from("ledger_entries")
    .select("rental_id")
    .eq("kind", "rent")
    .gte("entry_date", start)
    .lte("entry_date", end)
    .not("rental_id", "is", null);
  const billed = new Set((existing ?? []).map((entry) => entry.rental_id));

  return ((rentals ?? []) as unknown as {
    id: number;
    customer_id: number;
    unit_name: string;
    monthly_rent_cents: number;
    customers: { full_name: string; archived: boolean } | null;
  }[])
    .filter((rental) => !billed.has(rental.id) && !rental.customers?.archived && rental.monthly_rent_cents > 0)
    .map((rental) => ({
      rentalId: rental.id,
      customerId: rental.customer_id,
      customerName: rental.customers?.full_name ?? "Customer",
      unitName: rental.unit_name,
      rentCents: rental.monthly_rent_cents,
    }));
}

export async function runRentBilling(month: string) {
  const { start, label } = monthBounds(month);
  const due = await rentDueForMonth(month);
  if (due.length === 0) return { created: 0, totalCents: 0 };
  const rows = due.map((item) => ({
    customer_id: item.customerId,
    rental_id: item.rentalId,
    entry_date: start,
    item: "Rent",
    description: `Rent for ${label}, unit ${item.unitName}`,
    amount_cents: item.rentCents,
    kind: "rent",
  }));
  const { error } = await db().from("ledger_entries").insert(rows);
  if (error) throw new Error(`rent charges: ${error.message}`);
  return { created: rows.length, totalCents: due.reduce((sum, item) => sum + item.rentCents, 0) };
}

export type LateFeeDue = { chargeId: number; customerId: number; customerName: string; item: string; dueCents: number; days: number; rule: string; feeCents: number };

const daysBetween = (from: string, to: string) =>
  Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

// Overdue charges that have not yet been given the late fee for a rule.
export async function lateFeesDue(today: string): Promise<LateFeeDue[]> {
  const client = db();
  const [{ data: rules }, { data: entries }] = await Promise.all([
    client.from("late_rules").select("*").eq("active", true).gt("fee_cents", 0).order("days_past_due"),
    client.from("ledger_entries").select("id,customer_id,item,description,entry_date,amount_cents,tax_cents,paid_cents,kind,customers(full_name,archived)"),
  ]);
  if (!rules?.length) return [];
  const all = (entries ?? []) as unknown as {
    id: number; customer_id: number; item: string; description: string; entry_date: string;
    amount_cents: number; tax_cents: number; paid_cents: number; kind: string; customers: { full_name: string; archived: boolean } | null;
  }[];
  const existingFees = new Set(all.filter((entry) => entry.kind === "late_fee").map((entry) => entry.description));
  const due: LateFeeDue[] = [];
  for (const entry of all) {
    if (entry.kind === "late_fee" || entry.customers?.archived) continue;
    const owed = entry.amount_cents + entry.tax_cents - entry.paid_cents;
    if (owed <= 0) continue;
    const days = daysBetween(entry.entry_date, today);
    for (const rule of rules) {
      if (days < rule.days_past_due) continue;
      if (existingFees.has(lateFeeNote(entry.id, rule.id))) continue;
      due.push({ chargeId: entry.id, customerId: entry.customer_id, customerName: entry.customers?.full_name ?? "Customer", item: entry.item, dueCents: owed, days, rule: rule.name, feeCents: rule.fee_cents });
      (due[due.length - 1] as LateFeeDue & { ruleId?: number }).ruleId = rule.id;
    }
  }
  return due;
}

export const lateFeeNote = (chargeId: number, ruleId: number) => `Late fee for charge #${chargeId} (rule #${ruleId})`;

export async function applyLateFees(today: string) {
  const due = (await lateFeesDue(today)) as (LateFeeDue & { ruleId: number })[];
  if (due.length === 0) return { created: 0, totalCents: 0 };
  const rows = due.map((item) => ({
    customer_id: item.customerId,
    entry_date: today,
    item: "Late fee",
    description: lateFeeNote(item.chargeId, item.ruleId),
    amount_cents: item.feeCents,
    kind: "late_fee",
  }));
  const { error } = await db().from("ledger_entries").insert(rows);
  if (error) throw new Error(`late fees: ${error.message}`);
  return { created: rows.length, totalCents: due.reduce((sum, item) => sum + item.feeCents, 0) };
}
