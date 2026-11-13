import { getPosts } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Same feed the live site serves at /blog and /blog.rss.
export async function blogFeed() {
  const items = (await getPosts())
    .map((post) => {
      const link = `${SITE_URL}/blog/${post.slug}`;
      return `    <item>
      <title>${escape(post.title)}</title>
      <pubDate>${post.pubDate}</pubDate>
      <link>${link}</link>
      <guid>${link}</guid>
      <description>${escape(post.html)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>A&amp;L Self Storage</title>
    <description>A&amp;L Self Storage Blog Feed</description>
    <link>${SITE_URL}</link>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
