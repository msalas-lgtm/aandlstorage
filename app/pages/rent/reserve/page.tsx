import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageBanner } from "@/app/components/PageBanner";
import { PageShell } from "@/app/components/PageShell";
import { bookingWindow } from "@/lib/booking";
import { getRules, getSettings, getUnitTypes, telHref } from "@/lib/content";
import { getCurrentTenant } from "@/lib/tenant/session";
import { RentForm } from "./RentForm";

export const metadata: Metadata = {
  title: { absolute: "Rent This Unit | A&L Self Storage" },
  robots: { index: false, follow: true },
};

async function ReserveBody({ searchParams }: { searchParams: PageProps<"/pages/rent/reserve">["searchParams"] }) {
  await connection();
  const raw = (await searchParams).unit_type_id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  // Signed-in customers rent from their own dashboard, with no username or password to enter.
  if (await getCurrentTenant()) redirect(`/rentals/rent${id ? `?unit_type_id=${id}` : ""}`);
  const [units, settings, rules] = await Promise.all([getUnitTypes(), getSettings(), getRules()]);
  const unit = units.find((type) => type.id === id && type.onWebsite);

  if (!unit) {
    return (
      <div className="panel">
        <h4>Choose a unit size</h4>
        <p>Please pick a unit size on the Rent page first.</p>
        <p>
          <Link className="button primary" href="/pages/rent">
            See available units
          </Link>
        </p>
      </div>
    );
  }

  if (!rules.onlineRentals) {
    return (
      <div className="panel">
        <h4>Online rentals are paused</h4>
        <p>
          Please call the office at <a href={telHref(settings.phone)}>{settings.phone}</a> to rent a unit.
        </p>
      </div>
    );
  }

  if (unit.vacant === 0) {
    return (
      <div className="panel">
        <h4>{unit.name} is full right now</h4>
        <p>Join the waiting list and we&apos;ll contact you as soon as one opens up.</p>
        <p>
          <Link className="button primary" href={`/waiting_list?unit_type_id=${unit.id}`}>
            Join the Waiting List
          </Link>
        </p>
      </div>
    );
  }

  const { minDate, maxDate } = bookingWindow(rules.moveInWindowDays);

  return (
    <div className="contact-grid">
      <div className="panel prose">
        <h4>{unit.name}</h4>
        <p>
          <strong>{unit.price.replace(/\.00$/, "")}</strong> / month
          {unit.note && <> · <strong>{unit.note}</strong></>}
        </p>
        {unit.description && <p>{unit.description}</p>}
        <p>
          Fill in your details and we&apos;ll reserve a unit for you right away and create your account. Your first
          month&apos;s rent ({unit.price.replace(/\.00$/, "")}) is due to complete the rental. Online payments are coming soon,
          so please pay at the office or call <a href={telHref(settings.phone)}>{settings.phone}</a>.
        </p>
      </div>
      <div className="panel">
        <RentForm unitTypeId={unit.id} minDate={minDate} maxDate={maxDate} />
      </div>
    </div>
  );
}

export default function ReservePage({ searchParams }: PageProps<"/pages/rent/reserve">) {
  return (
    <PageShell>
      <PageBanner as="h1" title="Rent This Unit" />
      <section className="section inner">
        <div className="wrap">
          <Suspense fallback={<div className="panel" />}>
            <ReserveBody searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </PageShell>
  );
}
