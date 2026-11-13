// Blog data now lives in lib/content.ts (read from the Supabase blog_posts table).
export {
  getNeighbors,
  getPost,
  getPosts,
  getRecentPosts,
  type BlogPost,
} from "@/lib/content";
