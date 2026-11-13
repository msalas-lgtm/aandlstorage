import "server-only";
import { db } from "@/lib/db";

// Every report here is computed from your real data (units, customers, rentals, charges, payments).

export type Cell = string | number;
export type ReportResult = { columns: string[]; rows: Cell[][]; summary?: { label: string; value: string }[] };
export type ReportContext = { from: string; to: string };
export type ReportType = "accounting" | "customers" | "facility" | "payments_and_deposits";
export type ReportDef = {
  slug: string;
  name: string;
  type: ReportType;
  description: string;
  range?: boolean; // uses the From / To dates
  run: (ctx: ReportContext) => Promise<ReportResult>;
};

export const REPORT_TYPES: { type: "all" | ReportType; label: string }[] = [
  { type: "all", label: "All Reports" },
  { type: "accounting", label: "Accounting/Financials" },
  { type: "customers", label: "Customers" },
  { type: "facility", label: "Facility" },
  { type: "payments_and_deposits", label: "Payments and Deposits" },
];

const money = (cents: number) =>
  `${cents < 0 ? "-" : ""}$${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (value: string | null) => (value ? value.slice(0, 10) : "");
const startOfDay = (date: string) => `${date}T00:00:00.000Z`;
const endOfDay = (date: string) => `${date}T23:59:59.999Z`;
const owed = (entry: { amount_cents: number; tax_cents: number; paid_cents: number }) => entry.amount_cents + entry.tax_cents - entry.paid_cents;
const daysAgo = (date: string) => Math.max(0, Math.floor((Date.now() - Date.parse(`${date}T00:00:00Z`)) / 86400000));
const sqft = (typeName: string) => {
  const dims = [...typeName.matchAll(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/gi)];
  const last = dims[dims.length - 1];
  return last ? Number(last[1]) * Number(last[2]) : 0;
};

type Payment = { id: number; amount_cents: number; method: string; note: string; created_at: string; customers: { full_name: string } | null };

async function paymentsInRange({ from, to }: ReportContext): Promise<Payment[]> {
  const { data } = await db()
    .from("payments")
    .select("id,amount_cents,method,note,created_at,customers(full_name)")
    .gte("created_at", startOfDay(from))
    .lte("created_at", endOfDay(to))
    .order("created_at", { ascending: false })
    .limit(5000);
  return (data ?? []) as unknown as Payment[];
}

async function customersWithLedger() {
  const { data } = await db()
    .from("customers")
    .select("id,full_name,phone,email,credit_cents,archived,ledger_entries(entry_date,amount_cents,tax_cents,paid_cents),rentals(unit_name,ended_on)")
    .eq("archived", false)
    .order("full_name")
    .limit(5000);
  return (data ?? []) as unknown as {
    id: number; full_name: string; phone: string; email: string; credit_cents: number;
    ledger_entries: { entry_date: string; amount_cents: number; tax_cents: number; paid_cents: number }[];
    rentals: { unit_name: string; ended_on: string | null }[];
  }[];
}

async function unitsByType() {
  const client = db();
  const [{ data: types }, { data: units }] = await Promise.all([
    client.from("unit_types").select("id,name,price_cents,units_count").order("sort_order").order("id"),
    client.from("units").select("id,name,status,unit_type_id").limit(5000),
  ]);
  return { types: types ?? [], units: units ?? [] };
}

async function activeRentals() {
  const { data } = await db()
    .from("rentals")
    .select("id,unit_name,monthly_rent_cents,started_on,confirmed,unit_type_id,unit_types(name),customers(full_name)")
    .is("ended_on", null)
    .limit(5000);
  return (data ?? []) as unknown as {
    id: number; unit_name: string; monthly_rent_cents: number; started_on: string; confirmed: boolean; unit_type_id: number | null;
    unit_types: { name: string } | null; customers: { full_name: string } | null;
  }[];
}

const byMonth = (rows: Payment[]) => {
  const months = new Map<string, { count: number; total: number }>();
  for (const row of rows) {
    const key = row.created_at.slice(0, 7);
    const entry = months.get(key) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += row.amount_cents;
    months.set(key, entry);
  }
  return [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]));
};

export const REPORTS: ReportDef[] = [
  // ---------- accounting
  {
    slug: "revenues", name: "Revenues", type: "accounting", range: true,
    description: "Payments received from each customer in the date range.",
    run: async (ctx) => {
      const payments = await paymentsInRange(ctx);
      const perCustomer = new Map<string, { count: number; total: number }>();
      for (const payment of payments) {
        const name = payment.customers?.full_name ?? "Unknown";
        const entry = perCustomer.get(name) ?? { count: 0, total: 0 };
        entry.count += 1; entry.total += payment.amount_cents; perCustomer.set(name, entry);
      }
      const total = payments.reduce((sum, p) => sum + p.amount_cents, 0);
      return {
        columns: ["Customer", "Payments", "Total"],
        rows: [...perCustomer.entries()].sort((a, b) => b[1].total - a[1].total).map(([name, e]) => [name, e.count, money(e.total)]),
        summary: [{ label: "Total received", value: money(total) }, { label: "Payments", value: String(payments.length) }],
      };
    },
  },
  {
    slug: "yearly", name: "Yearly Revenues", type: "accounting", range: true,
    description: "Payments received by month.",
    run: async (ctx) => {
      const payments = await paymentsInRange(ctx);
      return {
        columns: ["Month", "Payments", "Total"],
        rows: byMonth(payments).map(([month, e]) => [month, e.count, money(e.total)]),
        summary: [{ label: "Total received", value: money(payments.reduce((sum, p) => sum + p.amount_cents, 0)) }],
      };
    },
  },
  {
    slug: "monthly_deposits", name: "Monthly Deposits", type: "accounting", range: true,
    description: "Money received each month, ready to match against your bank deposits.",
    run: async (ctx) => {
      const payments = await paymentsInRange(ctx);
      return { columns: ["Month", "Payments", "Deposit total"], rows: byMonth(payments).map(([m, e]) => [m, e.count, money(e.total)]) };
    },
  },
  {
    slug: "total_deposits", name: "Total Deposits", type: "accounting", range: true,
    description: "Money received, by how it was paid.",
    run: async (ctx) => {
      const payments = await paymentsInRange(ctx);
      const methods = new Map<string, { count: number; total: number }>();
      for (const p of payments) {
        const e = methods.get(p.method) ?? { count: 0, total: 0 };
        e.count += 1; e.total += p.amount_cents; methods.set(p.method, e);
      }
      return {
        columns: ["Paid by", "Payments", "Total"],
        rows: [...methods.entries()].map(([method, e]) => [method, e.count, money(e.total)]),
        summary: [{ label: "Total", value: money(payments.reduce((s, p) => s + p.amount_cents, 0)) }],
      };
    },
  },
  {
    slug: "collections", name: "Collections", type: "accounting",
    description: "Customers who owe money, with how long the oldest charge has been unpaid.",
    run: async () => {
      const customers = await customersWithLedger();
      const rows = customers
        .map((c) => {
          const open = c.ledger_entries.filter((entry) => owed(entry) > 0);
          const total = open.reduce((sum, entry) => sum + owed(entry), 0);
          const oldest = open.map((entry) => entry.entry_date).sort()[0];
          return { c, total, oldest };
        })
        .filter((x) => x.total - x.c.credit_cents > 0)
        .sort((a, b) => b.total - a.total);
      return {
        columns: ["Customer", "Phone", "Owed", "Credit", "Oldest charge", "Days"],
        rows: rows.map(({ c, total, oldest }) => [c.full_name, c.phone, money(total), money(c.credit_cents), oldest ?? "", oldest ? daysAgo(oldest) : ""]),
        summary: [{ label: "Customers owing", value: String(rows.length) }, { label: "Total owed", value: money(rows.reduce((s, x) => s + x.total - x.c.credit_cents, 0)) }],
      };
    },
  },
  {
    slug: "expected_revenue", name: "Expected Revenue", type: "accounting",
    description: "Monthly rent from active rentals, by unit type.",
    run: async () => {
      const rentals = await activeRentals();
      const groups = new Map<string, { count: number; total: number }>();
      for (const r of rentals) {
        const key = r.unit_types?.name ?? "No unit type";
        const e = groups.get(key) ?? { count: 0, total: 0 };
        e.count += 1; e.total += r.monthly_rent_cents; groups.set(key, e);
      }
      const total = rentals.reduce((s, r) => s + r.monthly_rent_cents, 0);
      return {
        columns: ["Unit type", "Active rentals", "Monthly rent"],
        rows: [...groups.entries()].map(([name, e]) => [name, e.count, money(e.total)]),
        summary: [{ label: "Expected per month", value: money(total) }, { label: "Per year", value: money(total * 12) }],
      };
    },
  },
  {
    slug: "future_revenue", name: "Future Revenue", type: "accounting",
    description: "Rent you can expect over the next 12 months if nobody moves in or out.",
    run: async () => {
      const total = (await activeRentals()).reduce((s, r) => s + r.monthly_rent_cents, 0);
      const now = new Date();
      const rows = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1 + i, 1));
        return [d.toISOString().slice(0, 7), money(total)];
      });
      return { columns: ["Month", "Expected rent"], rows, summary: [{ label: "Next 12 months", value: money(total * 12) }] };
    },
  },
  {
    slug: "lost_revenue", name: "Lost Revenue", type: "accounting",
    description: "Rent you are not earning because units are vacant.",
    run: async () => {
      const { types, units } = await unitsByType();
      const rows = types
        .map((t) => ({ t, vacant: units.filter((u) => u.unit_type_id === t.id && u.status === "vacant").length }))
        .filter((x) => x.vacant > 0)
        .map(({ t, vacant }) => [t.name, vacant, money(t.price_cents), money(vacant * t.price_cents)]);
      const lost = types.reduce((s, t) => s + units.filter((u) => u.unit_type_id === t.id && u.status === "vacant").length * t.price_cents, 0);
      return { columns: ["Unit type", "Vacant units", "Price", "Lost per month"], rows, summary: [{ label: "Lost per month", value: money(lost) }] };
    },
  },
  {
    slug: "sales_tax", name: "Sales Tax", type: "accounting", range: true,
    description: "Sales tax charged to customers, by month.",
    run: async ({ from, to }) => {
      const { data } = await db().from("ledger_entries").select("entry_date,amount_cents,tax_cents").gt("tax_cents", 0).gte("entry_date", from).lte("entry_date", to);
      const months = new Map<string, { sales: number; tax: number }>();
      for (const e of data ?? []) {
        const m = months.get(e.entry_date.slice(0, 7)) ?? { sales: 0, tax: 0 };
        m.sales += e.amount_cents; m.tax += e.tax_cents; months.set(e.entry_date.slice(0, 7), m);
      }
      return {
        columns: ["Month", "Taxable sales", "Tax collected"],
        rows: [...months.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([m, e]) => [m, money(e.sales), money(e.tax)]),
        summary: [{ label: "Tax charged", value: money([...months.values()].reduce((s, e) => s + e.tax, 0)) }],
      };
    },
  },
  {
    slug: "retail_sales", name: "Retail Sales", type: "accounting", range: true,
    description: "Products sold in the date range.",
    run: async ({ from, to }) => {
      const { data } = await db().from("ledger_entries").select("entry_date,item,description,amount_cents,tax_cents,customers(full_name)").eq("kind", "retail").gte("entry_date", from).lte("entry_date", to).order("entry_date", { ascending: false });
      const rows = (data ?? []) as unknown as { entry_date: string; item: string; description: string; amount_cents: number; tax_cents: number; customers: { full_name: string } | null }[];
      return {
        columns: ["Date", "Product", "Customer", "Amount", "Tax"],
        rows: rows.map((r) => [r.entry_date, r.item, r.customers?.full_name ?? "", money(r.amount_cents), money(r.tax_cents)]),
        summary: [{ label: "Sales", value: money(rows.reduce((s, r) => s + r.amount_cents, 0)) }],
      };
    },
  },
  {
    slug: "occupancy", name: "Occupancy", type: "accounting",
    description: "How full each unit type is right now.",
    run: async () => {
      const { types, units } = await unitsByType();
      const rows = types.map((t) => {
        const mine = units.filter((u) => u.unit_type_id === t.id);
        const rented = mine.filter((u) => u.status === "rented").length;
        const total = Math.max(t.units_count, mine.length);
        return [t.name, total, rented, mine.filter((u) => u.status === "reserved").length, mine.filter((u) => u.status === "vacant").length, total ? `${Math.round(((total - mine.filter((u) => u.status === "vacant").length) / total) * 100)}%` : "0%"];
      });
      const total = types.reduce((s, t) => s + Math.max(t.units_count, units.filter((u) => u.unit_type_id === t.id).length), 0);
      const vacant = units.filter((u) => u.status === "vacant").length;
      return { columns: ["Unit type", "Total units", "Rented", "Reserved", "Vacant", "Occupancy"], rows, summary: [{ label: "Occupancy", value: total ? `${Math.round(((total - vacant) / total) * 100)}%` : "0%" }, { label: "Vacant units", value: String(vacant) }] };
    },
  },
  // ---------- customers
  {
    slug: "tenant_credit", name: "Tenant Credit", type: "customers",
    description: "Customers who have credit on their account.",
    run: async () => {
      const rows = (await customersWithLedger()).filter((c) => c.credit_cents > 0);
      return { columns: ["Customer", "Phone", "Credit"], rows: rows.map((c) => [c.full_name, c.phone, money(c.credit_cents)]), summary: [{ label: "Total credit", value: money(rows.reduce((s, c) => s + c.credit_cents, 0)) }] };
    },
  },
  {
    slug: "move_in_move_out", name: "Move In / Move Out", type: "customers", range: true,
    description: "Rentals that started or ended in the date range.",
    run: async ({ from, to }) => {
      const { data } = await db().from("rentals").select("unit_name,started_on,ended_on,customers(full_name),unit_types(name)").or(`and(started_on.gte.${from},started_on.lte.${to}),and(ended_on.gte.${from},ended_on.lte.${to})`).limit(3000);
      const rows: Cell[][] = [];
      for (const r of (data ?? []) as unknown as { unit_name: string; started_on: string; ended_on: string | null; customers: { full_name: string } | null; unit_types: { name: string } | null }[]) {
        if (r.started_on >= from && r.started_on <= to) rows.push([r.started_on, "Move in", r.customers?.full_name ?? "", r.unit_name, r.unit_types?.name ?? ""]);
        if (r.ended_on && r.ended_on >= from && r.ended_on <= to) rows.push([r.ended_on, "Move out", r.customers?.full_name ?? "", r.unit_name, r.unit_types?.name ?? ""]);
      }
      rows.sort((a, b) => String(b[0]).localeCompare(String(a[0])));
      return { columns: ["Date", "Event", "Customer", "Unit", "Unit type"], rows, summary: [{ label: "Move ins", value: String(rows.filter((r) => r[1] === "Move in").length) }, { label: "Move outs", value: String(rows.filter((r) => r[1] === "Move out").length) }] };
    },
  },
  {
    slug: "tenant_data", name: "Tenant Data", type: "customers",
    description: "Every active customer with contact details, units and balance.",
    run: async () => {
      const customers = await customersWithLedger();
      return {
        columns: ["Customer", "Phone", "Email", "Units", "Balance"],
        rows: customers.map((c) => [c.full_name, c.phone, c.email, c.rentals.filter((r) => !r.ended_on).map((r) => r.unit_name).join(", "), money(c.ledger_entries.reduce((s, e) => s + owed(e), 0) - c.credit_cents)]),
        summary: [{ label: "Customers", value: String(customers.length) }],
      };
    },
  },
  {
    slug: "past_due", name: "Past Due", type: "customers",
    description: "Customers with a charge unpaid for more than 30 days.",
    run: async () => {
      const rows = (await customersWithLedger())
        .map((c) => {
          const old = c.ledger_entries.filter((e) => owed(e) > 0 && daysAgo(e.entry_date) > 30);
          return { c, total: old.reduce((s, e) => s + owed(e), 0), oldest: old.map((e) => e.entry_date).sort()[0] };
        })
        .filter((x) => x.total > 0)
        .sort((a, b) => b.total - a.total);
      return { columns: ["Customer", "Phone", "Past due", "Oldest charge", "Days"], rows: rows.map(({ c, total, oldest }) => [c.full_name, c.phone, money(total), oldest, daysAgo(oldest)]), summary: [{ label: "Past due total", value: money(rows.reduce((s, x) => s + x.total, 0)) }] };
    },
  },
  {
    slug: "active_promotions", name: "Active Promotions", type: "customers",
    description: "Discount codes that are switched on.",
    run: async () => {
      const { data } = await db().from("promotions").select("*").eq("active", true).order("name");
      return { columns: ["Name", "Code", "Discount"], rows: (data ?? []).map((p) => [p.name, p.code, p.discount_type === "percent" ? `${Number(p.discount_value)}% off` : `$${Number(p.discount_value).toFixed(2)} off`]) };
    },
  },
  // ---------- facility
  {
    slug: "management_summary", name: "Management Summary", type: "facility",
    description: "The key numbers at a glance.",
    run: async () => {
      const client = db();
      const month = new Date().toISOString().slice(0, 7);
      const [{ types, units }, rentals, customers, payments] = await Promise.all([
        unitsByType(),
        activeRentals(),
        customersWithLedger(),
        paymentsInRange({ from: `${month}-01`, to: new Date().toISOString().slice(0, 10) }),
      ]);
      const total = Math.max(types.reduce((s, t) => s + t.units_count, 0), units.length);
      const vacant = units.filter((u) => u.status === "vacant").length;
      const outstanding = customers.reduce((s, c) => s + c.ledger_entries.reduce((x, e) => x + owed(e), 0), 0);
      void client;
      return {
        columns: ["Measure", "Value"],
        rows: [
          ["Total units", total], ["Vacant units", vacant], ["Occupancy", total ? `${Math.round(((total - vacant) / total) * 100)}%` : "0%"],
          ["Active rentals", rentals.length], ["Monthly rent roll", money(rentals.reduce((s, r) => s + r.monthly_rent_cents, 0))],
          ["Customers", customers.length], ["Outstanding", money(outstanding)], ["Credit on accounts", money(customers.reduce((s, c) => s + c.credit_cents, 0))],
          ["Received this month", money(payments.reduce((s, p) => s + p.amount_cents, 0))],
        ],
      };
    },
  },
  {
    slug: "rent_roll", name: "Rent Roll", type: "facility",
    description: "Every active rental with its monthly rent.",
    run: async () => {
      const rentals = (await activeRentals()).sort((a, b) => a.unit_name.localeCompare(b.unit_name, undefined, { numeric: true }));
      return {
        columns: ["Unit", "Unit type", "Customer", "Monthly rent", "Since", "Status"],
        rows: rentals.map((r) => [r.unit_name, r.unit_types?.name ?? "", r.customers?.full_name ?? "", money(r.monthly_rent_cents), r.started_on, r.confirmed ? "Active" : "Awaiting confirmation"]),
        summary: [{ label: "Active rentals", value: String(rentals.length) }, { label: "Monthly total", value: money(rentals.reduce((s, r) => s + r.monthly_rent_cents, 0)) }],
      };
    },
  },
  {
    slug: "square_footage", name: "Square Footage", type: "facility",
    description: "Floor area by unit type, worked out from the size in each name.",
    run: async () => {
      const { types, units } = await unitsByType();
      const rows = types.map((t) => {
        const mine = units.filter((u) => u.unit_type_id === t.id);
        const each = sqft(t.name);
        return [t.name, each, mine.length, each * mine.length, each * mine.filter((u) => u.status === "rented").length];
      });
      return { columns: ["Unit type", "Sq ft each", "Units listed", "Total sq ft", "Rented sq ft"], rows, summary: [{ label: "Total sq ft", value: String(rows.reduce((s, r) => s + Number(r[3]), 0)) }] };
    },
  },
  {
    slug: "retail_inventory", name: "Retail Inventory Summary", type: "facility",
    description: "Stock of the products you sell.",
    run: async () => {
      const { data } = await db().from("products").select("*").order("name");
      const rows = data ?? [];
      return { columns: ["Product", "SKU", "Price", "In stock", "Stock value"], rows: rows.map((p) => [p.name, p.sku, money(p.price_cents), p.stock, money(p.price_cents * p.stock)]), summary: [{ label: "Stock value", value: money(rows.reduce((s, p) => s + p.price_cents * p.stock, 0)) }] };
    },
  },
  {
    slug: "tasks", name: "Tasks", type: "facility",
    description: "Open tasks.",
    run: async () => {
      const { data } = await db().from("tasks").select("*").is("done_at", null).order("due_on", { nullsFirst: true });
      return { columns: ["Task", "Due", "Assigned to", "Repeats"], rows: (data ?? []).map((t) => [t.title, t.due_on ?? "", t.assigned_to, t.recurrence === "none" ? "" : t.recurrence]) };
    },
  },
  {
    slug: "unit_status", name: "Unit Status", type: "facility",
    description: "How many units are in each status, by unit type.",
    run: async () => {
      const { types, units } = await unitsByType();
      const count = (id: number, status: string) => units.filter((u) => u.unit_type_id === id && u.status === status).length;
      return { columns: ["Unit type", "Vacant", "Reserved", "Rented", "Unavailable"], rows: types.map((t) => [t.name, count(t.id, "vacant"), count(t.id, "reserved"), count(t.id, "rented"), count(t.id, "unavailable")]) };
    },
  },
  {
    slug: "length_of_stay", name: "Length of Stay", type: "facility",
    description: "How long each active customer has rented.",
    run: async () => {
      const rentals = (await activeRentals()).sort((a, b) => a.started_on.localeCompare(b.started_on));
      return { columns: ["Customer", "Unit", "Since", "Months"], rows: rentals.map((r) => [r.customers?.full_name ?? "", r.unit_name, r.started_on, Math.floor(daysAgo(r.started_on) / 30.4)]) };
    },
  },
  {
    slug: "vacant_units", name: "Vacant Units", type: "facility",
    description: "Units that are empty and can be rented.",
    run: async () => {
      const { data } = await db().from("units").select("name,notes,unit_types(name,price_cents)").eq("status", "vacant").limit(2000);
      const rows = ((data ?? []) as unknown as { name: string; notes: string; unit_types: { name: string; price_cents: number } | null }[]).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      return { columns: ["Unit", "Unit type", "Price", "Notes"], rows: rows.map((u) => [u.name, u.unit_types?.name ?? "", u.unit_types ? money(u.unit_types.price_cents) : "", u.notes]), summary: [{ label: "Vacant units", value: String(rows.length) }] };
    },
  },
  // ---------- payments and deposits
  {
    slug: "transactions", name: "Transactions", type: "payments_and_deposits", range: true,
    description: "Every payment received in the date range.",
    run: async (ctx) => {
      const payments = await paymentsInRange(ctx);
      return {
        columns: ["Date", "Customer", "Paid by", "Amount", "Note"],
        rows: payments.map((p) => [day(p.created_at), p.customers?.full_name ?? "", p.method, money(p.amount_cents), p.note]),
        summary: [{ label: "Total", value: money(payments.reduce((s, p) => s + p.amount_cents, 0)) }, { label: "Payments", value: String(payments.length) }],
      };
    },
  },
];

export const reportFor = (slug: string) => REPORTS.find((report) => report.slug === slug);

export function defaultRange() {
  const today = new Date().toISOString().slice(0, 10);
  return { from: `${today.slice(0, 8)}01`, to: today };
}

export function csvOf(result: ReportResult) {
  const cell = (value: Cell) => `"${String(value).replace(/"/g, '""')}"`;
  return [result.columns.map(cell).join(","), ...result.rows.map((row) => row.map(cell).join(","))].join("\r\n") + "\r\n";
}
