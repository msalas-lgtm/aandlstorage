import "server-only";
import { randomInt, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/tenant/password";
import { SESSION_COOKIE, SESSION_SECONDS, createToken, readToken } from "./token";

const secret = () => process.env.ADMIN_SECRET;

// The owner login id for the ADMIN_PASSWORD in .env.local (works even if the database is unreachable).
export const OWNER_LOGIN = "owner";

export function adminConfigured() {
  return Boolean(secret() && secret()!.length >= 32);
}

function ownerPasswordMatches(input: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

// Best-effort brake on password guessing: 5 misses locks a login for 15 minutes on this server.
const misses = new Map<string, { count: number; until: number }>();
const MAX_MISSES = 5;
const LOCK_MS = 15 * 60 * 1000;

export type LoginResult = { ok: true; subject: string } | { ok: false; message: string };

export async function checkAdminLogin(loginId: string, password: string): Promise<LoginResult> {
  const login = loginId.trim().toLowerCase();
  if (!login || !password) return { ok: false, message: "Please enter your email and password." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const key = `${login}|${ip}`;
  const entry = misses.get(key);
  if (entry && entry.until > Date.now() && entry.count >= MAX_MISSES) {
    return { ok: false, message: "Too many attempts. Please wait 15 minutes and try again." };
  }

  const wrong = (): LoginResult => {
    const count = (entry && entry.until > Date.now() ? entry.count : 0) + 1;
    misses.set(key, { count, until: Date.now() + LOCK_MS });
    return { ok: false, message: "That email or password isn't right. Please try again." };
  };

  if (login === OWNER_LOGIN) {
    if (!ownerPasswordMatches(password)) return wrong();
    misses.delete(key);
    return { ok: true, subject: "admin" };
  }

  const { data: user } = await db().from("admin_users").select("id,password_hash,disabled").eq("email", login).maybeSingle();
  // Always check a hash (a dummy one when the email is unknown) so timing doesn't reveal which emails exist.
  const valid = verifyPassword(password, user?.password_hash);
  if (!user || !valid || user.disabled) return wrong();

  misses.delete(key);
  await db().from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
  return { ok: true, subject: `admin:${user.id}` };
}

export async function startSession(subject = "admin") {
  (await cookies()).set(SESSION_COOKIE, createToken(secret()!, subject), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: SESSION_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/admin" });
}

// Who is signed in: the owner, an admin_users person, or nobody. People who were disabled or deleted
// lose access on their next request even if their session cookie hasn't expired.
export async function currentAdmin(): Promise<{ id: number | null; email: string; name: string } | null> {
  await connection();
  const sub = readToken((await cookies()).get(SESSION_COOKIE)?.value, secret());
  if (sub === "admin") return { id: null, email: OWNER_LOGIN, name: "Owner" };
  if (!sub?.startsWith("admin:")) return null;
  const id = Number(sub.slice(6));
  if (!Number.isInteger(id)) return null;
  const { data: user } = await db().from("admin_users").select("id,email,name,disabled").eq("id", id).maybeSingle();
  if (!user || user.disabled) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function isAdmin() {
  return (await currentAdmin()) !== null;
}

// Call at the top of every admin server action and data read (the proxy is a first gate, not the only one).
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

// A random password that is easy to read out: no look-alike characters (0/O, 1/l/I).
export function generatePassword(length = 16) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}

