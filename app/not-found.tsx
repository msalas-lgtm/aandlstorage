import Link from "next/link";
import { Icon } from "./components/Icon";
import { PageBanner } from "./components/PageBanner";
import { PageShell } from "./components/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <PageBanner title="Page not found" eyebrow="ERROR 404">
        <p className="page-intro">
          We couldn&apos;t find the page you were looking for.
        </p>
      </PageBanner>
      <section className="section inner">
        <div className="wrap not-found-actions">
          <Link className="button primary" href="/">
            Back to Home
            <Icon name="arrow" />
          </Link>
          <Link className="button outline" href="/pages/rent">
            Rent Storage Units Online
            <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
