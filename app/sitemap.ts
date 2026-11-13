import type { MetadataRoute } from "next";
import { getPages, getPosts } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

// Same URLs, last-modified dates and priority as the live sitemap.xml.
// Posts added in the admin dashboard are included automatically.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts] = await Promise.all([getPages(), getPosts()]);
  return [
    ...pages.map((page) => ({
      url: `${SITE_URL}${page.path}`,
      lastModified: page.lastmod,
      ...(page.priority ? { priority: page.priority } : {}),
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt,
    })),
  ];
}
