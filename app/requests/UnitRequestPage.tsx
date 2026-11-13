import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageBanner } from "@/app/components/PageBanner";
import { PageShell } from "@/app/components/PageShell";
import { getUnitTypes } from "@/lib/content";
import { getCurrentTenant } from "@/lib/tenant/session";
import { RequestForm } from "./RequestForm";
import type { RequestState } from "./actions";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  title: string;
  intro: string;
  dateLabel: string;
  submitLabel: string;
  action: (state: RequestState, data: FormData) => Promise<RequestState>;
};

async function RequestBody({ searchParams, intro, dateLabel, submitLabel, action }: Omit<Props, "title">) {
  const raw = (await searchParams).unit_type_id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  // Signed-in customers join from their own dashboard, with no contact details to retype.
  if (await getCurrentTenant()) redirect(`/rentals/waiting_list${id ? `?unit_type_id=${id}` : ""}`);
  const unit = (await getUnitTypes()).find((type) => type.id === id && type.onWebsite);

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

  return (
    <div className="contact-grid">
      <div className="panel prose">
        <h4>{unit.name}</h4>
        <p>
          <strong>{unit.price.replace(/\.00$/, "")}</strong> / month
        </p>
        {unit.description && <p>{unit.description}</p>}
        <p>{intro}</p>
      </div>
      <div className="panel">
        <RequestForm action={action} unitTypeId={unit.id} dateLabel={dateLabel} submitLabel={submitLabel} />
      </div>
    </div>
  );
}

export function UnitRequestPage({ title, ...rest }: Props) {
  return (
    <PageShell>
      <PageBanner as="h1" title={title} />
      <section className="section inner">
        <div className="wrap">
          <Suspense fallback={<div className="panel" />}>
            <RequestBody {...rest} />
          </Suspense>
        </div>
      </section>
    </PageShell>
  );
}
