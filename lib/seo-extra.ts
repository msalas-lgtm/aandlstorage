import schema from "@/content/schema-selfstorage.json";
import type { SiteSettings, UnitType } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

// Extra structured data and social-sharing details. Everything here only ADDS to what the pages already say:
// titles, descriptions, headings and body text are never changed, and every fact below is already visible on the site.

export const BUSINESS_ID = `${SITE_URL}/#storage`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const SOCIAL_IMAGE = { url: "/assets/facility-doors.jpg", width: 1360, height: 907, alt: "A&L Self Storage drive-up storage units in Arlington, NY" };

// Amenities listed on the home page ("All The Convenience And Security You Need").
const AMENITIES = [
  "24-hour Access",
  "Great Customer Service",
  "Onsite Security",
  "Digital Video Surveillance",
  "Online Bill Pay",
  "Drive-up Access",
  "Boxes & Supplies",
  "Variety of Unit Sizes Available",
  "Clean, Safe & Secure",
];

// The existing SelfStorage block, with its empty "@id" filled in and the missing details added.
export function businessSchema(settings: SiteSettings) {
  const sameAs = [settings.facebook, settings.twitter, settings.linkedin, settings.instagram, settings.youtube, settings.yelp].filter(Boolean);
  return {
    ...schema,
    "@id": BUSINESS_ID,
    description:
      "A&L Self Storage is a self storage facility in Arlington (Poughkeepsie), NY with drive-up access, digital video surveillance, onsite security, 24-hour access, online bill pay and a variety of unit sizes.",
    logo: `${SITE_URL}/assets/logo.png`,
    hasMap: "https://www.google.com/maps/search/?api=1&query=A%26L+Self+Storage+220+Overocker+Rd+Arlington+NY+12603",
    ...(sameAs.length ? { sameAs } : {}),
    currenciesAccepted: "USD",
    areaServed: [
      { "@type": "City", name: "Poughkeepsie", containedInPlace: { "@type": "State", name: "New York" } },
      { "@type": "City", name: "Arlington", containedInPlace: { "@type": "State", name: "New York" } },
      { "@type": "AdministrativeArea", name: "Dutchess County, New York" },
    ],
    amenityFeature: AMENITIES.map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: settings.phone,
      contactType: "customer service",
      areaServed: "US",
      availableLanguage: "English",
    },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: "A&L Self Storage",
    inLanguage: "en-US",
    publisher: { "@id": BUSINESS_ID },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

// Unit sizes and monthly prices exactly as the Rent page shows them (live from the admin dashboard).
export function offerCatalogSchema(units: UnitType[]) {
  return {
    "@context": "https://schema.org",
    "@type": "SelfStorage",
    "@id": BUSINESS_ID,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Self storage units",
      itemListElement: units.map((unit) => {
        const price = (unit.priceCents / 100).toFixed(2);
        return {
          "@type": "Offer",
          url: `${SITE_URL}/pages/rent`,
          price,
          priceCurrency: "USD",
          priceSpecification: { "@type": "UnitPriceSpecification", price, priceCurrency: "USD", unitText: "MONTH" },
          availability: unit.availability === "rent" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemOffered: {
            "@type": "Service",
            name: `${unit.name} self storage unit`,
            description: unit.description,
            serviceType: "Self storage unit rental",
            provider: { "@id": BUSINESS_ID },
          },
        };
      }),
    },
  };
}

export function blogPostingSchema(post: { slug: string; title: string; metaDescription: string; pubDate: string; updatedAt: string }) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    url,
    mainEntityOfPage: url,
    datePublished: new Date(post.pubDate).toISOString(),
    dateModified: post.updatedAt,
    inLanguage: "en-US",
    image: `${SITE_URL}${SOCIAL_IMAGE.url}`,
    author: { "@id": BUSINESS_ID },
    publisher: { "@id": BUSINESS_ID },
    isPartOf: { "@id": WEBSITE_ID },
  };
}

// Open Graph and Twitter cards built from a page's existing title and description (those are not changed).
export function socialMetadata(input: { title: string; description: string; path: string; type?: "website" | "article"; publishedTime?: string; modifiedTime?: string }) {
  const image = { url: SOCIAL_IMAGE.url, width: SOCIAL_IMAGE.width, height: SOCIAL_IMAGE.height, alt: SOCIAL_IMAGE.alt };
  return {
    openGraph: {
      title: input.title,
      description: input.description,
      url: `${SITE_URL}${input.path}`,
      siteName: "A&L Self Storage",
      locale: "en_US",
      type: input.type ?? "website",
      ...(input.type === "article" ? { publishedTime: input.publishedTime, modifiedTime: input.modifiedTime } : {}),
      images: [image],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: input.title,
      description: input.description,
      images: [image.url],
    },
  };
}
