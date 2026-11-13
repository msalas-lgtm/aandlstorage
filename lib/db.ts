import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client. It uses the secret key, which bypasses row security,
// so it must never be imported into client components or exposed with a NEXT_PUBLIC_ name.
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
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
