import { connection } from "next/server";
import { Card, DataTable, LinkButton, PageHeader } from "../../../ui";
import { PrintButton } from "../../../PrintButton";
import { formatCents, getUnitTypes } from "@/lib/content";

// The first month is prorated from the move-in day to the end of the month; billing is on the 1st.
function quote(rentCents: number, start: string, discountCents: number) {
  const [year, month, day] = start.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const remaining = daysInMonth - day + 1;
  const prorated = day === 1 ? rentCents : Math.round((rentCents * remaining) / daysInMonth);
  const due = Math.max(0, prorated - discountCents);
  const next = new Date(Date.UTC(year, month, 1));
  return { prorated, due, remaining, daysInMonth, nextBill: next.toISOString().slice(0, 10) };
}

export default async function NewQuotePage({ searchParams }: PageProps<"/admin/quotes/new">) {
  await connection();
  const params = await searchParams;
  const types = (await getUnitTypes()).filter((type) => type.onWebsite);
  const today = new Date().toISOString().slice(0, 10);
  const typeId = Number(typeof params.type === "string" ? params.type : 0);
  const start = typeof params.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.start) ? params.start : today;
  const discount = Math.round(Number(typeof params.discount === "string" ? params.discount : 0) * 100) || 0;
  const type = types.find((entry) => entry.id === typeId);
  const result = type ? quote(type.priceCents, start, discount) : null;

  return (
    <>
      <PageHeader title="New Quote" description="Work out what a new customer would pay to move in on a given day." />
      <Card>
        <form method="get" className="adm-filters">
          <div className="adm-field">
            <label htmlFor="q-type">Unit type</label>
            <select id="q-type" name="type" className="adm-select" defaultValue={type?.id ?? ""} required>
              <option value="" disabled>Choose a size</option>
              {types.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name} ({entry.price.replace(/\.00$/, "")})</option>
              ))}
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="q-start">Move-in date</label>
            <input id="q-start" name="start" type="date" className="adm-input" defaultValue={start} />
          </div>
          <div className="adm-field">
            <label htmlFor="q-discount">Discount ($)</label>
            <input id="q-discount" name="discount" className="adm-input" inputMode="decimal" defaultValue={discount ? (discount / 100).toFixed(2) : ""} placeholder="0.00" />
          </div>
          <button className="adm-btn is-primary" type="submit" style={{ marginTop: 22 }}>Generate Quote</button>
        </form>
      </Card>
      {type && result && (
        <Card title={`Quote for ${type.name}`} subtitle={`Move-in ${start}`}>
          <DataTable
            columns={["Rent", "Prorated Rent", "Discount", "Total Due"]}
            rows={[[formatCents(type.priceCents), `${formatCents(result.prorated)} (${result.remaining} of ${result.daysInMonth} days)`, formatCents(discount), <strong key="t">{formatCents(result.due)}</strong>]]}
            footer={`Amount due every month starting ${result.nextBill}: ${formatCents(type.priceCents)}`}
          />
          <div className="adm-formbar adm-noprint">
            <PrintButton label="Print quote" />
            <LinkButton href="/admin/customer_profile_forms/new">New Customer</LinkButton>
          </div>
        </Card>
      )}
    </>
  );
}
