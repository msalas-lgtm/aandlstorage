import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/app/components/Icon";
import { PageBanner } from "@/app/components/PageBanner";
import { PageShell } from "@/app/components/PageShell";
import { getPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

const TITLE = "Self Storage Blog | A&L Self Storage";
const DESCRIPTION =
  "Tips and advice on choosing, packing and organizing a storage unit from A&L Self Storage in Arlington, NY.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/blog`,
    // The RSS feed that used to live at /blog now lives at /blog.rss; feed readers find it from here.
    types: { "application/rss+xml": `${SITE_URL}/blog.rss` },
  },
};

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

// Plain-text preview of a post: tags removed, entities decoded, cut at a word boundary.
function excerpt(html: string, max = 220) {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

export default async function BlogIndexPage() {
  const posts = await getPosts();
  const schema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "A&L Self Storage Blog",
    url: `${SITE_URL}/blog`,
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `${SITE_URL}/blog/${post.slug}`,
      datePublished: new Date(post.pubDate).toISOString(),
    })),
  };

  return (
    <PageShell>
      <PageBanner as="h1" title="Self Storage Blog" eyebrow="A&L SELF STORAGE BLOG">
        <p className="post-meta">
          <span>Storage tips and advice from our team</span>
          <a href="/blog.rss" className="rss-link">
            RSS
          </a>
        </p>
      </PageBanner>

      <section className="section inner">
        <div className="wrap">
          <h2 className="sr-only">All blog posts</h2>
          {posts.length === 0 ? (
            <p>No blog posts yet. Please check back soon.</p>
          ) : (
            <div className="blog-grid">
              {posts.map((post) => (
                <Link className="blog-card" href={`/blog/${post.slug}`} key={post.slug}>
                  <div className="blog-top">
                    <span>{post.date}</span>
                    <Icon name="arrow" />
                  </div>
                  <h3>{post.title}</h3>
                  <p>{excerpt(post.html)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\u003c") }}
      />
    </PageShell>
  );
}
