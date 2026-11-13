import { PortalPage, portalMetadata } from "@/app/components/PortalPage";
import { getSettings, telHref } from "@/lib/content";
import { db } from "@/lib/db";
import { stripeConfigured } from "@/lib/stripe";
import { AutopayControls } from "./AutopayControls";

export const metadata = portalMetadata("Recurring Billing");

const brandName = (brand: string) => (brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Card");

export default function BillingAccountsPage() {
  return (
    <PortalPage title="Recurring Billing" active="/billing_accounts">
      {async (tenant) => {
        const settings = await getSettings();
        const { data } = await db()
          .from("customers")
          .select("autopay_payment_method,autopay_brand,autopay_last4,autopay_enabled,autopay_failures,autopay_last_error")
          .eq("id", tenant.id)
          .maybeSingle();
        const hasCard = Boolean(data?.autopay_payment_method);
        const enabled = Boolean(data?.autopay_enabled);

        return (
          <section className="pcard pcard-wide">
            <h2 className="pcard-head">Recurring Billing</h2>
            <div className="pcard-body">
              {!stripeConfigured() ? (
                <p className="account-note">
                  Automatic payments aren&apos;t switched on yet. Until then, pay your rent online from your statement, at the
                  office, or call <a href={telHref(settings.phone)}>{settings.phone}</a>.
                </p>
              ) : hasCard ? (
                <>
                  <p>
                    <strong>
                      {brandName(data?.autopay_brand ?? "")} ending in {data?.autopay_last4}
                    </strong>{" "}
                    is saved on your account.
                  </p>
                  {enabled ? (
                    <p className="form-note ok">Automatic payments are <strong>on</strong>. Your rent and any fees you owe are charged to this card each month.</p>
                  ) : (
                    <p className="form-note error">
                      Automatic payments are <strong>off</strong>.
                      {data?.autopay_last_error ? " The last payment didn't go through, so we switched them off. Please replace your card or turn them back on." : " Turn them on below to pay your rent automatically."}
                    </p>
                  )}
                </>
              ) : (
                <p>You don&apos;t have a payment account on file, so your rent isn&apos;t paid automatically.</p>
              )}
              {stripeConfigured() && (
                <p className="account-note">
                  Your card details are entered on Stripe&apos;s secure form and are never stored on our site. By saving a card you
                  authorize A&amp;L Self Storage to charge it each month for the rent and fees you owe, until you turn automatic
                  payments off. You can turn them off or remove your card here at any time.
                </p>
              )}
            </div>
            {stripeConfigured() && <AutopayControls hasCard={hasCard} enabled={enabled} />}
          </section>
        );
      }}
    </PortalPage>
  );
}
