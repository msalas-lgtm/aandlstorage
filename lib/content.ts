import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db, unwrap } from "@/lib/db";

// Site content lives in Supabase. Reads are cached by Next.js under the "content" tag, and every
// admin save refreshes that tag, so edits show up right away without a rebuild.

export const CONTENT_TAG = "content";

export type BlogPost = {
  slug: string;
  title: string;
  date: string; // "Published on 2/3/2022"
  pubDate: string; // RFC 822, used for the RSS feed
  updatedAt: string; // ISO, used for the sitemap
  metaTitle: string;
  metaDescription: string;
  html: string;
};

export type PageSeo = {
  path: string;
  lastmod: string;
  priority: number | null;
  title: string;
  description: string;
  tabName: string;
  tabVisible: boolean;
  footerLinkText: string;
  loginLinkText: string;
  content: Record<string, unknown>; // editable text blocks (the Rent page uses these)
};

export type UnitType = {
  id: number;
  name: string;
  units: number;
  price: string; // "$115.00"
  priceCents: number;
  description: string;
  image: string;
  onWebsite: boolean;
  vacant: number; // vacant units of this type, counted from the units table
  availability: "rent" | "waiting"; // "rent" when at least one unit is vacant
  note: string; // "Only N left!" when only a few units remain
};

// Facility rules edited under Setup > Settings. Missing values fall back to these defaults.
export type Rules = {
  onlineRentals: boolean; // allow "Rent Now" on the website
  moveInWindowDays: number; // how far ahead a customer can pick a move-in date
  lowStockThreshold: number; // show "Only N left!" when this many units or fewer are vacant
  customersCanEditProfile: boolean;
  lateFeeGraceNote: string;
};
export const DEFAULT_RULES: Rules = {
  onlineRentals: true,
  moveInWindowDays: 90,
  lowStockThreshold: 5,
  customersCanEditProfile: true,
  lateFeeGraceNote: "",
};
export const PAYMENT_METHODS = [
  ["cash", "Cash"],
  ["check", "Check"],
  ["card", "Card"],
  ["ach", "Bank transfer (ACH)"],
  ["other", "Other"],
] as const;

export type HoursRow = { day: string; status: "Open" | "Closed"; open: string; close: string };

export type SiteSettings = {
  facilityName: string;
  websiteAddress: string;
  headerPhone: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  facebook: string;
  twitter: string;
  linkedin: string;
  instagram: string;
  youtube: string;
  yelp: string;
  reviewUrl: string;
  loginButtonText: string;
  rules?: Partial<Rules>;
  paymentMethods?: string[]; // payment methods the office accepts (shown when recording a payment)
  notificationsEmail: string;
  replyToEmail: string;
  hours: HoursRow[];
};

export type ImageMeta = Record<string, { title: string; alt: string }>;

export const formatCents = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(CONTENT_TAG);
  const { data, error } = await db().from("site_settings").select("data").eq("id", 1).single();
  if (error) throw new Error(`site settings: ${error.message}`);
  return data.data as SiteSettings;
}

// Newest first, the same order as the live site's "Recent Posts".
export async function getPosts(): Promise<BlogPost[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CONTENT_TAG);
  const rows = unwrap(
    await db().from("blog_posts").select("*").order("published_at", { ascending: false }),
    "blog posts",
  );
  return rows.map((row) => {
    const published = new Date(row.published_at);
    return {
      slug: row.slug,
      title: row.title,
      date: `Published on ${published.getUTCMonth() + 1}/${published.getUTCDate()}/${published.getUTCFullYear()}`,
      pubDate: published.toUTCString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      html: row.html,
    };
  });
}

export async function getPost(slug: string) {
  return (await getPosts()).find((post) => post.slug === slug);
}

// "Previous" is the next older post and "Next" is the next newer one, as on the live site.
export async function getNeighbors(slug: string) {
  const posts = await getPosts();
  const index = posts.findIndex((post) => post.slug === slug);
  return { previous: posts[index + 1], next: posts[index - 1] };
}

