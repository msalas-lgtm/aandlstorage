import { connection } from "next/server";
import { recordPaymentAction } from "../../../actions";
import { AdminForm } from "../../../AdminForm";
import { Card, Notice, PageHeader } from "../../../ui";
import { getPaymentMethods } from "@/lib/content";
import { db, unwrap } from "@/lib/db";

export default async function MakeCustomerPaymentPage() {
  await connection();
  const [methods, customers] = await Promise.all([
    getPaymentMethods(),
    db().from("customers").select("id,full_name,username").eq("archived", false).order("full_name").limit(1000).then((r) => unwrap(r, "customers")),
  ]);

  return (
    <>
      <PageHeader title="Make Customer Payment" description="Record a payment you received (cash, check, card at the counter or bank transfer)." />
      <Notice>
        The payment is applied to the customer&apos;s oldest charges first. Anything extra becomes credit. No receipt is emailed
        to the customer.
      </Notice>
      <Card>
        <AdminForm action={recordPaymentAction} submitLabel="Record payment" resetOnSuccess>
          <div className="adm-fields">
            <div className="adm-field is-wide">
              <label htmlFor="mp-customer">Customer</label>
              <select id="mp-customer" name="customerId" className="adm-select" defaultValue="" required>
                <option value="" disabled>Choose a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.full_name}</option>
                ))}
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="mp-amount">Amount received ($)</label>
              <input id="mp-amount" name="amount" className="adm-input" inputMode="decimal" required />
            </div>
            <div className="adm-field">
              <label htmlFor="mp-method">Paid by</label>
              <select id="mp-method" name="method" className="adm-select" defaultValue={methods[0]?.[0]}>
                {methods.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="adm-field is-wide">
              <label htmlFor="mp-note">Note</label>
              <input id="mp-note" name="note" className="adm-input" placeholder="Check number, receipt number, ..." />
            </div>
          </div>
        </AdminForm>
      </Card>
    </>
  );
}
