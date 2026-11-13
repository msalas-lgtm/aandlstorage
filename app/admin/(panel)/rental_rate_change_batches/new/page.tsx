import { connection } from "next/server";
import { applyRateChangeAction } from "../../../actions";
import { AdminForm } from "../../../AdminForm";
import { Card, DataTable, Notice, PageHeader } from "../../../ui";
import { formatCents, getUnitTypes } from "@/lib/content";
import { db, unwrap } from "@/lib/db";

export default async function MassEditRentalPricesPage({ searchParams }: PageProps<"/admin/rental_rate_change_batches/new">) {
  await connection();
  const params = await searchParams;
  const types = await getUnitTypes();
  const typeId = Number(typeof params.type === "string" ? params.type : 0);
  const mode = params.mode === "amount" ? "amount" : "percent";
  const value = Number(typeof params.value === "string" ? params.value : 0);
  const type = types.find((entry) => entry.id === typeId);

  const rentals = type
    ? (unwrap(
        await db().from("rentals").select("id,unit_name,monthly_rent_cents,customers(full_name)").eq("unit_type_id", type.id).is("ended_on", null).limit(1000),
        "rentals",
      ) as unknown as { id: number; unit_name: string; monthly_rent_cents: number; customers: { full_name: string } | null }[])
    : [];
  const after = (cents: number) => Math.max(0, Math.round(mode === "percent" ? cents * (1 + value / 100) : cents + value * 100));

  return (
    <>
      <PageHeader title="Mass Edit Rental Prices" description="Raise or lower the monthly rent for every active rental of one unit type." />
      <Notice>
        Customers are <strong>not notified</strong> automatically, so let them know yourself. Charges already created are not
        changed. The new rent is used the next time Monthly Billing runs.
      </Notice>
      <Card title="1. Choose the change">
        <form method="get" className="adm-filters">
          <div className="adm-field">
            <label htmlFor="m-type">Unit Type</label>
            <select id="m-type" name="type" className="adm-select" defaultValue={type?.id ?? ""} required>
              <option value="" disabled>Choose a unit type</option>
              {types.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="m-mode">Change by</label>
            <select id="m-mode" name="mode" className="adm-select" defaultValue={mode}>
              <option value="percent">Percent</option>
              <option value="amount">Dollars per month</option>
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="m-value">Increase Monthly Rental Price By</label>
            <input id="m-value" name="value" className="adm-input" inputMode="decimal" defaultValue={value || ""} placeholder="5" />
          </div>
          <button className="adm-btn is-primary" type="submit" style={{ marginTop: 22 }}>Preview</button>
        </form>
      </Card>
      {type && value !== 0 && (
        <Card title="2. Check and apply" subtitle={`${rentals.length} active ${rentals.length === 1 ? "rental" : "rentals"} of ${type.name}`}>
          <DataTable
            columns={["Unit", "Customer", "Now", "After"]}
            empty="No active rentals of this size."
            rows={rentals.slice(0, 30).map((rental) => [rental.unit_name, rental.customers?.full_name ?? "", formatCents(rental.monthly_rent_cents), formatCents(after(rental.monthly_rent_cents))])}
            footer={rentals.length > 30 ? `Showing 30 of ${rentals.length}. The list price is ${type.price} and would become ${formatCents(after(type.priceCents))}.` : `The list price is ${type.price} and would become ${formatCents(after(type.priceCents))}.`}
          />
          <div style={{ marginTop: 16 }}>
            <AdminForm action={applyRateChangeAction} submitLabel="Apply the change">
              <input type="hidden" name="typeId" value={type.id} />
              <input type="hidden" name="mode" value={mode} />
              <input type="hidden" name="value" value={value} />
              <label className="adm-check" htmlFor="m-list">
                <input id="m-list" name="updateListPrice" type="checkbox" defaultChecked />
                <span>Also change the price shown on the Rent page</span>
              </label>
              <label className="adm-check" htmlFor="m-confirm">
                <input id="m-confirm" name="confirm" type="checkbox" />
                <span>I understand this changes the rent on {rentals.length} active rentals</span>
              </label>
            </AdminForm>
          </div>
        </Card>
      )}
    </>
  );
}
