import { isAdmin } from "@/lib/admin/auth";
import { csvOf, defaultRange, reportFor } from "@/lib/admin/reports";

// Downloads a report as a CSV file (opens in Excel or Google Sheets).
export async function GET(request: Request, { params }: RouteContext<"/admin/reports/[report]/export">) {
  if (!(await isAdmin())) return new Response("Sign in required", { status: 401 });
  const { report: slug } = await params;
  const report = reportFor(slug);
  if (!report) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const range = defaultRange();
  const valid = (value: string | null, fallback: string) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback);
  const result = await report.run({ from: valid(url.searchParams.get("from"), range.from), to: valid(url.searchParams.get("to"), range.to) });
  return new Response(csvOf(result), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.slug}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
