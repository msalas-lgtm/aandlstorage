import type { Metadata } from "next";
import { PageBanner } from "@/app/components/PageBanner";
import { PageShell } from "@/app/components/PageShell";
import { getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { ContactForm } from "./ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/pages/contact");
}

export default async function ContactPage() {
  const { email } = await getSettings();
  return (
    <PageShell>
      <PageBanner title="Contact Us" />

      <section className="section inner">
        <div className="wrap contact-grid">
          <div className="panel prose">
            <h4>We would love to hear from you!</h4>
            <h1>
              <strong>
                Self Storage Facility Serving Arlington, NY and Surrounding
                Areas
              </strong>
            </h1>
            <p>
              <b>A&amp;L Self Storage</b>
              <br />
              220 Overocker Rd. <br />
              Arlington, NY 12603
            </p>
            <p>
              <b>
                For Rentals &amp; Payments A&amp;L OFFICE{" "}
                <a href="tel:845485-5059">(845) 485-5059</a>
              </b>
            </p>
            <p>
              <strong>Email:</strong> <a href={`mailto:${email}`}>{email}</a>
              <br />
              <strong>Phone:</strong> <a href="tel:845485-5059">(845) 485-5059</a>
            </p>
          </div>
          <div className="panel">
            <ContactForm />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
