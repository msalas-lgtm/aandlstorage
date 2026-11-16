import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sqliteClient } from "@/lib/sqlite-db";

// True when the site should use a local SQLite file instead of Supabase (set DATABASE_DRIVER=sqlite).
export function usingSqlite() {
  return (process.env.DATABASE_DRIVER ?? "").trim().toLowerCase() === "sqlite";
}

// Server-only database client. With Supabase it uses the secret key, which bypasses row security,
// so it must never be imported into client components or exposed with a NEXT_PUBLIC_ name.
// With DATABASE_DRIVER=sqlite it is a look-alike on top of a local SQLite file (lib/sqlite-db.ts), so the
// rest of the site doesn't care which one is in use.
export function db(): SupabaseClient {
  if (usingSqlite()) return sqliteClient() as unknown as SupabaseClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY (or set DATABASE_DRIVER=sqlite).");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as T;
}

export const IMAGE_BUCKET = "library";

export function storageUrl(name: string) {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${encodeURIComponent(name)}`;
}
