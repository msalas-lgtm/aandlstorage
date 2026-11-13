"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SiteHeaderProps = {
  nav: { href: string; label: string }[];
  loginText: string;
};

export function SiteHeader({ nav: NAV, loginText }: SiteHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={scrolled ? "is-scrolled" : undefined}>
      <div className="wrap header">
        <Link href="/" aria-label="A and L Self Storage home">
          <Image
            className="logo"
            src="/assets/logo.png"
            alt="A&L Self Storage"
            width={453}
            height={270}
            priority
          />
        </Link>
        <nav aria-label="Main navigation">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : undefined}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className="login" href="/login">
          {loginText}
        </Link>
        <button
          className="menu"
          type="button"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </div>
      <div className={menuOpen ? "mobile-nav open" : "mobile-nav"}>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? "active" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <Link href="/login" onClick={() => setMenuOpen(false)}>
          {loginText}
        </Link>
      </div>
    </header>
  );
}
