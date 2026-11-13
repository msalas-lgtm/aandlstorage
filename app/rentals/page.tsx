import Image from "next/image";
import Link from "next/link";
import { PortalPage, portalMetadata } from "@/app/components/PortalPage";
import { UnitTypeCards } from "@/app/components/UnitTypeCards";
import { getSettings, getUnitTypes, telHref } from "@/lib/content";
import { money } from "@/lib/billing";
import { db } from "@/lib/db";

export const metadata = portalMetadata("Rent Storage");

type Rental = {
  id: number;
  unit_name: string;
  monthly_rent_cents: number;
  started_on: string;
  ended_on: string | null;
  confirmed: boolean;
  unit_types: { name: string; description: string; image_path: string } | null;
};

export default function RentalsPage() {
  return (
    <PortalPage title="Rent Storage" active="/rentals">
      {async (tenant) => {
        const [{ data }, units, settings] = await Promise.all([
          db()
            .from("rentals")
            .select("id,unit_name,monthly_rent_cents,started_on,ended_on,confirmed,unit_types(name,description,image_path)")
            .eq("customer_id", tenant.id)
            .order("started_on", { ascending: false }),
          getUnitTypes(),
          getSettings(),
        ]);
        const rentals = (data ?? []) as unknown as Rental[];
        const current = rentals.filter((rental) => !rental.ended_on);
        const past = rentals.filter((rental) => rental.ended_on);
        const available = units.filter((unit) => unit.onWebsite);

        return (
          <div className="portal-stack">
            <section className="pcard">
              <h2 className="pcard-head">Your Storage Units</h2>
              <div className="pcard-body">
                {current.length === 0 ? (
                  <div className="rented-none">
                    <strong>You aren&apos;t renting a storage unit yet.</strong>
                    <p>
                      Pick a size below to rent one online, or call the office at{" "}
                      <a href={telHref(settings.phone)}>{settings.phone}</a>.
                    </p>
                  </div>
                ) : (
                  <ul className="rented-list">
                    {current.map((rental) => (
                      <li key={rental.id} className="rented-item">
                        {rental.unit_types?.image_path && (
                          <Image src={rental.unit_types.image_path} alt="" width={96} height={96} sizes="96px" />
                        )}
                        <div className="rented-info">
                          <h3>Unit {rental.unit_name}</h3>
                          <p className="rented-sub">{rental.unit_types?.name ?? "Storage unit"}</p>
                          {rental.unit_types?.description && <p>{rental.unit_types.description}</p>}
                          <dl className="rented-facts">
                            <div><dt>Monthly rent</dt><dd>{money(rental.monthly_rent_cents)}</dd></div>
                            <div><dt>Move-in</dt><dd>{rental.started_on}</dd></div>
                          </dl>
                        </div>
                        <span className={rental.confirmed ? "rented-badge ok" : "rented-badge wait"}>
                          {rental.confirmed ? "Active" : "Awaiting confirmation"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {current.some((rental) => !rental.confirmed) && (
                <div className="pcard-foot pcard-foot-left">
                  <span className="account-note" style={{ margin: 0 }}>
                    Your unit is held for you. The office confirms it once the first month&apos;s rent is paid.
                  </span>
                  <Link className="button primary" href="/statement">View statement</Link>
                </div>
              )}
            </section>

            {past.length > 0 && (
              <section className="pcard">
                <h2 className="pcard-head">Past Rentals</h2>
                <div className="pcard-body">
                  <ul className="account-list">
                    {past.map((rental) => (
                      <li key={rental.id}>
                        <strong>Unit {rental.unit_name}</strong>
                        <span>{rental.started_on} to {rental.ended_on}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            <section>
              <h2 className="portal-subhead">{current.length > 0 ? "Rent another unit" : "Available units"}</h2>
              <UnitTypeCards units={available} />
            </section>
          </div>
        );
      }}
    </PortalPage>
  );
}
