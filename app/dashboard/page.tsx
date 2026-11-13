import Link from "next/link";
import { PortalPage, portalMetadata } from "@/app/components/PortalPage";
import { Icon } from "@/app/components/Icon";
import { getBilling, money } from "@/lib/billing";
import { getSettings, telHref } from "@/lib/content";
import { db } from "@/lib/db";
import type { Tenant } from "@/lib/tenant/session";

export const metadata = portalMetadata("Dashboard");

async function Dashboard({ tenant, searchParams }: { tenant: Tenant; searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const justRented = (await searchParams).rented === "1";
  const [billing, settings, { data: rentals }] = await Promise.all([
    getBilling(tenant.id),
    getSettings(),
    db()
      .from("rentals")
      .select("id,unit_name,monthly_rent_cents,started_on,ended_on,confirmed")
      .eq("customer_id", tenant.id)
      .order("started_on", { ascending: false }),
  ]);
  const active = (rentals ?? []).filter((rental) => !rental.ended_on);
  const pending = active.filter((rental) => rental.confirmed === false);
  const address = [tenant.address, tenant.city, `${tenant.state} ${tenant.zip}`.trim()].filter(Boolean).join(", ");

  return (
    <>
      {justRented && pending[0] && (
        <p className="form-note ok account-banner" role="status">
          Your unit is reserved! Unit {pending[0].unit_name} is held for you starting {pending[0].started_on}. Your first
          month&apos;s rent ({money(pending[0].monthly_rent_cents)}) is due to complete the rental. Call the office at{" "}
          <a href={telHref(settings.phone)}>{settings.phone}</a> or stop by to pay. We&apos;ll confirm your rental shortly.
        </p>
      )}
      <div className="portal-grid">
        <div className="portal-side">
          <section className="pcard">
            <h2 className="pcard-head">Contact Info</h2>
            <dl className="pcard-body pinfo">
              <div><dt><Icon name="person" />Name</dt><dd>{tenant.fullName}</dd></div>
              <div><dt><Icon name="mail" />Email</dt><dd>{tenant.email || "—"}</dd></div>
              <div><dt><Icon name="phone" />Phone</dt><dd>{tenant.phone || "—"}</dd></div>
              <div><dt><Icon name="phone" />Cell Phone</dt><dd>{tenant.cellPhone || "—"}</dd></div>
              <div><dt><Icon name="pin" />Address</dt><dd>{address || "—"}</dd></div>
            </dl>
            <h2 className="pcard-head">Balance</h2>
            <table className="pcard-body pbalance">
              <tbody>
                <tr><th scope="row">Outstanding</th><td>{money(billing.outstandingCents)}</td></tr>
                <tr><th scope="row">Credit</th><td>{money(billing.creditCents)}</td></tr>
                <tr><th scope="row">Balance</th><td>{money(billing.balanceCents)}</td></tr>
              </tbody>
            </table>
            <div className="pcard-foot">
              <Link className="button primary" href="/statement">Make a Payment</Link>
            </div>
          </section>
        </div>
        <div className="portal-main">
          <section className="pcard">
            <h2 className="pcard-head">Your Rentals</h2>
            <div className="pcard-body">
              {active.length === 0 ? (
                <p className="account-note">
                  You have no active rentals. <Link href="/rentals">Rent a unit</Link>
                </p>
              ) : (
                <ul className="account-list">
                  {active.map((rental) => (
                    <li key={rental.id}>
                      <strong>Unit {rental.unit_name}</strong>
                      <span>
                        {money(rental.monthly_rent_cents)} / month
                        {rental.confirmed === false && <em className="account-pending"> · Awaiting confirmation</em>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
          {billing.charges.length > 0 && (
            <section className="pcard">
              <h2 className="pcard-head">Amount Due</h2>
              <div className="pcard-body">
                <ul className="account-list">
                  {billing.charges.slice(0, 5).map((charge) => (
                    <li key={charge.id}>
                      <strong>{charge.item}</strong>
                      <span>{money(charge.dueCents)} · {charge.date}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pcard-foot">
                <Link className="button outline" href="/statement">View statement</Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <PortalPage title="Dashboard" active="/dashboard">
      {(tenant) => <Dashboard tenant={tenant} searchParams={searchParams} />}
    </PortalPage>
  );
}
