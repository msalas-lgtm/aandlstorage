import Link from "next/link";
import { connection } from "next/server";
import { AdminIcon, type AdminIconName } from "../../../AdminIcon";
import { Card, LinkButton, PageHeader, StatCard } from "../../../ui";
import { formatCents, getPages, getPosts, getUnitTypes } from "@/lib/content";
import { db } from "@/lib/db";

// Every figure on this page is computed from your live data.

function RevenueChart({ months }: { months: { label: string; cents: number }[] }) {
  const w = 640;
  const h = 230;
  const pad = { l: 46, r: 8, t: 14, b: 28 };
  const peak = Math.max(1000, ...months.map((m) => m.cents / 100));
  const max = Math.ceil(peak / 4 / 100) * 100 * 4 || 1000;
  const bw = (w - pad.l - pad.r) / months.length;
  const y = (v: number) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  return (
    <svg className="adm-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Payments received by month">
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={w - pad.r} y1={y(tick)} y2={y(tick)} stroke="#e8ecf5" />
          <text x={pad.l - 8} y={y(tick) + 4} textAnchor="end">${Math.round(tick).toLocaleString()}</text>
        </g>
      ))}
      {months.map((month, i) => (
        <g key={month.label}>
          <rect
            className={i === months.length - 1 ? "adm-bar is-now" : "adm-bar"}
            x={pad.l + i * bw + 7}
            y={y(month.cents / 100)}
            width={bw - 14}
            height={Math.max(0, h - pad.b - y(month.cents / 100))}
            rx="6"
          >
            <title>{`${month.label}: ${formatCents(month.cents)}`}</title>
          </rect>
          <text x={pad.l + i * bw + bw / 2} y={h - 8} textAnchor="middle">{month.label}</text>
        </g>
      ))}
    </svg>
  );
}

