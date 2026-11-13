import type { ReactNode } from "react";
import schema from "@/content/schema-selfstorage.json";
import { getNav, getSettings, telHref } from "@/lib/content";
import { Icon } from "./Icon";
import { MotionEffects } from "./MotionEffects";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

// Top bar, header, footer and the SelfStorage schema that the live site prints on every page.
export async function PageShell({ children }: { children: ReactNode }) {
  const [settings, nav] = await Promise.all([getSettings(), getNav()]);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="topbar">
        <div className="wrap">
          <span>
            <Icon name="pin" />
            {settings.street.replace("Road", "Rd")}, {settings.city}, {settings.state}{" "}
            {settings.zip}
          </span>
          <a href={telHref(settings.headerPhone)}>{settings.headerPhone}</a>
        </div>
      </div>
      <SiteHeader nav={nav} loginText={settings.loginButtonText} />
      <main id="main">{children}</main>
      <SiteFooter />
      <MotionEffects />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
