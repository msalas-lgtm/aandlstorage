import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./styles/style.css";
import "./styles/design.css";
import "./styles/motion.css";
import "./styles/inner.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

// Per-page titles, descriptions and canonicals come from lib/seo.ts (copied from the live site).
export const metadata: Metadata = {
  metadataBase: new URL("https://www.aandlstorage.com"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