function Donut({ percent }: { percent: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 140 140" style={{ width: 140, height: 140 }} role="img" aria-label={`${percent}% occupied`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e8ecf5" strokeWidth="16" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="#ed0000" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(c * percent) / 100} ${c}`} transform="rotate(-90 70 70)" />
      <text x="70" y="68" textAnchor="middle" style={{ font: "750 26px var(--font-manrope), sans-serif", fill: "#25365f" }}>{percent}%</text>
      <text x="70" y="88" textAnchor="middle" style={{ font: "600 11px var(--font-dm-sans), sans-serif", fill: "#7a86a3" }}>occupied</text>
    </svg>
  );
}

type Activity = { icon: AdminIconName; title: string; text: string; at: string };

const ago = (iso: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
};

export default async function DashboardPage() {
  await connection();
  const client = db();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const monthStart = (back: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
  const since = monthStart(11).toISOString();
  const head = (table: string) => client.from(table).select("*", { count: "exact", head: true });

  const [posts, types, pages, payments, ledger, rentalsRes, waiting, newMessages, pending, tasksDue, customersCount, recentPayments, recentRentals, recentMessages, credits] = await Promise.all([
    getPosts(),
    getUnitTypes(),
    getPages(),
    client.from("payments").select("amount_cents,created_at").gte("created_at", since).limit(10000).then((r) => r.data ?? []),
    client.from("ledger_entries").select("customer_id,amount_cents,tax_cents,paid_cents").limit(20000).then((r) => r.data ?? []),
    client.from("rentals").select("monthly_rent_cents").is("ended_on", null).eq("confirmed", true).then((r) => r.data ?? []),
    head("waiting_list").eq("status", "waiting").then((r) => r.count ?? 0),
    head("contact_messages").eq("status", "new").then((r) => r.count ?? 0),
    head("rentals").eq("confirmed", false).is("ended_on", null).then((r) => r.count ?? 0),
    head("tasks").is("done_at", null).or(`due_on.is.null,due_on.lte.${today}`).then((r) => r.count ?? 0),
    head("customers").eq("archived", false).then((r) => r.count ?? 0),
    client.from("payments").select("amount_cents,method,created_at,customers(full_name)").order("created_at", { ascending: false }).limit(4).then((r) => r.data ?? []),
    client.from("rentals").select("unit_name,created_at,customers(full_name)").order("created_at", { ascending: false }).limit(4).then((r) => r.data ?? []),
    client.from("contact_messages").select("name,created_at").order("created_at", { ascending: false }).limit(3).then((r) => r.data ?? []),
    client.from("customers").select("credit_cents").gt("credit_cents", 0).then((r) => r.data ?? []),
  ]);

  // Payments received per month for the last 12 months.
  const months = Array.from({ length: 12 }, (_, i) => {
    const start = monthStart(11 - i);
    return { key: start.toISOString().slice(0, 7), label: start.toLocaleString("en-US", { month: "short", timeZone: "UTC" }), cents: 0 };
  });
  for (const payment of payments) {
    const entry = months.find((month) => month.key === payment.created_at.slice(0, 7));
    if (entry) entry.cents += payment.amount_cents;
  }
  const thisMonth = months[11].cents;
  const lastMonth = months[10].cents;
  const change = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  // Occupancy from the units.
  const declared = types.reduce((sum, type) => sum + type.units, 0);
  const vacant = types.reduce((sum, type) => sum + type.vacant, 0);
  const totalUnits = Math.max(declared, vacant);
  const occupancy = totalUnits > 0 ? Math.round(((totalUnits - vacant) / totalUnits) * 100) : 0;

  // What customers owe.
  const owedBy = new Map<number, number>();
  for (const entry of ledger) owedBy.set(entry.customer_id, (owedBy.get(entry.customer_id) ?? 0) + entry.amount_cents + entry.tax_cents - entry.paid_cents);
  const owing = [...owedBy.values()].filter((owed) => owed > 0);
  const owedCents = owing.reduce((sum, owed) => sum + owed, 0);
  const rentRoll = rentalsRes.reduce((sum, rental) => sum + rental.monthly_rent_cents, 0);
  const creditCents = credits.reduce((sum, row) => sum + row.credit_cents, 0);

  const activity: Activity[] = [
    ...recentPayments.map((p) => ({ icon: "money" as const, title: "Payment received", text: `${(p.customers as unknown as { full_name: string } | null)?.full_name ?? "Customer"}, ${formatCents(p.amount_cents)} (${p.method})`, at: p.created_at })),
    ...recentRentals.map((r) => ({ icon: "users" as const, title: "New rental", text: `${(r.customers as unknown as { full_name: string } | null)?.full_name ?? "Customer"}, unit ${r.unit_name}`, at: r.created_at })),
    ...recentMessages.map((m) => ({ icon: "mail" as const, title: "Website message", text: `From ${m.name}`, at: m.created_at })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  const attention: { icon: AdminIconName; title: string; text: string; value: number; href: string }[] = [
    { icon: "tasks", title: "Tasks due", text: "Open tasks due today or earlier", value: tasksDue, href: "/admin/tasks" },
    { icon: "users", title: "Reservations to confirm", text: 'Units rented online with "Rent Now"', value: pending, href: "/admin/reservations" },
    { icon: "mail", title: "New messages", text: "Website contact form messages", value: newMessages, href: "/admin/contact_messages" },
    { icon: "clock", title: "Waiting list", text: "People waiting for a unit to open", value: waiting, href: "/admin/waiting_customers" },
    { icon: "money", title: "Customers with a balance", text: "Accounts with an amount due", value: owing.length, href: "/admin/customers?filter=balance" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How the facility is doing and what needs attention today."
        actions={
          <>
            <LinkButton href="/admin/reports?type=all" icon="chart">All reports</LinkButton>
            <LinkButton href="/admin/billing_run" primary icon="money">Monthly billing</LinkButton>
          </>
        }
      />

      <div className="adm-grid cols-4">
        <StatCard
          label="Received this month"
          value={formatCents(thisMonth)}
          icon="money"
          tone="red"
          delta={change === null ? undefined : { value: `${Math.abs(change)}%`, up: change >= 0 }}
          hint={change === null ? "payments recorded" : "vs. last month"}
        />
        <StatCard label="Occupancy" value={`${occupancy}%`} icon="box" tone="green" hint={`${vacant} of ${totalUnits} units vacant`} />
        <StatCard label="Awaiting payment" value={formatCents(owedCents)} icon="clock" tone="amber" hint={`${owing.length} customers with a balance`} />
        <StatCard label="Monthly rent roll" value={formatCents(rentRoll)} icon="users" hint={`${rentalsRes.length} active rentals, ${customersCount} customers`} />
      </div>

      <div className="adm-split">
        <Card title="Payments received" subtitle="Last 12 months">
          <RevenueChart months={months} />
        </Card>
        <Card title="Occupancy" subtitle="Units rented right now">
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <Donut percent={occupancy} />
            <div className="adm-grid" style={{ gap: 10, flex: 1, minWidth: 140 }}>
              <div><strong>{waiting}</strong><br /><span className="adm-stat-hint">on the waiting list</span></div>
              <div><strong>{formatCents(creditCents)}</strong><br /><span className="adm-stat-hint">credit on accounts</span></div>
              <div><strong>{pending}</strong><br /><span className="adm-stat-hint">reservations to confirm</span></div>
            </div>
          </div>
        </Card>
      </div>

      <div className="adm-grid cols-3">
        <Card title="Needs attention">
          <ul className="adm-list">
            {attention.map((item) => (
              <li key={item.title}>
                <span className="adm-dot"><AdminIcon name={item.icon} size={16} /></span>
                <div>
                  <b><Link href={item.href}>{item.title}</Link></b>
                  <span>{item.text}</span>
                </div>
                <em>{item.value}</em>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent activity">
          {activity.length === 0 ? (
            <p className="adm-stat-hint">Nothing yet. Payments, new rentals and website messages appear here.</p>
          ) : (
            <ul className="adm-list">
              {activity.map((item) => (
                <li key={`${item.title}-${item.at}-${item.text}`}>
                  <span className="adm-dot"><AdminIcon name={item.icon} size={16} /></span>
                  <div><b>{item.title}</b><span>{item.text}</span></div>
                  <em style={{ color: "#7a86a3", fontWeight: 500 }}>{ago(item.at)}</em>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Your website" subtitle="Live content you can edit here">
          <ul className="adm-list">
            <li>
              <span className="adm-dot"><AdminIcon name="file" size={16} /></span>
              <div><b><Link href="/admin/website_pages">Pages</Link></b><span>Titles, descriptions, menu labels</span></div>
              <em>{pages.length}</em>
            </li>
            <li>
              <span className="adm-dot"><AdminIcon name="edit" size={16} /></span>
              <div><b><Link href="/admin/blog_posts">Blog posts</Link></b><span>Newest: {posts[0]?.title}</span></div>
              <em>{posts.length}</em>
            </li>
            <li>
              <span className="adm-dot"><AdminIcon name="box" size={16} /></span>
              <div><b><Link href="/admin/unit_types">Unit types on Rent page</Link></b><span>Prices and availability</span></div>
              <em>{types.filter((type) => type.onWebsite).length}</em>
            </li>
            <li>
              <span className="adm-dot"><AdminIcon name="globe" size={16} /></span>
              <div><b><Link href="/" target="_blank">View site</Link></b><span>Opens the public website</span></div>
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
