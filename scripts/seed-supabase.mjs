// Copies the site content from /content/*.json into Supabase. Safe to run again (it upserts).
// Usage: node scripts/seed-supabase.mjs
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.split("=")[0].trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const base = env.SUPABASE_URL.replace(/\/$/, "");
const key = env.SUPABASE_SECRET_KEY;
const read = (file) => JSON.parse(fs.readFileSync(`content/${file}`, "utf8"));

async function upsert(table, rows, conflict) {
  const res = await fetch(`${base}/rest/v1/${table}?on_conflict=${conflict}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  console.log(`  ${table}: ${rows.length} rows`);
}

async function count(table) {
  const res = await fetch(`${base}/rest/v1/${table}?select=*&limit=0`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  return res.ok ? res.headers.get("content-range") : `ERROR ${res.status}`;
}

const tables = ["site_settings", "pages", "blog_posts", "unit_types", "images", "contact_messages"];
console.log("Checking tables...");
for (const t of tables) console.log(`  ${t}: ${await count(t)}`);
if (process.argv.includes("--check")) process.exit(0);

const settings = read("site-settings.json");
const seo = read("pages-seo.json");
const posts = read("blog-posts.json");
const types = read("unit-types.json");
const lastmod = Object.fromEntries(seo.map((p) => [p.path, p.lastmod]));

console.log("Seeding...");
await upsert("site_settings", [{ id: 1, data: settings }], "id");
await upsert(
  "pages",
  seo.filter((p) => !p.path.startsWith("/blog/")).map((p) => ({
    path: p.path, title: p.title, description: p.description, tab_name: p.tabName ?? null,
    tab_visible: p.tabVisible !== false, footer_link_text: p.footerLinkText ?? "", login_link_text: p.loginLinkText ?? "",
    priority: p.priority, updated_at: p.lastmod,
  })),
  "path",
);
await upsert(
  "blog_posts",
  posts.map((p) => ({
    slug: p.slug, title: p.title, published_at: new Date(p.pubDate).toISOString(),
    meta_title: p.metaTitle, meta_description: p.metaDescription, html: p.html,
    created_at: new Date(p.pubDate).toISOString(), updated_at: lastmod[`/blog/${p.slug}`] ?? new Date(p.pubDate).toISOString(),
  })),
  "slug",
);
await upsert(
  "unit_types",
  types.map((t, i) => ({
    name: t.name, units_count: t.units, price_cents: Math.round(parseFloat(t.price.replace(/[$,]/g, "")) * 100),
    description: t.description, image_path: t.image, on_website: t.onWebsite, availability: t.availability,
    note: t.note, sort_order: i,
  })),
  "name",
);
console.log("Done. Row counts:");
for (const t of tables) console.log(`  ${t}: ${await count(t)}`);
