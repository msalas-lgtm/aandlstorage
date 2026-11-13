import Link from "next/link";
import { PortalPage, portalMetadata } from "@/app/components/PortalPage";
import { RequestForm } from "@/app/requests/RequestForm";
import { submitWaitingListAsCustomer } from "@/app/requests/actions";
import { getUnitTypes } from "@/lib/content";

export const metadata = portalMetadata("Waiting List");

// The customer's own waiting-list page: they're already signed in, so there's no name or email to fill in.
export default function WaitingListAsCustomerPage({ searchParams }: PageProps<"/rentals/waiting_list">) {
  return (
    <PortalPage title="Rent Storage" active="/rentals">
      {async (tenant) => {
        const raw = (await searchParams).unit_type_id;
        const id = Number(Array.isArray(raw) ? raw[0] : raw);
        const unit = (await getUnitTypes()).find((type) => type.id === id && type.onWebsite);
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
        return (
          <section className="pcard">
            <h2 className="pcard-head">Join the Waiting List: {unit.name}</h2>
            <div className="pcard-body">
              <p>
                <strong>{unit.price.replace(/\.00$/, "")}</strong> / month
              </p>
              {unit.description && <p>{unit.description}</p>}
              <p>This size is full right now. Tell us when you need it and we&apos;ll contact you as soon as one opens up.</p>
              <RequestForm
                action={submitWaitingListAsCustomer}
                unitTypeId={unit.id}
                dateLabel="When do you need it?"
                submitLabel="Join the Waiting List"
                signedInAs={tenant.fullName}
              />
            </div>
          </section>
        );
      }}
    </PortalPage>
  );
}
