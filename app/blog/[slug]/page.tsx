import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Icon } from "@/app/components/Icon";
import { PageBanner } from "@/app/components/PageBanner";
import { JsonLd } from "@/app/components/JsonLd";
import { PageShell } from "@/app/components/PageShell";
import { getNeighbors, getPost, getPosts, getRecentPosts } from "@/lib/blog";
import { blogPostingSchema, breadcrumbSchema, socialMetadata } from "@/lib/seo-extra";

// Slugs keep the live site's exact spelling and capitalization.
export async function generateStaticParams() {
  return (await getPosts()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: { absolute: post.metaTitle },
    description: post.metaDescription,
    alternates: { canonical: `https://www.aandlstorage.com/blog/${slug}` },
    ...socialMetadata({
      title: post.metaTitle,
      description: post.metaDescription,
      path: `/blog/${slug}`,
      type: "article",
      publishedTime: new Date(post.pubDate).toISOString(),
      modifiedTime: post.updatedAt,
    }),
  };
}

// Posts added in the admin dashboard are rendered on first request, so the param read sits behind Suspense.
export default function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <Suspense fallback={null}>
      <BlogPost params={params} />
    </Suspense>
  );
}

async function BlogPost({ params }: { params: PageProps<"/blog/[slug]">["params"] }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const [{ previous, next }, recent] = await Promise.all([getNeighbors(slug), getRecentPosts()]);

  return (
    <PageShell>
      <PageBanner title={post.title} eyebrow="A&L SELF STORAGE BLOG">
        <p className="post-meta">
          <em>{post.date}</em>
          <Link href="/blog" className="rss-link">
            All posts
          </Link>
          <a href="/blog.rss" className="rss-link">
            RSS
          </a>
        </p>
      </PageBanner>

      <section className="section inner">
        <div className="wrap blog-layout">
          <div className="post-column">
            <article
              className="post-body prose"
              dangerouslySetInnerHTML={{ __html: post.html }}
            />
            <nav className="post-pager" aria-label="More posts">
              {previous ? (
                <Link href={`/blog/${previous.slug}`} rel="prev">
                  ← Previous Post
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link href={`/blog/${next.slug}`} rel="next">
                  Next Post →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </div>
          <aside className="recent-posts">
            <h3>Recent Posts</h3>
            <div className="recent-list">
              {recent.map((item) => (
                <Link
                  key={item.slug}
                  href={`/blog/${item.slug}`}
                  aria-current={item.slug === slug ? "page" : undefined}
                >
                  {item.title}
                </Link>
              ))}
            </div>
            <Link className="button primary" href="/pages/rent">
              Rent Storage Units Online
              <Icon name="arrow" />
            </Link>
          </aside>
        </div>
      </section>
      <JsonLd data={blogPostingSchema(post)} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${post.slug}` }])} />
    </PageShell>
  );
}
