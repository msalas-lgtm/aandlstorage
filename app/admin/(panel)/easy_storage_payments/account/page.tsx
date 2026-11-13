import { connection } from "next/server";
import { saveSettingsAction } from "../../../actions";
import { AdminForm } from "../../../AdminForm";
import { Badge, Card, Notice, PageHeader } from "../../../ui";
import { PAYMENT_METHODS, getPaymentMethods } from "@/lib/content";

export default async function PaymentProcessingPage() {
  await connection();
  const accepted = new Set((await getPaymentMethods()).map(([value]) => value as string));
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <>
      <PageHeader title="Payment Processing" description="How you take payments, and the status of online card payments." />
      <Card title="Online card payments">
        <p style={{ margin: "0 0 12px" }}>
          Status: {stripeReady ? <Badge tone="green">Stripe connected</Badge> : <Badge tone="gray">Not connected</Badge>}
        </p>
        <p className="adm-stat-hint">
          {stripeReady
            ? "A Stripe key is set on the server."
            : "Customers can't pay by card on the website yet. Until a Stripe account is connected, customers pay at the office and you record the payment under Make Customer Payment."}
        </p>
      </Card>
      <Card title="Payment methods you accept" subtitle="These are the choices offered when you record a payment.">
        <AdminForm action={saveSettingsAction} submitLabel="Update Settings">
          <input type="hidden" name="section" value="payments" />
          <div className="adm-fields">
            {PAYMENT_METHODS.map(([value, label]) => (
              <label className="adm-check" key={value} htmlFor={`m-${value}`}>
                <input id={`m-${value}`} name={`method_${value}`} type="checkbox" defaultChecked={accepted.has(value)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </AdminForm>
      </Card>
      <Notice>Payments you record apply to the oldest charges first, and any extra becomes credit on the customer&apos;s account.</Notice>
    </>
  );
}