export async function getRecentPosts(count = 10) {
  return (await getPosts()).slice(0, count);
}

export async function getPages(): Promise<PageSeo[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CONTENT_TAG);
  const rows = unwrap(await db().from("pages").select("*"), "pages");
  const order = ["/", "/pages/rent", "/pages/map", "/pages/mall", "/pages/contact"];
  return rows
    .map((row) => ({
      path: row.path as string,
      lastmod: new Date(row.updated_at).toISOString(),
      priority: row.priority === null ? null : Number(row.priority),
      title: row.title as string,
      description: row.description as string,
      tabName: (row.tab_name ?? "") as string,
      tabVisible: row.tab_visible as boolean,
      footerLinkText: row.footer_link_text as string,
      loginLinkText: row.login_link_text as string,
      content: (row.content ?? {}) as Record<string, unknown>,
    }))
    .sort((a, b) => order.indexOf(a.path) - order.indexOf(b.path));
}

// Menu items in the live site's order, using each page's tab name and visibility.
export async function getNav() {
  return (await getPages())
    .filter((page) => page.tabVisible)
    .map((page) => ({ href: page.path, label: page.tabName || page.path }));
}

// Unit sizes, prices and photos change rarely, so they are cached for an hour (and refreshed the moment
// the admin saves).
async function getUnitTypeRows() {
  "use cache";
  cacheLife("hours");
  cacheTag(CONTENT_TAG);
  return unwrap(await db().from("unit_types").select("*").order("sort_order").order("id"), "unit types");
}

// Which units are vacant changes all the time, so it is read almost live (cached for about a second).
// Reading it makes the caller render at request time, so availability on the Rent page is always current.
async function getVacancy(): Promise<Record<number, number>> {
  "use cache";
  cacheLife("seconds");
  cacheTag(CONTENT_TAG);
  // The units table is created by schema-phase3.sql; before it exists every size simply has no vacancy.
  const { data, error } = await db().from("units").select("unit_type_id").eq("status", "vacant");
  if (error && !/units/.test(error.message)) throw new Error(`units: ${error.message}`);
  const counts: Record<number, number> = {};
  for (const unit of data ?? []) {
    if (unit.unit_type_id) counts[unit.unit_type_id] = (counts[unit.unit_type_id] ?? 0) + 1;
  }
  return counts;
}

export async function getRules(): Promise<Rules> {
  return { ...DEFAULT_RULES, ...((await getSettings()).rules ?? {}) };
}

export async function getPaymentMethods() {
  const accepted = (await getSettings()).paymentMethods;
  const list = accepted?.length ? accepted : PAYMENT_METHODS.map(([value]) => value as string);
  return PAYMENT_METHODS.filter(([value]) => list.includes(value));
}

export async function getUnitTypes(): Promise<UnitType[]> {
  const [rows, vacancy, rules] = await Promise.all([getUnitTypeRows(), getVacancy(), getRules()]);
  return rows.map((row) => {
    const vacant = vacancy[row.id] ?? 0;
    return {
      id: row.id as number,
      name: row.name as string,
      units: row.units_count as number,
      price: formatCents(row.price_cents),
      priceCents: row.price_cents as number,
      description: row.description as string,
      image: row.image_path as string,
      onWebsite: row.on_website as boolean,
      vacant,
      availability: vacant > 0 ? "rent" : "waiting",
      note: vacant > 0 && vacant <= rules.lowStockThreshold ? `Only ${vacant} left!` : "",
    } satisfies UnitType;
  });
}

export async function getImageMeta(): Promise<ImageMeta> {
  "use cache";
  cacheLife("hours");
  cacheTag(CONTENT_TAG);
  const rows = unwrap(await db().from("images").select("key,title,alt"), "image details");
  return Object.fromEntries(rows.map((row) => [row.key, { title: row.title, alt: row.alt }]));
}

export function hoursText(row: HoursRow) {
  return row.status === "Closed" ? "Closed" : `${row.open} - ${row.close}`;
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/\D/g, "")}`;
}
