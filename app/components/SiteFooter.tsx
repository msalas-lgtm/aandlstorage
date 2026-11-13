import Image from "next/image";
import Link from "next/link";
import { getNav, getPages, getSettings, hoursText, telHref } from "@/lib/content";
import { ExternalArrow, Icon } from "./Icon";

export async function SiteFooter() {
  const [settings, nav, pages] = await Promise.all([getSettings(), getNav(), getPages()]);
  const rentLabel =
    pages.find((page) => page.path === "/pages/rent")?.footerLinkText ||
    "Rent Storage Units Online";

  return (
    <footer id="contact">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <span className="eyebrow">A&amp;L SELF STORAGE</span>
            <h2>Contact Us</h2>
          </div>
          <Link className="button primary" href="/pages/rent">
            {rentLabel}
            <Icon name="arrow" />
          </Link>
        </div>
        <div className="footer-grid">
          <div>
            <Image
              className="footer-logo"
              src="/assets/logo.png"
              alt="A&L Self Storage"
              width={453}
              height={270}
            />
            <p>
              A&amp;L Self Storage <br />
              {settings.street} <br />
              {settings.city}, {settings.state} {settings.zip}
            </p>
            <a href={telHref(settings.phone)}>{settings.phone}</a> <br />
            <a href={`mailto:${settings.email}`}>{settings.email}</a>
          </div>
          <div>
            <h3>Office Hours</h3>
            <dl className="hours">
              {settings.hours.map((row) => (
                <div key={row.day}>
                  <dt>{row.day}</dt>
                  <dd>{hoursText(row)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="footer-links">
            <h3>A&amp;L Self Storage</h3>
            {nav.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/login">{settings.loginButtonText}</Link>
            {settings.facebook && (
              <a href={settings.facebook}>
                Facebook <ExternalArrow />
              </a>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>A&amp;L Self Storage</span>
          <span>
            Powered by <a href="https://www.engin8.io">Engin8</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
