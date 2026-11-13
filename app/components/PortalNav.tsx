import Link from "next/link";
import { logoutTenantAction } from "@/app/login/actions";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/billing_accounts", label: "Recurring Billing" },
  { href: "/rentals", label: "Rent Storage" },
  { href: "/edit_profile", label: "Edit Profile" },
] as const;

// The customer portal's menu: the same pages as the live site's customer dashboard.
export function PortalNav({ active, name }: { active: string; name: string }) {
  return (
    <div className="portal-bar">
      <div className="wrap portal-bar-inner">
        <nav className="portal-links" aria-label="Customer account">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={active === link.href ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="portal-user">
          <span className="portal-name">{name}</span>
          <Link className="button primary small" href="/statement">
            Make a Payment
          </Link>
          <form action={logoutTenantAction}>
            <button className="button outline small" type="submit">
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
