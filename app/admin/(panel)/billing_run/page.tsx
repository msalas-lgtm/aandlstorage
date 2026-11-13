import { connection } from "next/server";
import { applyLateFeesAction, runAutopayAction, runRentBillingAction } from "../../actions";
import { db } from "@/lib/db";
import { AdminForm } from "../../AdminForm";
import { Card, DataTable, Notice, PageHeader } from "../../ui";
import { formatCents } from "@/lib/content";
import { lateFeesDue, monthBounds, rentDueForMonth } from "@/lib/billing-run";

export default async function MonthlyBillingPage({ searchParams }: PageProps<"/admin/billing_run">) {
  await connection();
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const month = typeof params.month === "string" && /^\d{4}-\d{2}$/.test(params.month) ? params.month : today.slice(0, 7);
  const { label } = monthBounds(month);
  const [rentDue, lateDue, autopayRows] = await Promise.all([
    rentDueForMonth(month),
    lateFeesDue(today),
    db()
      .from("customers")
      .select("full_name,autopay_brand,autopay_last4,credit_cents,ledger_entries(amount_cents,tax_cents,paid_cents)")
      .eq("autopay_enabled", true)
      .eq("archived", false)
      .order("full_name")
      .then((result) => (result.data ?? []) as unknown as { full_name: string; autopay_brand: string; autopay_last4: string; credit_cents: number; ledger_entries: { amount_cents: number; tax_cents: number; paid_cents: number }[] }[]),
  ]);
  const autopay = autopayRows.map((row) => ({
    name: row.full_name,
    card: `${row.autopay_brand || "card"} ${row.autopay_last4 ? `•••• ${row.autopay_last4}` : ""}`.trim(),
    dueCents: Math.max(0, row.ledger_entries.reduce((sum, entry) => sum + entry.amount_cents + entry.tax_cents - entry.paid_cents, 0) - row.credit_cents),
  }));
  const autopayTotal = autopay.reduce((sum, item) => sum + item.dueCents, 0);
  const rentTotal = rentDue.reduce((sum, item) => sum + item.rentCents, 0);
  const lateTotal = lateDue.reduce((sum, item) => sum + item.feeCents, 0);

  return (
    <>
      <PageHeader title="Monthly Billing" description="Creates rent charges for every active rental and adds late fees under your Late/Lien rules." />
      <Notice>
        This only adds charges to customer accounts, where they show on the statement. <strong>No emails or texts are sent.</strong>{" "}
        Running it twice is safe: a rental never gets two rent charges for the same month.
      </Notice>

      <Card title="Rent charges" subtitle={`For ${label}`}>
        <form method="get" className="adm-filters" style={{ marginBottom: 14 }}>
          <div className="adm-field">
            <label htmlFor="b-month">Month</label>
            <input id="b-month" name="month" type="month" className="adm-input" defaultValue={month} />
          </div>
          <button className="adm-btn" type="submit" style={{ marginTop: 22 }}>Show</button>
        </form>
        <DataTable
          columns={["Customer", "Unit", "Rent"]}
          empty="Every active rental already has its rent charge for this month."
          rows={rentDue.slice(0, 40).map((item) => [item.customerName, item.unitName, formatCents(item.rentCents)])}
          footer={`${rentDue.length} rentals to bill, ${formatCents(rentTotal)} in total${rentDue.length > 40 ? " (first 40 shown)" : ""}`}
        />
        {rentDue.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <AdminForm action={runRentBillingAction} submitLabel={`Create ${rentDue.length} rent charges for ${label}`}>
              <input type="hidden" name="month" value={month} />
            </AdminForm>
          </div>
        )}
      </Card>

      <Card title="Automatic payments (autopay)" subtitle="Customers who saved a card on their Recurring Billing page are charged what they owe.">
        <DataTable
          columns={["Customer", "Card", "Owes now"]}
          empty="No customers have automatic payments on yet."
          rows={autopay.slice(0, 40).map((item) => [item.name, item.card, formatCents(item.dueCents)])}
          footer={`${autopay.length} customers with autopay on, ${autopay.filter((item) => item.dueCents > 0).length} owing ${formatCents(autopayTotal)}`}
        />
        <p className="adm-muted" style={{ marginTop: 10 }}>
          This runs by itself every day once the daily job is set up (see the setup notes). Use the button to run it now. It
          makes <strong>real card charges</strong> through Stripe, once per customer per day. A declined card is retried the
          next day, and autopay switches off after 3 declines in a row.
        </p>
        {autopay.some((item) => item.dueCents > 0) && (
          <div style={{ marginTop: 14 }}>
            <AdminForm action={runAutopayAction} submitLabel={`Charge ${autopay.filter((item) => item.dueCents > 0).length} cards now (${formatCents(autopayTotal)})`}>
              <input type="hidden" name="confirm" value="yes" />
            </AdminForm>
          </div>
        )}
      </Card>

      <Card title="Late fees" subtitle="Overdue charges that have not yet been given a late fee under your active rules.">
        <DataTable
          columns={["Customer", "Charge", "Owed", "Days overdue", "Rule", "Fee"]}
          empty="No late fees are due. (Add rules under Setup > Late/Lien.)"
          rows={lateDue.slice(0, 40).map((item) => [item.customerName, item.item, formatCents(item.dueCents), item.days, item.rule, formatCents(item.feeCents)])}
          footer={`${lateDue.length} late fees, ${formatCents(lateTotal)} in total`}
        />
        {lateDue.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <AdminForm action={applyLateFeesAction} submitLabel={`Add ${lateDue.length} late fees`}>
              <input type="hidden" name="confirm" value="yes" />
            </AdminForm>
          </div>
        )}
      </Card>
    </>
  );
}
