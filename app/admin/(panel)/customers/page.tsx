import { connection } from "next/server";
import { Badge, Card, DataTable, LinkButton, PageHeader } from "../../ui";
import { formatCents } from "@/lib/content";
import { db, unwrap } from "@/lib/db";

type Row = {
  id: number;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  credit_cents: number;
  ledger_entries: { amount_cents: number; tax_cents: number; paid_cents: number }[];
  archived: boolean;
  login_disabled: boolean;
  rentals: { count: number }[];
};

const FILTERS = [
  ["active", "Active"],
  ["balance", "Balance due"],
  ["no_login", "Login disabled"],
  ["archived", "Archived"],
  ["all", "All"],
] as const;

const LIMIT = 200;

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await connection();
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 60);
  const filter = FILTERS.some(([value]) => value === params.filter) ? (params.filter as string) : "active";

  let query = db()
    .from("customers")
    .select("id,full_name,username,email,phone,credit_cents,archived,login_disabled,rentals(count),ledger_entries(amount_cents,tax_cents,paid_cents)")
    .order("full_name")
    .limit(LIMIT);
  if (filter === "active") query = query.eq("archived", false);
  if (filter === "archived") query = query.eq("archived", true);
  if (filter === "balance") query = query.eq("archived", false);
  if (filter === "no_login") query = query.eq("login_disabled", true);
  // Strip characters that have a meaning in the filter syntax before searching.
  const term = q.replace(/[,()%*\\]/g, " ").trim();
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,username.ilike.%${term}%,phone.ilike.%${term}%`);

  const all = unwrap(await query, "customers") as unknown as Row[];
  // Balance = what is still owed on their charges minus any credit.
  const balanceOf = (customer: Row) =>
    customer.ledger_entries.reduce((sum, entry) => sum + entry.amount_cents + entry.tax_cents - entry.paid_cents, 0) - customer.credit_cents;
  const customers = filter === "balance" ? all.filter((customer) => balanceOf(customer) > 0) : all;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Your tenants. Each one can sign in to their account on the website."
        actions={<LinkButton primary icon="plus" href="/admin/customer_profile_forms/new">New Customer</LinkButton>}
      />
      <Card>
        <form method="get" className="adm-filters">
          <div className="adm-field">
            <label htmlFor="q">Search</label>
            <input id="q" name="q" className="adm-input" defaultValue={q} placeholder="Name, email, username or phone" />
          </div>
          <div className="adm-field">
            <label htmlFor="filter">Show</label>
            <select id="filter" name="filter" className="adm-select" defaultValue={filter}>
              {FILTERS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button className="adm-btn is-primary" type="submit" style={{ marginTop: 22 }}>Search</button>
        </form>
      </Card>
      <DataTable
        columns={["Name", "Username", "Phone", "Email", "Balance", "Rentals", "Actions"]}
        empty="No customers match. Add your first customer to get started."
        rows={customers.map((customer) => [
          <span key="n"><strong>{customer.full_name}</strong>{customer.archived && <> <Badge tone="gray">Archived</Badge></>}{customer.login_disabled && <> <Badge tone="amber">No login</Badge></>}</span>,
          <code key="u">{customer.username}</code>,
          customer.phone,
          customer.email,
          balanceOf(customer) > 0 ? <Badge key="b" tone="red">{formatCents(balanceOf(customer))}</Badge> : formatCents(Math.min(0, balanceOf(customer))),
          customer.rentals?.[0]?.count ?? 0,
          <LinkButton key="a" small icon="edit" href={`/admin/customers/${customer.id}/edit`}>Edit</LinkButton>,
        ])}
        footer={all.length >= LIMIT ? `Showing the first ${customers.length} customers. Use Search or a filter to narrow the list.` : `${customers.length} customers`}
      />
    </>
  );
}
