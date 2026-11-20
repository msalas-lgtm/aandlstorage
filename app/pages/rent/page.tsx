import { cleanHtml } from "@/lib/sanitize";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBanner } from "@/app/components/PageBanner";
import { JsonLd } from "@/app/components/JsonLd";
import { PageShell } from "@/app/components/PageShell";
import { UnitTypeCards } from "@/app/components/UnitTypeCards";
import defaults from "@/content/rent-page-content.json";
import { getPages, getUnitTypes } from "@/lib/content";
import { breadcrumbSchema, offerCatalogSchema } from "@/lib/seo-extra";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/pages/rent");
}

type RentContent = typeof defaults;

// Everything on this page comes from the admin dashboard: the unit types, prices, photos and
// availability (counted from the units table), plus the text blocks (Website > Pages > Rent).
async function LiveUnitCards() {
  const units = (await getUnitTypes()).filter((unit) => unit.onWebsite);
  return (
    <>
      <UnitTypeCards units={units} />
      <JsonLd data={offerCatalogSchema(units)} />
    </>
  );
}

export default async function RentPage() {
  const pages = await getPages();
  const saved = (pages.find((page) => page.path === "/pages/rent")?.content ?? {}) as Partial<RentContent>;
  const text: RentContent = { ...defaults, ...saved };

  return (
    <PageShell>
      <PageBanner title={text.bannerTitle}>
        <ol className="steps">
          {text.steps.map((step) => (
            <li key={step}>
              <h3>{step}</h3>
            </li>
          ))}
        </ol>
      </PageBanner>

      <section className="section inner">
        <div className="wrap">
          <div className="rent-intro prose">
            <h1>{text.heading}</h1>
            <p dangerouslySetInnerHTML={{ __html: cleanHtml(text.introHtml) }} />
          </div>

          <Suspense fallback={<div className="unit-grid" aria-busy="true" />}>
            <LiveUnitCards />
          </Suspense>
        </div>
      </section>

      <section className="section inner why-rent">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <h2>{text.whyHeading}</h2>
            </div>
          </div>
          <div className="why-grid">
            {text.why.map((block) => (
              <article key={block.title}>
                <h3>{block.title}</h3>
                <p dangerouslySetInnerHTML={{ __html: cleanHtml(block.html) }} />
              </article>
            ))}
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Rent Storage", path: "/pages/rent" }])} />
    </PageShell>
  );
}
