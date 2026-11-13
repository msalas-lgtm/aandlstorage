import path from "node:path";
import { IMAGE_BUCKET } from "@/lib/db";

// Serves images uploaded in the admin Image Library from Supabase Storage,
// so /uploads/library/<name> stays the same URL no matter where the file is kept.
// It reads from storage directly (not the public CDN URL) so a deleted image disappears right away.
const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(_request: Request, { params }: RouteContext<"/uploads/library/[name]">) {
  const { name } = await params;
  const safe = path.basename(name);
  const type = TYPES[path.extname(safe).toLowerCase()];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!type || !url || !key) return new Response("Not found", { status: 404 });

  const upstream = await fetch(`${url}/storage/v1/object/${IMAGE_BUCKET}/${encodeURIComponent(safe)}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!upstream.ok) return new Response("Not found", { status: 404 });
  return new Response(upstream.body, {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
