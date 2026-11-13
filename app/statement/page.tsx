import { PortalPage, portalMetadata } from "@/app/components/PortalPage";
import { getBilling, money } from "@/lib/billing";
import { PayForm } from "./PayForm";

const NOTES: Record<string, string> = {
  paid: "Thank you. Your payment went through and will show on your statement in a moment. Refresh this page if the balance hasn't changed yet.",
  canceled: "Your payment was canceled and you were not charged.",
};

export const metadata = portalMetadata("Statement");

export default function StatementPage({ searchParams }: PageProps<"/statement">) {
  return (
    <PortalPage title="Statement" active="/statement">
      {async (tenant) => {
        const params = await searchParams;
        const note = NOTES[params.paid === "1" ? "paid" : params.canceled === "1" ? "canceled" : ""];
        const billing = await getBilling(tenant.id);
        return (
          <section className="pcard pcard-wide">
            <h2 className="pcard-head">Statement</h2>
            <div className="pcard-body">
              {note && <p className="form-note ok" role="status">{note}</p>}
              <p>
                To make a partial or full payment towards the balance below, enter an amount and click
                &quot;Proceed to Payment&quot;.
              </p>
              <div className="ptable-wrap">
                <table className="ptable">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Item</th>
                      <th scope="col">Description</th>
                      <th scope="col" className="num">Amount</th>
                      <th scope="col" className="num">Tax</th>
                      <th scope="col" className="num">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.charges.map((charge) => (
                      <tr key={charge.id}>
                        <td>{charge.date}</td>
                        <td>{charge.item}</td>
                        <td>{charge.description}</td>
                        <td className="num">{money(charge.amountCents)}</td>
                        <td className="num">{money(charge.taxCents)}</td>
                        <td className="num">{money(charge.dueCents)}</td>
                      </tr>
                    ))}
                    {billing.charges.length === 0 && (
                      <tr>
                        <td colSpan={6} className="ptable-empty">Nothing is due right now.</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr><th scope="row" colSpan={5}>Subtotal:</th><td className="num"><strong>{money(billing.outstandingCents)}</strong></td></tr>
                    <tr><td colSpan={5} className="num">Credit:</td><td className="num">{money(billing.creditCents)}</td></tr>
                    <tr><th scope="row" colSpan={5}>Amount Due:</th><td className="num"><strong>{money(billing.amountDueCents)}</strong></td></tr>
                  </tfoot>
                </table>
              </div>
              <p>
                An arbitrary payment will pay the amount towards as many due invoice line items as possible, in the
                order of oldest first. If there is any credit it will be applied first. Then if there is any remaining
                amount left over (or there is not enough to pay a line item in full) it will be added to the credit.
              </p>
            </div>
            <PayForm amountDue={(billing.amountDueCents / 100).toFixed(2)} />
          </section>
        );
      }}
    </PortalPage>
  );
}
