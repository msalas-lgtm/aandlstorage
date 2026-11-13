import type { Metadata } from "next";
import { getPages, type PageSeo } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

export async function seoFor(path: string): Promise<PageSeo> {
  const entry = (await getPages()).find((page) => page.path === path);
  if (!entry) throw new Error(`No SEO entry for ${path}`);
  return entry;
}

// Title, description and canonical copied from the live site for each URL.
export async function pageMetadata(path: string): Promise<Metadata> {
  const { title, description } = await seoFor(path);
  return {
    title: { absolute: title },
    description,
    // Next.js drops the trailing slash of the root canonical, so the home page
    // prints its own <link rel="canonical"> instead (see app/page.tsx).
    ...(path === "/" ? {} : { alternates: { canonical: `${SITE_URL}${path}` } }),
  };
}
