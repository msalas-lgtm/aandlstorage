import "server-only";
import { headers } from "next/headers";

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
