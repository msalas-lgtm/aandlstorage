import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageBanner } from "@/app/components/PageBanner";
import { PageShell } from "@/app/components/PageShell";
import { getPages } from "@/lib/content";
import { getCurrentTenant } from "@/lib/tenant/session";
import { LoginForm } from "./LoginForm";

// Same title as the live site's /login page.
export const metadata: Metadata = {
  title: { absolute: "A&L Self Storage: Log in" },
  alternates: { canonical: "https://www.aandlstorage.com/login" },
};

async function LoginBox() {
  if (await getCurrentTenant()) redirect("/dashboard");
  const pages = await getPages();
  const rentLabel = pages.find((page) => page.path === "/pages/rent")?.loginLinkText || "Not a customer yet? Rent Storage";
  return (
    <div className="panel auth-panel">
      <LoginForm rentLabel={rentLabel} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <PageShell>
      <PageBanner as="h1" title="Log in" eyebrow="MAKE A PAYMENT / LOGIN">
        <p className="page-intro">Sign in to see your account, your rentals and your balance.</p>
      </PageBanner>
      <section className="section inner">
        <div className="wrap auth-wrap">
          <Suspense fallback={<div className="panel auth-panel" />}>
            <LoginBox />
          </Suspense>
        </div>
      </section>
    </PageShell>
  );
}
