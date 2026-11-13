import Link from "next/link";
import { AdminIcon } from "../../AdminIcon";
import { Card, PageHeader } from "../../ui";
import { REPORTS, REPORT_TYPES } from "@/lib/admin/reports";

// Report catalog, filtered by the ?type= tabs. Every report is computed from your real data.
export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const { type: raw } = await searchParams;
  const type = typeof raw === "string" && REPORT_TYPES.some((entry) => entry.type === raw) ? raw : "all";
  const current = REPORT_TYPES.find((entry) => entry.type === type)!;
  const list = REPORTS.filter((report) => type === "all" || report.type === type);

  return (
    <>
      <PageHeader title="Reports" description="Financial, customer, facility and payment reports, computed from your live data." />
      <div className="adm-actions">
        {REPORT_TYPES.map((entry) => (
          <Link key={entry.type} href={`/admin/reports?type=${entry.type}`} className={`adm-btn${entry.type === type ? " is-primary" : ""}`}>
            {entry.label}
          </Link>
        ))}
      </div>
      <Card title={current.label} subtitle={`${list.length} reports`}>
        <div className="adm-grid cols-3">
          {list.map((report) => (
            <Link key={report.slug} href={`/admin/reports/${report.slug}`} className="adm-miniitem">
              <span className="adm-dot" style={{ width: 34, height: 34, borderRadius: 10, background: "#eaeef7", display: "grid", placeItems: "center", flex: "none" }}>
                <AdminIcon name="chart" size={16} />
              </span>
              <div>
                <strong>{report.name}</strong>
                <p>{report.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
