import { connection } from "next/server";
import { Card, LinkButton, PageHeader } from "../../../ui";
import { PostForm } from "../PostForm";

export default async function NewPostPage() {
  await connection();
  return (
    <>
      <PageHeader title="New Blog Post" actions={<LinkButton href="/admin/blog_posts">Back to posts</LinkButton>} />
      <Card>
        <PostForm />
      </Card>
    </>
  );
}
