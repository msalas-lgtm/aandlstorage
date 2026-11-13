import { getBilling } from "@/lib/billing";
import { getCurrentTenant } from "@/lib/tenant/session";

const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const dollars = (cents: number) => (cents / 100).toFixed(2);

// The customer's statement as a CSV file (opens in Excel or Google Sheets).
export async function GET(request: Request) {
  const tenant = await getCurrentTenant();
  if (!tenant) return Response.redirect(new URL("/login", request.url), 307);

  const billing = await getBilling(tenant.id);
  const lines = [
    ["Date", "Item", "Description", "Amount", "Tax", "Due"].map(cell).join(","),
    ...billing.charges.map((charge) =>
      [charge.date, charge.item, charge.description, dollars(charge.amountCents), dollars(charge.taxCents), dollars(charge.dueCents)]
        .map(cell)
        .join(","),
    ),
    ["", "", "Subtotal", "", "", dollars(billing.outstandingCents)].map(cell).join(","),
    ["", "", "Credit", "", "", dollars(billing.creditCents)].map(cell).join(","),
    ["", "", "Amount Due", "", "", dollars(billing.amountDueCents)].map(cell).join(","),
  ];
  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="statement.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
