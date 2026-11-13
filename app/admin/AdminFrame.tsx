"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { ADMIN_NAV, findNav, flatNav, type NavItem } from "@/lib/admin/nav";
import { AdminIcon } from "./AdminIcon";
import { logoutAction } from "./actions";

function isActive(item: NavItem, pathname: string, search: string) {
  if (item.external) return false;
  const [itemPath, itemQuery] = item.href.split("?");
  if (itemQuery) {
    return pathname === itemPath && search === `?${itemQuery}`;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const search = params.toString() ? `?${params.toString()}` : "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const activeGroup = useMemo(() => {
    const onReports = pathname.startsWith("/admin/reports") && !pathname.startsWith("/admin/reports/dashboard");
    return (
      ADMIN_NAV.find((group) => group.items.some((item) => isActive(item, pathname, search)))?.id ??
      (onReports ? "reports" : "dashboard")
    );
  }, [pathname, search]);

  // Groups the user opened or closed by hand; otherwise the active group (and Dashboard) stay open.
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const current = findNav(pathname, search);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return flatNav()
      .filter((item) => !item.external && `${item.label} ${item.group}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query]);

  return (
    <div className="adm">
      {menuOpen && <div className="adm-scrim" onClick={() => setMenuOpen(false)} />}
      <aside className={menuOpen ? "adm-side is-open" : "adm-side"} aria-label="Admin navigation">
        <Link href="/admin/reports/dashboard" className="adm-brand" onClick={() => setMenuOpen(false)}>
          <Image src="/assets/logo.png" alt="A&L Self Storage" width={453} height={270} />
          <div>
            <strong>A&amp;L Self Storage</strong>
            <span>Admin</span>
          </div>
        </Link>
        {ADMIN_NAV.map((group) => {
          const expanded = open[group.id] ?? (group.id === activeGroup || group.id === "dashboard");
          return (
            <div className="adm-group" key={group.id}>
              <button
                type="button"
                className="adm-group-btn"
                aria-expanded={expanded}
                onClick={() => setOpen((state) => ({ ...state, [group.id]: !expanded }))}
              >
                {group.label}
                <AdminIcon name="chevron" size={14} />
              </button>
              {expanded && (
                <div className="adm-links">
                  {group.items.map((item) =>
                    item.external ? (
                      <a key={item.label} className="adm-link" href={item.href} target="_blank" rel="noopener noreferrer">
                        {item.label}
                        <span className="adm-ext">
                          <AdminIcon name="external" size={13} />
                        </span>
                      </a>
                    ) : (
                      <Link
                        key={item.href}
                        className="adm-link"
                        href={item.href}
                        aria-current={isActive(item, pathname, search) ? "page" : undefined}
                        onClick={() => setMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })}
      </aside>

      <div className="adm-main">
        <div className="adm-top">
          <button className="adm-menu-btn" type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <AdminIcon name="menu" />
          </button>
          <div className="adm-crumbs">
            <span>{current?.group ?? "Admin"}</span>
            <span>/</span>
            <strong>{current?.label ?? "Page"}</strong>
          </div>
          <div className="adm-search">
            <AdminIcon name="search" size={17} />
            <input
              type="search"
              placeholder="Search admin pages"
              aria-label="Search admin pages"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 120)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results[0]) {
                  router.push(results[0].href);
                  setQuery("");
                }
              }}
            />
            {focused && results.length > 0 && (
              <div className="adm-results">
                {results.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setQuery("")}>
                    {item.label}
                    <small>{item.group}</small>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="adm-user">
            <span className="adm-avatar" aria-hidden="true">AL</span>
            <form action={logoutAction}>
              <button className="adm-btn is-small" type="submit">
                <AdminIcon name="logout" size={14} />
                Log out
              </button>
            </form>
          </div>
        </div>
        <div className="adm-content">{children}</div>
      </div>
    </div>
  );
}
