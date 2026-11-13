import Link from "next/link";
import { deletePostAction } from "../../actions";
import { ConfirmButton } from "../../AdminForm";
import { DataTable, LinkButton, Notice, PageHeader } from "../../ui";
import { getPosts } from "@/lib/content";

export default async function BlogPostsPage({ searchParams }: PageProps<"/admin/blog_posts">) {
  const { deleted } = await searchParams;
  const posts = await getPosts();
  return (
    <>
      <PageHeader
        title="Blog Posts"
        description="Articles that appear on your blog and in the RSS feed."
        actions={<LinkButton primary icon="plus" href="/admin/blog_posts/new">New post</LinkButton>}
      />
      {deleted && <Notice tone="ok">Post deleted.</Notice>}
      <DataTable
        columns={["Title", "Published", "URL", "Actions"]}
        rows={posts.map((post) => [
          <span key="t" className="adm-clip" style={{ fontWeight: 650 }}>{post.title}</span>,
          post.date.replace("Published on ", ""),
          <code key="u">/blog/{post.slug}</code>,
          <span key="a">
            <Link className="adm-btn is-small" href={`/blog/${post.slug}`} target="_blank">View</Link>
            <LinkButton small icon="edit" href={`/admin/blog_posts/${post.slug}/edit`}>Edit</LinkButton>
            <ConfirmButton
              action={deletePostAction}
              fields={{ slug: post.slug }}
              message={`Delete "${post.title}"? Its page will disappear from the website.`}
            />
          </span>,
        ])}
        footer={`${posts.length} posts`}
      />
    </>
  );
}
