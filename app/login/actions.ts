"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/tenant/password";
import { endTenantSession, startTenantSession } from "@/lib/tenant/session";

export type LoginState = { status: "idle" | "error"; message: string };

// Best-effort brake on password guessing: 5 misses locks a username for 15 minutes on this server.
const misses = new Map<string, { count: number; until: number }>();
const MAX_MISSES = 5;
const LOCK_MS = 15 * 60 * 1000;

export async function loginTenantAction(_prev: LoginState, data: FormData): Promise<LoginState> {
  const username = String(data.get("username") ?? "").trim().toLowerCase();
  const password = String(data.get("password") ?? "");
  if (!username || !password) return { status: "error", message: "Please enter your username and password." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const key = `${username}|${ip}`;
  const entry = misses.get(key);
  if (entry && entry.until > Date.now() && entry.count >= MAX_MISSES) {
    return { status: "error", message: "Too many attempts. Please wait 15 minutes and try again, or call the office." };
  }

  const { data: customer } = await db()
    .from("customers")
    .select("id,password_hash,login_disabled,archived")
    .eq("username", username)
    .maybeSingle();

  // Always check a hash (a dummy one when the username is unknown) so timing doesn't reveal which usernames exist.
  const valid = verifyPassword(password, customer?.password_hash);
  if (!customer || !valid || customer.login_disabled || customer.archived) {
    const count = (entry && entry.until > Date.now() ? entry.count : 0) + 1;
    misses.set(key, { count, until: Date.now() + LOCK_MS });
    return { status: "error", message: "That username or password isn't right." };
  }

  misses.delete(key);
  await startTenantSession(customer.id);
  redirect("/dashboard");
}

export async function logoutTenantAction() {
  await endTenantSession();
  redirect("/login");
}
