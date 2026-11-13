import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/app/components/Icon";
import { PageBanner } from "@/app/components/PageBanner";
import { PageShell } from "@/app/components/PageShell";
import { getSettings, telHref } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/pages/map");
}

const MAP_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d11915.553254000362!2d-73.8718752!3d41.7013467!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0xf357940ba2f04ec5!2sA%26L%20Self%20Storage!5e0!3m2!1sen!2sus!4v1581711789866!5m2!1sen!2sus";

export default async function MapPage() {
  const settings = await getSettings();
  return (
    <PageShell>
      <PageBanner title="Directions to A&L Self Storage" />

      <section className="section inner">
        <div className="wrap map-grid">
          <div className="panel">
            <h4>Map to Our Self Storage Facility</h4>
            <iframe
              title="Map showing A and L Self Storage"
              src={MAP_EMBED_URL}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="panel prose">
            <h4>Conveniently Located Near You!</h4>
            <h1>Self Storage Facility in Arlington NY</h1>
            <p>
              A&amp;L Self Storage is conveniently located at 220 Overocker Rd,
              Arlington, NY 12603. The facility is located in a secure location
              while still being easy to find. The convenient location allows us
              to serve many of the neighboring towns, including Poughkipsee.
              We have an attractive storage facility with a variety of unit
              sizes, and state of the art security. Also, you can rent a self
              storage unit from us online hassle-free and have the convenience
              of Easy Pay.
            </p>
            <p>
              <Link className="button primary" href="/pages/rent">
                Rent Storage Online
                <Icon name="arrow" />
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section inner contact-trio">
        <div className="wrap">
          <div className="trio-grid">
            <div className="trio-card">
              <span className="trio-icon">
                <Icon name="phone" />
              </span>
              <h4>Call Us</h4>
              <h3>
                <a href={telHref(settings.phone)}>{settings.phone}</a>
              </h3>
            </div>
            <div className="trio-card">
              <span className="trio-icon">
                <Icon name="pin" />
              </span>
              <h4>Visit Us</h4>
              <h3>
                220 Overocker (Rt44)
                <br />
                Arlington, NY 12603
              </h3>
            </div>
            <div className="trio-card">
              <span className="trio-icon">
                <Icon name="mail" />
              </span>
              <h4>Email Us</h4>
              <h3>
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              </h3>
            </div>
          </div>
        </div>
      </section>

      <section className="section inner map-photo">
        <div className="wrap">
          <Image
            src="/uploads/widget_image/image/30116/web_pic.jpg"
            alt=""
            title=""
            width={600}
            height={760}
            sizes="(max-width: 700px) 100vw, 600px"
          />
        </div>
      </section>
    </PageShell>
  );
}
