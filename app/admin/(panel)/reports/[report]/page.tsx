import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminIcon } from "../../../AdminIcon";
import { PrintButton } from "../../../PrintButton";
import { Card, DataTable, LinkButton, PageHeader, StatCard } from "../../../ui";
import { defaultRange, reportFor } from "@/lib/admin/reports";

export default async function ReportPage({ params, searchParams }: PageProps<"/admin/reports/[report]">) {
  await connection();
  const { report: slug } = await params;
  const report = reportFor(slug);
  if (!report) notFound();

  const query = await searchParams;
  const range = defaultRange();
  const valid = (value: unknown, fallback: string) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback);
  const ctx = { from: valid(query.from, range.from), to: valid(query.to, range.to) };
  const result = await report.run(ctx);
  const exportHref = `/admin/reports/${report.slug}/export${report.range ? `?from=${ctx.from}&to=${ctx.to}` : ""}`;

  return (
    <>
      <PageHeader
        title={report.name}
        description={report.description}
        actions={
          <>
            <PrintButton label="Print" />
            <a className="adm-btn" href={exportHref}>
              <AdminIcon name="file" size={15} />
              Export CSV
            </a>
            <LinkButton href="/admin/reports">All reports</LinkButton>
          </>
        }
      />
      {report.range && (
        <Card>
          <form method="get" className="adm-filters">
            <div className="adm-field">
              <label htmlFor="r-from">From</label>
              <input id="r-from" name="from" type="date" className="adm-input" defaultValue={ctx.from} />
            </div>
            <div className="adm-field">
              <label htmlFor="r-to">To</label>
              <input id="r-to" name="to" type="date" className="adm-input" defaultValue={ctx.to} />
            </div>
            <button className="adm-btn is-primary" type="submit" style={{ marginTop: 22 }}>Load Report</button>
          </form>
        </Card>
      )}
      {result.summary && (
        <div className="adm-grid cols-3">
          {result.summary.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      )}
      <DataTable columns={result.columns} rows={result.rows} empty="Nothing to report for this period." footer={`${result.rows.length} rows`} />
    </>
  );
}
