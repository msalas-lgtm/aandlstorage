import { connection } from "next/server";
import { applyLateFeesAction, runRentBillingAction } from "../../actions";
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
  const [rentDue, lateDue] = await Promise.all([rentDueForMonth(month), lateFeesDue(today)]);
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
