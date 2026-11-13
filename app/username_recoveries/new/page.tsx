import type { Metadata } from "next";
import { PageBanner } from "@/app/components/PageBanner";
import { PageShell } from "@/app/components/PageShell";
import { RecoveryForm } from "./RecoveryForm";

export const metadata: Metadata = {
  title: { absolute: "Forgot your username? | A&L Self Storage" },
  robots: { index: false, follow: true },
};

export default function UsernameRecoveryPage() {
  return (
    <PageShell>
      <PageBanner as="h1" title="Forgot your username?" eyebrow="MAKE A PAYMENT / LOGIN">
        <p className="page-intro">Enter the email address on your account and we&apos;ll send your username.</p>
      </PageBanner>
      <section className="section inner">
        <div className="wrap auth-wrap">
          <div className="panel auth-panel">
            <RecoveryForm />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
