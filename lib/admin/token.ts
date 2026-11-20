import { createHmac, timingSafeEqual } from "node:crypto";

// Signed session token: base64url(payload) + "." + HMAC. Shared by the proxy and server code.
// The subject says who the session is for: "admin" for the dashboard, "tenant:<id>" for a tenant.

export const SESSION_COOKIE = "al_admin_session";
export const TENANT_COOKIE = "al_tenant_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;

type Payload = { sub: string; exp: number; v?: string };

function sign(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

// Tenant tokens use a separate key derived from the admin secret, so one can never stand in for the other.
export function tenantSecret(adminSecret: string | undefined) {
  return adminSecret ? createHmac("sha256", adminSecret).update("tenant-session").digest("hex") : undefined;
}

// A session version ties a session to the user's current credential (their password hash). Changing or resetting
// the password changes the version, so every older session for that person stops working straight away.
export function sessionVersion(secret: string | undefined, material: string | null | undefined) {
  if (!secret || !material) return "";
  return createHmac("sha256", secret).update(`session-version|${material}`).digest("base64url").slice(0, 22);
}

export function createToken(secret: string, sub = "admin", now = Date.now(), version = "") {
  const payload: Payload = { sub, exp: now + SESSION_SECONDS * 1000, v: version };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

// Returns the subject when the token is genuine and not expired, otherwise null.
export function readToken(token: string | undefined, secret: string | undefined, now = Date.now()) {
  return readSession(token, secret, now)?.sub ?? null;
}

// Same check, but also returns the session version so callers can compare it with the user's current one.
export function readSession(token: string | undefined, secret: string | undefined, now = Date.now()): { sub: string; v: string } | null {
  if (!token || !secret) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    return payload.exp > now && typeof payload.sub === "string" ? { sub: payload.sub, v: payload.v ?? "" } : null;
  } catch {
    return null;
  }
}

// "admin" is the owner login from ADMIN_PASSWORD; "admin:<id>" is a person from the admin_users table.
export function isAdminSubject(sub: string | null) {
  return sub === "admin" || Boolean(sub?.startsWith("admin:"));
}

export function verifyToken(token: string | undefined, secret: string | undefined, now = Date.now()) {
  return isAdminSubject(readToken(token, secret, now));
}
