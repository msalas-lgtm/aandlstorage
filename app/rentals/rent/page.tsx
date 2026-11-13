import Link from "next/link";
import { PortalPage, portalMetadata } from "@/app/components/PortalPage";
import { bookingWindow } from "@/lib/booking";
import { getRules, getSettings, getUnitTypes, telHref } from "@/lib/content";
import { RentAsCustomerForm } from "./RentAsCustomerForm";

export const metadata = portalMetadata("Rent Another Unit");

// The customer's own "rent" page: same as the public one, but they're already signed in, so it only asks for a move-in date.
export default function RentAsCustomerPage({ searchParams }: PageProps<"/rentals/rent">) {
  return (
    <PortalPage title="Rent Storage" active="/rentals">
      {async () => {
        const raw = (await searchParams).unit_type_id;
        const id = Number(Array.isArray(raw) ? raw[0] : raw);
        const [units, settings, rules] = await Promise.all([getUnitTypes(), getSettings(), getRules()]);
        const unit = units.find((type) => type.id === id && type.onWebsite);

        if (!unit) {
          return (
            <section className="pcard">
              <h2 className="pcard-head">Choose a unit size</h2>
              <div className="pcard-body">
                <p>Please pick a unit size first.</p>
                <Link className="button primary" href="/rentals">See available units</Link>
              </div>
            </section>
          );
        }
        if (!rules.onlineRentals) {
          return (
            <section className="pcard">
              <h2 className="pcard-head">Online rentals are paused</h2>
              <div className="pcard-body">
                <p>Please call the office at <a href={telHref(settings.phone)}>{settings.phone}</a> to rent a unit.</p>
              </div>
            </section>
          );
        }
        if (unit.vacant === 0) {
          return (
            <section className="pcard">
              <h2 className="pcard-head">{unit.name} is full right now</h2>
              <div className="pcard-body">
                <p>Join the waiting list and we&apos;ll contact you as soon as one opens up.</p>
                <Link className="button primary" href={`/rentals/waiting_list?unit_type_id=${unit.id}`}>Join the Waiting List</Link>
              </div>
            </section>
          );
        }

        const { minDate, maxDate } = bookingWindow(rules.moveInWindowDays);
        return (
          <section className="pcard">
            <h2 className="pcard-head">Rent {unit.name}</h2>
            <div className="pcard-body">
              <p>
                <strong>{unit.price.replace(/\.00$/, "")}</strong> / month
                {unit.note && <> · <strong>{unit.note}</strong></>}
              </p>
              {unit.description && <p>{unit.description}</p>}
              <p>
                Choose your move-in date. This rental is added to your account, and the first month&apos;s rent
                ({unit.price.replace(/\.00$/, "")}) shows on your statement.
              </p>
              <RentAsCustomerForm unitTypeId={unit.id} minDate={minDate} maxDate={maxDate} />
            </div>
          </section>
        );
      }}
    </PortalPage>
  );
}
