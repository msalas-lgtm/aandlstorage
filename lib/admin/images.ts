import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getImageMeta } from "@/lib/content";
import { IMAGE_BUCKET, db } from "@/lib/db";

export type LibraryImage = {
  key: string; // e.g. "library/photo.jpg" or "widget_image/image/30116/web_pic.jpg"
  url: string; // public URL on this site
  name: string;
  kind: string;
  bytes: number;
  title: string;
  alt: string;
  deletable: boolean;
};

const ROOT = path.join(process.cwd(), "public", "uploads");
const KINDS: Record<string, string> = { widget_image: "Page image", unit_type: "Unit type", library: "Uploaded" };

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

// Images that ship with the site (public/uploads) plus images uploaded in the dashboard (Supabase Storage).
export async function listImages(): Promise<LibraryImage[]> {
  const meta = await getImageMeta();

  const shipped = walk(ROOT)
    .filter((file) => /\.(png|jpe?g|webp|gif)$/i.test(file))
    .map((file) => {
      const key = path.relative(ROOT, file).split(path.sep).join("/");
      return { key, name: path.basename(file), bytes: fs.statSync(file).size, deletable: false };
    });

  const { data: stored } = await db().storage.from(IMAGE_BUCKET).list("", { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
  const uploaded = (stored ?? [])
    .filter((file) => file.id && /\.(png|jpe?g|webp|gif)$/i.test(file.name))
    .map((file) => ({
      key: `library/${file.name}`,
      name: file.name,
      bytes: Number((file.metadata as { size?: number } | null)?.size ?? 0),
      deletable: true,
    }));

  return [...uploaded, ...shipped].map((image) => ({
    ...image,
    url: `/uploads/${image.key}`,
    kind: KINDS[image.key.split("/")[0]] ?? image.key.split("/")[0],
    title: meta[image.key]?.title ?? "",
    alt: meta[image.key]?.alt ?? "",
  }));
}
