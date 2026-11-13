import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, LinkButton, Notice, PageHeader } from "../../../../ui";
import { getPost } from "@/lib/content";
import { PostForm } from "../../PostForm";

export default async function EditPostPage({
  params,
  searchParams,
}: PageProps<"/admin/blog_posts/[slug]/edit">) {
  const { slug } = await params;
  const { created } = await searchParams;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <>
      <PageHeader
        title="Edit Blog Post"
        description={post.title}
        actions={
          <>
            <Link className="adm-btn" href={`/blog/${post.slug}`} target="_blank">View post</Link>
            <LinkButton href="/admin/blog_posts">Back to posts</LinkButton>
          </>
        }
      />
      {created && <Notice tone="ok">Post created. It&apos;s now on the website.</Notice>}
      <Card>
        <PostForm post={post} />
      </Card>
    </>
  );
}
