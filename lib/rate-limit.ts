import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

// Limits are saved in the database (table login_attempts, see supabase/schema-phase7.sql) so they hold across
// servers and restarts. If that table isn't there yet, each function falls back to counting in this server's
// memory, which is a weaker brake but still stops simple spam.
const HOUR = 60 * 60 * 1000;
const FIFTEEN_MINUTES = 15 * 60 * 1000;
const memory = new Map<string, number[]>();

async function savedCount(key: string, windowMs: number): Promise<number | null> {
  try {
    const since = new Date(Date.now() - windowMs).toISOString();
    const { count, error } = await db().from("login_attempts").select("id", { count: "exact", head: true }).eq("key", key).gte("created_at", since);
    return error ? null : (count ?? 0);
  } catch {
    return null;
  }
}

async function recordHit(key: string) {
  const list = (memory.get(key) ?? []).filter((time) => Date.now() - time < HOUR);
  memory.set(key, [...list, Date.now()]);
  try {
    await db().from("login_attempts").insert({ key });
    // Tidy up old rows now and then.
    if (Math.random() < 0.05) await db().from("login_attempts").delete().lt("created_at", new Date(Date.now() - 24 * HOUR).toISOString());
  } catch {
    // table not set up yet
  }
}

async function isOver(key: string, max: number, windowMs: number) {
  const saved = await savedCount(key, windowMs);
  const local = (memory.get(key) ?? []).filter((time) => Date.now() - time < windowMs).length;
  return Math.max(saved ?? 0, local) >= max;
}

// Form spam brake: `max` submissions per hour per visitor and form. Counts the attempt when it is allowed.
export async function tooManyRequests(form: string, max = 5) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `form|${form}|${ip}`;
  if (await isOver(key, max, HOUR)) return true;
  await recordHit(key);
  return false;
}

// Sign-in and password-guessing lockouts (15 minutes).
export const loginLocked = (key: string, max = 5) => isOver(key, max, FIFTEEN_MINUTES);
export const recordLoginMiss = recordHit;

export async function clearLoginMisses(key: string) {
  memory.delete(key);
  try {
    await db().from("login_attempts").delete().eq("key", key);
  } catch {
    // table not set up yet
  }
}
