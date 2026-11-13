import { connection } from "next/server";
import { Card, Notice, PageHeader } from "../../../ui";
import { PrintButton } from "../../../PrintButton";
import { db, unwrap } from "@/lib/db";

type Customer = {
  id: number;
  full_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  ledger_entries: { amount_cents: number; tax_cents: number; paid_cents: number }[];
  credit_cents: number;
};

const FILTERS = [
  ["active", "All active customers"],
  ["balance", "Customers with a balance due"],
] as const;

export default async function MailingLabelsPage({ searchParams }: PageProps<"/admin/customers/labels">) {
  await connection();
  const params = await searchParams;
  const filter = FILTERS.some(([value]) => value === params.filter) ? (params.filter as string) : "active";
  const customers = unwrap(
    await db()
      .from("customers")
      .select("id,full_name,address,city,state,zip,credit_cents,ledger_entries(amount_cents,tax_cents,paid_cents)")
      .eq("archived", false)
      .neq("address", "")
      .order("full_name")
      .limit(3000),
    "customers",
  ) as unknown as Customer[];
  const owes = (customer: Customer) =>
    customer.ledger_entries.reduce((sum, entry) => sum + entry.amount_cents + entry.tax_cents - entry.paid_cents, 0) - customer.credit_cents > 0;
  const labels = filter === "balance" ? customers.filter(owes) : customers;

  return (
    <>
      <div className="adm-noprint" style={{ display: "contents" }}>
        <PageHeader title="Mailing Labels" description="Address labels for the customers who have an address on file." />
        <Notice>Printing only. Nothing is mailed or emailed for you.</Notice>
        <Card>
          <form method="get" className="adm-filters">
            <div className="adm-field">
              <label htmlFor="lb-filter">Customers</label>
              <select id="lb-filter" name="filter" className="adm-select" defaultValue={filter}>
                {FILTERS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <button className="adm-btn" type="submit" style={{ marginTop: 22 }}>Continue</button>
            <span style={{ marginTop: 22 }}><PrintButton label={`Print ${labels.length} labels`} /></span>
          </form>
        </Card>
      </div>
      {labels.length === 0 && <Notice>No customers with an address match.</Notice>}
      <div className="adm-labels">
        {labels.map((customer) => (
          <div className="adm-label-card" key={customer.id}>
            <strong>{customer.full_name}</strong>
            <div>{customer.address}</div>
            <div>{[customer.city, `${customer.state} ${customer.zip}`.trim()].filter(Boolean).join(", ")}</div>
          </div>
        ))}
      </div>
    </>
  );
}
