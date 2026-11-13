import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { PageBanner } from "@/app/components/PageBanner";
import { PageShell } from "@/app/components/PageShell";
import { requireTenant, type Tenant } from "@/lib/tenant/session";
import { PortalNav } from "./PortalNav";

// Customer pages are private: never indexed.
export function portalMetadata(title: string): Metadata {
  return { title: { absolute: `A&L Self Storage: ${title}` }, robots: { index: false, follow: false } };
}

async function PortalBody({
  active,
  children,
}: {
  active: string;
  children: (tenant: Tenant) => Promise<ReactNode> | ReactNode;
}) {
  const tenant = await requireTenant();
  return (
    <>
      <PortalNav active={active} name={tenant.fullName} />
      <section className="section inner portal-section">
        <div className="wrap">{await children(tenant)}</div>
      </section>
    </>
  );
}

// Shared frame for the customer dashboard pages: site header and footer, a banner, the portal menu, and the page body.
export function PortalPage({
  title,
  active,
  children,
}: {
  title: string;
  active: string;
  children: (tenant: Tenant) => Promise<ReactNode> | ReactNode;
}) {
  return (
    <PageShell>
      <PageBanner as="h1" title={title} eyebrow="MAKE A PAYMENT / LOGIN" />
      <Suspense fallback={<div className="portal-bar" />}>
        <PortalBody active={active}>{children}</PortalBody>
      </Suspense>
    </PageShell>
  );
}
