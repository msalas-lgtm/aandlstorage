import type { ElementType, ReactNode } from "react";

type PageBannerProps = {
  title: ReactNode;
  // Heading level matches the live page so the outline stays the same for search engines.
  as?: ElementType;
  eyebrow?: string;
  children?: ReactNode;
};

export function PageBanner({
  title,
  as: Heading = "h2",
  eyebrow = "A&L SELF STORAGE",
  children,
}: PageBannerProps) {
  return (
    <section className="page-banner">
      <div className="wrap">
        <span className="eyebrow">
          <span className="dot" />
          {eyebrow}
        </span>
        <Heading className="page-title">{title}</Heading>
        {children}
      </div>
    </section>
  );
}
