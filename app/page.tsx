import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalArrow, Icon, type IconName } from "./components/Icon";
import { PageShell } from "./components/PageShell";
import { getSettings, telHref } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { DIRECTIONS_URL, REVIEW_URL, SITE_URL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/");
}

const MAP_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d11915.553254000362!2d-73.8718752!3d41.7013467!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0xf357940ba2f04ec5!2sA%26L%20Self%20Storage!5e0!3m2!1sen!2sus!4v1573166562873!5m2!1sen!2sus";

const FEATURE_STRIP: { icon: IconName; label: string }[] = [
  { icon: "driveUp", label: "Drive-up Access" },
  { icon: "camera", label: "Digital Video Surveillance" },
  { icon: "card", label: "Online Bill Pay" },
  { icon: "box", label: "Variety of Unit Sizes Available" },
];

const PRICES = [
  { size: "Small", price: "60", cents: ".00", start: "Starting at", img: "small", n: "01", sizeClass: "size-0" },
  { size: "Medium", price: "115", cents: ".00", start: "Starting at", img: "medium", n: "02", sizeClass: "size-1" },
  { size: "Large", price: "150", cents: ".00", start: "Starting At", img: "large", n: "03", sizeClass: "size-2" },
];

const AMENITIES: { icon: IconName; label: string }[] = [
  { icon: "clock", label: "24-hour Access" },
  { icon: "person", label: "Great Customer Service" },
  { icon: "shield", label: "Onsite Security" },
  { icon: "camera", label: "Digital Video Surveillance" },
  { icon: "card", label: "Online Bill Pay" },
  { icon: "driveUp", label: "Drive-up Access" },
  { icon: "box", label: "Boxes & Supplies" },
  { icon: "grid", label: "Variety of Unit Sizes Available" },
  { icon: "shield", label: "Clean, Safe & Secure" },
];

const POSTS = [
  {
    href: "/blog/choosing-storage-unit",
    date: "Published on 2/3/2022",
    title: "How Do I Choose A Storage Unit?",
    body: "Finding a trustworthy storage unit is kind of like finding a trustworthy landlord, except you only really get to deal with the storage company once or twice when you sign up and move in. After that, you hopefully won't talk to them at all. You pay your rent, visit your storage unit when you need to get something or put something in, and that's all there is to it. However, there are some warning signs you should keep an eye out for to make sure your relationship with your storage company is a good one.",
  },
  {
    href: "/blog/Categorizestorage",
    date: "Published on 12/6/2021",
    title: "Categorizing Your Storage",
    body: "Self-Storage is a great solution for those who are running out of home-space to store all of their belongings. Truthfully, all of us have things that we cannot part with but we don’t have space for. If you can find a storage facility that is the right price, within close proximity, and where you know your items will be stored safely, it will be the solution to keeping & accessing your items whenever you need them.",
  },
];

function Arrow() {
  return <Icon name="arrow" />;
}

