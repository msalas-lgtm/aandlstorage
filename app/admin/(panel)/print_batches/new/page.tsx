import { connection } from "next/server";
import { Card, Notice, PageHeader } from "../../../ui";
import { PrintButton } from "../../../PrintButton";
import { formatCents, getSettings } from "@/lib/content";
import { db, unwrap } from "@/lib/db";

type Customer = {
  id: number;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  credit_cents: number;
  archived: boolean;
  ledger_entries: { amount_cents: number; tax_cents: number; paid_cents: number }[];
  rentals: { unit_name: string; ended_on: string | null }[];
};
type Template = { id: number; name: string; subject: string; body: string };

const FILTERS = [
  ["balance", "Customers with a balance due"],
  ["active", "All active customers"],
] as const;

export default async function PrintLettersPage({ searchParams }: PageProps<"/admin/print_batches/new">) {
  await connection();
  const params = await searchParams;
  const client = db();
  const [templates, settings] = await Promise.all([
    client.from("letter_templates").select("*").order("name").then((r) => unwrap(r, "templates") as Template[]),
    getSettings(),
  ]);
  const templateId = Number(typeof params.template === "string" ? params.template : 0);
  const filter = FILTERS.some(([value]) => value === params.filter) ? (params.filter as string) : "balance";
  const template = templates.find((entry) => entry.id === templateId);

  let letters: { id: number; text: string; to: string[] }[] = [];
  if (template) {
    const customers = unwrap(
      await client
        .from("customers")
        .select("id,full_name,phone,address,city,state,zip,credit_cents,archived,ledger_entries(amount_cents,tax_cents,paid_cents),rentals(unit_name,ended_on)")
        .eq("archived", false)
        .order("full_name")
        .limit(2000),
      "customers",
    ) as unknown as Customer[];
    const today = new Date().toLocaleDateString("en-US", { dateStyle: "long", timeZone: "America/New_York" });
    letters = customers
      .map((customer) => {
        const outstanding = customer.ledger_entries.reduce((sum, entry) => sum + entry.amount_cents + entry.tax_cents - entry.paid_cents, 0);
        return { customer, outstanding };
      })
      .filter(({ outstanding, customer }) => (filter === "balance" ? outstanding - customer.credit_cents > 0 : true))
      .map(({ customer, outstanding }) => {
        const cityLine = [customer.city, `${customer.state} ${customer.zip}`.trim()].filter(Boolean).join(", ");
        const merge: Record<string, string> = {
          name: customer.full_name,
          address: [customer.address, cityLine].filter(Boolean).join(", "),
          unit: customer.rentals.filter((rental) => !rental.ended_on).map((rental) => rental.unit_name).join(", "),
          outstanding: formatCents(outstanding),
          credit: formatCents(customer.credit_cents),
          balance: formatCents(outstanding - customer.credit_cents),
          phone: settings.phone,
          facility: settings.facilityName,
          date: today,
        };
        const fill = (value: string) => value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => merge[key] ?? "");
        return {
          id: customer.id,
          text: fill(template.body),
          to: [customer.full_name, customer.address, cityLine].filter(Boolean),
          subject: fill(template.subject),
        };
      });
  }

  return (
    <>
      <div className="adm-noprint" style={{ display: "contents" }}>
        <PageHeader title="Print Letters" description="Print a letter template for your customers. Letters are printed and mailed or handed over, never emailed." />
        <Notice>This page only prepares printable letters. Nothing is emailed or texted to anyone.</Notice>
        <Card title="Choose a letter">
          <form method="get" className="adm-filters">
            <div className="adm-field">
              <label htmlFor="l-template">Template</label>
              <select id="l-template" name="template" className="adm-select" defaultValue={template?.id ?? ""} required>
                <option value="" disabled>{templates.length ? "Choose a template" : "No templates yet"}</option>
                {templates.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.name}</option>
                ))}
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="l-filter">Customers</label>
              <select id="l-filter" name="filter" className="adm-select" defaultValue={filter}>
                {FILTERS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <button className="adm-btn is-primary" type="submit" style={{ marginTop: 22 }}>Preview letters</button>
          </form>
        </Card>
      </div>
      {template && (
        <>
          <div className="adm-actions adm-noprint">
            <PrintButton label={`Print ${letters.length} ${letters.length === 1 ? "letter" : "letters"}`} />
          </div>
          {letters.length === 0 && <Notice>No customers match this filter.</Notice>}
          <div className="adm-letters">
            {letters.map((letter) => (
              <article className="adm-letter" key={letter.id}>
                <div className="letter-head">
                  {letter.to.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
                <div className="letter-body">{letter.text}</div>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
