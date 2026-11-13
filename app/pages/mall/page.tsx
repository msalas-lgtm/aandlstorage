import type { Metadata } from "next";
import { PageBanner } from "@/app/components/PageBanner";
import { PageShell } from "@/app/components/PageShell";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/pages/mall");
}

export default function MallPage() {
  return (
    <PageShell>
      <PageBanner as="h1" title="Mall At A&L Self Storage">
        <p className="page-intro">
          For your convenience, located directly next door to A&amp;L Self
          Storage in Arlington, NY is a small strip-mall containing Cuttin&apos;
          Corner Hair Studio, Organic Matter, and Empire Fuel. See below a brief
          description of each business and if interested, how to find them
          online and how to contact them. Thank you!
        </p>
      </PageBanner>

      <section className="section inner">
        <div className="wrap business-grid">
          <article className="business">
            <h4>Cuttin&apos; Corner Hair Studio</h4>
            <p>
              Full service hair and beauty salon, featuring hair care &amp; hair
              cutting for the entire family. Have any questions? Give them a
              call at (845) 473-2134 or visit their{" "}
              <a href="https://www.facebook.com/Cuttin-Corner-630965760275791/">
                Facebook page
              </a>{" "}
              to learn more
            </p>
          </article>
          <article className="business">
            <h4>Organic Matters</h4>
            <p>
              Fine gardening firm that offers design, installation, and
              stewardship of sustainable landscapes in the Hudson Valley. Their
              mission is to create engaging outdoor spaces that thrive on their
              own, with minimal need for maintenance. Please feel free to call
              them at (845) 483-0349 or visit their{" "}
              <a href="https://organicmattersgardening.com/">website</a> to
              learn more.
            </p>
          </article>
          <article className="business">
            <h4>Empire Fuel</h4>
            <p>
              They offer high quality home heating fuel and guarantee the lowest
              and most competitive price. Senior citizen and quantity discounts
              available! Give them a call at (845) 297-8007 or (845) 691-2662,
              or visit their{" "}
              <a href="http://www.empirefuelny.com/">website</a> to learn more.
            </p>
          </article>
        </div>
      </section>
    </PageShell>
  );
}