export default async function Home() {
  const settings = await getSettings();
  return (
    <PageShell>
      <link rel="canonical" href={`${SITE_URL}/`} />
      <section className="hero" id="home">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/assets/facility.jpg"
          aria-hidden="true"
        >
          <source src="/assets/hero.mp4" type="video/mp4" />
        </video>
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="dot" />
              A&amp;L SELF STORAGE
            </span>
            <h1>
              Self Storage Facility in{" "}
              <span>
                Arlington, NY
                <span className="underline" />
              </span>
            </h1>
            <h2>Affordable Self Storage Units Near Me in Arlington</h2>
            <p>
              Looking for self storage units near me? A &amp; L Storage in
              Poughkeepsie, NY offers a secure self storage facility with clean,
              affordable storage units and friendly service you can trust.
            </p>
            <div className="actions">
              <Link className="button primary" href="/pages/rent">
                Rent Storage Units Online
                <Arrow />
              </Link>
              <a className="text-link" href={REVIEW_URL}>
                Leave A Review <ExternalArrow />
              </a>
            </div>
            <div className="hero-note">
              <Icon name="shield" />
              Clean, Safe &amp; Secure
              <span />
              <Icon name="clock" />
              24-hour Access
            </div>
          </div>
          <div className="hero-visual">
            <div className="photo-frame">
              <Image
                src="/assets/facility.jpg"
                alt="A and L Self Storage facility with drive-up storage units and parking in Arlington, NY"
                width={659}
                height={435}
                sizes="(max-width: 900px) 100vw, 560px"
                priority
              />
            </div>
            <div className="photo-tag">
              <Icon name="pin" />
              <div>
                <strong>A&amp;L Self Storage</strong>
                <span>220 Overocker Rd, Arlington, NY 12603</span>
              </div>
              <a href="#directions" aria-label="Directions to A and L Self Storage">
                <ExternalArrow />
              </a>
            </div>
            <div className="visual-dots" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="feature-strip">
        <div className="wrap">
          {FEATURE_STRIP.map((item) => (
            <span key={item.label}>
              <Icon name={item.icon} />
              {item.label}
            </span>
          ))}
        </div>
      </section>

      <section className="section pricing" id="storage">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A&amp;L SELF STORAGE</span>
              <h2>
                Our Storage Unit <br />
                Pricing Guide
              </h2>
            </div>
            <div className="section-aside">
              <Icon name="pin" />
              <p>
                220 Overocker Rd, <br />
                Arlington, NY 12603
              </p>
            </div>
          </div>
          <div className="price-grid">
            {PRICES.map((unit) => (
              <article className="price-card" key={unit.size}>
                <div className={`unit-illustration ${unit.sizeClass} has-empty`}>
                  <Image
                    className="unit-empty"
                    src={`/assets/${unit.img}-storage-empty.png`}
                    alt=""
                    aria-hidden="true"
                    width={1536}
                    height={1024}
                    sizes="(max-width: 900px) 100vw, 420px"
                  />
                  <Image
                    src={`/assets/${unit.img}-storage.png`}
                    alt={`Illustration of a ${unit.size.toLowerCase()} storage unit inspired by the facility`}
                    width={1536}
                    height={1024}
                    sizes="(max-width: 900px) 100vw, 420px"
                  />
                  <span>{unit.n}</span>
                </div>
                <div className="price-content">
                  <h3>{unit.size} Units</h3>
                  <p>{unit.start}</p>
                  <div className="price">
                    <sup>$</sup>
                    {unit.price}
                    <small>{unit.cents}</small>
                  </div>
                  <Link className="button outline" href="/pages/rent">
                    See Units
                    <Arrow />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <p className="pricing-image-note">
            Storage illustrations are for visual reference.
          </p>
          <div className="pricing-contact">
            Phone: <a href={telHref(settings.phone)}>{settings.phone}</a>
            <span>|</span>
            Email: <a href={`mailto:${settings.email}`}>{settings.email}</a>
          </div>
        </div>
      </section>

      <section className="section about">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <span className="eyebrow">OUR SELF STORAGE FACILITY</span>
              <h2>
                Trusted Self Storage Units <br />
                &amp; Facility in Arlington, NY
              </h2>
            </div>
          </div>
          <div className="about-grid">
            <div className="about-photo">
              <Image
                src="/assets/facility-doors.jpg"
                alt="Row of orange roll-up storage unit doors at the A and L Self Storage facility in Arlington"
                width={1360}
                height={907}
                sizes="(max-width: 900px) 100vw, 600px"
              />
              <span>
                <Icon name="shield" />
                Clean, Safe &amp; Secure
              </span>
            </div>
            <div className="about-copy">
              <h3>Our Self Storage Facility</h3>
              <p>
                A&amp;L Self Storage takes pride in offering a simple and
                hassle-free self storage experience for all of our customers in
                Poughkeepsie &amp; Arlington, NY. We make sure our storage is
                clean, secure, and ready to rent. We also focus on offering a
                wide variety of storage sizes and types to make sure we can
                handle any self storage need that you may have. A&amp;L Self
                Storage also offers online rentals and online bill pay 24/7 to
                make your experience quick and easy.
              </p>
              <p>
                Feel free to look at our available{" "}
                <Link href="/pages/rent">storage units</Link> and give us a call
                if you have any questions or simply rent your storage right on
                the website.
              </p>
              <Link className="button primary" href="/pages/rent">
                Available Storage
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section amenities">
        <div className="wrap">
          <span className="eyebrow">A&amp;L SELF STORAGE</span>
          <h2>
            All The Convenience <br />
            And Security You Need
          </h2>
          <div className="amenity-grid">
            {AMENITIES.map((item, index) => (
              <div key={`${item.label}-${index}`}>
                <Icon name={item.icon} />
                <h3>{item.label}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section promise">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A&amp;L SELF STORAGE</span>
              <h2>Our Promise To You</h2>
            </div>
            <span className="promise-mark" aria-hidden="true">
              ✳
            </span>
          </div>
          <div className="promise-grid">
            <article>
              <span className="promise-icon">
                <Icon name="shield" />
              </span>
              <span className="number">01</span>
              <h3>Security</h3>
              <p>
                We take the security of our storage facility seriously, and our
                SSL secure website protects your personal information. Your
                property is our number one priority. You can rest assured that
                your property is protected and secure at A&amp;L Self Storage!
              </p>
            </article>
            <article>
              <span className="promise-icon">
                <Icon name="person" />
              </span>
              <span className="number">02</span>
              <h3>Customer Service</h3>
              <p>
                We are committed to providing you a clean, secure &amp;
                ready-to-rent self storage unit. Our friendly staff provides you
                with a great storage rental experience from start to finish.
              </p>
              <a className="text-link" href={REVIEW_URL}>
                Leave A Review <ExternalArrow />
              </a>
            </article>
            <article>
              <span className="promise-icon">
                <Icon name="clock" />
              </span>
              <span className="number">03</span>
              <h3>Convenience</h3>
              <p>
                Manage your storage unit from the convenience of your own home,
                24 hours a day and 7 days a week. Our website makes it quick and
                easy for you to manage your self storage unit online. Simply log
                in to your account and you have access to your unit on our
                website!
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section directions" id="directions">
        <div className="wrap directions-grid">
          <div>
            <span className="eyebrow">220 OVEROCKER ROAD</span>
            <h2>
              Directions To <br />
              A&amp;L Self Storage
            </h2>
            <p>
              220 Overocker Road <br />
              Arlington, NY 12603
            </p>
            <a className="button outline" href={DIRECTIONS_URL}>
              Directions To A&amp;L Self Storage
              <Arrow />
            </a>
          </div>
          <iframe
            title="Map showing A and L Self Storage"
            src={MAP_EMBED_URL}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <section className="section blog">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A&amp;L SELF STORAGE</span>
              <h2>Self Storage Blog Posts</h2>
            </div>
          </div>
          <div className="blog-grid">
            {POSTS.map((post) => (
              <Link className="blog-card" href={post.href} key={post.href}>
                <div className="blog-top">
                  <span>{post.date}</span>
                  <Arrow />
                </div>
                <h3>{post.title}</h3>
                <p>{post.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
