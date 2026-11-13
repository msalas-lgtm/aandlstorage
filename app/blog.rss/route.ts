import { blogFeed } from "@/lib/rss";

export async function GET() {
  return blogFeed();
}
