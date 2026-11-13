import { notFound } from "next/navigation";
import { addChargeAction, addRentalAction, endRentalAction, recordPaymentAction, voidChargeAction } from "../../../../actions";
import { AdminForm, ConfirmButton } from "../../../../AdminForm";
import { Badge, Card, DataTable, LinkButton, Notice, PageHeader } from "../../../../ui";
import { getBilling, money } from "@/lib/billing";
import { formatCents } from "@/lib/content";
import { db } from "@/lib/db";
import { CustomerAccess } from "../../CustomerAccess";
import { CustomerForm, type CustomerRow } from "../../CustomerForm";

export default async function EditCustomerPage({
  params,
  searchParams,
}: PageProps<"/admin/customers/[id]/edit">) {
  const { id } = await params;
  const { created } = await searchParams;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) notFound();

  const client = db();
  const { data: customer } = await client.from("customers").select("*").eq("id", customerId).maybeSingle();
  if (!customer) notFound();
  const { data: rentals } = await client.from("rentals").select("*").eq("customer_id", customerId).order("started_on", { ascending: false });
  const { data: vacantRows } = await client.from("units").select("id,name,unit_types(name)").eq("status", "vacant").limit(500);
  const vacantUnits = ((vacantRows ?? []) as unknown as { id: number; name: string; unit_types: { name: string } | null }[]).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
  const today = new Date().toISOString().slice(0, 10);
  const billing = await getBilling(customerId);
  const { data: payments } = await client.from("payments").select("id,amount_cents,method,note,created_at").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(10);

  return (
    <>
      <PageHeader title="Edit Customer" description={customer.full_name} actions={<LinkButton href="/admin/customers">Back to customers</LinkButton>} />
      {created && <Notice tone="ok">Customer created. They can now sign in on the website with this username and password.</Notice>}
      <Card>
        <CustomerForm customer={customer as CustomerRow} />
      </Card>

      <Card title="Online access" subtitle="Let this customer sign in on the website to see their account, rentals and statement.">
        <p className="adm-stat-hint" style={{ marginBottom: 12 }}>
          {customer.login_disabled ? "Online login is off for this customer." : "Online login is on."} Setting up access creates a new
          temporary password that you hand to the customer yourself. The website never emails or texts customers on its own.
        </p>
        <CustomerAccess id={customer.id} name={customer.full_name} />
      </Card>

      <Card title="Billing" subtitle="What this customer owes. They see these charges on their statement and balance.">
        <div className="adm-grid cols-3">
          <div className="adm-miniitem"><div><strong>{money(billing.outstandingCents)}</strong><p>Outstanding</p></div></div>
          <div className="adm-miniitem"><div><strong>{money(billing.creditCents)}</strong><p>Credit</p></div></div>
          <div className="adm-miniitem"><div><strong>{money(billing.balanceCents)}</strong><p>Balance</p></div></div>
        </div>
        <div style={{ marginTop: 16 }}>
          <DataTable
            columns={["Date", "Item", "Description", "Amount", "Tax", "Due", "Actions"]}
            empty="Nothing is due."
            rows={billing.charges.map((charge) => [
              charge.date,
              <strong key="i">{charge.item}</strong>,
              charge.description,
              money(charge.amountCents),
              money(charge.taxCents),
              <Badge key="d" tone="red">{money(charge.dueCents)}</Badge>,
              <ConfirmButton key="v" action={voidChargeAction} fields={{ id: String(charge.id), customerId: String(customerId) }} label="Remove" message={`Remove the ${charge.item} charge? Anything already paid toward it goes back to the customer as credit.`} />,
            ])}
          />
        </div>
        <div className="adm-grid cols-2" style={{ marginTop: 18, alignItems: "start" }}>
          <div>
            <h3 className="adm-card-title">Record a payment</h3>
            <AdminForm action={recordPaymentAction} submitLabel="Record payment" resetOnSuccess>
              <input type="hidden" name="customerId" value={customerId} />
              <div className="adm-fields">
                <div className="adm-field">
                  <label htmlFor="p-amount">Amount received ($)</label>
                  <input id="p-amount" name="amount" className="adm-input" inputMode="decimal" required />
                </div>
                <div className="adm-field">
                  <label htmlFor="p-method">Paid by</label>
                  <select id="p-method" name="method" className="adm-select" defaultValue="cash">
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="card">Card</option>
                    <option value="ach">Bank transfer (ACH)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="adm-field is-wide">
                  <label htmlFor="p-note">Note</label>
                  <input id="p-note" name="note" className="adm-input" placeholder="Check number, receipt, ..." />
                  <small>Applied to the oldest charges first. Anything extra becomes credit.</small>
                </div>
              </div>
            </AdminForm>
          </div>
          <div>
            <h3 className="adm-card-title">Add a charge</h3>
            <AdminForm action={addChargeAction} submitLabel="Add charge" resetOnSuccess>
              <input type="hidden" name="customerId" value={customerId} />
              <div className="adm-fields">
                <div className="adm-field">
                  <label htmlFor="c-item">Item</label>
                  <input id="c-item" name="item" className="adm-input" placeholder="Rent, Late fee, ..." required />
                </div>
                <div className="adm-field">
                  <label htmlFor="c-date">Date</label>
                  <input id="c-date" name="date" type="date" className="adm-input" defaultValue={today} required />
                </div>
                <div className="adm-field">
                  <label htmlFor="c-amount">Amount ($)</label>
                  <input id="c-amount" name="amount" className="adm-input" inputMode="decimal" required />
                </div>
                <div className="adm-field">
                  <label htmlFor="c-tax">Tax ($)</label>
                  <input id="c-tax" name="tax" className="adm-input" inputMode="decimal" placeholder="0.00" />
                </div>
                <div className="adm-field is-wide">
                  <label htmlFor="c-desc">Description</label>
                  <input id="c-desc" name="description" className="adm-input" />
                </div>
              </div>
            </AdminForm>
          </div>
        </div>
        {(payments?.length ?? 0) > 0 && (
          <div style={{ marginTop: 18 }}>
            <h3 className="adm-card-title">Recent payments</h3>
            <DataTable
              columns={["Received", "Amount", "Paid by", "Note"]}
              rows={(payments ?? []).map((payment) => [
                new Date(payment.created_at).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "America/New_York" }),
                money(payment.amount_cents),
                payment.method,
                payment.note,
              ])}
            />
          </div>
        )}
      </Card>

      <Card title="Rentals" subtitle="Units this customer rents. Their active rentals show on their account page.">
        <DataTable
          columns={["Unit", "Monthly rent", "Started", "Status", "Actions"]}
          empty="No rentals yet."
          rows={(rentals ?? []).map((rental) => [
            <strong key="u">{rental.unit_name}</strong>,
            formatCents(rental.monthly_rent_cents),
            rental.started_on,
            rental.ended_on ? <Badge key="s" tone="gray">Ended {rental.ended_on}</Badge> : rental.confirmed === false ? <Badge key="s" tone="amber">Awaiting confirmation</Badge> : <Badge key="s" tone="green">Active</Badge>,
            <span key="a">
              {!rental.ended_on && (
                <ConfirmButton action={endRentalAction} fields={{ id: String(rental.id), customerId: String(customerId), mode: "end" }} label="End rental" message={`End the rental of unit ${rental.unit_name} today?`} />
              )}
              <ConfirmButton action={endRentalAction} fields={{ id: String(rental.id), customerId: String(customerId), mode: "delete" }} message="Delete this rental record?" />
            </span>,
          ])}
        />
        <div style={{ marginTop: 18 }}>
          <h3 className="adm-card-title">Add a rental</h3>
          <AdminForm action={addRentalAction} submitLabel="Add rental" resetOnSuccess>
            <input type="hidden" name="customerId" value={customerId} />
            <div className="adm-fields">
              <div className="adm-field">
                <label htmlFor="r-unit">Vacant unit</label>
                <select id="r-unit" name="unitId" className="adm-select" defaultValue="" required>
                  <option value="" disabled>{vacantUnits.length ? "Choose a unit" : "No vacant units"}</option>
                  {vacantUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}{unit.unit_types?.name ? ` (${unit.unit_types.name})` : ""}
                    </option>
                  ))}
                </select>
                <small>Add more units under Units.</small>
              </div>
              <div className="adm-field">
                <label htmlFor="r-rent">Monthly rent ($)</label>
                <input id="r-rent" name="rent" className="adm-input" inputMode="decimal" placeholder="Unit type price" />
                <small>Leave blank to use the unit type&apos;s price.</small>
              </div>
              <div className="adm-field">
                <label htmlFor="r-start">Start date</label>
                <input id="r-start" name="startedOn" type="date" className="adm-input" defaultValue={today} required />
              </div>
            </div>
          </AdminForm>
        </div>
      </Card>
    </>
  );
}
