import { PortalPage, portalMetadata } from "@/app/components/PortalPage";
import { getSettings, telHref } from "@/lib/content";

export const metadata = portalMetadata("Recurring Billing");

export default function BillingAccountsPage() {
  return (
    <PortalPage title="Recurring Billing" active="/billing_accounts">
      {async () => {
        const settings = await getSettings();
        return (
          <section className="pcard pcard-wide">
            <h2 className="pcard-head">Recurring Billing</h2>
            <div className="pcard-body">
              <p>You don&apos;t have a payment account on file, so your rent isn&apos;t paid automatically.</p>
              <p className="account-note">
                Automatic payments by card or bank account are coming soon. Until then, pay your rent at the office or call{" "}
                <a href={telHref(settings.phone)}>{settings.phone}</a>.
              </p>
            </div>
            <div className="pcard-foot">
              <button className="button primary" type="button" disabled title="Coming soon">
                Add Payment Account
              </button>
            </div>
          </section>
        );
      }}
    </PortalPage>
  );
}
