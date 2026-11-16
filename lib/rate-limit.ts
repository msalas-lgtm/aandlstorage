import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

// Best-effort brake on form spam: `max` submissions per hour per visitor and form, counted on this server.
const seen = new Map<string, number[]>();

export async function tooManyRequests(form: string, max = 5) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `${form}|${ip}`;
  const recent = (seen.get(key) ?? []).filter((time) => Date.now() - time < 3600000);
  if (recent.length >= max) return true;
  seen.set(key, [...recent, Date.now()]);
  return false;
}

// Sign-in lockouts that are saved in the database (table login_attempts, see supabase/schema-phase7.sql), so
// they hold across servers and restarts. If the table isn't there yet these do nothing and the in-memory
// brakes on the login forms still apply.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function loginLocked(key: string, max = 5) {
  try {
    const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
    const { count, error } = await db().from("login_attempts").select("id", { count: "exact", head: true }).eq("key", key).gte("created_at", since);
    return !error && (count ?? 0) >= max;
  } catch {
    return false;
  }
}

export async function recordLoginMiss(key: string) {
  try {
    await db().from("login_attempts").insert({ key });
    // Tidy up old rows now and then.
    if (Math.random() < 0.05) await db().from("login_attempts").delete().lt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  } catch {
    // table not set up yet
  }
}

export async function clearLoginMisses(key: string) {
  try {
    await db().from("login_attempts").delete().eq("key", key);
  } catch {
    // table not set up yet
  }
}
