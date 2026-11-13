// Creates the public "library" storage bucket for admin-uploaded images. Safe to run again.
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.split("=")[0].trim(), l.slice(l.indexOf("=") + 1).trim()]));
const base = env.SUPABASE_URL.replace(/\/$/, "");
const headers = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, "Content-Type": "application/json" };
const res = await fetch(`${base}/storage/v1/bucket`, {
  method: "POST", headers,
  body: JSON.stringify({ id: "library", name: "library", public: true, file_size_limit: 5242880, allowed_mime_types: ["image/png", "image/jpeg", "image/webp", "image/gif"] }),
});
console.log("create bucket:", res.status, (await res.text()).slice(0, 140));
const list = await fetch(`${base}/storage/v1/bucket`, { headers });
console.log("buckets:", (await list.json()).map((b) => `${b.id}${b.public ? " (public)" : ""}`).join(", "));
